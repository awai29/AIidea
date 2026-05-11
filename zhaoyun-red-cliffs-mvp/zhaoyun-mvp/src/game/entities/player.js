import { CONFIG } from '../config.js';

export function updatePlayer(state, { isDown }) {
  const p = state.player;

  // ── 死亡狀態（唯一完全停止的情況）
  if (p.state === 'death') {
    p.deathTimer--;
    if (p.deathTimer <= 0) state.mode = 'gameover';
    return;
  }

  // ── Timer 倒數（永遠執行）
  if (p.attackTimer > 0) {
    p.attackTimer--;
    if (p.attackTimer === 0 && p.state === 'attack') p.state = 'idle';
  }
  if (p.hurtTimer > 0) {
    p.hurtTimer--;
    if (p.hurtTimer === 0 && p.state === 'hurt') p.state = 'idle';
  }
  if (p.attackCooldown > 0) p.attackCooldown--;

  // ── 輸入處理（attack / hurt 期間跳過）
  const canInput = p.state !== 'attack' && p.state !== 'hurt';

  if (canInput) {
    // 攻擊
    if (isDown('KeyZ') && p.attackCooldown === 0) {
      p.state = 'attack';
      p.attackTimer = CONFIG.PLAYER_ATTACK_DURATION;
      p.attackCooldown = CONFIG.PLAYER_ATTACK_COOLDOWN;
      p.vx = 0;
    }
    // 跳躍（只有 KeyX，ArrowUp 是走位鍵）
    else if (isDown('KeyX') && p.onGround) {
      p.jumpVy = CONFIG.JUMP_FORCE;
    }
  }

  // 水平移動（attack/hurt 時 vx = 0）
  if (canInput && p.state !== 'attack') {
    if (isDown('ArrowLeft'))       { p.vx = -CONFIG.PLAYER_SPEED; p.facing = -1; }
    else if (isDown('ArrowRight')) { p.vx =  CONFIG.PLAYER_SPEED; p.facing =  1; }
    else                            { p.vx = 0; }
  } else if (!canInput) {
    p.vx = 0;
  }

  // Belt-scroll Y 走位（只在地面；與跳躍物理完全獨立）
  if (canInput && p.onGround) {
    if (isDown('ArrowDown')) {
      p.beltY = Math.min(CONFIG.GROUND_Y, p.beltY + CONFIG.PLAYER_SPEED_Y);
    }
    if (isDown('ArrowUp')) {
      p.beltY = Math.max(CONFIG.GROUND_Y - CONFIG.BELT_Y_RANGE, p.beltY - CONFIG.PLAYER_SPEED_Y);
    }
  }

  // ── 物理（永遠執行，包含 attack / hurt 狀態）
  p.x += p.vx;

  // 跳躍物理
  if (p.jumpVy > 0 || p.jumpHeight > 0) {
    p.jumpVy -= CONFIG.GRAVITY;
    p.jumpHeight = Math.max(0, p.jumpHeight + p.jumpVy);
  }
  p.onGround = p.jumpHeight === 0;
  if (p.onGround) p.jumpVy = 0;

  // 渲染 Y = belt Y - 跳躍高度
  p.y = p.beltY - p.jumpHeight;

  // 邊界限制
  p.x = Math.max(state.camera.x + p.width / 2, p.x);
  p.x = Math.min(CONFIG.LEVEL_WIDTH - p.width / 2, p.x);

  // 清場鎖區右邊界
  const seg = state.level.segments[state.level.currentSegment];
  if (seg && seg.status === 'active' && state.camera.locked) {
    p.x = Math.min(seg.lockX - p.width / 2, p.x);
  }

  // ── 狀態更新（attack/hurt 由 timer 管理）
  if (p.state !== 'attack' && p.state !== 'hurt') {
    if (!p.onGround) p.state = 'jump';
    else if (p.vx !== 0) p.state = 'walk';
    else p.state = 'idle';
  }
}

// 玩家受傷（由 combat.js 呼叫）
export function hurtPlayer(player, damage, attackerX) {
  if (player.hurtTimer > 0 || player.state === 'death') return;

  player.hp = Math.max(0, player.hp - damage);
  if (player.hp === 0) {
    player.state = 'death';
    player.deathTimer = 60;
    return;
  }

  const dir = attackerX < player.x ? 1 : -1;
  player.x += dir * CONFIG.PLAYER_KNOCKBACK;
  player.state = 'hurt';
  player.hurtTimer = CONFIG.PLAYER_HURT_DURATION;
  player.vx = 0;
}
