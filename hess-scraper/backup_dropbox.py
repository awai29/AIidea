"""
Hess eSchool 音檔備份工具
- 從 result_{username}.json 讀取 MP3 網址
- 下載到本地 data/downloads/
- 上傳到 Dropbox /Hess eSchool/{學生姓名}/
"""

import json
import re
import time
import requests
import dropbox
from pathlib import Path

# ── 設定 ─────────────────────────────────────────────
# Token 已移除，此腳本改用 dropbox_config.json（由 main.py 管理）
# 請直接透過網頁介面的「備份 Dropbox」按鈕操作
DROPBOX_TOKEN = ""  # 已廢棄，請勿在此填寫 token

DATA_DIR      = Path(__file__).parent / "data"
DOWNLOAD_DIR  = DATA_DIR / "downloads"
DROPBOX_ROOT  = "/Hess eSchool"          # Dropbox 上的根資料夾

# ── 工具函數 ──────────────────────────────────────────
def safe_name(s: str) -> str:
    """把名稱中不能當資料夾/檔名的字元換掉"""
    s = s.strip()
    s = re.sub(r'[\\/:*?"<>|]', '_', s)   # 移除非法字元
    s = re.sub(r'\s+', ' ', s)             # 多餘空白合併
    return s[:80]                           # 最長 80 字元


def download_file(url: str, dest: Path) -> bool:
    """下載單一檔案；若已存在就跳過。回傳是否成功。"""
    if dest.exists():
        return True   # 已下載，跳過
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        resp = requests.get(url, timeout=30, stream=True)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    ❌ 下載失敗：{e}")
        return False


def upload_to_dropbox(dbx: dropbox.Dropbox, local_path: Path, dropbox_path: str):
    """上傳單一檔案到 Dropbox；若已存在就跳過（比對大小）。"""
    try:
        # 先檢查是否已存在（比對檔案大小）
        try:
            meta = dbx.files_get_metadata(dropbox_path)
            if meta.size == local_path.stat().st_size:
                return "skip"   # 已存在且大小相同，跳過
        except dropbox.exceptions.ApiError:
            pass   # 不存在，繼續上傳

        with open(local_path, "rb") as f:
            data = f.read()

        # 小於 150MB 直接上傳，否則分段（MP3 通常不會超過）
        dbx.files_upload(data, dropbox_path,
                         mode=dropbox.files.WriteMode.overwrite,
                         mute=True)
        return "uploaded"
    except Exception as e:
        print(f"    ❌ 上傳失敗：{e}")
        return "error"


# ── 主程式 ────────────────────────────────────────────
def main():
    # 找出所有帳號的 result 檔
    result_files = list(DATA_DIR.glob("result_*.json"))
    if not result_files:
        print("❌ 找不到任何爬蟲結果檔案，請先執行抓取。")
        return

    # 連接 Dropbox
    print("🔗 連接 Dropbox...")
    dbx = dropbox.Dropbox(DROPBOX_TOKEN)
    try:
        me = dbx.users_get_current_account()
        print(f"✅ 已連接：{me.name.display_name} ({me.email})")
    except Exception as e:
        print(f"❌ Dropbox 連接失敗：{e}")
        return

    total_downloaded = 0
    total_uploaded   = 0
    total_skipped    = 0
    total_errors     = 0

    for result_file in result_files:
        data = json.loads(result_file.read_text(encoding="utf-8"))
        student  = safe_name(data.get("student_name") or data.get("username", "unknown"))
        username = data.get("username", "")
        print(f"\n👤 學生：{student} ({username})")

        for course in data.get("courses", []):
            course_name = safe_name(course["name"])
            print(f"\n  📚 課程：{course_name}")

            for unit in course.get("units", []):
                for lesson in unit.get("lessons", []):
                    lesson_name = safe_name(lesson["name"])

                    # 只處理有 MP3 的課次
                    mp3_items = [
                        item for item in lesson.get("items", [])
                        if any(m["type"] == "mp3" for m in item.get("media", []))
                    ]
                    if not mp3_items:
                        continue

                    print(f"    🎵 {lesson_name}（{len(mp3_items)} 首）")

                    for item in mp3_items:
                        mp3_url = next(
                            m["url"] for m in item["media"] if m["type"] == "mp3"
                        )
                        item_name = safe_name(item["name"])
                        filename  = f"{item_name}.mp3"

                        # 本地路徑
                        local_path = (
                            DOWNLOAD_DIR / student / course_name
                            / lesson_name / filename
                        )

                        # Dropbox 路徑（正斜線，開頭要有 /）
                        dbx_path = (
                            f"{DROPBOX_ROOT}/{student}/{course_name}"
                            f"/{lesson_name}/{filename}"
                        )

                        # 1. 下載
                        dl_ok = download_file(mp3_url, local_path)
                        if dl_ok:
                            total_downloaded += 1
                        else:
                            total_errors += 1
                            continue

                        # 2. 上傳
                        result = upload_to_dropbox(dbx, local_path, dbx_path)
                        if result == "uploaded":
                            total_uploaded += 1
                            print(f"      ✅ {item_name}")
                        elif result == "skip":
                            total_skipped += 1
                            print(f"      ⏭  {item_name}（已存在）")
                        else:
                            total_errors += 1

                        time.sleep(0.1)   # 稍微延遲，避免 API 限速

    print(f"\n{'='*50}")
    print(f"🎉 備份完成！")
    print(f"   下載：{total_downloaded} 首")
    print(f"   上傳：{total_uploaded} 首（新增）")
    print(f"   跳過：{total_skipped} 首（已存在）")
    print(f"   錯誤：{total_errors} 首")
    print(f"\n📁 本地備份位置：{DOWNLOAD_DIR}")
    print(f"☁️  Dropbox 位置：{DROPBOX_ROOT}/")


if __name__ == "__main__":
    main()
