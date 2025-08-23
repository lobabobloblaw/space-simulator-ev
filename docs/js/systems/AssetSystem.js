import { getEventBus } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

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
            // Try to load an external explosion flipbook (PNG sequence) or build a tiny fallback
            await this.loadExplosionFlipbook();
            // Try to load standalone sprite images (optional manifest)
            await this.loadSpritesManifest();
            state.assets.ready = true;
            // Default to sprites OFF; user can toggle via debug overlay
            state.renderSettings = state.renderSettings || {};
            if (typeof state.renderSettings.useSprites === 'undefined') {
                state.renderSettings.useSprites = false;
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
            const loads = list.map(async (entry) => {
                if (!entry || !entry.id || !entry.src) return;
                try {
                    const img = await this.loadImage(entry.src);
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
        return { image: img, frames: meta.frames || {}, tileSize: { w: tw, h: th } };
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
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    }

    async loadExplosionFlipbook() {
        try {
            const url = new URL('../assets/explosion.json', import.meta.url).href;
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) throw new Error('no flipbook manifest');
            const manifest = await res.json();
            if (!manifest || !Array.isArray(manifest.frames) || manifest.frames.length === 0) throw new Error('empty flipbook');
            const fps = Math.max(6, Math.min(60, manifest.fps || 24));
            const imgs = await Promise.all(manifest.frames.map(src => this.loadImage(src)));
            const state = this.stateManager.state;
            state.assets.effects = state.assets.effects || {};
            state.assets.effects.explosionFlipbook = { fps, frames: imgs };
            console.log(`[AssetSystem] Explosion flipbook loaded (${imgs.length} frames @ ${fps}fps)`);
        } catch (_) {
            // Fallback: synthesize a 6-frame flipbook from effects atlas explosion frames
            try {
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
                console.log('[AssetSystem] Explosion flipbook synthesized (6 frames)');
            } catch (_) {}
        }
    }
}
