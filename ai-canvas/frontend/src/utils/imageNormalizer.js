import exifr from 'exifr';

const VALID_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_DIMENSION = 2048;
const MIN_DIMENSION = 256;

export class NormalizeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片讀取失敗')); };
    img.src = url;
  });
}

/**
 * 正規化上傳的圖片檔案：
 * 1. 拒絕不支援的格式或超過 20MB 的檔案
 * 2. 修正 EXIF 方向（解決手機直拍照片旋轉問題）
 * 3. 縮小至最長邊 ≤ 2048px
 * 4. 轉換為含 alpha channel 的 PNG
 * @param {File} file
 * @returns {Promise<Blob>} PNG Blob
 */
export async function normalizeImage(file) {
  if (file.size > MAX_FILE_SIZE) {
    throw new NormalizeError('FILE_TOO_LARGE', '檔案過大，請上傳 20MB 以下的圖片');
  }
  if (!VALID_TYPES.includes(file.type)) {
    throw new NormalizeError('INVALID_FORMAT', '僅支援 PNG、JPEG、WebP 格式');
  }

  // 讀取 EXIF 方向（若無 EXIF 或解析失敗，預設為 1 = 正常方向）
  let orientation = 1;
  try {
    const exif = await exifr.parse(file, ['Orientation']);
    orientation = exif?.Orientation ?? 1;
  } catch {
    orientation = 1;
  }

  const img = await loadImageFromFile(file);

  // EXIF 方向 5–8 會交換寬高（旋轉 90° 或 270°）
  const isTransposed = orientation >= 5;
  const logicalW = isTransposed ? img.naturalHeight : img.naturalWidth;
  const logicalH = isTransposed ? img.naturalWidth : img.naturalHeight;

  if (logicalW < MIN_DIMENSION || logicalH < MIN_DIMENSION) {
    throw new NormalizeError(
      'IMAGE_TOO_SMALL',
      `圖片尺寸過小（最小 ${MIN_DIMENSION}×${MIN_DIMENSION}px）`
    );
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(logicalW, logicalH));
  const targetW = Math.round(logicalW * scale);
  const targetH = Math.round(logicalH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  applyExifTransform(ctx, orientation, targetW, targetH);
  // 旋轉後，在轉換後的座標系中繪圖
  if (isTransposed) {
    ctx.drawImage(img, 0, 0, targetH, targetW);
  } else {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new NormalizeError('CONVERT_FAILED', '圖片轉換失敗'));
      resolve(blob);
    }, 'image/png');
  });
}

/** 對應各 EXIF 方向值套用 canvas 變換矩陣 */
function applyExifTransform(ctx, orientation, w, h) {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break; // orientation 1 = 正常，無需變換
  }
}
