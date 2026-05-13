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
  const allowLayer = key.startsWith('bg-') || key.startsWith('mid-');
  if (!CONFIG.USE_SCENE_IMAGE_PLACEHOLDERS && !allowLayer) return null;
  const img = SCENE_IMGS[key];
  return (img && img.complete && img.naturalWidth > 0) ? img : null;
}

// 天空漸層快取（只建一次，不用每幀 createLinearGradient）
let _skyGrad = null;

// 受傷 vignette 漸層快取（只建一次，透過 ctx.globalAlpha 控制強度）
let _vignetteGrad = null;

// Title 畫面 UI 的 offscreen canvas（只建一次，避免每幀 shadowBlur GPU 消耗）
let _titleCanvas = null;

function buildTitleCanvas(CW, CH) {
  const oc = document.createElement('canvas');
  oc.width  = CW;
  oc.height = CH;
  const c = oc.getContext('2d');

  // 半透明深色背板
  c.fillStyle = 'rgba(0, 0, 0, 0.55)';
  c.fillRect(CW / 2 - 210, 90, 420, 170);

  // 標題主字（shadowBlur 只在此執行一次）
  c.textAlign = 'center';
  c.shadowColor = '#ff6600';
  c.shadowBlur = 18;
  c.fillStyle = '#ffd700';
  c.font = 'bold 46px serif';
  c.fillText('三國・一騎當千', CW / 2, 160);
  c.shadowBlur = 0;
  c.shadowColor = 'transparent';

  // 副標
  c.fillStyle = 'rgba(200, 180, 140, 0.85)';
  c.font = '14px serif';
  c.fillText('長坂坡之戰', CW / 2, 185);

  // 開始提示
  c.fillStyle = '#aabbff';
  c.font = '19px monospace';
  c.fillText('按 Z / Space / Enter 開始', CW / 2, 228);

  // 按鍵說明（底部小字）
  c.fillStyle = 'rgba(160,160,160,0.7)';
  c.font = '12px monospace';
  c.fillText('← → 移動　↑ ↓ 走位　X 跳　Z 攻　C 衝刺　R 重開', CW / 2, CH - 16);

  return oc;
}

// 角色 key 對應表
const CHARACTER_KEY = {
  player:    'zhaoyun',
  swordsman: 'wei-swordsman',
  spearman:  'wei-spearman',
};

// 渲染排序用的持久陣列（重用，不每幀分配）
const _drawEntities = [];

/**
 * 以 sprite 繪製 entity；若 sprite 未載入則 fallback 到色塊。
 * screenX：角色中心 X（canvas 座標）
 * screenY：角色腳底 Y（canvas 座標）
 */
