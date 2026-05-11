import { CONFIG } from './config.js';
import { getFrame, calcFrameIndex, isLoaded } from './assets.js';

// 角色 key 對應表
const CHARACTER_KEY = {
  player:    'zhaoyun',
  swordsman: 'wei-swordsman',
  spearman:  'wei-spearman',
};

/**
 * 以 sprite 繪製 entity；若 sprite 未載入則 fallback 到色塊。
 * screenX：角色中心 X（canvas 座標）
 * screenY：角色腳底 Y（canvas 座標）
 */
function drawSprite(ctx, charKey, action, screenX, screenY, dispW, dispH, facing, fallbackColor) {
  if (isLoaded(charKey)) {
    const frameIdx = calcFrameIndex(charKey, action);
    const frame = getFrame(charKey, action, frameIdx);
    if (frame) {
      const dx = screenX - dispW / 2;
      const dy = screenY - dispH;
      ctx.save();
      if (facing === -1) {
        ctx.translate(screenX, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h,
                      -dispW / 2, dy, dispW, dispH);
      } else {
        ctx.drawImage(frame.img, frame.x, frame.y, frame.w, frame.h,
                      dx, dy, dispW, dispH);
      }
      ctx.restore();
      return;
    }
  }
  // Fallback：色塊
  ctx.fillStyle = fallbackColor;
  ctx.fillRect(screenX - dispW / 2, screenY - dispH, dispW, dispH);
}

function getPlayerAction(player) {
  if (player.state === 'death')  return 'death';
  if (player.state === 'hurt')   return 'hurt';
  if (player.state === 'attack') return 'attack';
  if (Math.abs(player.vx) > 0.1) return 'walk';
  return 'idle';
}

function getEnemyAction(enemy) {
  if (enemy.state === 'death')    return 'death';
  if (enemy.state === 'hurt')     return 'hurt';
  if (enemy.state === 'attack')   return 'attack';
  if (enemy.state === 'approach') return 'walk';
  return 'idle';
}

