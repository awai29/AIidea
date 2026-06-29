# SecurePlay Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 從 SecurePlay 行動 App 截圖反向還原完整 Figma 設計系統，包含 10 類 Variable 與完整 UI Component Library，所有元件屬性綁定 Variable。

**Architecture:** 建立單一 Figma 檔案「SecurePlay Design System」，分三個 Page 依序建立：Foundation（Variable）→ Components（元件）→ Screens（截圖對照）。先從截圖提取視覺 Token，建立 Variable 後，再用 Variable 組裝每個 Component。

**Tech Stack:** Figma MCP（`use_figma`、`search_design_system`、`get_variable_defs`、`get_design_context`）、Figma Variables API、Figma Components

**Spec 參考：** `docs/superpowers/specs/2026-06-26-secureplay-design.md`

---

## 操作說明

- 每個 Task 完成後，用 `get_screenshot` 截圖確認視覺結果
- 截圖確認無誤後才進入下一個 Task
- 每個 Task 結束時 commit 進度文件（在 `docs/superpowers/plans/` 更新完成狀態）
- 明暗模式：請用戶**同時提供亮色與暗色截圖**，才能完整識別 Dark Mode 的顏色值

---

## 檔案輸出

| 輸出 | 說明 |
|------|------|
| Figma 檔案：SecurePlay Design System | 主要設計系統檔案（新建） |
| Page: Foundation | 所有 Variable 定義 |
| Page: Components | 所有 UI 元件 |
| Page: Screens | 截圖對照與標注 |

---

## Task 1：建立 Figma 檔案與三個 Page

**目標：** 建立乾淨的新 Figma 檔案作為設計系統的容器

**工具：** `mcp__claude_ai_Figma__create_new_file`、`mcp__claude_ai_Figma__use_figma`

- [ ] **Step 1: 呼叫 figma-use skill（必做）**

  在呼叫任何 `use_figma` 之前，必須先 invoke `figma-use` skill 獲取最新操作指引。

- [ ] **Step 2: 建立新 Figma 檔案**

  使用 `create_new_file` 建立新檔案，命名為「SecurePlay Design System」。

  記錄回傳的 `fileKey`，後續所有操作都需要這個值。

- [ ] **Step 3: 建立三個 Page**

  使用 `use_figma` 在檔案中建立三個 Page：
  - `Foundation`
  - `Components`
  - `Screens`

  確認 Page 順序正確（Foundation 第一）。

- [ ] **Step 4: 截圖確認**

  使用 `get_screenshot` 確認檔案結構與三個 Page 都正確建立。

- [ ] **Step 5: Commit**

  ```bash
  git add docs/superpowers/plans/2026-06-26-secureplay-design-system.md
  git commit -m "進度：Task 1 完成 — Figma 檔案建立"
  ```

---

## Task 2：截圖分析 — 提取視覺 Token

**目標：** 分析用戶提供的截圖，識別所有視覺屬性，準備建立 Variable

**前提：** 用戶必須先提供截圖（至少第一批 5–10 張）

**工具：** Read（讀取截圖）、`get_design_context`

- [ ] **Step 1: 接收截圖**

  請用戶提供第一批截圖（5–10 張）。截圖可以是：
  - 直接貼入對話的圖片
  - 本地檔案路徑

- [ ] **Step 2: 分析顏色**

  從截圖中識別並記錄以下顏色（hex 值）：
  - 主色（Primary）：按鈕、重點元素
  - 背景色：頁面底色、卡片背景
  - 文字色：標題、內文、次要文字
  - 邊框色：輸入框、分隔線
  - 狀態色：成功（綠）、錯誤（紅）、警告（黃）、資訊（藍）

  建立分析表格：
  ```
  | 用途 | Hex 值 | Token 名稱 |
  |------|--------|-----------|
  | 主色 | #XXXXXX | color/primary/500 |
  ...
  ```

- [ ] **Step 3: 分析字體**

  從截圖識別：
  - 字體族（Font family）
  - 使用到的字體大小（px）
  - 字重（Regular / Medium / Bold 等）

