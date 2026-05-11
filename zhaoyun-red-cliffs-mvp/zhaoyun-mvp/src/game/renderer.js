export function render(ctx, state) {
  ctx.clearRect(0, 0, 800, 450);
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, 800, 450);
  ctx.fillStyle = '#fff';
  ctx.font = '20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', 400, 225);
  ctx.textAlign = 'left';
}
