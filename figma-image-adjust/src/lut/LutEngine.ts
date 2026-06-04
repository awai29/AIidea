// LUT 計算核心：整合三個工具，產生 33³ × 4（RGBA） 的 Uint8Array
// 供 WebGL 3D Texture 使用
//
// 效能策略：所有核心數學（HSL、色彩平衡、色階）直接內聯在熱迴圈中，
// 避免 35,937 × 3 次函式呼叫的 JIT overhead，確保在 <5ms 內完成。
// 各工具的公開 export（applyHsl / applyColorBalance / applyLevels）保持不變，
// LutEngine 為了效能自行維護等效的內聯版本。

import type { AdjustmentParams, LevelsChannelParams } from '../types'

const LUT_SIZE = 33; // 33×33×33 個格點

// identity 色階參數（不改變任何數值），提升到模組層級避免每次循環建立物件
const IDENTITY_LEVELS = { inBlack: 0, gamma: 1, inWhite: 255, outBlack: 0, outWhite: 255 };

// 預先計算每個格點索引對應的 RGB 值（0-255），共 33 個
// 避免在三層循環內重複做 Math.round((i / 32) * 255)
const GRID_VALUES: number[] = new Array(LUT_SIZE);
for (let i = 0; i < LUT_SIZE; i++) {
  GRID_VALUES[i] = Math.round((i / (LUT_SIZE - 1)) * 255);
}

// --- 內聯輔助函式（模組層級，讓 V8 可最佳化） ---

/** 將值限制在 [0, 1] */
function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 將值限制在 [0, 255] 並四捨五入為整數 */
function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** HSL→RGB 輔助：由 p, q, t 計算單一色道 */
function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 0.5) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/** smoothstep：Hermite 插值，用於色彩平衡區域加權 */
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/**
 * 色階調整（內聯版，等效於 applyLevels）
 * 步驟：inBlack/inWhite 映射 → Gamma 校正 → outBlack/outWhite 映射
 */