- [ ] **Step 4: 分析間距、圓角、Border**

  用截圖中的元素估算：
  - 常見的 padding / gap 值
  - 按鈕、卡片、輸入框的圓角大小
  - Border 粗細

- [ ] **Step 5: 記錄分析結果**

  將分析結果整理成表格，準備進入 Task 3 建立 Variable。

  如有不確定的數值，標注「待確認」，繼續處理其他確定的值。

---

## Task 3：Foundation — Color Variables（Primitives + Semantic + 明暗模式）

**目標：** 建立兩層顏色 Variable Collection，支援 Light / Dark 模式切換

**架構說明：**
- **Primitives Collection**（無 Mode）：存放所有原始 hex 色票，命名如 `blue/500`
- **Semantic Collection**（Light + Dark 兩個 Mode）：存放有語意的 Token，值引用 Primitives

元件只綁定 Semantic 層，切換 Mode 時整個設計系統自動更新。

**工具：** `use_figma`（figma-use skill 必須在 Task 1 已載入）

- [ ] **Step 1: 導航至 Foundation Page**

  使用 `use_figma` 切換到 Foundation Page。

- [ ] **Step 2: 建立 Primitives Collection（原始色票，無 Mode）**

  建立名為 `Primitives` 的 Variable Collection，填入從 Task 2 識別的 hex 值：

  ```
  blue/
    50   <- 最淡（從截圖識別）
    100
    200
    300
    400
    500  <- 主色
    600
    700
    800
    900  <- 最深

  neutral/
    0    <- 白 #FFFFFF
    50
    100
    200
    300
    400
    500
    600
    700
    800
    900  <- 黑 #111827（或截圖識別值）

  green/
    50 / 100 / 300 / 500 / 600 / 700

  red/
    50 / 100 / 300 / 500 / 600 / 700

  yellow/
    50 / 100 / 300 / 500 / 600 / 700
  ```

- [ ] **Step 3: 建立 Semantic Collection（兩個 Mode：Light / Dark）**

  建立名為 `Semantic` 的 Variable Collection，設定兩個 Mode：`Light` 和 `Dark`。

  每個 Token 的值引用 Primitives 中對應的色票：

  ```
  color/primary/default
    Light → Primitives/blue/500
    Dark  → Primitives/blue/400

  color/primary/subtle
    Light → Primitives/blue/50
    Dark  → Primitives/blue/900

  color/bg/base
    Light → Primitives/neutral/0
    Dark  → Primitives/neutral/900

  color/bg/surface
    Light → Primitives/neutral/50
    Dark  → Primitives/neutral/800

  color/bg/elevated
    Light → Primitives/neutral/100
    Dark  → Primitives/neutral/700

  color/text/primary
    Light → Primitives/neutral/900
    Dark  → Primitives/neutral/0

  color/text/secondary
    Light → Primitives/neutral/500
    Dark  → Primitives/neutral/400

  color/text/disabled
    Light → Primitives/neutral/300
    Dark  → Primitives/neutral/600

  color/text/inverse
    Light → Primitives/neutral/0
    Dark  → Primitives/neutral/900

  color/border/default
    Light → Primitives/neutral/200
    Dark  → Primitives/neutral/700

  color/border/strong
    Light → Primitives/neutral/400
    Dark  → Primitives/neutral/500

  color/status/success
    Light → Primitives/green/600
    Dark  → Primitives/green/400

  color/status/warning
    Light → Primitives/yellow/600
    Dark  → Primitives/yellow/400

  color/status/error
    Light → Primitives/red/600
    Dark  → Primitives/red/400

  color/status/info
    Light → Primitives/blue/600
    Dark  → Primitives/blue/400
  ```

- [ ] **Step 4: 截圖確認（Light Mode）**

  使用 `get_screenshot` 截圖，確認 Semantic Collection 的 Light 值正確。

