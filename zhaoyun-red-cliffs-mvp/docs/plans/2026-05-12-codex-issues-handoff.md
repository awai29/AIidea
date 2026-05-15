# Codex 交接文件：已知問題與待修清單

- 日期：2026-05-12（最後更新：2026-05-12）
- 來源：Code Review 結果 + Sprite 盤點 + 效能 Review
- 狀態：Issues 1/2/3/4 已修，Issues 5/6 **仍待處理**

## 待辦摘要（最新狀態）

| Issue | 標題 | 狀態 |
|-------|------|------|
| 1 | 槍兵 Sprite 只有 2 幀 | ✅ 已修（已接上 5 組真實動作） |
| 2 | 動畫時間源用 Date.now() | ✅ 已修（frameCount） |
| 3 | 粒子 maxLife 語義錯誤 | ✅ 已修 |
| 4 | Title shadowColor 沒重置 | ✅ 已修（改用 offscreen canvas，ctx 狀態已隔離）|
| 5 | combat.js hitThisAttack 蓄力階段被誤清除 | **⚠️ 待處理** |
| 6 | player.js 冗餘狀態檢查 | **⚠️ 待處理** |
| 7 | Sprite 去背不乾淨（白邊鋸齒） | **⚠️ 需重做 sprite 資產** |
| 8 | Sprite 各幀腳底基準線不一致（動作切換跳動）| **⚠️ 需重做 sprite 資產** |

---

## 修復記錄（2026-05-12 已完成）

### 第一批：效能優化（commit `fb9c053`）

| 問題 | 修法 | 檔案 |
|------|------|------|
| Title `shadowBlur=18` 每幀觸發 GPU blur | 改用 offscreen canvas 預繪，每幀 `drawImage` | `renderer.js` |
| `particles.filter()` 每幀建新陣列 | 改為雙指標原地壓縮 + `length = alive` 截斷 | `particles.js` |
| 粒子 `maxLife: 20` 語義錯誤（life 可達 21）| 改為 `maxLife: life`，與初始值一致 | `particles.js` |
| `drawEntities = []` + 包裝物件每幀分配 | 改用模組級持久陣列 `_drawEntities`，直接存 entity 不包裝 | `renderer.js` |
| `calcFrameIndex` 用 `Date.now()`（hitFreeze 不凍幀）| 改傳 `frameCount`，凍幀時動畫也暫停 | `assets.js`, `renderer.js` |
| `state.hitboxes = []` 每幀建新陣列 | 改為 `.length = 0` 重用 | `main.js` |
| 天空漸層 `createLinearGradient` 每幀重建 | 快取為模組變數 `_skyGrad`，只建一次 | `renderer.js` |
| `getFrame` 每幀 `{ img, ...frame }` spread 分配物件 | loadSprite 時把 img bake 進每個 frame，getFrame 直接回傳無分配 | `assets.js` |
| 受傷 vignette `createRadialGradient` 每幀重建 | 預建靜態 gradient，用 `ctx.globalAlpha` 控制強度 | `renderer.js` |
| `updateLevel` + renderer 各自用 `filter/find` 計算存活數 | `updateLevel` 計算後存 `seg.aliveCount`，renderer 直接讀取 | `level.js`, `renderer.js` |

### 第二批：操作體驗（commit `bd94e11`）

| 新增功能 | 說明 | 檔案 |
|----------|------|------|
| ESC 暫停 / 繼續 | 按 ESC 切換 paused ↔ running | `main.js`, `renderer.js` |
| Space 跳躍替代鍵 | 可用 Space 或 X 跳 | `player.js` |
| 觸控按鈕顯示對應鍵盤鍵 | 按鈕標示「跳 X」「攻 Z」「衝 C」 | `index.html`, `styles.css` |
| 觸控暫停按鈕 | 右上角 ⏸，發送 Escape 事件 | `index.html`, `styles.css` |

### 第三批：renderer.js 增強（Codex/linter，未記錄 commit）

| 新增功能 | 說明 | 位置 |
|----------|------|------|
| `CONFIG.USE_SCENE_IMAGE_PLACEHOLDERS` | 控制是否載入場景圖片占位符的 flag | `renderer.js` `sceneImg()` |
| `ent.renderScale` 支援 | 透視縮放乘以 `ent.renderScale || 1` | `renderer.js` entity 渲染 |
| `drawFallbackSkyDetails()` | 月亮光暈 + 月盤 + 10 顆固定星點 + 地平線薄霧 | `renderer.js` |
| `drawFallbackRiver()` | 漸層河流 + 波紋線條 | `renderer.js` |
| `drawFallbackCamp()` | 帳篷 + 旗桿 + 火焰輻射漸層 | `renderer.js` |

---

## 專案背景

