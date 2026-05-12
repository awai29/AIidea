"""
效能基準測試

量測遊戲在不同場景下的每幀處理時間：
- Title 畫面（純渲染，無遊戲邏輯）
- 遊戲中（有敵人、戰鬥邏輯）

目標：300 幀平均 < 4ms（60fps = 16.67ms/幀，留足餘量）
"""
import pytest
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8080"
FRAME_BUDGET_MS = 4.0   # 每幀預算（不含 canvas 繪製本身，只算 JS 邏輯）
RENDER_BUDGET_MS = 8.0  # 含渲染的每幀預算


@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        pg = browser.new_page(viewport={"width": 800, "height": 450})
        pg.goto(BASE_URL)
        pg.wait_for_function("typeof window.advanceTime === 'function'", timeout=5000)
        yield pg
        browser.close()


def measure_frames(page, frame_count: int) -> dict:
    """量測執行 frame_count 幀的時間，回傳統計數據。"""
    result = page.evaluate(f"""
        (() => {{
            const FRAMES = {frame_count};
            const times = [];
            for (let i = 0; i < FRAMES; i++) {{
                const t0 = performance.now();
                window.advanceTime(1000 / 60);   // 模擬 1 幀 (~16.67ms)
                const t1 = performance.now();
                times.push(t1 - t0);
            }}
            times.sort((a, b) => a - b);
            const sum = times.reduce((s, t) => s + t, 0);
            return {{
                avg: sum / FRAMES,
                min: times[0],
                max: times[times.length - 1],
                p50: times[Math.floor(FRAMES * 0.50)],
                p95: times[Math.floor(FRAMES * 0.95)],
                p99: times[Math.floor(FRAMES * 0.99)],
                total: sum,
            }};
        }})()
    """)
    return result


class TestTitlePerformance:
    """Title 畫面效能（offscreen canvas 預建後每幀應該很快）"""

    def test_title_avg_frame_time(self, page):
        """Title 畫面 300 幀平均 < 8ms"""
        stats = measure_frames(page, 300)
        print(f"\n[Title] avg={stats['avg']:.2f}ms  p95={stats['p95']:.2f}ms  p99={stats['p99']:.2f}ms  max={stats['max']:.2f}ms")
        assert stats['avg'] < RENDER_BUDGET_MS, (
            f"Title 畫面平均幀時間 {stats['avg']:.2f}ms 超過預算 {RENDER_BUDGET_MS}ms"
        )

    def test_title_p95_frame_time(self, page):
        """Title 畫面 p95 < 16ms（不超過一幀預算）"""
        stats = measure_frames(page, 300)
        assert stats['p95'] < 16.0, (
            f"Title 畫面 p95 幀時間 {stats['p95']:.2f}ms 超過 16ms"
        )


class TestGameplayPerformance:
    """遊戲中效能（有敵人、戰鬥、粒子）"""

    def test_gameplay_avg_frame_time(self, page):
        """遊戲進行 300 幀平均 < 8ms"""
        page.evaluate("window.startGame()")
        # 預熱 60 幀（等敵人生成、快取暖身）
        page.evaluate("window.advanceTime(1000)")
        stats = measure_frames(page, 300)
        print(f"\n[Game] avg={stats['avg']:.2f}ms  p95={stats['p95']:.2f}ms  p99={stats['p99']:.2f}ms  max={stats['max']:.2f}ms")
        assert stats['avg'] < RENDER_BUDGET_MS, (
            f"遊戲平均幀時間 {stats['avg']:.2f}ms 超過預算 {RENDER_BUDGET_MS}ms"
        )

    def test_gameplay_p95_frame_time(self, page):
        """遊戲 p95 幀時間 < 16ms（不超過一幀預算）"""
        page.evaluate("window.startGame()")
        page.evaluate("window.advanceTime(1000)")
        stats = measure_frames(page, 300)
        assert stats['p95'] < 16.0, (
            f"遊戲 p95 幀時間 {stats['p95']:.2f}ms 超過 16ms"
        )

    def test_no_extreme_spikes(self, page):
        """遊戲 300 幀最大值 < 50ms（不出現嚴重卡頓）"""
        page.evaluate("window.startGame()")
        page.evaluate("window.advanceTime(1000)")
        stats = measure_frames(page, 300)
        print(f"\n[Spike] max={stats['max']:.2f}ms")
        assert stats['max'] < 50.0, (
            f"偵測到嚴重卡頓：最大幀時間 {stats['max']:.2f}ms"
        )
