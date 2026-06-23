/**
 * coordinateMapping.js
 *
 * 處理「顯示畫布座標」與「原始圖片座標」之間的轉換。
 *
 * 背景知識：
 * - 顯示畫布用 object-fit: contain 顯示圖片，圖片周圍可能有黑邊（letterbox）
 * - 滑鼠事件給的是 CSS 像素座標（相對於畫布左上角）
 * - 我們需要把這個座標換算成原始圖片的像素座標，才能在遮罩上正確標記
 * - DPR（螢幕像素密度）不在這裡處理，pointer events 永遠用 CSS 像素
 */

/**
 * 計算圖片在畫布中的實際顯示位置與縮放比例（fit-contain 模式）。
 *
 * @param {number} canvasCssWidth  - 畫布的 CSS 寬度（px）
 * @param {number} canvasCssHeight - 畫布的 CSS 高度（px）
 * @param {number} imgWidth        - 原始圖片寬度（px）
 * @param {number} imgHeight       - 原始圖片高度（px）
 * @returns {{ renderScale, renderedWidth, renderedHeight, offsetX, offsetY }}
 *   renderScale    - 圖片被縮放的倍率（例如 0.5 表示縮小一半）
 *   renderedWidth  - 圖片在畫布上的實際顯示寬度
 *   renderedHeight - 圖片在畫布上的實際顯示高度
 *   offsetX        - 圖片左側留白（letterbox 水平邊距）
 *   offsetY        - 圖片上方留白（letterbox 垂直邊距）
 */
export function getCanvasLayout(canvasCssWidth, canvasCssHeight, imgWidth, imgHeight) {
  // fit-contain：取寬高兩個方向中較小的縮放比，確保圖片完整顯示
  const renderScale = Math.min(canvasCssWidth / imgWidth, canvasCssHeight / imgHeight);

  // 圖片在畫布上的實際顯示尺寸
  const renderedWidth = imgWidth * renderScale;
  const renderedHeight = imgHeight * renderScale;

  // 圖片置中後，左側和上方的留白距離
  const offsetX = (canvasCssWidth - renderedWidth) / 2;
  const offsetY = (canvasCssHeight - renderedHeight) / 2;

  return { renderScale, renderedWidth, renderedHeight, offsetX, offsetY };
}

/**
 * 將畫布上的 CSS 像素滑鼠位置轉換為原始圖片像素座標。
 * 若點擊位置在圖片範圍之外（letterbox 留白處），回傳 null。
 *
 * @param {number} mouseX   - 滑鼠在畫布上的 X 座標（CSS px）
 * @param {number} mouseY   - 滑鼠在畫布上的 Y 座標（CSS px）
 * @param {object} layout   - getCanvasLayout() 回傳的佈局物件
 * @param {number} imgWidth - 原始圖片寬度（px）
 * @param {number} imgHeight- 原始圖片高度（px）
 * @returns {{ x, y } | null} 原始圖片座標，或 null（點擊在圖片外）
 */
export function displayToOriginal(mouseX, mouseY, layout, imgWidth, imgHeight) {
  const { renderedWidth, renderedHeight, offsetX, offsetY } = layout;

  // 計算相對於圖片左上角的局部座標
  const localX = mouseX - offsetX;
  const localY = mouseY - offsetY;

  // 若超出圖片顯示範圍，回傳 null
  if (localX < 0 || localX > renderedWidth || localY < 0 || localY > renderedHeight) {
    return null;
  }

  // 按比例換算回原始圖片座標
  return {
    x: localX * (imgWidth / renderedWidth),
    y: localY * (imgHeight / renderedHeight),
  };
}

/**
 * 將 UI 上的筆刷半徑（CSS px）換算為原始圖片的像素半徑。
 * 這樣筆刷在縮小顯示的圖片上畫圓，對應到原始圖片時會是正確大小。
 *
 * @param {number} uiRadiusCss - UI 筆刷半徑（CSS px）
 * @param {object} layout      - getCanvasLayout() 回傳的佈局物件
 * @param {number} imgWidth    - 原始圖片寬度（px）
 * @returns {number} 原始圖片像素半徑
 */
export function getBrushRadiusInOriginal(uiRadiusCss, layout, imgWidth) {
  // 原始寬度 / 顯示寬度 = 放大倍率，UI 半徑乘以放大倍率即為原始半徑
  return uiRadiusCss * (imgWidth / layout.renderedWidth);
}
