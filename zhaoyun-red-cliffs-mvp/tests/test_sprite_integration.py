"""
sprite 整合 smoke test：
驗證 placeholder sprite 檔案存在、atlas 格式正確、遊戲載入無錯誤。
"""
import json
import os
import pytest
from playwright.sync_api import sync_playwright, Page

BASE_URL = "http://localhost:8080"
SPRITES_ROOT = os.path.join(os.path.dirname(__file__), '..', 'zhaoyun-mvp', 'assets', 'sprites')


@pytest.fixture
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 800, "height": 450})
        pg.goto(BASE_URL)
        pg.wait_for_function("typeof window.render_game_to_text === 'function'", timeout=5000)
        yield pg
        browser.close()


def test_placeholder_sprite_files_exist():
    """確認三個角色的 placeholder sprite 都存在。"""
    for character in ['zhaoyun', 'wei-swordsman', 'wei-spearman']:
        sheet = os.path.join(SPRITES_ROOT, character, 'runtime', 'sheet.png')
        atlas = os.path.join(SPRITES_ROOT, character, 'runtime', 'atlas.json')
        assert os.path.exists(sheet),  f'{character}/runtime/sheet.png 不存在'
        assert os.path.exists(atlas),  f'{character}/runtime/atlas.json 不存在'


def test_atlas_json_structure():
    """驗證 atlas.json 格式符合遊戲端預期。"""
    for character in ['zhaoyun', 'wei-swordsman', 'wei-spearman']:
        atlas_path = os.path.join(SPRITES_ROOT, character, 'runtime', 'atlas.json')
        atlas = json.loads(open(atlas_path).read())
        assert 'frameWidth' in atlas,  f'{character}: missing frameWidth'
        assert 'frameHeight' in atlas, f'{character}: missing frameHeight'
        assert 'animations' in atlas,  f'{character}: missing animations'
        assert isinstance(atlas['frameWidth'], int)
        assert isinstance(atlas['frameHeight'], int)
        for action, data in atlas['animations'].items():
            assert 'frames' in data,  f'{character}/{action}: missing frames'
            assert 'fps' in data,     f'{character}/{action}: missing fps'
            for frame in data['frames']:
                for key in ('x', 'y', 'w', 'h'):
                    assert key in frame, f'{character}/{action}: frame missing key {key}'


def test_game_loads_without_errors(page: Page):
    """遊戲頁面載入後 console 無未處理錯誤。"""
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.evaluate("window.startGame()")
    page.wait_for_timeout(500)
    assert errors == [], f'Console errors: {errors}'


def test_game_renders_with_sprite_or_fallback(page: Page):
    """遊戲啟動後遊戲邏輯正常（sprite 或 fallback 均可）。"""
    page.evaluate("window.startGame()")
    page.wait_for_timeout(300)
    state = json.loads(page.evaluate("window.render_game_to_text()"))
    assert state["mode"] == "running"
    assert state["player"]["hp"] > 0

    # 截圖存檔
    os.makedirs("docs/screenshots", exist_ok=True)
    page.screenshot(path="docs/screenshots/sprite_smoke.png")
