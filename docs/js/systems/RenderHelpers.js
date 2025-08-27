// Render helpers for safe context state management and spaces

export function withScreen(ctx, fn) {
  ctx.save();
  try {
    const dpr = (ctx && ctx.canvas && ctx.canvas.__dpr) ? ctx.canvas.__dpr : 1;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fn();
  } finally {
    ctx.restore();
  }
}

export function withWorld(ctx, camera, screenCenter, fn, shakeX = 0, shakeY = 0) {
  ctx.save();
  try {
    const dpr = (ctx && ctx.canvas && ctx.canvas.__dpr) ? ctx.canvas.__dpr : 1;
    if (ctx.setTransform) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tx = screenCenter.x - camera.x + shakeX;
    const ty = screenCenter.y - camera.y + shakeY;
    ctx.translate(tx, ty);
    fn();
  } finally {
    ctx.restore();
  }
}

// Produce a white/cool-tinted silhouette canvas from a source image/canvas
// - src: HTMLImageElement | HTMLCanvasElement (must be ready)
// - dw, dh: destination dimensions in pixels
// - optional source rect (sx, sy, sw, sh) for sub-frames
export function toWhiteMaskCanvas(src, dw, dh, sx = 0, sy = 0, sw = null, sh = null) {
  const wdw = Math.max(1, Math.ceil(dw));
  const wdh = Math.max(1, Math.ceil(dh));
  const mc = document.createElement('canvas');
  mc.width = wdw; mc.height = wdh;
  const mctx = mc.getContext('2d');
  mctx.imageSmoothingEnabled = false;
  if (sw && sh) {
    mctx.drawImage(src, sx|0, sy|0, sw, sh, 0, 0, wdw, wdh);
  } else {
    mctx.drawImage(src, 0, 0, wdw, wdh);
  }
  mctx.globalCompositeOperation = 'source-in';
  mctx.fillStyle = '#e8f6ff';
  mctx.globalAlpha = 1;
  mctx.fillRect(0, 0, wdw, wdh);
  return mc;
}
