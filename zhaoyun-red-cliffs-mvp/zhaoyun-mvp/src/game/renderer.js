import { CONFIG } from './config.js';
import { getFrame, calcFrameIndex, isLoaded } from './assets.js';

// 場景圖層圖片（有圖用圖，沒圖 fallback 到 Canvas 形狀）
const SCENE_IMGS = {};
[
  'bg-mountains', 'bg-river', 'bg-camp',
  'mid-tent', 'mid-flag-pole', 'mid-bonfire',
  'fg-flag-tall', 'fg-grass', 'fg-rock', 'fg-smoke',
].forEach(key => {
  const img = new Image();
  img.src = `assets/scene/${key}.png`;
  SCENE_IMGS[key] = img;
});

function sceneImg(key) {
  const img = SCENE_IMGS[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

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

// 透視縮放：依 beltY 計算角色縮放比例（0.88× 遠景 ~ 1.12× 近景）
function getPerspectiveScale(beltY) {
  const minY = CONFIG.GROUND_Y - CONFIG.BELT_Y_RANGE; // 260
  const t = Math.max(0, Math.min(1, (beltY - minY) / CONFIG.BELT_Y_RANGE));
  return 0.88 + 0.24 * t;
}

// 取得角色的 beltY（玩家有 beltY 欄位，敵人直接用 y）
function getEntityBeltY(entity) {
  return entity.beltY !== undefined ? entity.beltY : entity.y;
}

// 跳躍陰影：角色跳起時在地板上顯示落點提示
function drawShadow(ctx, screenX, beltY, baseWidth, scale, jumpHeight) {
  if (jumpHeight <= 0) return;
  const fadeT = Math.max(0, 1 - jumpHeight / 80); // jumpHeight 越高，陰影越淡
  ctx.save();
  ctx.globalAlpha = 0.3 * fadeT;
  ctx.fillStyle = '#000';
  const w = baseWidth * scale * 0.7;
  const h = Math.max(3, 8 * scale * fadeT);
  ctx.beginPath();
  ctx.ellipse(screenX, beltY, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx, state, camX) {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    const size = 4 * alpha + 1;
    ctx.fillRect(p.x - camX - size / 2, p.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}

function getPlayerAction(player) {
  if (player.state === 'death')  return 'death';
  if (player.state === 'hurt')   return 'hurt';
  if (player.state === 'attack') return 'attack';
  if (player.state === 'dash')   return 'walk';  // dash 用 walk 動畫（色塊版）
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

// 視差背景：三國赤壁風格，分層系統（遠景/中景/地面）
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

  // ── 層 1：遠景（視差 0.05×）
  const p1offset = ((camX * 0.05) % W + W) % W;

  // 遠山
  const imgMountains = sceneImg('bg-mountains');
  if (imgMountains) {
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(imgMountains, rx - p1offset, G - CONFIG.BELT_Y_RANGE - imgMountains.naturalHeight, W, imgMountains.naturalHeight);
    }
  } else {
    // fallback：Canvas 山脈輪廓
    ctx.fillStyle = '#1e1428';
    for (let rx = -W; rx < W * 2; rx += 280) {
      const mx = rx - p1offset;
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
  }

  // 江面（遠景，底部對齊 beltY 最小值 - 35px）
  const imgRiver = sceneImg('bg-river');
  if (imgRiver) {
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(imgRiver, rx - p1offset, G - CONFIG.BELT_Y_RANGE - 35, W, imgRiver.naturalHeight);
    }
  }

  // 遠處大營（底部對齊 beltY 最小值）
  const imgCamp = sceneImg('bg-camp');
  if (imgCamp) {
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(imgCamp, rx - p1offset, G - CONFIG.BELT_Y_RANGE - imgCamp.naturalHeight, W, imgCamp.naturalHeight);
    }
  }

  // ── 層 2：中景（視差 0.25×）
  const p2offset = ((camX * 0.25) % W + W) % W;

  const imgTent = sceneImg('mid-tent');
  const imgFlag = sceneImg('mid-flag-pole');
  const imgFire = sceneImg('mid-bonfire');

  if (imgTent || imgFlag || imgFire) {
    // 帳篷：間距 240px
    if (imgTent) {
      const sp = 240;
      const tentOff = ((camX * 0.25) % sp + sp) % sp;
      for (let rx = -sp; rx < W + sp * 2; rx += sp) {
        ctx.drawImage(imgTent, rx - tentOff, G - CONFIG.BELT_Y_RANGE - imgTent.naturalHeight + 10, imgTent.naturalWidth, imgTent.naturalHeight);
      }
    }
    // 旗杆：間距 180px，相對於帳篷偏移
    if (imgFlag) {
      const sp = 180;
      const flagOff = ((camX * 0.25) % sp + sp) % sp;
      for (let rx = -sp; rx < W + sp * 2; rx += sp) {
        ctx.drawImage(imgFlag, rx - flagOff + 60, G - CONFIG.BELT_Y_RANGE - imgFlag.naturalHeight + 5, imgFlag.naturalWidth, imgFlag.naturalHeight);
      }
    }
    // 篝火：間距 320px
    if (imgFire) {
      const sp = 320;
      const fireOff = ((camX * 0.25) % sp + sp) % sp;
      for (let rx = -sp; rx < W + sp * 2; rx += sp) {
        ctx.drawImage(imgFire, rx - fireOff + 100, G - CONFIG.BELT_Y_RANGE - imgFire.naturalHeight + 5, imgFire.naturalWidth, imgFire.naturalHeight);
      }
    }
  } else {
    // fallback：Canvas 帳篷 + 旗幟
    ctx.fillStyle = '#2a1810';
    for (let rx = -W; rx < W * 2; rx += 160) {
      const mx = rx - p2offset;
      ctx.beginPath();
      ctx.moveTo(mx,       G - 5);
      ctx.lineTo(mx + 30,  G - 55);
      ctx.lineTo(mx + 60,  G - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1a0e08';
      ctx.fillRect(mx + 105, G - 70, 5, 70);
      ctx.fillStyle = '#8b1a1a';
      ctx.beginPath();
      ctx.moveTo(mx + 110, G - 70);
      ctx.lineTo(mx + 130, G - 60);
      ctx.lineTo(mx + 110, G - 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a1810';
    }
  }

  // ── 層 3：地面（走位帶底色 + 透視橫線）
  ctx.fillStyle = '#5c4033';
  ctx.fillRect(0, G - CONFIG.BELT_Y_RANGE, W, H - G + CONFIG.BELT_Y_RANGE);

  const floorTop = G - CONFIG.BELT_Y_RANGE;
  ctx.strokeStyle = '#4a3028';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let row = 0; row <= 8; row++) {
    const t = row / 8;
    const lineY = floorTop + CONFIG.BELT_Y_RANGE * t * t;
    ctx.beginPath();
    ctx.moveTo(0, lineY);
    ctx.lineTo(W, lineY);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const p3 = ((camX * 0.6) % 80 + 80) % 80;
  ctx.fillStyle = '#4a3028';
  ctx.globalAlpha = 0.4;
  for (let rx = -80; rx < W + 80; rx += 80) {
    ctx.fillRect(rx - p3, G - CONFIG.BELT_Y_RANGE, 2, H - G + CONFIG.BELT_Y_RANGE);
  }
  ctx.globalAlpha = 1;
}

function drawForeground(ctx, camX) {
  const W = CONFIG.CANVAS_WIDTH;
  const G = CONFIG.GROUND_Y;

  // fg-flag-tall：間距 350px，底部超出畫面 (Y=470)，alpha 0.9
  const imgFlagTall = sceneImg('fg-flag-tall');
  if (imgFlagTall) {
    ctx.globalAlpha = 0.9;
    const sp = 350;
    const off = ((camX * 0.85) % sp + sp) % sp;
    for (let rx = -sp; rx < W + sp * 2; rx += sp) {
      ctx.drawImage(imgFlagTall, rx - off, 470 - imgFlagTall.naturalHeight, imgFlagTall.naturalWidth, imgFlagTall.naturalHeight);
    }
    ctx.globalAlpha = 1;
  }

  // fg-grass：間距 200px，底部對齊 Y=385，tile index 決定固定 Y 偏移
  const imgGrass = sceneImg('fg-grass');
  if (imgGrass) {
    const sp = 200;
    const off = ((camX * 0.85) % sp + sp) % sp;
    for (let i = -1; i < Math.ceil(W / sp) + 2; i++) {
      const rx = i * sp - off;
      const yOff = (((i * 37) % 20 + 20) % 20) - 10; // 固定偏移，避免每幀閃動
      ctx.drawImage(imgGrass, rx, G + yOff - imgGrass.naturalHeight, imgGrass.naturalWidth, imgGrass.naturalHeight);
    }
  }

  // fg-rock：間距 280px，底部對齊 Y=382
  const imgRock = sceneImg('fg-rock');
  if (imgRock) {
    const sp = 280;
    const off = ((camX * 0.85) % sp + sp) % sp;
    for (let i = -1; i < Math.ceil(W / sp) + 2; i++) {
      const rx = i * sp - off + 80; // 相對帳篷偏移，避免完全對齊
      ctx.drawImage(imgRock, rx, G - imgRock.naturalHeight + 2, imgRock.naturalWidth, imgRock.naturalHeight);
    }
  }

  // fg-smoke：間距 450px，底部對齊 Y=360，globalAlpha 0.3
  const imgSmoke = sceneImg('fg-smoke');
  if (imgSmoke) {
    ctx.globalAlpha = 0.3;
    const sp = 450;
    const off = ((camX * 0.85) % sp + sp) % sp;
    for (let i = -1; i < Math.ceil(W / sp) + 2; i++) {
      const rx = i * sp - off + 150;
      ctx.drawImage(imgSmoke, rx, 360 - imgSmoke.naturalHeight, imgSmoke.naturalWidth, imgSmoke.naturalHeight);
    }
    ctx.globalAlpha = 1;
  }
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
  const cam = state.camera.x;

  // 螢幕震動偏移（套用到全部遊戲元素，HUD 除外）
  const shakeX = state.screenShake.timer > 0
    ? (Math.random() - 0.5) * state.screenShake.intensity : 0;
  const shakeY = state.screenShake.timer > 0
    ? (Math.random() - 0.5) * state.screenShake.intensity * 0.6 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);

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

  // ── 收集所有角色，依 beltY 排序後繪製（Painter's Algorithm）
  const drawEntities = [];

  state.enemies.forEach((e) => {
    if (e.state === 'death' && e.deathTimer <= 0) return;
    drawEntities.push({ kind: 'enemy', ent: e });
  });

  const p = state.player;
  if (!(p.state === 'death' && p.deathTimer <= 0)) {
    drawEntities.push({ kind: 'player', ent: p });
  }

  // beltY 小（遠景）先畫，beltY 大（近景）後畫，自然產生遮擋
  drawEntities.sort((a, b) => getEntityBeltY(a.ent) - getEntityBeltY(b.ent));

  drawEntities.forEach(({ kind, ent }) => {
    const beltY  = getEntityBeltY(ent);
    const scale  = getPerspectiveScale(beltY);
    const dispW  = ent.width  * scale;
    const dispH  = ent.height * scale;
    const screenX = ent.x - cam;
    const screenY = ent.y;   // y 已含 jumpHeight 偏移

    // 跳躍陰影（在角色本體之前畫，讓陰影在角色底下）
    const jumpH = ent.jumpHeight || 0;
    if (jumpH > 0) {
      drawShadow(ctx, screenX, beltY, ent.width, scale, jumpH);
    }

    if (kind === 'enemy') {
      const e = ent;
      ctx.globalAlpha = e.state === 'death' ? 0.4 : 1;
      const enemyFallback = e.state === 'hurt' ? '#ff9999'
        : e.type === 'swordsman' ? '#cc3333' : '#cc6600';
      drawSprite(ctx, CHARACTER_KEY[e.type], getEnemyAction(e),
        screenX, screenY, dispW, dispH, e.facing, enemyFallback);
      ctx.globalAlpha = 1;

      // 血條（縮放後位置）
      const maxHp = e.type === 'swordsman' ? CONFIG.SWORDSMAN_HP : CONFIG.SPEARMAN_HP;
      const barY = screenY - dispH - 10;
      ctx.fillStyle = '#333';
      ctx.fillRect(screenX - dispW / 2, barY, dispW, 5);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(screenX - dispW / 2, barY, dispW * Math.max(0, e.hp / maxHp), 5);

    } else {
      // 玩家
      const playerFallback = p.state === 'hurt'   ? '#aaaaff'
        : p.state === 'attack' ? '#ffffff'
        : p.state === 'dash'   ? '#88ffff'
        : '#5588ff';
      drawSprite(ctx, CHARACTER_KEY.player, getPlayerAction(p),
        screenX, screenY, dispW, dispH, p.facing, playerFallback);

      // 方向三角
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      const tipX = screenX + p.facing * (dispW / 2 + 8);
      const midY = screenY - dispH / 2;
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
  });

  // 前景（蓋在角色上方，製造縱深感）
  drawForeground(ctx, cam);

  // 繪製命中粒子
  drawParticles(ctx, state, cam);
  ctx.restore();  // 移除震動偏移，確保 HUD 不抖動

  // 受傷紅色 vignette（全畫面邊緣紅光，不跟著震動）
  if (state.hurtFlash > 0) {
    const vW = CONFIG.CANVAS_WIDTH;
    const vH = CONFIG.CANVAS_HEIGHT;
    const alpha = (state.hurtFlash / 20) * 0.55;
    const grad = ctx.createRadialGradient(vW / 2, vH / 2, vH * 0.25, vW / 2, vH / 2, vH * 0.85);
    grad.addColorStop(0, 'rgba(180,0,0,0)');
    grad.addColorStop(1, `rgba(200,0,0,${alpha.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vW, vH);
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

  // 衝刺冷卻 UI（右上角）
  const dashBarW = 100;
  const dashBarX = CONFIG.CANVAS_WIDTH - dashBarW - 16;
  const dashBarY = 16;
  const dashReady = p.dashCooldown === 0 && p.state !== 'dash';
  const dashProgress = p.dashCooldown > 0
    ? 1 - p.dashCooldown / CONFIG.DASH_COOLDOWN
    : 1;

  // 背景
  ctx.fillStyle = '#333';
  ctx.fillRect(dashBarX, dashBarY, dashBarW, 14);

  // 進度條
  if (p.state === 'dash') {
    // 衝刺中：閃爍（依 frameCount 切換）
    ctx.fillStyle = state.frameCount % 6 < 3 ? '#88ffff' : '#44aaaa';
    ctx.fillRect(dashBarX, dashBarY, dashBarW, 14);
  } else {
    ctx.fillStyle = dashReady ? '#ffffaa' : '#668866';
    ctx.fillRect(dashBarX, dashBarY, dashBarW * dashProgress, 14);
  }

  // 外框
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  ctx.strokeRect(dashBarX, dashBarY, dashBarW, 14);

  // 文字
  ctx.fillStyle = dashReady ? '#fff' : '#aaa';
  ctx.font = '11px monospace';
  ctx.fillText('DASH [C]', dashBarX + 4, dashBarY + 11);

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
    const CW = CONFIG.CANVAS_WIDTH;
    const CH = CONFIG.CANVAS_HEIGHT;

    // 半透明深色背板（只蓋文字區域，不遮全畫面）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(CW / 2 - 210, 90, 420, 170);

    // 標題主字：三國・一騎當千
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 46px serif';
    ctx.fillText('三國・一騎當千', CW / 2, 160);
    ctx.shadowBlur = 0;

    // 副標（小字）
    ctx.fillStyle = 'rgba(200, 180, 140, 0.85)';
    ctx.font = '14px serif';
    ctx.fillText('長坂坡之戰', CW / 2, 185);

    // 開始提示
    ctx.fillStyle = '#aabbff';
    ctx.font = '19px monospace';
    ctx.fillText('按 Z / Space / Enter 開始', CW / 2, 228);

    // 按鍵說明（底部小字）
    ctx.fillStyle = 'rgba(160,160,160,0.7)';
    ctx.font = '12px monospace';
    ctx.fillText('← → 移動　↑ ↓ 走位　X 跳　Z 攻　C 衝刺　R 重開', CW / 2, CH - 16);

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
