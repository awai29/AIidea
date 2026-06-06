// 色相/飽和度 單一色版調整量
export interface HslChannelAdjust {
  hue: number;        // -180 ~ +180
  saturation: number; // -100 ~ +100
  brightness: number; // -100 ~ +100
}

// 可選的色版：全部 / 6 個色系
export type HslChannel = 'all' | 'red' | 'yellow' | 'green' | 'cyan' | 'blue' | 'magenta'

// 色相/飽和度 參數（含 per-channel 調整）
export interface HslParams {
  channel: HslChannel;      // UI 目前選取的色版
  all: HslChannelAdjust;    // 影響全部色系
  red: HslChannelAdjust;
  yellow: HslChannelAdjust;
  green: HslChannelAdjust;
  cyan: HslChannelAdjust;
  blue: HslChannelAdjust;
  magenta: HslChannelAdjust;
}

// 曲線控制點 [輸入 0-255, 輸出 0-255]
export type CurvePoint = [number, number]

// 曲線單一色版參數
export interface CurvesChannelParams {
  points: CurvePoint[]; // 至少 2 個，已按 x 排序
}

// 曲線 參數（RGB 整體 + 各色版獨立）
export interface CurvesParams {
  channel: 'rgb' | 'r' | 'g' | 'b'; // UI 目前選取
  rgb: CurvesChannelParams;
  r: CurvesChannelParams;
  g: CurvesChannelParams;
  b: CurvesChannelParams;
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
  curves: CurvesParams;
}

// 直方圖資料（各色版 256 個 bucket）
export interface HistogramData {
  lum: number[];  // 亮度
  r: number[];    // 紅色
  g: number[];    // 綠色
  b: number[];    // 藍色
}

// Plugin → UI 的訊息
export type PluginToUIMessage =
  | { type: 'image'; bytes: Uint8Array; width: number; height: number; nodeId: string }
  | { type: 'error'; message: string };

// UI → Plugin 的訊息
export type UIToPluginMessage =
  | { type: 'apply'; bytes: Uint8Array; width: number; height: number }
  | { type: 'ready' };

// 預設值工廠
function defaultHslChannelAdjust(): HslChannelAdjust {
  return { hue: 0, saturation: 0, brightness: 0 };
}

export function defaultHslParams(): HslParams {
  return {
    channel: 'all',
    all: defaultHslChannelAdjust(),
    red: defaultHslChannelAdjust(),
    yellow: defaultHslChannelAdjust(),
    green: defaultHslChannelAdjust(),
    cyan: defaultHslChannelAdjust(),
    blue: defaultHslChannelAdjust(),
    magenta: defaultHslChannelAdjust(),
  };
}

export function defaultCurvesChannel(): CurvesChannelParams {
  return { points: [[0, 0], [255, 255]] };
}

export function defaultCurvesParams(): CurvesParams {
  return {
    channel: 'rgb',
    rgb: defaultCurvesChannel(),
    r: defaultCurvesChannel(),
    g: defaultCurvesChannel(),
    b: defaultCurvesChannel(),
  };
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
    curves: defaultCurvesParams(),
  };
}
