import { CONFIG } from './config.js';
import { createSwordsman } from './entities/enemy-swordsman.js';
import { createSpearman } from './entities/enemy-spearman.js';

let enemyIdCounter = 0;

// 關卡腳本：4 段（3 推進段 + 1 終點清場段）
const LEVEL_SCRIPT = [
  // 區段 0：教學 - 2 刀兵
  { lockXRatio: 0.22, enemies: [
    { type: 'swordsman', xRatio: 0.18 },
    { type: 'swordsman', xRatio: 0.20 },
  ]},
  // 區段 1：1 刀兵 + 1 槍兵
  { lockXRatio: 0.47, enemies: [
    { type: 'swordsman', xRatio: 0.42 },
    { type: 'spearman',  xRatio: 0.45 },
  ]},
  // 區段 2：2 刀兵 + 1 槍兵
  { lockXRatio: 0.72, enemies: [
    { type: 'swordsman', xRatio: 0.66 },
    { type: 'swordsman', xRatio: 0.69 },
    { type: 'spearman',  xRatio: 0.71 },
  ]},
  // 終點段：2 槍兵（lockXRatio=1.0，不鎖，清完就通關）
  { lockXRatio: 1.0, enemies: [
    { type: 'spearman', xRatio: 0.88 },
    { type: 'spearman', xRatio: 0.92 },
  ]},
];

function spawnSegment(state, segment) {
  if (segment.spawned) return;
  segment.spawned = true;
  segment.enemyDefs.forEach(def => {
    const id = ++enemyIdCounter;
    const enemy = def.type === 'swordsman'
      ? createSwordsman(id, def.x, CONFIG.GROUND_Y)
      : createSpearman(id, def.x, CONFIG.GROUND_Y);
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
    enemyDefs: script.enemies.map(def => ({
      type: def.type,
      x: Math.round(def.xRatio * CONFIG.LEVEL_WIDTH),
    })),
    spawned: false,
  }));

  spawnSegment(state, state.level.segments[0]);
  state.level.currentSegment = 0;
  state.camera.locked = true;
}

export function updateLevel(state) {
  const seg = state.level.segments[state.level.currentSegment];
  if (!seg || seg.status !== 'active') return;

  // 計算當前段存活敵人（死亡敵人不從陣列移除，只排除）
  const alive = seg.enemies.filter(id => {
    const e = state.enemies.find(e => e.id === id);
    return e && e.state !== 'death';
  }).length;

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
