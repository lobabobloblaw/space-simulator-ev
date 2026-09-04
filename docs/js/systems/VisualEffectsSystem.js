import { GameConstants } from '../utils/Constants.js';
import { sparkCountFor } from './RenderQualityPolicy.js';

/**
 * VisualEffectsSystem — owns the purely-visual state the renderer used to mutate
 * itself (roadmap P11).
 *
 * `RenderSystem.render()` runs once per rAF, so every decay and spin it applied
 * ran at display rate: twice as fast on a 120 Hz panel, not at all while the tab
 * was throttled, and impossible to reproduce from a fixed-step sim. Everything
 * that *changes over time* now advances here, on the 60 Hz fixed tick, and the
 * renderer only reads.
 *
 * The multipliers are unchanged from the renderer's versions because the update
 * loop is a 60 Hz fixed timestep (`GameLoop.fixedTimeStep`) and the renderer was
 * effectively running at 60 Hz too on the common case — so the visible duration
 * of a shake or a flash is the same. What changes: they are now frame-rate
 * independent, and they freeze while the game is paused (the loop does not
 * update paused state), which is what "paused" should mean.
 *
 * Owned fields:
 *   ship.screenShake     decays toward 0 (renderer reads it to offset the camera)
 *   ship.damageFlash     decays toward 0 (renderer reads it for the red overlay)
 *   asteroid.rotation    spin, plus one-time `shapePoints` seeding
 *   pickup._twk          one-time sparkle phase seed
 *   explosion.__sparks   stable spark angles, reseeded when a pooled object is reused
 *   effects.starPhase    starfield twinkle clock (renderer picks a tile variant)
 */
export default class VisualEffectsSystem {
    constructor() {
        // Highest spark count any quality level asks for; the renderer takes a
        // prefix of this array, so the same seeded angles serve every quality.
        this._maxSparks = Math.max(
            sparkCountFor('high', false),
            sparkCountFor('medium', false),
            sparkCountFor('low', false),
            sparkCountFor('high', true)
        );
        console.log('[VisualEffectsSystem] Created');
    }

    init() {
        console.log('[VisualEffectsSystem] Initialized');
    }

    /**
     * @param {Object} state - StateManager state
     * @param {number} deltaTime - Fixed step in seconds (unused; the tuned
     *   constants below are per-tick, matching the old per-frame values)
     */
    update(state, deltaTime) {
        if (!state) return;
        this._updateShip(state);
        this._updateAsteroids(state);
        this._updatePickups(state);
        this._updateExplosions(state);
        this._updateStars(state);
    }

    _updateShip(state) {
        const ship = state.ship;
        if (!ship) return;

        // Screen shake: geometric decay, snapped to 0 under half a pixel so the
        // camera settles instead of jittering forever.
        if (ship.screenShake > 0) {
            ship.screenShake *= ship.screenShakeDecay || (GameConstants?.PHYSICS?.SCREEN_SHAKE_DECAY ?? 0.8);
            if (ship.screenShake < 0.5) ship.screenShake = 0;
        }

        // Damage flash: linear fade of the red screen overlay.
        if (ship.damageFlash > 0) {
            ship.damageFlash -= (GameConstants?.PHYSICS?.DAMAGE_FLASH_DECAY ?? 0.05);
            if (ship.damageFlash < 0) ship.damageFlash = 0;
        }
    }

    _updateAsteroids(state) {
        const asteroids = state.asteroids;
        if (!asteroids || !asteroids.length) return;
        for (const a of asteroids) {
            if (!a) continue;
            // Silhouette variance, seeded once (the renderer used to do this the
            // first time an asteroid came on screen).
            if (!a.shapePoints) {
                const pts = new Array(8);
                for (let j = 0; j < 8; j++) pts[j] = 0.7 + Math.random() * 0.6;
                a.shapePoints = pts;
            }
            a.rotation = (a.rotation || 0) + (a.rotationSpeed || 0);
        }
    }

    _updatePickups(state) {
        const pickups = state.pickups;
        if (!pickups || !pickups.length) return;
        for (const p of pickups) {
            // Per-pickup sparkle phase so a cluster does not glitter in unison.
            if (p && p._twk === undefined) p._twk = Math.random() * Math.PI * 2;
        }
    }

    _updateExplosions(state) {
        const explosions = state.explosions;
        if (!explosions || !explosions.length) return;
        const n = this._maxSparks;
        for (const exp of explosions) {
            if (!exp) continue;
            // SpawnSystem pools explosion objects, so a recycled one arrives carrying
            // a previous life's debris pattern. `lifetime` only ever counts up within
            // one life, so "lifetime did not advance past where we seeded" means this
            // is a new explosion. Angles are rewritten in place — reuse allocates nothing.
            const fresh = !exp.__sparks;
            if (!fresh && exp.lifetime > exp.__sparkLife) continue;
            const arr = fresh ? new Array(n) : exp.__sparks;
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;   // angle
                const m = 0.9 + Math.random() * 0.8;     // radial multiplier
                if (arr[i]) { arr[i].a = a; arr[i].m = m; }
                else arr[i] = { a, m };
            }
            if (arr.length > n) arr.length = n;
            exp.__sparks = arr;
            exp.__sparkLife = exp.lifetime | 0;
        }
    }

    _updateStars(state) {
        // One clock for the whole starfield. The renderer blits pre-rendered tile
        // variants and picks one from this phase (plus a per-tile offset), so the
        // field twinkles without 9,600 per-star sine calls.
        const fx = state.effects || (state.effects = {});
        const speed = GameConstants?.WORLD?.STAR_TWINKLE_SPEED ?? 0.02;
        fx.starPhase = ((fx.starPhase || 0) + speed) % (Math.PI * 2);
    }

    destroy() {
        console.log('[VisualEffectsSystem] Destroyed');
    }
}
