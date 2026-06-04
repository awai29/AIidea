// 色相/飽和度 參數
export interface HslParams {
  hue: number;        // -180 ~ +180
  saturation: number; // -100 ~ +100
  brightness: number; // -100 ~ +100
}

// 色彩平衡單一色調區段（陰影/中間調/亮部）
export interface ColorBalanceTone {
  cyanRed: number;       // -100 ~ +100
  magentaGreen: number;  // -100 ~ +100
  yellowBlue: number;    // -100 ~ +100
}

// 色彩平衡 參數
export interface ColorBalanceParams {
  shadows: ColorBalanceTone;
  midtones: ColorBalanceTone;
  highlights: ColorBalanceTone;
  preserveLuminosity: boolean;
}

// 色階單一色版 參數
export interface LevelsChannelParams {
  inBlack: number;  // 0 ~ 253
  gamma: number;    // 0.10 ~ 9.99
  inWhite: number;  // 2 ~ 255
  outBlack: number; // 0 ~ 253
  outWhite: number; // 2 ~ 255
}

// 色階 參數
export interface LevelsParams {
  channel: 'rgb' | 'r' | 'g' | 'b';
  rgb: LevelsChannelParams;
  r: LevelsChannelParams;
  g: LevelsChannelParams;
  b: LevelsChannelParams;
}

// 全部工具的調整參數
export interface AdjustmentParams {
  hsl: HslParams;
  colorBalance: ColorBalanceParams;
  levels: LevelsParams;
}

// Plugin → UI 的訊息
export type PluginToUIMessage =
  | { type: 'image'; bytes: Uint8Array; width: number; height: number }
  | { type: 'error'; message: string };

// UI → Plugin 的訊息
export type UIToPluginMessage =
  | { type: 'apply'; bytes: Uint8Array; width: number; height: number }
  | { type: 'ready' };

// 預設值工廠
export function defaultHslParams(): HslParams {
  return { hue: 0, saturation: 0, brightness: 0 };
}

export function defaultColorBalanceTone(): ColorBalanceTone {
  return { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
}

export function defaultColorBalanceParams(): ColorBalanceParams {
  return {
    shadows: defaultColorBalanceTone(),
    midtones: defaultColorBalanceTone(),
    highlights: defaultColorBalanceTone(),
    preserveLuminosity: true,
  };
}

export function defaultLevelsChannel(): LevelsChannelParams {
  return { inBlack: 0, gamma: 1.0, inWhite: 255, outBlack: 0, outWhite: 255 };
}

export function defaultLevelsParams(): LevelsParams {
  return {
    channel: 'rgb',
    rgb: defaultLevelsChannel(),
    r: defaultLevelsChannel(),
    g: defaultLevelsChannel(),
    b: defaultLevelsChannel(),
  };
}

export function defaultAdjustmentParams(): AdjustmentParams {
  return {
    hsl: defaultHslParams(),
    colorBalance: defaultColorBalanceParams(),
    levels: defaultLevelsParams(),
  };
}
