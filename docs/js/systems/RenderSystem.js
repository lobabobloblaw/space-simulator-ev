import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { ProceduralPlanetRenderer } from './proceduralPlanetRenderer.js';
import PlanetSpriteRenderer from './PlanetSpriteRenderer.js';
import ExplosionRenderer from './ExplosionRenderer.js';
import ThrusterFXRenderer from './ThrusterFXRenderer.js';
import HUDRenderer from './HUDRenderer.js';
import { withWorld, withScreen } from './RenderHelpers.js';
import { MathUtils } from '../utils/MathUtils.js';
import { getFrameCanvasFromState } from './AssetSystem.js';
import { typeToSpriteId, aliasSpriteForType, spriteRotationOffset, spriteOrientationOverrides as ORIENT_OVERRIDES } from './SpriteMappings.js';
import ShipDesigns from './ShipDesigns.js';
import TargetCamRenderer from './TargetCamRenderer.js';
import FactionVisuals from './FactionVisuals.js';
import { GameConstants } from '../utils/Constants.js';

/**
 * RenderSystem - Handles all visual rendering for the game
 * Draws all game entities, effects, and UI elements to the canvas
 */
export class RenderSystem {
    constructor(canvas) {
        this.canvas = canvas;
        // Prefer low-latency, opaque canvas to reduce compositing cost
        this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Cache frequently used values
        this.camera = { x: 0, y: 0 };
        this.screenCenter = { x: canvas.width / 2, y: canvas.height / 2 };
        
        // Rendering state
        this.nebulaOffset = { x: 0, y: 0 };
        
        // Performance optimization flags
        this.quality = 'high'; // 'low', 'medium', 'high'
        this._manualQuality = this.quality;
        this._autoQuality = { enabled: false, lastTs: 0, overBudgetStreak: 0, underBudgetStreak: 0, target: 'high' };
        this.showParticles = true;
        this.showEffects = true;
        
        // Minimap canvas (from existing setup)
        this.minimapCanvas = document.getElementById('minimapCanvas');
        // Allow CSS gradient behind the canvas to show through during clears
        this.minimapCtx = this.minimapCanvas ? (this.minimapCanvas.getContext('2d', { alpha: true, desynchronized: true }) || this.minimapCanvas.getContext('2d')) : null;
        this.minimapScale = 0.018;

        // Target cam viewport (center viewport next to controls)
        this.targetCanvas = document.getElementById('centerViewportCanvas');
        // TargetCamRenderer manages its own ctx; keep alpha true to allow CSS gradient underlay
        this.targetCtx = this.targetCanvas ? (this.targetCanvas.getContext('2d', { alpha: true, desynchronized: true }) || this.targetCanvas.getContext('2d')) : null;
        this.targetCam = new TargetCamRenderer(this.eventBus, this.stateManager, this.targetCanvas);
        // Static overlay buffer (used for minimap/targetcam transitional effects)
        this.staticNoise = {
            canvas: (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; return c; })(),
            ctx: null,
            lastTime: 0,
            phase: 0
        };
        this.staticNoise.ctx = this.staticNoise.canvas.getContext('2d');
        
        // Initialize planet renderer based on constants/toggle
        try {
            const g = (typeof window !== 'undefined') ? window : globalThis;
            const modeOverride = (typeof g.USE_PLANET_SPRITES === 'boolean') ? (g.USE_PLANET_SPRITES ? 'sprites' : 'procedural') : null;
            const mode = modeOverride || (GameConstants?.UI?.PLANETS?.MODE || 'procedural');
            this.planetRenderer = (mode === 'sprites') ? new PlanetSpriteRenderer(this.stateManager) : new ProceduralPlanetRenderer();
        } catch(_) { this.planetRenderer = new ProceduralPlanetRenderer(); }
        
        // Don't generate stars here - we'll use the ones from state
        
        // Local cache for direct sprite path fallback
        this.spriteCache = {};
        this._spriteCacheCap = 64;

        // Suppress brief first-frame vector fallback flashes while sprites warm up
        try { this._suppressVectorUntil = (performance.now ? performance.now() : Date.now()) + 250; } catch(_) { this._suppressVectorUntil = 0; }

        // Debug throttle state
        this._dbg = { last: new Map() };
        this._prof = { armed: 0, cooldownUntil: 0, lastLogTs: 0 }; // auto one-shot profiler frames when a spike is detected

        // Bind methods
        this.handleCanvasResize = this.handleCanvasResize.bind(this);
        this.handleShieldHit = this.handleShieldHit.bind(this);
        this._dbgLog = this._dbgLog.bind(this);
        this._updateAutoQuality = this._updateAutoQuality.bind(this);
        
        // Global size multiplier for ships (sprites and vectors)
        this.sizeMultiplier = 1.25; // gentle nudge (~+25% total)

        // Sprite orientation configuration (centralized)
        this.spriteRotationOffset = spriteRotationOffset;
        this.spriteOrientationOverrides = ORIENT_OVERRIDES;

        // Extracted explosion renderer
        this.explosionRenderer = new ExplosionRenderer();
        this.thrusterFX = new ThrusterFXRenderer();
        this.hud = new HUDRenderer(this.ctx, this.camera, this.screenCenter);

        // Track pending async planet generations to avoid repeat scheduling
        this._pendingPlanets = new Set();


        // Optional: tiny guard to skip/stride soft UI (minimap/HUD) for 1–2 frames
        // when render profiler attributes a spike to 'other'. Disabled by default;
        // enable via: window.RENDER_OTHER_GUARD = true
        this._otherGuard = { frames: 0 };

        // Boot ramp: start at medium quality for a short window to avoid early composite spikes
        try {
            const now = (performance.now ? performance.now() : Date.now());
            const g = (typeof window !== 'undefined') ? window : globalThis;
            const ms = Number(g.BOOT_QUALITY_MS) || 3000;
            this._bootUntil = now + Math.max(0, ms);
        } catch(_) { this._bootUntil = 0; }

        // Canvas 2D quality hints
        try { this.ctx.imageSmoothingEnabled = false; } catch(_) {}
        try { if (this.minimapCtx) this.minimapCtx.imageSmoothingEnabled = false; } catch(_) {}
        try { if (this.targetCtx) this.targetCtx.imageSmoothingEnabled = false; } catch(_) {}

        // Background caches
        this._bgGrad = { canvas: null, h: 0 };
        this._starTick = 0;
        this._starBootSkip = 0;
        try { const g = (typeof window !== 'undefined') ? window : globalThis; if (Number(g.STAR_BOOT_SKIP)) this._starBootSkip = Math.max(0, Number(g.STAR_BOOT_SKIP)|0); } catch(_) {}

