/**
 * PlanetSpriteRenderer — draws planets from provided sprite images
 * Scaffolding for plug-and-play planet sprites; defaults to graceful fallbacks.
 */
import { getPlanetSpriteFromState } from './AssetSystem.js';

export default class PlanetSpriteRenderer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this._preloaded = new Set();
    this._decodeReady = new Set(); // planet.name values that finished decode()
    this._scaledCache = new Map(); // name -> { canvas, w, h, forRadius }
  }

  initializePlanets(planets) {
    // Optionally kick off preloads (non-blocking)
    try {
      const state = this.stateManager.state;
      for (const p of planets || []) {
        getPlanetSpriteFromState(state, p.name);
      }
    } catch (_) {}
  }

  isReady(planet) {
    try {
      const state = this.stateManager.state;
      const img = getPlanetSpriteFromState(state, planet.name);
      if (!img) return false;
      // Prefer explicit decode gate to avoid first-draw sync decode hitch
      if (this._decodeReady.has(planet.name)) return true;
      // Fallback: if decode() unsupported, rely on complete+naturalWidth
      return !!(img.complete && (img.naturalWidth || img.width));
    } catch (_) { return false; }
  }

  prepareAsync(planet) {
    // Hint the loader and proactively decode to avoid sync decode during render
    try {
      const img = getPlanetSpriteFromState(this.stateManager.state, planet.name);
      if (!img) return;
      if (this._preloaded.has(planet.name)) return;
      this._preloaded.add(planet.name);
      if (typeof img.decode === 'function') {
        img.decode().then(() => { this._decodeReady.add(planet.name); }).catch(() => {
          // If decode fails, fall back to complete check
          if (img.complete && (img.naturalWidth || img.width)) this._decodeReady.add(planet.name);
        });
      } else {
        // No decode(): poll briefly for readiness (bounded) without blocking
        let tries = 0;
        const t = setInterval(() => {
          tries++;
          if (img.complete && (img.naturalWidth || img.width)) {
            this._decodeReady.add(planet.name);
            clearInterval(t);
          } else if (tries > 20) {
            clearInterval(t);
          }
        }, 60);
      }
    } catch (_) {}
  }

  renderPlanet(ctx, planet, now) {
    const state = this.stateManager.state;
    const img = getPlanetSpriteFromState(state, planet.name);
    if (img && (img.naturalWidth || img.width)) {
      // Downscale once into a cached canvas at target draw size to avoid per-frame resampling cost
      const dw = Math.max(2, planet.radius * 2);
      const dh = dw;
      let entry = this._scaledCache.get(planet.name);
      if (!entry || entry.w !== dw || entry.h !== dh) {
        const c = document.createElement('canvas');
        c.width = dw; c.height = dh;
        const cctx = c.getContext('2d');
        try { cctx.imageSmoothingEnabled = true; cctx.imageSmoothingQuality = 'high'; } catch(_) {}
        cctx.drawImage(img, 0, 0, dw, dh);
        entry = { canvas: c, w: dw, h: dh, forRadius: planet.radius };
        this._scaledCache.set(planet.name, entry);
      }
      ctx.save();
      try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; } catch(_) {}
      ctx.drawImage(entry.canvas, planet.x - dw/2, planet.y - dh/2);
      ctx.restore();
      return;
    }
    // Graceful fallback: soft shaded disc
    ctx.save();
    const r = planet.radius;
    const grad = ctx.createRadialGradient(planet.x - r*0.3, planet.y - r*0.3, r*0.2, planet.x, planet.y, r);
    grad.addColorStop(0, planet.color || '#88aaff');
    grad.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(planet.x, planet.y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}