- [ ] **Step 5: 截圖確認（Dark Mode）**

  在 Figma 切換 Mode 至 Dark，再次截圖確認暗色版本顏色正確。

- [ ] **Step 6: 請用戶確認顏色**

  將兩張截圖（Light / Dark）給用戶確認，有誤差立即修正 Primitives 的 hex 值。

- [ ] **Step 7: Commit**

  ```bash
  git commit -m "進度：Task 3 完成 — Color Variable 建立（Primitives + Semantic，支援 Light/Dark）"
  ```

---

## Task 4：Foundation — Opacity Variables

**目標：** 建立透明度 Variable

- [ ] **Step 1: 建立 Opacity Variable Group**

  ```
  opacity/
    10   <- 10%
    20   <- 20%
    40   <- 40%
    60   <- 60%
    80   <- 80%
    100  <- 100%（完全不透明）
  ```

- [ ] **Step 2: 截圖確認**

  確認 Opacity Variable 建立正確。

- [ ] **Step 3: Commit**

  ```bash
  git commit -m "進度：Task 4 完成 — Opacity Variable 建立"
  ```

---

## Task 5：Foundation — Typography Variables

**目標：** 建立字體相關 Variable

- [ ] **Step 1: 建立 Font Family Variable**

  ```
  typography/font-family/
    base    <- 主要字體（從截圖識別，填入字體名稱）
    mono    <- 等寬字體（如有使用）
  ```

- [ ] **Step 2: 建立 Font Size Variable**

  ```
  typography/size/
    xs   <- 12px
    sm   <- 14px
    md   <- 16px
    lg   <- 18px
    xl   <- 20px
    2xl  <- 24px
    3xl  <- 32px
    4xl  <- 40px
  ```

  依截圖中實際使用的大小調整，未用到的可暫不建立。

- [ ] **Step 3: 建立 Font Weight Variable**

  ```
  typography/weight/
    regular   <- 400
    medium    <- 500
    semibold  <- 600
    bold      <- 700
  ```

- [ ] **Step 4: 建立 Line Height Variable**

  ```
  typography/line-height/
    tight   <- 120%
    normal  <- 150%
    loose   <- 180%
  ```

- [ ] **Step 5: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 5 完成 — Typography Variable 建立"
  ```

---

## Task 6：Foundation — Spacing Variables

**目標：** 建立間距 Variable（用於 gap、padding、margin）

- [ ] **Step 1: 建立 Spacing Variable Group**

  ```
  spacing/
    1   <- 4px
    2   <- 8px
    3   <- 12px
    4   <- 16px
    5   <- 20px
    6   <- 24px
    8   <- 32px
    10  <- 40px
    12  <- 48px
    16  <- 64px
  ```

- [ ] **Step 2: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 6 完成 — Spacing Variable 建立"
  ```

---

## Task 7：Foundation — Radius、Border、Elevation Variables

**目標：** 建立圓角、邊框粗細、陰影層級 Variable

- [ ] **Step 1: 建立 Radius Variable**

  ```
  radius/
    none  <- 0px
    sm    <- 4px
    md    <- 8px
    lg    <- 12px
    xl    <- 16px
    2xl   <- 24px
    full  <- 9999px
  ```

  依截圖調整實際值。

- [ ] **Step 2: 建立 Border Variable**

  ```
  border/
    hairline  <- 0.5px
    thin      <- 1px
    medium    <- 2px
    thick     <- 4px
  ```

- [ ] **Step 3: 建立 Elevation Variable**

  建立 5 個陰影層級，每個包含 x、y、blur、spread、color：

  ```
  elevation/
    1  <- 微陰影：0px 1px 2px rgba(0,0,0,0.08)
    2  <- 輕陰影：0px 2px 8px rgba(0,0,0,0.10)
    3  <- 中陰影：0px 4px 16px rgba(0,0,0,0.12)
    4  <- 強陰影：0px 8px 24px rgba(0,0,0,0.16)
    5  <- 最強：0px 16px 48px rgba(0,0,0,0.20)
  ```

  依截圖中卡片、Modal 的陰影調整實際值。