        console.log('[RenderSystem] Created');
    }

    getTypeScale(type) {
        try {
            const map = GameConstants?.SHIP?.TYPE_SPRITE_SCALE || {};
            return map[type] || 1.4;
        } catch (_) { return 1.4; }
    }

    // Lightweight static tile update (shared by minimap transitional effect)
    _updateStaticTile() {
        try {
            const sn = this.staticNoise;
            const now = Date.now();
            if (now - sn.lastTime > 80) {
                const nctx = sn.ctx;
                const img = nctx.createImageData(sn.canvas.width, sn.canvas.height);
                for (let i = 0; i < img.data.length; i += 4) {
                    const v = Math.random() * 255;
                    img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
                }
                nctx.putImageData(img, 0, 0);
                sn.lastTime = now; sn.phase = (sn.phase + 1) % 1000;
            }
        } catch (_) {}
    }

    // Draw a faint static + scanline overlay (minimap only)
    _drawMinimapStatic(w, h, noiseAlpha = 0.08, lineAlpha = 0.05) {
        if (!this.minimapCtx) return;
        this._updateStaticTile();
        const ctx = this.minimapCtx;
        try {
            ctx.save();
            ctx.setTransform(1,0,0,1,0,0);
            ctx.imageSmoothingEnabled = false;
            // Noise tile
            ctx.globalAlpha = Math.max(0, Math.min(0.4, noiseAlpha));
            ctx.drawImage(this.staticNoise.canvas, 0, 0, w, h);
            // Scanlines
            ctx.globalAlpha = Math.max(0, Math.min(0.2, lineAlpha));
            ctx.fillStyle = '#000';
            for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
        } finally { ctx.restore(); }
    }

    
    /**
     * Initialize the render system
     */
    init() {
        // Subscribe to events
        this.subscribeToEvents();
        
        // Set initial canvas size
        this.resizeCanvas();

        // Observe panel (minimap/targetCam) CSS size changes and resync backing stores
        try {
            if (typeof ResizeObserver !== 'undefined') {
                const ro = new ResizeObserver(() => {
                    try { this.resizeCanvas(); } catch(_) {}
                });
                if (this.minimapCanvas) ro.observe(this.minimapCanvas);
                if (this.targetCanvas) ro.observe(this.targetCanvas);
                this._panelRO = ro;
            } else {
                // Fallback: periodically verify sizes briefly after init
                setTimeout(() => { try { this.resizeCanvas(); } catch(_) {} }, 0);
                setTimeout(() => { try { this.resizeCanvas(); } catch(_) {} }, 150);
            }
        } catch(_) {}

        // Safety: ensure visual world data exists (stars/asteroids/planets)
        // In theory initializeGameState sets these, but if anything raced or failed,
        // we restore minimal visuals here to avoid an empty scene.
        this.ensureWorldVisuals();
        
        // Initialize planets with procedural generation
        // We'll do this after a small delay to ensure state is ready
        setTimeout(() => {
            const state = this.stateManager.state;
            if (state.planets && state.planets.length > 0) {
                console.log('[RenderSystem] Initializing procedural planets:', state.planets.length);
                this.planetRenderer.initializePlanets(state.planets);
            }
        }, 100);

        try { this.targetCam.init(); } catch(_) {}
        
        console.log('[RenderSystem] Initialized');
    }

    // Target-cam diagnostics removed

    /**
     * Ensure stars, asteroids, and planets exist in state (fallback safeguard)
     */
    ensureWorldVisuals() {
        const state = this.stateManager.state;

        // Stars fallback
        if (!state.stars || !state.stars.far || !state.stars.mid || !state.stars.near) {
            console.warn('[RenderSystem] World stars missing; generating fallback starfields');
            const density = (state.renderSettings && state.renderSettings.starDensity) ? state.renderSettings.starDensity : 1.0;
            state.stars = { far: [], mid: [], near: [] };
            for (let i = 0; i < Math.floor(3000 * density); i++) {
                state.stars.far.push({
                    x: (Math.random() - 0.5) * 12000,
                    y: (Math.random() - 0.5) * 12000,
                    brightness: Math.random() * 0.5 + 0.3,
                    size: Math.random() < 0.95 ? 1 : 2,
                    color: Math.random() < 0.94 ? '#ffffff' : 
                           Math.random() < 0.5 ? '#ffeeee' :
                           Math.random() < 0.7 ? '#eeeeff' : '#ffffee'
                });
            }
            for (let i = 0; i < Math.floor(1200 * density); i++) {
                state.stars.mid.push({
                    x: (Math.random() - 0.5) * 8000,
                    y: (Math.random() - 0.5) * 8000,
                    brightness: Math.random() * 0.6 + 0.4,
                    size: Math.random() < 0.9 ? 1 : 2,
                    twinkle: Math.random() * Math.PI * 2,
                    twinkleSpeed: 0.01 + Math.random() * 0.03,
                    color: Math.random() < 0.92 ? '#ffffff' : 
                           Math.random() < 0.6 ? '#ffeeee' : '#eeeeff'
                });
            }
            for (let i = 0; i < Math.floor(600 * density); i++) {
                state.stars.near.push({
                    x: (Math.random() - 0.5) * 6000,
                    y: (Math.random() - 0.5) * 6000,
                    brightness: Math.random() * 0.7 + 0.5,
                    size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
                    color: '#ffffff'
                });
            }
        }

        // Asteroids fallback
        if (!state.asteroids || state.asteroids.length === 0) {
            console.warn('[RenderSystem] Asteroids missing; generating fallback field');
            state.asteroids = [];
            for (let i = 0; i < 40; i++) {
                const shapePoints = [];
                for (let j = 0; j < 8; j++) shapePoints.push(0.7 + Math.random() * 0.6);
                state.asteroids.push({
                    x: (Math.random() - 0.5) * 4000,
                    y: (Math.random() - 0.5) * 4000,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 8 + 2,
                    color: '#666',
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    rotation: Math.random() * Math.PI * 2,
                    health: 20,
                    maxHealth: 20,
                    oreContent: Math.floor(Math.random() * 3) + 1,
                    shapePoints
                });
            }
        }

        // Planets fallback
        if (!state.planets || state.planets.length === 0) {
            console.warn('[RenderSystem] Planets missing; loading from data module');
            import('../data/gameData.js')
                .then(mod => {
                    if (mod.planets && mod.planets.length) {
                        state.planets = mod.planets;
                        // Defer planet texture generation to render path (lazy, on-demand)
                        console.log('[RenderSystem] Planets available:', state.planets.length);
                    }
                })
                .catch(e => console.error('[RenderSystem] Failed to load planets data:', e));
        }
    }
    
    /**
     * Subscribe to render-relevant events
     */
    subscribeToEvents() {
        // Canvas resize
        this.eventBus.on('canvas.resize', this.handleCanvasResize);
        
        // Quality settings
        this.eventBus.on('render.quality', (data) => {
            this._manualQuality = data.quality;
            if (!this._autoQuality.enabled) this.quality = this._manualQuality;
        });
        // Sprite toggle
        this.eventBus.on('render.useSprites', (data) => {
            const en = !!(data && (data.enabled ?? data.useSprites));
            this.useSprites = en;
            const st = this.stateManager.state;
            st.renderSettings = st.renderSettings || {};
            st.renderSettings.useSprites = en;
        });
        // Effects sprite toggle (thrusters/extras)
        this.eventBus.on('render.useEffectsSprites', (data) => {
            const en = !!(data && (data.enabled ?? data.useEffectsSprites));
            const st = this.stateManager.state;
            st.renderSettings = st.renderSettings || {};
            st.renderSettings.useEffectsSprites = en;
        });
        // Sprite culling toggle
        this.eventBus.on('render.spriteCulling', (data) => {
            const en = !!(data && (data.enabled ?? data.spriteCulling));
            const st = this.stateManager.state;
            st.renderSettings = st.renderSettings || {};
            st.renderSettings.spriteCulling = en;
        });
        
        // Visual toggles
        this.eventBus.on('render.toggleParticles', () => {
            this.showParticles = !this.showParticles;
        });

        // Shield hit visual ping
        this.eventBus.on(GameEvents.SHIELD_HIT, this.handleShieldHit);

        // TargetCam handles TARGET_SET/TARGET_CLEAR internally
    }

    getOrLoadSprite(spriteId) {
        try {
            // Resolve against this module URL to avoid path issues
            const url = new URL('../../assets/sprites/' + spriteId + '.png', import.meta.url).href;
            let img = this.spriteCache[url];
            if (img) return img; // return image even if still loading
            img = new Image();
            img.decoding = 'async';
            img.crossOrigin = 'anonymous';
            img.referrerPolicy = 'no-referrer';
            img.src = url;
            this.spriteCache[url] = img;
            // Soft cap cache to avoid unbounded growth in rare cases
            try {
                const keys = Object.keys(this.spriteCache);
                const cap = this._spriteCacheCap || 64;
                if (keys.length > cap) {
                    delete this.spriteCache[keys[0]];
                }
            } catch(_) {}
            return null;
        } catch (_) { return null; }
    }


    _dbgLog(key, ...args) {
        if (window.DEBUG_SPRITES !== 'verbose') return;
        const now = performance.now ? performance.now() : Date.now();
        const last = this._dbg.last.get(key) || 0;
        if (now - last < 1200) return; // throttle harder
        console.log(...args);
        this._dbg.last.set(key, now);
    }

    // Stars are now generated in main_eventbus_pure.js and stored in state
    // This provides consistency across all systems

    _updateAutoQuality(frameMs) {
        // Simple hysteresis: degrade fast on spikes; recover slowly after sustained headroom
        const a = this._autoQuality;
        // Thresholds tuned for ~60Hz target
        if (frameMs > 26) { // > ~38 FPS
            a.overBudgetStreak += 2;
            a.underBudgetStreak = 0;
        } else if (frameMs > 19) { // > ~52 FPS
            a.overBudgetStreak += 1;
            a.underBudgetStreak = 0;
        } else {
            a.overBudgetStreak = Math.max(0, a.overBudgetStreak - 1);
            a.underBudgetStreak += 1;
        }
        // Degrade quickly if repeated misses
        if (a.overBudgetStreak >= 4) {
            a.overBudgetStreak = 0;
            a.target = (this.quality === 'high') ? 'medium' : 'low';
        }
        // Recover slowly after sustained good frames
        if (a.underBudgetStreak >= 90) { // ~1.5s at 60fps
            a.underBudgetStreak = 0;
            a.target = (this.quality === 'low') ? 'medium' : 'high';
        }
        // Apply target only if it differs from current manual to avoid oscillation
        if (this.quality !== a.target) {
            this.quality = a.target;
        }
    }

    /**
     * Main render method - called each frame
     */
    render(state, deltaTime) {
        // Optional: auto quality scaling based on frame time (off by default; enable via window.RENDER_AUTO_QUALITY = true)
        try {
            // Default auto quality ON unless explicitly set false
            const wantAuto = (typeof window !== 'undefined') ? (('RENDER_AUTO_QUALITY' in window) ? !!window.RENDER_AUTO_QUALITY : true) : true;
            this._autoQuality.enabled = wantAuto;
            const now = performance.now ? performance.now() : Date.now();
            if (!this._autoQuality.lastTs) this._autoQuality.lastTs = now;
            const frameMs = Math.max(0, now - this._autoQuality.lastTs);
            this._autoQuality.lastTs = now;
            if (this._autoQuality.enabled) {
                this._updateAutoQuality(frameMs);
            } else {
                // Respect manual setting when auto is disabled
                this.quality = this._manualQuality;
            }
            // Enforce boot ramp quality briefly
            if (now < (this._bootUntil || 0)) this.quality = 'medium';
            // Expose for profiler overlay/log
            if (typeof window !== 'undefined') window.__lastFrameMs = frameMs;
            // Auto-arm one-shot profile capture on spike without user toggles (disable via window.RENDER_PROF_AUTO_DISABLED = true)
            // Auto-arming is OFF by default; enable with window.RENDER_PROF_AUTO_ENABLED = true
            const autoEnabled = !!(typeof window !== 'undefined' && window.RENDER_PROF_AUTO_ENABLED);
            const spikeTh = Number((typeof window !== 'undefined' && window.RENDER_PROF_T) || 20);
            if (autoEnabled && frameMs > Math.max(24, spikeTh + 2) && this._prof.armed === 0 && now >= (this._prof.cooldownUntil||0)) {
                this._prof.armed = 2; // capture this and next frame breakdowns
                this._prof.cooldownUntil = now + 3000; // 3s cooldown before arming again
            }
        } catch(_) {}
        // Hard reset context state to avoid any leaked transforms from prior frame
        // Ensure sane defaults at frame start
        try { this.ctx.setTransform(1, 0, 0, 1, 0, 0); } catch(_) {}
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        this.ctx.lineWidth = 1;

        // Update camera to follow ship
        this.camera.x = state.ship.x;
        this.camera.y = state.ship.y;
        
        // Clear canvas with gradient background
        this.clearCanvas();
        
        // Save context state
        // Apply world-space pass with camera and shake using helper
        let shakeX = 0, shakeY = 0;
        if (state.ship.screenShake && state.ship.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * state.ship.screenShake;
            shakeY = (Math.random() - 0.5) * state.ship.screenShake;
            state.ship.screenShake *= state.ship.screenShakeDecay || (GameConstants?.PHYSICS?.SCREEN_SHAKE_DECAY ?? 0.8);
            if (state.ship.screenShake < 0.5) state.ship.screenShake = 0;
        }

        // Lightweight profiling (opt-in)
        const doProf = !!(typeof window !== 'undefined' && (window.RENDER_PROF_LOG || window.RENDER_PROF_OVERLAY)) || this._prof.armed > 0;
        const prof = doProf ? { b:{} } : null;
        const pnow = () => performance.now ? performance.now() : Date.now();
        const pmark = (k, dt) => { if (prof) prof.b[k] = (prof.b[k]||0) + dt; };

        const tf_world_start = doProf ? pnow() : 0;
        withWorld(this.ctx, this.camera, this.screenCenter, () => {
            let t0;
            try { t0 = doProf && pnow(); this.renderNebula(); if (doProf) pmark('nebula', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderStars(); if (doProf) pmark('stars', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderPlanets(state); if (doProf) pmark('planets', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderAsteroids(state); if (doProf) pmark('asteroids', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderPickups(state); if (doProf) pmark('pickups', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderDebris(state); if (doProf) pmark('debris', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderNPCs(state); if (doProf) pmark('npcs', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderProjectiles(state); if (doProf) pmark('projectiles', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderMuzzleFlashes(state); if (doProf) pmark('muzzle', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderHitSparks(state); if (doProf) pmark('sparks', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderShip(state); if (doProf) pmark('ship', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderShieldHits(state); if (doProf) pmark('shield', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderExplosions(state); if (doProf) pmark('explosions', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderWarpEffects(state); if (doProf) pmark('warp', pnow()-t0); } catch(_) {}
            try { t0 = doProf && pnow(); this.renderDebug(state); if (doProf) pmark('debug', pnow()-t0); } catch(_) {}
        }, shakeX, shakeY);
        const tf_world = doProf ? (pnow() - tf_world_start) : 0;
        // Debug: post-world pass lint
        this.debugRenderLint('post-world');
        
        // Draw damage flash overlay (screen space)
        if (state.ship.damageFlash && state.ship.damageFlash > 0) {
            withScreen(this.ctx, () => {
                const mult = (GameConstants?.PHYSICS?.DAMAGE_FLASH_ALPHA_MULT ?? 0.3);
                this.ctx.fillStyle = `rgba(255, 0, 0, ${state.ship.damageFlash * mult})`;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            });
            const decay = (GameConstants?.PHYSICS?.DAMAGE_FLASH_DECAY ?? 0.05);
            state.ship.damageFlash -= decay;
            if (state.ship.damageFlash < 0) state.ship.damageFlash = 0;
        }
        
        // Render UI elements (not affected by camera)
        let t0;
        if (doProf) t0 = pnow();
        // Optional soft-UI stride/skip guard (minimap + HUD) if prior frame's
        // spike was attributed to 'other'. Controlled via window.RENDER_OTHER_GUARD.
        const guardOn = !!(typeof window !== 'undefined' && window.RENDER_OTHER_GUARD);
        const guardActive = guardOn && this._otherGuard && this._otherGuard.frames > 0;
        let __appliedOtherGuard = false;
        const now2 = performance.now ? performance.now() : Date.now();
        const inBootRamp = now2 < (this._bootUntil || 0);
        if (!guardActive && !inBootRamp) {
            this.renderMinimap(state);
            if (doProf) pmark('minimap', pnow()-t0);
        } else {
            // Draw a lightweight backdrop + static during boot ramp or guard frames
            try { this.renderMinimapBackgroundOnly(); } catch(_) {}
            __appliedOtherGuard = true; // skip minimap activity this frame
        }
        // TODO(Session 55): TargetCam strict buffer-blit
        // - TargetCamRenderer should maintain a persistent offscreen silhouette buffer
        //   and only blit here each frame. Rebuild/generate the buffer off-render on
        //   target/angle/time thresholds. This call should remain a cheap blit.
        if (this.targetCam) { if (doProf) t0 = pnow(); this.targetCam.render(state); if (doProf) pmark('targetcam', pnow()-t0); }

        // Screen-space HUD overlays
        try {
            if (!guardActive && !inBootRamp) {
                this.hud.updateContext(this.ctx, this.camera, this.screenCenter);
                this.hud.drawPlayerHealth(state);
                // Optional QA build tag (top-right); gated by window.HUD_SHOW_BUILD_TAG
                this.hud.drawBuildTag();
            } else {
                __appliedOtherGuard = true; // skip HUD this frame
            }
        } catch(_) {}

        // Consume one guard frame if we skipped any soft UI draws
        if (__appliedOtherGuard && this._otherGuard && this._otherGuard.frames > 0) {
            this._otherGuard.frames -= 1;
        }

        // Debug: end-of-world render lint
        this.debugRenderLint('end-frame');
        
        // Profiling overlay/log (opt-in)
        if (doProf) {
            // Frame summary
            const totalMs = (typeof performance !== 'undefined' && performance.now) ? 0 : 0; // kept for symmetry
            // Determine worst bucket
            // Attribute unaccounted time to an 'other' bucket to surface hidden work/GC
            try {
                const frameMs = (typeof window !== 'undefined' && window.__lastFrameMs) ? window.__lastFrameMs : 0;
                const sum = Object.values(prof.b).reduce((a,b)=>a+(b||0), 0);
                const other = Math.max(0, frameMs - sum);
                if (other > 0.2) prof.b.other = other; // ignore tiny numerical drift
            } catch(_) {}
            let worstK = null, worstV = -1;
            for (const [k,v] of Object.entries(prof.b)) { if (v > worstV) { worstV = v; worstK = k; } }
            // Log on spikes (default threshold ~20ms)
            const th = Number(window.RENDER_PROF_T || 20);
            const frameMs = (typeof window !== 'undefined' && window.__lastFrameMs) ? window.__lastFrameMs : 0;
            // Derive counts to help attribution
            const counts = {
                npcs: (state.npcShips||[]).length,
                proj: (state.projectiles||[]).length,
                sparks: (state.hitSparks||[]).length,
                flashes: (state.muzzleFlashes||[]).length,
                hits: (state.shieldHits||[]).length,
                expl: (state.explosions||[]).length
            };
            const payload = { frameMs, worldMs: Number(tf_world.toFixed(2)), worst: { [worstK]: Number(worstV.toFixed(2)) }, counts, breakdown: Object.fromEntries(Object.entries(prof.b).map(([k,v])=>[k,Number(v.toFixed(2))])) };
            if ((window.RENDER_PROF_LOG && frameMs > th) || this._prof.armed > 0) {
                // Throttle verbose logs to avoid console spam
                const now = performance.now ? performance.now() : Date.now();
                if (now - (this._prof.lastLogTs||0) > 500) {
                    this._prof.lastLogTs = now;
                    try { console.warn('[RenderProfile]', JSON.parse(JSON.stringify(payload))); } catch(_) { console.warn('[RenderProfile]', payload); }
                    try {
                        const s = `ms:${(frameMs|0)} world:${payload.worldMs} worst:${worstK||'-'}:${(worstV>0?worstV.toFixed(1):'0')} n:${counts.npcs} p:${counts.proj} s:${counts.sparks} f:${counts.flashes} h:${counts.hits} e:${counts.expl}`;
                        console.warn('[RenderProfileStr]', s);
                    } catch(_) {}
                }
            }
            if (window.RENDER_PROF_OVERLAY) {
                try {
                    const ctx = this.ctx;
                    const text = `ms:${frameMs|0} world:${tf_world.toFixed(1)} worst:${worstK||'-'} ${worstV>0?worstV.toFixed(1):'0'} npcs:${counts.npcs} p:${counts.proj}`;
                    withScreen(ctx, () => {
                        ctx.save();
                        ctx.globalAlpha = 0.9;
                        ctx.fillStyle = '#111a';
                        ctx.fillRect(6, 6, ctx.measureText ? (ctx.measureText(text).width + 10) : 140, 14);
                        ctx.fillStyle = '#9cf';
                        ctx.font = '10px VT323, monospace';
                        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                        ctx.fillText(text, 10, 8);
                        ctx.restore();
                    });
                } catch(_) {}
            }
            if (this._prof.armed > 0) this._prof.armed -= 1;

            // Optional: other-spike guard — stride/skip minimap+HUD for N frames
            // when 'other' exceeds threshold. Off by default; enable via
            // window.RENDER_OTHER_GUARD = true. Configure threshold via
            // window.RENDER_OTHER_GUARD_MS (default 12), and frames via
            // window.RENDER_OTHER_GUARD_N (default 1).
            if (guardOn) {
                try {
                    const othTh = Number((typeof window !== 'undefined' && window.RENDER_OTHER_GUARD_MS) || 12);
                    const guardN = Math.max(1, Number((typeof window !== 'undefined' && window.RENDER_OTHER_GUARD_N) || 1));
                    const frameMs2 = (typeof window !== 'undefined' && window.__lastFrameMs) ? window.__lastFrameMs : 0;
                    const sum = Object.values(prof.b).reduce((a,b)=>a+(b||0), 0);
                    const other = Math.max(0, frameMs2 - sum);
                    if (other > othTh) {
                        // Only increase remaining frames; do not stack beyond guardN
                        this._otherGuard.frames = Math.max(this._otherGuard.frames||0, guardN);
                    }
                } catch(_) {}
            }
        }

        // Render touch controls if needed
        if (window.touchControls) {
            window.touchControls.render();
        }
    }

    /**
     * Debug render lint - logs non-default canvas state at stage boundaries
     */
    debugRenderLint(stage = '') {
        try {
            const dbg = (this.stateManager && this.stateManager.state && this.stateManager.state.debug) || {};
            if (!dbg.enabled || !dbg.renderLint) return;
            const issues = [];
            const t = (this.ctx.getTransform) ? this.ctx.getTransform() : null;
            if (t && (t.a !== 1 || t.b !== 0 || t.c !== 0 || t.d !== 1 || t.e !== 0 || t.f !== 0)) {
                issues.push(`non-identity transform a:${t.a},b:${t.b},c:${t.c},d:${t.d},e:${t.e},f:${t.f}`);
            }
            if (typeof this.ctx.globalAlpha === 'number' && this.ctx.globalAlpha !== 1) {
                issues.push(`globalAlpha=${this.ctx.globalAlpha}`);
            }
            if (typeof this.ctx.shadowBlur === 'number' && this.ctx.shadowBlur !== 0) {
                issues.push(`shadowBlur=${this.ctx.shadowBlur}`);
            }
            const comp = this.ctx.globalCompositeOperation || 'source-over';
            if (comp !== 'source-over') {
                issues.push(`composite=${comp}`);
            }
            if (typeof this.ctx.lineWidth === 'number' && this.ctx.lineWidth !== 1) {
                issues.push(`lineWidth=${this.ctx.lineWidth}`);
            }
            if (issues.length) {
                try {
                    // Count and capture last offender info for overlay
                    const st = this.stateManager.state;
                    st.debug.renderLintCount = (st.debug.renderLintCount || 0) + 1;
                    st.debug.renderLintLastStage = stage;
                    const err = new Error('RenderLint offender');
                    st.debug.renderLintLast = {
                        stage,
                        issues: issues.slice(0, 4),
                        at: (performance.now ? performance.now() : Date.now()),
                        stack: (err.stack || '').split('\n').slice(0, 6).join('\n')
                    };
                } catch(_) {}
                const doReset = !!dbg.renderLintReset && !!this.ctx.setTransform;
                if (doReset) {
                    try {
                        this.ctx.setTransform(1,0,0,1,0,0);
                        this.ctx.globalAlpha = 1;
                        this.ctx.shadowBlur = 0;
                        this.ctx.lineWidth = 1;
                        this.ctx.globalCompositeOperation = 'source-over';
                    } catch(_) {}
                }
                if (dbg.renderLintTrace) {
                    console.warn(`[RenderLint:${stage}]`, (doReset? '[AUTO-RESET] ' : '') + issues.join(' | '), new Error('RenderLint trace')); 
                } else {
                    console.warn(`[RenderLint:${stage}]`, (doReset? '[AUTO-RESET] ' : '') + issues.join(' | '));
                }
            }
        } catch (_) {
            // Never throw from lint
        }
    }

    /**
     * Render debris shards and chunks
     */
    renderDebris(state) {
        const debris = state.debris || [];
        if (debris.length === 0) return;
        const viewLeft = this.camera.x - this.screenCenter.x - 100;
        const viewTop = this.camera.y - this.screenCenter.y - 100;
        const viewRight = this.camera.x + this.screenCenter.x + 100;
        const viewBottom = this.camera.y + this.screenCenter.y + 100;
        for (const d of debris) {
            if (d.x < viewLeft || d.x > viewRight || d.y < viewTop || d.y > viewBottom) continue;
            const t = d.lifetime / (d.maxLifetime || 60);
            const alpha = Math.max(0, 1 - t);
            this.ctx.save();
            this.ctx.translate(d.x, d.y);
            this.ctx.rotate(d.angle || 0);
            this.ctx.globalAlpha = alpha;
            if (d.shape === 'poly' && Array.isArray(d.points)) {
                const r = d.size || 6;
                this.ctx.fillStyle = d.color || '#777';
                this.ctx.strokeStyle = '#444';
                // Scale stroke with size to avoid heavy outlines on small chunks (reduced min for smaller debris)
                this.ctx.lineWidth = Math.max(0.3, Math.min(0.9, r * 0.08));
                this.ctx.beginPath();
                for (let i = 0; i < d.points.length; i++) {
                    const a = (Math.PI * 2 / d.points.length) * i;
                    const rad = r * d.points[i];
                    const px = Math.cos(a) * rad;
                    const py = Math.sin(a) * rad;
                    if (i === 0) this.ctx.moveTo(px, py); else this.ctx.lineTo(px, py);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            } else if (d.shape === 'sliver') {
                // Thin molten shard: 2x1 aspect, subtle warm fade
                const w = (d.w || Math.max(2, (d.size || 3) * 2)) | 0;
                const h = (d.h || Math.max(1, (d.size || 3))) | 0;
                // Optional polish toggle; default color fallback when off
                const polish = (typeof window !== 'undefined') && !!window.VFX_DEBRIS_POLISH;
                if (polish) {
                    // Start brighter (orange) and fade toward red/dim as t→1
                    const warm = Math.max(0, 1 - t);
                    const r = Math.floor(255);
                    const g = Math.floor(140 * warm + 60 * (1 - warm));
                    const b = Math.floor(50 * warm + 40 * (1 - warm));
                    this.ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, 0.9 * (1 - t*0.5))})`;
                } else {
                    this.ctx.fillStyle = d.color || '#aa8888';
                }
                this.ctx.fillRect(-w/2, -h/2, w, h);
            } else {
                // shard: tiny triangle
                const s = d.size || 3;
                const polish = (typeof window !== 'undefined') && !!window.VFX_DEBRIS_POLISH;
                if (polish) {
                    // Warm molten fade similar to slivers
                    const warm = Math.max(0, 1 - t);
                    const P = (GameConstants?.EFFECTS?.DEBRIS?.POLISH) || {};
                    const r = (P.WARM_R ?? 255);
                    const g = Math.floor((P.WARM_G?.hi ?? 140) * warm + (P.WARM_G?.lo ?? 60) * (1 - warm));
                    const b = Math.floor((P.WARM_B?.hi ?? 50) * warm + (P.WARM_B?.lo ?? 40) * (1 - warm));
                    const a = Math.min(1, (P.FADE_ALPHA_MAX ?? 0.9) * (1 - t * 0.5));
                    this.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
                } else {
                    this.ctx.fillStyle = d.color || '#aaa';
                }
                this.ctx.beginPath();
                this.ctx.moveTo(s, 0);
                this.ctx.lineTo(-s*0.6, -s*0.5);
                this.ctx.lineTo(-s*0.6, s*0.5);
                this.ctx.closePath();
                this.ctx.fill();
            }
            this.ctx.restore();
        }
    }


    /**
     * Handle shield hit event to spawn a short-lived ring effect
     */
    handleShieldHit(data) {
        try {
            const state = this.stateManager.state;
            if (!state.shieldHits) state.shieldHits = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.shieldHits) state.pools.shieldHits = [];
            const ship = data?.ship || state.ship;
            const fx = state.pools.shieldHits.pop() || {};
            fx.x = ship.x; fx.y = ship.y;
            fx.radius = (ship.size || 10) * 2.2;
            fx.lifetime = 0;
            fx.maxLifetime = 14;
            fx.color = '#66e0ff';
            // Soft-cap
            if (state.shieldHits.length > 24) {
                const old = state.shieldHits.shift();
                if (old) state.pools.shieldHits.push(old);
            }
            state.shieldHits.push(fx);
        } catch (e) {
            // no-op
        }
    }

    /**
     * Render shield hit rings
     */
    renderShieldHits(state) {
        const hits = state.shieldHits || [];
        if (hits.length === 0) return;
        const heavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        const stride = (heavy || (this.quality === 'low' && hits.length > 30)) ? 2 : 1;
        const viewLeft = this.camera.x - this.screenCenter.x - 100;
        const viewTop = this.camera.y - this.screenCenter.y - 100;
        const viewRight = this.camera.x + this.screenCenter.x + 100;
        const viewBottom = this.camera.y + this.screenCenter.y + 100;
        for (let i = 0; i < hits.length; i += stride) {
            const fx = hits[i];
            if (fx.x < viewLeft || fx.x > viewRight || fx.y < viewTop || fx.y > viewBottom) continue;
            const t = fx.lifetime / fx.maxLifetime;
            const alpha = Math.max(0, 1 - t);
            const r = fx.radius * (1 + t * 0.4);
            this.ctx.save();
            this.ctx.strokeStyle = fx.color || '#66e0ff';
            this.ctx.globalAlpha = alpha * 0.8;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
    
    /**
     * Clear canvas with background gradient
     */
    clearCanvas() {
        // Cache a 1xH vertical gradient and scale blit it to avoid reconstructing every frame
        try {
            if (!this._bgGrad.canvas || this._bgGrad.h !== this.canvas.height) {
                const gc = document.createElement('canvas');
                gc.width = 1; gc.height = this.canvas.height;
                const gctx = gc.getContext('2d');
                const grad = gctx.createLinearGradient(0, 0, 0, gc.height);
                grad.addColorStop(0, '#000011');
                grad.addColorStop(1, '#000000');
                gctx.fillStyle = grad;
                gctx.fillRect(0, 0, 1, gc.height);
                this._bgGrad.canvas = gc; this._bgGrad.h = this.canvas.height;
            }
            this.ctx.drawImage(this._bgGrad.canvas, 0, 0, 1, this._bgGrad.h, 0, 0, this.canvas.width, this.canvas.height);
            return;
        } catch(_) {}
        // Fallback if offscreen fails
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000011');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Render simple debug overlays (hitboxes, vectors, npc info)
     */
    renderDebug(state) {
        const dbg = state.debug || {};
        if (!dbg.enabled) return;
        this.ctx.save();
        // World-space overlays already drawn due to camera transform earlier
        if (dbg.drawHitboxes) {
            // Ship
            if (!state.ship.isDestroyed) {
                this.ctx.strokeStyle = '#0ff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(state.ship.x, state.ship.y, state.ship.size, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            // NPCs
            for (const npc of state.npcShips || []) {
                this.ctx.strokeStyle = npc.behavior === 'aggressive' ? '#f44' : (npc.behavior === 'lawful' ? '#4af' : '#aaa');
                this.ctx.beginPath();
                this.ctx.arc(npc.x, npc.y, npc.size, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            // Asteroids
            for (const a of state.asteroids || []) {
                this.ctx.strokeStyle = '#666';
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        if (dbg.drawVectors) {
            // Velocity vectors for ship and NPCs
            const drawVec = (x, y, vx, vy, color) => {
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + vx * 20, y + vy * 20);
                this.ctx.stroke();
            };
            drawVec(state.ship.x, state.ship.y, state.ship.vx, state.ship.vy, '#0f0');
            for (const npc of state.npcShips || []) {
                drawVec(npc.x, npc.y, npc.vx, npc.vy, '#ff0');
            }
        }
        if (dbg.showProjInfo) {
            // Draw projectile lifetime bars
            for (const proj of state.projectiles || []) {
                const max = (proj.type === 'rapid') ? 45 : (proj.type === 'plasma') ? 80 : 60;
                const t = Math.min(1, (proj.lifetime || 0) / max);
                const len = 12;
                this.ctx.strokeStyle = proj.isPlayer ? '#0ff' : '#f80';
                this.ctx.beginPath();
                this.ctx.moveTo(proj.x, proj.y);
                this.ctx.lineTo(proj.x - proj.vx * (len/5) * (1-t), proj.y - proj.vy * (len/5) * (1-t));
                this.ctx.stroke();
            }
            // Floating damage numbers
            const dnums = (state.debug && state.debug.damageNumbers) || [];
            this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'center';
            for (const dn of dnums) {
                const alpha = Math.max(0, 1 - dn.life / dn.max);
                this.ctx.fillStyle = `rgba(255,220,120,${alpha})`;
                this.ctx.fillText(`-${dn.amount}`, dn.x, dn.y);
            }
        }
        if (dbg.drawNPCInfo) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'left';
            for (const npc of state.npcShips || []) {
                const info = `${npc.type}/${npc.behavior} hp:${Math.max(0, Math.round(npc.health))} cd:${Math.max(0, Math.round(npc.weaponCooldown||0))}`;
                this.ctx.fillText(info, npc.x + npc.size + 6, npc.y - npc.size - 6);
            }
        }
        this.ctx.restore();
    }
    
    /**
     * Render nebula background
     */
    renderNebula() {
        // Only draw nebula on high quality; it uses large radial gradients
        if (this.quality !== 'high') return;
        
        this.ctx.globalAlpha = 0.03;
        
        // Purple nebula cloud
        const nebulaGradient1 = this.ctx.createRadialGradient(
            -this.camera.x * 0.05 + 200, -this.camera.y * 0.05 - 300, 100,
            -this.camera.x * 0.05 + 200, -this.camera.y * 0.05 - 300, 600
        );
        nebulaGradient1.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
        nebulaGradient1.addColorStop(0.5, 'rgba(100, 50, 200, 0.2)');
        nebulaGradient1.addColorStop(1, 'transparent');
        this.ctx.fillStyle = nebulaGradient1;
        this.ctx.fillRect(-2000, -2000, 4000, 4000);
        
        // Blue nebula cloud
        const nebulaGradient2 = this.ctx.createRadialGradient(
            -this.camera.x * 0.05 - 500, -this.camera.y * 0.05 + 400, 150,
            -this.camera.x * 0.05 - 500, -this.camera.y * 0.05 + 400, 800
        );
        nebulaGradient2.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
        nebulaGradient2.addColorStop(0.5, 'rgba(50, 100, 200, 0.15)');
        nebulaGradient2.addColorStop(1, 'transparent');
        this.ctx.fillStyle = nebulaGradient2;
        this.ctx.fillRect(-2000, -2000, 4000, 4000);
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render parallax star layers
     */
    renderStars() {
        const state = this.stateManager.state;
        if (!state.stars) return;
        if (this._starBootSkip > 0) { this._starBootSkip -= 1; return; }
        const tick = (this._starTick = (this._starTick + 1) & 1);
        const q = this.quality;
        // Far stars (minimal parallax)
        if (q !== 'low') for (let star of state.stars.far || []) {
            const screenX = star.x - this.camera.x * 0.05;
            const screenY = star.y - this.camera.y * 0.05;
            
            // Wrap stars for infinite field (double-mod keeps negative coords in range;
            // JS % is sign-preserving, so a single mod left far-negative stars unwrapped)
            const wrappedX = ((((screenX + 6000) % 12000) + 12000) % 12000) - 6000;
            const wrappedY = ((((screenY + 6000) % 12000) + 12000) % 12000) - 6000;
            
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillStyle = star.color || '#ffffff';
            
            if (star.size > 2 && q === 'high') {
                this.ctx.shadowColor = star.color || '#ffffff';
                this.ctx.shadowBlur = star.size;
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            }
        }
        
        // Mid stars with twinkling — draw every frame for consistency across quality (except low)
        if (q !== 'low') for (let star of state.stars.mid || []) {
            const screenX = star.x - this.camera.x * 0.2;
            const screenY = star.y - this.camera.y * 0.2;
            
            const wrappedX = ((((screenX + 4000) % 8000) + 8000) % 8000) - 4000;
            const wrappedY = ((((screenY + 4000) % 8000) + 8000) % 8000) - 4000;
            
            // Twinkling effect
            star.twinkle += star.twinkleSpeed || 0.02;
            const twinkle = Math.sin(star.twinkle) * 0.1 + 0.9;
            
            this.ctx.globalAlpha = star.brightness * twinkle;
            this.ctx.fillStyle = star.color || '#ffffff';
            this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
        }
        
        // Near stars — draw every frame for consistency across quality (except low)
        if (q !== 'low') for (let star of state.stars.near || []) {
            const screenX = star.x - this.camera.x * 0.4;
            const screenY = star.y - this.camera.y * 0.4;
            
            const wrappedX = ((((screenX + 3000) % 6000) + 6000) % 6000) - 3000;
            const wrappedY = ((((screenY + 3000) % 6000) + 6000) % 6000) - 3000;
            
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillStyle = star.color || '#ffffff';
            
            if (star.size > 1 && q === 'high') {
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 2;
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render planets
     */
    renderPlanets(state) {
        // Get planets from state
        const planets = state.planets || [];
        const heavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        // View frustum for simple culling
        const vx0 = this.camera.x - this.screenCenter.x - 200;
        const vy0 = this.camera.y - this.screenCenter.y - 200;
        const vx1 = this.camera.x + this.screenCenter.x + 200;
        const vy1 = this.camera.y + this.screenCenter.y + 200;
        
        for (let planet of planets) {
            // Cull planets far off-screen (with generous margin)
            const pad = (planet.radius || 60) * 1.2;
            if ((planet.x + pad) < vx0 || (planet.x - pad) > vx1 || (planet.y + pad) < vy0 || (planet.y - pad) > vy1) {
                continue;
            }
            // Renderer-agnostic readiness and async prep
            const ready = (typeof this.planetRenderer.isReady === 'function')
                ? this.planetRenderer.isReady(planet)
                : (this.planetRenderer.planetCache?.has(planet.name) || false);
            if (!ready) {
                if (!this._pendingPlanets.has(planet.name)) {
                    this._pendingPlanets.add(planet.name);
                    setTimeout(() => {
                        try {
                            if (typeof this.planetRenderer.prepareAsync === 'function') {
                                this.planetRenderer.prepareAsync(planet);
                            } else {
                                this.planetRenderer.generateProceduralPlanet(planet);
                            }
                        } finally { this._pendingPlanets.delete(planet.name); }
                    }, 0);
                }
                continue; // skip drawing until ready
            }
            this.planetRenderer.renderPlanet(this.ctx, planet, Date.now());
            
            // Planet name (skip in boot ramp; skip on heavy frames; avoid blur unless high quality)
            this.ctx.save();
            const now = performance.now ? performance.now() : Date.now();
            if (now >= (this._bootUntil || 0) && !heavy && this.quality === 'high') {
                this.ctx.shadowColor = planet.color;
                this.ctx.shadowBlur = (GameConstants?.UI?.PLANET_NAME_SHADOW_BLUR ?? 8);
            } else {
                this.ctx.shadowBlur = 0;
            }
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.max(12, planet.radius / 8)}px 'Orbitron', monospace`;
            this.ctx.textAlign = 'center';
            if (now >= (this._bootUntil || 0)) {
                const off = (GameConstants?.UI?.PLANET_NAME_OFFSET ?? 25);
                this.ctx.fillText(planet.name.toUpperCase(), planet.x, planet.y - planet.radius - off);
            }
            
            // Distance indicator when nearby
            const dx = state.ship.x - planet.x;
            const dy = state.ship.y - planet.y;
            const distToPlanet = MathUtils.distance(state.ship.x, state.ship.y, planet.x, planet.y);
            
            if (now >= (this._bootUntil || 0) && !heavy && this.quality !== 'low') {
                if (distToPlanet < planet.radius * 3 && distToPlanet > planet.radius + (GameConstants?.SHIP?.LANDING_DISTANCE ?? 50)) {
                    this.ctx.shadowBlur = 0;
                    this.ctx.font = '10px "JetBrains Mono", monospace';
                    this.ctx.fillStyle = planet.color;
                    const displayDist = Math.round(distToPlanet - planet.radius);
                    const doff = (GameConstants?.UI?.PLANET_DISTANCE_OFFSET ?? 10);
                    this.ctx.fillText(`[ ${displayDist} ]`, planet.x, planet.y - planet.radius - doff);
                }
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * Render asteroids
     */
    renderAsteroids(state) {
        const asteroids = state.asteroids || [];
        
        for (let asteroid of asteroids) {
            this.ctx.save();
            this.ctx.translate(asteroid.x, asteroid.y);
            
            // Rotation
            if (!asteroid.rotation) asteroid.rotation = 0;
            asteroid.rotation += asteroid.rotationSpeed || 0;
            this.ctx.rotate(asteroid.rotation);
            
            // Color based on damage
            const damage = 1 - (asteroid.health / asteroid.maxHealth);
            const r = 102 + Math.floor(damage * 100);
            this.ctx.fillStyle = `rgb(${r}, 102, 102)`;
            this.ctx.strokeStyle = `rgb(${Math.min(r + 30, 255)}, 102, 102)`;
            this.ctx.lineWidth = 1;
            
            // Generate shape points if missing
            if (!asteroid.shapePoints) {
                asteroid.shapePoints = [];
                for (let j = 0; j < 8; j++) {
                    asteroid.shapePoints.push(0.7 + Math.random() * 0.6);
                }
            }
            
            // Draw irregular shape
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const variance = asteroid.shapePoints[i];
                const r = asteroid.radius * variance;
                if (i === 0) {
                    this.ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                } else {
                    this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    /**
     * Render pickups
     */
    renderPickups(state) {
        const pickups = state.pickups || [];
        // Frustum cull to avoid off-screen gradients
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;
        const heavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        const PC = (GameConstants?.EFFECTS?.PICKUPS) || {};
        const ORE = PC.ORE || { CORE_RADIUS: 2, GLOW_RADIUS: 5, GLITTER_HALF: 3, GLITTER_ALPHA: 0.6, GLITTER_LINE_WIDTH: 0.8 };
        const CRED = PC.CREDITS || { CORE_RADIUS: 2, GLOW_RADIUS: 5 };
        const TWINKLE_SPD = (PC.TWINKLE_SPEED ?? 0.02);
        const TWINKLE_POS = (PC.TWINKLE_POS_MIX ?? 0.01);

        for (let pickup of pickups) {
            if (pickup.x < viewLeft || pickup.x > viewRight || pickup.y < viewTop || pickup.y > viewBottom) continue;
            const tnow = Date.now();
            const pulse = Math.sin(tnow * (GameConstants?.EFFECTS?.PICKUP_PULSE_SPEED ?? 0.008)) * 0.3 + 0.7;
            const twinkle = 0.5 + 0.5 * Math.sin((pickup._twk || 0) + tnow * TWINKLE_SPD + (pickup.x + pickup.y) * TWINKLE_POS);
            // Lazily seed sparkle phase to avoid sync
            if (pickup._twk === undefined) pickup._twk = Math.random() * Math.PI * 2;
            if (this.quality === 'low' || heavy) {
                // Simple core only for low quality (smaller size)
                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = pickup.type === 'ore' ? '#bbbbbb' : '#ffd700';
                this.ctx.beginPath();
                const coreR = pickup.type === 'ore' ? (ORE.CORE_RADIUS||2) : (CRED.CORE_RADIUS||2);
                this.ctx.arc(pickup.x, pickup.y, coreR, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Glow effect — reduced size (≈1/3), plus subtle glitter
                const glowGradient = this.ctx.createRadialGradient(
                    pickup.x, pickup.y, 0,
                    pickup.x, pickup.y, (pickup.type === 'ore' ? (ORE.GLOW_RADIUS||5) : (CRED.GLOW_RADIUS||5))
                );
                if (pickup.type === 'ore') {
                    glowGradient.addColorStop(0, 'rgba(200, 200, 200, 0.8)');
                    glowGradient.addColorStop(1, 'transparent');
                } else {
                    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
                    glowGradient.addColorStop(1, 'transparent');
                }
                this.ctx.globalAlpha = pulse;
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                const glowR = pickup.type === 'ore' ? (ORE.GLOW_RADIUS||5) : (CRED.GLOW_RADIUS||5);
                this.ctx.arc(pickup.x, pickup.y, glowR, 0, Math.PI * 2);
                this.ctx.fill();
                // Core
                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = pickup.type === 'ore' ? '#dddddd' : '#ffd700';
                this.ctx.beginPath();
                const coreR2 = pickup.type === 'ore' ? (ORE.CORE_RADIUS||2) : (CRED.CORE_RADIUS||2);
                this.ctx.arc(pickup.x, pickup.y, coreR2, 0, Math.PI * 2);
                this.ctx.fill();
                // Glitter cross (tiny star) — alpha varies with twinkle
                if (pickup.type === 'ore') {
                    this.ctx.save();
                    this.ctx.globalAlpha = (ORE.GLITTER_ALPHA ?? 0.6) * twinkle;
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = (ORE.GLITTER_LINE_WIDTH ?? 0.8);
                    this.ctx.beginPath();
                    const h = (ORE.GLITTER_HALF ?? 3);
                    this.ctx.moveTo(pickup.x - h, pickup.y);
                    this.ctx.lineTo(pickup.x + h, pickup.y);
                    this.ctx.moveTo(pickup.x, pickup.y - h);
                    this.ctx.lineTo(pickup.x, pickup.y + h);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }
    }
    
    /**
     * Render NPC ships
     */
    renderNPCs(state) {
        const npcShips = state.npcShips || [];
        const canUseSprites = !!(state.renderSettings && state.renderSettings.useSprites && state.assets && state.assets.ready);
        // Gentle culling with a large margin (opt-in)
        const enableCulling = !!(state.renderSettings && state.renderSettings.spriteCulling);
        const margin = 240;
        const viewLeft = this.camera.x - this.screenCenter.x - margin;
        const viewTop = this.camera.y - this.screenCenter.y - margin;
        const viewRight = this.camera.x + this.screenCenter.x + margin;
        const viewBottom = this.camera.y + this.screenCenter.y + margin;
        for (let npc of npcShips) {
            const visScale = (this.getTypeScale(npc.type) || 1.4) * this.sizeMultiplier;
            const pad = (npc.size || 10) * visScale * 1.8;
            if (enableCulling && (npc.x + pad < viewLeft || npc.x - pad > viewRight || npc.y + pad < viewTop || npc.y - pad > viewBottom)) continue;
            this.ctx.save();
            try {
                this.ctx.translate(npc.x, npc.y);
                this.ctx.rotate(npc.angle);
                // Upscale NPCs based on type for clearer silhouettes
                const npcScale = this.getTypeScale(npc.type) || 1.4;
                // Apply outer scale only for vector path; sprite path sizes by pixels
                if (!canUseSprites) this.ctx.scale(npcScale * this.sizeMultiplier, npcScale * this.sizeMultiplier);

            // Engine thrust effect (suppressed during death sequence)
            if (this.showEffects && npc.thrusting && !npc.deathSeq) {
                const isActive = !!npc.thrusting;
                const heavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
                            const typeScale = (this.getTypeScale(npc.type) || 1.4) * this.sizeMultiplier;
                // Keep physical exhaust size consistent across sprite/vector paths:
                // - Vector path: context is scaled already -> don't multiply lengths again.
                // - Sprite path: no outer scale -> apply typeScale.
                const outerScaleApplied = !canUseSprites; // true when vector path is active
                const scaleComp = outerScaleApplied ? 1 : typeScale;
                const len = Math.max(12, npc.size * (isActive ? 1.8 : 1.2)) * scaleComp; // length
                const halfW = Math.max(1.5, (isActive ? 3 : 2)) * scaleComp; // width
                // Use gradient on high and medium to avoid early-session pop
                if (!heavy && this.quality !== 'low') {
                    const flicker = Math.random();
                    const g = this.ctx.createLinearGradient(-len, 0, 0, 0);
                    g.addColorStop(0, 'transparent');
                    if (!isActive) {
                        const spd = Math.hypot(npc.vx || 0, npc.vy || 0);
                        const idle = Math.max(0.08, Math.min(0.35, (spd * 0.6)));
                        g.addColorStop(0.6, `rgba(255, 120, 40, ${0.18 * idle})`);
                        g.addColorStop(1, `rgba(255, 200, 80, ${0.35 * idle})`);
                    } else {
                        g.addColorStop(0.55, `rgba(255, 120, 40, ${0.45 * flicker + 0.35})`);
                        g.addColorStop(1, `rgba(255, 220, 100, ${0.8 * flicker + 0.2})`);
                    }
                    this.ctx.fillStyle = g;
                } else {
                    // Solid, cheaper fallback
                    this.ctx.fillStyle = isActive ? 'rgba(255,180,90,0.6)' : 'rgba(255,160,80,0.35)';
                }
                this.ctx.beginPath();
                this.ctx.moveTo(-len, 0);
                this.ctx.lineTo(0, -halfW);
                this.ctx.lineTo(0, halfW);
                this.ctx.closePath();
                this.ctx.fill();
                // Optional sprite-based flame overlay if effects atlas is available (NPC overlay remains opt-in)
                if (state.renderSettings && state.renderSettings.useEffectsSprites && state.renderSettings.useEffectsSpritesNPC) {
                    try {
                        const effects = state.assets?.atlases?.effects;
                        if (effects?.image) {
                            const baseTarget = Math.max(10, npc.size * 1.2) * this.sizeMultiplier;
                            const typeScale = this.getTypeScale(npc.type) || 1.4;
                            const outerComp = canUseSprites ? 1 : (typeScale * this.sizeMultiplier);
                            this.thrusterFX.draw(this.ctx, effects, this.quality, {
                                offsetX: -npc.size,
                                offsetY: 0,
                                baseTarget,
                                outerScaleComp: outerComp
                            });
                        }
                    } catch(_) {}
                }
            }

                // Ship body (with destruct pre-explosion effect)
                const seq = npc.deathSeq;
                if (seq) {
                const now = performance.now ? performance.now() : Date.now();
                const t = Math.min(1, (now - seq.start) / (seq.duration || 450));
                // Pulsing white core and flicker before destruction
                const pulse = 0.5 + 0.5 * Math.sin(now * 0.025);
                // Hide sprite as soon as death event is emitted, or in the last part of the sequence
                const hideNow = !!npc.deathEventEmitted;
                if (t < 0.6 && !hideNow) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.6 * (1 - t) + 0.4 * pulse;
                    this.renderNPCShip(npc);
                    this.ctx.restore();
                }
                // Overheat glow
                const glowR = npc.size * (1.2 + t * 1.8) * (this.getTypeScale(npc.type) || 1.4) * this.sizeMultiplier;
                const gg = this.ctx.createRadialGradient(0, 0, glowR * 0.1, 0, 0, glowR);
                gg.addColorStop(0, `rgba(255,255,255,${0.5 * (1 - t)})`);
                gg.addColorStop(0.3, `rgba(255,200,80,${0.35 * (1 - t)})`);
                gg.addColorStop(1, 'transparent');
                this.ctx.fillStyle = gg;
                this.ctx.beginPath(); this.ctx.arc(0, 0, glowR, 0, Math.PI*2); this.ctx.fill();
                } else {
                this.renderNPCShip(npc);
                }
            } finally {
                // Always restore per-NPC to avoid transform leaks
                this.ctx.restore();
            }

            // Faction/hostility brackets (screen-space corner brackets around hostiles)
            const selectedId = (this.stateManager.state.targeting && this.stateManager.state.targeting.selectedId) || null;
            const isTargeted = selectedId && npc.id === selectedId;
            if (isTargeted) {
                const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
                this.hud.drawFactionBracket(npc, (this.getTypeScale(npc.type) || 1.4) * this.sizeMultiplier, true, palette.accent || '#ff4444');
            }
            
            // State indicator icon
            if (npc.state) {
                this.hud.drawNPCStateIndicator(npc);
            }
            
            // Communication bubble
            if (npc.message && npc.messageTime) {
                this.hud.drawNPCMessage(npc);
            }
            
            // Health bar
            if (npc.health < npc.maxHealth) { this.hud.drawNPCHealth(npc); }
        }
    }

    
    
    /**
     * Render specific NPC ship type
     */
    renderNPCShip(npc) {
        // Try sprite render if enabled and assets are ready
        if ((this.stateManager.state.renderSettings && this.stateManager.state.renderSettings.useSprites) && (this.stateManager.state.assets && this.stateManager.state.assets.ready)) {
            const assets = this.stateManager.state.assets;
            const spriteId = npc.spriteId || typeToSpriteId[npc.type] || 'ships/pirate_0';
            // For sprites, we are not applying outer scale in renderNPCs
            let drew = false;
            const has = !!(assets.sprites && assets.sprites[spriteId]);
            this._dbgLog('npc-try-'+spriteId, '[RenderSystem] NPC try', npc.type, '->', spriteId, 'hasPNG', has);
            // Prefer standalone sprite image if available and ready
            const sprite = assets.sprites && assets.sprites[spriteId];
            if (sprite && sprite.image) {
                const img = sprite.image;
                if (img.complete && (img.naturalWidth || img.width)) {
                    const sw = sprite.w || img.naturalWidth || img.width;
                    const sh = sprite.h || img.naturalHeight || img.height;
                    // Match silhouette scale: include type scale and global multiplier
                    const npcScale = this.getTypeScale(npc.type) || 1.4;
                    // Keep sprite physical size independent of quality to avoid pop after boot ramp
                    const target = Math.max(12, npc.size * 2.0 * npcScale) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try {
                        const per = this.spriteOrientationOverrides[spriteId] || 0;
                        this.ctx.rotate(this.spriteRotationOffset + per);
                        this.ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
                        this._dbgLog('npc-sprite-'+spriteId, '[RenderSystem] NPC sprite', spriteId, 'dw/dh', dw|0, dh|0);
                        drew = true;
                    } catch(e) { if (window.DEBUG_SPRITES === 'verbose') console.log('[RenderSystem] NPC drawImage error', spriteId, e, 'sw/sh', sw, sh, 'dw/dh', dw, dh); }
                    finally { this.ctx.restore(); }
                }
            }
            // Fallback to placeholder atlas frame (with alias to existing demo frames)
            if (!drew) {
                const atlas = assets.atlases && assets.atlases.placeholder;
                let frame = atlas && atlas.frames && atlas.frames[spriteId];
                let aliasUsed = false;
                if (!frame && atlas && atlas.frames) {
                    const alias = {
                        'ships/pirate_0': 'ships/raider_0',
                        'ships/interceptor_0': 'ships/raider_0',
                        'ships/patrol_0': 'ships/trader_0',
                        'ships/freighter_0': 'ships/trader_0',
                        'ships/shuttle_0': 'ships/trader_0'
                    };
                    const alt = alias[spriteId];
                    if (alt && atlas.frames[alt]) { frame = atlas.frames[alt]; aliasUsed = true; }
                }
                if (atlas && frame && atlas.image && (atlas.image.complete || atlas.image.naturalWidth || atlas.image.width)) {
                    const sw = frame.w, sh = frame.h;
                    const npcScale2 = this.getTypeScale(npc.type) || 1.4;
                    const target = Math.max(12, npc.size * 2.0 * npcScale2) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try {
                        const per = this.spriteOrientationOverrides[spriteId] || 0;
                        this.ctx.rotate(this.spriteRotationOffset + per);
                        this.ctx.drawImage(atlas.image, frame.x, frame.y, sw, sh, -dw/2, -dh/2, dw, dh);
                        this._dbgLog('npc-atlas-'+spriteId, '[RenderSystem] NPC atlas sprite', spriteId, 'aliasUsed', aliasUsed);
                        drew = true;
                    } catch(e) { if (window.DEBUG_SPRITES === 'verbose') console.log('[RenderSystem] NPC atlas drawImage error', spriteId, e, 'image=', atlas.image); }
                    finally { this.ctx.restore(); }
                }
            }
            // Last chance: direct image load via path cache
            if (!drew) {
                const direct = this.getOrLoadSprite(spriteId);
                if (direct && direct.complete && (direct.naturalWidth || direct.width)) {
                    const sw = direct.naturalWidth || direct.width;
                    const sh = direct.naturalHeight || direct.height;
                    const npcScale3 = this.getTypeScale(npc.type) || 1.4;
                    const target = Math.max(12, npc.size * 2.0 * npcScale3) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try { const per = (this.spriteOrientationOverrides[spriteId] || 0); this.ctx.rotate(this.spriteRotationOffset + per); this.ctx.drawImage(direct, -dw/2, -dh/2, dw, dh); drew = true; } catch(_) {}
                    finally { this.ctx.restore(); }
                }
            }
            // If no sprite drawn, fall through to vector silhouette
            if (drew) return;
        }
        // Unified ship designs per type (vector fallback)
        const typeToDesign = {
            freighter: 'hauler',
            pirate: 'raider',
            patrol: 'wing',
            trader: 'oval',
            interceptor: 'dart',
        };
        const design = typeToDesign[npc.type] || 'delta';
        const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
        // If sprites are active but did not draw, apply local scale for consistent size
        const spritesActive = !!(this.stateManager.state.renderSettings && this.stateManager.state.renderSettings.useSprites && this.stateManager.state.assets && this.stateManager.state.assets.ready);
        const npcScale = this.getTypeScale(npc.type) || 1.4;
        if (spritesActive) this.ctx.save(), this.ctx.scale(npcScale, npcScale);
        ShipDesigns.draw(this.ctx, design, npc.size, palette);
        FactionVisuals.drawDecals(this.ctx, npc.faction || 'civilian', npc.size);
        if (spritesActive) this.ctx.restore();
    }
    
    /**
     * Render projectiles
     */
    renderProjectiles(state) {
        const projectiles = state.projectiles || [];
        const viewLeft = this.camera.x - this.screenCenter.x - 100;
        const viewTop = this.camera.y - this.screenCenter.y - 100;
        const viewRight = this.camera.x + this.screenCenter.x + 100;
        const viewBottom = this.camera.y + this.screenCenter.y + 100;

        for (let proj of projectiles) {
            // Frustum cull projectiles outside the viewport with margin
            if (proj.x < viewLeft || proj.x > viewRight || proj.y < viewTop || proj.y > viewBottom) continue;
            // Trail effect
            let seg = Math.max(3, Math.min(12, proj.trailLen || 5));
            const heavy = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
            if (this.quality === 'low' || heavy) seg = Math.min(seg, 5);
            const trailGradient = this.ctx.createLinearGradient(
                proj.x - proj.vx * seg, proj.y - proj.vy * seg,
                proj.x, proj.y
            );
            
            // Color based on type
            let color = '#ffff00';
            if (proj.type === 'plasma') {
                color = '#00ffff';
            } else if (proj.type === 'rapid') {
                color = '#ff8800';
            } else if (proj.type === 'mining') {
                color = '#888888';
            }
            
            trailGradient.addColorStop(0, 'transparent');
            trailGradient.addColorStop(1, color);
            
            this.ctx.strokeStyle = trailGradient;
            this.ctx.lineWidth = Math.max(1.2, Math.min(heavy ? 3 : 4, proj.trailWidth || 3));
            this.ctx.beginPath();
            this.ctx.moveTo(proj.x - proj.vx * seg, proj.y - proj.vy * seg);
            this.ctx.lineTo(proj.x, proj.y);
            this.ctx.stroke();
            
            // Core with glow
            if (this.quality !== 'low') {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 5;
            }
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.type === 'plasma' ? 4 : 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }
    
    /**
     * Render player ship
     */
    renderShip(state) {
        const ship = state.ship;
        
        // Don't render if destroyed
        if (ship.isDestroyed) return;
        
        this.ctx.save();
        this.ctx.translate(ship.x, ship.y);
        this.ctx.rotate(ship.angle);
        // Apply outer scale only for vector path; sprite path sizes by pixels
        const playerOuterScale = 1.6 * this.sizeMultiplier;
        const spritesOnPlayer = !!(this.stateManager.state.renderSettings && this.stateManager.state.renderSettings.useSprites && this.stateManager.state.assets && this.stateManager.state.assets.ready);
        if (!spritesOnPlayer) this.ctx.scale(playerOuterScale, playerOuterScale);
        
        // Engine thrust effect
        // Check if thrust keys are pressed (handle proxy-wrapped Set)
        let isThrusting = false;
        try {
            const keys = state.input?.keys;
            if (keys) {
                // Convert to array to avoid proxy issues with Set methods
                const keyArray = Array.from(keys);
                isThrusting = keyArray.includes('w') || keyArray.includes('arrowup');
            }
        } catch (e) {
            // Silently fail if there's an issue with key checking
        }
        
        // Suppress thrust FX during player death sequence
        if (isThrusting && !state.ship.deathSeq) {
            if (this.showEffects) {
                const flicker = Math.random();
                const thrustGradient = this.ctx.createLinearGradient(
                    -ship.size - 15, 0,
                    -ship.size, 0
                );
                const fxOn = !!(this.stateManager.state.renderSettings && this.stateManager.state.renderSettings.useEffectsSprites);
                thrustGradient.addColorStop(0, 'transparent');
                // Keep vector thrust visible even when FX is on; minor reduction only
                const mult = fxOn ? 0.5 : 0.6;
                thrustGradient.addColorStop(0.4, `rgba(100, 150, 255, ${mult * 0.5 * flicker})`);
                thrustGradient.addColorStop(0.7, `rgba(150, 200, 255, ${mult * 1.0 * flicker})`);
                thrustGradient.addColorStop(1, `rgba(255, 255, 255, ${mult * 1.5 * flicker})`);
                
                this.ctx.fillStyle = thrustGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(-ship.size - 15 - Math.random() * 7, 0);
                this.ctx.lineTo(-ship.size, -4);
                this.ctx.lineTo(-ship.size, 4);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        // Shield effect
        if (ship.shield > 0 && this.showEffects) {
            const shieldAlpha = Math.min(0.3, ship.shield / ship.maxShield);
            const shieldGradient = this.ctx.createRadialGradient(
                0, 0, ship.size,
                0, 0, ship.size * 2
            );
            shieldGradient.addColorStop(0, `rgba(0, 200, 255, ${shieldAlpha})`);
            shieldGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = shieldGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ship.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Ship body (sprite-first, fallback to vector design system)
        let drewSprite = false;
        const rs = this.stateManager.state.renderSettings;
        const assets = this.stateManager.state.assets;
        if (rs && rs.useSprites && assets && assets.ready) {
            // Map ship class to sprite id
            const classMap = { interceptor:'ships/interceptor_0', freighter:'ships/freighter_0', trader:'ships/trader_0', patrol:'ships/patrol_1', pirate:'ships/pirate_0', shuttle:'ships/shuttle_0' };
            const spriteId = state.ship.spriteId || classMap[state.ship.class] || 'ships/trader_0';
            const has = !!(assets.sprites && assets.sprites[spriteId]);
            this._dbgLog('player-try', '[RenderSystem] Player try', state.ship.class, '->', spriteId, 'hasPNG', has);
            // Prefer standalone sprite
            const sprite = assets.sprites && assets.sprites[spriteId];
            if (sprite && sprite.image) {
                const img = sprite.image;
                if (img.complete && (img.naturalWidth || img.width)) {
                    const sw = sprite.w || img.naturalWidth || img.width;
                    const sh = sprite.h || img.naturalHeight || img.height;
                    const playerOuterScaleEffective = 1.6; // match silhouette base
                    const target = Math.max(12, ship.size * 2.0 * playerOuterScaleEffective) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try {
                        const per = this.spriteOrientationOverrides[spriteId] || 0;
                        this.ctx.rotate(this.spriteRotationOffset + per);
                        this.ctx.drawImage(img, -dw/2, -dh/2, dw, dh);
                        this._dbgLog('player-sprite', '[RenderSystem] Player sprite', spriteId, 'dw/dh', dw|0, dh|0);
                        drewSprite = true;
                    } catch(e) { if (window.DEBUG_SPRITES === 'verbose') console.log('[RenderSystem] Player drawImage error', spriteId, e, 'sw/sh', sw, sh, 'dw/dh', dw, dh); }
                    finally { this.ctx.restore(); }
                }
            }
            // Fallback to placeholder atlas
            if (!drewSprite) {
                const atlas = assets.atlases && assets.atlases.placeholder;
                let frame = atlas && atlas.frames && atlas.frames[spriteId];
                if (!frame && atlas && atlas.frames) {
                    const alias = {
                        'ships/pirate_0': 'ships/raider_0',
                        'ships/interceptor_0': 'ships/raider_0',
                        'ships/patrol_0': 'ships/trader_0',
                        'ships/freighter_0': 'ships/trader_0',
                        'ships/shuttle_0': 'ships/trader_0'
                    };
                    const alt = alias[spriteId];
                    if (alt && atlas.frames[alt]) frame = atlas.frames[alt];
                }
                if (atlas && frame && atlas.image && (atlas.image.complete || atlas.image.naturalWidth || atlas.image.width)) {
                    const sw = frame.w, sh = frame.h;
                    const playerOuterScaleEffective2 = 1.6;
                    const target = Math.max(12, ship.size * 2.0 * playerOuterScaleEffective2) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try {
                        const per = this.spriteOrientationOverrides[spriteId] || 0;
                        this.ctx.rotate(this.spriteRotationOffset + per);
                        this.ctx.drawImage(atlas.image, frame.x, frame.y, sw, sh, -dw/2, -dh/2, dw, dh);
                        this._dbgLog('player-atlas', '[RenderSystem] Player atlas sprite', spriteId);
                        drewSprite = true;
                    } catch(e) { if (window.DEBUG_SPRITES === 'verbose') console.log('[RenderSystem] Player atlas drawImage error', spriteId, e); }
                    finally { this.ctx.restore(); }
                }
            }
            // Last-chance fallback to direct path using cache
            if (!drewSprite) {
                const direct = this.getOrLoadSprite(spriteId);
                if (direct && direct.complete && (direct.naturalWidth || direct.width)) {
                    const sw = direct.naturalWidth || direct.width, sh = direct.naturalHeight || direct.height;
                    const playerOuterScaleEffective3 = 1.6;
                    const target = Math.max(12, ship.size * 2.0 * playerOuterScaleEffective3) * this.sizeMultiplier;
                    const scale = target / Math.max(sw, sh);
                    const dw = sw * scale, dh = sh * scale;
                    this.ctx.save();
                    try { const per = this.spriteOrientationOverrides[spriteId] || 0; this.ctx.rotate(this.spriteRotationOffset + per); this.ctx.drawImage(direct, -dw/2, -dh/2, dw, dh); drewSprite = true; } catch(_) {}
                    finally { this.ctx.restore(); }
                }
            }
            // If no sprite drawn, fall back to vector below
        }
        if (!drewSprite) {
            // Avoid one-frame triangle flash when sprites are intended but not ready yet
            const rs = this.stateManager.state.renderSettings || {};
            const assets = this.stateManager.state.assets || {};
            const now = performance.now ? performance.now() : Date.now();
            const spritesDesired = !!rs.useSprites; // default gameplay desires sprites
            const warming = (now < (this._suppressVectorUntil || 0));
            const notReady = !assets.ready;
            if ((spritesDesired && (warming || notReady))) {
                this.ctx.restore();
                return; // skip vector fallback this frame
            }
            const palette = FactionVisuals.getPalette(state.ship.faction || 'civilian');
            const playerDesign = (state.ship.class === 'interceptor') ? 'dart' :
                                 (state.ship.class === 'freighter') ? 'hauler' :
                                 (state.ship.class === 'trader') ? 'oval' :
                                 (state.ship.class === 'patrol') ? 'wing' :
                                 (state.ship.class === 'pirate') ? 'raider' :
                                 'delta';
            // If sprites are active but failed to draw, apply local scale for consistency
            const spritesActive = !!(this.stateManager.state.renderSettings && this.stateManager.state.renderSettings.useSprites && this.stateManager.state.assets && this.stateManager.state.assets.ready);
            const playerOuterScale = 1.6 * this.sizeMultiplier;
            if (spritesActive) this.ctx.save(), this.ctx.scale(playerOuterScale, playerOuterScale);
            // Destruct pre-explosion effect if pending
            const seq = state.ship.deathSeq;
            if (seq) {
                const now = performance.now ? performance.now() : Date.now();
                const t = Math.min(1, (now - seq.start) / (seq.duration || 600));
                const pulse = 0.5 + 0.5 * Math.sin(now * 0.03);
                // Hide sprite silhouette in the last part of the sequence
                if (t < 0.6) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.6 * (1 - t) + 0.4 * pulse;
                    ShipDesigns.draw(this.ctx, playerDesign, ship.size, palette);
                    this.ctx.restore();
                }
                // Overheat glow
                const glowR = ship.size * (1.4 + t * 2.0);
                const gg = this.ctx.createRadialGradient(0, 0, glowR * 0.1, 0, 0, glowR);
                gg.addColorStop(0, `rgba(255,255,255,${0.55 * (1 - t)})`);
                gg.addColorStop(0.35, `rgba(255,200,80,${0.4 * (1 - t)})`);
                gg.addColorStop(1, 'transparent');
                this.ctx.fillStyle = gg;
                this.ctx.beginPath(); this.ctx.arc(0, 0, glowR, 0, Math.PI*2); this.ctx.fill();
            } else {
                ShipDesigns.draw(this.ctx, playerDesign, ship.size, palette);
            }
            FactionVisuals.drawDecals(this.ctx, state.ship.faction || 'civilian', ship.size);
            if (spritesActive) this.ctx.restore();
        }
        
        // Optional sprite-based flame overlay (skip during death sequence)
        if (isThrusting && !state.ship.deathSeq) {
            const _rs = this.stateManager.state.renderSettings;
            if (_rs && _rs.useEffectsSprites) {
                try {
                    const effects = this.stateManager.state.assets?.atlases?.effects;
                    // Bigger, more visible FX than vector gradient
                    // Shorter plume per feedback (~half previous length)
                    const baseTarget = Math.max(20, ship.size * 2.2 * this.sizeMultiplier + 8);
                    const outerComp = spritesOnPlayer ? 1 : (1.6 * this.sizeMultiplier);
                    this.thrusterFX.draw(this.ctx, effects, this.quality, {
                        offsetX: -ship.size,
                        offsetY: 0,
                        baseTarget,
                        outerScaleComp: outerComp,
                        alignFactor: 0.25
                    });
                } catch(_) {}
                // Add a thin cyan beam for unmistakable FX ON difference (independent of atlas)
                this.ctx.save();
                try {
                    const L = Math.max(16, ship.size * 1.5);
                    const grad = this.ctx.createLinearGradient(-ship.size - L, 0, -ship.size, 0);
                    grad.addColorStop(0, 'rgba(120,200,255,0.0)');
                    grad.addColorStop(1, 'rgba(120,200,255,0.85)');
                    this.ctx.strokeStyle = grad;
                    this.ctx.lineWidth = 2.2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(-ship.size - L, 0);
                    this.ctx.lineTo(-ship.size, 0);
                    this.ctx.stroke();
                } finally { this.ctx.restore(); }
            }
        }

        // Weapon indicators
        if (ship.weapons && ship.weapons.length > 0) {
            this.ctx.fillStyle = '#ff5555';
            this.ctx.fillRect(ship.size * 0.9, -2, 2, 4);
        }
        
        this.ctx.restore();
        
    }
    
    /**
     * Render explosions
     */
    renderExplosions(state) {
        this.explosionRenderer.render(this.ctx, state, this.camera, this.screenCenter, this.quality, this.showParticles);
    }

    /**
     * Render lightweight hit sparks
     */
    renderHitSparks(state) {
        const sparks = state.hitSparks || [];
        if (sparks.length === 0) return;
        const heavyS = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        const stride = (heavyS || (this.quality === 'low' && sparks.length > 60)) ? 2 : 1;
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;
        for (let i = 0; i < sparks.length; i += stride) {
            const s = sparks[i];
            if (s.x < viewLeft || s.x > viewRight || s.y < viewTop || s.y > viewBottom) continue;
            const t = s.lifetime / s.maxLifetime;
            const alpha = 1 - t;
            const len = s.size * (1 - t * 0.5);
            this.ctx.save();
            this.ctx.strokeStyle = s.color || '#ffffaa';
            this.ctx.globalAlpha = Math.max(0, alpha);
            this.ctx.lineWidth = 1;
            // Draw small star burst (4 rays)
            this.ctx.beginPath();
            this.ctx.moveTo(s.x - len, s.y);
            this.ctx.lineTo(s.x + len, s.y);
            this.ctx.moveTo(s.x, s.y - len);
            this.ctx.lineTo(s.x, s.y + len);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    /**
     * Render short-lived muzzle flashes
     */
    renderMuzzleFlashes(state) {
        const flashes = state.muzzleFlashes || [];
        if (flashes.length === 0) return;
        const heavyM = (typeof window !== 'undefined' && window.__lastFrameMs && window.__lastFrameMs > 24);
        const stride = (heavyM || (this.quality === 'low' && flashes.length > 40)) ? 2 : 1;
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;
        for (let i = 0; i < flashes.length; i += stride) {
            const fx = flashes[i];
            if (fx.x < viewLeft || fx.x > viewRight || fx.y < viewTop || fx.y > viewBottom) continue;
            const t = fx.lifetime / fx.maxLifetime;
            const alpha = 1 - t;
            const length = 10 * (1 - t * 0.7);
            const width = 4 * (1 - t * 0.7);
            const x2 = fx.x + Math.cos(fx.angle) * length;
            const y2 = fx.y + Math.sin(fx.angle) * length;
            this.ctx.save();
            this.ctx.strokeStyle = fx.color || '#ffffaa';
            this.ctx.globalAlpha = Math.max(0, alpha * 0.9);
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(fx.x, fx.y);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }
    
    /**
     * Render warp effects
     */
    renderWarpEffects(state) {
        const warpEffects = state.warpEffects || [];
        
        for (let effect of warpEffects) {
            const progress = effect.lifetime / effect.maxLifetime;
            
            if (effect.type === 'arrive') {
                // Arrival flash
                const radius = 5 + (60 * (1 - progress));
                const alpha = (1 - progress) * 0.8;
                
                // Distortion ring
                this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius * 1.5, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Flash
                const flashGradient = this.ctx.createRadialGradient(
                    effect.x, effect.y, 0,
                    effect.x, effect.y, radius
                );
                flashGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                flashGradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.7})`);
                flashGradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = flashGradient;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Light streaks
                if (progress < 0.3 && this.showEffects) {
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress * 3) * 0.5})`;
                    this.ctx.lineWidth = 1;
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 / 6) * i;
                        this.ctx.beginPath();
                        this.ctx.moveTo(effect.x, effect.y);
                        this.ctx.lineTo(
                            effect.x + Math.cos(angle) * radius * 3,
                            effect.y + Math.sin(angle) * radius * 3
                        );
                        this.ctx.stroke();
                    }
                }
                
            } else if (effect.type === 'depart') {
                // Departure collapse
                const radius = 60 * progress;
                const alpha = (1 - progress) * 0.8;
                
                this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                if (progress > 0.7) {
                    const flashAlpha = (progress - 0.7) * 3;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, effect.y, 10 * (1 - progress), 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
            } else if (effect.type === 'land') {
                // Landing dust
                const alpha = (1 - progress) * 0.6;
                
                for (let i = 0; i < 5; i++) {
                    const cloudX = effect.x + (Math.random() - 0.5) * 30;
                    const cloudY = effect.y + progress * 20;
                    const size = 10 + i * 3;
                    
                    this.ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.3})`;
                    this.ctx.beginPath();
                    this.ctx.arc(cloudX, cloudY, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.5})`;
                this.ctx.fillRect(effect.x - 2, effect.y - 30 + progress * 30, 4, 20);
                
            } else if (effect.type === 'takeoff') {
                // Takeoff thrust
                const alpha = (1 - progress) * 0.8;
                
                const plumeGradient = this.ctx.createLinearGradient(
                    effect.x, effect.y,
                    effect.x, effect.y + 40
                );
                plumeGradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
                plumeGradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.6})`);
                plumeGradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = plumeGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(effect.x - 5, effect.y);
                this.ctx.lineTo(effect.x + 5, effect.y);
                this.ctx.lineTo(effect.x + 8, effect.y + 40);
                this.ctx.lineTo(effect.x - 8, effect.y + 40);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Smoke rings
                for (let i = 0; i < 3; i++) {
                    const ringY = effect.y + 10 + i * 10 + progress * 20;
                    const ringSize = 5 + i * 3 + progress * 10;
                    this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, ringY, ringSize, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    /**
     * Render minimap
     */
    renderMinimap(state) {
        if (!this.minimapCtx) return;
        try { const now = performance.now ? performance.now() : Date.now(); if (now < (this._bootUntil||0)) return; } catch(_) {}
        try {
            const now = performance.now ? performance.now() : Date.now();
            if (!this._minimapLastTs) this._minimapLastTs = 0;
            // Throttle minimap to ~30Hz to reduce bursty cost on fast displays
            if (now - this._minimapLastTs < 33) return;
            this._minimapLastTs = now;
        } catch(_) {}
        
        // Switch to CSS pixel coordinates and compute dynamic center/radius
        const dpr = (this.minimapCanvas && this.minimapCanvas.__dpr) ? this.minimapCanvas.__dpr : 1;
        const wDev = this.minimapCanvas.width || 100;
        const hDev = this.minimapCanvas.height || 100;
        const w = wDev / dpr;
        const h = hDev / dpr;
        // Ensure drawing happens in CSS pixels
        try { this.minimapCtx.setTransform(dpr,0,0,dpr,0,0); } catch(_) {}
        const centerX = w * 0.5;
        const centerY = h * 0.5;
        const maxRadius = Math.min(w, h) * 0.45;
        
        // Clear to transparent so CSS gradient shows through
        try {
            const dpr = (this.minimapCanvas && this.minimapCanvas.__dpr) ? this.minimapCanvas.__dpr : 1;
            const wDev = this.minimapCanvas.width || 100;
            const hDev = this.minimapCanvas.height || 100;
            this.minimapCtx.setTransform(1,0,0,1,0,0);
            this.minimapCtx.clearRect(0, 0, wDev, hDev);
            // Switch to CSS pixel coordinates for drawing
            this.minimapCtx.setTransform(dpr,0,0,dpr,0,0);
        } catch(_) {}
        
        // Range circles gated by radar level (featureless at level 0)
        const radarLevel = state.ship?.radarLevel || 0;
        if (radarLevel >= 1) {
            this.minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.minimapCtx.lineWidth = 1;
            for (let r = Math.min(15, maxRadius/3); r <= maxRadius; r += Math.max(15, maxRadius/3)) {
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
                this.minimapCtx.stroke();
            }
        }
        
        // radarLevel already defined above

        // Planets
        const planets = state.planets || [];
        if (radarLevel >= 1) {
            // Basic separation: planets as slightly larger dots (still white at lvl1)
            this.minimapCtx.fillStyle = '#ffffff';
            this.minimapCtx.shadowColor = '#ffffff';
            this.minimapCtx.shadowBlur = radarLevel >= 2 ? 3 : 0;
            for (let planet of planets) {
                const dx = (planet.x - state.ship.x) * this.minimapScale;
                const dy = (planet.y - state.ship.y) * this.minimapScale;
                if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
                    this.minimapCtx.beginPath();
                    this.minimapCtx.arc(centerX + dx, centerY + dy, 3, 0, Math.PI * 2);
                    this.minimapCtx.fill();
                }
            }
            this.minimapCtx.shadowBlur = 0;
        }

        // NPCs
        const npcShips = state.npcShips || [];
        for (let npc of npcShips) {
            const dx = (npc.x - state.ship.x) * this.minimapScale;
            const dy = (npc.y - state.ship.y) * this.minimapScale;
            if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
                const x = Math.floor(centerX + dx);
                const y = Math.floor(centerY + dy);
                if (radarLevel <= 0) {
                    // Level 0: featureless white pixels for everything
                    this.minimapCtx.fillStyle = '#ffffff';
                    this.minimapCtx.fillRect(x, y, 1, 1);
                } else if (radarLevel === 1) {
                    // Level 1: NPCs as small white squares, planets handled above
                    this.minimapCtx.fillStyle = '#ffffff';
                    this.minimapCtx.fillRect(x - 1, y - 1, 2, 2);
                } else {
                    // Level 2+: faction colors and hostile outline ring
                    const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
                    this.minimapCtx.fillStyle = palette.accent || '#ffffff';
                    this.minimapCtx.fillRect(x - 1, y - 1, 2, 2);
                    if (npc.faction === 'pirate') {
                        this.minimapCtx.strokeStyle = (palette.accent || '#ff4444');
                        this.minimapCtx.lineWidth = 1;
                        this.minimapCtx.beginPath();
                        this.minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
                        this.minimapCtx.stroke();
                    }
                }
            }
        }
        
        // Player ship at center
        this.minimapCtx.save();
        this.minimapCtx.translate(centerX, centerY);
        this.minimapCtx.rotate(state.ship.angle);
        this.minimapCtx.fillStyle = '#ffffff';
        this.minimapCtx.shadowColor = '#ffffff';
        this.minimapCtx.shadowBlur = 5;
        this.minimapCtx.beginPath();
        this.minimapCtx.moveTo(4, 0);
        this.minimapCtx.lineTo(-2, -2);
        this.minimapCtx.lineTo(-2, 2);
        this.minimapCtx.closePath();
        this.minimapCtx.fill();
        this.minimapCtx.restore();
    }

    // Draw only the minimap background (used during boot ramp or guard frames)
    renderMinimapBackgroundOnly() {
        if (!this.minimapCtx) return;
        try {
            const dpr = (this.minimapCanvas && this.minimapCanvas.__dpr) ? this.minimapCanvas.__dpr : 1;
            const wDev = this.minimapCanvas.width || 100;
            const hDev = this.minimapCanvas.height || 100;
            const w = wDev / dpr;
            const h = hDev / dpr;
            this.minimapCtx.setTransform(1,0,0,1,0,0);
            // Clear to transparent in device pixels, then overlay static
            this.minimapCtx.clearRect(0, 0, wDev, hDev);
            // Switch to CSS pixel coordinates for overlay shapes
            this.minimapCtx.setTransform(dpr,0,0,dpr,0,0);
            // Faint range ring so panel looks active during ramp
            try {
                const cx = w * 0.5, cy = h * 0.5; const r = Math.min(w,h) * 0.45;
                this.minimapCtx.strokeStyle = 'rgba(255,255,255,0.12)';
                this.minimapCtx.lineWidth = 1;
                this.minimapCtx.beginPath(); this.minimapCtx.arc(cx, cy, r, 0, Math.PI*2); this.minimapCtx.stroke();
            } catch(_) {}
            // Optional static overlay (can be disabled via window.MINIMAP_STATIC=false or UI_PANEL_STATIC=false)
            const g = (typeof window !== 'undefined') ? window : globalThis;
            if (!(g.MINIMAP_STATIC === false || g.UI_PANEL_STATIC === false)) {
                this._drawMinimapStatic(wDev, hDev, 0.08, 0.05);
            }
        } catch(_) {}
    }
    
    /**
     * Handle canvas resize
     */
    handleCanvasResize(data) {
        // Always drive through resizeCanvas to maintain DPR-correct backing stores
        try { this.resizeCanvas(); } catch(_) {
            // Fallback: derive CSS half-sizes if provided
            if (data && typeof data.width === 'number' && typeof data.height === 'number') {
                this.screenCenter.x = data.width / 2;
                this.screenCenter.y = data.height / 2;
            }
        }
    }
    
    /**
     * Resize canvas
     */
    resizeCanvas() {
        // Compute DPR once, clamp to a sane range
        const dpr = Math.max(1, Math.min((window.devicePixelRatio || 1), 3));
        this.dpr = dpr;

        // Compute CSS pixel size for main canvas
        const cssW = Math.floor(window.innerWidth);
        let cssH;
        try {
            const root = document.documentElement;
            const reserveStr = getComputedStyle(root).getPropertyValue('--hud-reserve').trim();
            const reserve = parseInt(reserveStr || '150', 10) || 150;
            cssH = Math.max(1, Math.floor(window.innerHeight - reserve));
        } catch (_) {
            cssH = Math.max(1, Math.floor(window.innerHeight - 150));
        }

        // Set CSS size and backing store size
        if (this.canvas) {
            this.canvas.style.width = cssW + 'px';
            this.canvas.style.height = cssH + 'px';
            this.canvas.width = Math.max(1, Math.floor(cssW * dpr));
            this.canvas.height = Math.max(1, Math.floor(cssH * dpr));
            this.canvas.__dpr = dpr;
            if (this.ctx) this.ctx.__dpr = dpr;
        }

        // Resize minimap and target-cam panels against their CSS sizes
        const resizePanel = (canvas, ctx) => {
            if (!canvas || !ctx) return;
            const rect = canvas.getBoundingClientRect();
            // Round CSS size to avoid subpixel mismatch with crosshair/gradients
            const w = Math.max(1, Math.round(rect.width || canvas.clientWidth || canvas.width));
            const h = Math.max(1, Math.round(rect.height || canvas.clientHeight || canvas.height));
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            // Match device-pixel backing store with rounded CSS size
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));
            canvas.__dpr = dpr; ctx.__dpr = dpr;
        };
        try { resizePanel(this.minimapCanvas, this.minimapCtx); } catch(_) {}
        try { resizePanel(this.targetCanvas, this.targetCtx); } catch(_) {}

        // Screen center remains in CSS pixels
        this.screenCenter.x = cssW / 2;
        this.screenCenter.y = cssH / 2;
    }
    
    /**
     * Update render system (called each frame)
     */
    update(state, deltaTime) {
        // Could update visual effects here if needed
        // For now, rendering happens in render() method
    }
    
    /**
     * Clean up render system
     */
    destroy() {
        // Unsubscribe from events
        if (this.eventBus && this.handleCanvasResize) {
            this.eventBus.off('canvas.resize', this.handleCanvasResize);
        }
        if (this.eventBus && this.handleShieldHit) {
            this.eventBus.off(GameEvents.SHIELD_HIT, this.handleShieldHit);
        }
        try { if (this._panelRO && this._panelRO.disconnect) this._panelRO.disconnect(); } catch(_) {}
        // No persistent listeners kept for TARGET_SET/CLEAR here as system lifetime == app
        console.log('[RenderSystem] Destroyed');
    }
}

export default RenderSystem;