- 遊戲名稱：三國・一騎當千（趙雲・赤壁 MVP）
- 技術：Vanilla JS + HTML5 Canvas，無任何框架
- 路徑：`zhaoyun-red-cliffs-mvp/zhaoyun-mvp/`
- 測試：`cd zhaoyun-red-cliffs-mvp && python3 -m pytest tests/ -v`（目前 23/23 通過）
- 每次修改後，**必須維持 23/23 測試通過**

---

## ✅ Issue 1：槍兵 Sprite 只有 2 幀（已修）

### 問題描述

`assets/sprites/wei-spearman/runtime/` 的 spritesheet 每個動作只有 2 幀，
而刀兵（`wei-swordsman`）有 12 幀。槍兵的動畫會非常卡頓。

### 現有 atlas 格式（共同規格）

- 每幀尺寸：48 × 64 px
- 動作排列方式：每行一個動作，由左到右排幀
- 行順序（由上到下）：idle（y=0）、walk（y=64）、attack（y=128）、hurt（y=192）、death（y=256）
- 刀兵 sheet 尺寸：576 × 320 px（12 幀 × 5 動作）
- 槍兵目前 sheet 尺寸：96 × 320 px（2 幀 × 5 動作）

### 刀兵 atlas 參考（12 幀格式）

```json
{
  "frameWidth": 48,
  "frameHeight": 64,
  "animations": {
    "idle":   { "frames": [/* x=0,48,96,144,192,240,288,336,384,432,480,528  y=0   */], "fps": 8  },
    "walk":   { "frames": [/* 同上，y=64  */], "fps": 10 },
    "attack": { "frames": [/* 同上，y=128 */], "fps": 12 },
    "hurt":   { "frames": [/* 同上，y=192 */], "fps": 10 },
    "death":  { "frames": [/* 同上，y=256 */], "fps": 6  }
  }
}
```

完整格式請參考：`assets/sprites/wei-swordsman/runtime/atlas.json`

### 實際修復結果

- 已生成並接入槍兵第一輪真實素材：
  - `reference-v1.png`
  - `idle-poseboard-v1.png`
  - `walk-poseboard-v1.png`
  - `attack-poseboard-v1.png`
  - `hurt-poseboard-v1.png`
  - `death-poseboard-v1.png`
- `assets/sprites/wei-spearman/runtime/atlas.json` 現已包含：
  - `idle`
  - `walk`
  - `attack`
  - `hurt`
  - `death`
- 槍兵不再是 2 幀 runtime，也不再是 placeholder runtime sprite

### 驗證方式

- 啟動本地伺服器：`cd zhaoyun-red-cliffs-mvp/zhaoyun-mvp && python3 -m http.server 8080`
- 執行：`cd zhaoyun-red-cliffs-mvp && python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v`
- 目前結果：`23/23 passed`

---

## ✅ Issue 2（已修）：動畫時間源用 Date.now() 而非遊戲 frameCount

### 問題描述

`src/game/assets.js` 第 67 行：

```js
return Math.floor(Date.now() / (1000 / fps)) % anim.frames.length;
```

問題：
1. hitFreeze 凍幀期間（打擊特效，2 幀），動畫仍然繼續播放，不會「凍住」
2. 瀏覽器 tab 切到背景再回來，動畫會跳幀
3. 測試中無法精確控制動畫幀

### 修改方式

修改 `calcFrameIndex` 函式簽名，加入 `frameCount` 參數：

```js
// assets.js 第 64-70 行
export function calcFrameIndex(character, action, frameCount = 0) {
  const sprite = _cache[character];
  if (!sprite) return 0;
  const anim = sprite.atlas.animations[action];
  if (!anim || anim.frames.length === 0) return 0;
  const fps = anim.fps || 8;
  // 用遊戲幀數而非系統時間（CONFIG.TARGET_FPS = 60）
  return Math.floor(frameCount / (60 / fps)) % anim.frames.length;
}
```

然後在 `renderer.js` 的 `drawSprite` 函式（第 33 行附近）傳入 `state.frameCount`：

```js
// renderer.js drawSprite 函式內
const frameIdx = calcFrameIndex(charKey, action, state.frameCount);
```

注意：`drawSprite` 函式目前沒有接收 `state`，需要從 `render(ctx, state)` 往下傳入，
或改成 `drawSprite(ctx, charKey, action, screenX, screenY, dispW, dispH, facing, fallbackColor, frameCount)`。

**修改後要跑測試確認 23/23 通過。**

---

## ✅ Issue 3（已修）：粒子 maxLife 語義錯誤

### 問題描述

`src/game/particles.js` 第 17-18 行：

```js
life: 14 + Math.floor(Math.random() * 8),  // 實際範圍 14~21
maxLife: 20,                                 // 固定值 20
```

