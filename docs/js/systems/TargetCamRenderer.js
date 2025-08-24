import { GameEvents } from '../core/EventBus.js';
import { withScreen, toWhiteMaskCanvas } from './RenderHelpers.js';
import { typeToSpriteId, aliasSpriteForType, spriteRotationOffset, spriteOrientationOverrides as ORIENT_OVERRIDES } from './SpriteMappings.js';
import { getFrameCanvasFromState } from './AssetSystem.js';
import { isImageReady, getStandaloneSpriteIfReady, getAtlasFrameIfReady } from './AssetReadiness.js';

export default class TargetCamRenderer {
  constructor(eventBus, stateManager, canvas) {
    this.eventBus = eventBus;
    this.stateManager = stateManager;
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;

    // FX state (off by default unless window.TC_FX)
    this.staticNoise = { canvas: (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; return c; })(), ctx: null, lastTime: 0, phase: 0 };
    this.staticNoise.ctx = this.staticNoise.canvas.getContext('2d');
    this.targetCamBlip = null;
    this.targetCamTransition = null; // { fromId, toId, start, duration, hold }

    // Orientation
    this.spriteRotationOffset = spriteRotationOffset;
    this.spriteOrientationOverrides = ORIENT_OVERRIDES;

    // Direct image caches
    this.spriteCache = {};
    this._spriteCacheCap = 64;
    this._targetCamSprites = {};

    // Minimal viewport baseline shapes
    this._viewportAtlas = null;

    // Tiny white-mask cache to reduce per-frame allocations
    this._maskCache = new Map(); // key -> canvas
    this._maskOrder = []; // LRU
    this._maskCap = 12;
    this._srcIds = new WeakMap();
    this._nextSrcId = 1;
    // Cached silhouette sizing per target to avoid rebuild churn
    this._silDims = new Map(); // targetId -> { dw, dh }

    // Minimal trace state for optional logging without flooding
    this._trace = { lastKey: null, lastTs: 0 };
    // Deterministic per-target source resolution to prevent mid-frame/path mixing
    this._resolved = { targetId: null, kind: null, src: null, w: 0, h: 0 };
    this._lastPath = null; // for optional on-canvas label
    // Warm-up window before allowing atlas/baseline fallbacks (ms)
    this._fallbackGraceMs = 450;
    this._warmUntil = 0;
    this._lastRenderTs = 0;
    // Redraw policy for silhouette (time/angle gating)
    this._policy = { minIntervalMs: 90, angleEps: 0.12 };
    this._lastDraw = { ts: 0, angle: 0, targetId: null };

