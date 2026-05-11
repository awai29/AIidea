export function createSpearman(id, x, y) {
  return { id, type: 'spearman', x, beltY: y, y, vx: 0,
    width: 36, height: 60, hp: 50, state: 'idle', facing: -1, onGround: true,
    attackTimer: 0, attackCooldown: 0, hurtTimer: 0, deathTimer: 45,
    hitThisAttack: false, hitPlayerThisAttack: false };
}
export function updateSpearman(enemy, state) {}
