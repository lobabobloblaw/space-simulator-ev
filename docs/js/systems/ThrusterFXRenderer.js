// ThrusterFXRenderer centralizes sprite-based thruster overlays
// Draws in local ship space (caller has already applied translate/rotate)

export default class ThrusterFXRenderer {
  constructor() {}

  frameIndex(now, quality) {
    // Quality-aware stepping; slower on low
    const stepMs = quality === 'low' ? 130 : quality === 'medium' ? 100 : 80;
    return Math.floor(now / stepMs) % 3;
  }

  draw(ctx, effectsAtlas, quality, opts) {
    const { offsetX, offsetY, baseTarget, outerScaleComp = 1, alignFactor = 0.45 } = opts;
    const frames = effectsAtlas?.frames;
    if (!effectsAtlas?.image || !frames || !frames['effects/thruster_0']) {
      // Procedural fallback plume when atlas not available
      const target = Math.max(8, baseTarget) / Math.max(outerScaleComp, 1e-6);
      const L = target;
      ctx.save();
      try {
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(offsetX, offsetY);
        const grad = ctx.createLinearGradient(-L, 0, 0, 0);
        grad.addColorStop(0, 'rgba(120,200,255,0.0)');
        grad.addColorStop(1, 'rgba(120,200,255,0.9)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.lineTo(0, -3);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
      } finally { ctx.restore(); }
      return;
    }
    const idx = this.frameIndex(Date.now(), quality);
    const key = `effects/thruster_${idx}`;
    const frm = frames[key] || frames['effects/thruster_0'];
    const sw = frm.w, sh = frm.h;
    if (!(sw > 0 && sh > 0)) return;

    // Compute pixel target, compensating for any outer vector scaling applied by caller
    const target = Math.max(8, baseTarget) / Math.max(outerScaleComp, 1e-6);
    const denom = Math.max(sw, sh) || 1;
    const scale = target / denom;
    // Subtle length jitter so FX feels alive
    const jitter = (Math.random() * 0.08) + 0.96; // 0.96..1.04
    const dw = sw * scale * jitter, dh = sh * scale * (0.95 + Math.random() * 0.1);
    if (!isFinite(dw) || !isFinite(dh) || dw <= 0 || dh <= 0) return;

    ctx.save();
    const prevComp = ctx.globalCompositeOperation;
    try {
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(offsetX - dw * alignFactor, offsetY);
      // Base
      ctx.drawImage(effectsAtlas.image, frm.x, frm.y, sw, sh, -dw / 2, -dh / 2, dw, dh);
      // Slight bright overlay
      ctx.globalAlpha = 0.7;
      ctx.scale(1.15, 1.05);
      ctx.drawImage(effectsAtlas.image, frm.x, frm.y, sw, sh, -dw / 2, -dh / 2, dw, dh);
      // Cyan core glow (adds distinct look vs vector gradient)
      ctx.globalAlpha = 0.5;
      const glowR = Math.max(6, Math.min(24, dw * 0.6));
      const gg = ctx.createRadialGradient(-dw * 0.1, 0, glowR * 0.2, -dw * 0.1, 0, glowR);
      gg.addColorStop(0, 'rgba(140,200,255,0.9)');
      gg.addColorStop(1, 'rgba(140,200,255,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(-dw * 0.1, 0, glowR, 0, Math.PI * 2); ctx.fill();
    } finally {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    }
  }
}
