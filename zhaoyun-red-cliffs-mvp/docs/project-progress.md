# Project Progress

## 專案名稱

`zhaoyun-red-cliffs-mvp`

## 目前狀態

✅ **MVP 主幹已完成，Phase 1–8 均已有實作與驗證紀錄**

- 遊戲可玩：移動、belt-scroll 走位、跳躍、攻擊、受傷、死亡、清場推進 4 段、勝利/死亡畫面
- 敵人 AI：刀兵（近戰追擊）、槍兵（保距長槍）
- 關卡系統：4 段清場，清空解鎖下一段
- Playwright 自動化測試：**23/23 全部通過**
- 所有程式碼在 `zhaoyun-mvp/`，測試在 `tests/`
- 趙雲、魏刀兵、魏槍兵都已接上第一輪真實 sprite（`idle / walk / attack / hurt / death`）
- title 畫面已清理完成：首頁不再渲染戰鬥角色，DOM 觸控按鈕會在 title mode 自動隱藏

**目前下一步：** 正式場景素材、Boss/物件資產，或第二輪角色美術 polish
→ 詳見最新交接記錄與 `README.md`

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

## [2026-05-11] 敵人 belt-scroll 對齊與戰鬥測試穩定化

### 目前進度
- 敵人 AI 現在會沿 belt-scroll 深度追向玩家，不再永遠固定在最底 lane
- 刀兵 / 槍兵的 X 軸追擊改成較不易穿過玩家的步進方式
- 戰鬥測試改成鎖定最近目標敵人，不再用「全場總 HP」這種會被換段干擾的判斷
- 第一段清場後推進到第二段的驗證路徑已確認可行

### 改了哪些檔案
- `zhaoyun-mvp/src/game/config.js`
- `zhaoyun-mvp/src/game/entities/enemy-swordsman.js`
- `zhaoyun-mvp/src/game/entities/enemy-spearman.js`
- `tests/test_zhaoyun_mvp.py`

### 跑了哪些測試
- 用 Playwright 臨時腳本驗證敵人會追 `beltY`
- 用 Playwright 臨時腳本驗證玩家可穩定擊殺同一個目標敵人
- 用 Playwright 臨時腳本驗證清掉第一段後 `currentSegment` 會推進到 `1`
- `pytest` 仍未安裝，正式 `python3 -m pytest tests/test_zhaoyun_mvp.py -q` 仍無法直接執行

### 阻塞點
- 本機仍缺少 `pytest`
- 尚未跑完整清場推進與 victory / gameover 的正式回歸測試

### 下一步
- 補齊 `pytest` 後跑整份 `tests/test_zhaoyun_mvp.py`
- 驗證後續區段、victory / gameover 是否和新的敵人追蹤邏輯相容

### 驗證方式
- 啟動 `python3 -m http.server 8080` 後，讓趙雲先往上走位，再觀察敵人是否會沿同一個 belt depth 靠近
- 靠近敵人後轉身攻擊，確認同一個敵人的 `hp` 下降或變成 `death`

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

---

## [2026-05-11] 修正測試 fixture 時序問題，確認 12/12 穩定通過

### 目前進度
所有 Phase 1-5 完成。最後修正 Playwright fixture 的 race condition。

### 改了哪些檔案
- `tests/test_zhaoyun_mvp.py`：fixture 從 `wait_for_timeout(600)` 改為 `wait_for_function("typeof window.render_game_to_text === 'function'")` — 避免 ES module 尚未載入就執行測試

### 跑了哪些測試
指令：`python3 -m pytest tests/test_zhaoyun_mvp.py -v`
結果：**12/12 全部通過（穩定，無 flakiness）**

### 阻塞點
無

### 下一步
**Phase 6 素材接入**，由下一個 agent 接手：
1. 閱讀 `docs/pixel-sprite-game-workflow-handoff.md`
2. 在 `zhaoyun-mvp/assets/sprites/` 放入 AI 生成的 sprite sheet
3. 修改 `zhaoyun-mvp/src/game/assets.js` 載入 sprite
4. 修改 `renderer.js` 從 `ctx.fillRect` 改為 `ctx.drawImage` 繪製 sprite

### 驗證方式
```bash
# 啟動伺服器
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp
python3 -m http.server 8080

# 在另一個 terminal 跑測試
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py -v
# 期望：12/12 passed
```

---

## [2026-05-11] 修正測試邏輯 + 補齊敵人追蹤測試，13/13 穩定通過

### 目前進度
所有 Phase 1-5 完成，測試套件擴充至 13 項全通過。

### 改了哪些檔案
- `tests/test_zhaoyun_mvp.py`：
  - fixture 改用 `wait_for_function` 確保 ES module 載入完再執行（防 race condition）
  - 新增 `test_enemy_tracks_player_belt_y`：驗證敵人沿 belt-scroll 追蹤玩家深度
  - 新增 `test_attack_reduces_target_enemy_hp`：更精確的攻擊命中驗證（靠近敵人再攻）
  - 修正 `test_enemy_tracks_player_belt_y` 讀取時序（需在玩家移動前先讀初始敵人位置）
- `README.md`：更新狀態與下一步說明
- `docs/project-progress.md`：追加本記錄

### 跑了哪些測試
指令：`python3 -m pytest tests/test_zhaoyun_mvp.py -v`
結果：**13/13 全部通過**

| 測試 | 說明 |
|------|------|
| test_initial_state_is_title | 初始 mode = title ✅ |
| test_start_game_enters_running | startGame → running ✅ |
| test_player_initial_stats | 初始血量與狀態 ✅ |
| test_player_moves_right | 右移改變 x ✅ |
| test_player_moves_left | 左移改變 x ✅ |
| test_player_belt_scrolls_without_jumping | ArrowUp 改 beltY，不觸發跳躍 ✅ |
| test_player_jumps_with_x_and_lands | X 起跳並落地 ✅ |
| test_first_segment_has_enemies | 第一段有存活敵人 ✅ |
| test_enemy_tracks_player_belt_y | 敵人追蹤玩家 belt-scroll 深度 ✅ |
| test_attack_reduces_target_enemy_hp | 攻擊減少目標敵人血量 ✅ |
| test_text_state_schema | JSON 輸出格式正確 ✅ |
| test_screenshot_title | title 畫面截圖 ✅ |
| test_screenshot_running | running 畫面截圖 ✅ |

### 阻塞點
無

### 下一步
**Phase 6 素材接入**，Codex 或下一個 agent 接手：
1. 閱讀 `docs/pixel-sprite-game-workflow-handoff.md`（AI sprite pipeline 說明）
2. 在 `zhaoyun-mvp/assets/sprites/` 放入趙雲、刀兵、槍兵 sprite sheet
3. 建立 `zhaoyun-mvp/src/game/assets.js` 管理圖片載入
4. 修改 `renderer.js`：各 entity 從 `ctx.fillRect` 改為 `ctx.drawImage`
5. 跑 `pytest` 確認 13/13 測試仍通過（非視覺邏輯不應改變）

### 驗證方式
```bash
# 啟動伺服器
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp
python3 -m http.server 8080

# 另一個 terminal
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py -v
# 期望：13/13 passed
```

最新 commit：見下方（master 分支）

---

## [2026-05-11] Phase 6 sprite pipeline 完成，18/18 測試通過

### 目前進度

Phase 6 全部完成（Tasks 12-20）：
- **Pipeline 模組**（`pipeline/`）：Python 腳本，處理 AI 生成圖片 → 可用 spritesheet
  - `snap.py`：Lanczos 降採樣 + 調色盤量化，消除 mixel 雜訊
  - `recover.py`：Chroma key 提取分格圖的單格，bounding box 裁切
  - `align.py`：底部對齊所有 frame，消除 frame drift
  - `pack.py`：打包 spritesheet + 輸出 `atlas.json`
  - `run.py`：CLI 入口，支援 `snap/recover/align/pack/all` 子命令
  - `gen_placeholder.py`：生成色塊測試用 spritesheet（不需要真實素材即可測試 JS 端）
