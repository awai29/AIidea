# Zhaoyun Red Cliffs MVP

## 專案位置

`/Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp`

Git root 在上一層：`/Users/weiwumbp2024/aiproject`（.git 在此）

## 專案目標

建立一個最小可玩的三國題材橫向捲軸動作遊戲 MVP：

- 主角：趙雲
- 類型：清場推進式橫向動作遊戲
- 風格參考：《吞食天地 II：赤壁之戰》
- 技術：Vanilla JS + HTML5 Canvas（無 framework）
- 素材策略：正式 AI sprite pipeline（已接上，趙雲目前有真實 `idle + walk + attack + hurt + death`）
- 方向策略：單方向素材 + 遊戲內左右翻轉

## 目前文件

| 文件 | 用途 |
|------|------|
| `docs/2026-05-11-zhaoyun-side-scroller-mvp-design.md` | 完整遊戲設計規格 |
| `docs/plans/2026-05-11-zhaoyun-mvp.md` | Implementation plan（已審查，可直接執行） |
| `docs/project-progress.md` | 開發進度與交接記錄 |
| `docs/pixel-sprite-game-workflow-handoff.md` | AI 像素素材流程（Phase 6 素材接入時使用） |
| `docs/zhaoyun-sprite-prompt-pack.md` | 趙雲素材 prompt pack |

## 目前狀態

目前已完成：

- 可玩 MVP + 視差背景、打擊感、2.5D 透視縮放、衝刺系統
- 自動化測試目前為 `23/23 passed`
- 趙雲真實素材已接入第一輪：`reference-v1.png`、`idle-poseboard-v1.png`、`walk-poseboard-v1.png`、`attack-poseboard-v1.png`、`hurt-poseboard-v1.png`、`death-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 目前包含 `idle + walk + attack + hurt + death`
- 敵人 `wei-swordsman / wei-spearman` 已完成第一輪真實 runtime sprite 接入，各自都包含 `idle + walk + attack + hurt + death`
- title 畫面已清理完成：不再渲染戰鬥角色，DOM 觸控按鈕也會在首頁隱藏
- 場景遠景 / 中景 / 前景圖層都已接入可用資產
- 前景 `fg-smoke / fg-rock / fg-grass / fg-flag-tall` 已脫離 placeholder，並以版本參數避免舊快取誤讀
- 桌機執行時會自動隱藏觸控按鈕，避免蓋住 HUD 與角色
- `fg-flag-tall` 已降透明度並錯開玩家常駐區，`title / running / victory / gameover` 四個關鍵畫面已完成一次實景驗證
- `bg-river / mid-bonfire` 已再做一輪色溫與亮度收斂，現在更接近同一個夜戰場景

## 下一步

**目前最值得先做的事：**

1. 視玩法需求決定下一步是做 Boss、背景物件，還是做第二輪角色美術 polish
2. 若要再收場景，優先處理 `bg-camp / mid-tent` 的一致性，而不是再改前景結構
3. 若要補驗證，可直接重跑 `docs/screenshots/title.png / running.png / victory.png / gameover.png` 這四張關鍵截圖

**素材開發入口**

1. 主角流程參考 `pipeline/input/zhaoyun/agent-sprite-forge-runbook.md`
2. 刀兵流程參考 `pipeline/input/wei-swordsman/agent-sprite-forge-runbook.md`
3. 槍兵流程參考 `pipeline/input/wei-spearman/agent-sprite-forge-runbook.md`
4. 再對照 `docs/zhaoyun-sprite-prompt-pack.md` 的風格規格
5. 依 prompt 生成新 poseboard，輸出到對應角色的 `pipeline/input/<character>/`

## Agent Handoff 規則

不論是 `Codex` 或 `Claude Code` 接手，都應先讀：

1. `README.md`（本文件）
2. `docs/project-progress.md`
3. `pipeline/input/zhaoyun/agent-sprite-forge-runbook.md`
4. `docs/plans/2026-05-11-zhaoyun-mvp.md`

再開始開工。`docs/2026-05-11-zhaoyun-side-scroller-mvp-design.md` 是完整背景規格，遇到設計邊界時再回去查即可。

## 技術架構

- Canvas 尺寸：800 × 450
- 模組系統：ES Modules（需 http.server，不能直接開 file://）
- 測試 hooks：`window.render_game_to_text()` / `window.advanceTime(ms)` / `window.renderNow()`
- 自動化測試：Playwright (Python)
- 本地伺服器：`cd zhaoyun-mvp && python3 -m http.server 8080`
- 測試前請先啟動本地伺服器；未啟動時，Playwright 會在 `http://localhost:8080/` 直接報 `ERR_CONNECTION_REFUSED`
