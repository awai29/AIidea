# SecurePlay Design System — 設計規格

**日期**：2026-06-26
**專案**：SecurePlay
**目標**：透過截圖反向還原 SecurePlay 行動 App 的完整設計系統，在 Figma 建立 Variable 與 Component，供後續設計開發使用。

---

## 1. 專案背景

SecurePlay 是一款行動 App（iOS / Android）。本專案的目標是從 20 張以上的產品截圖出發，用 Figma MCP 工具反向還原出完整的設計系統，包含：

- 所有視覺基礎 Token（Variable）
- 完整 UI Component Library
- 截圖對照參考頁

---

## 2. Figma 檔案結構

建立一個新的 Figma 檔案，命名為 **SecurePlay Design System**，包含三個 Page，依序建立：

```
SecurePlay Design System
├── Foundation    <- 所有 Variable（Token）
├── Components    <- UI 元件，全部綁定 Variable
└── Screens       <- 截圖對照與標注
```

### Page 說明

| Page | 用途 |
|------|------|
| Foundation | 建立所有 Variable，為整個設計系統的基礎層 |
| Components | 逐一建立 UI 元件，每個屬性（顏色、間距等）都綁定 Foundation 的 Variable |
| Screens | 貼入原始截圖，標注對應使用的 Component，供日後對照參考 |

---

## 3. Variable 規格

所有 Variable 建立於 Foundation Page，並在 Figma 的 Local Variables 面板中統一管理。

### 3.1 顏色 `color/`

從截圖中提取以下顏色類別：

| 群組 | 範例 Token 名稱 | 說明 |
|------|----------------|------|
| `color/primary` | `color/primary/500`（main）、`color/primary/100`（light） | 主品牌色 |
| `color/neutral` | `color/neutral/0`（白）、`color/neutral/900`（深灰/黑） | 中性色 |
| `color/background` | `color/bg/base`、`color/bg/surface` | 背景層次 |
| `color/text` | `color/text/primary`、`color/text/secondary`、`color/text/disabled` | 文字顏色 |
| `color/border` | `color/border/default`、`color/border/strong` | 線條/框線 |
| `color/status` | `color/status/success`、`color/status/warning`、`color/status/error`、`color/status/info` | 狀態顏色 |

> 實際 hex 值從截圖分析後填入。

---

### 3.2 透明度 `opacity/`

| Token 名稱 | 值 |
|-----------|-----|
| `opacity/10` | 10% |
| `opacity/20` | 20% |
| `opacity/40` | 40% |
| `opacity/60` | 60% |
| `opacity/80` | 80% |
| `opacity/100` | 100% |

---

### 3.3 字體 `typography/`

| 群組 | Token 名稱範例 | 說明 |
|------|---------------|------|
| Font Family | `typography/font-family/base` | 主要字體（從截圖識別） |
| Font Size | `typography/size/xs`（12）、`sm`（14）、`md`（16）、`lg`（18）、`xl`（20）、`2xl`（24）、`3xl`（32） | 字體大小（px） |
| Font Weight | `typography/weight/regular`（400）、`medium`（500）、`semibold`（600）、`bold`（700） | 字重 |
| Line Height | `typography/line-height/tight`（120%）、`normal`（150%）、`loose`（180%） | 行高 |

---

### 3.4 間距 `spacing/`

以 4px 為基礎單位，建立以下間距 Token：

| Token 名稱 | 值 |
|-----------|-----|
| `spacing/1` | 4px |
| `spacing/2` | 8px |
| `spacing/3` | 12px |
| `spacing/4` | 16px |
| `spacing/5` | 20px |
| `spacing/6` | 24px |
| `spacing/8` | 32px |
| `spacing/10` | 40px |
| `spacing/12` | 48px |
| `spacing/16` | 64px |

用於：gap、padding、margin。

---

### 3.5 圓角 `radius/`

| Token 名稱 | 值 | 說明 |
|-----------|-----|------|
| `radius/none` | 0px | 無圓角 |
| `radius/sm` | 4px | 小圓角 |
| `radius/md` | 8px | 中等（輸入框、卡片常見） |
| `radius/lg` | 12px | 大圓角 |
| `radius/xl` | 16px | 更大圓角 |
| `radius/2xl` | 24px | Bottom Sheet、Modal |
| `radius/full` | 9999px | 完全圓形（圓形按鈕、標籤） |

> 實際值從截圖分析後調整。

---

### 3.6 Border 粗細 `border/`

| Token 名稱 | 值 |
|-----------|-----|
| `border/hairline` | 0.5px |
| `border/thin` | 1px |
| `border/medium` | 2px |
| `border/thick` | 4px |

---

### 3.7 陰影層級 `elevation/`

| Token 名稱 | 說明 |
|-----------|------|
| `elevation/1` | 微陰影（卡片底層） |
| `elevation/2` | 輕陰影（卡片懸浮、輸入框聚焦） |
| `elevation/3` | 中陰影（Dropdown、Tooltip） |
| `elevation/4` | 強陰影（Modal、Bottom Sheet） |
| `elevation/5` | 最強（全域覆蓋層） |