- **遊戲端整合**（`zhaoyun-mvp/src/game/`）：
  - `assets.js`（新增）：瀏覽器端 sprite 載入器，`loadSprite(character)` / `getFrame()` / `calcFrameIndex()` / `isLoaded()` / `loadAssets()`
  - `renderer.js`（修改）：新增 `drawSprite()` helper，各 entity 優先用 sprite，fallback 為色塊
- **測試**（`tests/test_sprite_integration.py`）：4 個 smoke tests 驗證 pipeline 輸出與遊戲整合
- **測試修復**：修正 `test_player_belt_scrolls_without_jumping`（advance 500ms→200ms，避免玩家撞到 belt 邊界導致 state 變 idle）

### 改了哪些檔案

新增：
- `pipeline/snap.py`
- `pipeline/recover.py`
- `pipeline/align.py`
- `pipeline/pack.py`
- `pipeline/run.py`
- `pipeline/gen_placeholder.py`
- `zhaoyun-mvp/src/game/assets.js`
- `tests/test_sprite_integration.py`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/sheet.png`（placeholder）
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/sheet.png`（placeholder）
- `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/atlas.json`
- `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/sheet.png`（placeholder）
- `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/atlas.json`

修改：
- `zhaoyun-mvp/src/game/renderer.js`（新增 drawSprite helper，替換 fillRect）
- `tests/test_zhaoyun_mvp.py`（advance 500ms→200ms，修正 belt-scroll 邊界時序）

### 跑了哪些測試

指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
結果：**18/18 全部通過**

| 測試 | 說明 |
|------|------|
| test_initial_state_is_title | 初始 mode = title ✅ |
| test_start_game_enters_running | startGame → running ✅ |
| test_player_initial_stats | 初始血量與狀態 ✅ |
| test_player_moves_right | 右移改變 x ✅ |
| test_player_moves_left | 左移改變 x ✅ |
| test_player_belt_scrolls_without_jumping | ArrowUp 改 beltY，不觸發跳躍 ✅ |
| test_player_jumps_with_x_and_lands | X 起跳並落地 ✅ |
| test_first_segment_has_enemies | 第一段有存活敵人 ✅ |
| test_enemy_tracks_player_belt_y | 敵人追蹤玩家 belt-scroll 深度 ✅ |
| test_attack_reduces_target_enemy_hp | 攻擊減少目標敵人血量 ✅ |
| test_clearing_first_segment_advances_level | 清場後推進到第二段 ✅ |
| test_text_state_schema | JSON 輸出格式正確 ✅ |
| test_screenshot_title | title 畫面截圖 ✅ |
| test_screenshot_running | running 畫面截圖 ✅ |
| test_placeholder_sprite_files_exist | placeholder sprite 檔案存在 ✅ |
| test_atlas_json_structure | atlas.json 格式正確 ✅ |
| test_game_loads_without_errors | 遊戲載入無 console error ✅ |
| test_game_renders_with_sprite_or_fallback | 遊戲用 sprite 或 fallback 色塊渲染 ✅ |

### 阻塞點

無

### 下一步

**真實 AI 素材接入**（下一個 agent 接手）：

1. 準備 AI 生成 sprite 圖片（poseboard 分格圖，3×4 格，每格一個動作幀）
2. 放到 `pipeline/input/<character>/poseboard.png`
3. 執行 Pipeline（在 `zhaoyun-red-cliffs-mvp/` 目錄）：
   ```bash
   cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
   python3 pipeline/run.py all --character zhaoyun
   python3 pipeline/run.py all --character wei-swordsman
   python3 pipeline/run.py all --character wei-spearman
   ```
4. 輸出自動放到 `zhaoyun-mvp/assets/sprites/<character>/runtime/`
5. 跑測試確認 18/18 仍通過

**Pipeline 模組說明：**
- `snap.py`：消除 AI 圖的 mixel → 乾淨像素風格
- `recover.py`：從分格圖（預設 3×4 格）提取每格 frame（chroma key + bounding box）
- `align.py`：底部對齊，消除 frame 之間的位移飄移
- `pack.py`：合併成 spritesheet，輸出 atlas.json

**atlas.json 格式：**
```json
{
  "frameWidth": 48,
  "frameHeight": 64,
  "animations": {
    "idle": {
      "fps": 8,
      "frames": [{"x": 0, "y": 0, "w": 48, "h": 64}]
    }
  }
}
```

### 驗證方式

```bash
# 啟動伺服器
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp
python3 -m http.server 8080

# 另一個 terminal
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
# 期望：18/18 passed
```

**目前目錄結構（pipeline）：**
```
zhaoyun-red-cliffs-mvp/
├── pipeline/
│   ├── snap.py
│   ├── recover.py
│   ├── align.py
│   ├── pack.py
│   ├── run.py
│   └── gen_placeholder.py
├── zhaoyun-mvp/
│   └── assets/sprites/
│       ├── zhaoyun/runtime/{sheet.png, atlas.json}
│       ├── wei-swordsman/runtime/{sheet.png, atlas.json}
│       └── wei-spearman/runtime/{sheet.png, atlas.json}
└── tests/
    ├── test_zhaoyun_mvp.py        # 14 個遊戲邏輯測試
    └── test_sprite_integration.py  # 4 個 sprite 整合測試
```

---

## [2026-05-11] Phase 7：視差背景 + 打擊感強化，20/20 通過

### 目前進度

Phase 7 全部完成（Tasks 21-28）：
- **視差背景**：4 層捲動（天空漸層、遠山 0.05×、帳篷旗幟 0.25×、地面紋路 0.6×），純 Canvas2D 繪製，不需要圖片
- **螢幕震動**：攻擊命中敵人 intensity=5/timer=8，玩家受傷 intensity=10/timer=12；HUD 不受影響
- **打擊凍幀**：命中後 hitFreeze=2，跳過 2 幀遊戲邏輯，強化衝擊感
- **命中粒子**：6 個放射狀粒子，命中=黃色，擊殺=橘紅色，含重力衰減
- **測試**：20/20 遊戲 + sprite 整合測試全通過（pipeline 測試另計 14 個）

### 改了哪些檔案

新增：
- `zhaoyun-mvp/src/game/particles.js`（spawnHitParticles / updateParticles）

修改：
- `zhaoyun-mvp/src/game/renderer.js`：drawBackground()（視差）、drawParticles()、ctx.save/translate 震動偏移
- `zhaoyun-mvp/src/game/state.js`：加入 screenShake / hitFreeze / particles 欄位
- `zhaoyun-mvp/src/game/text-state.js`：暴露 particles.length / screenShake.timer
- `zhaoyun-mvp/src/game/combat.js`：hurtEnemy 觸發粒子 + 震動；玩家受傷觸發震動
- `zhaoyun-mvp/src/main.js`：tick 加入粒子更新 + 震動衰減 + hitFreeze 凍幀邏輯
- `tests/test_zhaoyun_mvp.py`：新增 test_hit_feel_fields_exist / test_attack_triggers_screen_shake

### 跑了哪些測試

指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
結果：**20/20 全部通過**

### 阻塞點

無

### 下一步

Phase 8（選項，擇一繼續）：
1. **音效**：Web Audio API 純程式生成 8-bit 音效（攻擊、受傷、死亡、通關）
2. **行動裝置觸控按鍵**：畫面下方虛擬搖桿與按鈕
3. **真實 AI sprite 素材**：準備 poseboard 圖片，執行 `pipeline/run.py all --character <name>`

### 驗證方式

```bash
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp
python3 -m http.server 8080
# 瀏覽器開 http://localhost:8080
# 往右走：確認背景各層以不同速度移動
# 攻擊命中敵人：確認畫面輕微震動 + 黃色粒子噴濺
# 被打到：確認震動更強

# 另一個 terminal
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
# 期望：20/20 passed
```

---

## [2026-05-11] 補齊趙雲真實素材 prompt pack

