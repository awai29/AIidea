import { CONFIG } from '../config.js';
import { applyGroundCollision } from '../collision.js';

// 建立刀兵實體，初始化所有屬性
export function createSwordsman(id, x, y) {
  return {
    id,
    type: 'swordsman',
    x,
    beltY: y,   // 腰帶高度（用於 belt-based 移動系統）
    y,
    vx: 0,
    width: 36,
    height: 60,
    hp: CONFIG.SWORDSMAN_HP,
    state: 'idle',   // 狀態：idle / approach / attack / hurt / death
    facing: -1,      // 面向：1 = 右，-1 = 左
    onGround: true,
    attackTimer: 0,       // 目前攻擊動作剩餘幀數
    attackCooldown: 0,    // 攻擊冷卻剩餘幀數
    hurtTimer: 0,         // 受傷硬直剩餘幀數
    deathTimer: 45,       // 死亡動畫剩餘幀數
    hitThisAttack: false,         // 本次攻擊是否已命中（避免重複判定）
    hitPlayerThisAttack: false,   // 本次攻擊是否已擊中玩家
  };
}

// 每幀更新刀兵邏輯
export function updateSwordsman(enemy, state) {
  // --- 死亡狀態：倒數計時後由外部移除 ---
  if (enemy.state === 'death') {
    enemy.deathTimer--;
    return;
  }

  // --- 受傷硬直：等待恢復 ---
  if (enemy.hurtTimer > 0) {
    enemy.hurtTimer--;
    if (enemy.hurtTimer === 0) enemy.state = 'idle';
    return;
  }

  // --- 攻擊中：等待動作結束 ---
  if (enemy.attackTimer > 0) {
    enemy.attackTimer--;
    if (enemy.attackTimer === 0) {
      enemy.state = 'idle';
      enemy.hitPlayerThisAttack = false;  // 攻擊結束，重置命中旗標
    }
    return;
  }

  // --- 冷卻計時 ---
  if (enemy.attackCooldown > 0) enemy.attackCooldown--;

  // --- 決定與玩家的距離與方向 ---
  const p = state.player;
  const dx = p.x - enemy.x;
  const dist = Math.abs(dx);
  enemy.facing = dx > 0 ? 1 : -1;

  // --- AI 決策：近到可攻擊且冷卻好了 → 出手；否則追擊 ---
  if (dist <= CONFIG.SWORDSMAN_APPROACH_RANGE && enemy.attackCooldown === 0) {
    // 進入攻擊狀態
    enemy.state = 'attack';
    enemy.attackTimer = CONFIG.SWORDSMAN_ATTACK_DURATION;
    enemy.attackCooldown = CONFIG.SWORDSMAN_ATTACK_COOLDOWN;
    enemy.vx = 0;
  } else if (dist > CONFIG.SWORDSMAN_APPROACH_RANGE) {
    // 追擊玩家
    enemy.state = 'approach';
    enemy.vx = enemy.facing * CONFIG.SWORDSMAN_SPEED;
  } else {
    // 已在攻擊範圍內但冷卻未好，原地待機
    enemy.vx = 0;
    enemy.state = 'idle';
  }

  // --- 移動並套用地面碰撞 ---
  enemy.x += enemy.vx;
  enemy.beltY = CONFIG.GROUND_Y;
  applyGroundCollision(enemy);
}
