/**
 * assets.js — 遊戲端 sprite 載入器
 *
 * 用法：
 *   import { loadSprite, getFrame, isLoaded, calcFrameIndex } from './assets.js';
 *
 *   // 遊戲初始化時
 *   await loadSprite('zhaoyun');
 *
 *   // renderer 中
 *   const frameIdx = calcFrameIndex('zhaoyun', 'idle');
 *   const frame = getFrame('zhaoyun', 'idle', frameIdx);
 *   if (frame) {
 *     ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h,
 *                   dx, dy, dw, dh);
 *   }
 */

// 快取：{ characterKey: { img: HTMLImageElement, atlas: Object } }
const _cache = {};

// 精靈圖版本號：每次重新生成 sprite sheet 後更新此版本，強制瀏覽器清除快取
const SPRITE_VERSION = '20260514-v3';

/**
 * 非同步載入某角色的 spritesheet + atlas.json。
 * 若已載入則直接回傳快取。
 */
export async function loadSprite(character) {
  if (_cache[character]) return _cache[character];

  const base = `assets/sprites/${character}/runtime`;

  const [img, atlas] = await Promise.all([
    _loadImage(`${base}/sheet.png?v=${SPRITE_VERSION}`),
    fetch(`${base}/atlas.json?v=${SPRITE_VERSION}`).then(r => {
      if (!r.ok) throw new Error(`atlas.json not found for ${character}`);
      return r.json();
    }),
  ]);

  // 載入時把 img 寫入每個 frame 物件，getFrame 就不用每次 spread 建新物件
  for (const anim of Object.values(atlas.animations)) {
    for (const frame of anim.frames) {
      frame.img = img;
    }
  }

  _cache[character] = { img, atlas };
  return _cache[character];
}

/**
 * 取得指定角色 / 動作 / 幀 的繪製參數。
 * 直接回傳 frame 物件（img 已在 loadSprite 時寫入），零額外分配。
 */
export function getFrame(character, action, frameIndex) {
  const sprite = _cache[character];
  if (!sprite) return null;

  const anim = sprite.atlas.animations[action];
  if (!anim || anim.frames.length === 0) return null;

  return anim.frames[frameIndex % anim.frames.length];
}

/**
 * 計算當前應顯示第幾幀（基於系統時間，適合 idle / walk 等 looping 動畫）。
 */
export function calcFrameIndex(character, action, frameCount = 0) {
  const sprite = _cache[character];
  if (!sprite) return 0;
  const anim = sprite.atlas.animations[action];
  if (!anim || anim.frames.length === 0) return 0;
  const fps = anim.fps || 8;
  // 用遊戲幀數計算，確保 hitFreeze 凍幀時動畫也暫停
  return Math.floor(frameCount / (60 / fps)) % anim.frames.length;
}

/**
 * 回傳某角色是否已載入完成。
 */
export function isLoaded(character) {
  return Boolean(_cache[character]);
}

/**
 * 預載入所有角色的 sprites（main.js 呼叫）。
 * 使用 Promise.allSettled 確保即使某個 sprite 載入失敗也不中斷遊戲。
 */
export async function loadAssets() {
  const characters = ['zhaoyun', 'wei-swordsman', 'wei-spearman'];
  await Promise.allSettled(characters.map(c => loadSprite(c)));
}

function _loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
