import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { GameConstants } from '../utils/Constants.js';

/**
 * SpawnSystem - Handles spawning of NPCs, asteroids, and pickups
 */
export class SpawnSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Spawn configuration
        this.maxNearbyNPCs = (GameConstants?.NPC?.MAX_NEARBY_COUNT ?? 5);
        this.maxTotalNPCs = (GameConstants?.NPC?.MAX_SPAWN_COUNT ?? 12);
        this.spawnRadius = (GameConstants?.NPC?.SPAWN_DISTANCE_MAX ?? 1200);
        this.despawnRadius = (GameConstants?.NPC?.DESPAWN_DISTANCE ?? 3000);
        
        // NPC types configuration
        this.npcTypes = {
            freighter: {
                size: 18,
                color: "#4488ff",
                maxSpeed: 0.25,
                thrust: 0.002,
                turnSpeed: 0.008,
                health: 80,
                maxHealth: 80,
                credits: 100,
                behavior: "passive",
                weapon: { type: "laser", damage: 5, cooldown: 30 }
            },
            trader: {
                size: 12,
                color: "#44ff88",
                maxSpeed: 0.35,
                thrust: 0.003,
                turnSpeed: 0.01,
                health: 60,
                maxHealth: 60,
                credits: 75,
                behavior: "passive",
                weapon: null
            },
            patrol: {
                size: 14,
                color: "#8888ff",
                maxSpeed: 0.45,
                thrust: 0.004,
                turnSpeed: 0.012,
                health: 100,
                maxHealth: 100,
                credits: 50,
                behavior: "lawful",
                weapon: { type: "rapid", damage: 7, cooldown: 8 }
            },
            pirate: {
                size: 10,
                color: "#ff4444",
                maxSpeed: 0.5,
                thrust: 0.005,
                turnSpeed: 0.015,
                health: 70,
                maxHealth: 70,
                credits: 150,
                behavior: "aggressive",
                weapon: { type: "plasma", damage: 15, cooldown: 25 }
            }
        };
        
        // Spawn weights
        this.spawnWeights = {
            freighter: 0.25,
            trader: 0.3,
            patrol: 0.2,
            pirate: 0.25
        };
        
        // Bind event handlers
        this.handleNPCDeath = this.handleNPCDeath.bind(this);
        this.handleAsteroidDestroyed = this.handleAsteroidDestroyed.bind(this);
        this.handlePickupExpired = this.handlePickupExpired.bind(this);
        this.handlePickupCollected = this.handlePickupCollected.bind(this);
        this.handleExplosion = this.handleExplosion.bind(this);
        this.handleWarpEffectCreated = this.handleWarpEffectCreated.bind(this);
        this.handleShipTakeoff = this.handleShipTakeoff.bind(this);
        this.handleShipLanded = this.handleShipLanded.bind(this);
        this._spawnCooldown = { until: 0 };
        this._recentTypeCooldown = {}; // { [type]: untilTs }
        this._typeCooldownMs = (GameConstants?.SPAWN?.TYPE_COOLDOWN_MS ?? 6000);   // suppress same-type spawns briefly after a death
        this._recentPirateSuppressUntil = 0; // global pirate suppression window after any death
        this._pirateSuppressMs = (GameConstants?.SPAWN?.PIRATE_SUPPRESS_MS ?? 4500);
        this._syncSpawnPolicyFromWindow();
        
        try { if (typeof window !== 'undefined' && window.DEBUG_SPAWN) console.log('[SpawnSystem] Created'); } catch(_) {}
    }
    
    /**
     * Initialize the spawn system
     */
    init() {
        // Subscribe to events
        this.subscribeToEvents();
        
        try { if (typeof window !== 'undefined' && window.DEBUG_SPAWN) console.log('[SpawnSystem] Initialized'); } catch(_) {}
    }
    
    /**
     * Subscribe to game events
     */
    subscribeToEvents() {
        this.eventBus.on(GameEvents.NPC_DEATH, (data) => {
            // Small cooldown to avoid immediate replacement spawns right after a death
            try { this._spawnCooldown.until = (performance.now ? performance.now() : Date.now()) + (GameConstants?.SPAWN?.POST_NPC_DEATH_PAUSE_MS ?? 2000); } catch(_) {}
            // Also suppress pirate spawns for a short window after any death
            try { const now = performance.now ? performance.now() : Date.now(); this._recentPirateSuppressUntil = now + this._pirateSuppressMs; } catch(_) {}
            this.handleNPCDeath(data);
        });
        this.eventBus.on(GameEvents.SHIP_DEATH, () => {
            // Also pause spawns briefly when the player dies
            try {
                const now = performance.now ? performance.now() : Date.now();
                const pause = (GameConstants?.SPAWN?.POST_SHIP_DEATH_PAUSE_MS ?? 2500);
                const extra = (GameConstants?.SPAWN?.SHIP_DEATH_EXTRA_PIRATE_SUPPRESS_MS ?? 1500);
                this._spawnCooldown.until = now + pause;
                this._recentPirateSuppressUntil = Math.max(this._recentPirateSuppressUntil||0, now + this._pirateSuppressMs + extra);
            } catch(_) {}
        });
        this.eventBus.on('asteroid.destroyed', this.handleAsteroidDestroyed);
        this.eventBus.on('pickup.expired', this.handlePickupExpired);
        // Pickups: ship collection wiring (previously unhandled → lingering dots)
        this.eventBus.on(GameEvents.PHYSICS_PICKUP_COLLECTED, this.handlePickupCollected);
        this.eventBus.on(GameEvents.EXPLOSION, this.handleExplosion);
        // Centralize warp effect creation for arrivals/departures/landings
        this.eventBus.on(GameEvents.WARP_EFFECT_CREATED, this.handleWarpEffectCreated);
        this.eventBus.on(GameEvents.PHYSICS_SHIP_TAKEOFF, this.handleShipTakeoff);
        this.eventBus.on(GameEvents.SHIP_LANDED, this.handleShipLanded);
        // Small debris on projectile hits
        this.eventBus.on(GameEvents.PHYSICS_PROJECTILE_HIT, (data) => {
            try { this.handleProjectileHitDebris(data); } catch(_) {}
        });
    }

    // Generic handler to create a warp effect and manage pooling
    _pushWarpEffect(x, y, type, state) {
        try {
            if (!state.warpEffects) state.warpEffects = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.warpEffects) state.pools.warpEffects = [];
            const e = state.pools.warpEffects.pop() || {};
            e.x = x; e.y = y; e.type = type; e.lifetime = 0;
            e.maxLifetime = (type === 'arrive' || type === 'depart') ? 30 : 20;
            if (state.warpEffects.length > 40) {
                const old = state.warpEffects.shift();
                if (old) state.pools.warpEffects.push(old);
            }
            state.warpEffects.push(e);
        } catch(_) {}
    }

    handleWarpEffectCreated(data) {
        if (!data) return;
        const state = this.stateManager.state;
        const { x, y, type } = data;
        if (typeof x !== 'number' || typeof y !== 'number' || !type) return;
        this._pushWarpEffect(x, y, type, state);
    }

    handleShipTakeoff() {
        const state = this.stateManager.state;
        const ship = state.ship;
        if (!ship) return;
        this._pushWarpEffect(ship.x, ship.y, 'takeoff', state);
    }

    handleShipLanded(evt) {
        try {
            const state = this.stateManager.state;
            const pos = evt?.ship || state.ship;
            if (!pos) return;
            this._pushWarpEffect(pos.x, pos.y, 'land', state);
        } catch(_) {}
    }
    
    /**
     * Handle NPC death - drop loot
     */
    handleNPCDeath(data) {
        if (!data || !data.npc) return;
        
        const npc = data.npc;
        const state = this.stateManager.state;
        // Suppress spawning the same type briefly to avoid "instant replacement"
        try {
            const now = performance.now ? performance.now() : Date.now();
            if (npc.type) this._recentTypeCooldown[npc.type] = now + this._typeCooldownMs;
        } catch(_) {}
        
        // Pirates drop loot
        if (npc.type === 'pirate' && Math.random() < 0.6) {
            for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                
                const pickup = {
                    x: npc.x,
                    y: npc.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    type: Math.random() < 0.5 ? 'credits' : 'ore',
                    value: Math.random() < 0.5 ? 10 : 25,
                    lifetime: 0,
                    maxLifetime: 600
                };
                
                state.pickups.push(pickup);
            }
        }
    }
    
    /**
     * Handle asteroid destroyed - drop ore
     */
    handleAsteroidDestroyed(data) {
        if (!data || !data.asteroid) return;
        
        const asteroid = data.asteroid;
        const state = this.stateManager.state;
        
        // Ore drops at asteroid location
        this._emitOreDrops(state, asteroid);
        
        // Dusty gray debris and rock shards (visual variant distinct from fiery ship debris)
        try {
            if (!state.debris) state.debris = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.debris) state.pools.debris = [];
            this._emitAsteroidShards(state, asteroid);
            this._emitAsteroidChunks(state, asteroid);
            // Optional polish: occasional molten sliver shards (default OFF; enable via window.VFX_DEBRIS_POLISH = true)
            try {
                const g = (typeof window !== 'undefined') ? window : globalThis;
                if (g.VFX_DEBRIS_POLISH) {
                    const slivers = (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0); // 0–2 slivers
                    for (let i = 0; i < slivers; i++) {
                        this._emitSliverDebris(state, asteroid);
                    }
                }
            } catch(_) {}
        } catch(_) {}
        
        // Fragment into smaller asteroids by tier (3 tiers: large → medium → small)
        this._spawnChildAsteroids(state, asteroid);
    }
    
    // --- Helper routines to keep asteroid destruction tidy ---
    _emitOreDrops(state, asteroid) {
        try {
            if (!state.pickups) state.pickups = [];
            const oreDrops = (() => {
                const tier = this._getAsteroidTier(asteroid);
                if (tier === 'large') return 2;   // largest yield more slivers
                if (tier === 'medium') return 1;  // smaller release
                return 1;                          // smallest always 1
            })();
            for (let j = 0; j < oreDrops; j++) {
                const angle = (Math.PI * 2 / oreDrops) * j;
                const pickup = {
                    x: asteroid.x + Math.cos(angle) * 10,
                    y: asteroid.y + Math.sin(angle) * 10,
                    vx: Math.cos(angle) * 0.5 + asteroid.vx * 0.5,
                    vy: Math.sin(angle) * 0.5 + asteroid.vy * 0.5,
                    type: 'ore',
                    lifetime: 0,
                    maxLifetime: 600
                };
                state.pickups.push(pickup);
            }
        } catch(_) {}
    }

    _emitAsteroidShards(state, asteroid) {
        const shardCount = 6 + Math.floor(Math.random() * 6); // 6–11 shards
        for (let i = 0; i < shardCount; i++) {
            const d = state.pools.debris.pop() || {};
            d.x = asteroid.x; d.y = asteroid.y;
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.6 + Math.random() * 1.2;
            d.vx = Math.cos(ang) * spd + asteroid.vx * 0.3;
            d.vy = Math.sin(ang) * spd + asteroid.vy * 0.3;
            d.angle = Math.random() * Math.PI * 2;
            d.va = (Math.random()-0.5) * 0.15;
            d.size = 2 + Math.random()*3;
            d.color = ['#999','#aaa','#888','#777'][Math.floor(Math.random()*4)];
            d.lifetime = 0;
            d.maxLifetime = 50 + Math.floor(Math.random()*30);
            d.shape = 'shard';
            state.debris.push(d);
        }
    }

    _emitAsteroidChunks(state, asteroid) {
        const chunkCount = 3 + Math.floor(Math.random() * 4); // 3–6 small rock chunks
        for (let i = 0; i < chunkCount; i++) {
            const d = state.pools.debris.pop() || {};
            d.x = asteroid.x; d.y = asteroid.y;
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.4 + Math.random() * 1.0;
            d.vx = Math.cos(ang) * spd + asteroid.vx * 0.25;
            d.vy = Math.sin(ang) * spd + asteroid.vy * 0.25;
            d.angle = Math.random() * Math.PI * 2;
            d.va = (Math.random()-0.5) * 0.12;
            d.size = 3 + Math.random() * 4;
            d.color = ['#888','#777','#666'][Math.floor(Math.random()*3)];
            d.lifetime = 0;
            d.maxLifetime = 80 + Math.floor(Math.random()*40);
            d.shape = 'poly';
            const sides = 5 + Math.floor(Math.random()*3);
            d.points = [];
            for (let j=0;j<sides;j++){ d.points.push(0.6 + Math.random()*0.6); }
            state.debris.push(d);
        }
    }

    _emitSliverDebris(state, asteroid) {
        const d = state.pools.debris.pop() || {};
        d.x = asteroid.x; d.y = asteroid.y;
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.8 + Math.random() * 1.4; // slightly faster ejecta
        d.vx = Math.cos(ang) * spd + asteroid.vx * 0.25;
        d.vy = Math.sin(ang) * spd + asteroid.vy * 0.25;
        d.angle = Math.random() * Math.PI * 2;
        d.va = (Math.random()-0.5) * 0.2;
        // 2x1 aspect micro-bars
        const base = 2 + Math.random() * 2; // 2..4
        d.w = Math.max(2, Math.round(base * 2));
        d.h = Math.max(1, Math.round(base));
        d.color = '#cc8855';
        d.lifetime = 0;
        d.maxLifetime = 45 + Math.floor(Math.random() * 25);
        d.shape = 'sliver';
        state.debris.push(d);
    }

    _getAsteroidTier(asteroid) {
        const r = Math.max(0, asteroid?.radius || 0);
        if (r >= 8) return 'large';
        if (r >= 5) return 'medium';
        return 'small';
    }

    _spawnChildAsteroids(state, asteroid) {
        const tier = this._getAsteroidTier(asteroid);
        if (tier === 'small') return; // terminal tier
        const count = (tier === 'large') ? 3 : 2;
        const shrink = 0.55;
        for (let j = 0; j < count; j++) {
            const angle = Math.random() * Math.PI * 2;
            // Generate unique shape for fragment
            const shapePoints = [];
            for (let k = 0; k < 8; k++) shapePoints.push(0.7 + Math.random() * 0.6);
            const radius = Math.max(2, asteroid.radius * shrink);
            const fragment = {
                x: asteroid.x + Math.cos(angle) * asteroid.radius,
                y: asteroid.y + Math.sin(angle) * asteroid.radius,
                vx: Math.cos(angle) * 0.6 + asteroid.vx,
                vy: Math.sin(angle) * 0.6 + asteroid.vy,
                radius,
                color: '#666',
                rotationSpeed: (Math.random() - 0.5) * 0.03,
                rotation: Math.random() * Math.PI * 2,
                // Health scaled by size to preserve feel
                health: Math.max(6, Math.round(asteroid.maxHealth ? asteroid.maxHealth * shrink * 0.6 : 10)),
                maxHealth: Math.max(6, Math.round(asteroid.maxHealth ? asteroid.maxHealth * shrink * 0.6 : 10)),
                // Small fragments will still drop 1 ore on death
                oreContent: (tier === 'large') ? 1 : 1,
                shapePoints
            };
            state.asteroids.push(fragment);
        }
    }

    // When ship (or NPC) collects a pickup
    handlePickupCollected(evt) {
        try {
            const state = this.stateManager.state;
            const byShip = !!evt?.ship;
            // Remove the pickup from state if an index is provided
            if (byShip && Number.isInteger(evt.index)) {
                const pickup = state.pickups?.[evt.index];
                if (pickup) {
                    // Award to player
                    this._awardPickupToShip(pickup, state.ship);
                    state.pickups.splice(evt.index, 1);
                    this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'pickup' });
                    this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
                    // Also emit generic collected event for any listeners
                    this.eventBus.emit(GameEvents.PICKUP_COLLECTED, { pickup, by: 'player' });
                }
            }
        } catch(_) {}
    }

    _awardPickupToShip(pickup, ship) {
        if (!pickup || !ship) return;
        // Simple rule: ore → cargo if space; fallback to credits
        if (pickup.type === 'ore') {
            const hasSpace = Array.isArray(ship.cargo) && ship.cargo.length < (ship.cargoCapacity || 10);
            if (hasSpace) {
                ship.cargo.push({ type: 'ore' });
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Ore +1 (cargo)', type: 'success', duration: 1200 });
            } else {
                // Minimal fallback credit; keep small to avoid balance shifts
                ship.credits = (ship.credits || 0) + 10;
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Cargo full — §+10', type: 'info', duration: 1200 });
            }
        } else if (pickup.type === 'credits') {
            ship.credits = (ship.credits || 0) + (pickup.value || 10);
            this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `§+${pickup.value||10}`, type: 'success', duration: 1200 });
        }
    }
    
    /**
     * Handle pickup expired
     */
    handlePickupExpired(data) {
        // Could add visual effect when pickup expires
    }

    /**
     * Spawn small debris on projectile hits (ships/NPCs)
     */
    handleProjectileHitDebris(data) {
        if (!data || !data.projectile) return;
        const state = this.stateManager.state;
        if (!state.debris) state.debris = [];
        if (!state.pools) state.pools = {};
        if (!state.pools.debris) state.pools.debris = [];
        const { projectile, target } = data;
        // Skip asteroids (they have their own shards already)
        if (data.isAsteroid) return;
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            const d = state.pools.debris.pop() || {};
            d.x = projectile.x; d.y = projectile.y;
            const ang = Math.random() * Math.PI * 2;
            const spd = 0.8 + Math.random() * 1.6;
            d.vx = Math.cos(ang) * spd + (target?.vx||0)*0.2;
            d.vy = Math.sin(ang) * spd + (target?.vy||0)*0.2;
            d.angle = Math.random() * Math.PI * 2;
            d.va = (Math.random()-0.5) * 0.2;
            d.size = 2 + Math.random()*3;
            d.color = target?.color || '#ccc';
            d.lifetime = 0;
            d.maxLifetime = 40 + Math.floor(Math.random()*20);
            // Tiny triangle shard
            d.shape = 'shard';
            state.debris.push(d);
        }
        // Soft-cap
        if (state.debris.length > 200) {
            const old = state.debris.splice(0, state.debris.length - 200);
            for (const o of old) state.pools.debris.push(o);
        }
    }
    
    /**
     * Handle explosion creation
     */
    handleExplosion(data) {
        if (!data) return;
        
        const state = this.stateManager.state;
        if (!state.explosions) state.explosions = [];
        if (!state.pools) state.pools = {};
        if (!state.pools.explosions) state.pools.explosions = [];
        if (!state.hitSparks) state.hitSparks = [];
        if (!state.pools.hitSparks) state.pools.hitSparks = [];
        
        // Determine explosion size parameters
        let radius, maxRadius, maxLifetime;
        
        const isImpact = data.impactKind === 'ship-asteroid' || data.isImpact;
        if (data.size === 'small') {
            radius = 5;
            maxRadius = 15;
            maxLifetime = 18;
        } else if (data.size === 'large') {
            radius = 22;
            maxRadius = 80;
            maxLifetime = 30;
        } else {
            // Default medium
            radius = 14;
            maxRadius = 40;
            maxLifetime = 24;
        }
        // If this is a ship-asteroid impact, force a smaller, snappier pop
        if (isImpact) {
            radius = 4;
            maxRadius = 14;
            maxLifetime = 14;
        }
        
        // Obtain explosion object from pool if available
        const explosion = state.pools.explosions.pop() || {};
        explosion.x = data.x;
        explosion.y = data.y;
        explosion.radius = radius;
        explosion.maxRadius = maxRadius;
        explosion.lifetime = 0;
        explosion.maxLifetime = maxLifetime;
        explosion.shockwave = !isImpact;
        explosion.isImpact = !!isImpact;
        
        // Soft cap active explosions to prevent GC storms
        if (state.explosions.length > 80) {
            const oldest = state.explosions.shift();
            if (oldest) state.pools.explosions.push(oldest);
        }
        state.explosions.push(explosion);

        // Audio: trigger explosion sound sized by impact/size
        try {
            this.eventBus.emit(GameEvents.AUDIO_PLAY, {
                sound: 'explosion',
                small: !!isImpact || maxRadius < 30
            });
        } catch(_) {}
        
        // Layered secondary blast for richer look
        if (!isImpact && maxRadius >= 40) {
            const e2 = state.pools.explosions.pop() || {};
            e2.x = data.x;
            e2.y = data.y;
            e2.radius = Math.max(6, Math.floor(radius * 0.55));
            e2.maxRadius = Math.max(22, Math.floor(maxRadius * 0.65));
            e2.lifetime = 0;
            e2.maxLifetime = Math.max(16, Math.floor(maxLifetime * 0.8));
            e2.shockwave = false;
            state.explosions.push(e2);
        }

        // Emit fiery hit sparks (debris/embers) — quality-aware reduction
        const q = (state.debug && state.debug.renderQuality) || 'high';
        const baseSpark = (data.size === 'large' ? 20 : (data.size === 'small' ? 8 : 14));
        const sparkMult = (q === 'low') ? 0.5 : (q === 'medium' ? 0.8 : 1);
        const sparkCount = Math.max(1, Math.floor(baseSpark * sparkMult));
        for (let i = 0; i < sparkCount; i++) {
            const s = state.pools.hitSparks.pop() || {};
            s.x = data.x; s.y = data.y;
            s.dir = Math.random() * Math.PI * 2;
            s.lifetime = 0;
            s.maxLifetime = (data.size === 'large' ? 22 : 16) + Math.floor(Math.random() * 6);
            s.size = (data.size === 'large' ? 8 : 6) + Math.random() * 4;
            s.color = '#ffdd88';
            if (state.hitSparks.length > 140) {
                const old = state.hitSparks.shift();
                if (old) state.pools.hitSparks.push(old);
            }
            state.hitSparks.push(s);
        }

        // Screen shake if near player
        try {
            const ship = state.ship;
            const dx = (data.x - ship.x), dy = (data.y - ship.y);
            const dist = Math.hypot(dx, dy);
            const maxDist = 700;
            if (dist < maxDist) {
                const intensity = Math.max(6, (data.size === 'large' ? 18 : data.size === 'small' ? 8 : 12) * (1 - dist / maxDist));
                ship.screenShake = Math.max(ship.screenShake || 0, intensity);
                ship.screenShakeDecay = 0.85;
            }
        } catch(_) {}

        // Launch flipbook explosion anim if available (skip for impact pops)
        try {
            const fb = state.assets?.effects?.explosionFlipbook;
            const q = (state.debug && state.debug.renderQuality) || 'high';
            // Reliability: only skip flipbook on low quality; always show on medium/high
            if (!isImpact && fb && Array.isArray(fb.frames) && fb.frames.length && q !== 'low') {
                if (!state.explosionAnims) state.explosionAnims = [];
                const base = fb.frames[0];
                const baseMax = Math.max(base.naturalWidth||base.width||16, base.naturalHeight||base.height||16);
                // Scale to ~2x radius (diameter), then reduce ~20% per request
                const scale = Math.max(0.5, (maxRadius * 2.2) / baseMax) * 0.8;
                const fps = (fb.fps || 24) * 1.8; // speed up ~80%
                state.explosionAnims.push({
                    x: data.x,
                    y: data.y,
                    start: performance.now ? performance.now() : Date.now(),
                    idx: 0,
                    fps,
                    frames: fb.frames,
                    scale,
                    alpha: 1.0,
                    isImpact: false
                });
            }
        } catch(_) {}

        // Eject irregular debris chunks on final explosion
        try {
            if (!state.debris) state.debris = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.debris) state.pools.debris = [];
            // Increase visual density of ejected chunks
            const baseChunks = (data.size === 'large' ? 16 : (data.size === 'small' ? 6 : 12));
            const q = (state.debug && state.debug.renderQuality) || 'high';
            const chunkMult = (q === 'low') ? 0.6 : (q === 'medium' ? 0.85 : 1);
            const chunkCount = Math.max(1, Math.floor(baseChunks * chunkMult));
            for (let i = 0; i < chunkCount; i++) {
                const d = state.pools.debris.pop() || {};
                d.x = data.x; d.y = data.y;
                const ang = Math.random() * Math.PI * 2;
                const spd = (data.size === 'large' ? 2.2 : 1.6) + Math.random() * 1.8;
                d.vx = Math.cos(ang) * spd; d.vy = Math.sin(ang) * spd;
                d.angle = Math.random() * Math.PI * 2;
                d.va = (Math.random()-0.5) * 0.15;
                // Make chunks ~50% smaller overall to reduce visual bulk
                d.size = ((data.size === 'large' ? 8 : 5) + Math.random() * 6) * 0.5;
                d.color = '#777';
                d.lifetime = 0;
                d.maxLifetime = 90 + Math.floor(Math.random()*60);
                // Irregular polygon points like asteroids
                const sides = 5 + Math.floor(Math.random()*3);
                d.shape = 'poly';
                d.points = [];
                for (let j=0;j<sides;j++){ d.points.push(0.6 + Math.random()*0.6); }
                state.debris.push(d);
            }
        } catch(_) {}
    }
    
    /**
     * Spawn an NPC
     */
    spawnNPC() {
        const state = this.stateManager.state;
        
        // Select NPC type based on weights, with temporary suppression for recent-death type(s)
        const now = performance.now ? performance.now() : Date.now();
        const base = this.spawnWeights;
        const adj = { freighter: base.freighter, trader: base.trader, patrol: base.patrol, pirate: base.pirate };
        for (const t of Object.keys(adj)) {
            if (this._recentTypeCooldown[t] && now < this._recentTypeCooldown[t]) {
                // Zero weight to avoid this type during cooldown window
                adj[t] = 0;
            }
        }
        // Also zero pirates globally if under the recent pirate suppression window
        if (now < (this._recentPirateSuppressUntil || 0)) {
            adj.pirate = 0;
        }
        // Normalize and pick; if everything zeroed, fall back to base weights
        let sum = Object.values(adj).reduce((a,b)=>a+b,0);
        let pickFrom = adj;
        if (sum <= 0) { pickFrom = base; sum = Object.values(base).reduce((a,b)=>a+b,0); }
        let r = Math.random() * sum;
        let type = 'trader';
        let acc = 0;
        for (const [t,w] of Object.entries(pickFrom)) {
            acc += w;
            if (r < acc) { type = t; break; }
        }
        
        const template = this.npcTypes[type];
        
        // Determine spawn location based on type
        let spawnX, spawnY, initialVx, initialVy;
        let spawnEffect = 'arrive';
        
        if (type === 'trader' || type === 'freighter') {
            // Traders/Freighters spawn near planets or in transit between them
            if (Math.random() < 0.4) {
                // Spawn near a planet (arriving or departing)
                const planet = state.planets[Math.floor(Math.random() * state.planets.length)];
                const angle = Math.random() * Math.PI * 2;
                const distance = planet.radius + 100 + Math.random() * 100;
                spawnX = planet.x + Math.cos(angle) * distance;
                spawnY = planet.y + Math.sin(angle) * distance;
                
                // 50% chance to be departing (moving away) or arriving (moving slowly)
                if (Math.random() < 0.5) {
                    // Departing - moving away from planet
                    initialVx = Math.cos(angle) * template.maxSpeed * (0.3 + Math.random() * 0.4);
                    initialVy = Math.sin(angle) * template.maxSpeed * (0.3 + Math.random() * 0.4);
                    spawnEffect = 'takeoff';
                } else {
                    // Arriving - moving slowly or orbiting
                    const orbitAngle = angle + Math.PI/2;
                    initialVx = Math.cos(orbitAngle) * template.maxSpeed * 0.2;
                    initialVy = Math.sin(orbitAngle) * template.maxSpeed * 0.2;
                    // Still show a brief arrive flash so ships don't pop in
                    spawnEffect = 'arrive';
                }
            } else {
                // Spawn in transit between planets
                const fromPlanet = state.planets[Math.floor(Math.random() * state.planets.length)];
                const toPlanet = state.planets[Math.floor(Math.random() * state.planets.length)];
                
                // Position somewhere along the route
                const progress = 0.2 + Math.random() * 0.6; // 20-80% along the route
                spawnX = fromPlanet.x + (toPlanet.x - fromPlanet.x) * progress;
                spawnY = fromPlanet.y + (toPlanet.y - fromPlanet.y) * progress;
                
                // Velocity toward destination with some variance
                const travelAngle = Math.atan2(toPlanet.y - spawnY, toPlanet.x - spawnX);
                const angleVariance = (Math.random() - 0.5) * Math.PI/6; // ±30 degrees
                initialVx = Math.cos(travelAngle + angleVariance) * template.maxSpeed * (0.4 + Math.random() * 0.3);
                initialVy = Math.sin(travelAngle + angleVariance) * template.maxSpeed * (0.4 + Math.random() * 0.3);
                // Always show an arrival flash at spawn so ships never blink in
                spawnEffect = 'arrive';
            }
        } else if (type === 'pirate') {
            // Pirates spawn at edges but with varied trajectories
            const spawnAngle = Math.random() * Math.PI * 2;
            const distance = 1000 + Math.random() * 500;
            spawnX = state.ship.x + Math.cos(spawnAngle) * distance;
            spawnY = state.ship.y + Math.sin(spawnAngle) * distance;
            
            // Random trajectory - not always toward player
            const trajectoryType = Math.random();
            if (trajectoryType < 0.3) {
                // Moving across the system (tangential)
                const tangentAngle = spawnAngle + Math.PI/2 * (Math.random() < 0.5 ? 1 : -1);
                initialVx = Math.cos(tangentAngle) * template.maxSpeed * (0.3 + Math.random() * 0.3);
                initialVy = Math.sin(tangentAngle) * template.maxSpeed * (0.3 + Math.random() * 0.3);
            } else if (trajectoryType < 0.6) {
                // Prowling (slow random direction)
                const prowlAngle = Math.random() * Math.PI * 2;
                initialVx = Math.cos(prowlAngle) * template.maxSpeed * 0.2;
                initialVy = Math.sin(prowlAngle) * template.maxSpeed * 0.2;
            } else {
                // Hunting (moving inward but at an angle)
                const huntAngle = spawnAngle + Math.PI + (Math.random() - 0.5) * Math.PI/2;
                initialVx = Math.cos(huntAngle) * template.maxSpeed * 0.3;
                initialVy = Math.sin(huntAngle) * template.maxSpeed * 0.3;
            }
            // Always show an arrival flash so pirates don't blink in
            spawnEffect = 'arrive';
        } else if (type === 'patrol') {
            // Patrols spawn in patrol patterns around the system
            const patrolPattern = Math.random();
            
            if (patrolPattern < 0.4) {
                // Circular patrol around player's general area
                const angle = Math.random() * Math.PI * 2;
                const distance = 400 + Math.random() * 600;
                spawnX = state.ship.x + Math.cos(angle) * distance;
                spawnY = state.ship.y + Math.sin(angle) * distance;
                
                // Moving perpendicular to radius (orbiting)
                const orbitDirection = Math.random() < 0.5 ? 1 : -1;
                const orbitAngle = angle + Math.PI/2 * orbitDirection;
                initialVx = Math.cos(orbitAngle) * template.maxSpeed * (0.3 + Math.random() * 0.2);
                initialVy = Math.sin(orbitAngle) * template.maxSpeed * (0.3 + Math.random() * 0.2);
                // Brief arrive flash at spawn to avoid pop-in
                spawnEffect = 'arrive';
            } else if (patrolPattern < 0.7) {
                // Patrolling trade routes
                const planet = state.planets[Math.floor(Math.random() * state.planets.length)];
                const angle = Math.random() * Math.PI * 2;
                const distance = 200 + Math.random() * 300;
                spawnX = planet.x + Math.cos(angle) * distance;
                spawnY = planet.y + Math.sin(angle) * distance;
                
                // Random patrol direction
                const patrolAngle = Math.random() * Math.PI * 2;
                initialVx = Math.cos(patrolAngle) * template.maxSpeed * 0.35;
                initialVy = Math.sin(patrolAngle) * template.maxSpeed * 0.35;
                // Brief arrive flash at spawn to avoid pop-in
                spawnEffect = 'arrive';
            } else {
                // Responding to something (moving with purpose)
                const angle = Math.random() * Math.PI * 2;
                const distance = 800 + Math.random() * 400;
                spawnX = state.ship.x + Math.cos(angle) * distance;
                spawnY = state.ship.y + Math.sin(angle) * distance;
                
                // Moving across the area
                const moveAngle = Math.random() * Math.PI * 2;
                initialVx = Math.cos(moveAngle) * template.maxSpeed * 0.4;
                initialVy = Math.sin(moveAngle) * template.maxSpeed * 0.4;
                spawnEffect = 'arrive'; // Just arrived to investigate
            }
        } else {
            // Default spawn - random position and trajectory
            const angle = Math.random() * Math.PI * 2;
            const distance = 600 + Math.random() * 600;
            spawnX = state.ship.x + Math.cos(angle) * distance;
            spawnY = state.ship.y + Math.sin(angle) * distance;
            
            // Random velocity direction
            const velAngle = Math.random() * Math.PI * 2;
            initialVx = Math.cos(velAngle) * template.maxSpeed * (0.2 + Math.random() * 0.3);
            initialVy = Math.sin(velAngle) * template.maxSpeed * (0.2 + Math.random() * 0.3);
            // Always show an arrival flash so ships never blink in
            spawnEffect = 'arrive';
        }
        
        // Create warp effect at spawn location if appropriate (with pooling)
        if (state.warpEffects && spawnEffect) {
            if (!state.pools) state.pools = {};
            if (!state.pools.warpEffects) state.pools.warpEffects = [];
            const effect = state.pools.warpEffects.pop() || {};
            effect.x = spawnX;
            effect.y = spawnY;
            effect.type = spawnEffect;
            effect.lifetime = 0;
            effect.maxLifetime = (spawnEffect === 'arrive' || spawnEffect === 'depart') ? 30 : 20;
            // Soft-cap active warp effects
            if (state.warpEffects.length > 40) {
                const old = state.warpEffects.shift();
                if (old) state.pools.warpEffects.push(old);
            }
            state.warpEffects.push(effect);
        }
        
        // Create NPC
        const state2 = this.stateManager.state;
        state2.nextEntityId = state2.nextEntityId || 1;
        const npc = {
            id: state2.nextEntityId++,
            x: spawnX,
            y: spawnY,
            vx: initialVx,
            vy: initialVy,
            angle: Math.atan2(initialVy, initialVx),
            type: type,
            ...template,
            targetPlanet: (type === 'trader' || type === 'freighter') ? 
                state.planets[Math.floor(Math.random() * state.planets.length)] : null,
            weaponCooldown: 0,
            lifetime: 0,
            thrusting: false
        };
        
        // Add to state
        state.npcShips.push(npc);
        
        // Emit spawn event
        this.eventBus.emit(GameEvents.NPC_SPAWN, { npc, type });
        
        try { if (typeof window !== 'undefined' && window.DEBUG_SPAWN) console.log(`[SpawnSystem] Spawned ${type} NPC`); } catch(_) {}
    }
    
    /**
     * Update spawn system
     */
    update(state, deltaTime) {
        if (!state) return;
        this._syncSpawnPolicyFromWindow();
        
        // Count nearby NPCs
        let nearbyCount = 0;
        for (let npc of state.npcShips) {
            const dist = Math.sqrt((npc.x - state.ship.x) ** 2 + (npc.y - state.ship.y) ** 2);
            if (dist < (GameConstants?.NPC?.NEARBY_RADIUS ?? 1000)) nearbyCount++;
        }
        
        // Check if we should spawn new NPCs
        if (!state.npcSpawnState) {
            state.npcSpawnState = {
                nextShipSpawn: Date.now() + Math.random() * (GameConstants?.NPC?.BASE_SPAWN_DELAY ?? 3000) + (GameConstants?.NPC?.SPAWN_DELAY_VARIANCE ?? 2000)
            };
        }
        
        const now = performance.now ? performance.now() : Date.now();
        const cooled = now >= (this._spawnCooldown.until || 0);
        if (Date.now() > state.npcSpawnState.nextShipSpawn && 
            nearbyCount < this.maxNearbyNPCs && 
            state.npcShips.length < this.maxTotalNPCs &&
            cooled) {
            
            this.spawnNPC();
            
            const base = (GameConstants?.NPC?.BASE_SPAWN_DELAY ?? 3000);
            const varMs = (GameConstants?.NPC?.SPAWN_DELAY_VARIANCE ?? 2000);
            const spawnDelay = base + (nearbyCount * varMs);
            state.npcSpawnState.nextShipSpawn = Date.now() + Math.random() * spawnDelay + spawnDelay/2;
        }
        
        // Update and despawn distant NPCs
        for (let i = state.npcShips.length - 1; i >= 0; i--) {
            const npc = state.npcShips[i];
            const distFromPlayer = Math.sqrt((npc.x - state.ship.x) ** 2 + (npc.y - state.ship.y) ** 2);
            
            if (distFromPlayer > this.despawnRadius) {
                // Create warp effect
                if (state.warpEffects) {
                    let nearPlanet = false;
                    for (let planet of state.planets) {
                        const distToPlanet = Math.sqrt((npc.x - planet.x) ** 2 + (npc.y - planet.y) ** 2);
                        if (distToPlanet < planet.radius + (GameConstants?.PHYSICS?.LANDING_CLEAR_DISTANCE ?? 100)) {
                            nearPlanet = true;
                            break;
                        }
                    }
                    
                    state.warpEffects.push({
                        x: npc.x,
                        y: npc.y,
                        type: nearPlanet ? 'land' : 'depart',
                        lifetime: 0,
                        maxLifetime: nearPlanet ? 20 : 30
                    });
                }
                
                // Remove NPC
                state.npcShips.splice(i, 1);
                try { if (typeof window !== 'undefined' && window.DEBUG_SPAWN) console.log(`[SpawnSystem] Despawned distant NPC`); } catch(_) {}
            }
        }
        
        // Update asteroids
        for (let i = state.asteroids.length - 1; i >= 0; i--) {
            const asteroid = state.asteroids[i];
            
            // Remove destroyed asteroids
            if (asteroid.health <= 0) {
                this.eventBus.emit('asteroid.destroyed', { asteroid });
                state.asteroids.splice(i, 1);
                continue;
            }
            
            // Update position
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            
            // Wrap around world boundaries
            const half = Math.floor(((GameConstants?.WORLD?.ASTEROID_WORLD_SIZE ?? 4000) / 2));
            if (asteroid.x > half) asteroid.x = -half;
            if (asteroid.x < -half) asteroid.x = half;
            if (asteroid.y > half) asteroid.y = -half;
            if (asteroid.y < -half) asteroid.y = half;
            
            // Slight random drift
            if (Math.random() < 0.002) {
                asteroid.vx += (Math.random() - 0.5) * 0.05;
                asteroid.vy += (Math.random() - 0.5) * 0.05;
                asteroid.vx = Math.max(-0.4, Math.min(0.4, asteroid.vx));
                asteroid.vy = Math.max(-0.4, Math.min(0.4, asteroid.vy));
            }
        }
        
        // Update pickups
        for (let i = state.pickups.length - 1; i >= 0; i--) {
            const pickup = state.pickups[i];
            
            // Update position
            pickup.x += pickup.vx;
            pickup.y += pickup.vy;
            
            // Slow down over time
            pickup.vx *= 0.99;
            pickup.vy *= 0.99;
            
            // Update lifetime
            pickup.lifetime++;
            
            // Remove expired pickups
            if (pickup.lifetime >= pickup.maxLifetime) {
                this.eventBus.emit('pickup.expired', { pickup });
                state.pickups.splice(i, 1);
            }
        }
        
        // Update warp effects
        if (state.warpEffects) {
            if (!state.pools) state.pools = {};
            if (!state.pools.warpEffects) state.pools.warpEffects = [];
            for (let i = state.warpEffects.length - 1; i >= 0; i--) {
                const effect = state.warpEffects[i];
                effect.lifetime++;
                if (effect.lifetime >= effect.maxLifetime) {
                    state.pools.warpEffects.push(effect);
                    state.warpEffects.splice(i, 1);
                }
            }
        }

        // Update hitsparks
        if (state.hitSparks) {
            if (!state.pools) state.pools = {};
            if (!state.pools.hitSparks) state.pools.hitSparks = [];
            for (let i = state.hitSparks.length - 1; i >= 0; i--) {
                const s = state.hitSparks[i];
                s.lifetime++;
                if (s.lifetime >= s.maxLifetime) {
                    state.pools.hitSparks.push(s);
                    state.hitSparks.splice(i, 1);
                }
            }
        }

        // Update debris
        if (state.debris) {
            if (!state.pools) state.pools = {};
            if (!state.pools.debris) state.pools.debris = [];
            for (let i = state.debris.length - 1; i >= 0; i--) {
                const d = state.debris[i];
                d.lifetime++;
                d.x += d.vx; d.y += d.vy;
                d.vx *= 0.985; d.vy *= 0.985;
                d.angle += d.va;
                if (d.lifetime >= d.maxLifetime) {
                    state.pools.debris.push(d);
                    state.debris.splice(i, 1);
                }
            }
        }

        // Update explosion flipbook animations
        if (state.explosionAnims && state.explosionAnims.length) {
            const now = performance.now ? performance.now() : Date.now();
            for (let i = state.explosionAnims.length - 1; i >= 0; i--) {
                const a = state.explosionAnims[i];
                const elapsed = (now - a.start) / 1000;
                const frame = Math.floor(elapsed * (a.fps || 24));
                if (frame >= a.frames.length) {
                    state.explosionAnims.splice(i, 1);
                } else {
                    a.idx = frame;
                    a.alpha = Math.max(0, 1 - (frame / a.frames.length));
                }
            }
        }

        // Update muzzle flashes
        if (state.muzzleFlashes) {
            if (!state.pools) state.pools = {};
            if (!state.pools.muzzleFlashes) state.pools.muzzleFlashes = [];
            for (let i = state.muzzleFlashes.length - 1; i >= 0; i--) {
                const m = state.muzzleFlashes[i];
                m.lifetime++;
                if (m.lifetime >= m.maxLifetime) {
                    state.pools.muzzleFlashes.push(m);
                    state.muzzleFlashes.splice(i, 1);
                }
            }
        }

        // Update shield hit rings
        if (state.shieldHits) {
            if (!state.pools) state.pools = {};
            if (!state.pools.shieldHits) state.pools.shieldHits = [];
            for (let i = state.shieldHits.length - 1; i >= 0; i--) {
                const sh = state.shieldHits[i];
                sh.lifetime++;
                if (sh.lifetime >= sh.maxLifetime) {
                    state.pools.shieldHits.push(sh);
                    state.shieldHits.splice(i, 1);
                }
            }
        }

        // Update explosions
        if (state.explosions) {
            if (!state.pools) state.pools = {};
            if (!state.pools.explosions) state.pools.explosions = [];
            for (let i = state.explosions.length - 1; i >= 0; i--) {
                const exp = state.explosions[i];
                exp.lifetime++;
                
                if (exp.lifetime >= exp.maxLifetime) {
                    state.pools.explosions.push(exp);
                    state.explosions.splice(i, 1);
                }
            }
        }
    }

    // Allow QA to tune suppression windows at runtime (OFF by default)
    _syncSpawnPolicyFromWindow() {
        try {
            const win = (typeof window !== 'undefined') ? window : null;
            if (!win) return;
            if (typeof win.SPAWN_TYPE_COOLDOWN_MS !== 'undefined') {
                const v = Number(win.SPAWN_TYPE_COOLDOWN_MS);
                if (!Number.isNaN(v)) this._typeCooldownMs = Math.max(0, Math.min(20000, v|0));
            }
            if (typeof win.SPAWN_PIRATE_SUPPRESS_MS !== 'undefined') {
                const p = Number(win.SPAWN_PIRATE_SUPPRESS_MS);
                if (!Number.isNaN(p)) this._pirateSuppressMs = Math.max(0, Math.min(20000, p|0));
            }
        } catch(_) {}
    }
    
    /**
     * Clean up spawn system
     */
    destroy() {
        // Unsubscribe from events
        this.eventBus.off(GameEvents.NPC_DEATH, this.handleNPCDeath);
        this.eventBus.off(GameEvents.SHIP_DEATH, () => {}); // legacy inline handler; kept for safety
        this.eventBus.off('asteroid.destroyed', this.handleAsteroidDestroyed);
        this.eventBus.off('pickup.expired', this.handlePickupExpired);
        this.eventBus.off(GameEvents.EXPLOSION, this.handleExplosion);
        this.eventBus.off(GameEvents.WARP_EFFECT_CREATED, this.handleWarpEffectCreated);
        this.eventBus.off(GameEvents.PHYSICS_SHIP_TAKEOFF, this.handleShipTakeoff);
        this.eventBus.off(GameEvents.SHIP_LANDED, this.handleShipLanded);
        
        console.log('[SpawnSystem] Destroyed');
    }
}

export default SpawnSystem;
