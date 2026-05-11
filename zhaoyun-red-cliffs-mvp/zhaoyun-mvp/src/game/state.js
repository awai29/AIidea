import { CONFIG } from './config.js';

export function createInitialState() {
  return {
    mode: 'title',
    player: {
      x: 100,
      beltY: CONFIG.GROUND_Y,
      jumpHeight: 0,
      jumpVy: 0,
      y: CONFIG.GROUND_Y,
      vx: 0,
      width: 40,
      height: 64,
      hp: CONFIG.PLAYER_HP,
      maxHp: CONFIG.PLAYER_HP,
      state: 'idle',
      facing: 1,
      onGround: true,
      attackTimer: 0,
      attackCooldown: 0,
      hurtTimer: 0,
      deathTimer: 0,
    },
    enemies: [],
    hitboxes: [],
    level: {
      currentSegment: 0,
      segments: [],
    },
    camera: { x: 0, locked: false },
    frameCount: 0,
  };
}
