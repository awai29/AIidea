import { describe, it, expect } from 'vitest'
import { applyColorBalance } from './colorBalance'
import { defaultColorBalanceParams } from '../types'

describe('applyColorBalance', () => {
  it('全部為 0 時，輸入等於輸出', () => {
    const params = defaultColorBalanceParams()
    expect(applyColorBalance(128, 64, 32, params)).toEqual([128, 64, 32])
  })

  it('中間調紅色 +100：偏紅', () => {
    const params = defaultColorBalanceParams()
    params.midtones.cyanRed = 100
    const [r, g, b] = applyColorBalance(128, 128, 128, params)
    // 紅色增加，藍綠應減少或持平
    expect(r).toBeGreaterThan(128)
    expect(g).toBeLessThanOrEqual(128)
    expect(b).toBeLessThanOrEqual(128)
  })

  it('亮部藍色 +100：亮部像素偏藍', () => {
    const params = defaultColorBalanceParams()
    params.highlights.yellowBlue = 100
    const [r, g, b] = applyColorBalance(230, 230, 230, params) // 亮部
    expect(b).toBeGreaterThan(g)
    expect(b).toBeGreaterThan(r)
  })

  it('陰影區域不受亮部調整影響', () => {
    const params = defaultColorBalanceParams()
    params.highlights.cyanRed = 100
    const [r, g, b] = applyColorBalance(10, 10, 10, params) // 深陰影
    // 陰影幾乎不受亮部調整影響
    expect(Math.abs(r - 10)).toBeLessThan(10)
    expect(Math.abs(g - 10)).toBeLessThan(10)
    expect(Math.abs(b - 10)).toBeLessThan(10)
  })

  it('輸出值必須在 0-255 範圍內', () => {
    const params = defaultColorBalanceParams()
    params.midtones.cyanRed = 100
    params.midtones.magentaGreen = 100
    params.midtones.yellowBlue = 100
    const [r, g, b] = applyColorBalance(128, 128, 128, params)
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(255)
    expect(g).toBeGreaterThanOrEqual(0)
    expect(g).toBeLessThanOrEqual(255)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThanOrEqual(255)
  })
})
