import { CONFIG } from '../config.js';
import { applyGroundCollision } from '../collision.js';

export function createSpearman(id, x, y) {
  return {
    id, type: 'spearman', x,
    beltY: y, y, vx: 0,
    width: 36, height: 60,
    hp: CONFIG.SPEARMAN_HP,
    state: 'idle', facing: -1, onGround: true,
    attackTimer: 0, attackCooldown: 0, hurtTimer: 0,
    deathTimer: 45,
    hitThisAttack: false, hitPlayerThisAttack: false,
  };
}

export function updateSpearman(enemy, state) {
  // 死亡狀態：倒數計時後由外層清除
  if (enemy.state === 'death') { enemy.deathTimer--; return; }

  // 受傷硬直：暫停所有行為
  if (enemy.hurtTimer > 0) {
    enemy.hurtTimer--;
    if (enemy.hurtTimer === 0) enemy.state = 'idle';
    return;
  }

  // 攻擊動作進行中：等待動作結束
  if (enemy.attackTimer > 0) {
    enemy.attackTimer--;
    if (enemy.attackTimer === 0) {
      enemy.state = 'idle';
      enemy.hitPlayerThisAttack = false;
    }
    return;
  }

  // 攻擊冷卻倒數
  if (enemy.attackCooldown > 0) enemy.attackCooldown--;

  const p = state.player;
  const dx = p.x - enemy.x;
  const dist = Math.abs(dx);
  enemy.facing = dx > 0 ? 1 : -1;

  // 距離太近時後退，保持長槍的有效距離
  const tooClose = dist < CONFIG.SPEARMAN_APPROACH_RANGE * 0.5;

  if (tooClose) {
    // 後退以維持長槍最佳刺擊距離
    enemy.vx = -enemy.facing * CONFIG.SPEARMAN_SPEED;
    enemy.state = 'approach';
  } else if (dist <= CONFIG.SPEARMAN_APPROACH_RANGE && enemy.attackCooldown === 0) {
    // 進入攻擊範圍且冷卻完畢：執行長槍直刺
    enemy.state = 'attack';
    enemy.attackTimer = CONFIG.SPEARMAN_ATTACK_DURATION;
    enemy.attackCooldown = CONFIG.SPEARMAN_ATTACK_COOLDOWN;
    enemy.vx = 0;
  } else if (dist > CONFIG.SPEARMAN_APPROACH_RANGE) {
    // 超出範圍：向前靠近
    enemy.vx = enemy.facing * CONFIG.SPEARMAN_SPEED;
    enemy.state = 'approach';
  } else {
    // 在範圍內但冷卻中：原地等待
    enemy.vx = 0;
    enemy.state = 'idle';
  }

  enemy.x += enemy.vx;
  enemy.beltY = CONFIG.GROUND_Y;
  applyGroundCollision(enemy);
}
