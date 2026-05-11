import { CONFIG } from './config.js';

export function updateCamera(state) {
  const p = state.player;
  const cam = state.camera;

  if (!cam.locked) {
    const targetX = p.x - CONFIG.CAMERA_FOLLOW_THRESHOLD;
    if (targetX > cam.x) {
      cam.x = Math.min(targetX, CONFIG.LEVEL_WIDTH - CONFIG.CANVAS_WIDTH);
    }
    cam.x = Math.max(0, cam.x);
  }

  // 偵測是否接近下一段鎖區邊界（CAMERA_LOCK_MARGIN = 200px，避免過早鎖定）
  const seg = state.level.segments[state.level.currentSegment];
  if (seg && seg.status === 'active' && !cam.locked) {
    if (p.x > seg.lockX - CONFIG.CAMERA_LOCK_MARGIN) {
      cam.locked = true;
    }
  }
}
