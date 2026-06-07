import { describe, it, expect } from 'vitest'
import { LutEngine } from './LutEngine'
import { defaultAdjustmentParams } from '../types'

describe('LutEngine', () => {
  it('預設參數產生的 LUT：輸入顏色應等於輸出顏色', () => {
    const engine = new LutEngine()
    const lut = engine.compute(defaultAdjustmentParams())

    // LUT 大小：17*17*17*4（RGBA）
    expect(lut.length).toBe(17 * 17 * 17 * 4)

    // 格點 (0,0,0) 的 RGB 應近似為 (0,0,0)
    const idx0 = 0 // ri=0, gi=0, bi=0
    expect(lut[idx0 * 4 + 0]).toBeCloseTo(0, 0)   // R
    expect(lut[idx0 * 4 + 1]).toBeCloseTo(0, 0)   // G
    expect(lut[idx0 * 4 + 2]).toBeCloseTo(0, 0)   // B
    expect(lut[idx0 * 4 + 3]).toBeCloseTo(255, 0) // A

    // 格點 (16,16,16) 的 RGB 應近似為 (255,255,255)
    const idxMax = 16 * 17 * 17 + 16 * 17 + 16
    expect(lut[idxMax * 4 + 0]).toBeCloseTo(255, 0) // R
    expect(lut[idxMax * 4 + 1]).toBeCloseTo(255, 0) // G
    expect(lut[idxMax * 4 + 2]).toBeCloseTo(255, 0) // B
  })

  it('飽和度 -100 的 LUT：輸出應為灰階（R=G=B）', () => {
    const engine = new LutEngine()
    const params = defaultAdjustmentParams()
    params.hsl.all.saturation = -100
    const lut = engine.compute(params)

    // 抽樣檢查幾個非灰色格點
    const idx = (10 * 17 * 17 + 5 * 17 + 12) // ri=12, gi=5, bi=10
    const r = lut[idx * 4 + 0]
    const g = lut[idx * 4 + 1]
    const b = lut[idx * 4 + 2]
    expect(Math.abs(r - g)).toBeLessThan(3)
    expect(Math.abs(g - b)).toBeLessThan(3)
  })

  it('計算時間應在 50ms 內（17³ LUT，含 per-channel HSL 與曲線）', () => {
    const engine = new LutEngine()
    const params = defaultAdjustmentParams()
    params.hsl.all.hue = 45
    params.hsl.all.saturation = 20
    const start = performance.now()
    engine.compute(params)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })
})
