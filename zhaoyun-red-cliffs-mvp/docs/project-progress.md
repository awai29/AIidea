# Project Progress

## 專案名稱

`zhaoyun-red-cliffs-mvp`

## 目前狀態

- Implementation plan 已完成並通過審查
- 遊戲子目錄 `zhaoyun-mvp/` 已建立
- 基礎遊戲骨架已建立
- 趙雲角色的移動、belt-scroll 走位、跳躍、攻擊、受傷、死亡已接上第一輪實作
- 敵人、戰鬥、關卡、鏡頭模組已有第一版程式

## 核心文件（依閱讀優先順序）

1. `README.md` — 最短 onboarding，所有 agent 必讀
2. `docs/plans/2026-05-11-zhaoyun-mvp.md` — implementation plan，直接執行
3. `docs/2026-05-11-zhaoyun-side-scroller-mvp-design.md` — 完整遊戲設計規格
4. `docs/pixel-sprite-game-workflow-handoff.md` — AI 素材流程（Phase 6 素材接入時才需要）

## 已確認需求

- 做最小可玩 MVP
- 類型：橫向捲軸清場動作遊戲
- 主角：趙雲
- 過關方式：清場推進（4 段）
- 技術：Vanilla JS + HTML5 Canvas（無 framework）
- 素材策略：正式 AI sprite pipeline，Phase 6 接入，目前先用色塊
- 方向策略：單方向素材 + 遊戲內左右翻轉

## Git 說明

- `.git` 在 `/Users/weiwumbp2024/aiproject/`（上一層）
- commit 從 git root 執行：`cd /Users/weiwumbp2024/aiproject && git add zhaoyun-red-cliffs-mvp/...`

---

## 交接記錄模板

每次完成一段工作後，在下方「交接記錄」區追加以下格式：

```markdown
## [YYYY-MM-DD] [簡短描述]

### 目前進度
（完成了哪些 Phase / Task）

### 改了哪些檔案
（列出建立 / 修改的檔案）

### 跑了哪些測試
（測試指令 + 結果）

### 阻塞點
（遇到的問題，若無填「無」）

### 下一步
（下一個 agent 應該從哪裡接手）

### 驗證方式
（如何確認目前狀態正確）
```

**規則：**
- 不可只改程式不寫交接記錄
- 阻塞點必須填（填「無」也可以，但不能空著）
- 下一步要具體，寫「執行 Task N」不是「繼續開發」

---

## 交接記錄

## [2026-05-11] 角色第一輪實作與驗證

### 目前進度
- 確認文件與實作進度有落差：文件寫未開工，但 `zhaoyun-mvp/` 與核心模組已存在
- 補齊趙雲角色狀態機細節，讓上下走位也會正確進入 `walk` 狀態
- 補角色驗證測試案例：belt-scroll 走位與 X 鍵跳躍循環

### 改了哪些檔案
- `zhaoyun-mvp/src/game/entities/player.js`
- `tests/test_zhaoyun_mvp.py`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 以 Playwright 臨時腳本驗證 `ArrowUp / ArrowDown / KeyX / KeyZ` 行為
- `pytest` 尚未安裝，`python3 -m pytest tests/test_zhaoyun_mvp.py -q` 目前無法執行

### 阻塞點
- 本機缺少 `pytest`
- 既有 `test_attack_reduces_enemy_hp` 仍偏脆弱，後續要改成更 deterministic 的戰鬥腳本

### 下一步
- 先把角色後的戰鬥驗證做穩，調整 `test_attack_reduces_enemy_hp`
- 接著再跑整套角色與戰鬥測試，確認敵人 AI、攻擊判定與清場推進一起成立

### 驗證方式
- 啟動 `cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 用 Playwright 或瀏覽器確認：ArrowUp/Down 只改 beltY、不觸發跳躍；X 可起跳再落地；Z 可進入 attack 狀態

---

## [2026-05-11] 完成全部 MVP 實作（Task 11 手動驗收）

### 目前進度
完成所有 Phase 1-5（Tasks 1-10）：
- Phase 1（Tasks 1-2）：專案骨架、目錄結構、renderer.js 色塊渲染
- Phase 2（Tasks 3-5）：collision.js、player.js 移動跳躍、camera.js 鏡頭跟隨
- Phase 3（Tasks 6-8）：combat.js 戰鬥結算、enemy-swordsman.js 刀兵 AI、enemy-spearman.js 槍兵 AI
- Phase 4（Task 9）：level.js 關卡清場推進（4 段清場）
- Phase 5（Task 10）：Playwright 自動化測試（12/12 通過）

### 改了哪些檔案
修改（Task 11 修復測試時序問題）：
- `tests/test_zhaoyun_mvp.py`（修正 2 個測試：belt-scroll state 讀取時序、攻擊命中範圍）

### 跑了哪些測試
指令：`python3 -m pytest tests/test_zhaoyun_mvp.py -v`
結果：12/12 通過
- test_initial_state_is_title ✅
- test_start_game_enters_running ✅
- test_player_initial_stats ✅
- test_player_moves_right ✅
- test_player_moves_left ✅
- test_player_belt_scrolls_without_jumping ✅
- test_player_jumps_with_x_and_lands ✅
- test_first_segment_has_enemies ✅
- test_attack_reduces_enemy_hp ✅
- test_text_state_schema ✅
- test_screenshot_title ✅
- test_screenshot_running ✅

### 阻塞點
Task 11 發現 2 個測試失敗（非遊戲邏輯 bug，為測試時序問題）：
1. `test_player_belt_scrolls_without_jumping`：keyboard.up 後 gameLoop 又跑了幾幀讓 state 變 idle → 修復：在 keyboard.up 之前讀取 state
2. `test_attack_reduces_enemy_hp`：advance 3000ms 後清場推進至下一段，玩家與新敵人距離太遠無法命中 → 修復：只 advance 500ms，先向右移動靠近敵人再攻擊

### 下一步
Phase 6（素材接入）：依 `docs/pixel-sprite-game-workflow-handoff.md` 替換色塊為 AI 生成 sprite

### 驗證方式
1. `cd zhaoyun-mvp && python3 -m http.server 8080` 後開啟 http://localhost:8080
2. 點擊畫面進入遊戲
3. WASD/方向鍵移動，X 跳躍，Z 攻擊，清場推進 4 段
4. 全清後顯示勝利畫面，R 鍵重開
5. `python3 -m pytest tests/test_zhaoyun_mvp.py -v` 確認 12/12 通過
