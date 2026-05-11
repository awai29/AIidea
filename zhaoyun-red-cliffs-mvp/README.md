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
- 素材策略：正式 AI sprite pipeline（Phase 6，目前先用色塊）
- 方向策略：單方向素材 + 遊戲內左右翻轉

## 目前文件

| 文件 | 用途 |
|------|------|
| `docs/2026-05-11-zhaoyun-side-scroller-mvp-design.md` | 完整遊戲設計規格 |
| `docs/plans/2026-05-11-zhaoyun-mvp.md` | Implementation plan（已審查，可直接執行） |
| `docs/project-progress.md` | 開發進度與交接記錄 |
| `docs/pixel-sprite-game-workflow-handoff.md` | AI 像素素材流程（Phase 6 素材接入時使用） |

## 目前狀態

進入「可玩骨架 + 整合驗證」階段：

- 遊戲骨架已建立，趙雲角色可移動、belt-scroll 走位、跳躍（X）、攻擊（Z）
- 敵人 AI：刀兵（近戰追擊）、槍兵（保距長槍），已開始追蹤玩家 belt-scroll 深度
- 清場推進、戰鬥、鏡頭模組已有第一版程式
- 已用 Playwright 臨時腳本驗證角色走位、跳躍、敵人追深度、單一目標戰鬥命中
- `pytest` 目前尚未安裝，所以還不能誠實宣稱整份 `tests/test_zhaoyun_mvp.py` 已完整跑過

## 下一步

**目前最值得先做的事：**

1. 補齊 `pytest`，正式跑 `tests/test_zhaoyun_mvp.py`
2. 驗證清場推進、鏡頭鎖區、victory / gameover 的完整回歸
3. 把確定穩定的結果更新到 `docs/project-progress.md`

**玩法穩定後的下一步：Phase 6 素材接入**

1. 閱讀 `docs/pixel-sprite-game-workflow-handoff.md`
2. 在 `zhaoyun-mvp/assets/sprites/` 放入 AI 生成 sprite sheet
3. 修改 `zhaoyun-mvp/src/game/renderer.js`：`ctx.fillRect` → `ctx.drawImage`

## Agent Handoff 規則

不論是 `Codex` 或 `Claude Code` 接手，都應先讀：

1. `README.md`（本文件）
2. `docs/project-progress.md`
3. `docs/plans/2026-05-11-zhaoyun-mvp.md`

再開始開工。`docs/2026-05-11-zhaoyun-side-scroller-mvp-design.md` 是完整背景規格，遇到設計邊界時再回去查即可。

## 技術架構

- Canvas 尺寸：800 × 450
- 模組系統：ES Modules（需 http.server，不能直接開 file://）
- 測試 hooks：`window.render_game_to_text()` / `window.advanceTime(ms)` / `window.renderNow()`
- 自動化測試：Playwright (Python)
- 本地伺服器：`cd zhaoyun-mvp && python3 -m http.server 8080`
