export function getTextState(state) {
  return {
    mode: state.mode,
    frameCount: state.frameCount,
    player: {
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      beltY: Math.round(state.player.beltY),
      jumpHeight: Math.round(state.player.jumpHeight),
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      state: state.player.state,
      facing: state.player.facing,
      onGround: state.player.onGround,
    },
    enemies: state.enemies.map(e => ({
      id: e.id,
      type: e.type,
      x: Math.round(e.x),
      y: Math.round(e.y),
      hp: e.hp,
      state: e.state,
    })),
    level: {
      currentSegment: state.level.currentSegment,
      segments: state.level.segments.map(s => ({
        index: s.index,
        status: s.status,
        enemiesLeft: s.enemies.filter(id => {
          const e = state.enemies.find(e => e.id === id);
          return e && e.state !== 'death';
        }).length,
      })),
    },
    camera: {
      x: Math.round(state.camera.x),
      locked: state.camera.locked,
    },
    particles: state.particles.length,
    screenShake: state.screenShake.timer,
  };
}