### 目前進度
- 補上真實 AI 素材接入的上游規格文件，讓 `image2 + agent-sprite-forge + pipeline/` 可以直接開始生第一批角色圖
- 把起手順序明確定成：`趙雲 reference → 趙雲 idle poseboard → pipeline 驗證 → 趙雲 walk`
- 修正文檔理解落差：現有 `pipeline/run.py` 的真實流程是「每個 action 各自餵一張 poseboard」，不是只丟單一 `poseboard.png` 就完成全部動作

### 改了哪些檔案
- `docs/zhaoyun-sprite-prompt-pack.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 無，這次只新增與更新文件，沒有改動遊戲程式或 pipeline 程式碼

### 阻塞點
- 真實角色素材尚未生成
- `pipeline/input/` 的實際輸入圖仍需由下一步的 image2 / agent-sprite-forge 流程產出

### 下一步
- 先用 `docs/zhaoyun-sprite-prompt-pack.md` 的 `Reference Prompt A` 生成 2 到 4 張趙雲候選圖
- 選定 `reference-v1.png` 後，再生成 `idle-poseboard-v1.png`
- 跑 `pipeline/run.py all --character zhaoyun --action idle --poseboard ...`

### 驗證方式
- 檢查 `docs/zhaoyun-sprite-prompt-pack.md` 是否已包含：
  - 趙雲 `reference / idle / walk` prompt
  - negative prompt
  - pipeline 命令範例
  - 命名與版本規則

---

## [2026-05-11] 建立趙雲素材輸入骨架與 agent-sprite-forge 操作稿

### 目前進度
- 已建立 `pipeline/input/` 入口說明與 `pipeline/input/zhaoyun/` 輸入骨架
- 已把 `reference / idle / walk` prompt 與 negative prompt 拆成可直接使用的 `.txt` 檔
- 已補一份 `agent-sprite-forge` 專用 runbook，讓下一步可以直接從趙雲 reference 開始產圖

### 改了哪些檔案
- `pipeline/input/README.md`
- `pipeline/input/zhaoyun/agent-sprite-forge-runbook.md`
- `pipeline/input/zhaoyun/reference-prompt-a.txt`
- `pipeline/input/zhaoyun/reference-prompt-b.txt`
- `pipeline/input/zhaoyun/reference-negative.txt`
- `pipeline/input/zhaoyun/idle-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/idle-negative.txt`
- `pipeline/input/zhaoyun/walk-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/walk-negative.txt`
- `docs/project-progress.md`

### 跑了哪些測試
- 無，這次只新增素材流程文件與輸入骨架，沒有改動遊戲程式或 pipeline 程式邏輯

### 阻塞點
- 真實角色圖片仍未生成
- 尚未把 `reference-v1.png` 與 `idle-poseboard-v1.png` 放進 `pipeline/input/zhaoyun/`

### 下一步
- 用 `pipeline/input/zhaoyun/reference-prompt-a.txt` 先生成 2 到 4 張趙雲候選圖
- 選出 `reference-v1.png`
- 再用 `pipeline/input/zhaoyun/idle-poseboard-prompt.txt` 生成 `idle-poseboard-v1.png`

### 驗證方式
- 檢查 `pipeline/input/zhaoyun/` 是否已有 prompt txt、negative txt 與 runbook
- 確認 `pipeline/input/README.md` 的命令範例與 `pipeline/run.py` 參數一致

---

## [2026-05-11] Phase 8：2.5D 升級（透視縮放 + 衝刺系統）

### 目前進度
- 透視縮放：角色依 beltY 縮放（遠景 0.8×，近景 1.2×）
- Painter's Algorithm：所有角色依 beltY 排序繪製，近景蓋遠景
- 地板透視橫線：二次方分布，強化近大遠小感
- 跳躍陰影：起跳時地板出現橢圓陰影，越高越淡
- 走位帶：60px → 120px，戰場縱深大幅提升
- 衝刺（C 鍵）：12 幀衝刺，60 幀冷卻，可接 Z/X 取消
- 衝刺 UI：右上角冷卻進度條
- 測試：23/23 全部通過

### 改了哪些檔案
- `zhaoyun-mvp/src/game/config.js`：BELT_Y_RANGE/TOLERANCE/速度/衝刺常數
- `zhaoyun-mvp/src/game/renderer.js`：透視縮放、Painter's Algorithm、陰影、UI
- `zhaoyun-mvp/src/game/state.js`：dashTimer/dashCooldown
- `zhaoyun-mvp/src/game/text-state.js`：暴露衝刺欄位
- `zhaoyun-mvp/src/game/entities/player.js`：衝刺狀態機
- `tests/test_zhaoyun_mvp.py`：3 個衝刺測試

### 阻塞點
無

### 下一步
Phase 9（選項）：
1. 音效（Web Audio API）
2. 行動裝置觸控按鍵
3. 真實 AI sprite 素材接入

### 驗證方式
```bash
cd zhaoyun-mvp && python3 -m http.server 8080
# 瀏覽器 http://localhost:8080
# 往上走：確認角色變小；往下走：確認角色變大
# 跳躍：確認地板出現陰影
# C 鍵：確認快速衝刺，右上角有冷卻條
# 攻擊敵人：確認透視縮放下仍可命中

cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
# 23/23 passed
```

---

## [2026-05-11] 趙雲真實素材第一輪接入（reference + idle + walk）

### 目前進度
- 已生成並選定 `pipeline/input/zhaoyun/reference-v1.png`
- 已生成 `pipeline/input/zhaoyun/idle-poseboard-v1.png`
- 已生成 `pipeline/input/zhaoyun/walk-poseboard-v1.png`
- 已成功執行：
  - `python3 pipeline/run.py all --character zhaoyun --action idle ...`
  - `python3 pipeline/run.py all --character zhaoyun --action walk ...`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 目前包含 `idle + walk`
- 主角在 `idle / walk` 狀態可用真實 sprite，其他動作目前仍會 fallback 到色塊

### 改了哪些檔案
- `pipeline/input/zhaoyun/reference-v1.png`
- `pipeline/input/zhaoyun/reference-candidate-a.png`
- `pipeline/input/zhaoyun/idle-poseboard-v1.png`
- `pipeline/input/zhaoyun/walk-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/idle/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/idle/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/walk/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/walk/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- 趙雲 `attack / hurt / death` 尚未生成真實 poseboard
- `wei-swordsman / wei-spearman` 仍是 placeholder runtime sprite

### 下一步
- 先做趙雲 `attack-poseboard-v1.png`
- 跑 `pipeline/run.py all --character zhaoyun --action attack --poseboard ...`
- 再補 `hurt` 與 `death`
- 主角 5 個動作齊後，再開始 `wei-swordsman`

### 驗證方式
- 檢查 `pipeline/input/zhaoyun/` 是否已有：
  - `reference-v1.png`
  - `idle-poseboard-v1.png`
  - `walk-poseboard-v1.png`
- 檢查 `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 是否同時有 `idle` 和 `walk`
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```

---

## [2026-05-11] 趙雲 attack poseboard 接入完成，23/23 通過

### 目前進度
- 已建立 `pipeline/input/zhaoyun/attack-poseboard-prompt.txt` 與 `attack-negative.txt`
- 已生成 `pipeline/input/zhaoyun/attack-poseboard-v1.png`
- 已成功執行 `python3 pipeline/run.py all --character zhaoyun --action attack --poseboard ...`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 現在包含 `idle + walk + attack`
- 主角普通攻擊狀態可改用真實 sprite，不再只靠 fallback 色塊

