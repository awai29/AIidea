# Scene Layers 設計文件：長坂坡場景

- 日期：2026-05-11
- 狀態：已確認，可進 implementation

---

## 場景主題

**長坂坡之戰**：趙雲單騎救主，黃昏入夜，曹軍重重包圍，火光遍野，旌旗如林。
玩家扮演趙雲，從敵陣中衝殺出去。

---

## 整體渲染順序

```
由後往前（背後先畫，前景最後畫，蓋在角色上）

1. 層 0：天空 + 火光（程式碼畫，固定不捲動）
2. 層 1：遠景  parallax 0.05×  → 山脈、江面、遠處營地
3. 層 2：中景  parallax 0.25×  → 帳篷、旗杆、篝火
4. ── 角色繪製（beltY 260–380，Painter's Algorithm）──
5. 層 3：前景  parallax 0.85×  → 高旗、草叢、石頭、煙霧
6. HUD（血條、衝刺條）
```

前景（層 3）**蓋在角色上**，製造角色站在場景「裡面」的縱深感。

---

## Canvas 座標系

```
Y=0    ─── 畫面頂端
Y=100  ─── 遠山頂部
Y=200  ─── 遠景底部 / 中景上方
Y=260  ─── beltY 最小值（最遠的走位線）← 中景裝飾底部對齊這裡
Y=320  ─── beltY 中間（玩家初始位置）
Y=380  ─── GROUND_Y（最近的走位線）
Y=450  ─── 畫面底端
```

---

## 層 0：天空（程式碼繪製，不需圖片）

**由現有 `drawBackground` 程式碼產生，不需修改：**
- 深藍黑天空漸層（頂部 `#0d1b2a` → `#1a1a3e` → 地平線 `#3d1a0a`）
- 地平線橙紅火光感

---

## 層 1：遠景圖片（parallax 0.05×）

繪製區域：Y 0–260（角色走位帶上方）

### 圖片 1：`bg-mountains.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/bg-mountains.png` |
| 尺寸 | 800 × 130px |
| 背景 | 透明（PNG） |
| 繪製 Y | 畫面 Y=130（底部對齊 Y=260） |
| 重複方式 | 水平 tile（每 800px 一組） |

**視覺描述（給圖片生成用）：**
三國時代風格，黃昏夜色，3–4 座連綿山脈剪影，純黑色（`#1e1428`），
山頂不規則起伏，最高點約 110px，最低點約 30px。無細節，僅剪影輪廓。
底部平坦，頂部和兩側完全透明。

---

### 圖片 2：`bg-river.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/bg-river.png` |
| 尺寸 | 800 × 35px |
| 背景 | 透明（PNG） |
| 繪製 Y | 畫面 Y=225（底部對齊 Y=260） |
| 重複方式 | 水平 tile |

**視覺描述：**
暗藍色江面水平帶（`#0a1520`），有微光波紋反射（淡藍色 `#1a3a5c` 細線條 2–3 條）。
代表遠處長江。寬條帶，邊緣半透明漸出。

---

### 圖片 3：`bg-camp.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/bg-camp.png` |
| 尺寸 | 800 × 90px |
| 背景 | 透明（PNG） |
| 繪製 Y | 畫面 Y=170（底部對齊 Y=260） |
| 重複方式 | 水平 tile |

**視覺描述：**
曹軍大營剪影：5–7 頂帳篷（三角形，高 40–60px），其中 2–3 根旗杆（細長矩形，高 70px），
旗幟為暗紅色三角形（`#6b1212`）。帳篷頂端有橙色小點代表火把燈光。
整體暗褐色（`#2a1810`），底部透明。

---

## 層 2：中景圖片（parallax 0.25×）

繪製區域：Y 200–280（走位帶邊緣，稍微伸入玩家區域增加過渡感）

### 圖片 4：`mid-tent.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/mid-tent.png` |
| 尺寸 | 120 × 110px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部對齊 Y=270 |
| 重複間距 | 每 240px 一個（交錯排列） |

**視覺描述：**
曹軍帳篷，正面視角，深褐色布料（`#3d2010`），帳篷門縫透出橙黃火光。
左側一根火把（木杆 + 橙色火焰）。帳篷寬 90px，高 80px，整體較中等大小。

---

### 圖片 5：`mid-flag-pole.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/mid-flag-pole.png` |
| 尺寸 | 50 × 130px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部對齊 Y=275 |
| 重複間距 | 每 180px 一個 |

**視覺描述：**
旗杆（深棕色細長矩形 `#2a1a08`，寬 6px），頂端一面「曹」字旗幟，
暗紅色（`#8b1a1a`），旗面略呈梯形（代表飄動），旗上有「曹」字樣（白色簡筆）。

---