> 實際陰影數值（x, y, blur, spread, color）從截圖識別後填入。

---

### 3.8 圖示大小 `icon-size/`

| Token 名稱 | 值 |
|-----------|-----|
| `icon-size/sm` | 16px |
| `icon-size/md` | 20px |
| `icon-size/lg` | 24px |
| `icon-size/xl` | 32px |

---

### 3.9 格線系統 `grid/`

行動 App 標準格線：

| 項目 | 值 |
|------|-----|
| 欄數 | 4 欄（手機）|
| 欄寬 | 自適應 |
| Gutter | 16px |
| 邊距（Margin） | 16px（左右各） |

---

### 3.10 模糊 `effect/`

| Token 名稱 | 值 | 說明 |
|-----------|-----|------|
| `effect/blur/sm` | 4px | 輕微模糊 |
| `effect/blur/md` | 12px | 背景模糊（毛玻璃效果） |
| `effect/blur/lg` | 24px | 強模糊 |

---

## 4. Component 規格

Component 建立於 Components Page，每個元件的所有屬性（顏色、間距、圓角等）**必須綁定 Foundation Variable**，不得使用硬編碼數值。

### 4.1 基礎元件

| 類別 | 元件 | 變體（Variant）|
|------|------|---------------|
| 按鈕 | Button | Primary / Secondary / Ghost / Destructive；Size: SM / MD / LG；State: Default / Hover / Pressed / Disabled / Loading |
| 圖示 | Icon | 依 icon-size Token 套用 |
| 標籤 | Badge | Default / Success / Warning / Error / Info；Size: SM / MD |

### 4.2 輸入元件

| 元件 | 變體 |
|------|------|
| Input Field | Default / Focused / Error / Disabled；With/Without icon |
| Search Bar | Default / Active / With clear button |
| Checkbox | Unchecked / Checked / Indeterminate / Disabled |
| Toggle / Switch | On / Off / Disabled |
| Dropdown / Select | Default / Open / Selected / Disabled |

### 4.3 導覽元件

| 元件 | 說明 |
|------|------|
| Navigation Bar | 頂部導覽，含標題、返回鍵、右側操作 |
| Tab Bar | 底部分頁（通常 4–5 個 Tab） |
| Back Button | 單獨返回鍵元件 |

### 4.4 卡片與列表

| 元件 | 變體 |
|------|------|
| Card | Basic / With image / With badge |
| List Item | Single line / Double line / With avatar / With trailing |
| Avatar | Size: SM（24）/ MD（32）/ LG（40）/ XL（56）；Type: Image / Initials / Icon |

### 4.5 回饋元件

| 元件 | 變體 |
|------|------|
| Toast / Snackbar | Success / Warning / Error / Info |
| Alert | Inline / Banner；各狀態 |
| Loading Spinner | SM / MD / LG |
| Empty State | 無資料提示 |

### 4.6 覆蓋層

| 元件 | 說明 |
|------|------|
| Modal / Dialog | 標題 + 內容 + 按鈕 |
| Bottom Sheet | 滑出式底部面板，含 handle、內容區 |
| Overlay / Backdrop | 半透明背景遮罩 |

> 實際元件種類以截圖分析為準，以上為預期清單，可能增減。

---

## 5. 執行流程

### 第一階段：Foundation 建立
1. 用戶提供第一批截圖（5–10 張）
2. 分析截圖中的顏色、字體、間距、圓角等視覺屬性
3. 在 Figma 建立 Foundation Page 與所有 Variable
4. 截圖回報識別結果，請用戶確認

### 第二階段：Component 建立
1. Foundation 確認後，逐一建立 Component
2. 每個 Component 截圖給用戶確認視覺正確
3. 有問題立即調整
4. 繼續接收新截圖，識別更多元件

### 第三階段：Screens 整理
1. 將所有截圖貼入 Screens Page
2. 標注每個畫面使用的 Component
3. 確認設計系統完整覆蓋所有截圖中的 UI 元素

---

## 6. 注意事項與限制

| 項目 | 說明 |
|------|------|
| 顏色誤差 | 截圖顏色可能因螢幕顯示有 ±5 hex 誤差，需用戶最終確認 |
| 字體 | 若非系統字體，需用戶在 Figma 帳號中預先安裝 |
| Figma MCP 限制 | 複雜元件可能需分多次操作建立 |
| 動畫 Variable | 本次不建立（duration / easing），後續有需要再補充 |

---

## 7. 完成標準

- [ ] Figma 新檔案建立完成，3 個 Page 就位
- [ ] 所有 10 類 Variable 建立完成並命名正確
- [ ] 所有 Component 建立完成，屬性全部綁定 Variable
- [ ] Screens Page 截圖對照標注完成
- [ ] 用戶視覺確認所有 Component 外觀正確
