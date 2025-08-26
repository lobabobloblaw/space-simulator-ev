import { withScreen } from './RenderHelpers.js';
import { shouldUseFlipbook, ringCountFor, sparkCountFor } from './RenderQualityPolicy.js';

// ExplosionRenderer centralizes explosion visuals: rings/shockwaves (world) and flipbook (screen)
export class ExplosionRenderer {
  constructor() {}

  render(ctx, state, camera, screenCenter, quality, showParticles) {
    const explosions = state.explosions || [];
    const viewLeft = camera.x - screenCenter.x - 150;
    const viewTop = camera.y - screenCenter.y - 150;
    const viewRight = camera.x + screenCenter.x + 150;
    const viewBottom = camera.y + screenCenter.y + 150;

    for (let exp of explosions) {
      // Frustum cull explosions outside viewport with margin
      if (
        exp.x + exp.maxRadius < viewLeft ||
        exp.x - exp.maxRadius > viewRight ||
        exp.y + exp.maxRadius < viewTop ||
        exp.y - exp.maxRadius > viewBottom
      ) {
        continue;
      }
      const progress = exp.lifetime / exp.maxLifetime;
      const radius = exp.radius + (exp.maxRadius - exp.radius) * progress;
      const isTiny = (exp.maxRadius || 0) <= 20; // asteroid/impact pops

      // Initial core flash (world space)
      if (progress < 0.12) {
        const flashAlpha = (1 - progress / 0.12) * 0.9;
        const fg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, Math.max(10, radius * 0.6));
        fg.addColorStop(0, `rgba(255,255,255,${flashAlpha})`);
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, Math.max(12, radius * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      // Optional explosion sprite puff from effects atlas (world space; skip tiny/impacts)
      if (!isTiny && !exp.isImpact) {
        try {
          const effects = state.assets?.atlases?.effects;
          const frm = effects?.frames?.['effects/explosion_0'];
          if (effects?.image && frm) {
            const sw = frm.w, sh = frm.h;
            const scale = Math.max(1.0, (radius * 1.6) / Math.max(sw, sh));
            const dw = sw * scale, dh = sh * scale;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.drawImage(effects.image, frm.x, frm.y, sw, sh, exp.x - dw / 2, exp.y - dh / 2, dw, dh);
            ctx.restore();
          }
        } catch (_) {}
      }

      // Multiple explosion rings (world space, quality aware)
      const ringCount = ringCountFor(quality, isTiny);
      for (let i = 0; i < ringCount; i++) {
        const ringProgress = Math.max(0, progress - i * 0.12);
        const ringRadius = isTiny ? radius * 0.7 : radius * (1 - i * 0.2);
        const alpha = (isTiny ? 0.6 : 1) * (1 - ringProgress) * (1 - i * 0.3);
        if (quality === 'low') {
          ctx.fillStyle = `rgba(255, 140, 40, ${alpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const gradient = ctx.createRadialGradient(exp.x, exp.y, ringRadius * 0.5, exp.x, exp.y, ringRadius);
          gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
          gradient.addColorStop(0.3, `rgba(255, 150, 0, ${alpha * 0.8})`);
          gradient.addColorStop(0.7, `rgba(255, 50, 0, ${alpha * 0.5})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Shockwave outline (world space; skip tiny)
      if (!isTiny && exp.shockwave && progress < 0.5) {
        ctx.save();
        const a = Math.max(0, 1 - progress * 2);
        ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`;
        ctx.lineWidth = Math.max(1.5, Math.min(4, exp.maxRadius * 0.03));
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, radius * 0.9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Sparks (world space) — treat as debris chunks. Keep per-explosion angles stable.
      if (progress < 0.55 && showParticles) {
        const sc = sparkCountFor(quality, isTiny);
        // Lazily initialize stable spark angles + radial multipliers per explosion
        if (!exp.__sparks || exp.__sparks.length !== sc) {
          const arr = new Array(sc);
          for (let i = 0; i < sc; i++) {
            arr[i] = {
              a: Math.random() * Math.PI * 2,        // angle
              m: 0.9 + Math.random() * 0.8           // radial multiplier
            };
          }
          exp.__sparks = arr;
        }
        // Slightly warmer debris color improves visibility against rings
        ctx.fillStyle = `rgba(255, 200, 80, ${Math.max(0, 1 - progress * 2)})`;
        for (let i = 0; i < sc; i++) {
          const s = exp.__sparks[i];
          const dist = radius * 1.6 * progress * s.m;
          const sx = exp.x + Math.cos(s.a) * dist;
          const sy = exp.y + Math.sin(s.a) * dist;
          // Make chunks ~50% smaller (from 2x2 -> 1x1) for a finer debris look
          ctx.fillRect((sx|0), (sy|0), 1, 1);
        }
      }
    }

    // Flipbook overlays (screen space on top)
    const anims = state.explosionAnims || [];
    if (anims.length && shouldUseFlipbook(quality)) {
      const now = performance.now ? performance.now() : Date.now();
      for (const a of anims) {
        if (!a || a.isImpact || !a.frames || !a.frames.length) continue;
        const step = quality === 'low' ? 2 : 1; // defensive; should not hit here if low
        const fpsEff = Math.max(6, Math.floor((a.fps || 24) / step));
        const elapsed = (now - a.start) / 1000;
        const frame = Math.min(a.frames.length - 1, Math.floor(elapsed * fpsEff));
        const alpha = Math.max(0, 1 - frame / a.frames.length);
        const img = a.frames[frame];
        if (!img) continue;
        const sw = img.naturalWidth || img.width || 16;
        const sh = img.naturalHeight || img.height || 16;
        const dw = sw * a.scale, dh = sh * a.scale;
        withScreen(ctx, () => {
          ctx.globalAlpha = alpha;
          const sx = a.x - camera.x + screenCenter.x;
          const sy = a.y - camera.y + screenCenter.y;
          ctx.drawImage(img, sx - dw / 2, sy - dh / 2, dw, dh);
        });
      }
    }
  }
}

export default ExplosionRenderer;
