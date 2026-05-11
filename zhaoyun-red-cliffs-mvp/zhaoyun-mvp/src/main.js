import { CONFIG } from './game/config.js';
import { initInput, isDown } from './game/input.js';
import { createInitialState } from './game/state.js';
import { loadAssets } from './game/assets.js';
import { initLevel, updateLevel } from './game/level.js';
import { updatePlayer } from './game/entities/player.js';
import { updateSwordsman } from './game/entities/enemy-swordsman.js';
import { updateSpearman } from './game/entities/enemy-spearman.js';
import { updateCombat } from './game/combat.js';
import { updateCamera } from './game/camera.js';
import { render } from './game/renderer.js';
import { getTextState } from './game/text-state.js';
import { updateParticles } from './game/particles.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let state = createInitialState();
let lastTime = 0;

function tick() {
  // 更新粒子（永遠執行，不受 hitFreeze 影響）
  updateParticles(state);

  // 螢幕震動衰減（永遠執行）
  if (state.screenShake.timer > 0) {
    state.screenShake.intensity *= 0.8;
    state.screenShake.timer--;
  }

  if (state.mode === 'title') {
    if (isDown('KeyZ') || isDown('Space') || isDown('Enter')) startGame();
    return;
  }
  if (state.mode !== 'running') return;

  // 打擊凍幀：跳過本幀的遊戲邏輯
  if (state.hitFreeze > 0) {
    state.hitFreeze--;
    return;
  }

  updatePlayer(state, { isDown });

  for (const e of state.enemies) {
    if (e.type === 'swordsman') updateSwordsman(e, state);
    else if (e.type === 'spearman') updateSpearman(e, state);
  }

  state.hitboxes = [];
  updateCombat(state);
  updateLevel(state);
  updateCamera(state);
  state.frameCount++;
}

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  const steps = Math.min(Math.round(dt / (1000 / CONFIG.TARGET_FPS)), 2);
  for (let i = 0; i < steps; i++) tick();
  render(ctx, state);
  requestAnimationFrame(gameLoop);
}

function startGame() {
  state = createInitialState();
  state.mode = 'running';
  initLevel(state);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF') {
    if (!document.fullscreenElement) canvas.requestFullscreen();
    else document.exitFullscreen();
  }
  if (e.code === 'KeyR') startGame();
});

window.render_game_to_text = () => JSON.stringify(getTextState(state));
window.advanceTime = (ms) => {
  const frames = Math.round((ms / 1000) * CONFIG.TARGET_FPS);
  for (let i = 0; i < frames; i++) tick();
  render(ctx, state);
};
window.renderNow = () => render(ctx, state);
window.startGame = startGame;

async function init() {
  initInput();
  await loadAssets();
  requestAnimationFrame((ts) => { lastTime = ts; gameLoop(ts); });
}
init();