- [ ] **Step 4: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 7 完成 — Radius/Border/Elevation Variable 建立"
  ```

---

## Task 8：Foundation — Icon Size、Grid、Effect Variables

**目標：** 建立剩餘 Variable，完成 Foundation Page

- [ ] **Step 1: 建立 Icon Size Variable**

  ```
  icon-size/
    sm  <- 16px
    md  <- 20px
    lg  <- 24px
    xl  <- 32px
  ```

- [ ] **Step 2: 建立 Grid Variable**

  ```
  grid/
    columns      <- 4（手機標準）
    gutter       <- 16px
    margin       <- 16px
  ```

- [ ] **Step 3: 建立 Effect Variable（Blur）**

  ```
  effect/blur/
    sm  <- 4px
    md  <- 12px
    lg  <- 24px
  ```

- [ ] **Step 4: Foundation 整體截圖確認**

  截圖 Foundation Page 完整畫面，確認所有 10 類 Variable 都已建立，命名格式一致。

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "進度：Task 8 完成 — Foundation 全部 Variable 建立完成"
  ```

---

## Task 9：Components — Button

**目標：** 建立 Button Component，所有屬性綁定 Variable

**工具：** `use_figma`

- [ ] **Step 1: 導航至 Components Page**

- [ ] **Step 2: 建立 Button/Primary**

  建立 Primary 按鈕，屬性綁定：
  - 背景色 → `color/primary/500`
  - 文字色 → `color/text/inverse`
  - 圓角 → `radius/md`（或從截圖識別的實際值）
  - 內距（padding）→ `spacing/4`（垂直）、`spacing/6`（水平）
  - 字體大小 → `typography/size/md`
  - 字重 → `typography/weight/semibold`

  建立 Variant：
  - `State`: Default / Pressed / Disabled / Loading
  - `Size`: SM / MD / LG

- [ ] **Step 3: 建立 Button/Secondary**

  - 背景色 → 透明（`opacity/0`）
  - Border → `border/thin`，顏色 → `color/primary/500`
  - 文字色 → `color/primary/500`
  - 其他屬性同 Primary

- [ ] **Step 4: 建立 Button/Ghost**

  - 背景色 → 透明
  - 無 Border
  - 文字色 → `color/primary/500`

- [ ] **Step 5: 截圖確認**

  與原始截圖對照，確認按鈕外觀一致。

- [ ] **Step 6: Commit**

  ```bash
  git commit -m "進度：Task 9 完成 — Button Component 建立"
  ```

---

## Task 10：Components — Input Field、Search Bar

**目標：** 建立輸入元件

- [ ] **Step 1: 建立 Input Field**

  屬性綁定：
  - 背景色 → `color/background/surface`
  - 邊框 → `border/thin`，顏色 → `color/border/default`
  - 圓角 → `radius/md`
  - 內距 → `spacing/3`（垂直）、`spacing/4`（水平）
  - 文字大小 → `typography/size/md`

  Variant：
  - `State`: Default / Focused（border 變 `color/primary/500`）/ Error（border 變 `color/status/error`）/ Disabled
  - `HasIcon`: True / False（左側 icon）

- [ ] **Step 2: 建立 Search Bar**

  基於 Input Field，加上搜尋 icon（左）、清除按鈕（右）。
  - icon 大小 → `icon-size/md`（20px）

- [ ] **Step 3: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 10 完成 — Input/Search Component 建立"
  ```

---

## Task 11：Components — Checkbox、Toggle

**目標：** 建立選擇控制元件

- [ ] **Step 1: 建立 Checkbox**

  Variant：
  - `State`: Unchecked / Checked / Indeterminate / Disabled
  - Checked 時背景 → `color/primary/500`，勾號 → 白色

- [ ] **Step 2: 建立 Toggle / Switch**

  Variant：
  - `State`: On（`color/primary/500`）/ Off（`color/neutral/300`）/ Disabled

- [ ] **Step 3: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 11 完成 — Checkbox/Toggle Component 建立"
  ```