// 視差背景：三國赤壁風格，4 層捲動
function drawBackground(ctx, camX) {
  const W = CONFIG.CANVAS_WIDTH;
  const H = CONFIG.CANVAS_HEIGHT;
  const G = CONFIG.GROUND_Y;

  // ── 層 0：天空漸層（固定不動）
  const skyGrad = ctx.createLinearGradient(0, 0, 0, G);
  skyGrad.addColorStop(0,   '#0d1b2a');
  skyGrad.addColorStop(0.5, '#1a1a3e');
  skyGrad.addColorStop(1,   '#3d1a0a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, G);

  // ── 層 1：遠山輪廓（視差 0.05×）
  const p1 = ((camX * 0.05) % W + W) % W;
  ctx.fillStyle = '#1e1428';
  for (let rx = -W; rx < W * 2; rx += 280) {
    const mx = rx - p1;
    ctx.beginPath();
    ctx.moveTo(mx,       G - 10);
    ctx.lineTo(mx + 50,  G - 90);
    ctx.lineTo(mx + 130, G - 60);
    ctx.lineTo(mx + 200, G - 110);
    ctx.lineTo(mx + 280, G - 20);
    ctx.lineTo(mx + 280, G);
    ctx.lineTo(mx,       G);
    ctx.closePath();
    ctx.fill();
  }

  // ── 層 2：中景（帳篷 + 旗幟，視差 0.25×）
  const p2 = ((camX * 0.25) % W + W) % W;
  ctx.fillStyle = '#2a1810';
  for (let rx = -W; rx < W * 2; rx += 160) {
    const mx = rx - p2;
    // 帳篷三角
    ctx.beginPath();
    ctx.moveTo(mx,       G - 5);
    ctx.lineTo(mx + 30,  G - 55);
    ctx.lineTo(mx + 60,  G - 5);
    ctx.closePath();
    ctx.fill();
    // 旗杆
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(mx + 105, G - 70, 5, 70);
    // 旗幟（小三角）
    ctx.fillStyle = '#8b1a1a';
    ctx.beginPath();
    ctx.moveTo(mx + 110, G - 70);
    ctx.lineTo(mx + 130, G - 60);
    ctx.lineTo(mx + 110, G - 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a1810';
  }

  // ── 層 3：地面（棕色，固定）
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(0, G, W, H - G);

  // 地面縱向紋路（視差 0.6×）
  const p3 = ((camX * 0.6) % 80 + 80) % 80;
  ctx.fillStyle = '#4a3028';
  for (let rx = -80; rx < W + 80; rx += 80) {
    ctx.fillRect(rx - p3, G, 3, H - G);
  }
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  const cam = state.camera.x;

  drawBackground(ctx, cam);

  // 鎖區提示線
  if (state.mode === 'running') {
    state.level.segments.forEach((seg) => {
      if (seg.status !== 'active') return;
      const lockX = seg.lockX - cam;
      if (lockX > 0 && lockX < CONFIG.CANVAS_WIDTH) {
        ctx.fillStyle = 'rgba(255,50,50,0.4)';
        ctx.fillRect(lockX - 4, 0, 8, CONFIG.CANVAS_HEIGHT);
        ctx.fillStyle = '#ff4444';
        ctx.font = '13px monospace';
        ctx.fillText('清場解鎖', lockX - 38, 28);
      }
    });
  }

  // 敵人
  state.enemies.forEach((e) => {
    if (e.state === 'death' && e.deathTimer <= 0) return;
    const ex = e.x - cam;
    const ey = e.y - e.height;
    ctx.globalAlpha = e.state === 'death' ? 0.4 : 1;
    const enemyFallback = e.state === 'hurt' ? '#ff9999'
      : e.type === 'swordsman' ? '#cc3333' : '#cc6600';
    drawSprite(
      ctx,
      CHARACTER_KEY[e.type],
      getEnemyAction(e),
      ex,
      e.y,
      e.width,
      e.height,
      e.facing,
      enemyFallback,
    );
    ctx.globalAlpha = 1;

    // 血條
    const maxHp = e.type === 'swordsman' ? CONFIG.SWORDSMAN_HP : CONFIG.SPEARMAN_HP;
    ctx.fillStyle = '#333';
    ctx.fillRect(ex - e.width / 2, ey - 10, e.width, 5);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(ex - e.width / 2, ey - 10, e.width * Math.max(0, e.hp / maxHp), 5);
  });

  // 玩家
  const p = state.player;
  if (!(p.state === 'death' && p.deathTimer <= 0)) {
    const px = p.x - cam;
    const py = p.y - p.height;
    const playerFallback = p.state === 'hurt' ? '#aaaaff'
      : p.state === 'attack' ? '#ffffff' : '#5588ff';
    drawSprite(
      ctx,
      CHARACTER_KEY.player,
      getPlayerAction(p),
      px,
      p.y,
      p.width,
      p.height,
      p.facing,
      playerFallback,
    );

    // 方向三角
    ctx.fillStyle = '#ffdd00';
    ctx.beginPath();
    const tipX = px + p.facing * (p.width / 2 + 8);
    const midY = py + p.height / 2;
    ctx.moveTo(tipX, midY);
    ctx.lineTo(tipX - p.facing * 12, midY - 8);
    ctx.lineTo(tipX - p.facing * 12, midY + 8);
    ctx.fill();

    // 攻擊框（調試可視）
    state.hitboxes.filter(h => h.owner === 'player').forEach(h => {
      ctx.strokeStyle = 'rgba(255,255,100,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(h.x - cam, h.y, h.width, h.height);
    });
  }

  // 玩家血條 HUD
  const pr = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = '#333';
  ctx.fillRect(16, 16, 150, 14);
  ctx.fillStyle = pr > 0.5 ? '#44cc44' : pr > 0.25 ? '#ccaa00' : '#cc2222';
  ctx.fillRect(16, 16, 150 * pr, 14);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, 150, 14);
  ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
  ctx.fillText(`趙雲  ${p.hp} / ${p.maxHp}`, 20, 27);

  // 區段提示
  if (state.mode === 'running') {
    const seg = state.level.segments[state.level.currentSegment];
    if (seg) {
      const alive = state.enemies.filter(e =>
        seg.enemies.includes(e.id) && e.state !== 'death').length;
      ctx.fillStyle = '#ffcc44'; ctx.font = '13px monospace';
      ctx.fillText(`區段 ${state.level.currentSegment + 1} / ${CONFIG.NUM_SEGMENTS}  殘敵：${alive}`, 16, 50);
    }
  }

  // Title
  if (state.mode === 'title') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.fillStyle = '#ffdd88'; ctx.font = 'bold 48px serif'; ctx.textAlign = 'center';
    ctx.fillText('趙雲・赤壁', CONFIG.CANVAS_WIDTH / 2, 180);
    ctx.fillStyle = '#aabbff'; ctx.font = '20px monospace';
    ctx.fillText('按 Z / Space / Enter 開始', CONFIG.CANVAS_WIDTH / 2, 260);
    ctx.fillStyle = '#888'; ctx.font = '13px monospace';
    ctx.fillText('← → 移動  ↑ ↓ 走位  X 跳躍  Z 攻擊  R 重開  F 全螢幕', CONFIG.CANVAS_WIDTH / 2, 310);
    ctx.textAlign = 'left';
  }

  // Victory
  if (state.mode === 'victory') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 52px serif'; ctx.textAlign = 'center';
    ctx.fillText('通關！', CONFIG.CANVAS_WIDTH / 2, 200);
    ctx.fillStyle = '#aaffaa'; ctx.font = '20px monospace';
    ctx.fillText('按 R 重新挑戰', CONFIG.CANVAS_WIDTH / 2, 270);
    ctx.textAlign = 'left';
  }

  // GameOver
  if (state.mode === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 52px serif'; ctx.textAlign = 'center';
    ctx.fillText('陣亡', CONFIG.CANVAS_WIDTH / 2, 200);
    ctx.fillStyle = '#ffaaaa'; ctx.font = '20px monospace';
    ctx.fillText('按 R 再戰', CONFIG.CANVAS_WIDTH / 2, 270);
    ctx.textAlign = 'left';
  }
}
