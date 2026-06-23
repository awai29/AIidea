/**
 * 遮罩 Canvas 工具
 *
 * 概念：
 * - 遮罩 canvas 預設填滿不透明白色（代表「不修改」的區域）
 * - 使用者塗抹後，塗抹區域變成透明（alpha=0）
 * - OpenAI Edit API 規定：透明區域 = 要修改的地方
 */

/**
 * 建立指定尺寸的遮罩 canvas，並初始化為全白不透明。
 * @param {number} width  - 寬度（像素）
 * @param {number} height - 高度（像素）
 * @returns {HTMLCanvasElement}
 */
export function createMaskCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // 初始化：填滿不透明白色
  clearMask(canvas);
  return canvas;
}

/**
 * 清除遮罩，重置為全白不透明（沒有任何選取區域）。
 * @param {HTMLCanvasElement} canvas
 */
export function clearMask(canvas) {
  const ctx = canvas.getContext('2d');
  // 確保合成模式為正常（覆蓋），避免受上一次操作影響
  ctx.globalCompositeOperation = 'source-over';
  // 填滿不透明白色
  ctx.fillStyle = 'rgba(255, 255, 255, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * 在遮罩上塗抹一個圓形透明區域（代表使用者選取要修改的地方）。
 * 使用 destination-out 合成模式，讓塗抹的圓形變成透明。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} origX      - 圓心 X（原圖像素座標）
 * @param {number} origY      - 圓心 Y（原圖像素座標）
 * @param {number} origRadius - 半徑（原圖像素）
 */
export function paintMaskArea(canvas, origX, origY, origRadius) {
  const ctx = canvas.getContext('2d');
  // destination-out：新畫的形狀會把原本的像素「擦掉」變成透明
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(origX, origY, origRadius, 0, Math.PI * 2);
  ctx.fill();
  // 還原合成模式，避免影響後續操作
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * 將遮罩 canvas 匯出為 PNG Blob（供上傳至 OpenAI API 使用）。
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function exportMask(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to export mask'));
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * 判斷遮罩是否為空（沒有任何透明區域）。
 * 遍歷所有像素的 alpha 值，若有任何一個 < 255，代表有被塗抹。
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {boolean} 若全部不透明（未塗抹）則回傳 true
 */
export function isMaskEmpty(canvas) {
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // data 是一維陣列：[R, G, B, A, R, G, B, A, ...]
  // 每 4 個元素為一個像素，第 4 個（index 3, 7, 11...）是 alpha
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return false; // 發現透明像素，表示有塗抹
  }
  return true;
}