### 圖片 6：`mid-bonfire.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/mid-bonfire.png` |
| 尺寸 | 60 × 60px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部對齊 Y=275 |
| 重複間距 | 每 320px 一個 |

**視覺描述：**
篝火，底部是石頭圍圈（灰色），中間木柴交叉（深褐色），上方橙黃火焰（`#ff8c00`）
帶白色火芯，火焰呈尖型向上，周圍有橙色光暈半透明光圈。

---

## 層 3：前景圖片（parallax 0.85×，繪製在角色之後）

繪製區域：Y=310–450（走位帶中下方延伸到畫面底部）

### 圖片 7：`fg-flag-tall.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/fg-flag-tall.png` |
| 尺寸 | 90 × 220px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部超出畫面（對齊 Y=470），旗幟主體在 Y=260–380 |
| 重複間距 | 每 350px 一個 |

**視覺描述：**
大型「魏」字戰旗，旗杆粗壯（`#3d2010`，寬 10px），旗面為深紅色（`#8b0000`），
上書「魏」字（金色 `#d4af37`），旗面略微傾斜代表風吹，
旗杆底部不可見（被地面遮住）。整體有輕微半透明感（alpha 0.9）。

---

### 圖片 8：`fg-grass.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/fg-grass.png` |
| 尺寸 | 100 × 55px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部對齊 Y=385 |
| 重複間距 | 每 200px 一個（隨機 Y 偏移 ±10px） |

**視覺描述：**
一叢枯草，黃褐色（`#8b7355`），5–7 根細長葉片向外散開，葉尖微卷，
代表戰場踐踏過的荒草。無根部（底部透明）。

---

### 圖片 9：`fg-rock.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/fg-rock.png` |
| 尺寸 | 80 × 50px |
| 背景 | 透明（PNG） |
| 繪製 Y | 底部對齊 Y=382 |
| 重複間距 | 每 280px 一個 |

**視覺描述：**
一塊灰褐色石頭（`#6b6b5a`），不規則多邊形，表面有陰影分層，
旁邊可選加一把斷槍或破盾（代表戰場遺物）。底部略平（坐在地上的感覺）。

---

### 圖片 10：`fg-smoke.png`

| 項目 | 規格 |
|------|------|
| 路徑 | `zhaoyun-mvp/assets/scene/fg-smoke.png` |
| 尺寸 | 140 × 90px |
| 背景 | 完全透明底，煙霧本身半透明 |
| 繪製 Y | 底部對齊 Y=360，alpha 0.25 |
| 重複間距 | 每 450px 一個 |

**視覺描述：**
低矮煙霧團，灰白色（`#cccccc`），雲朵狀輪廓，邊緣羽化，
整體不透明度約 30–40%。代表戰場硝煙。

---

## 程式碼整合說明（給 Codex 實作）

### 要修改的檔案
- `zhaoyun-mvp/src/game/renderer.js`

### 圖片載入
在 `assets.js` 加入場景圖片預載入，或直接在 renderer.js 用 `new Image()` 載入：

```js
// renderer.js 頂部，初始化一次
const SCENE_IMGS = {};
const SCENE_SRCS = [
  'bg-mountains', 'bg-river', 'bg-camp',
  'mid-tent', 'mid-flag-pole', 'mid-bonfire',
  'fg-flag-tall', 'fg-grass', 'fg-rock', 'fg-smoke',
];
SCENE_SRCS.forEach(key => {
  const img = new Image();
  img.src = `assets/scene/${key}.png`;
  SCENE_IMGS[key] = img;
});
```

### 渲染函式結構

現有的 `render()` 函式修改為：

```js
export function render(ctx, state) {
  // 1. 背景（天空 + 遠景 + 中景）
  drawBackground(ctx, cam);       // 現有，內含層 0–2

  // 2. 角色（Painter's Algorithm）
  // ... 現有的 drawEntities 迴圈 ...

  // 3. 前景（蓋在角色上方）← 新增
  drawForeground(ctx, cam);

  // 4. 粒子
  drawParticles(ctx, state, cam);

  // 5. HUD
  // ... 現有 ...
}
```

### drawBackground 分層重構

將現有的 `drawBackground` 重構為三個子函式：

```js
function drawBackground(ctx, camX) {
  drawSky(ctx);              // 層 0：天空（現有程式碼移入）
  drawFarLayer(ctx, camX);   // 層 1：遠景（新增，載入 bg-* 圖片）
  drawMidLayer(ctx, camX);   // 層 2：中景（新增，載入 mid-* 圖片）
  drawGround(ctx, camX);     // 層 3：地面（現有程式碼移入）
}
```

### drawFarLayer 實作模式（其他層同理）