function inlineLevels(value: number, ch: LevelsChannelParams): number {
  const inBlack  = ch.inBlack  < 0 ? 0 : ch.inBlack  > 255 ? 255 : ch.inBlack;
  const inWhite  = ch.inWhite  < 0 ? 0 : ch.inWhite  > 255 ? 255 : ch.inWhite;
  const outBlack = ch.outBlack < 0 ? 0 : ch.outBlack > 255 ? 255 : ch.outBlack;
  const outWhite = ch.outWhite < 0 ? 0 : ch.outWhite > 255 ? 255 : ch.outWhite;
  const gamma    = ch.gamma > 0 ? ch.gamma : 1;
  const input    = value   < 0 ? 0 : value   > 255 ? 255 : value;

  const inRange = inWhite - inBlack;
  if (inRange <= 0) return Math.round(input <= inBlack ? outBlack : outWhite);

  let v = (input - inBlack) / inRange;
  if (v < 0) v = 0; else if (v > 1) v = 1;
  v = Math.pow(v, 1.0 / gamma);
  const out = v * (outWhite - outBlack) + outBlack;
  return Math.round(out < 0 ? 0 : out > 255 ? 255 : out);
}

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

    // --- 提取所有參數到局部純量變數，減少熱迴圈內的 property lookup ---

    // HSL 參數
    const hue        = Number.isFinite(hsl.hue)        ? hsl.hue        : 0;
    const saturation = Number.isFinite(hsl.saturation) ? hsl.saturation : 0;
    const brightness = Number.isFinite(hsl.brightness) ? hsl.brightness : 0;

    // 色彩平衡參數（縮放至 0-1 範圍，避免在迴圈內反覆除以 100）
    const sc = 1 / 100;
    const sCR = colorBalance.shadows.cyanRed    * sc;
    const sMG = colorBalance.shadows.magentaGreen * sc;
    const sYB = colorBalance.shadows.yellowBlue  * sc;
    const mCR = colorBalance.midtones.cyanRed    * sc;
    const mMG = colorBalance.midtones.magentaGreen * sc;
    const mYB = colorBalance.midtones.yellowBlue  * sc;
    const hCR = colorBalance.highlights.cyanRed    * sc;
    const hMG = colorBalance.highlights.magentaGreen * sc;
    const hYB = colorBalance.highlights.yellowBlue  * sc;
    const preserveLum = colorBalance.preserveLuminosity;

    // 色階參數（根據 channel 模式預先選好各通道）
    const ch = levels.channel;
    const levR = ch === 'rgb' ? levels.rgb : (ch === 'r' ? levels.r : IDENTITY_LEVELS);
    const levG = ch === 'rgb' ? levels.rgb : (ch === 'g' ? levels.g : IDENTITY_LEVELS);
    const levB = ch === 'rgb' ? levels.rgb : (ch === 'b' ? levels.b : IDENTITY_LEVELS);

    // 提前展開色階參數到純量，讓 inlineLevels 呼叫可被 JIT 內聯
    const rInBlack  = levR.inBlack  < 0 ? 0 : levR.inBlack  > 255 ? 255 : levR.inBlack;
    const rInWhite  = levR.inWhite  < 0 ? 0 : levR.inWhite  > 255 ? 255 : levR.inWhite;
    const rOutBlack = levR.outBlack < 0 ? 0 : levR.outBlack > 255 ? 255 : levR.outBlack;
    const rOutWhite = levR.outWhite < 0 ? 0 : levR.outWhite > 255 ? 255 : levR.outWhite;
    const rGamma    = levR.gamma > 0 ? levR.gamma : 1;
    const rInRange  = rInWhite - rInBlack;

    const gInBlack  = levG.inBlack  < 0 ? 0 : levG.inBlack  > 255 ? 255 : levG.inBlack;
    const gInWhite  = levG.inWhite  < 0 ? 0 : levG.inWhite  > 255 ? 255 : levG.inWhite;
    const gOutBlack = levG.outBlack < 0 ? 0 : levG.outBlack > 255 ? 255 : levG.outBlack;
    const gOutWhite = levG.outWhite < 0 ? 0 : levG.outWhite > 255 ? 255 : levG.outWhite;
    const gGamma    = levG.gamma > 0 ? levG.gamma : 1;
    const gInRange  = gInWhite - gInBlack;

    const bInBlack  = levB.inBlack  < 0 ? 0 : levB.inBlack  > 255 ? 255 : levB.inBlack;
    const bInWhite  = levB.inWhite  < 0 ? 0 : levB.inWhite  > 255 ? 255 : levB.inWhite;
    const bOutBlack = levB.outBlack < 0 ? 0 : levB.outBlack > 255 ? 255 : levB.outBlack;
    const bOutWhite = levB.outWhite < 0 ? 0 : levB.outWhite > 255 ? 255 : levB.outWhite;
    const bGamma    = levB.gamma > 0 ? levB.gamma : 1;
    const bInRange  = bInWhite - bInBlack;

    for (let bi = 0; bi < size; bi++) {
      const b0 = GRID_VALUES[bi]; // 格點對應的藍色值（0-255）
      for (let gi = 0; gi < size; gi++) {
        const g0 = GRID_VALUES[gi]; // 格點對應的綠色值（0-255）
        for (let ri = 0; ri < size; ri++) {
          const r0 = GRID_VALUES[ri]; // 格點對應的紅色值（0-255）

          // ── 1. 內聯 HSL 調整 ──────────────────────────────────────
          // RGB [0-255] → 正規化 [0-1]
          const rn = r0 / 255;
          const gn = g0 / 255;
          const bn = b0 / 255;

          // RGB → HSL（最大/最小值不用 Math.max/min，用三元運算子更快）
          const maxC = rn > gn ? (rn > bn ? rn : bn) : (gn > bn ? gn : bn);
          const minC = rn < gn ? (rn < bn ? rn : bn) : (gn < bn ? gn : bn);
          const delta = maxC - minC;
          const l0 = (maxC + minC) * 0.5;
          let h0 = 0, s0 = 0;
          if (delta !== 0) {
            s0 = l0 > 0.5 ? delta / (2 - maxC - minC) : delta / (maxC + minC);
            if (maxC === rn)      h0 = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * (1 / 6);
            else if (maxC === gn) h0 = ((bn - rn) / delta + 2) * (1 / 6);
            else                  h0 = ((rn - gn) / delta + 4) * (1 / 6);
          }

          // 套用 HSL 調整
          const H = (((h0 * 360 + hue) % 360) + 360) % 360;
          let S = (s0 * 100 + saturation) * 0.01;
          S = S < 0 ? 0 : S > 1 ? 1 : S;
          let L = (l0 * 100 + brightness) * 0.01;
          L = L < 0 ? 0 : L > 1 ? 1 : L;

          // HSL → RGB（hue2rgb 展開內聯，避免函式呼叫）
          let nr: number, ng: number, nb: number;
          if (S === 0) {
            nr = ng = nb = L;
          } else {
            const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
            const p = 2 * L - q;
            const hn = H / 360;
            // 內聯 hue2rgb(p, q, hn + 1/3)
            let t = hn + (1 / 3); if (t > 1) t -= 1;
            nr = t < (1/6) ? p+(q-p)*6*t : t < 0.5 ? q : t < (2/3) ? p+(q-p)*(2/3-t)*6 : p;
            // 內聯 hue2rgb(p, q, hn)
            t = hn; if (t < 0) t += 1; if (t > 1) t -= 1;
            ng = t < (1/6) ? p+(q-p)*6*t : t < 0.5 ? q : t < (2/3) ? p+(q-p)*(2/3-t)*6 : p;
            // 內聯 hue2rgb(p, q, hn - 1/3)
            t = hn - (1 / 3); if (t < 0) t += 1;
            nb = t < (1/6) ? p+(q-p)*6*t : t < 0.5 ? q : t < (2/3) ? p+(q-p)*(2/3-t)*6 : p;
          }
          let r1 = nr * 255; r1 = r1 < 0 ? 0 : r1 > 255 ? 255 : Math.round(r1);
          let g1 = ng * 255; g1 = g1 < 0 ? 0 : g1 > 255 ? 255 : Math.round(g1);
          let b1 = nb * 255; b1 = b1 < 0 ? 0 : b1 > 255 ? 255 : Math.round(b1);

          // ── 2. 內聯色彩平衡 ───────────────────────────────────────
          const r1n = r1 / 255;
          const g1n = g1 / 255;
          const b1n = b1 / 255;

          // 計算像素亮度（Rec.709 係數）
          let lum = 0.2126 * r1n + 0.7152 * g1n + 0.0722 * b1n;
          lum = lum < 0 ? 0 : lum > 1 ? 1 : lum;

          // smoothstep 展開內聯
          // ss1 = smoothstep(0, 0.5, lum)
          let _t = lum * 2; _t = _t < 0 ? 0 : _t > 1 ? 1 : _t;
          const ss1 = _t * _t * (3 - 2 * _t);
          // ss2 = smoothstep(0.5, 1, lum)
          _t = (lum - 0.5) * 2; _t = _t < 0 ? 0 : _t > 1 ? 1 : _t;
          const ss2 = _t * _t * (3 - 2 * _t);

          let sw = 1 - ss1;           // shadowWeight
          let mw = ss1 * (1 - ss2);   // midtoneWeight
          let hw = ss2;               // highlightWeight
          const ws = sw + mw + hw || 1;
          sw /= ws; mw /= ws; hw /= ws;

          // 計算各通道偏移並套用
          const dr = sCR * sw + mCR * mw + hCR * hw;
          const dg = sMG * sw + mMG * mw + hMG * hw;
          const db = sYB * sw + mYB * mw + hYB * hw;

          let cr = r1n + dr; cr = cr < 0 ? 0 : cr > 1 ? 1 : cr;
          let cg = g1n + dg; cg = cg < 0 ? 0 : cg > 1 ? 1 : cg;
          let cb = b1n + db; cb = cb < 0 ? 0 : cb > 1 ? 1 : cb;

          // 保留明度
          if (preserveLum) {
            let newLum = 0.2126 * cr + 0.7152 * cg + 0.0722 * cb;
            newLum = newLum < 0 ? 0 : newLum > 1 ? 1 : newLum;
            const diff = lum - newLum;
            cr += diff; cr = cr < 0 ? 0 : cr > 1 ? 1 : cr;
            cg += diff; cg = cg < 0 ? 0 : cg > 1 ? 1 : cg;
            cb += diff; cb = cb < 0 ? 0 : cb > 1 ? 1 : cb;
          }

          r1 = cr * 255; r1 = r1 < 0 ? 0 : r1 > 255 ? 255 : Math.round(r1);
          g1 = cg * 255; g1 = g1 < 0 ? 0 : g1 > 255 ? 255 : Math.round(g1);
          b1 = cb * 255; b1 = b1 < 0 ? 0 : b1 > 255 ? 255 : Math.round(b1);

          // ── 3. 內聯色階調整 ───────────────────────────────────────
          // R 通道
          if (rInRange <= 0) {
            r1 = Math.round(r1 <= rInBlack ? rOutBlack : rOutWhite);
          } else {
            let v = (r1 - rInBlack) / rInRange;
            v = v < 0 ? 0 : v > 1 ? 1 : v;
            v = rGamma === 1 ? v : Math.pow(v, 1 / rGamma);
            const o = v * (rOutWhite - rOutBlack) + rOutBlack;
            r1 = Math.round(o < 0 ? 0 : o > 255 ? 255 : o);
          }
          // G 通道
          if (gInRange <= 0) {
            g1 = Math.round(g1 <= gInBlack ? gOutBlack : gOutWhite);
          } else {
            let v = (g1 - gInBlack) / gInRange;
            v = v < 0 ? 0 : v > 1 ? 1 : v;
            v = gGamma === 1 ? v : Math.pow(v, 1 / gGamma);
            const o = v * (gOutWhite - gOutBlack) + gOutBlack;
            g1 = Math.round(o < 0 ? 0 : o > 255 ? 255 : o);
          }
          // B 通道
          if (bInRange <= 0) {
            b1 = Math.round(b1 <= bInBlack ? bOutBlack : bOutWhite);
          } else {
            let v = (b1 - bInBlack) / bInRange;
            v = v < 0 ? 0 : v > 1 ? 1 : v;
            v = bGamma === 1 ? v : Math.pow(v, 1 / bGamma);
            const o = v * (bOutWhite - bOutBlack) + bOutBlack;
            b1 = Math.round(o < 0 ? 0 : o > 255 ? 255 : o);
          }

          const idx = (bi * size * size + gi * size + ri) * 4;
          data[idx + 0] = r1;
          data[idx + 1] = g1;
          data[idx + 2] = b1;
          data[idx + 3] = 255; // Alpha 固定為不透明
        }
      }
    }

    return data;
  }
}
