import { CONFIG } from './config.js';

// 敵人地面碰撞（敵人不跳躍，只防穿地）
// entity.beltY 是 belt-scroll 深度位置，entity.y = beltY（敵人無跳躍）
export function applyGroundCollision(entity) {
  if (entity.beltY >= CONFIG.GROUND_Y) {
    entity.beltY = CONFIG.GROUND_Y;
    entity.y = entity.beltY;
    entity.onGround = true;
  }
}

// 攻擊框（左/上/寬/高格式）vs entity（x=中心, y=底部, width, height）重疊判定
export function hitboxOverlapsEntity(hb, entity) {
  const eL = entity.x - entity.width / 2;
  const eR = entity.x + entity.width / 2;
  const eT = entity.y - entity.height;
  const eB = entity.y;
  return hb.x < eR && hb.x + hb.width > eL &&
         hb.y < eB && hb.y + hb.height > eT;
}
