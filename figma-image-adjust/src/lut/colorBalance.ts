// 色彩平衡演算法
// 參考 GIMP gimpoperationcolorbalance.c 翻譯為 TypeScript
// 原始碼：https://github.com/GNOME/gimp/blob/master/app/operations/gimpoperationcolorbalance.c

import type { ColorBalanceParams } from '../types'

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// 計算像素亮度（0-1，輸入也使用 0-1）
function luminosity(r: number, g: number, b: number): number {
  return clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

// 陰影區域的加權函數（亮度越低，權重越大）
function shadowWeight(lum: number): number {
  return 1 - smoothstep(0, 0.5, lum);
}

// 中間調區域的加權函數（中間亮度，權重最大）
function midtoneWeight(lum: number): number {
  return smoothstep(0, 0.5, lum) * (1 - smoothstep(0.5, 1, lum));
}

// 亮部區域的加權函數（亮度越高，權重越大）
function highlightWeight(lum: number): number {
  return smoothstep(0.5, 1, lum);
}

/**
 * 對單一像素套用色彩平衡調整
 * @param r 0-255
 * @param g 0-255
 * @param b 0-255
 * @param params 色彩平衡參數（陰影/中間調/亮部各三個 slider）
 */
export function applyColorBalance(
  r: number, g: number, b: number,
  params: ColorBalanceParams
): [number, number, number] {
  const rn = clamp01(r / 255);
  const gn = clamp01(g / 255);
  const bn = clamp01(b / 255);

  const lum = luminosity(rn, gn, bn);

  let sw = shadowWeight(lum);
  let mw = midtoneWeight(lum);
  let hw = highlightWeight(lum);

  const weightSum = sw + mw + hw || 1;
  sw /= weightSum;
  mw /= weightSum;
  hw /= weightSum;

  // 計算各色調區段的 RGB 偏移（-100~+100 → 縮放為 0-1 範圍的增量）
  const scale = 1 / 100;

  const dr =
    (params.shadows.cyanRed * sw +
      params.midtones.cyanRed * mw +
      params.highlights.cyanRed * hw) * scale;

  const dg =
    (params.shadows.magentaGreen * sw +
      params.midtones.magentaGreen * mw +
      params.highlights.magentaGreen * hw) * scale;

  const db =
    (params.shadows.yellowBlue * sw +
      params.midtones.yellowBlue * mw +
      params.highlights.yellowBlue * hw) * scale;

  let nr = clamp01(rn + dr);
  let ng = clamp01(gn + dg);
  let nb = clamp01(bn + db);

  // 保留明度：計算原本亮度與調整後亮度的差值，補回各通道
  if (params.preserveLuminosity) {
    const origLumVal = luminosity(rn, gn, bn);
    const newLumVal = luminosity(nr, ng, nb);
    const diff = origLumVal - newLumVal;
    nr = clamp01(nr + diff);
    ng = clamp01(ng + diff);
    nb = clamp01(nb + diff);
  }

  return [
    clampByte(nr),
    clampByte(ng),
    clampByte(nb),
  ];
}
