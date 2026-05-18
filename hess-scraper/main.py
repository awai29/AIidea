"""
Hess Hippo eSchool - FastAPI 後端
"""

import re
import json
import threading
from concurrent.futures import ThreadPoolExecutor, wait as fut_wait
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from cryptography.fernet import Fernet, InvalidToken

# 關閉自動產生的 API 文件頁面（/docs 和 /redoc），避免暴露端點資訊
app = FastAPI(docs_url=None, redoc_url=None)

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
TMP_DIR  = DATA_DIR / "tmp"          # 備份暫存目錄（上傳後立即刪除）
ACCOUNTS_FILE = DATA_DIR / "accounts.json"
TEMPLATES_DIR = BASE_DIR / "templates"

scrape_states:  dict[str, dict] = {}
backup_states:  dict[str, dict] = {}


# ── 狀態持久化工具 ──

def _state_file(username: str, kind: str) -> Path:
    """kind: 'scrape' 或 'backup'"""
    return DATA_DIR / f"{kind}_state_{username}.json"


def _save_state(username: str, kind: str, state: dict):
    """把狀態寫入 JSON 檔（只儲存結果，不儲存 running=True）"""
    DATA_DIR.mkdir(exist_ok=True)
    _state_file(username, kind).write_text(
        json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def _load_state(username: str, kind: str) -> dict | None:
    """從 JSON 檔讀取上次的狀態；若檔案不存在則回傳 None"""
    f = _state_file(username, kind)
    if not f.exists():
        return None
    try:
        state = json.loads(f.read_text(encoding="utf-8"))
        # 重啟後不可能還在跑，強制重設
        state["running"] = False
        return state
    except Exception:
        return None

MEDIA_TYPES = {"mp3", "mp4"}          # 支援的媒體類型
KEY_FILE    = DATA_DIR / ".secret_key"  # 加密金鑰（本機保存，請勿外傳）


# ── 密碼加密工具 ──

def _get_fernet() -> Fernet:
    """
    取得（或自動建立）加密金鑰。
    金鑰存在 data/.secret_key，遺失後舊密碼無法解密，需重新新增帳號。
    """
    DATA_DIR.mkdir(exist_ok=True)
    if KEY_FILE.exists():
        key = KEY_FILE.read_bytes()
    else:
        key = Fernet.generate_key()
        KEY_FILE.write_bytes(key)
    return Fernet(key)


def _encrypt(text: str) -> str:
    return _get_fernet().encrypt(text.encode()).decode()


def _decrypt(text: str) -> str:
    """解密失敗時回傳原文（相容尚未加密的舊帳號）"""
    try:
        return _get_fernet().decrypt(text.encode()).decode()
    except (InvalidToken, Exception):
        return text   # 舊版明文，直接回傳


# ── Dropbox 設定加解密 ──

DROPBOX_CONFIG_FILE = BASE_DIR / "dropbox_config.json"


def load_dropbox_config() -> dict:
    """
    讀取 Dropbox 設定檔。
    支援兩種格式：
      - 新版（加密）：檔案內容為 Fernet 加密字串
      - 舊版（明文）：標準 JSON，首次讀取後自動升級為加密版
    """
    if not DROPBOX_CONFIG_FILE.exists():
        return {}
    raw = DROPBOX_CONFIG_FILE.read_text(encoding="utf-8").strip()
    try:
        # 嘗試解密（新版加密格式）
        decrypted = _get_fernet().decrypt(raw.encode()).decode()
        return json.loads(decrypted)
    except (InvalidToken, Exception):
        pass
    # 舊版明文 JSON：讀出後立即加密存回（自動升級）
    try:
        cfg = json.loads(raw)
        save_dropbox_config(cfg)   # 升級為加密版
        return cfg
    except Exception:
        return {}


def save_dropbox_config(cfg: dict):
    """將 Dropbox 設定以 Fernet 加密後寫入檔案"""
    encrypted = _encrypt(json.dumps(cfg))
    DROPBOX_CONFIG_FILE.write_text(encrypted, encoding="utf-8")


# ── 安全工具 ──

def validate_username(username: str) -> bool:
    """
    只允許數字和字母，長度 1~20。
    防止路徑穿越攻擊（如 ../dropbox_config）。
    Hess 學號是純數字，例如 111110436。
    """
    return bool(re.match(r'^[a-zA-Z0-9]{1,20}$', username))


def safe_username(username: str):
    """驗證失敗時直接回傳 400 錯誤"""
    if not validate_username(username):
        raise HTTPException(status_code=400, detail="帳號格式無效")


# ── 帳號存取 ──

def load_accounts() -> list:
    if not ACCOUNTS_FILE.exists():
        return []
    accounts = json.loads(ACCOUNTS_FILE.read_text(encoding="utf-8"))
    # 解密密碼（若是舊版明文，_decrypt 會原文回傳）
    for acc in accounts:
        if "password" in acc:
            acc["password"] = _decrypt(acc["password"])
    return accounts


def save_accounts(accounts: list):
    DATA_DIR.mkdir(exist_ok=True)
    # 儲存前加密密碼，明文不落地
    encrypted = [
        {**acc, "password": _encrypt(acc["password"])} for acc in accounts
    ]
    ACCOUNTS_FILE.write_text(json.dumps(encrypted, ensure_ascii=False, indent=2), encoding="utf-8")


def get_state(username: str) -> dict:
    if username not in scrape_states:
        # 先嘗試從上次儲存的檔案還原，還原後 running 會被強制設為 False
        saved = _load_state(username, "scrape")
        scrape_states[username] = saved if saved is not None else {
            "running": False, "logs": [], "done": False,
            "error": None, "progress": {}
        }
    return scrape_states[username]


async def run_scraper(username: str, password: str):
    state = get_state(username)
    state.update({"running": True, "logs": [], "done": False, "error": None, "progress": {}})
    try:
        from scraper import scrape
        result = await scrape(username, password, state)
        if result["status"] == "error":
            state["error"] = result["error"]
    except Exception as e:
        state["error"] = str(e)
    finally:
        state["running"] = False
        state["done"] = True
        _save_state(username, "scrape", state)   # 儲存結果，重啟後可還原


# ── 頁面 ──

@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse((TEMPLATES_DIR / "index.html").read_text(encoding="utf-8"))


# ── 帳號管理 ──

@app.get("/accounts")
async def list_accounts():
    accounts = load_accounts()
    result = []
    for acc in accounts:
        data_file = DATA_DIR / f"result_{acc['username']}.json"
        # 回傳帳號資訊時，絕對不包含密碼欄位
        safe_acc = {
            "username": acc["username"],
            "label":    acc.get("label", ""),
            "has_data": data_file.exists(),
            "student_name": "",
            "courses": [],
        }
        if data_file.exists():
            try:
                d = json.loads(data_file.read_text(encoding="utf-8"))
                safe_acc["student_name"] = d.get("student_name", "")
                safe_acc["courses"] = [c["name"] for c in d.get("courses", [])]
            except Exception:
                pass
        result.append(safe_acc)
    return JSONResponse(result)


@app.post("/accounts")
async def add_account(body: dict):
    username = body.get("username", "").strip()
    password = body.get("password", "").strip()
    label    = body.get("label", "").strip()
    if not username or not password:
        return JSONResponse({"error": "帳號和密碼不能為空"}, status_code=400)
    if not validate_username(username):
        return JSONResponse({"error": "帳號格式無效（只允許數字和字母）"}, status_code=400)
    accounts = load_accounts()
    if any(a["username"] == username for a in accounts):
        return JSONResponse({"error": "此帳號已存在"}, status_code=400)
    accounts.append({"username": username, "password": password, "label": label})
    save_accounts(accounts)
    return JSONResponse({"status": "ok"})


@app.delete("/accounts/{username}")
async def delete_account(username: str):
    safe_username(username)   # 驗證格式
    accounts = [a for a in load_accounts() if a["username"] != username]
    save_accounts(accounts)
    data_file = DATA_DIR / f"result_{username}.json"
    if data_file.exists():
        data_file.unlink()
    return JSONResponse({"status": "ok"})


# ── 爬蟲控制 ──

@app.post("/scrape/{username}")
async def start_scrape(username: str, background_tasks: BackgroundTasks):
    safe_username(username)   # 驗證格式
    state = get_state(username)
    if state["running"]:
        return JSONResponse({"status": "already_running"})
    accounts = load_accounts()
    acc = next((a for a in accounts if a["username"] == username), None)
    if not acc:
        return JSONResponse({"error": "帳號不存在"}, status_code=404)
    background_tasks.add_task(run_scraper, username, acc["password"])
    return JSONResponse({"status": "started"})


@app.get("/scrape/{username}/status")
async def scrape_status(username: str):
    safe_username(username)   # 驗證格式
    state = get_state(username)
    return JSONResponse({
        "running":  state["running"],
        "done":     state["done"],
        "error":    state["error"],
        "logs":     state["logs"][-100:],
        "progress": state.get("progress", {}),
    })


# ── 資料讀取 ──

@app.get("/data/{username}")
async def get_data(username: str):
    safe_username(username)   # 驗證格式，防止路徑穿越
    data_file = DATA_DIR / f"result_{username}.json"
    if not data_file.exists():
        return JSONResponse({"status": "no_data", "courses": []})
    try:
        return JSONResponse(json.loads(data_file.read_text(encoding="utf-8")))
    except Exception as e:
        return JSONResponse({"status": "error", "error": str(e), "courses": []})


# ── 已備份函式庫 ──

@app.get("/library/{username}")
async def get_library(username: str):
    """回傳該帳號已備份到 Dropbox 的媒體索引"""
    safe_username(username)
    index_file = DATA_DIR / f"dropbox_index_{username}.json"
    if not index_file.exists():
        return JSONResponse({"items": []})
    try:
        return JSONResponse(json.loads(index_file.read_text(encoding="utf-8")))
    except Exception as e:
        return JSONResponse({"items": [], "error": str(e)})


# ── Dropbox 臨時播放連結 ──

@app.get("/dropbox/link")
async def get_dropbox_link(path: str = Query(...)):
    """
    取得 Dropbox 檔案的臨時串流連結（有效 4 小時）。
    輸入：?path=/{student}/{course}/{lesson}/{name}.mp3
    安全驗證：path 不可含 ..
    """
    # 安全驗證：不允許路徑穿越
    if ".." in path:
        raise HTTPException(status_code=400, detail="路徑不合法")

    if not DROPBOX_CONFIG_FILE.exists():
        raise HTTPException(status_code=503, detail="Dropbox 尚未設定")

    try:
        import dropbox as dbx_mod
        cfg = load_dropbox_config()
        dbx = dbx_mod.Dropbox(
            oauth2_refresh_token=cfg["refresh_token"],
            app_key=cfg["app_key"],
            app_secret=cfg["app_secret"],
        )
        result = dbx.files_get_temporary_link(path)
        return JSONResponse({"url": result.link})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"取得連結失敗：{e}")


