import { getEventBus } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { GameConstants } from '../utils/Constants.js';

export default class AssetSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.ready = false;
    }

    async init() {
        try {
            const atlas = await this.loadAtlas();
            const state = this.stateManager.state;
            state.assets = state.assets || { atlases: {} };
            state.assets.atlases.placeholder = atlas;
            // Generate a tiny effects atlas (thruster/explosion) procedurally
            const effects = await this.generateEffectsAtlas();
            state.assets.atlases.effects = effects;
            // Defer explosion flipbooks to avoid boot hitches
            this.scheduleExplosionFallbackBuild();
            this.scheduleExplosionFlipbookLoad();
            // Try to load standalone sprite images (optional manifest)
            await this.loadSpritesManifest();
            // Optional: preload planet sprites manifest (graceful fallback)
            await this.loadPlanetSpritesManifest();
            // Prime known ship sprites so TargetCam can upgrade silhouettes quickly
            await this.loadKnownShipSprites();
            state.assets.ready = true;
            // Default to sprites ON; user can toggle via debug overlay
            state.renderSettings = state.renderSettings || {};
            if (typeof state.renderSettings.useSprites === 'undefined') {
                state.renderSettings.useSprites = true;
            }
            try { this.eventBus.emit('render.useSprites', { enabled: state.renderSettings.useSprites }); } catch(_) {}
            this.ready = true;
            try { this.eventBus.emit('assets.ready', { atlases: Object.keys(state.assets.atlases) }); } catch(_) {}
            console.log('[AssetSystem] Placeholder atlas ready');
        } catch (e) {
            console.warn('[AssetSystem] Failed to initialize assets:', e);
        }
    }

    async loadAtlas() {
        try {
            const url = new URL('../assets/atlas.json', import.meta.url).href;
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const meta = await res.json();
            if (meta.image === '__generated__') {
                return await this.generatePlaceholderAtlas(meta);
            }
            // Load external image path if provided
            const img = await this.loadImage(meta.image);
            return { image: img, frames: meta.frames || {}, tileSize: meta.tileSize || { w: img.width, h: img.height } };
        } catch (_) {
            // Hard fallback: generate a default placeholder atlas
            return await this.generatePlaceholderAtlas({
                tileSize: { w: 32, h: 32 },
                frames: {
                    'ships/raider_0': { x: 0, y: 0, w: 32, h: 32 },
                    'ships/trader_0': { x: 32, y: 0, w: 32, h: 32 }
                }
            });
        }
    }

    async loadPlanetSpritesManifest() {
        try {
            // Only attempt if sprites mode is requested via toggle or constants; always safe to no-op
            const g = (typeof window !== 'undefined') ? window : globalThis;
            const forcedSprites = (typeof g.USE_PLANET_SPRITES === 'boolean') ? g.USE_PLANET_SPRITES : null;
            const mode = forcedSprites === null ? (GameConstants?.UI?.PLANETS?.MODE || 'procedural') : (forcedSprites ? 'sprites' : 'procedural');
            if (mode !== 'sprites') return; // default procedural; preloading optional
            const urlStr = GameConstants?.UI?.PLANETS?.SPRITES?.MANIFEST_URL || './assets/planets.json';
            // Resolve relative to docs/ root
            const root = new URL('../../', import.meta.url);
            const href = new URL(urlStr.replace(/^\.\//, ''), root).href;
            const res = await fetch(href, { cache: 'no-cache' });
            if (!res.ok) return; // manifest optional
            const manifest = await res.json();
            const state = this.stateManager.state;
            state.assets = state.assets || {};
            state.assets.planets = state.assets.planets || {};
            const preloadOne = async (slug, srcOverride) => {
                const key = String(slug || '').toLowerCase().replace(/\s+/g, '_');
                if (state.assets.planets[key] && (state.assets.planets[key].complete || state.assets.planets[key].naturalWidth)) return;
                const img = new Image(); img.crossOrigin='anonymous'; img.decoding='async';
                try {
                    const src = srcOverride ? srcOverride : new URL(`assets/planets/${key}.png`, root).href;
                    img.src = src; state.assets.planets[key] = img;
                } catch(_) { /* ignore */ }
            };
            if (Array.isArray(manifest)) {
                await Promise.allSettled(manifest.map(entry => {
                    if (!entry) return Promise.resolve();
                    if (typeof entry === 'string') return preloadOne(entry, null);
                    if (typeof entry === 'object' && entry.name) return preloadOne(entry.name, entry.src||null);
                    return Promise.resolve();
                }));
            } else if (manifest && typeof manifest === 'object') {
                // { name: src } map or { planets: [...] }
                if (Array.isArray(manifest.planets)) {
                    await Promise.allSettled(manifest.planets.map(e => {
                        if (!e) return Promise.resolve();
                        if (typeof e === 'string') return preloadOne(e, null);
                        if (typeof e === 'object' && e.name) return preloadOne(e.name, e.src||null);
                        return Promise.resolve();
                    }));
                } else {
                    const entries = Object.entries(manifest);
                    await Promise.allSettled(entries.map(([name, src]) => preloadOne(name, src)));
                }
            }
        } catch(_) { /* optional */ }
    }

    async loadSpritesManifest() {
        try {
            const url = new URL('../assets/sprites.json', import.meta.url).href;
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) return; // manifest optional
            const list = await res.json();
            if (!Array.isArray(list)) return;
            const state = this.stateManager.state;
            state.assets = state.assets || {};
            const sprites = state.assets.sprites || (state.assets.sprites = {});
            // Resolve URLs relative to docs/ (JSON uses './assets/...')
            const docsRoot = new URL('../../', import.meta.url);
            const loads = list.map(async (entry) => {
                if (!entry || !entry.id || !entry.src) return;
                try {
                    const clean = String(entry.src).replace(/^\.\//, '');
                    const href = new URL(clean, docsRoot).href;
                    const img = await this.loadImage(href);
                    sprites[entry.id] = { image: img, w: img.width, h: img.height };
                } catch (_) { /* ignore missing */ }
            });
            await Promise.allSettled(loads);
            const count = Object.keys(sprites).length;
            if (count) console.log(`[AssetSystem] Loaded ${count} standalone sprites`);
        } catch (_) { /* optional */ }
    }

    async generatePlaceholderAtlas(meta) {
        const tw = meta.tileSize?.w || 32;
        const th = meta.tileSize?.h || 32;
        const canvas = document.createElement('canvas');
        canvas.width = tw * 2; canvas.height = th;
        const ctx = canvas.getContext('2d');
        // Tile 0: cyan delta
        ctx.fillStyle = '#08333a'; ctx.fillRect(0, 0, tw, th);
        ctx.save();
        ctx.translate(tw * 0.5, th * 0.5);
        ctx.fillStyle = '#7fffd4';
        ctx.beginPath();
        ctx.moveTo(tw * 0.36, 0);
        ctx.lineTo(-tw * 0.28, -th * 0.24);
        ctx.lineTo(-tw * 0.20, 0);
        ctx.lineTo(-tw * 0.28, th * 0.24);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Tile 1: magenta oval
        ctx.fillStyle = '#2d083a'; ctx.fillRect(tw, 0, tw, th);
        ctx.save();
        ctx.translate(tw + tw * 0.5, th * 0.5);
        ctx.fillStyle = '#ff7ff0';
        ctx.beginPath();
        ctx.ellipse(0, 0, tw * 0.38, th * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        const img = await this.canvasToImage(canvas);
            return { image: img, canvas, frames: meta.frames || {}, tileSize: { w: tw, h: th } };
    }

    async generateEffectsAtlas() {
        // Build a small canvas atlas with 3 thruster frames and 3 explosion puffs
        const tw = 16, th = 16, cols = 6, rows = 1;
        const canvas = document.createElement('canvas');
        canvas.width = tw * cols; canvas.height = th * rows;
        const ctx = canvas.getContext('2d');
        // Thruster frames 0..2
        for (let i = 0; i < 3; i++) {
            const x = i * tw, y = 0;
            ctx.save();
            ctx.translate(x + tw/2, y + th/2);
            const len = 5 + i*2;
            const grad = ctx.createLinearGradient(-len, 0, len, 0);
            grad.addColorStop(0, 'rgba(255,140,0,0.0)');
            grad.addColorStop(0.5, 'rgba(255,200,80,0.8)');
            grad.addColorStop(1, 'rgba(255,255,255,0.95)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-len, 0);
            ctx.lineTo(0, -3);
            ctx.lineTo(0, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        // Explosion puffs 0..2
        for (let i = 0; i < 3; i++) {
            const x = (3 + i) * tw, y = 0;
            ctx.save();
            ctx.translate(x + tw/2, y + th/2);
            const r = 3 + i*2;
            const g = ctx.createRadialGradient(0,0, r*0.3, 0,0, r);
            g.addColorStop(0, 'rgba(255,255,200,0.9)');
            g.addColorStop(0.5, 'rgba(255,150,0,0.8)');
            g.addColorStop(1, 'rgba(255,50,0,0.0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(0,0, r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
        const img = await this.canvasToImage(canvas);
        const frames = {
            'effects/thruster_0': { x: 0*tw, y: 0, w: tw, h: th },
            'effects/thruster_1': { x: 1*tw, y: 0, w: tw, h: th },
            'effects/thruster_2': { x: 2*tw, y: 0, w: tw, h: th },
            'effects/explosion_0': { x: 3*tw, y: 0, w: tw, h: th },
            'effects/explosion_1': { x: 4*tw, y: 0, w: tw, h: th },
            'effects/explosion_2': { x: 5*tw, y: 0, w: tw, h: th }
        };
        return { image: img, frames, tileSize: { w: tw, h: th } };
    }

    async loadKnownShipSprites() {
        try {
            const ids = ['ships/pirate_0','ships/patrol_0','ships/patrol_1','ships/interceptor_0','ships/freighter_0','ships/trader_0','ships/shuttle_0','ships/shuttle_1'];
            const state = this.stateManager.state;
            state.assets = state.assets || {};
            const sprites = state.assets.sprites || (state.assets.sprites = {});
            const loads = ids.map(async (id) => {
                if (sprites[id]?.image) return;
                try {
                    const url = new URL(`../../assets/sprites/${id}.png`, import.meta.url).href;
                    const img = await this.loadImage(url);
                    sprites[id] = { image: img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
                } catch (_) { /* ignore missing */ }
            });
            await Promise.allSettled(loads);
            const count = ids.filter(id => sprites[id]?.image).length;
            console.log(`[AssetSystem] Preloaded ship sprites: ${count}/${ids.length}`);
        } catch (_) { /* optional */ }
    }

    canvasToImage(canvas) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = canvas.toDataURL('image/png');
        });
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    }

    async loadExplosionFlipbook() {
        try {
            // Resolve manifest relative to this module
            const manifestURL = new URL('../assets/explosion.json', import.meta.url);
            const res = await fetch(manifestURL.href, { cache: 'no-cache' });
            if (!res.ok) throw new Error('no flipbook manifest');
            const manifest = await res.json();
            if (!manifest || !Array.isArray(manifest.frames) || manifest.frames.length === 0) throw new Error('empty flipbook');
            const fps = Math.max(6, Math.min(60, manifest.fps || 24));
            // Frames in manifest are authored relative to docs/ (e.g., './assets/explosions/...').
            // Build absolute URLs relative to docs/ root.
            const docsRoot = new URL('../../', import.meta.url); // from js/systems/ -> docs/
            const imgs = await Promise.all(manifest.frames.map(src => {
                try {
                    const clean = String(src).replace(/^\.\//, '');
                    const href = new URL(clean, docsRoot).href;
                    return this.loadImage(href);
                } catch (_) {
                    return this.loadImage(src);
                }
            }));
            const state = this.stateManager.state;
            state.assets.effects = state.assets.effects || {};
            state.assets.effects.explosionFlipbook = { fps, frames: imgs };
            console.log(`[AssetSystem] Explosion flipbook loaded (${imgs.length} frames @ ${fps}fps)`);
        } catch (_) {
            // Fallback: synthesize a 6-frame flipbook from effects atlas explosion frames
            try {
                await this.buildExplosionFallback();
            } catch (_) {}
        }
    }

    async buildExplosionFallback() {
        const state = this.stateManager.state;
        const effects = state.assets?.atlases?.effects;
        if (!effects?.image || !effects?.frames) return;
        const srcFrames = ['effects/explosion_0','effects/explosion_1','effects/explosion_2'];
        const frames = [];
        for (let i = 0; i < 6; i++) {
            const key = srcFrames[Math.min(srcFrames.length-1, Math.floor(i/2))];
            const f = effects.frames[key];
            const c = document.createElement('canvas');
            c.width = f.w; c.height = f.h; const ctx = c.getContext('2d');
            ctx.drawImage(effects.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
            // subtle tint variation per frame
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255,200,100,${0.15 + (i*0.02)})`;
            ctx.fillRect(0,0,c.width,c.height);
            frames.push(await this.canvasToImage(c));
        }
        state.assets.effects = state.assets.effects || {};
        state.assets.effects.explosionFlipbook = { fps: 18, frames };
        console.log('[AssetSystem] Explosion flipbook fallback ready (6 frames)');
    }

    scheduleExplosionFallbackBuild() {
        try {
            const g = (typeof window !== 'undefined') ? window : globalThis;
            const delay = Number(g.EXPLO_FALLBACK_DELAY_MS) || 1500;
            const run = () => { this.buildExplosionFallback().catch(()=>{}); };
            if (typeof g.requestIdleCallback === 'function') {
                setTimeout(() => g.requestIdleCallback(run, { timeout: 3000 }), delay);
            } else {
                setTimeout(run, delay);
            }
            console.log('[AssetSystem] Scheduled explosion fallback build in', delay, 'ms');
        } catch (_) {}
    }

    scheduleExplosionFlipbookLoad() {
        try {
            const g = (typeof window !== 'undefined') ? window : globalThis;
            if (g.DISABLE_EXPLOSION_FLIPBOOK) return;
            const delay = Number(g.EXPLO_FLIPBOOK_DELAY_MS) || 12000;
            const run = () => { this.loadExplosionFlipbook().catch(()=>{}); };
            if (typeof g.requestIdleCallback === 'function') {
                setTimeout(() => g.requestIdleCallback(run, { timeout: 5000 }), delay);
            } else {
                setTimeout(run, delay);
            }
            console.log('[AssetSystem] Scheduled heavy explosion flipbook load in', delay, 'ms');
        } catch (_) {}
    }

    // Return a per-frame canvas for a given atlas frame id.
    // Uses placeholder atlas by default. Returns null if not ready.
    getFrameCanvas(id, atlasName = 'placeholder') {
        try {
            const state = this.stateManager.state;
            const atlases = state.assets?.atlases;
            if (!atlases || !atlases[atlasName]) return null;
            const atlas = atlases[atlasName];
            const frames = atlas.frames || {};
            const fr = frames[id];
            const src = atlas.canvas || (atlas.image && atlas.image.naturalWidth > 0 ? atlas.image : null);
            if (!fr || !src) return null;
            state.assets._frameCanvases = state.assets._frameCanvases || {};
            state.assets._frameOrder = state.assets._frameOrder || [];
            const cacheKey = `${atlasName}:${id}`;
            let c = state.assets._frameCanvases[cacheKey];
            if (c && c.width === fr.w && c.height === fr.h) {
                // Touch LRU
                try {
                    const arr = state.assets._frameOrder;
                    const idx = arr.indexOf(cacheKey);
                    if (idx !== -1) arr.splice(idx, 1);
                    arr.push(cacheKey);
                } catch(_) {}
                return c;
            }
            c = document.createElement('canvas');
            c.width = fr.w; c.height = fr.h;
            const ctx = c.getContext('2d');
            try {
                ctx.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
                state.assets._frameCanvases[cacheKey] = c;
                // Update LRU and cap size
                try {
                    const arr = state.assets._frameOrder;
                    const idx = arr.indexOf(cacheKey);
                    if (idx !== -1) arr.splice(idx, 1);
                    arr.push(cacheKey);
                    const cap = Number((typeof window !== 'undefined' && window.FRAME_CANVAS_CAP) || 128) || 128;
                    while (arr.length > cap) {
                        const oldKey = arr.shift();
                        if (oldKey) delete state.assets._frameCanvases[oldKey];
                    }
                } catch(_) {}
                return c;
            } catch (_) {
                return null;
            }
        } catch (_) {
            return null;
        }
    }
}

// Convenience for consumers that only have StateManager.state
export function getFrameCanvasFromState(state, id, atlasName = 'placeholder') {
    try {
        const atlases = state.assets?.atlases;
        if (!atlases || !atlases[atlasName]) return null;
        const atlas = atlases[atlasName];
        const frames = atlas.frames || {};
        const fr = frames[id];
        const src = atlas.canvas || (atlas.image && atlas.image.naturalWidth > 0 ? atlas.image : null);
        if (!fr || !src) return null;
        state.assets._frameCanvases = state.assets._frameCanvases || {};
        state.assets._frameOrder = state.assets._frameOrder || [];
        const cacheKey = `${atlasName}:${id}`;
        let c = state.assets._frameCanvases[cacheKey];
        if (c && c.width === fr.w && c.height === fr.h) {
            try {
                const arr = state.assets._frameOrder;
                const idx = arr.indexOf(cacheKey);
                if (idx !== -1) arr.splice(idx, 1);
                arr.push(cacheKey);
            } catch(_) {}
            return c;
        }
        c = document.createElement('canvas');
        c.width = fr.w; c.height = fr.h;
        const ctx = c.getContext('2d');
        ctx.drawImage(src, fr.x, fr.y, fr.w, fr.h, 0, 0, fr.w, fr.h);
        state.assets._frameCanvases[cacheKey] = c;
        try {
            const arr = state.assets._frameOrder;
            const idx = arr.indexOf(cacheKey);
            if (idx !== -1) arr.splice(idx, 1);
            arr.push(cacheKey);
            const cap = Number((typeof window !== 'undefined' && window.FRAME_CANVAS_CAP) || 128) || 128;
            while (arr.length > cap) {
                const oldKey = arr.shift();
                if (oldKey) delete state.assets._frameCanvases[oldKey];
            }
        } catch(_) {}
        return c;
    } catch (_) { return null; }
}

// Planet sprite access — lazy per-name image creation
export function getPlanetSpriteFromState(state, name) {
    try {
        if (!state) return null;
        state.assets = state.assets || {};
        const store = state.assets.planets || (state.assets.planets = {});
        const baseKey = String(name || '').toLowerCase().replace(/\s+/g, '_');
        // Optional runtime overrides, e.g., window.PLANET_SPRITE_OVERRIDES = { terra_nova: 'terra_nova_1' }
        let finalKey = baseKey;
        try {
            const g = (typeof window !== 'undefined') ? window : globalThis;
            if (g && g.PLANET_SPRITE_OVERRIDES && g.PLANET_SPRITE_OVERRIDES[baseKey]) {
                finalKey = String(g.PLANET_SPRITE_OVERRIDES[baseKey]).toLowerCase().replace(/\s+/g, '_').replace(/\.png$/,'');
            }
        } catch(_) {}
        let img = store[finalKey];
        if (img && (img.naturalWidth || img.width || img.complete)) return img;
        // Lazily create and begin loading. Default path convention: assets/planets/<slug>.png
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        // Resolve relative to docs/ root (two levels up from systems/)
        try {
            const root = new URL('../../', import.meta.url);
            img.src = new URL(`assets/planets/${finalKey}.png`, root).href;
        } catch (_) {
            img.src = `./assets/planets/${finalKey}.png`;
        }
        store[finalKey] = img;
        return img;
    } catch (_) { return null; }
}
