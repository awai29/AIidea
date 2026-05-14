import { CONFIG } from './config.js';
import { createSwordsman } from './entities/enemy-swordsman.js';
import { createSpearman } from './entities/enemy-spearman.js';

let enemyIdCounter = 0;

// 關卡腳本：4 段（3 推進段 + 1 終點清場段）
// enemies 只定義類型，x 位置在 spawnSegment 內隨機產生
const LEVEL_SCRIPT = [
  { lockXRatio: 0.22, enemies: [
    { type: 'swordsman' },
    { type: 'swordsman' },
  ]},
  { lockXRatio: 0.47, enemies: [
    { type: 'swordsman' },
    { type: 'spearman'  },
  ]},
  { lockXRatio: 0.72, enemies: [
    { type: 'swordsman' },
    { type: 'swordsman' },
    { type: 'spearman'  },
  ]},
  { lockXRatio: 1.0, enemies: [
    { type: 'spearman' },
    { type: 'spearman' },
  ]},
];

// 隨機 beltY：在走位帶範圍內均勻分布
function randomBeltY() {
  const min = CONFIG.GROUND_Y - CONFIG.BELT_Y_RANGE;
  return Math.round(min + Math.random() * CONFIG.BELT_Y_RANGE);
}

// 敵人從畫面左右兩側外部衝入（製造被包圍感）
// 偶數 index 從右側、奇數 index 從左側，加隨機偏移讓出場時間錯開
function spawnSegment(state, segment) {
  if (segment.spawned) return;
  segment.spawned = true;
  const camX = state.camera.x;
  const W    = CONFIG.CANVAS_WIDTH;
  segment.enemyDefs.forEach((def, i) => {
    const id     = ++enemyIdCounter;
    const beltY  = randomBeltY();
    const offset = 60 + Math.floor(Math.random() * 120); // 60~180px 外
    const x      = i % 2 === 0
      ? camX + W + offset   // 右側畫面外
      : camX - offset;      // 左側畫面外
    const enemy = def.type === 'swordsman'
      ? createSwordsman(id, x, beltY)
      : createSpearman(id, x, beltY);
    state.enemies.push(enemy);
    segment.enemies.push(id);
  });
}

export function initLevel(state) {
  enemyIdCounter = 0;
  state.enemies = [];

  state.level.segments = LEVEL_SCRIPT.map((script, index) => ({
    index,
    status: index === 0 ? 'active' : 'locked',
    lockX: script.lockXRatio * CONFIG.LEVEL_WIDTH,
    enemies: [],
    enemyDefs: script.enemies.map(def => ({ type: def.type })),
    spawned: false,
  }));

  spawnSegment(state, state.level.segments[0]);
  state.level.currentSegment = 0;
  state.camera.locked = true;
}

export function updateLevel(state) {
  const seg = state.level.segments[state.level.currentSegment];
  if (!seg || seg.status !== 'active') return;

  // 計算存活數：for 迴圈 + 計數器，避免 filter/find 每幀分配陣列
  // 同時快取到 seg.aliveCount，供 renderer 直接讀取（不用重算）
  let alive = 0;
  for (let i = 0; i < seg.enemies.length; i++) {
    const id = seg.enemies[i];
    for (let j = 0; j < state.enemies.length; j++) {
      if (state.enemies[j].id === id && state.enemies[j].state !== 'death') {
        alive++;
        break;
      }
    }
  }
  seg.aliveCount = alive;

  if (alive > 0) return;

  // 清場完成
  seg.status = 'cleared';
  const nextIndex = state.level.currentSegment + 1;

  if (nextIndex >= CONFIG.NUM_SEGMENTS) {
    state.mode = 'victory';
    return;
  }

  // 解鎖下一段
  const next = state.level.segments[nextIndex];
  next.status = 'active';
  spawnSegment(state, next);
  state.level.currentSegment = nextIndex;
  state.camera.locked = false;
}
