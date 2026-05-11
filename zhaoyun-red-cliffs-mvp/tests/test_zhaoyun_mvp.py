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
        pg.wait_for_function("typeof window.render_game_to_text === 'function'", timeout=5000)
        yield pg
        browser.close()


def get_state(page: Page) -> dict:
    return json.loads(page.evaluate("window.render_game_to_text()"))


def start_game(page: Page):
    page.evaluate("window.startGame()")
    page.wait_for_timeout(50)


def advance(page: Page, ms: int):
    page.evaluate(f"window.advanceTime({ms})")


def get_alive_enemies(state: dict) -> list[dict]:
    return [enemy for enemy in state["enemies"] if enemy["state"] != "death"]


def get_nearest_alive_enemy(state: dict) -> dict | None:
    alive = get_alive_enemies(state)
    if not alive:
        return None
    player_x = state["player"]["x"]
    return min(alive, key=lambda enemy: abs(enemy["x"] - player_x))


def move_player_to_enemy(page: Page, max_steps: int = 80, target_gap: int = 55) -> int:
    for _ in range(max_steps):
        state = get_state(page)
        target = get_nearest_alive_enemy(state)
        if target is None:
            raise AssertionError("找不到可接近的敵人")

        gap = target["x"] - state["player"]["x"]
        if abs(gap) <= target_gap:
            return target["id"]

        key = "ArrowRight" if gap > 0 else "ArrowLeft"
        page.keyboard.down(key)
        advance(page, 100)
        page.keyboard.up(key)

    raise AssertionError("玩家未能在預期時間內靠近敵人")


def face_enemy(page: Page, target_x: int):
    player_x = get_state(page)["player"]["x"]
    key = "ArrowLeft" if target_x < player_x else "ArrowRight"
    page.keyboard.down(key)
    advance(page, 50)
    page.keyboard.up(key)


def attack_target(page: Page, target_id: int, max_cycles: int = 6):
    for _ in range(max_cycles):
        current_state = get_state(page)
        target_enemy = next((enemy for enemy in current_state["enemies"] if enemy["id"] == target_id), None)
        if target_enemy is None or target_enemy["state"] == "death":
            return
        face_enemy(page, target_enemy["x"])
        page.keyboard.down("KeyZ")
        advance(page, 100)
        page.keyboard.up("KeyZ")
        advance(page, 500)


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
    advance(page, 200)  # 200ms ≈ 12 frames × 2px = 24px，未到邊界（range=60），state 應為 walk
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
    alive = get_alive_enemies(get_state(page))
    assert len(alive) > 0


# ─── Test 9：敵人會沿 belt-scroll 深度追向玩家 ───────────
def test_enemy_tracks_player_belt_y(page):
    start_game(page)

    # 在玩家移動前先記錄敵人初始位置
    state_initial = get_state(page)
    target_initial = get_nearest_alive_enemy(state_initial)
    assert target_initial is not None
    enemy_initial_y = target_initial["y"]

    # 玩家往上走（beltY 減少），敵人應跟上
    page.keyboard.down("ArrowUp")
    advance(page, 800)
    page.keyboard.up("ArrowUp")
    player_belt_y = get_state(page)["player"]["beltY"]

    # 再等敵人跟上
    advance(page, 1200)

    state_after = get_state(page)
    target_after = next((enemy for enemy in state_after["enemies"] if enemy["id"] == target_initial["id"]), None)
    assert target_after is not None
    # 敵人應往玩家方向移動（y 減小）
    assert target_after["y"] < enemy_initial_y, (
        f"敵人應從 y={enemy_initial_y} 向玩家 beltY={player_belt_y} 移動，但現在 y={target_after['y']}"
    )


# ─── Test 10：攻擊可減少目標敵人 HP ──────────────────────
def test_attack_reduces_target_enemy_hp(page):
    start_game(page)
    target_id = move_player_to_enemy(page)
    before_state = get_state(page)
    target_before = next(enemy for enemy in before_state["enemies"] if enemy["id"] == target_id)

    attack_target(page, target_id)

    after_state = get_state(page)
    target_after = next(enemy for enemy in after_state["enemies"] if enemy["id"] == target_id)
    assert target_after["hp"] < target_before["hp"] or target_after["state"] == "death", (
        f"目標敵人血量應下降或死亡，前：{target_before['hp']}，後：{target_after['hp']}，狀態：{target_after['state']}"
    )


# ─── Test 11：清掉第一段後會推進到第二段 ────────────────
def test_clearing_first_segment_advances_level(page):
    start_game(page)

    for _ in range(4):
        state = get_state(page)
        if state["level"]["currentSegment"] >= 1:
            break
        target_id = move_player_to_enemy(page)
        attack_target(page, target_id)

    final_state = get_state(page)
    assert final_state["level"]["currentSegment"] >= 1
    assert final_state["level"]["segments"][0]["status"] == "cleared"
    assert final_state["camera"]["locked"] is False


# ─── Test 12：render_game_to_text 輸出合法 JSON ─────────
def test_text_state_schema(page):
    start_game(page)
    advance(page, 500)
    state = get_state(page)
    assert all(k in state for k in ["mode", "player", "enemies", "level", "camera"])
    assert all(k in state["player"] for k in ["x", "y", "hp", "state", "onGround"])


# ─── Test 13：截圖 title ─────────────────────────────────
def test_screenshot_title(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    page.evaluate("window.renderNow()")
    page.screenshot(path="docs/screenshots/title.png")


# ─── Test 14：截圖 running ───────────────────────────────
def test_screenshot_running(page):
    os.makedirs("docs/screenshots", exist_ok=True)
    start_game(page)
    advance(page, 500)
    page.screenshot(path="docs/screenshots/running.png")
