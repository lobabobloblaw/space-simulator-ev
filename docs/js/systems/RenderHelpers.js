// Render helpers for safe context state management and spaces

export function withScreen(ctx, fn) {
  ctx.save();
  try {
    if (ctx.setTransform) ctx.setTransform(1, 0, 0, 1, 0, 0);
    fn();
  } finally {
    ctx.restore();
  }
}

export function withWorld(ctx, camera, screenCenter, fn, shakeX = 0, shakeY = 0) {
  ctx.save();
  try {
    const tx = screenCenter.x - camera.x + shakeX;
    const ty = screenCenter.y - camera.y + shakeY;
    ctx.translate(tx, ty);
    fn();
  } finally {
    ctx.restore();
  }
}

