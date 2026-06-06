// Web Worker：在背景執行緒計算 RGB 直方圖，釋放主執行緒
import type { HistogramData } from '../types'

self.onmessage = (e: MessageEvent<Uint8Array>) => {
  const pixels = e.data
  const lum = new Array(256).fill(0)
  const r = new Array(256).fill(0)
  const g = new Array(256).fill(0)
  const b = new Array(256).fill(0)
  for (let i = 0; i < pixels.length; i += 4) {
    r[pixels[i]]++
    g[pixels[i + 1]]++
    b[pixels[i + 2]]++
    const l = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2])
    lum[Math.min(255, l)]++
  }
  self.postMessage({ lum, r, g, b } as HistogramData)
}
