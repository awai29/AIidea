# Flight Simulator — 設計文件

**日期：** 2026-05-05
**狀態：** 已確認
**專案目錄：** `aiproject/flight-simulator/`

---

## 一、專案目標

製作一個在瀏覽器執行的 3D 飛行模擬器，以現有開源專案為基礎，加上選機畫面、Iron Man 機型與全球隨機出生點，部署至網路供人遊玩。

---

## 二、基礎專案

**來源：** [dimartarmizi/web-flight-simulator](https://github.com/dimartarmizi/web-flight-simulator)
**授權：** 非商業免費使用
**做法：** Clone 後在此基礎上修改，不從零開始

---

## 三、技術架構

| 層級 | 技術 | 用途 |
|------|------|------|
| 地球地形 | CesiumJS | 真實全球地形串流、WGS84 座標 |
| 3D 渲染 | Three.js | 飛機模型、粒子特效、光影 |
| 建置工具 | Vite | 本地開發、正式建置 |
| 部署 | Vercel | 免費靜態網頁託管 |
| API 金鑰 | Cesium ion（免費方案） | 地形資料存取 |

架構說明：CesiumJS 負責「地球尺度」的地形與座標，Three.js 負責「近距離」的飛機模型與特效。兩個引擎共存是此類專案的標準做法。

---

## 四、機型設計

### 4.1 F-15 Eagle（保留原專案）

| 項目 | 內容 |
|------|------|
| 模型來源 | 原專案內建（Low poly F-15，來自 Sketchfab by SIpriv） |
| 飛行感 | 戰鬥機：需要速度才能升空，高速飛行 |
| 武裝 | M61A1 機砲 + AIM-9 飛彈 + MJU-7A 誘餌彈 |
| 特效 | 後燃器火焰（原專案已有） |

### 4.2 Iron Man Mark 85

| 項目 | 內容 |
|------|------|
| 模型來源 | [Sketchfab - Iron-Man Mark 85 by Nihar Arora](https://sketchfab.com/3d-models/iron-man-mark-85-rigged-dde1085c464d4f8da259fe6669ae4dd2) |
| 授權 | CC Attribution（免費，需標註作者） |
| 格式 | glTF / GLB |
| 面數 | 約 639,900 三角面 |
| 飛行感 | 靈活：任意方向飛行，比 F-15 更機動 |
| 武裝 | 掌心光束炮（Repulsor Beam） |
| 特效 | 腳底噴射火焰（替代後燃器）、掌心發光 |

---

## 五、新增功能規格

### 5.1 選機畫面（新增）

- 遊戲啟動時，顯示全螢幕選機介面
- 兩張飛機卡片，並排顯示
- 每張卡片包含：機型名稱、簡短描述、武裝說明
- 點擊卡片後進入遊戲
- 介面語言：英文

### 5.2 全球隨機出生點（修改）

- 原專案：固定出生座標
- 修改後：每次進入遊戲，從預設座標清單隨機選一點
- 座標清單涵蓋各大洲地標，避免純海洋中央
- 範例地點：大峽谷、富士山、阿爾卑斯山、挪威峽灣、喜馬拉雅山、台灣玉山

### 5.3 Iron Man 武器系統（新增）

- 取代 F-15 的飛彈系統
- 發射「掌心光束炮」：向前方射出藍白色光束特效
- 使用相同按鍵觸發，視覺效果不同（光束取代飛彈）

### 5.4 Iron Man 飛行特效（新增）

- 腳底：橘紅色噴射火焰（改自 F-15 後燃器特效）
- 掌心：微弱藍光常態發光

---

## 六、保留不動的部分

- HUD 介面（高度、空速、航向、小地圖）— 英文
- 地形渲染與天空盒
- F-15 完整飛行物理與武器邏輯
- 音效系統（引擎聲、風聲、警告音）
- 圖形品質設定選單

---

## 七、3D 模型取得步驟（Iron Man）

1. 前往 [Sketchfab 頁面](https://sketchfab.com/3d-models/iron-man-mark-85-rigged-dde1085c464d4f8da259fe6669ae4dd2)
2. 登入 Sketchfab 免費帳號（沒有的話先註冊）
3. 點擊 Download，選擇 GLB 格式下載
4. 將檔案命名為 `ironman.glb`，放入專案 `public/models/` 資料夾

---

## 八、Cesium API 金鑰取得步驟

1. 前往 [https://ion.cesium.com/signup](https://ion.cesium.com/signup) 註冊免費帳號
2. 登入後，點選左側 Access Tokens
3. 複製預設 Token（Default Token）
4. 貼入專案根目錄的 `.env` 檔案：`VITE_CESIUM_TOKEN=你的token`

---

## 九、部署計畫

- 平台：Vercel（免費）
- 方式：將專案推上 GitHub，在 Vercel 連結 repo，自動部署
- 網址：Vercel 提供免費子網域（例如 `flight-sim.vercel.app`）

---

## 十、不在本次範圍內

- 直升機機型（未來可加）
- 多人連線
- 行動裝置觸控控制
- 繁體中文介面
