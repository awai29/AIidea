import { describe, it, expect } from 'vitest'
import { applyHslWithChannels } from './hsl'
import { defaultHslParams } from '../types'

// 輔助：建立只調整 all-channel 的 params
function makeParams(hue = 0, saturation = 0, brightness = 0) {
  const p = defaultHslParams()
  p.all.hue = hue
  p.all.saturation = saturation
  p.all.brightness = brightness
  return p
}

describe('applyHslWithChannels', () => {
  it('不調整時，輸入等於輸出', () => {
    expect(applyHslWithChannels(255, 0, 0, makeParams())).toEqual([255, 0, 0])
    expect(applyHslWithChannels(128, 64, 32, makeParams())).toEqual([128, 64, 32])
  })

  it('色相偏移 180 度：紅色變青色', () => {
    const [r, g, b] = applyHslWithChannels(255, 0, 0, makeParams(180))
    // 純紅色 hue=0，偏移 180 後 hue=180（青色），RGB 應為 [0, 255, 255]
    expect(r).toBeCloseTo(0, 0)
    expect(g).toBeCloseTo(255, 0)
    expect(b).toBeCloseTo(255, 0)
  })

  it('飽和度 -100：任何顏色變灰階', () => {
    const [r, g, b] = applyHslWithChannels(255, 0, 0, makeParams(0, -100))
    // 去飽和後 R=G=B
    expect(r).toBe(g)
    expect(g).toBe(b)
  })

  it('亮度 +100：任何顏色趨近白色', () => {
    const [r, g, b] = applyHslWithChannels(128, 64, 32, makeParams(0, 0, 100))
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })

  it('亮度 -100：任何顏色趨近黑色', () => {
    const [r, g, b] = applyHslWithChannels(128, 64, 32, makeParams(0, 0, -100))
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  it('白色（255,255,255）無論如何調整色相都保持中性', () => {
    const [r, g, b] = applyHslWithChannels(255, 255, 255, makeParams(90))
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })

  it('per-channel：只調整紅色的飽和度，純綠色不受影響', () => {
    const p = defaultHslParams()
    p.red.saturation = -100  // 只降紅色飽和度
    const [r, g, b] = applyHslWithChannels(0, 255, 0, p)  // 純綠色
    // 綠色（hue=120）離紅色（0°）超過 45°，應不受影響
    expect(g).toBeGreaterThan(200)  // 綠色通道維持高值
    expect(Math.abs(r - g)).toBeGreaterThan(100)  // 仍有色彩，非灰階
  })
})