### 改了哪些檔案
- `pipeline/input/zhaoyun/attack-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/attack-negative.txt`
- `pipeline/input/zhaoyun/attack-poseboard-v1.png`
- `pipeline/input/zhaoyun/agent-sprite-forge-runbook.md`
- `pipeline/input/README.md`
- `docs/zhaoyun-sprite-prompt-pack.md`
- `README.md`
- `docs/project-progress.md`
- `zhaoyun-mvp/assets/sprites/zhaoyun/attack/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/attack/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- 趙雲 `hurt / death` 尚未生成真實 poseboard
- 槍兵與刀兵仍是 placeholder runtime sprite

### 下一步
- 先做 `hurt-poseboard-v1.png`
- 再做 `death-poseboard-v1.png`
- 主角五動作齊全後，再開始 `wei-swordsman`

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 是否同時有 `idle`、`walk`、`attack`
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```

---

## [2026-05-12] 修正趙雲 attack 頭部造型漂移（移除頭盔）

### 目前進度
- 發現第一版 `attack-poseboard-v1.png` 錯把趙雲做成頭盔版，與 `reference-v1` 的頭帶 + 露髮設定不一致
- 已修正 `attack-poseboard-prompt.txt`，強制沿用：
  - 無頭盔
  - 銀色頭帶
  - 額前藍寶石
  - 深色頭髮
  - 白色高馬尾
- 已重新生成 `attack-poseboard-v1.png`
- 已重跑 `pipeline/run.py all --character zhaoyun --action attack ...`
- `runtime atlas` 已更新為無頭盔版攻擊動畫

### 改了哪些檔案
- `pipeline/input/zhaoyun/attack-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/attack-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/attack/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/attack/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/sheet.png`
- `docs/project-progress.md`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- 趙雲 `hurt / death` 尚未生成真實 poseboard
- 刀兵與槍兵仍是 placeholder runtime sprite

### 下一步
- 先做 `hurt-poseboard-v1.png`
- 再做 `death-poseboard-v1.png`
- 主角五動作齊全後，再開始 `wei-swordsman`

### 驗證方式
- 目視檢查 `pipeline/input/zhaoyun/attack-poseboard-v1.png` 是否為頭帶版趙雲
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```

---

## [2026-05-12] 趙雲五個核心動作全部接入完成，23/23 通過

### 目前進度
- 已生成並接入：
  - `reference-v1.png`
  - `idle-poseboard-v1.png`
  - `walk-poseboard-v1.png`
  - `attack-poseboard-v1.png`
  - `hurt-poseboard-v1.png`
  - `death-poseboard-v1.png`
- 已成功執行：
  - `python3 pipeline/run.py all --character zhaoyun --action hurt ...`
  - `python3 pipeline/run.py all --character zhaoyun --action death ...`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 現在完整包含：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 趙雲主角目前五個核心狀態都已脫離 placeholder/fallback 色塊

### 改了哪些檔案
- `pipeline/input/zhaoyun/hurt-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/hurt-negative.txt`
- `pipeline/input/zhaoyun/death-poseboard-prompt.txt`
- `pipeline/input/zhaoyun/death-negative.txt`
- `pipeline/input/zhaoyun/hurt-poseboard-v1.png`
- `pipeline/input/zhaoyun/death-poseboard-v1.png`
- `pipeline/input/zhaoyun/agent-sprite-forge-runbook.md`
- `README.md`
- `docs/zhaoyun-sprite-prompt-pack.md`
- `docs/project-progress.md`
- `zhaoyun-mvp/assets/sprites/zhaoyun/hurt/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/hurt/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/death/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/death/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- `wei-swordsman` 與 `wei-spearman` 仍是 placeholder runtime sprite

### 下一步
- 開始做 `wei-swordsman`
- 優先順序：`reference → idle → walk`
- 等刀兵穩定後，再做 `wei-spearman`

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/sprites/zhaoyun/runtime/atlas.json` 是否同時有：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```


---

## [2026-05-12] 魏刀兵五個核心動作全部接入完成，23/23 通過

### 目前進度
- 已生成並接入 `wei-swordsman`：
  - `reference-v1.png`
  - `idle-poseboard-v1.png`
  - `walk-poseboard-v1.png`
  - `attack-poseboard-v1.png`
  - `hurt-poseboard-v1.png`
  - `death-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/atlas.json` 現在完整包含：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 魏刀兵目前五個核心狀態都已脫離 placeholder/fallback 色塊

### 改了哪些檔案
- `pipeline/input/wei-swordsman/reference-v1.png`
- `pipeline/input/wei-swordsman/idle-poseboard-v1.png`
- `pipeline/input/wei-swordsman/walk-poseboard-v1.png`
- `pipeline/input/wei-swordsman/attack-poseboard-v1.png`
- `pipeline/input/wei-swordsman/hurt-poseboard-v1.png`
- `pipeline/input/wei-swordsman/death-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/idle/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/idle/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/walk/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/walk/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/attack/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/attack/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/hurt/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/hurt/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/death/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/death/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/atlas.json`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- `wei-spearman` 仍是 placeholder runtime sprite
- `wei-swordsman` 的 prompt txt / negative txt / runbook 還沒像趙雲那樣完整補到 `attack / hurt / death`

### 下一步
- 開始做 `wei-spearman`
- 優先順序：`reference → idle → walk`
- 等槍兵穩定後，再決定是否補完整五動作，或回頭把刀兵文件補齊

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/sprites/wei-swordsman/runtime/atlas.json` 是否同時有：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```

---

## [2026-05-12] 魏槍兵五個核心動作全部接入完成，23/23 通過

### 目前進度
- 已生成並接入 `wei-spearman`：
  - `reference-v1.png`
  - `idle-poseboard-v1.png`
  - `walk-poseboard-v1.png`
  - `attack-poseboard-v1.png`
  - `hurt-poseboard-v1.png`
  - `death-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/atlas.json` 現在完整包含：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 目前 MVP 三個角色線都已脫離 placeholder/fallback 色塊：
  - `zhaoyun`
  - `wei-swordsman`
  - `wei-spearman`

### 改了哪些檔案
- `pipeline/input/wei-spearman/agent-sprite-forge-runbook.md`
- `pipeline/input/wei-spearman/reference-prompt-a.txt`
- `pipeline/input/wei-spearman/reference-negative.txt`
- `pipeline/input/wei-spearman/idle-poseboard-prompt.txt`
- `pipeline/input/wei-spearman/idle-negative.txt`
- `pipeline/input/wei-spearman/walk-poseboard-prompt.txt`
- `pipeline/input/wei-spearman/walk-negative.txt`
- `pipeline/input/wei-spearman/attack-poseboard-prompt.txt`
- `pipeline/input/wei-spearman/hurt-poseboard-prompt.txt`
- `pipeline/input/wei-spearman/death-poseboard-prompt.txt`
- `pipeline/input/wei-spearman/reference-v1.png`
- `pipeline/input/wei-spearman/idle-poseboard-v1.png`
- `pipeline/input/wei-spearman/walk-poseboard-v1.png`
- `pipeline/input/wei-spearman/attack-poseboard-v1.png`
- `pipeline/input/wei-spearman/hurt-poseboard-v1.png`
- `pipeline/input/wei-spearman/death-poseboard-v1.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/idle/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/idle/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/walk/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/walk/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/attack/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/attack/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/hurt/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/hurt/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/death/recovered/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/death/aligned/frame-*.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/atlas.json`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- 沒有功能性阻塞；目前主要剩美術一致性與遊戲內視覺驗證
- `wei-swordsman` 的 negative / runbook 還可以補得更完整，和趙雲、槍兵對齊