# ── 備份管理 ──

@app.get("/backup-list/{username}")
async def backup_list(username: str):
    """回傳可備份的課次清單（包含 mp3 + mp4）"""
    safe_username(username)   # 驗證格式，防止路徑穿越
    data_file = DATA_DIR / f"result_{username}.json"
    if not data_file.exists():
        return JSONResponse({"error": "尚未抓取資料"}, status_code=404)
    data = json.loads(data_file.read_text(encoding="utf-8"))
    result = []
    for course in data.get("courses", []):
        for unit in course.get("units", []):
            for lesson in unit.get("lessons", []):
                # 包含 mp3 和 mp4 兩種媒體類型
                media_items = [
                    item for item in lesson.get("items", [])
                    if any(m["type"] in MEDIA_TYPES for m in item.get("media", []))
                ]
                if media_items:
                    mp3_count = sum(
                        1 for item in media_items
                        if any(m["type"] == "mp3" for m in item.get("media", []))
                    )
                    mp4_count = sum(
                        1 for item in media_items
                        if any(m["type"] == "mp4" for m in item.get("media", []))
                    )
                    result.append({
                        "key":         f"{course['id']}:{lesson['id']}",
                        "course_name": course["name"],
                        "lesson_name": lesson["name"],
                        "mp3_count":   mp3_count,
                        "mp4_count":   mp4_count,
                        "items":       media_items,
                    })
    return JSONResponse(result)


