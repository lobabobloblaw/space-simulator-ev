// ThrusterFXRenderer centralizes sprite-based thruster overlays
// Draws in local ship space (caller has already applied translate/rotate)

export default class ThrusterFXRenderer {
  constructor() {
    this._glowCache = new Map(); // keyed by rounded glowR
  }

  frameIndex(now, quality) {
    // Quality-aware stepping; slower on low
    const stepMs = quality === 'low' ? 130 : quality === 'medium' ? 100 : 80;
    return Math.floor(now / stepMs) % 3;
  }

  draw(ctx, effectsAtlas, quality, opts) {
    const { offsetX, offsetY, baseTarget, outerScaleComp = 1, alignFactor = 0.45, thicknessFactor = 1.0 } = opts;
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
    const dw = sw * scale * jitter, dh = sh * scale * (0.95 + Math.random() * 0.1) * Math.max(0.35, Math.min(1.5, thicknessFactor));
    if (!isFinite(dw) || !isFinite(dh) || dw <= 0 || dh <= 0) return;

    ctx.save();
    const prevComp = ctx.globalCompositeOperation;
    try {
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(offsetX - dw * alignFactor, offsetY);
      // Base pass at computed size
      ctx.drawImage(effectsAtlas.image, frm.x, frm.y, sw, sh, -dw / 2, -dh / 2, dw, dh);
      // Slight bright overlay without scaling the context (preserve pixel art)
      ctx.globalAlpha = 0.7;
      const overlayDw = dw * 1.15;
      const overlayDh = dh * 1.05;
      ctx.drawImage(
        effectsAtlas.image,
        frm.x,
        frm.y,
        sw,
        sh,
        -overlayDw / 2,
        -overlayDh / 2,
        overlayDw,
        overlayDh
      );
      // Cyan core glow (adds distinct look vs vector gradient) — cached by rounded glowR (M17)
      ctx.globalAlpha = 0.5;
      const glowR = Math.max(6, Math.min(24, dw * 0.6));
      const cacheKey = Math.round(glowR);
      let gg = this._glowCache.get(cacheKey);
      if (!gg) {
        gg = ctx.createRadialGradient(0, 0, cacheKey * 0.2, 0, 0, cacheKey);
        gg.addColorStop(0, 'rgba(140,200,255,0.9)');
        gg.addColorStop(1, 'rgba(140,200,255,0)');
        this._glowCache.set(cacheKey, gg);
        if (this._glowCache.size > 32) this._glowCache.delete(this._glowCache.keys().next().value);
      }
      ctx.fillStyle = gg;
      ctx.translate(-dw * 0.1, 0);
      ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
    } finally {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = prevComp;
      ctx.restore();
    }
  }
}
