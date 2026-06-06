// LUT 計算核心：整合四個工具，產生 33³ × 4（RGBA） 的 Uint8Array
// 供 WebGL 3D Texture 使用

import { applyHslWithChannels } from './hsl'
import { applyColorBalance } from './colorBalance'
import { applyLevels } from './levels'
import { buildCurveLut } from './curves'
import type { AdjustmentParams } from '../types'

const LUT_SIZE = 17; // 17×17×17 個格點（速度比 33³ 快 7 倍，WebGL 插值補齊品質）

export class LutEngine {
  // 快取：相同參數直接回傳，省去重算（最多 30 組，超過淘汰最舊）
  private cache = new Map<string, Uint8Array>()

  /**
   * 計算完整的 17³ 3D LUT
   * 輸出格式：Uint8Array，每個格點 4 bytes（RGBA），Alpha 固定 255
   * 格點順序：for bi for gi for ri（RI 為最快軸）
   */
  compute(params: AdjustmentParams): Uint8Array {
    const key = JSON.stringify(params)
    const hit = this.cache.get(key)
    if (hit) return hit
    const { hsl, colorBalance, levels, curves } = params;
    const size = LUT_SIZE;
    const data = new Uint8Array(size * size * size * 4);

    // 預先建立曲線映射表（4 個色版各 256 entry）
    const curveLutRgb = buildCurveLut(curves.rgb.points);
    const curveLutR = buildCurveLut(curves.r.points);
    const curveLutG = buildCurveLut(curves.g.points);
    const curveLutB = buildCurveLut(curves.b.points);

    const identityCh = { inBlack: 0, gamma: 1, inWhite: 255, outBlack: 0, outWhite: 255 };

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          // 格點對應的 RGB 值（0-255）
          const r = Math.round((ri / (size - 1)) * 255);
          const g = Math.round((gi / (size - 1)) * 255);
          const b = Math.round((bi / (size - 1)) * 255);

          // 1. 套用色相/飽和度/亮度（含 per-channel 色系調整）
          let [nr, ng, nb] = applyHslWithChannels(r, g, b, hsl);

          // 2. 套用色彩平衡
          ;[nr, ng, nb] = applyColorBalance(nr, ng, nb, colorBalance);

          // 3. 套用色階
          const ch = levels.channel;
          if (ch === 'rgb') {
            nr = applyLevels(nr, levels.rgb);
            ng = applyLevels(ng, levels.rgb);
            nb = applyLevels(nb, levels.rgb);
          } else {
            nr = applyLevels(nr, ch === 'r' ? levels.r : identityCh);
            ng = applyLevels(ng, ch === 'g' ? levels.g : identityCh);
            nb = applyLevels(nb, ch === 'b' ? levels.b : identityCh);
          }

          // 4. 套用曲線（先 RGB 整體，再各色版獨立）
          nr = curveLutR[curveLutRgb[nr]];
          ng = curveLutG[curveLutRgb[ng]];
          nb = curveLutB[curveLutRgb[nb]];

          const idx = (bi * size * size + gi * size + ri) * 4;
          data[idx + 0] = nr;
          data[idx + 1] = ng;
          data[idx + 2] = nb;
          data[idx + 3] = 255;
        }
      }
    }

    if (this.cache.size >= 30) this.cache.delete(this.cache.keys().next().value!)
    this.cache.set(key, data)
    return data;
  }
}
