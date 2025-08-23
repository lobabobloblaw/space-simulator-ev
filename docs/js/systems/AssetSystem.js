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
            state.assets.ready = true;
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
}

