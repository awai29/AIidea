import { CONFIG } from './config.js';
import { spawnHitParticles } from './particles.js';
import { hitboxOverlapsEntity } from './collision.js';
import { hurtPlayer } from './entities/player.js';

export function updateCombat(state) {
  const p = state.player;

  // ── 玩家攻擊框
  // 攻擊動作前 30% 為蓄力，後 70% 才判定命中
  const attackActive = p.state === 'attack'
    && p.attackTimer < CONFIG.PLAYER_ATTACK_DURATION * 0.7;

  if (attackActive) {
    const hbX = p.facing === 1
      ? p.x + p.width / 2
      : p.x - p.width / 2 - CONFIG.PLAYER_ATTACK_RANGE;
    const hb = {
      owner: 'player',
      x: hbX,
      y: p.y - p.height * 0.85,
      width: CONFIG.PLAYER_ATTACK_RANGE,
      height: p.height * 0.75,
    };
    state.hitboxes.push(hb);

    state.enemies.forEach((enemy) => {
      if (enemy.state === 'death' || enemy.hitThisAttack) return;
      if (hitboxOverlapsEntity(hb, enemy)) {
        hurtEnemy(enemy, CONFIG.PLAYER_ATTACK_DAMAGE, p.x, state);
        enemy.hitThisAttack = true;
      }
    });
  } else {
    // 攻擊結束，清除命中旗標
    state.enemies.forEach(e => { e.hitThisAttack = false; });
  }

  // ── 敵人攻擊框
  state.enemies.forEach((enemy) => {
    if (enemy.state !== 'attack' || enemy.hitPlayerThisAttack) return;
    const dur = enemy.type === 'spearman'
      ? CONFIG.SPEARMAN_ATTACK_DURATION : CONFIG.SWORDSMAN_ATTACK_DURATION;
    if (enemy.attackTimer >= dur * 0.6) return; // 蓄力中

    const range = enemy.type === 'spearman'
      ? CONFIG.SPEARMAN_ATTACK_RANGE : CONFIG.SWORDSMAN_ATTACK_RANGE;
    const hbX = enemy.facing === 1
      ? enemy.x + enemy.width / 2
      : enemy.x - enemy.width / 2 - range;
    const ehb = {
      owner: 'enemy',
      x: hbX,
      y: enemy.y - enemy.height * 0.85,
      width: range,
      height: enemy.height * 0.75,
    };
    state.hitboxes.push(ehb);

    if (hitboxOverlapsEntity(ehb, p)) {
      const dmg = enemy.type === 'spearman'
        ? CONFIG.SPEARMAN_ATTACK_DAMAGE : CONFIG.SWORDSMAN_ATTACK_DAMAGE;
      hurtPlayer(p, dmg, enemy.x);
      enemy.hitPlayerThisAttack = true;
      state.screenShake = { intensity: 10, timer: 12 };
    }
  });
}

function hurtEnemy(enemy, damage, attackerX, state) {
  if (enemy.hurtTimer > 0 || enemy.state === 'death') return;

  enemy.hp = Math.max(0, enemy.hp - damage);

  // 打擊特效
  const isDeath = enemy.hp === 0;
  const hitX = (enemy.x + attackerX) / 2;
  const hitY = enemy.y - enemy.height * 0.5;
  spawnHitParticles(state, hitX, hitY, isDeath ? '#ff6644' : '#ffee44');
  state.screenShake = { intensity: 5, timer: 8 };
  state.hitFreeze = 2;

  if (isDeath) {
    enemy.state = 'death';
    return;
  }

  const kb = enemy.type === 'spearman'
    ? CONFIG.SPEARMAN_KNOCKBACK : CONFIG.SWORDSMAN_KNOCKBACK;
  enemy.x += attackerX < enemy.x ? kb : -kb;
  enemy.state = 'hurt';
  enemy.hurtTimer = enemy.type === 'spearman'
    ? CONFIG.SPEARMAN_HURT_DURATION : CONFIG.SWORDSMAN_HURT_DURATION;
}