function drawSprite(ctx, charKey, action, screenX, screenY, dispW, dispH, facing, fallbackColor, frameCount = 0) {
  if (isLoaded(charKey)) {
    const frameIdx = calcFrameIndex(charKey, action, frameCount);
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

function drawFallbackSkyDetails(ctx, W, horizonY) {
  ctx.save();

  // 月亮與暈光
  const moonX = W - 150;
  const moonY = 72;
  const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 55);
  moonGlow.addColorStop(0, 'rgba(255,245,210,0.30)');
  moonGlow.addColorStop(1, 'rgba(255,245,210,0)');
  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f6e7b7';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
  ctx.fill();

  // 固定星點，避免每幀閃動
  ctx.fillStyle = 'rgba(255, 240, 215, 0.75)';
  const stars = [
    [62, 42, 1.8], [115, 78, 1.4], [180, 36, 1.6], [235, 92, 1.2],
    [315, 60, 1.5], [388, 35, 1.2], [452, 82, 1.6], [520, 54, 1.4],
    [605, 88, 1.6], [672, 48, 1.4]
  ];
  for (const [x, y, r] of stars) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 接近地平線的霧層
  const haze = ctx.createLinearGradient(0, horizonY - 120, 0, horizonY);
  haze.addColorStop(0, 'rgba(95, 48, 32, 0)');
  haze.addColorStop(1, 'rgba(95, 48, 32, 0.28)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizonY - 120, W, 120);

  ctx.restore();
}

function drawFallbackRiver(ctx, W, G) {
  const riverY = G - 104;
  const riverH = 26;
  const riverGrad = ctx.createLinearGradient(0, riverY, 0, riverY + riverH);
  riverGrad.addColorStop(0, 'rgba(66, 88, 120, 0.55)');
  riverGrad.addColorStop(0.55, 'rgba(33, 53, 86, 0.88)');
  riverGrad.addColorStop(1, 'rgba(18, 29, 52, 0.95)');
  ctx.fillStyle = riverGrad;
  ctx.fillRect(0, riverY, W, riverH);

  ctx.strokeStyle = 'rgba(168, 193, 220, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = riverY + 5 + i * 4;
    ctx.beginPath();
    ctx.moveTo(40 + i * 8, y);
    ctx.lineTo(W - 40 - i * 12, y + 1);
    ctx.stroke();
  }
}

function drawFallbackCamp(ctx, W, G, offset) {
  ctx.save();
  for (let rx = -260; rx < W + 320; rx += 220) {
    const baseX = rx - offset;
    ctx.fillStyle = 'rgba(46, 24, 16, 0.88)';
    ctx.beginPath();
    ctx.moveTo(baseX, G - 28);
    ctx.lineTo(baseX + 26, G - 74);
    ctx.lineTo(baseX + 58, G - 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(31, 17, 12, 0.92)';
    ctx.fillRect(baseX + 86, G - 92, 8, 64);
    ctx.fillStyle = '#7c1f1e';
    ctx.beginPath();
    ctx.moveTo(baseX + 94, G - 92);
    ctx.lineTo(baseX + 122, G - 80);
    ctx.lineTo(baseX + 94, G - 68);
    ctx.closePath();
    ctx.fill();

    const glow = ctx.createRadialGradient(baseX + 146, G - 22, 3, baseX + 146, G - 22, 24);
    glow.addColorStop(0, 'rgba(255, 196, 108, 0.58)');
    glow.addColorStop(1, 'rgba(255, 196, 108, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(baseX + 146, G - 22, 24, 0, Math.PI * 2);
    ctx.fill();
  }
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

  // ── 層 0：天空漸層（快取為模組變數，只建一次）
  if (!_skyGrad) {
    _skyGrad = ctx.createLinearGradient(0, 0, 0, G);
    _skyGrad.addColorStop(0,   '#0d1b2a');
    _skyGrad.addColorStop(0.5, '#1a1a3e');
    _skyGrad.addColorStop(1,   '#3d1a0a');
  }
  ctx.fillStyle = _skyGrad;
  ctx.fillRect(0, 0, W, G);
  drawFallbackSkyDetails(ctx, W, G - CONFIG.BELT_Y_RANGE);

  // ── 層 1：遠景（視差 0.05×）
  const p1offset = ((camX * 0.05) % W + W) % W;

  // 遠山
  const imgMountains = sceneImg('bg-mountains');
  if (imgMountains) {
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(imgMountains, rx - p1offset, G - CONFIG.BELT_Y_RANGE - imgMountains.naturalHeight, W, imgMountains.naturalHeight);
    }
  } else {
    // fallback：多層山脈輪廓
    ctx.fillStyle = '#171325';
    for (let rx = -W; rx < W * 2; rx += 320) {
      const mx = rx - p1offset * 0.7;
      ctx.beginPath();
      ctx.moveTo(mx,       G - 18);
      ctx.lineTo(mx + 55,  G - 112);
      ctx.lineTo(mx + 118, G - 74);
      ctx.lineTo(mx + 198, G - 135);
      ctx.lineTo(mx + 282, G - 38);
      ctx.lineTo(mx + 320, G - 18);
      ctx.lineTo(mx + 320, G);
      ctx.lineTo(mx,       G);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#241734';
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
  } else {
    drawFallbackRiver(ctx, W, G);
  }

  // 遠處大營（底部對齊 beltY 最小值）
  const imgCamp = sceneImg('bg-camp');
  if (imgCamp) {
    for (let rx = -W; rx < W * 2; rx += W) {
      ctx.drawImage(imgCamp, rx - p1offset, G - CONFIG.BELT_Y_RANGE - imgCamp.naturalHeight, W, imgCamp.naturalHeight);
    }
  } else {
    drawFallbackCamp(ctx, W, G - 10, p1offset);
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
    // fallback：Canvas 帳篷 + 旗幟 + 營火光
    ctx.fillStyle = '#362015';
    for (let rx = -W; rx < W * 2; rx += 160) {
      const mx = rx - p2offset;
      ctx.beginPath();
      ctx.moveTo(mx,       G - 4);
      ctx.lineTo(mx + 28,  G - 52);
      ctx.lineTo(mx + 58,  G - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#1d100b';
      ctx.fillRect(mx + 102, G - 74, 5, 74);
      ctx.fillStyle = '#8b211c';
      ctx.beginPath();
      ctx.moveTo(mx + 107, G - 72);
      ctx.lineTo(mx + 132, G - 60);
      ctx.lineTo(mx + 107, G - 48);
      ctx.closePath();
      ctx.fill();

      const fireGlow = ctx.createRadialGradient(mx + 76, G - 12, 2, mx + 76, G - 12, 18);
      fireGlow.addColorStop(0, 'rgba(255, 204, 120, 0.42)');
      fireGlow.addColorStop(1, 'rgba(255, 204, 120, 0)');
      ctx.fillStyle = fireGlow;
      ctx.beginPath();
      ctx.arc(mx + 76, G - 12, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#362015';
    }
  }

  // ── 層 3：地面（走位帶底色 + 透視橫線）
  const floorGrad = ctx.createLinearGradient(0, G - CONFIG.BELT_Y_RANGE, 0, H);
  floorGrad.addColorStop(0, '#6a4a39');
  floorGrad.addColorStop(0.55, '#5d4032');
  floorGrad.addColorStop(1, '#463127');
  ctx.fillStyle = floorGrad;
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

  // 塵土帶與地面暖色反光
  const dustGrad = ctx.createLinearGradient(0, floorTop + 10, 0, floorTop + 80);
  dustGrad.addColorStop(0, 'rgba(255, 190, 120, 0.10)');
  dustGrad.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(0, floorTop, W, 84);

  ctx.fillStyle = 'rgba(35, 20, 14, 0.22)';
  for (let i = -1; i < 12; i++) {
    const x = i * 86 - (camX * 0.45 % 86);
    ctx.beginPath();
    ctx.ellipse(x + 32, G - 18, 28, 6, -0.12, 0, Math.PI * 2);
    ctx.fill();
  }
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
  } else {
    ctx.globalAlpha = 0.72;
    const sp = 350;
    const off = ((camX * 0.85) % sp + sp) % sp;
    for (let rx = -sp; rx < W + sp * 2; rx += sp) {
      const x = rx - off;
      ctx.fillStyle = '#1e120b';
      ctx.fillRect(x + 14, G - 118, 4, 116);
      ctx.fillStyle = '#8a1f1c';
      ctx.beginPath();
      ctx.moveTo(x + 18, G - 116);
      ctx.lineTo(x + 56, G - 102);
      ctx.lineTo(x + 18, G - 88);
      ctx.closePath();
      ctx.fill();
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
  } else {
    ctx.fillStyle = 'rgba(58, 86, 42, 0.78)';
    for (let i = -1; i < Math.ceil(W / 70) + 2; i++) {
      const x = i * 70 - ((camX * 0.85) % 70 + 70) % 70;
      const y = G - (((i * 17) % 10 + 10) % 10);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y - 16);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x + 16, y - 12);
      ctx.lineTo(x + 22, y);
      ctx.closePath();
      ctx.fill();
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
  } else {
    ctx.fillStyle = 'rgba(88, 72, 66, 0.80)';
    for (let i = -1; i < Math.ceil(W / 240) + 2; i++) {
      const x = i * 240 - (((camX * 0.85) % 240 + 240) % 240) + 92;
      ctx.beginPath();
      ctx.moveTo(x, G - 8);
      ctx.lineTo(x + 18, G - 22);
      ctx.lineTo(x + 36, G - 10);
      ctx.lineTo(x + 28, G + 2);
      ctx.lineTo(x + 8, G + 2);
      ctx.closePath();
      ctx.fill();
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
  } else {
    ctx.globalAlpha = 0.18;
    for (let i = -1; i < 3; i++) {
      const x = i * 260 - (((camX * 0.85) % 260 + 260) % 260) + 180;
      const smoke = ctx.createRadialGradient(x, 330, 10, x, 330, 42);
      smoke.addColorStop(0, 'rgba(190, 190, 190, 0.48)');
      smoke.addColorStop(1, 'rgba(190, 190, 190, 0)');
      ctx.fillStyle = smoke;
      ctx.beginPath();
      ctx.arc(x, 330, 42, 0, Math.PI * 2);
      ctx.fill();
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

  if (state.mode === 'title') {
    drawForeground(ctx, cam);
    ctx.restore();

    const CW = CONFIG.CANVAS_WIDTH;
    const CH = CONFIG.CANVAS_HEIGHT;
    if (!_titleCanvas) _titleCanvas = buildTitleCanvas(CW, CH);
    ctx.drawImage(_titleCanvas, 0, 0);
    return;
  }

  // ── 收集所有角色，依 beltY 排序後繪製（Painter's Algorithm）
  // 使用持久陣列 _drawEntities 避免每幀分配，直接存 entity 物件不包裝
  _drawEntities.length = 0;

  for (const e of state.enemies) {
    if (e.state === 'death' && e.deathTimer <= 0) continue;
    _drawEntities.push(e);
  }

  const p = state.player;
  if (!(p.state === 'death' && p.deathTimer <= 0)) {
    _drawEntities.push(p);
  }

  // beltY 小（遠景）先畫，beltY 大（近景）後畫，自然產生遮擋
  _drawEntities.sort((a, b) => getEntityBeltY(a) - getEntityBeltY(b));

  for (const ent of _drawEntities) {
    const isPlayer = (ent === p);
    const beltY  = getEntityBeltY(ent);
    const scale  = getPerspectiveScale(beltY) * (ent.renderScale || 1);
    const dispW  = ent.width  * scale;
    const dispH  = ent.height * scale;
    const screenX = ent.x - cam;
    const screenY = ent.y;   // y 已含 jumpHeight 偏移

    // 跳躍陰影（在角色本體之前畫，讓陰影在角色底下）
    const jumpH = ent.jumpHeight || 0;
    if (jumpH > 0) {
      drawShadow(ctx, screenX, beltY, ent.width, scale, jumpH);
    }

    if (!isPlayer) {
      const e = ent;
      ctx.globalAlpha = e.state === 'death' ? 0.4 : 1;
      const enemyFallback = e.state === 'hurt' ? '#ff9999'
        : e.type === 'swordsman' ? '#cc3333' : '#cc6600';
      drawSprite(ctx, CHARACTER_KEY[e.type], getEnemyAction(e),
        screenX, screenY, dispW, dispH, e.facing, enemyFallback, state.frameCount);
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
        screenX, screenY, dispW, dispH, p.facing, playerFallback, state.frameCount);

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
      for (const h of state.hitboxes) {
        if (h.owner !== 'player') continue;
        ctx.strokeStyle = 'rgba(255,255,100,0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x - cam, h.y, h.width, h.height);
      }
    }
  }

  // 前景（蓋在角色上方，製造縱深感）
  drawForeground(ctx, cam);

  // 繪製命中粒子
  drawParticles(ctx, state, cam);
  ctx.restore();  // 移除震動偏移，確保 HUD 不抖動

  // 受傷紅色 vignette（全畫面邊緣紅光，不跟著震動）
  if (state.hurtFlash > 0) {
    const vW = CONFIG.CANVAS_WIDTH;
    const vH = CONFIG.CANVAS_HEIGHT;
    // 預建漸層（只建一次），用 globalAlpha 控制強度，避免每幀 createRadialGradient
    if (!_vignetteGrad) {
      _vignetteGrad = ctx.createRadialGradient(vW / 2, vH / 2, vH * 0.25, vW / 2, vH / 2, vH * 0.85);
      _vignetteGrad.addColorStop(0, 'rgba(180,0,0,0)');
      _vignetteGrad.addColorStop(1, 'rgb(200,0,0)');
    }
    ctx.globalAlpha = (state.hurtFlash / 20) * 0.55;
    ctx.fillStyle = _vignetteGrad;
    ctx.fillRect(0, 0, vW, vH);
    ctx.globalAlpha = 1;
  }

  // ── HUD：TMNT 風格角色面板 ─────────────────────────────────
  const pr      = Math.max(0, p.hp / p.maxHp);
  const panelW  = 176;
  const panelH  = 48;
  const panelX  = 8;
  const panelY  = 6;
  const iconSz  = 36;

  // 面板背景 + 外框（黑底 + 藍邊）
  ctx.fillStyle = 'rgba(6, 8, 18, 0.92)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = '#5577cc';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 1, panelY + 1, panelW - 2, panelH - 2);
  ctx.strokeStyle = '#aabbff';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // 角色圖示（藍色方塊 + 趙字）
  ctx.fillStyle = '#1a3a88';
  ctx.fillRect(panelX + 4, panelY + 6, iconSz, iconSz);
  ctx.strokeStyle = '#4477ff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(panelX + 4, panelY + 6, iconSz, iconSz);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px serif';
  ctx.textAlign = 'center';
  ctx.fillText('趙', panelX + 4 + iconSz / 2, panelY + 6 + iconSz / 2 + 6);

  // 名稱
  ctx.textAlign = 'left';
  ctx.fillStyle = '#eeeeff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('趙雲', panelX + iconSz + 10, panelY + 18);

  // HP 數值（右對齊）
  ctx.textAlign = 'right';
  ctx.fillStyle = '#88aaff';
  ctx.font = '10px sans-serif';
  ctx.fillText(`${p.hp}`, panelX + panelW - 5, panelY + 18);

  // HP 條
  const hpBarX = panelX + iconSz + 8;
  const hpBarW = panelX + panelW - hpBarX - 6;
  const hpBarY = panelY + 22;
  const hpBarH = 9;
  const hpColor = pr > 0.5 ? '#2299ff' : pr > 0.25 ? '#ffcc22' : '#ff2222';
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
  ctx.fillStyle = hpColor;
  ctx.fillRect(hpBarX, hpBarY, hpBarW * pr, hpBarH);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(hpBarX, hpBarY, hpBarW * pr, Math.floor(hpBarH * 0.38));
  ctx.strokeStyle = '#334488';
  ctx.lineWidth = 1;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // 波次 / 殘敵
  if (state.mode === 'running') {
    const seg = state.level.segments[state.level.currentSegment];
    if (seg) {
      const alive = seg.aliveCount ?? 0;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffdd44';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(`波次 ${state.level.currentSegment + 1}/${CONFIG.NUM_SEGMENTS}`, hpBarX, panelY + panelH - 5);
      ctx.fillStyle = '#ff8844';
      ctx.fillText(`殘敵 ${alive}`, hpBarX + 58, panelY + panelH - 5);
    }
  }

  // 衝刺冷卻面板（右上）
  const dashPW = 92;
  const dashPH = 28;
  const dashPX = CONFIG.CANVAS_WIDTH - dashPW - 8;
  const dashPY = 6;
  const dashReady    = p.dashCooldown === 0 && p.state !== 'dash';
  const dashProgress = p.dashCooldown > 0 ? 1 - p.dashCooldown / CONFIG.DASH_COOLDOWN : 1;
  ctx.fillStyle = 'rgba(6, 8, 18, 0.92)';
  ctx.fillRect(dashPX, dashPY, dashPW, dashPH);
  ctx.strokeStyle = '#886622';
  ctx.lineWidth = 2;
  ctx.strokeRect(dashPX + 1, dashPY + 1, dashPW - 2, dashPH - 2);
  ctx.strokeStyle = '#ffcc88';
  ctx.lineWidth = 1;
  ctx.strokeRect(dashPX, dashPY, dashPW, dashPH);
  ctx.textAlign = 'left';
  ctx.fillStyle = dashReady ? '#ffee88' : 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText('衝刺 [C]', dashPX + 5, dashPY + 11);
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(dashPX + 4, dashPY + 14, dashPW - 8, 8);
  const dColor = p.state === 'dash'
    ? (state.frameCount % 6 < 3 ? '#88ffff' : '#44aaaa')
    : dashReady ? '#ffcc44' : '#664422';
  ctx.fillStyle = dColor;
  ctx.fillRect(dashPX + 4, dashPY + 14, (dashPW - 8) * dashProgress, 8);
  ctx.strokeStyle = '#886644';
  ctx.lineWidth = 1;
  ctx.strokeRect(dashPX + 4, dashPY + 14, dashPW - 8, 8);

  // ── Combo 計數器（浮在玩家頭上）
  if (state.combo >= 2 && state.comboTimer > 0) {
    const fadeAlpha = Math.min(1, state.comboTimer / 25);
    const cScale    = getPerspectiveScale(p.beltY) * p.renderScale;
    const cDispH    = p.height * cScale;
    const cX        = p.x - cam;
    const cY        = p.y - cDispH - 12;
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.textAlign = 'left';
    ctx.font = 'bold 40px serif';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(`${state.combo}`, cX - 12, cY);
    ctx.fillStyle = '#ffdd00';
    ctx.fillText(`${state.combo}`, cX - 12, cY);
    ctx.font = 'bold 15px serif';
    ctx.lineWidth = 3;
    ctx.strokeText('Hits', cX + 20, cY + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Hits', cX + 20, cY + 2);
    ctx.restore();
  }

  // ── 打擊星形閃光特效
  for (const fl of state.impactFlashes) {
    const t  = fl.timer / fl.maxTimer;  // 1→0
    const sz = (1.8 - t) * 22;          // 展開再縮
    ctx.save();
    ctx.globalAlpha = t * 0.95;
    ctx.translate(fl.x - cam, fl.y);
    ctx.rotate((1 - t) * 0.8);
    ctx.fillStyle = t > 0.5 ? '#ffffff' : '#ffee44';
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const r   = k % 2 === 0 ? sz : sz * 0.38;
      if (k === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else         ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Paused
  if (state.mode === 'paused') {
    const CW = CONFIG.CANVAS_WIDTH;
    const CH = CONFIG.CANVAS_HEIGHT;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CW, CH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px serif';
    ctx.fillText('暫停', CW / 2, CH / 2 - 50);

    ctx.fillStyle = '#aabbff';
    ctx.font = '18px monospace';
    ctx.fillText('按 ESC 繼續', CW / 2, CH / 2);
    ctx.fillStyle = '#aaa';
    ctx.font = '14px monospace';
    ctx.fillText('按 R 重新開始', CW / 2, CH / 2 + 30);
    ctx.textAlign = 'left';
    ctx.restore();
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
