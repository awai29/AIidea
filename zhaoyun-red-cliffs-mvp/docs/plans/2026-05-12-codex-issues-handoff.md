# Codex 交接文件：已知問題與待修清單

- 日期：2026-05-12
- 來源：Code Review 結果 + Sprite 盤點 + 效能 Review
- 狀態：部分已修，剩餘待 Codex 處理

## 修復記錄（2026-05-12 已完成）

以下問題已由 Claude Code 直接修復（commit `fb9c053`）：

| 問題 | 修法 | 檔案 |
|------|------|------|
| Title `shadowBlur=18` 每幀觸發 GPU blur | 改用 offscreen canvas 預繪，每幀 `drawImage` | `renderer.js` |
| `particles.filter()` 每幀建新陣列 | 改為雙指標原地壓縮 + `length = alive` 截斷 | `particles.js` |
| 粒子 `maxLife: 20` 語義錯誤（life 可達 21）| 改為 `maxLife: life`，與初始值一致 | `particles.js` |
| `drawEntities = []` + 包裝物件每幀分配 | 改用模組級持久陣列 `_drawEntities`，直接存 entity 不包裝 | `renderer.js` |
| `calcFrameIndex` 用 `Date.now()`（hitFreeze 不凍幀）| 改傳 `frameCount`，凍幀時動畫也暫停 | `assets.js`, `renderer.js` |
| `state.hitboxes = []` 每幀建新陣列 | 改為 `.length = 0` 重用 | `main.js` |
| 天空漸層 `createLinearGradient` 每幀重建 | 快取為模組變數 `_skyGrad`，只建一次 | `renderer.js` |

---

## 專案背景

- 遊戲名稱：三國・一騎當千（趙雲・赤壁 MVP）
- 技術：Vanilla JS + HTML5 Canvas，無任何框架
- 路徑：`zhaoyun-red-cliffs-mvp/zhaoyun-mvp/`
- 測試：`cd zhaoyun-red-cliffs-mvp && python3 -m pytest tests/ -v`（目前 23/23 通過）
- 每次修改後，**必須維持 23/23 測試通過**

---

## Issue 1：槍兵 Sprite 只有 2 幀（最優先）

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

### 解決方案

**方案 A（建議）：生成新的槍兵 spritesheet（12 幀）**

生成一張 576 × 320 px 的 PNG 圖（`assets/sprites/wei-spearman/runtime/sheet.png`），
然後更新 `atlas.json` 為 12 幀格式，與刀兵相同。

槍兵視覺特徵：
- 手持長槍（比角色身高長的武器）
- 顏色偏橘褐（`#cc6600`，與刀兵的紅色 `#cc3333` 區別）
- 動作節奏比刀兵慢一點（較重的武器）
- 攻擊動作是向前突刺，而非揮砍

**方案 B（臨時）：複製刀兵 atlas.json 給槍兵**

如果暫時不想生成新圖，可以讓槍兵暫時使用與刀兵相同的 `sheet.png`，
只需把 `atlas.json` 格式從 2 幀改為 12 幀（幀座標與刀兵相同）。
注意：兩者外觀會一樣，但動畫不會卡頓。

修改檔案：`assets/sprites/wei-spearman/runtime/atlas.json`

---

## Issue 2：動畫時間源用 Date.now() 而非遊戲 frameCount

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

## Issue 3：粒子 maxLife 語義錯誤

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

## Issue 4：Title 畫面 shadowColor 沒有重置

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
