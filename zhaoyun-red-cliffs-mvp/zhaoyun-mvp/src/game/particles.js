/**
 * 粒子系統
 * spawnHitParticles：在命中點生成粒子
 * updateParticles：每幀更新粒子（在 main.js tick 呼叫）
 */

export function spawnHitParticles(state, x, y, color = '#ffee44') {
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.8;
    const speed = 2.5 + Math.random() * 3;
    const life = 14 + Math.floor(Math.random() * 8);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life,
      maxLife: life,  // 與初始 life 一致，alpha 計算不超過 1
      color,
    });
  }
}

export function updateParticles(state) {
  // 原地壓縮：存活粒子前移，截斷尾部，零陣列分配
  let alive = 0;
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.35;
    p.vx *= 0.92;
    p.life--;
    if (p.life > 0) state.particles[alive++] = p;
  }
  state.particles.length = alive;
}
