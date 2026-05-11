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

/**
 * 非同步載入某角色的 spritesheet + atlas.json。
 * 若已載入則直接回傳快取。
 */
export async function loadSprite(character) {
  if (_cache[character]) return _cache[character];

  const base = `assets/sprites/${character}/runtime`;

  const [img, atlas] = await Promise.all([
    _loadImage(`${base}/sheet.png`),
    fetch(`${base}/atlas.json`).then(r => {
      if (!r.ok) throw new Error(`atlas.json not found for ${character}`);
      return r.json();
    }),
  ]);

  _cache[character] = { img, atlas };
  return _cache[character];
}

/**
 * 取得指定角色 / 動作 / 幀 的繪製參數。
 * 回傳 { img, x, y, w, h }，或 null（未載入 / 動作不存在）。
 */
export function getFrame(character, action, frameIndex) {
  const sprite = _cache[character];
  if (!sprite) return null;

  const anim = sprite.atlas.animations[action];
  if (!anim || anim.frames.length === 0) return null;

  const frame = anim.frames[frameIndex % anim.frames.length];
  return { img: sprite.img, ...frame };
}

/**
 * 計算當前應顯示第幾幀（基於系統時間，適合 idle / walk 等 looping 動畫）。
 */
export function calcFrameIndex(character, action) {
  const sprite = _cache[character];
  if (!sprite) return 0;
  const anim = sprite.atlas.animations[action];
  if (!anim || anim.frames.length === 0) return 0;
  const fps = anim.fps || 8;
  return Math.floor(Date.now() / (1000 / fps)) % anim.frames.length;
}

/**
 * 回傳某角色是否已載入完成。
 */
export function isLoaded(character) {
  return Boolean(_cache[character]);
}

function _loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
