// RGB ↔ HSL 轉換，並套用色相/飽和度/亮度調整
// HSL 中：H 為 0-360 度，S 為 0-100，L 為 0-100

// 將數值限制在 0-1 範圍內
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

// 將數值限制在 0-255 整數範圍內
function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(255, Math.round(value)))
}

// 將色相值限制在 0-360 範圍內（處理負值和超過 360 的情況）
function wrapHue(value: number): number {
  if (!Number.isFinite(value)) return 0
  return ((value % 360) + 360) % 360
}

// HSL 轉 RGB 的輔助函數：根據 p, q 和色相 t 計算單一色道值
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

// 將 RGB [0-255] 轉換為 HSL [0-360, 0-100, 0-100]
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = clamp01(r / 255)
  const gn = clamp01(g / 255)
  const bn = clamp01(b / 255)
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  let h = 0,
    s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
        break
      case gn:
        h = ((bn - rn) / d + 2) / 6
        break
      case bn:
        h = ((rn - gn) / d + 4) / 6
        break
    }
  }
  return [h * 360, s * 100, l * 100]
}

// 將 HSL [0-360, 0-100, 0-100] 轉換為 RGB [0-255]
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = wrapHue(h) / 360
  const sn = clamp01(s / 100)
  const ln = clamp01(l / 100)
  let r: number, g: number, b: number

  if (sn === 0) {
    // 飽和度為 0：灰階，R=G=B=L
    r = g = b = ln
  } else {
    // 根據亮度計算 q 和 p
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
    const p = 2 * ln - q
    r = hue2rgb(p, q, hn + 1 / 3)
    g = hue2rgb(p, q, hn)
    b = hue2rgb(p, q, hn - 1 / 3)
  }

  return [clampByte(r * 255), clampByte(g * 255), clampByte(b * 255)]
}

/**
 * 對單一像素套用色相/飽和度/亮度調整
 * @param r 紅色通道 0-255
 * @param g 綠色通道 0-255
 * @param b 藍色通道 0-255
 * @param hue 色相偏移量 -180 ~ +180 度
 * @param saturation 飽和度偏移量 -100 ~ +100
 * @param brightness 亮度偏移量 -100 ~ +100
 * @returns [r, g, b] 調整後的 RGB 值
 */
export function applyHsl(
  r: number,
  g: number,
  b: number,
  hue: number,
  saturation: number,
  brightness: number
): [number, number, number] {
  const safeHue = Number.isFinite(hue) ? hue : 0
  const safeSaturation = Number.isFinite(saturation) ? saturation : 0
  const safeBrightness = Number.isFinite(brightness) ? brightness : 0

  // 將 RGB 轉為 HSL
  let [h, s, l] = rgbToHsl(clampByte(r), clampByte(g), clampByte(b))

  // 套用調整
  h = wrapHue(h + safeHue)
  s = Math.max(0, Math.min(100, s + safeSaturation))
  l = Math.max(0, Math.min(100, l + safeBrightness))

  // 轉回 RGB 並回傳
  return hslToRgb(h, s, l)
}
