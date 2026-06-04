import { describe, it, expect } from 'vitest'
import { applyHsl } from './hsl'

describe('applyHsl', () => {
  it('不調整時，輸入等於輸出', () => {
    expect(applyHsl(255, 0, 0, 0, 0, 0)).toEqual([255, 0, 0])
    expect(applyHsl(128, 64, 32, 0, 0, 0)).toEqual([128, 64, 32])
  })

  it('色相偏移 180 度：紅色變青色', () => {
    const [r, g, b] = applyHsl(255, 0, 0, 180, 0, 0)
    // 純紅色 hue=0，偏移 180 後 hue=180（青色），RGB 應為 [0, 255, 255]
    expect(r).toBeCloseTo(0, 0)
    expect(g).toBeCloseTo(255, 0)
    expect(b).toBeCloseTo(255, 0)
  })

  it('飽和度 -100：任何顏色變灰階', () => {
    const [r, g, b] = applyHsl(255, 0, 0, 0, -100, 0)
    // 去飽和後 R=G=B
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('亮度 +100：任何顏色趨近白色', () => {
    const [r, g, b] = applyHsl(128, 64, 32, 0, 0, 100)
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })

  it('亮度 -100：任何顏色趨近黑色', () => {
    const [r, g, b] = applyHsl(128, 64, 32, 0, 0, -100)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  it('白色（255,255,255）無論如何調整色相都保持中性', () => {
    const [r, g, b] = applyHsl(255, 255, 255, 90, 0, 0)
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })
})