### 下一步
- 在遊戲內驗證三個角色的實戰可讀性
- 視需要微調比例、槍長、命中姿態與倒地輪廓
- 再決定要進 Boss、場景物件，還是第二輪角色美術 polish

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/sprites/wei-spearman/runtime/atlas.json` 是否同時有：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 跑：
  ```bash
  cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
  python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
  ```

---

## [2026-05-12] 遊戲內視覺驗證完成，角色縮放與場景 fallback 已調整

### 目前進度
- 已在遊戲內重新檢查真實素材上線後的戰鬥畫面
- 角色 sprite 現在比先前更大、更容易辨識：
  - 趙雲使用 `PLAYER_RENDER_SCALE`
  - 魏刀兵使用 `SWORDSMAN_RENDER_SCALE`
  - 魏槍兵使用 `SPEARMAN_RENDER_SCALE`
- 已暫時關閉帶標籤的場景 placeholder PNG，改回較乾淨的 Canvas fallback 場景
- `docs/screenshots/running.png` 與 `docs/screenshots/title.png` 已由測試重寫，可作為目前畫面基準

### 改了哪些檔案
- `zhaoyun-mvp/src/game/config.js`
- `zhaoyun-mvp/src/game/state.js`
- `zhaoyun-mvp/src/game/entities/enemy-swordsman.js`
- `zhaoyun-mvp/src/game/entities/enemy-spearman.js`
- `zhaoyun-mvp/src/game/renderer.js`
- `docs/project-progress.md`

### 跑了哪些測試
- 指令：`python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 視覺驗證結論
- 角色尺寸已比上一版明顯更好讀，刀、槍與倒地輪廓在戰鬥畫面中更容易辨識
- 場景 fallback 在關掉 placeholder PNG 後更乾淨，不再被 `FG / MID / FAR` 文字與高飽和紅柱干擾
- 目前仍可再提升的方向：
  - 之後補正式場景素材，取代現在的 Canvas fallback
  - 視需要微調趙雲與槍兵的槍長、近景縮放或血條位置

### 下一步
- 做正式場景素材，或先補 Boss / 物件資產
- 如果繼續 polish 角色，先從趙雲與槍兵的近景比例微調開始

---

## [2026-05-13] Title 畫面清理驗證完成，測試前置條件已補充

### 目前進度
- 已確認 title mode 不再渲染戰鬥角色或 HUD 主體，只保留首頁標題卡與 canvas 內控制提示
- 已確認 DOM 觸控按鈕在 title mode 會隱藏，不會再覆蓋在首頁上
- `docs/screenshots/title.png` 與 `docs/screenshots/running.png` 已重新檢查，可作為目前 UI 基準
- 今日第一次跑 pytest 失敗並非程式回歸，而是本地 `http://localhost:8080/` 未啟動；補起 `http.server` 後測試恢復全綠

### 改了哪些檔案
- `README.md`
- `docs/project-progress.md`
- `docs/plans/2026-05-12-codex-issues-handoff.md`

### 跑了哪些測試
- 先啟動：`cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 再跑：`cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp && python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 結果：**23/23 passed**

### 阻塞點
- 無功能性阻塞
- 目前最容易造成假性失敗的點是：忘記先啟動 `zhaoyun-mvp/` 下的 `python3 -m http.server 8080`

### 下一步
- 若優先做畫面品質：先製作正式場景素材，取代目前 Canvas fallback 背景
- 若優先做玩法內容：補 Boss 或可互動場景物件
- 若優先做美術 polish：第二輪微調趙雲、魏刀兵、魏槍兵的近景比例與武器長度

### 驗證方式
- 開 `http.server 8080` 後執行 `pytest`，確認 `23/23 passed`
- 檢查 `docs/screenshots/title.png`：首頁不應看到戰鬥角色，也不應看到 DOM 觸控按鈕
- 檢查 `docs/screenshots/running.png`：三個角色應維持真實 sprite，場景背景應為乾淨的 Canvas fallback

---

## [2026-05-13] 場景素材線正式啟動，先建立遠景三張生成規格

### 目前進度
- 已決定場景產圖採分批替換，不一次重做 10 張
- 第一批先做遠景三張：
  - `bg-mountains.png`
  - `bg-river.png`
  - `bg-camp.png`
- 已建立 `pipeline/input/scene-far/`，專門存放遠景生成規格
- 已補齊遠景 runbook 與 3 組 prompt / negative prompt
- 這一輪只整理上游產圖規格，尚未替換 `zhaoyun-mvp/assets/scene/` 內的 placeholder PNG

### 改了哪些檔案
- `pipeline/input/scene-far/agent-scene-runbook.md`
- `pipeline/input/scene-far/bg-mountains-prompt.txt`
- `pipeline/input/scene-far/bg-mountains-negative.txt`
- `pipeline/input/scene-far/bg-river-prompt.txt`
- `pipeline/input/scene-far/bg-river-negative.txt`
- `pipeline/input/scene-far/bg-camp-prompt.txt`
- `pipeline/input/scene-far/bg-camp-negative.txt`
- `pipeline/input/README.md`
- `docs/project-progress.md`

### 跑了哪些測試
- 無
- 原因：本輪只新增場景 prompt 與交接規格，未改動 renderer、資產載入或遊戲邏輯

### 阻塞點
- 無功能性阻塞
- 下一步若要真正換圖，需要在圖像流程中依這份 runbook 生成透明 PNG，並覆蓋 `zhaoyun-mvp/assets/scene/` 的對應檔案

### 下一步
- 依 `pipeline/input/scene-far/agent-scene-runbook.md` 先生成 `bg-mountains` 候選圖
- 選定山脈色調後，再生成 `bg-river`
- 最後生成 `bg-camp`
- 三張遠景替換完成後，再進遊戲內重拍 `title.png` 與 `running.png`

### 驗證方式
- 檢查 `pipeline/input/scene-far/` 是否已有：
  - `agent-scene-runbook.md`
  - `bg-mountains-prompt.txt`
  - `bg-river-prompt.txt`
  - `bg-camp-prompt.txt`
- 確認 `zhaoyun-mvp/assets/scene/` 目前尚未被這一輪覆蓋，避免誤以為正式場景已上線

---

## [2026-05-13] 修正角色粉紅殘色與場景白邊，重打 runtime 與 scene 資產

### 目前進度
- 已在 `pipeline` 層級補上共用 matte 工具，統一處理：
  - 角落背景色偵測
  - soft alpha 去背
  - 邊緣去染色（despill）
  - 背景 fringe 清理
- 角色素材線已重打：
  - `zhaoyun/runtime/sheet.png`
  - `wei-swordsman/runtime/sheet.png`
  - `wei-spearman/runtime/sheet.png`
- 角色 runtime 重新掃描後，`magentaish = 0`
- 場景素材線已重打：
  - `bg-mountains`
  - `bg-river`
  - `bg-camp`
  - `mid-tent`
  - `mid-flag-pole`
  - `mid-bonfire`
- 場景縮放已改成 `premultiplied alpha resize`，避免透明邊在縮放時長出白線

### 改了哪些檔案
- `pipeline/matte.py`
- `pipeline/recover.py`
- `pipeline/process_scene_generated.py`
- `tests/pipeline/test_recover.py`
- `tests/pipeline/test_process_scene_generated.py`
- `zhaoyun-mvp/assets/sprites/*/runtime/sheet.png`
- `zhaoyun-mvp/assets/sprites/*/runtime/atlas.json`
- `zhaoyun-mvp/assets/scene/*.png`

### 跑了哪些驗證
- 以可 import `PIL` 的 Python 執行自訂驗證腳本：
  - 模擬洋紅背景污染邊，確認 `magentaish left = 0`
  - 模擬白底 fringe，確認 `semi_whitish left = 0`
- 重新掃描實際 runtime PNG：
  - `zhaoyun / wei-swordsman / wei-spearman` 三份 spritesheet 都為 `magentaish = 0`

### 阻塞點
- 這台 shell 當前無法直接用 `pytest`，因此這一輪沒有用 pytest 驗證，而是用自訂腳本驗證 matte 邏輯與實際輸出 PNG
- 場景圖仍可能保留極少量 `alpha=1` 的亮點殘值，但已不是整圈白邊問題

### 下一步
- 若玩家仍肉眼看到白邊，優先檢查「source 圖本身」是否帶假透明棋盤或高亮邊，而不是再調 recover / matte 邏輯
- 若要繼續美術 polish，優先重做：
  - `bg-camp`
  - `mid-tent`
- 不需要回頭重修整條角色 sprite pipeline

