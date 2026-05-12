# 觸控按鍵 + Title 美化 設計文件

- 日期：2026-05-12
- 狀態：已確認，可進 implementation

---

## 功能一：觸控按鍵

### 目標
桌機（鍵盤）與手機（觸控）都能完整遊玩。

### 架構
HTML `<div>` 覆蓋層疊在 `<canvas>` 上方，用 `touchstart` / `touchend`（含 `mousedown` / `mouseup` 支援桌機測試）模擬按鍵狀態，注入現有 `input.js` 的 pressedKeys Set。

**不修改 input.js 邏輯**，只在外部操作 `pressedKeys`，或直接 dispatch `KeyboardEvent`。

### 佈局

```
Canvas 800×450（或縮放後全螢幕）

左下角：方向十字
         [↑]
      [←]   [→]
         [↓]

右下角：動作按鈕（三角排列）
      [X跳]  [Z攻]
          [C衝]
```

### 尺寸與位置（相對於 canvas viewport）

| 按鈕 | 符號 | 大小 | 位置（bottom/left/right） |
|------|------|------|--------------------------|
| 上 | ↑ | 60×60px | bottom: 130px, left: 80px |
| 下 | ↓ | 60×60px | bottom: 20px, left: 80px |
| 左 | ← | 60×60px | bottom: 75px, left: 20px |
| 右 | → | 60×60px | bottom: 75px, left: 140px |
| 跳 | X | 70×70px | bottom: 110px, right: 90px |
| 攻 | Z | 70×70px | bottom: 110px, right: 20px |
| 衝 | C | 60×60px | bottom: 30px, right: 55px |

### 視覺樣式

```css
.touch-btn {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-family: monospace;
  display: flex; align-items: center; justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.05s;
}
.touch-btn:active, .touch-btn.pressed {
  background: rgba(255, 255, 255, 0.35);
}
```

### 按鍵對應

| 按鈕 | 模擬按鍵 |
|------|---------|
| ↑ | `ArrowUp` |
| ↓ | `ArrowDown` |
| ← | `ArrowLeft` |
| → | `ArrowRight` |
| X | `KeyX` |
| Z | `KeyZ` |
| C | `KeyC` |

### 技術實作（注入 input.js）

在 `input.js` 中，`pressedKeys` 是一個 `Set`。觸控層透過呼叫 `window.touchPressKey(key)` / `window.touchReleaseKey(key)` 來操作它，由 `input.js` export 這兩個函式。

```js
// input.js 新增
export function touchPressKey(key)   { pressedKeys.add(key); }
export function touchReleaseKey(key) { pressedKeys.delete(key); }
```

HTML 按鈕事件：
```js
btn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchPressKey(key);
  btn.classList.add('pressed');
}, { passive: false });

btn.addEventListener('touchend', () => {
  touchReleaseKey(key);
  btn.classList.remove('pressed');
});

// 桌機支援（mousedown/mouseup）
btn.addEventListener('mousedown', (e) => { e.preventDefault(); touchPressKey(key); });
btn.addEventListener('mouseup', () => touchReleaseKey(key));
btn.addEventListener('mouseleave', () => touchReleaseKey(key));
```

### 顯示條件

觸控層**永遠顯示**（桌機也可以用滑鼠點），但桌機上透明度稍低（`opacity: 0.6`），手機上完整顯示（`opacity: 1`）。

```css
@media (hover: hover) {
  /* 桌機：有 hover 能力，按鈕透明度降低 */
  #touch-controls { opacity: 0.6; }
}
```

---

## 功能二：Title 畫面美化

### 目標
Title 畫面顯示動態場景（視差背景 + 趙雲 idle），而非黑色遮罩，配合新標題「三國・一騎當千」。

### 現有問題
`render()` 在 title 模式遇到 `state.mode === 'title'` 時，畫了一個 `rgba(0,0,0,0.7)` 全畫面遮罩，蓋掉所有場景。

### 修改方向

#### renderer.js 修改
1. 移除 title 時的全畫面黑色遮罩
2. 背景正常渲染（視差背景、地面）
3. 趙雲角色在 title 模式站在固定位置播放 idle（不受輸入控制）
4. 標題區域：半透明深色矩形（不蓋全畫面，只蓋文字後）+ 文字

#### Title UI 佈局

```
Y=130：「三國・一騎當千」大標題（金色，48px serif，有文字陰影）
Y=200：半透明深色背景矩形（x=220, y=110, w=370, h=130）
Y=235：「按 Z / Space / Enter 開始」（亮藍色，20px）
Y=370：「← → 移動  ↑↓ 走位  X 跳躍  Z 攻擊  C 衝刺」（灰色，12px）
```

趙雲角色固定站在 `x=140, beltY=340`（畫面左側偏中下），面向右，播放 idle 動畫。

#### state.js / 遊戲邏輯
Title 模式下趙雲角色**只是裝飾**，不處理輸入，使用現有 `state.player` 的位置固定繪製即可（或單獨設一個 titlePlayerX/Y，不影響遊戲邏輯）。

---

## 實作 Checklist

### 觸控按鍵
- [ ] 修改 `input.js`：export `touchPressKey` / `touchReleaseKey`
- [ ] 修改 `main.js`：import 並掛到 window
- [ ] 修改 `index.html`：加入觸控按鍵 HTML 結構 + CSS
- [ ] 觸控事件綁定（touchstart/end + mousedown/up）
- [ ] 測試：鍵盤仍正常運作

### Title 美化
- [ ] 修改 `renderer.js`：移除黑色遮罩，改為半透明文字背板
- [ ] 標題改為「三國・一騎當千」
- [ ] Title 模式下趙雲 idle 動畫在固定位置顯示
- [ ] 視差背景在 title 模式持續可見
- [ ] 按鍵說明移到底部小字

### 測試
- [ ] 23/23 通過
- [ ] 截圖確認 title 畫面視覺
- [ ] 截圖確認觸控按鍵顯示位置

---

## 要修改的檔案
- `zhaoyun-mvp/src/game/input.js`
- `zhaoyun-mvp/src/main.js`
- `zhaoyun-mvp/index.html`
- `zhaoyun-mvp/src/game/renderer.js`