---

## Task 12：Components — Navigation Bar、Tab Bar

**目標：** 建立導覽元件

- [ ] **Step 1: 建立 Navigation Bar**

  標準頂部導覽列：
  - 高度：44px（iOS 標準）
  - 左側：返回按鈕（icon-size/lg）
  - 中間：標題（typography/size/lg、weight/semibold）
  - 右側：操作按鈕（可選）
  - 背景 → `color/background/base`
  - 底部邊框 → `border/hairline`，顏色 → `color/border/default`

- [ ] **Step 2: 建立 Tab Bar**

  底部分頁列（依截圖識別實際 Tab 數量，通常 4–5 個）：
  - 高度：83px（含 iOS safe area）
  - 每個 Tab：icon（icon-size/md）+ label（typography/size/xs）
  - Active 狀態 → `color/primary/500`
  - Inactive 狀態 → `color/neutral/400`
  - 背景 → `color/background/base`
  - 頂部邊框 → `border/hairline`

- [ ] **Step 3: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 12 完成 — Navigation Bar/Tab Bar Component 建立"
  ```

---

## Task 13：Components — Card、List Item、Avatar

**目標：** 建立卡片與列表元件

- [ ] **Step 1: 建立 Card**

  基本卡片：
  - 背景 → `color/background/surface`
  - 圓角 → `radius/lg`
  - 陰影 → `elevation/2`
  - 內距 → `spacing/4`

  Variant：
  - `Type`: Basic / WithImage / WithBadge

- [ ] **Step 2: 建立 List Item**

  Variant：
  - `Type`: SingleLine / DoubleLine / WithAvatar / WithTrailing

  屬性：
  - 高度：SingleLine 48px / DoubleLine 72px
  - 間距 → `spacing/4`
  - 文字：主要 → `typography/size/md`，次要 → `typography/size/sm`、`color/text/secondary`

- [ ] **Step 3: 建立 Avatar**

  Variant：
  - `Size`: SM（24px）/ MD（32px）/ LG（40px）/ XL（56px）
  - `Type`: Image / Initials / Icon
  - 圓角 → `radius/full`

- [ ] **Step 4: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 13 完成 — Card/List/Avatar Component 建立"
  ```

---

## Task 14：Components — Badge、Toast、Alert、Loading

**目標：** 建立狀態回饋元件

- [ ] **Step 1: 建立 Badge**

  Variant：
  - `Type`: Default / Success / Warning / Error / Info
  - `Size`: SM / MD
  - 圓角 → `radius/full`
  - 文字大小 → `typography/size/xs`（SM）/ `typography/size/sm`（MD）

- [ ] **Step 2: 建立 Toast / Snackbar**

  Variant：
  - `Type`: Success / Warning / Error / Info
  - 含 icon、文字、可選「關閉」按鈕
  - 圓角 → `radius/md`
  - 陰影 → `elevation/3`

- [ ] **Step 3: 建立 Alert**

  Variant：
  - `Type`: Inline / Banner
  - `Status`: Success / Warning / Error / Info
  - 各狀態顏色綁定 `color/status/*`

- [ ] **Step 4: 建立 Loading Spinner**

  Variant：`Size`: SM（16px）/ MD（24px）/ LG（40px）

