"""
Hess Hippo eSchool 爬蟲
兩階段設計：
  階段 1 - 探索：快速抓所有課次連結 + 項目 URL
  階段 2 - 下載：逐一訪問每個項目，攔截 MP3/圖片 URL
"""

import asyncio
import json
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright

BASE_URL = "https://hippoeschool.hess.com.tw"
DATA_DIR = Path(__file__).parent / "data"
SCREENSHOT_DIR = DATA_DIR / "screenshots"


async def scrape(username: str, password: str, state: dict):
    """
    主要爬蟲函數，透過 state dict 即時回報進度
    state 結構：{ running, done, error, logs, phase, progress }
    """
    def log(msg: str):
        print(msg)
        state["logs"].append(msg)

    def set_progress(phase: str, done: int, total: int, detail: str = ""):
        state["progress"] = {
            "phase": phase,
            "done": done,
            "total": total,
            "pct": round(done / total * 100) if total > 0 else 0,
            "detail": detail,
        }

    DATA_DIR.mkdir(exist_ok=True)
    SCREENSHOT_DIR.mkdir(exist_ok=True)

    result = {
        "status": "running",
        "username": username,
        "student_name": "",
        "courses": [],
        "error": None,
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={"width": 1280, "height": 900},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )

        try:
            # ── 登入 ──────────────────────────────────────────
            set_progress("login", 0, 1, "正在登入...")
            log("📄 載入登入頁面...")
            await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            await page.fill("#username1", username)
            await page.fill("#password1", password)
            await page.check("#checkboxStudent")
            await page.click("input[type='submit']:not([name='btnForgetPwd'])")
            await page.wait_for_load_state("networkidle", timeout=30000)

            if "Login2" not in page.url and "login" in page.url.lower():
                raise Exception(f"登入失敗，目前 URL：{page.url}")

            student_name = (await page.inner_text("#span_username") or username).strip()
            result["student_name"] = student_name
            set_progress("login", 1, 1, f"登入成功：{student_name}")
            log(f"✅ 登入成功　學生：{student_name}")

            # 取得可選課程
            options = await page.evaluate("""
                () => Array.from(document.querySelectorAll('#c1 option'))
                    .filter(o => o.value)
                    .map(o => ({ id: o.value, name: o.textContent.trim() }))
            """)
            log(f"📚 課程：{[o['name'] for o in options]}")

            # ── 階段 1：探索所有課次 + 項目 URL ─────────────
            log("\n🔍 階段 1：探索課程架構...")
            all_items_flat = []   # [(course, unit_id, lesson, item), ...]
            courses_data = []

            for course in options:
                log(f"  📖 {course['name']}")
                await page.goto(f"{BASE_URL}/Login2", wait_until="networkidle", timeout=30000)
                await page.select_option("#c1", course["id"])
                await page.click("#btnLogin")
                await page.wait_for_load_state("networkidle", timeout=30000)

                nav_links = await page.evaluate(f"""
                    () => {{
                        const seen = new Set();
                        return Array.from(document.querySelectorAll('a[href*="unit="]'))
                            .map(a => ({{ text: a.textContent.trim(), href: a.href }}))
                            .filter(l => {{ if (!l.text || seen.has(l.href)) return false; seen.add(l.href); return true; }});
                    }}
                """)

                unit_map = {}
                for link in nav_links:
                    qs = parse_qs(urlparse(link["href"]).query)
                    uid = qs.get("unit", ["?"])[0]
                    lid = qs.get("lesson", ["?"])[0]
                    if uid not in unit_map:
                        unit_map[uid] = {"id": uid, "lessons": []}
                    unit_map[uid]["lessons"].append({
                        "id": lid, "name": link["text"],
                        "url": link["href"], "items": []
                    })

                course_data = {"id": course["id"], "name": course["name"], "units": list(unit_map.values())}
                total_lessons = sum(len(u["lessons"]) for u in course_data["units"])
                log(f"    找到 {total_lessons} 個課次")

                lesson_no = 0
                for unit in course_data["units"]:
                    for lesson in unit["lessons"]:
                        lesson_no += 1
                        set_progress("explore", lesson_no, total_lessons,
                                     f"{course['name']} — {lesson['name']}")
                        try:
                            await page.goto(lesson["url"], wait_until="networkidle", timeout=20000)
                            items = await page.evaluate(f"""
                                () => {{
                                    const BASE = "{BASE_URL}";
                                    return Array.from(document.querySelectorAll('.schedule_content_wrapper'))
                                        .map(w => {{
                                            const t = w.querySelector('.content_text');
                                            const a = w.querySelector('.content_link a[href]');
                                            if (!t || !a) return null;
                                            const h = a.getAttribute('href');
                                            const full = h.startsWith('http') ? h : BASE + '/' + h.replace(/^\\//, '');
                                            const u = new URL(full);
                                            return {{
                                                name: t.textContent.trim(), url: full,
                                                id: u.searchParams.get('id'),
                                                group: u.searchParams.get('group') || '',
                                                type: u.searchParams.get('type') || '',
                                                media: []
                                            }};
                                        }}).filter(Boolean);
                                }}
                            """)
                            lesson["items"] = items
                            for item in items:
                                all_items_flat.append((course["id"], unit["id"], lesson["url"], item))
                            log(f"    [{lesson_no}/{total_lessons}] {lesson['name']} → {len(items)} 項")
                        except Exception as e:
                            lesson["error"] = str(e)
                            log(f"    ⚠️ {lesson['name']}：{e}")

                courses_data.append(course_data)

            total_items = len(all_items_flat)
            log(f"\n✅ 探索完成，共 {total_items} 個內容項目")

            # ── 階段 2：並發抓取每個項目的媒體 URL ──────────────
            # 同時開 3 個分頁，速度約提升 2-3 倍
            # 分頁共用同一個 browser context，所以 session/cookie 自動共享，不需要重新登入
            CONCURRENCY = 3
            log(f"\n🎵 階段 2：並發抓取媒體連結（共 {total_items} 項，{CONCURRENCY} 個分頁）...")

            # 建立工作分頁（共用同一個 context，cookie 自動繼承）
            worker_pages = []
            for _ in range(CONCURRENCY):
                wp = await browser.new_page(
                    viewport={"width": 1280, "height": 900},
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
                )
                worker_pages.append(wp)

            # 用 Queue 分配分頁：哪個分頁閒置就拿去用，不會重複占用
            page_queue: asyncio.Queue = asyncio.Queue()
            for wp in worker_pages:
                await page_queue.put(wp)

            done_count = [0]   # 用 list 當可變計數器（asyncio 單執行緒，不需要鎖）

            async def fetch_item(item: dict):
                """從 Queue 取一個閒置分頁，訪問 item URL，攔截媒體連結，用完歸還"""
                wp = await page_queue.get()
                captured = []

                MEDIA_EXTS = {"mp3", "mp4"}

                def capture(req):
                    url = req.url
                    # 攔截所有 hess 網域的 mp3/mp4，以及舊版 hippoeschooladmin 的任何媒體
                    ext = url.split("?")[0].rsplit(".", 1)[-1].lower()
                    if ext in MEDIA_EXTS:
                        captured.append({"url": url, "type": ext})
                    elif "hippoeschooladmin" in url:
                        captured.append({"url": url, "type": ext})

                wp.on("request", capture)
                try:
                    # 最多自動重試 2 次（應對網路短暫抖動）
                    for attempt in range(3):
                        try:
                            captured.clear()
                            await wp.goto(item["url"], wait_until="networkidle", timeout=15000)
                            await wp.wait_for_timeout(800)
                            # 補充：掃描頁面中 <audio>/<video>/<source> 的 src 屬性
                            # 有些頁面不透過網路請求載入媒體，而是直接嵌在 HTML 裡
                            try:
                                av_srcs = await wp.evaluate("""
                                    () => {
                                        const res = [];
                                        document.querySelectorAll('audio[src],video[src],source[src]').forEach(el => {
                                            const s = el.getAttribute('src');
                                            if (s) {
                                                const abs = s.startsWith('http') ? s : location.origin + (s.startsWith('/') ? s : '/' + s);
                                                const ext = abs.split('?')[0].split('.').pop().toLowerCase();
                                                res.push({url: abs, type: ext});
                                            }
                                        });
                                        return res;
                                    }
                                """)
                                seen = {c["url"] for c in captured}
                                for av in av_srcs:
                                    if av["url"] not in seen:
                                        captured.append(av)
                            except Exception:
                                pass
                            item["media"] = list(captured)
                            break   # 成功就跳出重試迴圈
                        except Exception as e:
                            if attempt == 2:   # 三次都失敗才記錄錯誤
                                item["media_error"] = str(e)
                            else:
                                await asyncio.sleep(1.5)   # 等 1.5 秒再試
                finally:
                    wp.remove_listener("request", capture)
                    await page_queue.put(wp)   # 歸還分頁供下一個任務使用

                done_count[0] += 1
                n = done_count[0]
                if n % 10 == 0 or n == 1:
                    log(f"  [{n}/{total_items}] {item['name']}")
                set_progress("media", n, total_items,
                             f"{item['name']} ({item.get('type') or item.get('group', '')})")

            # 全部項目同時丟進去，asyncio 會控制最多 CONCURRENCY 個同時跑
            await asyncio.gather(*[
                fetch_item(item)
                for _, _, _, item in all_items_flat
            ])

            # 關閉工作分頁
            for wp in worker_pages:
                await wp.close()

            result["courses"] = courses_data
            result["status"] = "completed"

            total_media = sum(len(item["media"]) for _, _, _, item in all_items_flat)
            log(f"\n🎉 全部完成！{len(courses_data)} 個課程，{total_items} 個項目，{total_media} 個媒體檔案")
            set_progress("done", total_items, total_items, f"共 {total_items} 項，{total_media} 個媒體")

        except Exception as e:
            result["status"] = "error"
            result["error"] = str(e)
            log(f"❌ 錯誤：{e}")
            set_progress("error", 0, 1, str(e))
            try:
                await page.screenshot(path=str(SCREENSHOT_DIR / "error.png"))
            except Exception:
                pass

        finally:
            await browser.close()

    output_path = DATA_DIR / f"result_{username}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    log(f"💾 已儲存：{output_path}")

    return result


if __name__ == "__main__":
    print("請透過網頁介面（http://localhost:8001）操作，勿直接執行此檔案。")