_index_lock = threading.Lock()   # 保護索引檔案的讀寫，避免並發時互相覆蓋


def _append_to_index(username: str, entry: dict):
    """
    將已備份記錄寫入（或更新）dropbox_index_{username}.json。
    格式：{"items": [{"key": ..., "course": ..., "lesson": ..., "name": ..., "type": ..., "dropbox_path": ...}]}
    """
    index_file = DATA_DIR / f"dropbox_index_{username}.json"
    if index_file.exists():
        try:
            index = json.loads(index_file.read_text(encoding="utf-8"))
        except Exception:
            index = {"items": []}
    else:
        index = {"items": []}

    # 以 key 去重：同 key 覆蓋舊記錄
    existing_keys = {item["key"]: i for i, item in enumerate(index["items"])}
    if entry["key"] in existing_keys:
        index["items"][existing_keys[entry["key"]]] = entry
    else:
        index["items"].append(entry)

    with _index_lock:
        index_file.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")


def _process_task(task: dict, idx: int, cfg: dict, username: str, student: str,
                  state: dict, lock: threading.Lock) -> str:
    """
    單一備份任務（在工作執行緒中執行）：
    下載 → 上傳 Dropbox → 刪暫存 → 記索引
    回傳：'uploaded' / 'skipped' / 'hess_error' / 'error'
    """
    import re as _re, requests, dropbox as dbx_mod

    # 每個執行緒自己建立 Dropbox 連線（執行緒安全）
    dbx = dbx_mod.Dropbox(
        oauth2_refresh_token=cfg["refresh_token"],
        app_key=cfg["app_key"],
        app_secret=cfg["app_secret"],
    )

    def safe(s):
        s = _re.sub(r'[\\/:*?"<>|]', '_', s.strip())
        return _re.sub(r'\s+', ' ', s)[:80]

    ext      = task["type"]
    tmp_path = TMP_DIR / f"{username}_{idx}.{ext}"
    dbx_path = f"/{student}/{task['course']}/{task['lesson']}/{task['name']}.{ext}"
    item_key = f"{task['course_id']}:{task['lesson_id']}:{task['item_name']}:{ext}"

    with lock:
        state["current"] = task["name"]

    # ── 步驟 1：下載到暫存 ──
    try:
        r = requests.get(task["url"], timeout=30, stream=True)
        if r.status_code in (403, 404):
            with lock:
                state["errors"].append(
                    f"{task['name']}：Hess 連結失效（HTTP {r.status_code}），建議重新抓取"
                )
            return "hess_error"
        r.raise_for_status()
        with open(tmp_path, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
    except Exception as e:
        with lock:
            state["errors"].append(f"{task['name']}：下載失敗：{e}")
        tmp_path.unlink(missing_ok=True)
        return "error"

    # ── 步驟 2：上傳到 Dropbox ──
    try:
        try:
            meta = dbx.files_get_metadata(dbx_path)
            if meta.size == tmp_path.stat().st_size:
                with lock:
                    state["skipped"] += 1
                    _append_to_index(username, {
                        "key": item_key, "course": task["course_name"],
                        "lesson": task["lesson_name"], "name": task["item_name"],
                        "type": ext, "dropbox_path": dbx_path, "size": meta.size,
                    })
                tmp_path.unlink(missing_ok=True)
                return "skipped"
        except Exception:
            pass

        CHUNK = 128 * 1024 * 1024
        file_size = tmp_path.stat().st_size
        if file_size <= CHUNK:
            with open(tmp_path, "rb") as f:
                upload_meta = dbx.files_upload(
                    f.read(), dbx_path,
                    mode=dbx_mod.files.WriteMode.overwrite, mute=True
                )
        else:
            with open(tmp_path, "rb") as f:
                chunk = f.read(CHUNK)
                session = dbx.files_upload_session_start(chunk)
                cursor = dbx_mod.files.UploadSessionCursor(
                    session_id=session.session_id, offset=len(chunk)
                )
                while True:
                    chunk = f.read(CHUNK)
                    if not chunk:
                        break
                    if file_size - cursor.offset <= len(chunk):
                        commit = dbx_mod.files.CommitInfo(
                            path=dbx_path,
                            mode=dbx_mod.files.WriteMode.overwrite,
                            mute=True
                        )
                        upload_meta = dbx.files_upload_session_finish(chunk, cursor, commit)
                        break
                    else:
                        dbx.files_upload_session_append_v2(chunk, cursor)
                        cursor.offset += len(chunk)

        with lock:
            state["uploaded"] += 1
            _append_to_index(username, {
                "key": item_key, "course": task["course_name"],
                "lesson": task["lesson_name"], "name": task["item_name"],
                "type": ext, "dropbox_path": dbx_path, "size": upload_meta.size,
            })

    except Exception as e:
        with lock:
            state["errors"].append(f"{task['name']} 上傳失敗：{e}")
        tmp_path.unlink(missing_ok=True)
        return "error"

    # ── 步驟 3：刪除暫存檔 ──
    tmp_path.unlink(missing_ok=True)
    return "uploaded"


def run_backup(username: str, selected_keys: list):
    """
    背景執行（並發 3 個執行緒同時下載+上傳）：
    1. 下載媒體到 data/tmp/（暫存）
    2. 上傳到 Dropbox App Folder（路徑：/{student}/{course}/{lesson}/{name}.{ext}）
    3. 上傳成功後立即刪除暫存檔
    4. 記錄到 dropbox_index_{username}.json
    """
    import re as _re

    state = backup_states[username]
    if not DROPBOX_CONFIG_FILE.exists():
        state.update({"running": False, "done": True, "error": "找不到 Dropbox 設定，請重新授權"})
        return

    cfg = load_dropbox_config()

    def safe(s):
        """移除不合法的檔名字元"""
        s = _re.sub(r'[\\/:*?"<>|]', '_', s.strip())
        return _re.sub(r'\s+', ' ', s)[:80]

    data_file = DATA_DIR / f"result_{username}.json"
    data = json.loads(data_file.read_text(encoding="utf-8"))
    student = safe(data.get("student_name") or username)

    # 收集所有需要備份的任務
    tasks = []
    key_set = set(selected_keys)
    for course in data.get("courses", []):
        for unit in course.get("units", []):
            for lesson in unit.get("lessons", []):
                lesson_key = f"{course['id']}:{lesson['id']}"
                if lesson_key not in key_set:
                    continue
                for item in lesson.get("items", []):
                    # MP3 和 MP4 都備份（各自是獨立任務）
                    for m_type in ("mp3", "mp4"):
                        url = next((m["url"] for m in item.get("media", []) if m["type"] == m_type), None)
                        if not url:
                            continue
                        tasks.append({
                            "url":         url,
                            "type":        m_type,
                            "course":      safe(course["name"]),
                            "lesson":      safe(lesson["name"]),
                            "name":        safe(item["name"]),
                            "course_name": course["name"],
                            "lesson_name": lesson["name"],
                            "item_name":   item["name"],
                            "course_id":   course["id"],
                            "lesson_id":   lesson["id"],
                        })

    total = len(tasks)
    state["total"] = total
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    lock = threading.Lock()
    hess_errors = [0]   # 用 list 當可變計數器（跨執行緒）

    def wrapped(idx: int, task: dict) -> str:
        result = _process_task(task, idx, cfg, username, student, state, lock)
        with lock:
            state["done_count"] += 1
            if result == "hess_error":
                hess_errors[0] += 1
        return result

    # 同時最多 3 個執行緒並發下載+上傳，速度約提升 2-3 倍
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {executor.submit(wrapped, idx, task): task
                   for idx, task in enumerate(tasks)}
        fut_wait(futures)

    # 全部完成後，把所有選取的課次標為已完成
    state["completed_lessons"] = list(set(selected_keys))

    if hess_errors[0]:
        state["errors"].insert(
            0, f"共 {hess_errors[0]} 個 Hess 連結已失效（建議重新抓取後再備份）"
        )

    state.update({"running": False, "done": True, "done_count": total,
                  "current": "", "current_lesson_key": ""})
    _save_state(username, "backup", state)   # 儲存結果，重啟後可還原


@app.post("/backup/start")
async def start_backup(body: dict, background_tasks: BackgroundTasks):
    username = body.get("username", "")
    keys     = body.get("keys", [])
    if not username or not keys:
        return JSONResponse({"error": "缺少參數"}, status_code=400)
    safe_username(username)   # 驗證格式
    if backup_states.get(username, {}).get("running"):
        return JSONResponse({"status": "already_running"})
    backup_states[username] = {
        "running": True, "done": False, "error": None,
        "total": 0, "done_count": 0, "uploaded": 0,
        "skipped": 0, "errors": [], "current": "",
        "current_lesson_key": "",   # 目前正在處理的課次 key（courseId:lessonId）
        "completed_lessons":  [],   # 已全部處理完的課次 key 清單
    }
    background_tasks.add_task(run_backup, username, keys)
    return JSONResponse({"status": "started"})


@app.get("/backup/{username}/status")
async def backup_status(username: str):
    safe_username(username)   # 驗證格式
    if username not in backup_states:
        # 嘗試從檔案還原上次備份結果
        saved = _load_state(username, "backup")
        if saved:
            backup_states[username] = saved
    state = backup_states.get(username, {"running": False, "done": False, "total": 0, "done_count": 0})
    return JSONResponse(state)


if __name__ == "__main__":
    import uvicorn
    DATA_DIR.mkdir(exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    if not ACCOUNTS_FILE.exists():
        save_accounts([])   # 空列表，請從網頁介面新增帳號
    # host 改為 127.0.0.1，只允許本機存取，同一個 WiFi 下的其他人無法連入
    uvicorn.run(app, host="127.0.0.1", port=8001, reload=False)
