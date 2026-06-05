// LUT 計算核心：整合三個工具，產生 33³ × 4（RGBA） 的 Uint8Array
// 供 WebGL 3D Texture 使用

import { applyHsl } from './hsl'
import { applyColorBalance } from './colorBalance'
import { applyLevels } from './levels'
import type { AdjustmentParams } from '../types'

const LUT_SIZE = 33; // 33×33×33 個格點

export class LutEngine {
  /**
   * 計算完整的 33³ 3D LUT
   * 輸出格式：Uint8Array，每個格點 4 bytes（RGBA），Alpha 固定 255
   * 格點順序：for bi for gi for ri（RI 為最快軸）
   */
  compute(params: AdjustmentParams): Uint8Array {
    const { hsl, colorBalance, levels } = params;
    const size = LUT_SIZE;
    const data = new Uint8Array(size * size * size * 4);

    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          // 格點對應的 RGB 值（0-255）
          const r = Math.round((ri / (size - 1)) * 255);
          const g = Math.round((gi / (size - 1)) * 255);
          const b = Math.round((bi / (size - 1)) * 255);

          // 1. 套用色相/飽和度/亮度
          let [nr, ng, nb] = applyHsl(r, g, b, hsl.hue, hsl.saturation, hsl.brightness);

          // 2. 套用色彩平衡
          ;[nr, ng, nb] = applyColorBalance(nr, ng, nb, colorBalance);

          // 3. 套用色階（依 channel 選擇對哪個色版做全域 or 個別調整）
          // rgb 模式：同一參數套用到全部通道
          // r/g/b 模式：只對選取通道套用，其他通道用 identity（不改變）
          const ch = levels.channel;
          const identityCh = { inBlack: 0, gamma: 1, inWhite: 255, outBlack: 0, outWhite: 255 };

          if (ch === 'rgb') {
            nr = applyLevels(nr, levels.rgb);
            ng = applyLevels(ng, levels.rgb);
            nb = applyLevels(nb, levels.rgb);
          } else {
            nr = applyLevels(nr, ch === 'r' ? levels.r : identityCh);
            ng = applyLevels(ng, ch === 'g' ? levels.g : identityCh);
            nb = applyLevels(nb, ch === 'b' ? levels.b : identityCh);
          }

          const idx = (bi * size * size + gi * size + ri) * 4;
          data[idx + 0] = nr;
          data[idx + 1] = ng;
          data[idx + 2] = nb;
          data[idx + 3] = 255; // Alpha
        }
      }
    }

    return data;
  }
}
