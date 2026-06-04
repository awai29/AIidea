import { describe, it, expect } from 'vitest'
import { applyLevels } from './levels'
import { defaultLevelsChannel } from '../types'

describe('applyLevels', () => {
  it('預設參數：輸入等於輸出', () => {
    const ch = defaultLevelsChannel()
    expect(applyLevels(0, ch)).toBe(0)
    expect(applyLevels(128, ch)).toBe(128)
    expect(applyLevels(255, ch)).toBe(255)
  })

  it('黑點設為 100：100 以下全部變 0', () => {
    const ch = { ...defaultLevelsChannel(), inBlack: 100 }
    expect(applyLevels(0, ch)).toBe(0)
    expect(applyLevels(50, ch)).toBe(0)
    expect(applyLevels(100, ch)).toBe(0)
    expect(applyLevels(101, ch)).toBeGreaterThan(0)
  })

  it('白點設為 200：200 以上全部變 255', () => {
    const ch = { ...defaultLevelsChannel(), inWhite: 200 }
    expect(applyLevels(200, ch)).toBe(255)
    expect(applyLevels(255, ch)).toBe(255)
    expect(applyLevels(199, ch)).toBeLessThan(255)
  })

  it('Gamma 2.0：中間調整體變亮', () => {
    const chDefault = defaultLevelsChannel()
    const chGamma = { ...defaultLevelsChannel(), gamma: 2.0 }
    const defaultMid = applyLevels(128, chDefault)
    const gammaMid = applyLevels(128, chGamma)
    expect(gammaMid).toBeGreaterThan(defaultMid)
  })

  it('輸出黑點設為 50：最暗輸出為 50', () => {
    const ch = { ...defaultLevelsChannel(), outBlack: 50 }
    expect(applyLevels(0, ch)).toBe(50)
  })

  it('輸出白點設為 200：最亮輸出為 200', () => {
    const ch = { ...defaultLevelsChannel(), outWhite: 200 }
    expect(applyLevels(255, ch)).toBe(200)
  })

  it('當 inWhite <= inBlack 時，不會產生 NaN，並回傳邊界值', () => {
    const ch = { ...defaultLevelsChannel(), inBlack: 180, inWhite: 180, outBlack: 12, outWhite: 240 }
    expect(applyLevels(100, ch)).toBe(12)
    expect(applyLevels(220, ch)).toBe(240)
  })

  it('輸出範圍在 0-255 之間', () => {
    const ch = defaultLevelsChannel()
    for (let v = 0; v <= 255; v++) {
      const out = applyLevels(v, ch)
      expect(out).toBeGreaterThanOrEqual(0)
      expect(out).toBeLessThanOrEqual(255)
    }
  })
})