- [ ] **Step 5: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 14 完成 — Badge/Toast/Alert/Loading Component 建立"
  ```

---

## Task 15：Components — Modal、Bottom Sheet

**目標：** 建立覆蓋層元件

- [ ] **Step 1: 建立 Modal / Dialog**

  結構：
  - 外層 Overlay（`opacity/60`、`color/neutral/900`）
  - 內容卡片：`radius/2xl`、`elevation/5`、`color/background/surface`
  - 標題：`typography/size/lg`、`weight/semibold`
  - 內文區域
  - 按鈕列（使用 Button Component）

- [ ] **Step 2: 建立 Bottom Sheet**

  結構：
  - 外層 Overlay
  - 底部浮起的面板：`radius/2xl`（只有上方圓角）
  - Handle 條：`color/neutral/300`、`radius/full`、寬 32px、高 4px
  - 內容區域：`spacing/4` 內距

- [ ] **Step 3: 截圖確認 + Commit**

  ```bash
  git commit -m "進度：Task 15 完成 — Modal/Bottom Sheet Component 建立"
  ```

---

## Task 16：持續截圖分析與補充

**目標：** 接收更多截圖，識別並補充截圖中尚未還原的 Component

**前提：** 用戶提供第二批、第三批截圖

- [ ] **Step 1: 接收新截圖批次**

- [ ] **Step 2: 識別新元件**

  掃描截圖中是否出現 Task 9–15 以外的元件，例如：
  - 日期選擇器（Date Picker）
  - 進度條（Progress Bar）
  - 標籤頁（Tabs）
  - 下拉選單（Dropdown Menu）
  - 工具提示（Tooltip）
  - 其他特定於 SecurePlay 的客製元件

- [ ] **Step 3: 建立新 Component**

  每個新元件依照 Task 9–15 的模式建立：
  - 屬性綁定 Variable
  - 建立 Variant
  - 截圖確認

- [ ] **Step 4: 更新 Variable（如有需要）**

  若發現截圖中有尚未建立的顏色、圓角等，回到 Foundation Page 補充 Variable。

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "進度：Task 16 — 補充新 Component（說明具體補充了什麼）"
  ```

---

## Task 17：建立 Screens Page

**目標：** 將所有截圖貼入 Screens Page，標注對應 Component

- [ ] **Step 1: 導航至 Screens Page**

- [ ] **Step 2: 依功能流程排列截圖**

  將截圖按功能分組排列（例如：登入流程、首頁、遊戲頁面、設定頁面）。
  每組之間留 `spacing/16`（64px）間距。

- [ ] **Step 3: 標注 Component 對應**

  在每張截圖旁加上文字標注，說明畫面中使用了哪些 Component：
  ```
  此頁使用：
  - Navigation Bar
  - Card/WithImage × 3
  - Tab Bar
  ```

- [ ] **Step 4: 截圖確認整體 Screens Page**

- [ ] **Step 5: Commit**

  ```bash
  git commit -m "進度：Task 17 完成 — Screens Page 截圖對照建立"
  ```

---

## Task 18：最終審查與完成確認

**目標：** 整體檢查設計系統完整性，確認所有 Component 正確綁定 Variable

- [ ] **Step 1: 使用 `get_variable_defs` 確認所有 Variable 存在**

  呼叫 `get_variable_defs` 取得所有 Variable 清單，對照 Spec 的 10 類 Variable，確認無遺漏。

- [ ] **Step 2: 隨機抽查 5 個 Component**

  選擇 Button/Primary、Input/Focused、Card/Basic、Navigation Bar、Toast/Error，確認：
  - 每個元件的顏色、間距、圓角都使用 Variable（非硬編碼）
  - 視覺外觀與截圖一致

- [ ] **Step 3: 最終整體截圖**

  分別截圖 Foundation、Components、Screens 三個 Page，整理成最終確認畫面。

- [ ] **Step 4: 完成報告**

  向用戶報告：
  - 建立的 Variable 總數（各類別）
  - 建立的 Component 總數（各類別）
  - 已還原的截圖數量
  - 任何需要後續補充的項目

- [ ] **Step 5: 最終 Commit**

  ```bash
  git add docs/superpowers/plans/2026-06-26-secureplay-design-system.md
  git commit -m "完成：SecurePlay Design System 設計系統還原完成"
  ```

---

## 完成標準檢查清單

- [ ] Figma 新檔案「SecurePlay Design System」已建立
- [ ] Foundation Page：10 類 Variable 全部建立，命名格式一致
- [ ] Components Page：所有元件屬性綁定 Variable，無硬編碼
- [ ] Screens Page：所有截圖已貼入並標注
- [ ] 用戶視覺確認所有 Component 外觀正確
