# Project Progress

## 專案名稱

`zhaoyun-red-cliffs-mvp`

## 目前狀態

✅ **MVP 全部完成（Phase 1–5）**

- 遊戲可玩：移動、belt-scroll 走位、跳躍、攻擊、受傷、死亡、清場推進 4 段、勝利/死亡畫面
- 敵人 AI：刀兵（近戰追擊）、槍兵（保距長槍）
- 關卡系統：4 段清場，清空解鎖下一段
- Playwright 自動化測試：**12/12 全部通過**
- 所有程式碼在 `zhaoyun-mvp/`，測試在 `tests/`

**下一步（Phase 6）：** 替換色塊為 AI 生成 sprite
→ 詳見 `docs/pixel-sprite-game-workflow-handoff.md`

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