### 驗證方式
- 檢查三份 runtime spritesheet：不應再看到可辨識的粉紅色塊
- 檢查場景 PNG：邊緣不應有一整圈發亮白線
- 若要追查，先看 source 圖，再看 `pipeline/process_scene_generated.py`

---

## [2026-05-13] 第二輪場景 source 微調：更新 bg-camp 與 mid-tent

### 目前進度
- 已重生成兩張最影響觀感的 source：
  - `pipeline/input/scene-far/bg-camp-source-v3.png`
  - `pipeline/input/scene-mid/mid-tent-source-v2.png`
- 已用新 source 覆蓋：
  - `zhaoyun-mvp/assets/scene/bg-camp.png`
  - `zhaoyun-mvp/assets/scene/mid-tent.png`
- `mid-tent` 目前已明顯優於上一版，帳篷輪廓、開口火光、邊緣可讀性都更穩
- `bg-camp` 已收斂成目前最佳版本，剩下的是少量極低 alpha 殘值，不再是大面積白邊

### 改了哪些檔案
- `pipeline/input/scene-far/bg-camp-source-v3.png`
- `pipeline/input/scene-mid/mid-tent-source-v2.png`
- `pipeline/input/scene-far/bg-camp-candidate-a.png`
- `pipeline/input/scene-mid/mid-tent-candidate-a.png`
- `zhaoyun-mvp/assets/scene/bg-camp.png`
- `zhaoyun-mvp/assets/scene/mid-tent.png`
- `docs/project-progress.md`

### 跑了哪些驗證
- 直接檢視 source 圖與最終輸出圖
- 再次掃描輸出像素，確認 `mid-tent` 已無可見粉紅殘色，`bg-camp` 僅剩極低 alpha 的極少量亮點

### 阻塞點
- 目前沒有功能性阻塞
- 若還要讓 `bg-camp` 更乾淨，重點在 source 圖風格與背景品質，不在現有 pipeline 邏輯

### 下一步
- 重新拍一張最新 `running` 截圖，確認 camp / tent 疊進場景後的實戰觀感
- 若要再往前做畫面品質，下一個最值得重做的是：
  - `mid-bonfire`
  - `bg-river`

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/scene/mid-tent.png`：帳篷邊緣應比舊版乾淨
- 檢查 `zhaoyun-mvp/assets/scene/bg-camp.png`：軍營剪影應更像曹營遠景，不像一般村落或帳篷列

---

## [2026-05-13] 場景第二輪收尾：更新 mid-bonfire 與 bg-river，並用實際遊戲畫面檢查

### 目前進度
- 已重生成並接入：
  - `pipeline/input/scene-mid/mid-bonfire-source-v2.png`
  - `pipeline/input/scene-far/bg-river-source-v2.png`
- 已覆蓋最終輸出：
  - `zhaoyun-mvp/assets/scene/mid-bonfire.png`
  - `zhaoyun-mvp/assets/scene/bg-river.png`
- `mid-bonfire` 目前已無 `semi_whitish` 與 `magentaish` 殘值
- 已用本機 Chrome + Computer Use 檢查實際遊戲畫面，確認：
  - `bg-camp`
  - `mid-tent`
  - `mid-bonfire`
  已成功疊入場景中

### 改了哪些檔案
- `pipeline/input/scene-mid/mid-bonfire-source-v2.png`
- `pipeline/input/scene-far/bg-river-source-v2.png`
- `pipeline/input/scene-mid/mid-bonfire-candidate-a.png`
- `pipeline/input/scene-far/bg-river-candidate-a.png`
- `zhaoyun-mvp/assets/scene/mid-bonfire.png`
- `zhaoyun-mvp/assets/scene/bg-river.png`
- `docs/project-progress.md`

### 跑了哪些驗證
- 重新掃描 `mid-bonfire.png`：
  - `semi_whitish = 0`
  - `magentaish = 0`
- 以本機 `http.server 8080` 啟動遊戲後，用 Chrome 實際查看畫面

### 阻塞點
- Chrome 中遊戲目前會落在既有存檔/狀態導致的 `Game Over` 疊層，不影響場景美術檢查，但若要補正式 running 截圖，之後可再加一個穩定的重置入口
- `bg-river` 雖已比第一版合理，但仍偏 stylized；若要更像遠處水面，可再做第三輪 source 微調

### 下一步
- 若繼續 polish，優先順序建議：
  - `bg-river` 第三輪微調（更低對比、更少高亮）
  - `bg-mountains` 與 `bg-camp` 的色溫一致性
  - 最後才做前景 `fg-*`

### 驗證方式
- 檢查 `zhaoyun-mvp/assets/scene/mid-bonfire.png`：火焰與石圈應清楚且沒有白邊
- 檢查 `zhaoyun-mvp/assets/scene/bg-river.png`：應呈現遠處江面，不應像 UI 發光條

---

## [2026-05-14] 遠景河面第三輪、營火第二輪完成

### 目前進度
- 已重生成並接入：
  - `pipeline/input/scene-mid/mid-bonfire-source-v2.png`
  - `pipeline/input/scene-far/bg-river-source-v3.png`
- 已覆蓋最終輸出：
  - `zhaoyun-mvp/assets/scene/mid-bonfire.png`
  - `zhaoyun-mvp/assets/scene/bg-river.png`
- `mid-bonfire` 目前已掃描為：
  - `semi_whitish = 0`
  - `magentaish = 0`
- `bg-river` 已從「像 UI 亮條」收斂到更接近遠處江面反光，但仍屬 stylized 解法，不是最終美術定稿

### 改了哪些檔案
- `pipeline/input/scene-mid/mid-bonfire-source-v2.png`
- `pipeline/input/scene-far/bg-river-source-v3.png`
- `pipeline/input/scene-mid/mid-bonfire-candidate-a.png`
- `pipeline/input/scene-far/bg-river-candidate-a.png`
- `zhaoyun-mvp/assets/scene/mid-bonfire.png`
- `zhaoyun-mvp/assets/scene/bg-river.png`
- `docs/project-progress.md`

### 跑了哪些驗證
- 直接檢查最終 PNG
- 再次掃描像素殘值
- 用本機 Chrome 實際打開遊戲頁面，確認 camp / tent / bonfire 都已疊入畫面

### 阻塞點
- Chrome 目前打開遊戲時會停在既有 `Game Over` 疊層，因此這輪主要做場景疊層檢查，沒有補正式 `running` 截圖檔
- 若之後要穩定產出整合截圖，建議補一個可由 query param 或 debug API 觸發的乾淨開場狀態

### 下一步
- 若繼續場景 polish，優先建議：
  - `bg-mountains` / `bg-camp` / `bg-river` 做同一輪色溫統一
  - 開始替換 `fg-*` 前景層
- 若改走玩法向，場景這一輪已經夠支撐 MVP，不必再回頭修背景

### 驗證方式
- 檢查 `mid-bonfire.png`：火焰與石圈應乾淨、無白邊
- 檢查 `bg-river.png`：應為低對比遠處水面，不應像介面發光條

---

## [2026-05-14] 安全接入第一個前景層：fg-smoke

### 目前進度
- 已新增可重跑的前景煙霧生成器：
  - `pipeline/generate_fg_smoke.py`
- 已生成並接入：
  - `pipeline/input/scene-fg/fg-smoke-source-v1.png`
  - `zhaoyun-mvp/assets/scene/fg-smoke.png`
- 已修改 `renderer.js` 的場景放行規則，在 `USE_SCENE_IMAGE_PLACEHOLDERS = false` 的情況下，單獨允許 `fg-smoke`
- 其餘前景：
  - `fg-flag-tall`
  - `fg-grass`
  - `fg-rock`
  仍保持禁用，避免 placeholder 一起出現在畫面中
- 已用本機 Chrome 實際查看 title 畫面，確認新煙霧有增加縱深感，但不會洗白帳篷、火光與主標題

### 改了哪些檔案
- `pipeline/generate_fg_smoke.py`
- `pipeline/input/scene-fg/fg-smoke-source-v1.png`
- `zhaoyun-mvp/assets/scene/fg-smoke.png`
- `zhaoyun-mvp/src/game/renderer.js`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些驗證
- 直接解析 PNG alpha，確認 `fg-smoke.png` 不是空圖：
  - `nonzero alpha = 6204`
  - `max alpha = 127`
- 用 `view_image` 檢查輸出輪廓，確認煙霧為透明背景而非灰底色塊
- 啟動 `http.server 8080` 後，用本機 Chrome 檢查實際場景疊圖效果

### 阻塞點
- 目前尚未建立自動化截圖基線，因此這輪仍以人工畫面檢查為主
- 其餘前景資產還是 placeholder，不能直接打開 `USE_SCENE_IMAGE_PLACEHOLDERS`

### 下一步
- 先做 `fg-rock`
- 再做 `fg-grass`
- 最後才做 `fg-flag-tall`
- 每次都維持「只放行真實資產、不要整批開前景」的策略

### 驗證方式
- 打開 `http://127.0.0.1:8080/`
- 檢查 title 畫面中景前方是否有淡煙霧層，但不應遮住標題主字
- 檢查 `renderer.js` 的 `sceneImg()`：應只額外允許 `fg-smoke`

