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
  if (p.attackCooldown > 0)  p.attackCooldown--;
  if (p.dashCooldown > 0)    p.dashCooldown--;
  if (p.dashTimer > 0)       p.dashTimer--;

  // ── 衝刺進行中：維持速度，並處理取消
  if (p.state === 'dash') {
    if (p.dashTimer > 0) {
      p.vx = p.facing * CONFIG.DASH_SPEED;
      // 取消：Z 接攻擊
      if (isDown('KeyZ') && p.attackCooldown === 0) {
        p.dashTimer    = 0;
        p.state        = 'attack';
        p.attackTimer  = CONFIG.PLAYER_ATTACK_DURATION;
        p.attackCooldown = CONFIG.PLAYER_ATTACK_COOLDOWN;
        p.vx           = 0;
      // 取消：X / Space 接跳躍
      } else if ((isDown('KeyX') || isDown('Space')) && p.onGround) {
        p.dashTimer  = 0;
        p.jumpVy     = CONFIG.JUMP_FORCE;
        // state 將在下方由物理結果決定
      }
    } else {
      // 衝刺結束
      p.state = 'idle';
      p.vx    = 0;
    }
  }

  const canInput = p.state !== 'attack' && p.state !== 'hurt' && p.state !== 'dash';
  const previousBeltY = p.beltY;

  if (canInput) {
    // 觸發衝刺（優先於攻擊）
    if (isDown('KeyC') && p.dashCooldown === 0) {
      p.state       = 'dash';
      p.dashTimer   = CONFIG.DASH_DURATION;
      p.dashCooldown = CONFIG.DASH_COOLDOWN;
      p.vx          = p.facing * CONFIG.DASH_SPEED;
    } else if (isDown('KeyZ') && p.attackCooldown === 0) {
      p.state        = 'attack';
      p.attackTimer  = CONFIG.PLAYER_ATTACK_DURATION;
      p.attackCooldown = CONFIG.PLAYER_ATTACK_COOLDOWN;
      p.vx           = 0;
    } else if ((isDown('KeyX') || isDown('Space')) && p.onGround) {
      p.jumpVy = CONFIG.JUMP_FORCE;
    }
  }

  // ── 左右移動（不在衝刺/攻擊/受傷中）
  if (canInput) {
    if (isDown('ArrowLeft')) {
      p.vx = -CONFIG.PLAYER_SPEED;
      p.facing = -1;
    } else if (isDown('ArrowRight')) {
      p.vx = CONFIG.PLAYER_SPEED;
      p.facing = 1;
    } else {
      p.vx = 0;
    }
  } else if (!canInput && p.state !== 'dash') {
    p.vx = 0;
  }

  // ── Belt-scroll 走位（不在衝刺中）
  if (canInput && p.onGround && p.state !== 'dash') {
    if (isDown('ArrowDown')) {
      p.beltY = Math.min(CONFIG.GROUND_Y, p.beltY + CONFIG.PLAYER_SPEED_Y);
    }
    if (isDown('ArrowUp')) {
      p.beltY = Math.max(CONFIG.GROUND_Y - CONFIG.BELT_Y_RANGE, p.beltY - CONFIG.PLAYER_SPEED_Y);
    }
  }

  // ── 物理（永遠執行）
  p.x += p.vx;

  if (p.jumpVy > 0 || p.jumpHeight > 0) {
    p.jumpVy -= CONFIG.GRAVITY;
    p.jumpHeight = Math.max(0, p.jumpHeight + p.jumpVy);
  }
  p.onGround = p.jumpHeight === 0;
  if (p.onGround) p.jumpVy = 0;

  p.y = p.beltY - p.jumpHeight;

  // ── 邊界限制
  p.x = Math.max(state.camera.x + p.width / 2, p.x);
  p.x = Math.min(CONFIG.LEVEL_WIDTH - p.width / 2, p.x);

  const seg = state.level.segments[state.level.currentSegment];
  if (seg && seg.status === 'active' && state.camera.locked) {
    p.x = Math.min(seg.lockX - p.width / 2, p.x);
  }

  // ── 狀態機（attack/hurt/dash 狀態由各自邏輯控制，此處只決定 idle/walk/jump）
  if (p.state !== 'attack' && p.state !== 'hurt' && p.state !== 'dash') {
    const movedOnBelt = p.beltY !== previousBeltY;
    if (!p.onGround) p.state = 'jump';
    else if (p.vx !== 0 || movedOnBelt) p.state = 'walk';
    else p.state = 'idle';
  }
}

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
