export function createSwordsman(id, x, y) {
  return { id, type: 'swordsman', x, beltY: y, y, vx: 0,
    width: 36, height: 60, hp: 40, state: 'idle', facing: -1, onGround: true,
    attackTimer: 0, attackCooldown: 0, hurtTimer: 0, deathTimer: 45,
    hitThisAttack: false, hitPlayerThisAttack: false };
}
export function updateSwordsman(enemy, state) {}
