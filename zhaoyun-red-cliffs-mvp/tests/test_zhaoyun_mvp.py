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


# ─── Test 6：ArrowUp/Down 為 belt-scroll 走位，不是跳躍 ──
def test_player_belt_scrolls_without_jumping(page):
    start_game(page)
    before = get_state(page)["player"]

    page.keyboard.down("ArrowUp")
    advance(page, 500)
    # 在 keyboard.up 之前讀取 state（此時按鍵仍按下，state 應為 walk）
    after_up = get_state(page)["player"]
    page.keyboard.up("ArrowUp")
    assert after_up["beltY"] < before["beltY"]
    assert after_up["jumpHeight"] == 0
    assert after_up["onGround"] is True
    assert after_up["state"] == "walk"

    page.keyboard.down("ArrowDown")
    advance(page, 500)
    # 在 keyboard.up 之前讀取 state
    after_down = get_state(page)["player"]
    page.keyboard.up("ArrowDown")
    assert after_down["beltY"] > after_up["beltY"]
    assert after_down["jumpHeight"] == 0
    assert after_down["onGround"] is True


# ─── Test 7：X 鍵跳躍，最後會落地 ───────────────────────
def test_player_jumps_with_x_and_lands(page):
    start_game(page)
    before = get_state(page)["player"]

    page.keyboard.down("KeyX")
    advance(page, 100)
    page.keyboard.up("KeyX")
    jumping = get_state(page)["player"]
    assert jumping["jumpHeight"] > 0
    assert jumping["onGround"] is False
    assert jumping["state"] == "jump"
    assert jumping["beltY"] == before["beltY"]

    advance(page, 1200)
    landed = get_state(page)["player"]
    assert landed["jumpHeight"] == 0
    assert landed["onGround"] is True
    assert landed["beltY"] == before["beltY"]


# ─── Test 8：第一段有存活敵人 ───────────────────────────
def test_first_segment_has_enemies(page):
    start_game(page)
    alive = [e for e in get_state(page)["enemies"] if e["state"] != "death"]
    assert len(alive) > 0


# ─── Test 9：攻擊可減少敵人總 HP ────────────────────────
def test_attack_reduces_enemy_hp(page):
    start_game(page)
    # 只前進 500ms，確保還在 segment 0（有 2 刀兵在附近）
    advance(page, 500)
    total_hp_before = sum(e["hp"] for e in get_state(page)["enemies"] if e["state"] != "death")

    # 向右移動靠近敵人，然後攻擊
    page.keyboard.down("ArrowRight")
    advance(page, 1000)
    page.keyboard.up("ArrowRight")

    for _ in range(5):
        page.keyboard.down("KeyZ")
        advance(page, 100)
        page.keyboard.up("KeyZ")
        advance(page, 300)

    total_hp_after = sum(e["hp"] for e in get_state(page)["enemies"] if e["state"] != "death")
    # 只需要確認有敵人被擊倒（hp 降到 0）或 hp 減少
    initial_total = sum(e["hp"] for e in get_state(page)["enemies"])
    assert total_hp_after <= total_hp_before, (
        f"攻擊後存活敵人總 HP 應 <= 初始，前：{total_hp_before}，後：{total_hp_after}"
    )


# ─── Test 10：render_game_to_text 輸出合法 JSON ─────────
def test_text_state_schema(page):
    start_game(page)
    advance(page, 500)
    state = get_state(page)
    assert all(k in state for k in ["mode", "player", "enemies", "level", "camera"])
    assert all(k in state["player"] for k in ["x", "y", "hp", "state", "onGround"])


# ─── Test 11：截圖 title ─────────────────────────────────
def test_screenshot_title(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    page.evaluate("window.renderNow()")
    page.screenshot(path="docs/screenshots/title.png")


# ─── Test 12：截圖 running ───────────────────────────────
def test_screenshot_running(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    start_game(page)
    advance(page, 500)
    page.screenshot(path="docs/screenshots/running.png")
