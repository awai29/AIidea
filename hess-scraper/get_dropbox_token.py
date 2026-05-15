"""
Dropbox 重新授權工具
執行後會引導你取得新的 refresh_token，並自動寫入 dropbox_config.json
"""

import json
import webbrowser
from pathlib import Path
import requests

BASE_DIR    = Path(__file__).parent
CONFIG_FILE = BASE_DIR / "dropbox_config.json"


def main():
    print("=" * 55)
    print("  Dropbox 重新授權工具")
    print("=" * 55)
    print()
    print("請先在 Dropbox 開發者網站建立新 App（App Folder 類型）")
    print("建立完成後，把 App Key 和 App Secret 填在這裡：")
    print()

    app_key    = input("  App Key    → ").strip()
    app_secret = input("  App Secret → ").strip()
    if not app_key or not app_secret:
        print("\n❌ App Key 或 App Secret 不能為空，請重新執行")
        return

    # 產生授權網址（offline 模式 = 取得 refresh_token）
    auth_url = (
        f"https://www.dropbox.com/oauth2/authorize"
        f"?client_id={app_key}"
        f"&response_type=code"
        f"&token_access_type=offline"
    )

    print()
    print("步驟：瀏覽器打開授權頁面，登入後會看到一串授權碼")
    print()
    print(f"  授權網址：{auth_url}")
    print()
    try:
        webbrowser.open(auth_url)
        print("  （已自動開啟瀏覽器）")
    except Exception:
        print("  ⚠ 請手動複製上方網址，貼到瀏覽器開啟")

    print()
    auth_code = input("  請把瀏覽器顯示的授權碼貼在這裡 → ").strip()
    if not auth_code:
        print("\n❌ 沒有輸入授權碼，請重新執行")
        return

    # 用授權碼換取 refresh_token
    print()
    print("正在取得 Token...")
    resp = requests.post(
        "https://api.dropboxapi.com/oauth2/token",
        data={
            "code":         auth_code,
            "grant_type":   "authorization_code",
            "client_id":    app_key,
            "client_secret": app_secret,
        },
        timeout=15,
    )

    if resp.status_code != 200:
        print(f"\n❌ 取得 Token 失敗：{resp.text}")
        return

    data = resp.json()
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        print(f"\n❌ 回應中沒有 refresh_token：{data}")
        return

    # 驗證：用 token 確認帳戶
    import dropbox
    dbx = dropbox.Dropbox(
        oauth2_refresh_token=refresh_token,
        app_key=app_key,
        app_secret=app_secret,
    )
    me = dbx.users_get_current_account()

    # 寫入設定檔
    config = {
        "app_key":       app_key,
        "app_secret":    app_secret,
        "refresh_token": refresh_token,
    }
    CONFIG_FILE.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print()
    print("=" * 55)
    print(f"  ✅ 授權成功！")
    print(f"  Dropbox 帳號：{me.name.display_name} ({me.email})")
    print(f"  設定已儲存到 dropbox_config.json")
    print("=" * 55)


if __name__ == "__main__":
    main()
