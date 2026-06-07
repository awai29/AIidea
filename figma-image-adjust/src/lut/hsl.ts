// RGB ↔ HSL 轉換，並套用色相/飽和度/亮度調整
// HSL 中：H 為 0-360 度，S 為 0-100，L 為 0-100
import type { HslParams } from '../types'

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

// 六個色系的中心色相（度）
const CHANNEL_CENTERS: Record<string, number> = {
  red: 0,
  yellow: 60,
  green: 120,
  cyan: 180,
  blue: 240,
  magenta: 300,
}

// 計算某色相對特定色系的影響權重
// 中心 ±30° 全影響，再延伸 15° 平滑淡出（共 60° 範圍，類 Photoshop）
function channelWeight(pixelHueDeg: number, centerHueDeg: number): number {
  const halfWidth = 30
  const feather = 15
  const diff = Math.abs(((pixelHueDeg - centerHueDeg + 540) % 360) - 180)
  if (diff <= halfWidth) return 1
  if (diff >= halfWidth + feather) return 0
  const t = (diff - halfWidth) / feather
  return 1 - (3 * t * t - 2 * t * t * t) // smoothstep
}

/**
 * 套用含 per-channel 的色相/飽和度/亮度調整（對應 Photoshop 色相/飽和度面板）
 * 以像素原始色相計算各色系的影響權重，再一次性累加套用
 */
export function applyHslWithChannels(
  r: number,
  g: number,
  b: number,
  params: HslParams
): [number, number, number] {
  let [h, s, l] = rgbToHsl(clampByte(r), clampByte(g), clampByte(b))
  const origH = h  // 用原始色相計算各色系權重

  // 累計所有調整量（全部 + 各色系加權）
  let dh = params.all.hue
  let ds = params.all.saturation
  let dl = params.all.brightness

  const COLOR_CHANNELS = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'] as const
  for (const ch of COLOR_CHANNELS) {
    const w = channelWeight(origH, CHANNEL_CENTERS[ch])
    if (w <= 0) continue
    const adj = params[ch]
    dh += adj.hue * w
    ds += adj.saturation * w
    dl += adj.brightness * w
  }

  // 一次套用所有累計調整
  h = wrapHue(h + dh)
  s = Math.max(0, Math.min(100, s + ds))
  l = Math.max(0, Math.min(100, l + dl))

  return hslToRgb(h, s, l)
}