---

## [2026-05-14] 安全接入第二個前景層：fg-rock，並補場景資產 cache-bust

### 目前進度
- 已新增可重跑的前景石塊生成器：
  - `pipeline/generate_fg_rock.py`
- 已生成並接入：
  - `pipeline/input/scene-fg/fg-rock-source-v1.png`
  - `zhaoyun-mvp/assets/scene/fg-rock.png`
- 已在 `renderer.js` 補上場景資產版本參數：
  - `SCENE_ASSET_VERSION = '20260514-fg'`
- 已修改 `sceneImg()` 放行規則，在 `USE_SCENE_IMAGE_PLACEHOLDERS = false` 時，單獨允許：
  - `fg-smoke`
  - `fg-rock`
- `fg-grass` 與 `fg-flag-tall` 仍維持禁用

### 改了哪些檔案
- `pipeline/generate_fg_rock.py`
- `pipeline/input/scene-fg/fg-rock-source-v1.png`
- `zhaoyun-mvp/assets/scene/fg-rock.png`
- `zhaoyun-mvp/src/game/renderer.js`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些驗證
- 直接解析 `fg-rock.png` alpha：
  - `nonzero alpha = 1603`
  - `max alpha = 255`
- `curl -I http://127.0.0.1:8080/assets/scene/fg-rock.png`
  - `Content-Length = 4827`
  - `Last-Modified = Thu, 14 May 2026 04:35:07 GMT`
- 以 `view_image` 檢查輸出輪廓，確認為透明背景石塊，不是文字 placeholder

### 阻塞點
- 本機 Chrome 分頁曾經黏住舊 placeholder 快取，因此這輪補了 scene asset version query 來避免前景圖誤讀舊檔
- 目前仍沒有自動化 screenshot baseline，畫面確認以人工檢查與 HTTP 資產比對為主

### 下一步
- 先做 `fg-grass`
- 最後才做 `fg-flag-tall`
- 維持「真實資產做完一張，就只放行一張」的策略

### 驗證方式
- 打開 `http://127.0.0.1:8080/?v=20260514fg`
- 檢查前景近地面位置是否不再依賴 `FG:fg-rock` placeholder
- 檢查 `renderer.js` 是否已有 `SCENE_ASSET_VERSION`

---

## [2026-05-14] 補齊剩餘前景層：fg-grass 與 fg-flag-tall

### 目前進度
- 已新增可重跑生成器：
  - `pipeline/generate_fg_grass.py`
  - `pipeline/generate_fg_flag_tall.py`
- 已生成並接入：
  - `pipeline/input/scene-fg/fg-grass-source-v1.png`
  - `pipeline/input/scene-fg/fg-flag-tall-source-v1.png`
  - `zhaoyun-mvp/assets/scene/fg-grass.png`
  - `zhaoyun-mvp/assets/scene/fg-flag-tall.png`
- 已把 `renderer.js` 場景資產版本更新為：
  - `SCENE_ASSET_VERSION = '20260514-fg4'`
- 已修改 `sceneImg()` 放行規則，現在在 `USE_SCENE_IMAGE_PLACEHOLDERS = false` 時，前景可安全使用：
  - `fg-smoke`
  - `fg-rock`
  - `fg-grass`
  - `fg-flag-tall`
- 到這裡為止，前景四層都已脫離 placeholder

### 改了哪些檔案
- `pipeline/generate_fg_grass.py`
- `pipeline/generate_fg_flag_tall.py`
- `pipeline/input/scene-fg/fg-grass-source-v1.png`
- `pipeline/input/scene-fg/fg-flag-tall-source-v1.png`
- `zhaoyun-mvp/assets/scene/fg-grass.png`
- `zhaoyun-mvp/assets/scene/fg-flag-tall.png`
- `zhaoyun-mvp/src/game/renderer.js`
- `README.md`
- `docs/project-progress.md`

### 跑了哪些驗證
- `fg-grass.png` alpha 檢查：
  - `nonzero alpha = 1145`
  - `max alpha = 255`
- `fg-flag-tall.png` alpha 檢查：
  - `nonzero alpha = 3926`
  - `max alpha = 255`
  - `min_nonzero = 180`
- `curl -I 'http://127.0.0.1:8080/assets/scene/fg-grass.png?v=20260514-fg3'`
  - `Content-Length = 2801`
- `curl -I 'http://127.0.0.1:8080/assets/scene/fg-flag-tall.png?v=20260514-fg4'`
  - `Content-Length = 3485`
- 以 `view_image` 檢查：
  - `fg-grass.png` 為透明背景草叢
  - `fg-flag-tall.png` 為透明背景高旗

### 阻塞點
- 目前尚未建立「前景四層完整接入後」的自動化整合截圖基線
- 本機 Chrome 偶爾會黏住舊 cache，因此這一輪依賴場景 asset version query 來保證拿到新 PNG

### 下一步
- 進遊戲內做整體畫面驗證：
  - title
  - running
  - game over / victory
- 確認前景四層不會遮住：
  - 主標題
  - 角色血條
  - HUD
- 若有衝突，再調整前景的：
  - alpha
  - spacing
  - Y offset

### 驗證方式
- 打開 `http://127.0.0.1:8080/?v=20260514fg4`
- 檢查不應再出現：
  - `FG:fg-grass`
  - `FG:fg-rock`
  - `FG:fg-smoke`
  - `FG:fg-flag-tall`
  等 placeholder 字樣

---

## [2026-05-14] 完成四個關鍵畫面的整體視覺驗證，並做桌機 UI / 前景小修

### 目前進度
- 已完成四個關鍵畫面的最新截圖驗證：
  - `title`
  - `running`
  - `victory`
  - `gameover`
- 已修正桌機執行時仍顯示觸控按鈕的問題，現在桌機會自動隱藏 `#touch-controls`
- 已調整 `fg-flag-tall`：
  - 降低透明度
  - 拉大間距
  - 整體往右錯位
  讓它不要一直壓在玩家常駐區與 title 主文案下方
- 已把最新驗證截圖同步回 `docs/screenshots/`

### 改了哪些檔案
- `zhaoyun-mvp/styles.css`
- `zhaoyun-mvp/src/game/renderer.js`
- `README.md`
- `docs/project-progress.md`
- `docs/screenshots/title.png`
- `docs/screenshots/running.png`
- `docs/screenshots/victory.png`
- `docs/screenshots/gameover.png`