當 `life = 21` 時，`alpha = life / maxLife = 21/20 = 1.05`，超過 1。
Canvas 的 `globalAlpha` 會 clamp 到 1 所以不會崩潰，但前 1 幀 alpha 計算不正確。

### 修改方式

統一讓 `maxLife` 等於初始 `life`：

```js
// particles.js spawnHitParticles 函式
function spawnParticle(state, x, y, color) {
  const life = 14 + Math.floor(Math.random() * 8);
  state.particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: -2 - Math.random() * 3,
    life,
    maxLife: life,  // 改為與初始 life 一致
    color,
    size: 3 + Math.random() * 3,
  });
}
```

---

## ✅ Issue 4（已修）：Title 畫面 shadowColor 沒有重置

### 問題描述

`src/game/renderer.js` Title 段落（第 496-500 行附近）：

```js
ctx.shadowColor = '#ff6600';
ctx.shadowBlur = 18;
// ... 繪製標題 ...
ctx.shadowBlur = 0;  // ← 只重置了 shadowBlur，沒重置 shadowColor
```

雖然 `shadowBlur = 0` 不會產生陰影，但 ctx 的 `shadowColor` 殘留為橘色。
未來如果有其他地方設了 `shadowBlur` 忘了設 `shadowColor`，會意外出現橘色陰影。

### 修改方式

在 title block 開頭加 `ctx.save()`，結尾加 `ctx.restore()`：

```js
if (state.mode === 'title') {
  ctx.save();  // ← 加這行

  // ... 所有繪製邏輯 ...

  ctx.restore();  // ← 加這行（取代原本的 ctx.textAlign = 'left'）
}
```

---

## Issue 5：combat.js hitThisAttack 在蓄力階段被誤清除

### 問題描述

`src/game/combat.js` 第 11-37 行：

```js
const attackActive = p.state === 'attack'
  && p.attackTimer < CONFIG.PLAYER_ATTACK_DURATION * 0.7;

if (attackActive) {
  // ... 判斷命中 ...
} else {
  // 攻擊結束，清除命中旗標
  state.enemies.forEach(e => { e.hitThisAttack = false; });
}
```

問題：`attackActive` 在蓄力前 30%（`attackTimer >= duration * 0.7`）時為 `false`，
此時會清除 `hitThisAttack`，語義上不正確（應在攻擊「完全結束」才清除）。

目前因為蓄力後才進入有效攻擊幀，旗標已是 `false`，所以不會造成 bug。
但若調整蓄力比例，可能引入重複命中問題。

### 修改方式

改為「攻擊狀態完全結束才清除旗標」：

```js
const isAttacking = p.state === 'attack';
const attackActive = isAttacking
  && p.attackTimer < CONFIG.PLAYER_ATTACK_DURATION * 0.7;

if (attackActive) {
  // ... 判斷命中 ...
} else if (!isAttacking) {
  // 攻擊完全結束才清除（不在蓄力階段清除）
  state.enemies.forEach(e => { e.hitThisAttack = false; });
}
```

---

## Issue 6：player.js 冗餘的狀態檢查

### 問題描述

`src/game/entities/player.js` 約第 50、71 行：

```js
const canInput = p.state !== 'attack' && p.state !== 'hurt' && p.state !== 'dash';
// ...
if (canInput && p.state !== 'attack' && p.state !== 'dash') {  // ← attack/dash 已在 canInput 中排除
```

後面那行的 `p.state !== 'attack'` 和 `p.state !== 'dash'` 是多餘的。

### 修改方式

```js
if (canInput) {  // 直接用 canInput 即可
```

---

---

## Issue 7：Sprite 去背不乾淨（白色鋸齒邊緣）

### 問題描述

三張 spritesheet（`zhaoyun`、`wei-swordsman`、`wei-spearman`）的 PNG 邊緣帶有白色/灰色 anti-aliasing 鋸齒，在遊戲的深色背景上明顯可見，角色看起來有白邊。

### 原因

原始 PNG 在生成時沒有乾淨的透明度（alpha channel），邊緣的半透明像素是白色底，而非透明底。

### 解決方式

重新生成三張 spritesheet，要求：
- 背景必須是 **完全透明**（RGBA alpha = 0）
- 角色邊緣 anti-aliasing 要對著透明底做（premultiplied alpha 或 straight alpha on transparent）
- **不能**對著白色底做 anti-aliasing 再轉存 PNG

驗收：在深色背景（`#111` 或 `#1a1a2e`）上看不到任何白邊或亮色鋸齒。

---

## Issue 8：Sprite 幀殘影 + 高度不一致（pipeline 根本問題）

### 問題描述（2026-05-14 診斷）

視覺上角色會「忽高忽矮」、某些幀有殘影/破片。根本原因有兩層：

**層 1：各動作 canvas 高度不一致**

