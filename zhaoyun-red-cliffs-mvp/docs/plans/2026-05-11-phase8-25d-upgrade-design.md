# Phase 8：2.5D 升級設計文件（Streets of Rage 4 風格）

- 日期：2026-05-11
- 狀態：已確認，可進 implementation plan

## 目標

將現有趙雲遊戲從基礎 belt-scroll 升級為 SOR4 風格的 2.5D 清版動作遊戲，加入：
- 透視縮放（近大遠小）
- 跳躍陰影
- 衝刺（C 鍵）
- 衝刺 UI
- 相關手感調整

## 確認的設計決策

### 視角與透視

- **走位帶**：從 60px 擴大至 120px（`BELT_Y_RANGE: 120`）
  - 最遠處：`beltY = 260`（GROUND_Y - BELT_Y_RANGE = 380 - 120）
  - 最近處：`beltY = 380`（GROUND_Y）
- **縮放公式**（SOR4 微妙風格）：
  ```
  scale = 0.8 + 0.4 × ((beltY - 260) / 120)
  ```
  - 最遠 beltY=260：scale = 0.8×（角色縮小）
  - 最近 beltY=380：scale = 1.2×（角色放大）
- **Painter's Algorithm**：所有角色按 beltY 由小到大排序繪製（遠的先畫）
- **地板透視線**：從地板頂邊（beltY=260）向下收斂的縱線，強化空間感

### 跳躍陰影

- 角色跳起時，在其腳下地板位置（beltY）繪製橢圓陰影
- 陰影大小與不透明度隨 jumpHeight 遞減（越高越淡越小）
- 陰影也套用透視縮放

### 衝刺系統

- **按鍵**：C 鍵（`KeyC`）
- **方向**：朝角色面朝方向橫向衝刺（只有左右）
- **距離**：約 120px（DASH_SPEED × DASH_DURATION）
- **持續時間**：12 幀（`DASH_DURATION: 12`）
- **冷卻**：60 幀（`DASH_COOLDOWN: 60`，約 1 秒）
- **衝刺中行為**：
  - 速度 = DASH_SPEED（12px/幀）
  - 可以穿過敵人位置（不互相阻擋）
  - 無無敵幀（仍可受傷）
  - 按 Z 立即取消衝刺並進入攻擊（衝刺接攻擊）
  - 按 X 立即取消衝刺並進入跳躍
- **狀態機**：新增 `dash` 狀態，dash 中不能再次衝刺

### 衝刺 UI

位置：右上角（`canvas.width - 120, 16`）

```
[DASH ████████░░]
```

- 充能完成（可衝刺）：條滿，白/金色文字
- 冷卻中：條逐漸填滿，灰色
- 衝刺中：條閃爍

### 戰鬥調整

- `BELT_ATTACK_TOLERANCE`：22 → 55（縱深攻擊容差，走位帶擴大的等比調整）
- `SWORDSMAN_BELT_SPEED`：1.25 → 1.8（敵人縱向追蹤速度）
- `SPEARMAN_BELT_SPEED`：1.0 → 1.4

### 控制按鍵總覽

| 按鍵 | 動作 |
|------|------|
| ← → | 左右移動 |
| ↑ ↓ | 縱深走位（前後） |
| X | 跳躍 |
| Z | 攻擊 |
| C | 衝刺 |
| R | 重開 |
| F | 全螢幕 |

## 不做的事

- 不做空中攻擊
- 不做衝刺無敵幀
- 不改 level 結構（還是 4 段清場）
- 不改敵人種類

## 新增 config 常數

```js
BELT_Y_RANGE: 120,         // 走位帶（原 60）
BELT_ATTACK_TOLERANCE: 55, // 縱深攻擊容差（原 22）
SWORDSMAN_BELT_SPEED: 1.8, // 刀兵縱向速度（原 1.25）
SPEARMAN_BELT_SPEED: 1.4,  // 槍兵縱向速度（原 1.0）
DASH_SPEED: 12,            // 衝刺速度（px/幀）
DASH_DURATION: 12,         // 衝刺持續幀數
DASH_COOLDOWN: 60,         // 衝刺冷卻幀數
```
