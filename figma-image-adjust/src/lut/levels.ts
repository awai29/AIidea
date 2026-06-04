// 色階演算法
// 參考：https://gist.github.com/aferriss/9be46b6350a08148da02559278daa244

import type { LevelsChannelParams } from '../types'

/**
 * 將數值限制在 0-255 範圍內（用於 0-255 像素值）
 * @param value 輸入值
 * @returns 0-255 之間的值
 */
function clampByte(value: number): number {
  // 檢查是否為有效數字（排除 NaN、無限大等）
  if (!Number.isFinite(value)) return 0
  // 將值限制在 0-255 範圍內
  return Math.max(0, Math.min(255, value))
}

/**
 * 對單一像素的單一色版套用色階調整
 *
 * 色階調整的步驟：
 * 1. 根據輸入黑點(inBlack)和白點(inWhite)將像素值映射到 [0, 1]
 * 2. 套用 Gamma 校正（控制中間調明亮度）
 * 3. 根據輸出黑點(outBlack)和白點(outWhite)映射到最終範圍
 *
 * @param value 輸入像素值 (0-255)
 * @param ch 色階參數（黑點/白點/Gamma/輸出黑點/輸出白點）
 * @returns 調整後的像素值 (0-255)
 */
export function applyLevels(value: number, ch: LevelsChannelParams): number {
  // 1. 先將所有輸入值限制在有效範圍內
  const input = clampByte(value)
  const inBlack = clampByte(ch.inBlack)
  const inWhite = clampByte(ch.inWhite)
  const outBlack = clampByte(ch.outBlack)
  const outWhite = clampByte(ch.outWhite)
  // Gamma 必須大於 0，預設為 1（不調整）
  const gamma = Number.isFinite(ch.gamma) && ch.gamma > 0 ? ch.gamma : 1

  // 2. 計算輸入範圍的大小
  const inRange = inWhite - inBlack

  // 3. 邊界情況：如果輸入黑白點相同或黑點 > 白點，直接返回對應的輸出邊界值
  if (inRange <= 0) {
    // 輸入值如果 <= inBlack，輸出黑點；否則輸出白點
    return Math.round(input <= inBlack ? outBlack : outWhite)
  }

  // 4. 將輸入值映射到 [0, 1] 範圍
  let v = (input - inBlack) / inRange
  // 限制在 [0, 1] 之間（可能因為浮點數運算略超出）
  v = Math.max(0, Math.min(1, v))

  // 5. 套用 Gamma 校正
  // Gamma > 1：變暗（因為 1/gamma < 1，所以 v^(1/gamma) > v）
  // Gamma < 1：變亮（因為 1/gamma > 1，所以 v^(1/gamma) < v）
  // Gamma = 1：不變
  v = Math.pow(v, 1.0 / gamma)

  // 6. 將校正後的值映射到輸出範圍 [outBlack, outWhite]
  const output = v * (outWhite - outBlack) + outBlack

  // 7. 檢查結果是否為有效數字（避免 NaN），然後限制在 0-255
  if (!Number.isFinite(output)) return Math.round(outBlack)

  return Math.round(clampByte(output))
}