`align.py` 對每個動作獨立計算 `max_height`，導致：
```
wei-swordsman: idle=356px, walk=356px, attack=352px (差 4px)
wei-spearman:  idle=362px, walk=362px, attack=356px (差 6px)
```
`pack.py` 再把它們全部縮放到 64px，不同高度的 canvas 縮放比例不同，角色視覺高度就會跳動。

**層 2：攻擊動作幀內角色位置偏移劇烈**

量測 wei-swordsman 攻擊幀的角色頂部 Y（在 352px canvas 內）：
```
frame 1: top=81  → 角色高 271px
frame 2: top=51  → 角色高 301px  ← 差 30px！
frame 3: top=96  → 角色高 256px
```
縮放到 64px 後，角色高度在 46~55px 之間跳動，肉眼可見。

**層 3：趙雲 walk 幀 [9] 角色位置異常（2026-05-15 新增診斷）**

用 Python + PIL 量測 `zhaoyun/runtime/sheet.png` 的 walk 行（y=64~128），各幀非透明像素範圍：

```
walk[0]: content rows 11-63（底部對齊 ✅）
walk[1]: content rows 11-63（底部對齊 ✅）
...
walk[9]: content rows  0-53（⚠️ 底部在第 53 行！比其他幀高 10px）
...
walk[11]: content rows 10-63（底部對齊 ✅）
```

Walk frame [9] 的角色底部比其他幀高 10 像素。遊戲縮放 2× 後，每次播到第 9 幀（每 6 個 game frame 出現一次），角色視覺上瞬間跳高 20px，這就是「趙雲走路時走一走會跳起來」的根本原因。

修法：重新產生趙雲 walk poseboard（或手動修正 `walk/frame-09.png` 的對齊），確保角色腳底對齊 canvas 底部後再重新 pack。

**層 4：部分幀有殘影（spearman idle 幀 8~10）**

`sheet-wei-spearman.png` idle row 的右側幾格頂部有明顯殘影（看起來像另一個角色的腳/身體），推測是 poseboard 去背不完整 或 bounding box 裁切到相鄰格的像素。

### 根本修法

**Step 1：讓所有動作共用同一 canvas 尺寸**

在 `pipeline/pack.py` 或呼叫它的腳本中，先跑一次全動作掃描取得最大寬高，再用這個全局尺寸執行 `align_frames_by_feet`：

```python
# 呼叫 align_frames_by_feet 前，先算全角色最大尺寸
all_paths = [p for paths in animations.values() for p in paths]
all_imgs = [Image.open(p) for p in all_paths]
global_w = max(img.width for img in all_imgs)
global_h = max(img.height for img in all_imgs)

# 每個動作都用同一個 canvas 大小
for action, paths in animations.items():
    aligned, _, _ = align_frames_by_feet(paths, aligned_dir,
                                          canvas_width=global_w,
                                          canvas_height=global_h)
```

**Step 2：修掉殘影**

對 `wei-spearman` idle 動作的 poseboard 重新執行 recover（提高 tolerance 或 passes），或手動清除 `idle/frame-08.png` ~ `frame-10.png` 頂部的殘像素後再 pack。

```bash
cd zhaoyun-red-cliffs-mvp
# 重新 recover（加大 tolerance）
python3 -m pipeline.recover \
  pipeline/input/wei-spearman/idle-poseboard-v1.png \
  assets/sprites/wei-spearman/idle/recovered \
  --rows 4 --cols 3 --tolerance 45

# 對齊 + 打包
python3 -m pipeline.align ...
python3 -m pipeline.pack ...
```

**Step 3：修完後更新版本號**

每次重新 pack 後，必須更新 `assets.js` 的 `SPRITE_VERSION`（目前是 `v3`）：
```js
const SPRITE_VERSION = '20260514-v4';  // 改成新版本
```

### 驗收

1. 截圖所有動作切換過程，確認角色頭頂高度不跳動
2. spearman idle 幀 8~10 頂部無殘影
3. `python3 -m pytest tests/ -q` 仍然 46/46 通過

---

## 場景圖片現狀（供 Codex 生成圖片參考）

10 張場景圖目前是彩色佔位色塊，實際視覺描述請參考：
`docs/plans/2026-05-11-scene-layers-design.md`

該文件包含每張圖的：
- 尺寸規格
- 視覺描述
- AI 生成 prompt

---

## 驗收標準

每個 Issue 修完後，必須確認：

```bash
cd /Users/weiwumbp2024/aiproject/zhaoyun-red-cliffs-mvp
python3 -m pytest tests/test_zhaoyun_mvp.py tests/test_sprite_integration.py -v
# 期望：23 passed
```

Git commit 格式：
- `修復：槍兵 sprite 升級為 12 幀`
- `修復：動畫時間源改為 frameCount`
- `修復：粒子 maxLife 語義錯誤`
- 等等
