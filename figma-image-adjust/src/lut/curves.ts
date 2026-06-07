// 曲線調整：單調三次樣條插值，建立 256 個輸入→輸出映射表
// 對應 Photoshop 曲線面板的行為
import type { CurvePoint } from '../types'

/**
 * 根據控制點建立 256-entry LUT（Uint8Array）
 * 使用 Fritsch-Carlson 單調三次樣條，確保無震盪
 */
export function buildCurveLut(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256)

  // 按 x 排序，移除重複 x
  const sorted = [...points].sort((a, b) => a[0] - b[0])

  if (sorted.length < 2) {
    // 不足 2 個控制點：identity（不調整）
    for (let i = 0; i < 256; i++) lut[i] = i
    return lut
  }

  const n = sorted.length
  const xs = sorted.map(p => p[0])
  const ys = sorted.map(p => p[1])

  // 相鄰格距
  const h = Array.from({ length: n - 1 }, (_, i) => xs[i + 1] - xs[i])

  // 各區段斜率
  const delta = Array.from({ length: n - 1 }, (_, i) =>
    h[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / h[i]
  )

  // Fritsch-Carlson 切線（確保單調）
  const m = new Array<number>(n).fill(0)
  m[0] = delta[0]
  m[n - 1] = delta[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] === 0 || delta[i] === 0 || (delta[i - 1] > 0) !== (delta[i] > 0)) {
      m[i] = 0
    } else {
      m[i] = (delta[i - 1] + delta[i]) / 2
    }
  }

  // 縮放切線確保嚴格單調
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(delta[i]) < 1e-10) {
      m[i] = 0
      m[i + 1] = 0
    } else {
      const alpha = m[i] / delta[i]
      const beta = m[i + 1] / delta[i]
      const mag = alpha * alpha + beta * beta
      if (mag > 9) {
        const tau = 3 / Math.sqrt(mag)
        m[i] = tau * alpha * delta[i]
        m[i + 1] = tau * beta * delta[i]
      }
    }
  }

  // 對每個輸入值 0-255 評估樣條
  for (let x = 0; x < 256; x++) {
    let y: number

    if (x <= xs[0]) {
      y = ys[0]
    } else if (x >= xs[n - 1]) {
      y = ys[n - 1]
    } else {
      // 找到包含 x 的區段
      let seg = 0
      for (let i = 0; i < n - 1; i++) {
        if (x < xs[i + 1]) { seg = i; break }
      }

      const t = h[seg] === 0 ? 0 : (x - xs[seg]) / h[seg]
      const t2 = t * t
      const t3 = t2 * t

      // Hermite 基底函數
      const h00 = 2 * t3 - 3 * t2 + 1
      const h10 = t3 - 2 * t2 + t
      const h01 = -2 * t3 + 3 * t2
      const h11 = t3 - t2

      y = h00 * ys[seg] + h10 * h[seg] * m[seg] + h01 * ys[seg + 1] + h11 * h[seg] * m[seg + 1]
    }

    lut[x] = Math.max(0, Math.min(255, Math.round(y)))
  }

  return lut
}