    // Strict buffer-blit: persistent offscreen silhouette buffer
    this._buf = { canvas: null, ctx: null, dw: 0, dh: 0, kind: null, spriteKey: null, targetId: null };
    this._buildPending = false;       // collapse bursts during cycling
    this._queuedBuild = null;         // latest requested build params to coalesce
  }

  /*
   * TODO (Session 55 — TargetCam strict buffer-blit)
   * 
   * Goal: Remove residual rAF dips and flicker by decoupling silhouette generation
   * from per-frame rendering. Render loop should only blit a prepared buffer.
   * 
   * Plan:
   * - Add a persistent offscreen buffer: this._silhouetteBuf = { canvas, ctx, dw, dh, kind, spriteKey }.
   * - On allowed updates (target change OR |Δangle| >= ANGLE_EPS OR elapsed >= MIN_MS):
   *   - Resolve source once (direct → preloaded → standalone → atlas → baseline), honoring warm-up.
   *   - Build tinted image into buffer ctx at locked dims (no rotation baked unless PNG +90° is required).
   *   - Never build on heavy frames — if heavy, schedule post-rAF:
   *       requestAnimationFrame(() => setTimeout(() => tryBuildIfLight(), 0));
   *   - Collapse bursts during rapid cycling with a guard flag (e.g., this._buildPending).
   * - In render():
   *   - Always draw ring/wedge each frame.
   *   - Blit the prepared buffer with outer ctx.rotate(npc.angle) only.
   *   - PNG +90° inner rotation can be baked into the buffer at build-time; atlas/baseline use 0 inner.
   *   - If buffer missing, draw baseline once; do not try to build synchronously on heavy frames.
   * - Keep: warm-up guard (TC_WARM_MS), deterministic selection order, orientation rules.
   * - Optional QA toggle: window.TC_BUF_ONLY to force buffer mode while testing.
   * 
   * Acceptance:
   * - No TargetCam-dominated rAF violations while cycling; no silhouette flicker.
   * - Auto path/rotation remain correct across transitions.
   */

  init() {
    // Allow QA to override update policy (angle/time gating)
    this._syncPolicyFromWindow();
    // Subscribe to targeting events
    this.eventBus.on(GameEvents.TARGET_SET, () => {
      const now = performance.now();
      this.targetCamBlip = { start: now, duration: 320 };
      const st = this.stateManager.state;
      const toId = st.targeting?.selectedId || null;
      const fromId = this._lastSilhouetteId || null;
      this.targetCamTransition = { fromId, toId, start: now, duration: 320, hold: 140 };
      // Reset resolved source on target change; will lazily resolve on render
      this._resolved = { targetId: toId, kind: null, src: null, w: 0, h: 0 };
      // Set warm-up deadline for fallbacks; allow runtime override via window.TC_WARM_MS
      try { this._fallbackGraceMs = Math.max(0, Number(window.TC_WARM_MS) || this._fallbackGraceMs); } catch(_) {}
      this._warmUntil = now + this._fallbackGraceMs;
    });
    this.eventBus.on(GameEvents.TARGET_CLEAR, () => { this.targetCamBlip = null; });

    // Prewarm direct PNGs to make auto path prefer correct orientation quickly
    try {
      const ids = ['ships/pirate_0','ships/patrol_0','ships/interceptor_0','ships/freighter_0','ships/trader_0','ships/shuttle_0'];
      ids.forEach(id => { try { this.getOrLoadSprite(id); } catch(_) {} });
    } catch(_) {}

    // Build tag for quick verification after deploys (kept minimal)
    try {
      const tag = new Date().toISOString();
      if (window && !window.TC_SILENT) console.log('[TargetCam] init', { build: tag, warmMs: this._fallbackGraceMs });
    } catch(_) {}
  }

  // Public render entry
  render(state) {
    if (!this.ctx || !this.canvas) return;
    // Apply live QA overrides if present (cheap check)
    this._syncPolicyFromWindow();
    // Throttle TargetCam to ~30Hz to reduce spikes during cycling
    try { const nowTs = performance.now ? performance.now() : Date.now(); if (nowTs - (this._lastRenderTs||0) < 33) return; this._lastRenderTs = nowTs; } catch(_) {}
    const w = this.canvas.width || 100;
    const h = this.canvas.height || 100;
    try { this.ctx.setTransform(1,0,0,1,0,0); } catch(_) {}
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0,0,w,h);

    // Target resolve + transition
    let targetId = state.targeting?.selectedId || null;
    const shipDead = !!(state.ship && state.ship.isDestroyed);
    let silhouetteAlpha = 1, silhouetteScale = 1, drawSilhouette = true;
    if (this.targetCamTransition) {
      const now = performance.now();
      const t = (now - this.targetCamTransition.start) / this.targetCamTransition.duration;
      if (t >= 1) {
        this._lastSilhouetteId = this.targetCamTransition.toId || targetId || null;
        this.targetCamTransition = null;
      } else {
        targetId = this.targetCamTransition.toId || targetId;
        if (t * this.targetCamTransition.duration < this.targetCamTransition.hold) {
          drawSilhouette = false;
        } else {
          const fadeT = (now - (this.targetCamTransition.start + this.targetCamTransition.hold)) / (this.targetCamTransition.duration - this.targetCamTransition.hold);
          silhouetteAlpha = Math.max(0, Math.min(1, fadeT));
          silhouetteScale = 1.05 - 0.05 * silhouetteAlpha;
        }
      }
    }
    if (shipDead) targetId = null;
    const npc = targetId ? (state.npcShips || []).find(n => n && n.id === targetId) : null;

    // FX gating
    const now0 = performance.now ? performance.now() : Date.now();
    const inTransition = !!this.targetCamTransition;
    const inBlip = !!this.targetCamBlip && (now0 - this.targetCamBlip.start) <= (this.targetCamBlip.duration || 320);
    const fxActive = inTransition || inBlip;
    const fxEnabled = !!window.TC_FX;
    if (fxEnabled && fxActive) {
      this.drawStaticNoise(w,h,0.08);
      this.drawScanlines(w,h,0.06);
    }

    const ctx = this.ctx;
    ctx.save();
    try {
      const cx = w/2, cy = h/2;
      ctx.translate(cx, cy);
      // Direction ring/wedge
      let ang = 0;
      if (npc) { const dx = npc.x - state.ship.x, dy = npc.y - state.ship.y; ang = Math.atan2(dy, dx); }
      const radius = Math.min(w,h) * 0.5 - 4;
      ctx.save();
      let ringAlpha = 0.25;
      if (this.targetCamTransition) {
        const now = performance.now();
        const t = (now - this.targetCamTransition.start) / this.targetCamTransition.duration;
        if (t < 0.25) ringAlpha = 0.6 - t * 1.2;
      }
      ctx.globalAlpha = Math.max(0.15, ringAlpha);
      ctx.strokeStyle = '#aef'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.stroke();
      ctx.restore();

      if (npc) {
        ctx.save(); ctx.rotate(ang); ctx.fillStyle = '#cff';
        const mr = radius;
        ctx.beginPath(); ctx.moveTo(mr,0); ctx.lineTo(mr-8,-4); ctx.lineTo(mr-8,4); ctx.closePath(); ctx.fill(); ctx.restore();
      }

      // Blip ring
      if (this.targetCamBlip) {
        const now = performance.now(); const t = (now - this.targetCamBlip.start) / this.targetCamBlip.duration;
        if (t >= 1) { this.targetCamBlip = null; }
        else { const r = (0.2 + 0.8 * t) * radius; ctx.save(); ctx.globalAlpha = Math.max(0, 1-t)*0.6; ctx.strokeStyle = '#cff'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
      }

      // Silhouette (strict buffer-blit)
      if (npc && drawSilhouette) {
        const nowTs0 = performance.now ? performance.now() : Date.now();
        const targetChanged = (this._lastDraw.targetId !== npc.id);
        const anglePrev = this._lastDraw.angle || 0;
        const angleDiff = Math.abs((npc.angle||0) - anglePrev);
        const needByAngle = angleDiff >= this._policy.angleEps;
        const needByTime = (nowTs0 - (this._lastDraw.ts || 0)) >= this._policy.minIntervalMs;
        const __heavyFrame = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        const allowBuild = !__heavyFrame && (targetChanged || needByAngle || needByTime);

        // Stable per-target dims to prevent churn
        let dims = this._silDims.get(npc.id);
        if (!dims) {
          const baseInit = Math.max(16, Math.min(28, (npc.size || 10) * 1.6));
          const targetInit = Math.round(baseInit * 2);
          dims = { dw: targetInit, dh: targetInit };
          this._silDims.set(npc.id, dims);
        }
        const spriteId = npc.spriteId || typeToSpriteId[npc.type] || 'ships/pirate_0';
        const aliasId = aliasSpriteForType[npc.type] || spriteId;
        const allowForce = (typeof window !== 'undefined') && (!!window.TC_FORCE_ENABLED || !!window.TC_DEBUG);
        const force = (typeof window !== 'undefined' && allowForce && window.TC_FORCE) ? String(window.TC_FORCE) : null;
        // Schedule off-render build if needed and allowed
        if (allowBuild) {
          this._enqueueBuild(npc.id, dims, spriteId, aliasId, force);
          this._lastDraw.ts = nowTs0; this._lastDraw.angle = npc.angle || 0; this._lastDraw.targetId = npc.id;
        }

        // Draw cached buffer if it matches current target
        const hasBuf = !!(this._buf.canvas && this._buf.targetId === npc.id && this._buf.dw > 0 && this._buf.dh > 0);
        ctx.save();
        // Outer rotation by ship angle to mirror world renderer
        ctx.rotate(npc.angle || 0);
        if (hasBuf) {
          try {
            ctx.globalAlpha = Math.max(0.7, silhouetteAlpha);
            ctx.imageSmoothingEnabled = false;
            this._debugAxes(ctx);
            const bw = this._buf.dw, bh = this._buf.dh;
            ctx.drawImage(this._buf.canvas, -bw/2, -bh/2, bw, bh);
            this._lastPath = this._buf.kind || 'png';
          } catch(_) {
            // Fallback to baseline on error
            this._drawBaselineSilhouette(ctx, aliasId, Math.max(dims.dw, dims.dh), silhouetteAlpha);
          }
        } else {
          // No buffer ready: during warm-up suppress atlas/baseline.
          // After warm-up, allow minimal baseline/atlas-shaped silhouette only if selection currently resolves to a fallback kind.
          const now = performance.now ? performance.now() : Date.now();
          const allowFallbacks = (now >= (this._warmUntil || 0));
          const k = this._resolved && this._resolved.targetId === npc.id ? this._resolved.kind : null;
          if (allowFallbacks && (k === 'baseline' || k === 'atlas')) {
            this._drawBaselineSilhouette(ctx, aliasId, Math.max(dims.dw, dims.dh), silhouetteAlpha);
          }
        }
        ctx.restore();
      }

      if (shipDead) {
        ctx.save(); try { ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=0.65; ctx.fillStyle='#9cc'; ctx.font='10px VT323, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('OFFLINE', w/2, h/2); } finally { ctx.restore(); }
      }

      if (fxEnabled && fxActive) { this.drawStaticNoise(w,h,0.05,true); this.drawRollingBand(w,h,0.06); }
      // Optional path label
      if (!((typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24)) && window.TC_SHOW_PATH && this._lastPath) {
        try { const sctx = this.ctx; sctx.save(); sctx.setTransform(1,0,0,1,0,0); sctx.globalAlpha=0.85; sctx.fillStyle='#9cf'; sctx.font='10px VT323, monospace'; sctx.fillText(String(this._lastPath).toUpperCase(), 6, 12); sctx.restore(); } catch(_) {}
      }
    } finally { ctx.restore(); }
  }

  // Draw simple baseline (horizontal oval/triangle) at target size in current rotated space
  _drawBaselineSilhouette(ctx, aliasId, target, silhouetteAlpha=1) {
    const vpa = this.getViewportFallbackAtlas();
    const vpf = vpa.frames[aliasId] || vpa.frames['ships/trader_0'];
    if (!vpf || !vpf.img) return false;
    const scale = target / Math.max(vpf.w, vpf.h);
    const dw = vpf.w * scale, dh = vpf.h * scale;
    ctx.save();
    try {
      ctx.globalAlpha = Math.max(0.85, silhouetteAlpha);
      ctx.imageSmoothingEnabled = false;
      this._debugAxes(ctx);
      ctx.drawImage(vpf.img, -dw/2, -dh/2, dw, dh);
      this._lastPath = 'baseline';
      return true;
    } finally { ctx.restore(); }
  }

  // Queue a post-rAF build for the current target into the persistent buffer
  _enqueueBuild(targetId, dims, spriteId, aliasId, force) {
    // Coalesce to the latest request
    this._queuedBuild = { targetId, dims: { dw: dims.dw|0, dh: dims.dh|0 }, spriteId, aliasId, force: force||null, ts: performance.now ? performance.now() : Date.now() };
    if (this._buildPending) return;
    this._buildPending = true;
    const schedule = () => {
      const run = () => { try { this._tryBuildFromQueue(); } finally { this._buildPending = false; if (this._queuedBuild) { this._buildPending = true; schedule(); } } };
      // Defer to after next paint; keep off the rAF handler path
      try { requestAnimationFrame(() => setTimeout(run, 0)); }
      catch(_) { setTimeout(run, 0); }
    };
    schedule();
  }

  _ensureBuf(dw, dh) {
    const qdw = Math.max(1, (dw|0));
    const qdh = Math.max(1, (dh|0));
    if (!this._buf.canvas) {
      const c = document.createElement('canvas'); c.width = qdw; c.height = qdh; this._buf.canvas = c; this._buf.ctx = c.getContext('2d');
    }
    if (this._buf.dw !== qdw || this._buf.dh !== qdh) {
      this._buf.canvas.width = qdw; this._buf.canvas.height = qdh; this._buf.dw = qdw; this._buf.dh = qdh;
    }
  }

  _tryBuildFromQueue() {
    const req = this._queuedBuild; this._queuedBuild = null;
    if (!req) return;
    // Avoid heavy frames; reschedule if needed
    const isHeavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
    if (isHeavy) {
      // Re-queue the latest request and try next frame
      this._queuedBuild = req;
      // schedule again on next rAF
      requestAnimationFrame(() => Promise.resolve().then(() => this._tryBuildFromQueue()));
      return;
    }
    const state = this.stateManager?.state;
    if (!state) return;
    const npc = (state.npcShips || []).find(n => n && n.id === req.targetId);
    if (!npc) return;
    // Respect warm-up guard: do not build atlas/baseline before warm
    const now = performance.now ? performance.now() : Date.now();
    const allowFallbacks = (now >= (this._warmUntil || 0));
    const allowForce = (typeof window !== 'undefined') && (!!window.TC_FORCE_ENABLED || !!window.TC_DEBUG);
    const force = (typeof window !== 'undefined' && allowForce && req.force) ? String(req.force) : null;
    const spriteId = req.spriteId;
    const aliasId = req.aliasId;
    const resolved = this._resolveSource(state, npc, spriteId, aliasId, force);
    if (resolved.kind === 'none') {
      // Keep previous buffer; nothing to build
      return;
    }
    // Use a square, stable buffer (max side) to avoid rotation cropping and churn
    const S = Math.max(req.dims.dw|0, req.dims.dh|0);
    this._ensureBuf(S, S);
    const bctx = this._buf.ctx;
    // Clear buffer
    bctx.setTransform(1,0,0,1,0,0);
    bctx.globalAlpha = 1; bctx.globalCompositeOperation = 'source-over'; bctx.imageSmoothingEnabled = false;
    bctx.clearRect(0,0,this._buf.dw,this._buf.dh);
    try {
      // Build tinted canvas for source if available; baseline draws canned silhouette directly
      if (resolved.kind === 'baseline') {
        const vpa = this.getViewportFallbackAtlas();
        const vpf = vpa.frames[aliasId] || vpa.frames['ships/trader_0'];
        if (vpf && vpf.img) {
          // Draw centered without inner rotation (baseline authored nose-right)
          const scale = Math.max(S, S) / Math.max(vpf.w, vpf.h);
          const dw0 = vpf.w * scale, dh0 = vpf.h * scale;
          bctx.save(); bctx.translate(this._buf.dw/2, this._buf.dh/2);
          bctx.drawImage(vpf.img, -dw0/2, -dh0/2, dw0, dh0);
          bctx.restore();
        }
      } else {
        // direct/preloaded/standalone/atlas: draw + tint in buffer (no extra canvases)
        const src = resolved.src;
        if (!src) return;
        // Maintain source aspect within square buffer
        const sw = src.naturalWidth || src.width || 0;
        const sh = src.naturalHeight || src.height || 0;
        const scale = (sw>0 && sh>0) ? (S / Math.max(sw, sh)) : 1;
        const dw0 = Math.max(1, Math.round(sw * scale));
        const dh0 = Math.max(1, Math.round(sh * scale));
        bctx.save();
        bctx.translate(this._buf.dw/2, this._buf.dh/2);
        // Bake inner rotation only for PNG sources; atlas uses 0 inner
        const isPNGKind = (resolved.kind === 'direct' || resolved.kind === 'preloaded' || resolved.kind === 'standalone');
        const inner = isPNGKind ? this._rotFor(spriteId) : 0;
        if (inner) bctx.rotate(inner);
        // Draw source, then tint in place using source-in
        bctx.drawImage(src, 0, 0, sw, sh, -dw0/2, -dh0/2, dw0, dh0);
        const prev = bctx.globalCompositeOperation;
        bctx.globalCompositeOperation = 'source-in';
        bctx.fillStyle = '#e8f6ff';
        bctx.fillRect(-this._buf.dw/2, -this._buf.dh/2, this._buf.dw, this._buf.dh);
        bctx.globalCompositeOperation = prev;
        bctx.restore();
      }
      // Update metadata
      this._buf.kind = resolved.kind || 'png';
      this._buf.spriteKey = spriteId;
      this._buf.targetId = npc.id;
      // Refresh per-target dims to match buffer
      this._silDims.set(npc.id, { dw: this._buf.dw, dh: this._buf.dh });
      this._lastPath = this._buf.kind;
    } catch(_) {
      // Leave previous buffer as-is on failure
    }
  }

  // Helpers
  _resolveSource(state, npc, spriteId, aliasId, force) {
    const sameTarget = (this._resolved && this._resolved.targetId === npc.id);
    // Only upgrade quality; never downgrade
    const rank = { direct: 5, preloaded: 4, standalone: 3, atlas: 2, baseline: 1, null: 0 };
    const currentRank = sameTarget ? (rank[this._resolved.kind] || 0) : 0;
    const now = performance.now ? performance.now() : Date.now();
    const allowFallbacks = (now >= (this._warmUntil || 0));

    const consider = (kind, src, w=0, h=0) => {
      if (!src) return false;
      const r = rank[kind] || 0;
      if (r <= currentRank) return false;
      this._resolved = { targetId: npc.id, kind, src, w, h };
      return true;
    };

    // Forced path (debug-only)
    if (force === 'baseline') { this._resolved = { targetId: npc.id, kind: 'baseline', src: null, w:0, h:0 }; return this._resolved; }
    if (force === 'atlas') {
      const cfa = getFrameCanvasFromState(state, aliasId) || getFrameCanvasFromState(state, spriteId);
      if (cfa) { this._resolved = { targetId: npc.id, kind: 'atlas', src: cfa, w: cfa.width, h: cfa.height }; return this._resolved; }
      this._resolved = { targetId: npc.id, kind: 'baseline', src: null, w:0, h:0 }; return this._resolved;
    }
    if (force === 'direct') {
      const dir = this.getOrLoadSprite(spriteId);
      if (dir && isImageReady(dir)) { this._resolved = { targetId: npc.id, kind: 'direct', src: dir, w: dir.naturalWidth||dir.width, h: dir.naturalHeight||dir.height }; return this._resolved; }
    }
    if (force === 'preloaded') {
      const preEntry = state?.assets?.sprites?.[spriteId];
      if (preEntry && preEntry.image) { this._resolved = { targetId: npc.id, kind: 'preloaded', src: preEntry.image, w: preEntry.w||preEntry.image.naturalWidth||0, h: preEntry.h||preEntry.image.naturalHeight||0 }; return this._resolved; }
    }
    if (force === 'standalone') {
      const std = getStandaloneSpriteIfReady(state, spriteId);
      if (std) { this._resolved = { targetId: npc.id, kind: 'standalone', src: std, w: std.naturalWidth||std.width, h: std.naturalHeight||std.height }; return this._resolved; }
    }

    // Auto/upgrade path: try best available
    // 1) direct
    const dir = this.getOrLoadSprite(spriteId);
    if (dir && isImageReady(dir)) consider('direct', dir, dir.naturalWidth||dir.width, dir.naturalHeight||dir.height);
    // 2) preloaded registry
    const preEntry = state?.assets?.sprites?.[spriteId];
    if (preEntry && preEntry.image) consider('preloaded', preEntry.image, preEntry.w||preEntry.image.naturalWidth||0, preEntry.h||preEntry.image.naturalHeight||0);
    // 3) standalone manifest (alias to same store but kept distinct)
    const std = getStandaloneSpriteIfReady(state, spriteId);
    if (std) consider('standalone', std, std.naturalWidth||std.width, std.naturalHeight||std.height);
    // 4) atlas
    const cf = getFrameCanvasFromState(state, aliasId) || getFrameCanvasFromState(state, spriteId);
    if (allowFallbacks && cf) consider('atlas', cf, cf.width, cf.height);
    // 5) baseline only if fallbacks allowed; otherwise leave as 'none'
    if (!sameTarget || !this._resolved.kind) {
      this._resolved = { targetId: npc.id, kind: (allowFallbacks ? 'baseline' : 'none'), src: null, w:0, h:0 };
    }
    return this._resolved;
  }
  _drawWhiteMasked(ctx, src, dw, dh, sx=null, sy=null, sw=null, sh=null) {
    // Legacy path (kept for fallback/debug)
    try {
      ctx.save();
      if (sw&&sh && sx!==null && sy!==null) ctx.drawImage(src, sx|0, sy|0, sw, sh, -dw/2, -dh/2, dw, dh);
      else ctx.drawImage(src, -dw/2, -dh/2, dw, dh);
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation='source-in';
      ctx.fillStyle='#e8f6ff';
      ctx.fillRect(-dw/2,-dh/2,dw,dh);
      ctx.globalCompositeOperation = prev;
      ctx.restore();
      return true;
    } catch(__) { return false; }
  }

  _getTintedCanvas(src, dw, dh, sx=null, sy=null, sw=null, sh=null, allowBuild=true) {
    try {
      let sid = this._srcIds.get(src); if (!sid) { sid = this._nextSrcId++; this._srcIds.set(src, sid); }
      const qdw = (Math.round((dw|0)/2)*2)|0;
      const qdh = (Math.round((dh|0)/2)*2)|0;
      const key = `${sid}|${qdw}|${qdh}|${sx??-1}|${sy??-1}|${sw??-1}|${sh??-1}|tinted`;
      let tint = this._maskCache.get(key);
      if (!tint && allowBuild) {
        const mc = document.createElement('canvas'); mc.width = Math.max(1, qdw); mc.height = Math.max(1, qdh);
        const mctx = mc.getContext('2d'); mctx.imageSmoothingEnabled = false;
        if (sw && sh && sx!==null && sy!==null) mctx.drawImage(src, sx|0, sy|0, sw, sh, 0, 0, qdw, qdh);
        else mctx.drawImage(src, 0, 0, qdw, qdh);
        mctx.globalCompositeOperation = 'source-in'; mctx.fillStyle = '#e8f6ff'; mctx.fillRect(0,0,qdw,qdh);
        this._maskCache.set(key, mc); this._maskOrder.push(key);
        if (this._maskOrder.length > this._maskCap) { const oldest = this._maskOrder.shift(); this._maskCache.delete(oldest); }
        tint = mc;
      }
      return tint || null;
    } catch(_) { return null; }
  }
  _rotFor(artId) {
    // PNG art is authored "up"; apply +90° base like world sprites
    return this.spriteRotationOffset + (this.spriteOrientationOverrides[artId] || 0);
  }

  // Read optional QA overrides for angle/time gating
  _syncPolicyFromWindow() {
    try {
      const win = (typeof window !== 'undefined') ? window : null;
      if (!win) return;
      // angleEps in radians; clamp to sensible bounds
      if (typeof win.TC_ANGLE_EPS !== 'undefined') {
        const v = Number(win.TC_ANGLE_EPS);
        if (!Number.isNaN(v)) this._policy.angleEps = Math.max(0.02, Math.min(0.6, v));
      }
      // minIntervalMs in milliseconds; clamp bounds
      if (typeof win.TC_MIN_MS !== 'undefined') {
        const m = Number(win.TC_MIN_MS);
        if (!Number.isNaN(m)) this._policy.minIntervalMs = Math.max(30, Math.min(300, m|0));
      }
    } catch(_) {}
  }

  _debugAxes(ctx) {
    if (!window.TC_DEBUG) return;
    try {
      ctx.save();
      ctx.lineWidth = 1;
      // +X (right) in cyan
      ctx.strokeStyle = '#0ff';
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(18,0); ctx.stroke();
      // +Y (down) in magenta
      ctx.strokeStyle = '#f0f';
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,18); ctx.stroke();
      ctx.restore();
    } catch(_) {}
  }

  _traceDraw(path, spriteKey, innerRot, npcAngle) {
    if (!window.TC_TRACE) return;
    try {
      const mode = (window.TC_TRACE === 'frame') ? 'frame' : 'change';
      const key = `${path}|${spriteKey}|${(innerRot||0).toFixed(3)}`;
      const now = performance.now ? performance.now() : Date.now();
      if (mode === 'change') {
        if (this._trace.lastKey === key && (now - this._trace.lastTs) < 1500) return;
        this._trace.lastKey = key; this._trace.lastTs = now;
      } else {
        // frame mode: throttle to ~6Hz
        if ((now - this._trace.lastTs) < 160) return;
        this._trace.lastTs = now;
      }
      console.log('[TC]', path, spriteKey, { npcAngle, inner: innerRot, total: (npcAngle||0) + (innerRot||0) });
    } catch(_) { /* ignore */ }
  }
  _spriteUrlFor(spriteId) { try { return new URL('../../assets/sprites/' + spriteId + '.png', import.meta.url).href; } catch(_) { return null; } }
  _ensureDirectSpriteImage(spriteId) { try { let img = this._targetCamSprites[spriteId]; if (img && (img.naturalWidth>0 || !img.complete)) return img; const url = this._spriteUrlFor(spriteId); if (!url) return null; img = new Image(); img.decoding='async'; img.crossOrigin='anonymous'; img.referrerPolicy='no-referrer'; img.src = url; this._targetCamSprites[spriteId]=img; return img; } catch(_) { return null; } }
  getOrLoadSprite(spriteId) { try { const url = new URL('../../assets/sprites/' + spriteId + '.png', import.meta.url).href; let img = this.spriteCache[url]; if (img) return img; img = new Image(); img.decoding='async'; img.crossOrigin='anonymous'; img.referrerPolicy='no-referrer'; img.src = url; this.spriteCache[url] = img; try { const keys = Object.keys(this.spriteCache); const cap = this._spriteCacheCap||64; if (keys.length > cap) { delete this.spriteCache[keys[0]]; } } catch(_) {} return null; } catch(_) { return null; } }

  getViewportFallbackAtlas() {
    if (this._viewportAtlas) return this._viewportAtlas;
    const tw=32, th=32;
    const raiderCanvas = document.createElement('canvas'); raiderCanvas.width=tw; raiderCanvas.height=th; const rc=raiderCanvas.getContext('2d'); rc.save(); rc.translate(tw*0.5, th*0.5); rc.fillStyle='#e8f6ff'; rc.beginPath(); rc.moveTo(tw*0.36,0); rc.lineTo(-tw*0.28,-th*0.24); rc.lineTo(-tw*0.20,0); rc.lineTo(-tw*0.28, th*0.24); rc.closePath(); rc.fill(); rc.restore();
    const traderCanvas = document.createElement('canvas'); traderCanvas.width=tw; traderCanvas.height=th; const tc=traderCanvas.getContext('2d'); tc.save(); tc.translate(tw*0.5, th*0.5); tc.fillStyle='#e8f6ff'; tc.beginPath(); tc.ellipse(0,0, tw*0.38, th*0.22, 0, 0, Math.PI*2); tc.fill(); tc.restore();
    this._viewportAtlas = { frames: { 'ships/raider_0': { img: raiderCanvas, w: tw, h: th }, 'ships/trader_0': { img: traderCanvas, w: tw, h: th } } };
    return this._viewportAtlas;
  }

  drawStaticNoise(w,h,intensity=0.1, overlay=false) {
    const now = Date.now(); const sn = this.staticNoise;
    if (now - sn.lastTime > 80) { const nctx = sn.ctx; const img = nctx.createImageData(sn.canvas.width, sn.canvas.height); for (let i=0;i<img.data.length;i+=4){ const v=Math.random()*255; img.data[i]=v; img.data[i+1]=v; img.data[i+2]=v; img.data[i+3]=255; } nctx.putImageData(img,0,0); sn.lastTime=now; sn.phase=(sn.phase+1)%1000; }
    const ctx = this.ctx; ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = Math.max(0, Math.min(0.4, intensity)); const jx=(Math.random()-0.5)*2, jy=(Math.random()-0.5)*2; ctx.imageSmoothingEnabled=false; ctx.translate(jx, jy); ctx.drawImage(this.staticNoise.canvas, 0,0, w,h); ctx.restore();
  }
  drawScanlines(w,h,alpha=0.06) { const ctx = this.ctx; ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=alpha; ctx.fillStyle='#000'; for (let y=0; y<h; y+=2) ctx.fillRect(0,y,w,1); ctx.restore(); }
  drawRollingBand(w,h,alpha=0.06) { const ctx=this.ctx; const t=Date.now()*0.0015; const bandY=(h*0.5)+Math.sin(t)*(h*0.5); const grad=ctx.createLinearGradient(0, bandY-8, 0, bandY+8); grad.addColorStop(0,'rgba(200,255,255,0)'); grad.addColorStop(0.5,`rgba(200,255,255,${alpha})`); grad.addColorStop(1,'rgba(200,255,255,0)'); ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle=grad; ctx.fillRect(0, Math.max(0, bandY-8), w, 16); ctx.restore(); }
}
