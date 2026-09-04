/**
 * GameFeelSystem — hit-stop, screen feel and floating damage numbers (W2.1/W2.2)
 *
 * Owns the `state.fx` bag. Everything here is presentation-facing state that
 * renderers read; nothing else in the sim depends on it.
 *
 * Fields written to `state.fx` (contract for RenderSystem / HUDRenderer):
 *   - `damageNumbers` {Array<{x,y,amount,t,life,crit,isPlayer}>}
 *       World-space floating numbers. `t` is a `performance.now()` stamp,
 *       `life` the lifetime in ms. Capped at MAX_NUMBERS, oldest dropped.
 *   - `chromatic` {number} 0..1 — chromatic-aberration/impact strength, set to
 *       1 on a big player hit and decayed here (~0.6 s). Renderer may ignore it.
 *   - `timeScale` {number} — mirror of GameLoop.timeScale (1 = real time).
 *   - `reducedMotion` {boolean} — true when the OS asks for reduced motion;
 *       renderers should skip shake/flash amplification when set.
 *
 * Also nudges the existing `state.ship.screenShake` on big hits (the renderer
 * already consumes it) — never when `reducedMotion` is true.
 *
 * QA toggles: `window.HITSTOP_OFF = true`, `window.DAMAGE_NUMBERS_OFF = true`.
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { TIME_SCALE_SET, TIME_SCALE_CHANGED } from '../core/GameLoop.js';
import { RunEvents } from './RunSystem.js';
import { logError } from '../utils/ErrorUtils.js';

// Tuning
const HITSTOP_PLAYER = { scale: 0.15, ms: 70, minDamage: 8 };
const HITSTOP_BOSS_DEATH = { scale: 0.1, ms: 400 };
const HITSTOP_BOSS_PHASE = { scale: 0.2, ms: 250 };
const NUMBER_LIFE_MS = 700;
const MAX_NUMBERS = 24;
const CHROMATIC_DECAY_PER_SEC = 1 / 0.6; // full → 0 in ~600 ms
const CRIT_DAMAGE = 15;

export default class GameFeelSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();

        // Raw (non-proxied) fx bag. Assigned once onto state.fx; mutated here
        // directly so per-frame decay does not fire StateManager change events.
        this.fx = {
            damageNumbers: [],
            chromatic: 0,
            timeScale: 1,
            reducedMotion: false
        };

        this.reducedMotion = false;
        this._mq = null;
        this._handleMotionPref = null;

        // Player SHIP_DAMAGE arrives twice per hit (WeaponSystem emits it and
        // the StateManager proxy emits again on the ship.health write), so
        // identical damage inside this window is treated as one hit.
        this._lastPlayerHit = { amount: -1, t: -1 };

        this._handleShipDamage = this._handleShipDamage.bind(this);
        this._handleProjectileHit = this._handleProjectileHit.bind(this);
        this._handleNPCDeath = this._handleNPCDeath.bind(this);
        this._handleBossPhase = this._handleBossPhase.bind(this);
        this._handleTimeScaleChanged = this._handleTimeScaleChanged.bind(this);
    }

    init() {
        // Defensive: the fx bag must exist even if state was built elsewhere
        const state = this.stateManager.state;
        if (!state.fx) state.fx = this.fx;

        // Reduced motion: hit-stop still happens, shake amplification does not
        try {
            if (typeof window !== 'undefined' && window.matchMedia) {
                this._mq = window.matchMedia('(prefers-reduced-motion: reduce)');
                this.reducedMotion = !!this._mq.matches;
                this._handleMotionPref = (e) => {
                    this.reducedMotion = !!e.matches;
                    this.fx.reducedMotion = this.reducedMotion;
                };
                if (this._mq.addEventListener) this._mq.addEventListener('change', this._handleMotionPref);
                else if (this._mq.addListener) this._mq.addListener(this._handleMotionPref);
            }
        } catch (_) { /* matchMedia unavailable */ }
        this.fx.reducedMotion = this.reducedMotion;

        this.eventBus.on(GameEvents.SHIP_DAMAGE, this._handleShipDamage);
        this.eventBus.on(GameEvents.PHYSICS_PROJECTILE_HIT, this._handleProjectileHit);
        this.eventBus.on(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.on(RunEvents.ZONE_BOSS_PHASE, this._handleBossPhase);
        this.eventBus.on(TIME_SCALE_CHANGED, this._handleTimeScaleChanged);

        console.log('[GameFeelSystem] Initialized');
    }

    /**
     * Per-tick decay. Damage numbers are pruned by wall-clock age so a paused
     * game does not leave stale entries once it resumes.
     */
    update(state, deltaTime) {
        try {
            if (!state) return;
            if (!state.fx) state.fx = this.fx;

            if (this.fx.chromatic > 0) {
                this.fx.chromatic = Math.max(0, this.fx.chromatic - CHROMATIC_DECAY_PER_SEC * (deltaTime || 0));
            }

            const list = this.fx.damageNumbers;
            if (list.length) {
                const now = this._now();
                for (let i = list.length - 1; i >= 0; i--) {
                    const n = list[i];
                    if (!n || now - n.t >= n.life) list.splice(i, 1);
                }
            }
        } catch (e) { logError('GameFeel.update', e); }
    }

    // ==================== HANDLERS ====================

    /**
     * Player took damage: hit-stop on a meaningful hit, red damage number,
     * chromatic pulse, and (unless reduced motion) a shake bump.
     */
    _handleShipDamage(data) {
        try {
            const amount = Number(data?.damage) || 0;
            if (amount <= 0) return;

            const now = this._now();
            if (this._lastPlayerHit.amount === amount && now - this._lastPlayerHit.t < 40) return;
            this._lastPlayerHit = { amount, t: now };

            const ship = this.stateManager.state?.ship;
            if (ship) {
                this._pushNumber({
                    x: ship.x,
                    y: ship.y - (ship.size || 10) - 6,
                    amount,
                    crit: false,
                    isPlayer: true
                });
            }

            if (amount >= HITSTOP_PLAYER.minDamage) {
                this._requestTimeScale(HITSTOP_PLAYER.scale, HITSTOP_PLAYER.ms);
                this.fx.chromatic = 1;
                if (!this.reducedMotion && ship) {
                    const bump = Math.min(30, amount * 1.2);
                    if ((ship.screenShake || 0) < bump) {
                        ship.screenShake = bump;
                        ship.screenShakeDecay = ship.screenShakeDecay || 0.85;
                    }
                }
            }
        } catch (e) { logError('GameFeel.shipDamage', e); }
    }

    /**
     * Projectile impact on an NPC: a floating number at the impact point.
     * Only player-fired shots produce numbers (NPC-on-NPC brawls would spam).
     */
    _handleProjectileHit(data) {
        try {
            if (!data || !data.isNPC) return;
            const proj = data.projectile;
            if (!proj || !proj.isPlayer) return;
            const amount = Number(proj.damage) || 0;
            if (amount <= 0) return;

            const target = data.target;
            const killing = !!(target && target.health <= 0);
            this._pushNumber({
                x: proj.x,
                y: proj.y,
                amount,
                crit: killing || amount >= CRIT_DAMAGE,
                isPlayer: false
            });
        } catch (e) { logError('GameFeel.projectileHit', e); }
    }

    _handleNPCDeath(data) {
        try {
            if (data?.npc?.type !== 'boss') return;
            this._requestTimeScale(HITSTOP_BOSS_DEATH.scale, HITSTOP_BOSS_DEATH.ms);
        } catch (e) { logError('GameFeel.npcDeath', e); }
    }

    _handleBossPhase() {
        try {
            this._requestTimeScale(HITSTOP_BOSS_PHASE.scale, HITSTOP_BOSS_PHASE.ms);
        } catch (e) { logError('GameFeel.bossPhase', e); }
    }

    _handleTimeScaleChanged(data) {
        const v = Number(data?.value);
        this.fx.timeScale = Number.isFinite(v) ? v : 1;
    }

    // ==================== HELPERS ====================

    _now() {
        return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    }

    _requestTimeScale(scale, ms) {
        if (typeof window !== 'undefined' && window.HITSTOP_OFF) return;
        this.eventBus.emit(TIME_SCALE_SET, { value: scale, ms });
    }

    _pushNumber({ x, y, amount, crit, isPlayer }) {
        if (typeof window !== 'undefined' && window.DAMAGE_NUMBERS_OFF) return;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const list = this.fx.damageNumbers;
        list.push({
            x,
            y,
            amount: Math.round(amount),
            t: this._now(),
            life: NUMBER_LIFE_MS,
            crit: !!crit,
            isPlayer: !!isPlayer
        });
        // Cap: drop the oldest entries first
        if (list.length > MAX_NUMBERS) list.splice(0, list.length - MAX_NUMBERS);
    }

    destroy() {
        this.eventBus.off(GameEvents.SHIP_DAMAGE, this._handleShipDamage);
        this.eventBus.off(GameEvents.PHYSICS_PROJECTILE_HIT, this._handleProjectileHit);
        this.eventBus.off(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.off(RunEvents.ZONE_BOSS_PHASE, this._handleBossPhase);
        this.eventBus.off(TIME_SCALE_CHANGED, this._handleTimeScaleChanged);

        if (this._mq && this._handleMotionPref) {
            if (this._mq.removeEventListener) this._mq.removeEventListener('change', this._handleMotionPref);
            else if (this._mq.removeListener) this._mq.removeListener(this._handleMotionPref);
        }
        this._mq = null;
        this._handleMotionPref = null;

        this.fx.damageNumbers.length = 0;
        console.log('[GameFeelSystem] Destroyed');
    }
}

export { GameFeelSystem };