### 跑了哪些驗證
- `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
  - 結果：`2 passed`
- 驗證內容：
  - 重新產生 `title.png`
  - 重新產生 `running.png`
  - 產生 `victory.png`
  - 產生 `gameover.png`
- 以 `view_image` 實際檢查四張截圖，確認：
  - 桌機 running 畫面已不再顯示觸控按鈕
  - `victory / gameover` 疊層仍可清楚閱讀
  - 前景旗幟不再直接壓在玩家出生區中央

### 阻塞點
- shell 內直接用 Playwright 腳本啟動 Chromium 仍可能受 sandbox 影響；本輪改用暫存 pytest 檔做瀏覽器驗證
- Safari 能看本機頁面，但不適合作為穩定的自動化控制入口，因此最終以 pytest 截圖驗證為準

### 下一步
- 如果要繼續 polish 場景，優先調 `bg-river / mid-bonfire` 的色溫與亮度一致性
- 如果要往玩法前進，下一段比較適合接 Boss、可破壞場景物件，或第二輪角色美術 polish

### 驗證方式
- 啟動：
  - `cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 驗證：
  - `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
- 檢查：
  - `docs/screenshots/title.png`
  - `docs/screenshots/running.png`
  - `docs/screenshots/victory.png`
  - `docs/screenshots/gameover.png`

---

## [2026-05-14] 微調 bg-river 與 mid-bonfire，統一夜戰場景色溫

### 目前進度
- 已新增可重跑的場景調色工具：
  - `pipeline/tune_scene_asset.py`
- 已用調色 preset 產生新的 tuned source：
  - `pipeline/input/scene-far/bg-river-source-v4.png`
  - `pipeline/input/scene-mid/mid-bonfire-source-v3.png`
- 已重新輸出遊戲資產：
  - `zhaoyun-mvp/assets/scene/bg-river.png`
  - `zhaoyun-mvp/assets/scene/mid-bonfire.png`
- 已重新驗證四張關鍵畫面，確認：
  - 江面反光比前一版更暗、更低對比
  - 營火仍有辨識度，但不再比整體場景過度刺眼

### 改了哪些檔案
- `pipeline/tune_scene_asset.py`
- `pipeline/input/scene-far/bg-river-source-v4.png`
- `pipeline/input/scene-far/bg-river-candidate-b.png`
- `pipeline/input/scene-mid/mid-bonfire-source-v3.png`
- `pipeline/input/scene-mid/mid-bonfire-candidate-b.png`
- `zhaoyun-mvp/assets/scene/bg-river.png`
- `zhaoyun-mvp/assets/scene/mid-bonfire.png`
- `README.md`
- `docs/project-progress.md`
- `docs/screenshots/title.png`
- `docs/screenshots/running.png`
- `docs/screenshots/victory.png`
- `docs/screenshots/gameover.png`

### 跑了哪些驗證
- `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
  - 結果：`2 passed`
- 以 `view_image` 檢查：
  - `zhaoyun-mvp/assets/scene/bg-river.png`
  - `zhaoyun-mvp/assets/scene/mid-bonfire.png`
  - `docs/screenshots/title.png`
  - `docs/screenshots/running.png`
  - `docs/screenshots/victory.png`
  - `docs/screenshots/gameover.png`

### 阻塞點
- 這輪是色溫與亮度收斂，不是重做構圖；如果之後還覺得營地層次不夠，下一輪應該處理 `bg-camp / mid-tent`，不是再把 river 拉亮
- 由於目前 thread 的 writable root 不含 `aiproject/`，寫入這個專案時需要授權或沿用已批准的命令前綴

### 下一步
- 如果繼續 polish 場景，優先做：
  - `bg-camp`
  - `mid-tent`
- 如果轉回玩法內容，下一段適合接：
  - Boss
  - 可破壞物件
  - 第二輪角色美術 polish

### 驗證方式
- 啟動：
  - `cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 驗證：
  - `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
- 檢查：
  - `docs/screenshots/running.png` 中的江面不應再像冷藍 UI 亮條
  - `docs/screenshots/title.png` 與 `docs/screenshots/victory.png` 中的營火應亮，但不應搶過主文案

---

## [2026-05-14] 重畫 title 主標與副標，改成書法字體帶像素風格

### 目前進度
- 已重做 title 畫面的主標與副標繪法
- 不是單純改 `font-family`，而是改成：
  - 書法字體堆疊
  - 高解析文字先繪製
  - 再做低解析重採樣
  - 最後以 `imageSmoothingEnabled = false` 回貼
- 結果是：
  - 主標更像招牌式書法字
  - 邊緣保留像素塊感
  - 副標也跟著變成較一致的書法系視覺

### 改了哪些檔案
- `zhaoyun-mvp/src/game/renderer.js`
- `docs/project-progress.md`
- `docs/screenshots/title.png`

### 跑了哪些驗證
- `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
  - 結果：`2 passed`
- 以 `view_image` 檢查最新：
  - `docs/screenshots/title.png`
- 確認：
  - 主標與副標已明顯不同於前一版 serif 標題
  - 仍保留金色光暈與原本的版面結構

### 阻塞點
- 這一輪是程式生成式 title，不是獨立 PNG logo；如果之後要更強的「毛筆飛白」效果，下一輪就要考慮單獨出 title 素材

### 下一步
- 如果要繼續收首頁視覺，最值得做的是：
  - 把 title logo 做成獨立像素招牌圖
  - 或補一層更細的黑底牌匾紋理
- 如果不再收首頁，現在這版已可作為交接基準

### 驗證方式
- 啟動：
  - `cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 驗證：
  - `python3 -m pytest /private/tmp/test_zrc_visual_verify.py -q`
- 檢查：
  - `docs/screenshots/title.png`
  - 主標應呈現書法字形，且邊緣有像素化塊感

---

## [2026-05-14] 依附件重畫冷灰石板地面與殘牆石塊

### 目前進度
- 已把戰場地板從暖棕土路改成偏冷灰藍的石板地面
- 石板加入大塊拼縫、裂縫與磨耗紋理，方向參考使用者提供的街機場景
- `fg-rock` 已重畫成斷裂石牆/石塊感，不再是圓滑土石
- `renderer` 已接入新地板資產 `ground-stone.png`，並保留較淡的 belt 走位輔助線

### 改了哪些檔案
- `pipeline/generate_ground_stone.py`
- `pipeline/generate_fg_rock.py`
- `pipeline/input/scene-ground/ground-stone-source-v1.png`
- `pipeline/input/scene-fg/fg-rock-source-v2.png`
- `zhaoyun-mvp/assets/scene/ground-stone.png`
- `zhaoyun-mvp/assets/scene/fg-rock.png`
- `zhaoyun-mvp/src/game/renderer.js`
- `docs/project-progress.md`

### 跑了哪些驗證
- `view_image` 檢查：
  - `zhaoyun-mvp/assets/scene/ground-stone.png`
  - `zhaoyun-mvp/assets/scene/fg-rock.png`
- 啟動本機頁面：
  - `open http://127.0.0.1:8080`
- 以 Chrome 實機檢查：
  - 地板已呈現冷灰石板而非土路
  - 石頭已呈現斷裂石牆塊感
  - 中景與前景疊上後仍保有角色可讀性

### 阻塞點
- 這輪只重畫地板與石塊，沒有同步重拍 `docs/screenshots/running.png`
- 目前系統 Python 與 bundled Python 都沒有 `pytest`，這輪無法直接重跑 `/private/tmp/test_zrc_visual_verify.py`

### 下一步
- 如果要繼續收場景，優先做：
  - 用同一套冷灰石材語言重畫 `mid-tent` 前的低矮石基
  - 微調 `ground-stone` 明暗，讓玩家腳下區域再亮半級
- 如果先停在這裡，這版已可作為新的場景基準

### 驗證方式
- 啟動：
  - `cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 檢查：
  - `zhaoyun-mvp/assets/scene/ground-stone.png`
  - `zhaoyun-mvp/assets/scene/fg-rock.png`
  - Chrome 本機頁面中的戰鬥畫面
- 預期：
  - 地板應接近冷灰石板城牆地面，不再是棕色泥土地
  - 石頭應像殘牆碎塊，不應像圓滑的小石頭