```js
function drawFarLayer(ctx, camX) {
  const W = CONFIG.CANVAS_WIDTH;
  const parallax = 0.05;

  // bg-mountains：底部對齊 Y=260
  const img = SCENE_IMGS['bg-mountains'];
  if (img.complete) {
    const offset = ((camX * parallax) % W + W) % W;
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(img, rx - offset, 260 - img.naturalHeight, W, img.naturalHeight);
    }
  }
  // bg-river：底部對齊 Y=260，略高
  // bg-camp：底部對齊 Y=260
  // ... 同模式
}
```

### drawForeground 實作模式

```js
function drawForeground(ctx, camX) {
  const W = CONFIG.CANVAS_WIDTH;
  const parallax = 0.85;
  const offset = ((camX * parallax) % W + W) % W;

  // fg-flag-tall：每 350px 一個，底部對齊 Y=470（超出畫面）
  const flag = SCENE_IMGS['fg-flag-tall'];
  if (flag.complete) {
    ctx.globalAlpha = 0.9;
    const spacing = 350;
    for (let rx = -spacing; rx < W + spacing * 2; rx += spacing) {
      ctx.drawImage(flag, rx - (offset % spacing), 470 - flag.naturalHeight);
    }
    ctx.globalAlpha = 1;
  }
  // fg-grass、fg-rock、fg-smoke 同模式，各自的 Y 與間距見上方表格
}
```

---

## 圖片生成 Prompt（給 AI 圖片工具）

以下 prompt 適用於 Midjourney、DALL-E、Stable Diffusion 等工具生成。
**共同風格指令（每張圖都加）：**
> flat 2D game asset, pixel-art adjacent style, Three Kingdoms era ancient China,
> dark night battlefield atmosphere, transparent background PNG,
> no gradients on edges (clean cutout), game sprite style

---

### bg-mountains.png
> Silhouette of 3-4 mountain peaks, solid dark purple-black color (#1e1428),
> jagged irregular peaks, 800x130px, completely transparent background,
> no details just pure silhouette shape, bottom flat edge

### bg-river.png
> Dark blue river water horizontal band, subtle light reflections as thin wavy lines,
> 800x35px, transparent background, dark navy color (#0a1520) with light blue shimmer

### bg-camp.png
> Ancient Chinese military camp silhouette, 5-7 triangular tents, 2-3 flag poles
> with red banners, dark brown-black color (#2a1810), orange dots for torchlight,
> 800x90px, transparent background

### mid-tent.png
> Ancient Chinese military tent, front view, dark brown canvas (#3d2010),
> glowing fire light visible through tent opening, torch pole on left side,
> 120x110px, transparent background, game asset style

### mid-flag-pole.png
> Tall wooden flagpole, dark brown, red banner with Chinese character "曹" in gold,
> flag slightly tilted as if in wind, 50x130px, transparent background

### mid-bonfire.png
> Campfire with stone ring base, crossed logs, orange-yellow flame (#ff8c00)
> with white-hot center, orange glow halo, 60x60px, transparent background

### fg-flag-tall.png
> Large "魏" character battle banner, thick wooden pole, deep red flag (#8b0000),
> gold Chinese character "魏", slightly angled for wind effect,
> 90x220px, transparent background, alpha 0.9 overall

### fg-grass.png
> Cluster of dry withered grass blades, yellow-brown (#8b7355),
> 5-7 bent blades spreading outward, battle-trampled look,
> 100x55px, transparent background

### fg-rock.png
> Gray-brown boulder (#6b6b5a), irregular polygon shape, subtle shadow shading,
> optionally a broken spear or shield fragment beside it,
> 80x50px, transparent background, flat bottom edge

### fg-smoke.png
> Low-lying battle smoke cloud, gray-white (#cccccc), cloud-shaped outline,
> feathered soft edges, 30-40% opacity overall, 140x90px, transparent background

---

## 資源放置路徑

所有場景圖片統一放在：
```
zhaoyun-mvp/assets/scene/
├── bg-mountains.png
├── bg-river.png
├── bg-camp.png
├── mid-tent.png
├── mid-flag-pole.png
├── mid-bonfire.png
├── fg-flag-tall.png
├── fg-grass.png
├── fg-rock.png
└── fg-smoke.png
```

---

## 實作 Checklist

- [ ] 建立 `zhaoyun-mvp/assets/scene/` 目錄
- [ ] 生成並放入全部 10 張圖片
- [ ] 修改 `renderer.js`：加入 SCENE_IMGS 載入
- [ ] 重構 `drawBackground` 為 `drawSky / drawFarLayer / drawMidLayer / drawGround`
- [ ] 新增 `drawForeground` 函式
- [ ] 修改 `render()` 插入 `drawForeground(ctx, cam)` 在角色繪製之後
- [ ] 跑測試確認 23/23 通過
- [ ] 截圖確認視覺效果（前景旗子蓋過角色）
