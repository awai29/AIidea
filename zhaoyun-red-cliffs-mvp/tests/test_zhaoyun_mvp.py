"""
趙雲 MVP 自動化驗證測試
執行前需在 zhaoyun-mvp/ 啟動 python3 -m http.server 8080
"""
import json
import os
import pytest
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:8080"

@pytest.fixture
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 800, "height": 450})
        pg.goto(BASE_URL)
        pg.wait_for_timeout(600)
        yield pg
        browser.close()

def get_state(page: Page) -> dict:
    return json.loads(page.evaluate("window.render_game_to_text()"))

def start_game(page: Page):
    page.evaluate("window.startGame()")
    page.wait_for_timeout(50)

def advance(page: Page, ms: int):
    # advanceTime 內部已在最後呼叫 render，截圖前無需額外等待
    page.evaluate(f"window.advanceTime({ms})")

# ─── Test 1：初始狀態為 title ─────────────────────────────
def test_initial_state_is_title(page):
    assert get_state(page)["mode"] == "title"

# ─── Test 2：startGame 進入 running ──────────────────────
def test_start_game_enters_running(page):
    start_game(page)
    assert get_state(page)["mode"] == "running"

# ─── Test 3：玩家初始血量與狀態 ─────────────────────────
def test_player_initial_stats(page):
    start_game(page)
    p = get_state(page)["player"]
    assert p["hp"] == 100
    assert p["maxHp"] == 100
    assert p["onGround"] is True

# ─── Test 4：玩家可向右移動 ──────────────────────────────
def test_player_moves_right(page):
    start_game(page)
    initial_x = get_state(page)["player"]["x"]
    page.keyboard.down("ArrowRight")
    advance(page, 1000)
    page.keyboard.up("ArrowRight")
    assert get_state(page)["player"]["x"] > initial_x

# ─── Test 5：玩家可向左移動 ──────────────────────────────
def test_player_moves_left(page):
    start_game(page)
    page.keyboard.down("ArrowRight")
    advance(page, 1500)
    page.keyboard.up("ArrowRight")
    mid_x = get_state(page)["player"]["x"]
    page.keyboard.down("ArrowLeft")
    advance(page, 800)
    page.keyboard.up("ArrowLeft")
    assert get_state(page)["player"]["x"] < mid_x

# ─── Test 6：第一段有存活敵人 ───────────────────────────
def test_first_segment_has_enemies(page):
    start_game(page)
    alive = [e for e in get_state(page)["enemies"] if e["state"] != "death"]
    assert len(alive) > 0

# ─── Test 7：攻擊可減少敵人總 HP ────────────────────────
def test_attack_reduces_enemy_hp(page):
    start_game(page)
    # 等敵人 AI 靠近（1 秒），避免等太久導致段 0 清場、段 1 生成新敵人
    advance(page, 1000)

    # 記錄此刻存活的敵人 ID 與 HP（只追蹤這批，不管之後生成的）
    state_before = get_state(page)
    tracked_ids = {e["id"]: e["hp"] for e in state_before["enemies"] if e["state"] != "death"}

    # 連續攻擊 10 次
    for _ in range(10):
        page.keyboard.down("KeyZ")
        advance(page, 50)
        page.keyboard.up("KeyZ")
        advance(page, 500)

    # 只計算同批敵人的 HP 總和
    state_after = get_state(page)
    hp_before = sum(tracked_ids.values())
    hp_after = sum(
        e["hp"] for e in state_after["enemies"]
        if e["id"] in tracked_ids
    )
    assert hp_after < hp_before, \
        f"攻擊後同批敵人總 HP 應減少，前：{hp_before}，後：{hp_after}"

# ─── Test 8：render_game_to_text 輸出合法 JSON ──────────
def test_text_state_schema(page):
    start_game(page)
    advance(page, 500)
    state = get_state(page)
    assert all(k in state for k in ["mode", "player", "enemies", "level", "camera"])
    assert all(k in state["player"] for k in ["x", "y", "hp", "state", "onGround"])

# ─── Test 9：截圖 title ──────────────────────────────────
def test_screenshot_title(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    page.evaluate("window.renderNow()")
    page.screenshot(path="docs/screenshots/title.png")

# ─── Test 10：截圖 running ────────────────────────────────
def test_screenshot_running(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    start_game(page)
    advance(page, 500)
    page.screenshot(path="docs/screenshots/running.png")
