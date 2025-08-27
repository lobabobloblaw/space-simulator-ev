/**
 * PlanetSpriteRenderer — draws planets from provided sprite images
 * Scaffolding for plug-and-play planet sprites; defaults to graceful fallbacks.
 */
import { getPlanetSpriteFromState } from './AssetSystem.js';

export default class PlanetSpriteRenderer {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this._preloaded = new Set();
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
      return !!(img && (img.complete || img.naturalWidth));
    } catch (_) { return false; }
  }

  prepareAsync(planet) {
    // Hint the loader; getPlanetSpriteFromState lazily creates the image
    try { getPlanetSpriteFromState(this.stateManager.state, planet.name); } catch (_) {}
  }

  renderPlanet(ctx, planet, now) {
    const state = this.stateManager.state;
    const img = getPlanetSpriteFromState(state, planet.name);
    if (img && (img.naturalWidth || img.width)) {
      // Draw at identity — compute dw/dh from planet radius
      const dw = Math.max(2, planet.radius * 2);
      const dh = dw;
      ctx.save();
      // Enable smoothing for non-pixel art planets
      try { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; } catch(_) {}
      ctx.drawImage(img, planet.x - dw/2, planet.y - dh/2, dw, dh);
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

