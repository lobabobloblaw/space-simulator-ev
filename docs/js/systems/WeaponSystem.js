import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { GameConstants } from '../utils/Constants.js';

/**
 * WeaponSystem - Handles all weapon mechanics (firing, projectiles, damage)
 * Manages projectile creation, collision detection, and weapon switching
 */
export class WeaponSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // System state
        this.projectiles = [];
        this.weaponTypes = {
            laser: { type: "laser", damage: 10, cooldown: 15, speed: 2 },
            rapid: { type: "rapid", damage: 5, cooldown: 5, speed: 3 },
            plasma: { type: "plasma", damage: 20, cooldown: 30, speed: 1.5 },
            mining: { type: "mining", damage: 3, cooldown: 10, speed: 2 }
        };
        
        // Bind event handlers
        this.handleWeaponFire = this.handleWeaponFire.bind(this);
        this.handleWeaponSwitch = this.handleWeaponSwitch.bind(this);
        this.handleProjectileUpdate = this.handleProjectileUpdate.bind(this);
        this.handleEntityDestroyed = this.handleEntityDestroyed.bind(this);
        
        console.log('[WeaponSystem] Created');
    }
    
    /**
     * Initialize the weapon system
     */
    init() {
        // Subscribe to weapon events
        this.subscribeToEvents();
        
        // Sync initial state
        this.syncState();
        
        console.log('[WeaponSystem] Initialized');
    }
    
    /**
     * Subscribe to game events
     */
    subscribeToEvents() {
        // Input events - WeaponSystem directly handles weapon input through update()
        // No need to subscribe to INPUT_FIRE as we handle it in update()
        
        // Weapon events
        this.eventBus.on(GameEvents.WEAPON_FIRE, this.handleWeaponFire);
        this.eventBus.on(GameEvents.INPUT_SWITCH_WEAPON, this.handleWeaponSwitch);
        
        // Combat events
        this.eventBus.on(GameEvents.PHYSICS_COLLISION, this.handleCollision.bind(this));
        this.eventBus.on(GameEvents.ENTITY_DESTROYED, this.handleEntityDestroyed);
    }
    
    /**
     * Handle weapon fire event
     */
    handleWeaponFire(data) {
        if (!data || !data.shooter) return;
        
        const weapon = data.weapon || this.weaponTypes.laser;
        this.fireProjectile(
            data.shooter,
            data.angle,
            data.isPlayer || false,
            weapon
        );
        
        // Emit sound event
        this.eventBus.emit(GameEvents.WEAPON_FIRED, {
            weapon: weapon,
            shooter: data.shooter,
            isPlayer: data.isPlayer
        });
    }
    
    /**
     * Handle weapon switch event
     */
    handleWeaponSwitch(data) {
        if (!data || !data.ship) return;
        
        const ship = data.ship;
        if (ship.weapons && ship.weapons.length > 1) {
            ship.currentWeapon = (ship.currentWeapon + 1) % ship.weapons.length;
            
            // Emit UI update
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: ship });
            
            console.log('[WeaponSystem] Switched to weapon:', ship.weapons[ship.currentWeapon].type);
        }
    }
    
    /**
     * Handle projectile update event
     */
    handleProjectileUpdate(data) {
        // This would be called from the game loop to update projectile positions
        // For now, the update logic is in the update() method
    }
    
    /**
     * Handle entity destroyed event
     */
    handleEntityDestroyed(data) {
        if (!data || !data.entity) return;
        
        // Check if any projectiles belonged to the destroyed entity
        this.projectiles = this.projectiles.filter(proj => proj.shooter !== data.entity);
    }
    
    /**
     * Handle collision event
     */
    handleCollision(data) {
        if (!data) return;
        
        // Check for projectile collisions
        if (data.type === 'projectile' && data.target) {
            this.handleProjectileHit(data.projectile, data.target);
        }
    }
    
    /**
     * Fire a projectile
     */
    fireProjectile(shooter, angle, isPlayer, weapon) {
        if (!shooter || !weapon) return;
        
        // Apply weapon-specific spread (degrees)
        // Base spread per-weapon (degrees)
        let spreadDeg = (weapon.type === 'rapid') ? 4.0
                           : (weapon.type === 'laser') ? 1.2
                           : (weapon.type === 'plasma') ? 1.0
                            : 0.0;
        // Debug global spread multiplier
        try {
            const dbg = this.stateManager.state.debug || {};
            const mult = (typeof dbg.spreadMult === 'number') ? dbg.spreadMult : 1;
            spreadDeg *= mult;
        } catch (_) {}
        // Dynamic recoil bloom for player: grows with sustained fire, decays over time (see update())
        if (isPlayer) {
            const ship = shooter;
            const bloom = Math.min(6.0, Math.max(0, ship.spreadBloom || 0));
            // Apply debug multiplier to bloom as well
            try {
                const dbg = this.stateManager.state.debug || {};
                const mult = (typeof dbg.spreadMult === 'number') ? dbg.spreadMult : 1;
                spreadDeg += bloom * mult;
            } catch (_) {
                spreadDeg += bloom;
            }
        }
        const spreadRad = spreadDeg * Math.PI / 180;
        const jitter = (Math.random() - 0.5) * 2 * spreadRad;
        const finalAngle = angle + jitter;

        // Create projectile with proper velocity based on weapon type
        const projectile = {
            x: shooter.x + Math.cos(finalAngle) * (shooter.size + 5),
            y: shooter.y + Math.sin(finalAngle) * (shooter.size + 5),
            vx: Math.cos(finalAngle) * weapon.speed + shooter.vx,
            vy: Math.sin(finalAngle) * weapon.speed + shooter.vy,
            isPlayer: isPlayer,
            shooter: shooter,
            lifetime: 0,
            damage: weapon.damage,
            type: weapon.type,
            // Visual tuning for trails
            trailLen: (weapon.type === 'rapid') ? 7 : (weapon.type === 'plasma') ? 9 : 6,
            trailWidth: (weapon.type === 'rapid') ? 2 : (weapon.type === 'plasma') ? 4 : 3
        };
        
        // Adjust velocity for specific weapon types
        if (weapon.type === "rapid") {
            projectile.vx = Math.cos(finalAngle) * 3 + shooter.vx;
            projectile.vy = Math.sin(finalAngle) * 3 + shooter.vy;
        } else if (weapon.type === "plasma") {
            projectile.vx = Math.cos(finalAngle) * 1.5 + shooter.vx;
            projectile.vy = Math.sin(finalAngle) * 1.5 + shooter.vy;
        } else if (weapon.type === "mining") {
            projectile.vx = Math.cos(finalAngle) * 2 + shooter.vx;
            projectile.vy = Math.sin(finalAngle) * 2 + shooter.vy;
        } else {
            // Default laser
            projectile.vx = Math.cos(finalAngle) * 2 + shooter.vx;
            projectile.vy = Math.sin(finalAngle) * 2 + shooter.vy;
        }
        
        // Add to projectiles array
        this.projectiles.push(projectile);
        
        // Sync to state
        this.syncState();
        
        console.log(`[WeaponSystem] Fired ${weapon.type} projectile`);

        // Increase recoil bloom for player after shot
        if (isPlayer) {
            const ship = shooter;
            const add = (weapon.type === 'rapid') ? 0.4 : (weapon.type === 'plasma') ? 0.3 : 0.25;
            ship.spreadBloom = Math.min(6.0, (ship.spreadBloom || 0) + add);
        }

        // Create short-lived muzzle flash at fire position (pooled)
        try {
            const state = this.stateManager.state;
            if (!state.muzzleFlashes) state.muzzleFlashes = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.muzzleFlashes) state.pools.muzzleFlashes = [];
            const fx = state.pools.muzzleFlashes.pop() || {};
            fx.x = projectile.x;
            fx.y = projectile.y;
            fx.angle = finalAngle;
            fx.color = (weapon.type === 'plasma') ? '#88ffff' : (weapon.type === 'rapid') ? '#ffbb66' : '#ffffaa';
            fx.lifetime = 0;
            fx.maxLifetime = 6;
            // Soft-cap
            if (state.muzzleFlashes.length > 40) {
                const old = state.muzzleFlashes.shift();
                if (old) state.pools.muzzleFlashes.push(old);
            }
            state.muzzleFlashes.push(fx);
        } catch (_) {}
    }
    
    /**
     * Update projectiles
     */
    updateProjectiles(ship, npcShips, asteroids, explosions, audioSystem) {
        const state = this.stateManager.state;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Update position
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.lifetime++;
            
            // Remove expired projectiles (per-type lifetime, extended for longer travel)
            let maxLifetime = GameConstants?.WEAPONS?.PROJECTILE_LIFETIME ?? 100;
            if (proj.type === 'rapid') maxLifetime = 80;
            else if (proj.type === 'plasma') maxLifetime = 140;
            else if (proj.type === 'mining') maxLifetime = 100;
            // Apply optional debug multiplier
            const mult = (state && state.debug && typeof state.debug.projLifetimeMult === 'number')
                ? state.debug.projLifetimeMult : 1;
            maxLifetime = Math.floor(maxLifetime * mult);
            // 'laser' uses default
            if (proj.lifetime > maxLifetime) {
                this.projectiles.splice(i, 1);
                this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_EXPIRED, { projectile: proj });
                continue;
            }
            
            // Check collision with player ship
            if (!proj.isPlayer && ship && !ship.isDestroyed) {
                const dx = ship.x - proj.x;
                const dy = ship.y - proj.y;
                if (Math.sqrt(dx * dx + dy * dy) < ship.size) {
                    this.handleProjectileHitShip(proj, ship, explosions, audioSystem);
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
            
            // Check collision with NPCs
            if (npcShips) {
                for (let npc of npcShips) {
                    if (proj.shooter === npc) continue;
                    
                    const dx = npc.x - proj.x;
                    const dy = npc.y - proj.y;
                    if (Math.sqrt(dx * dx + dy * dy) < npc.size) {
                        this.handleProjectileHitNPC(proj, npc, explosions);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Check collision with asteroids
            if (asteroids) {
                for (let asteroid of asteroids) {
                    const dx = asteroid.x - proj.x;
                    const dy = asteroid.y - proj.y;
                    if (Math.sqrt(dx * dx + dy * dy) < asteroid.radius) {
                        this.handleProjectileHitAsteroid(proj, asteroid, explosions);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }
        
        // Sync state after updates
        this.syncState();
    }
    
    /**
     * Handle projectile hitting the player ship
     */
    handleProjectileHitShip(projectile, ship, explosions, audioSystem) {
        const hadShield = ship.shield > 0;
        const dmg = projectile.damage;
        const god = this.stateManager.state.debug?.godMode;
        if (!god) {
            if (ship.shield > 0) {
                ship.shield = Math.max(0, ship.shield - dmg);
                this.eventBus.emit(GameEvents.SHIELD_HIT, { ship, damage: dmg });
                if (audioSystem && audioSystem.playShieldHit) audioSystem.playShieldHit();
            } else {
                ship.health = Math.max(0, ship.health - dmg);
                this.eventBus.emit(GameEvents.SHIP_DAMAGE, { ship, damage: dmg });
                if (audioSystem && audioSystem.playExplosion) audioSystem.playExplosion(true);
            }
        }
        // Create hit effect
        if (explosions && this.createExplosion) {
            explosions.push(this.createExplosion(projectile.x, projectile.y, true));
        }
        // Lightweight spark (reduced when shield absorbed)
        this.createHitSpark(projectile.x, projectile.y, hadShield ? 'shield' : projectile.type, { scale: hadShield ? 0.6 : 1 });
        // Debug damage number
        this.eventBus.emit('debug.damage', { x: projectile.x, y: projectile.y, amount: dmg });
        
        // Emit projectile hit event
        this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
            projectile: projectile,
            target: ship,
            isPlayer: true
        });
    }
    
    /**
     * Handle projectile hitting an NPC
     */
    handleProjectileHitNPC(projectile, npc, explosions) {
        // Ignore further damage once death sequence has started
        if (npc.deathSeq) {
            // Still allow a small visual hit effect without altering state
            if (explosions && this.createExplosion) {
                explosions.push(this.createExplosion(projectile.x, projectile.y, true));
            }
            this.createHitSpark(projectile.x, projectile.y, projectile.type);
            return;
        }
        // Apply damage with clamp to prevent negative health
        npc.health = Math.max(0, (npc.health || 0) - projectile.damage);
        
        // Mark killer if NPC dies
        if (npc.health <= 0 && !npc.killedBy) {
            npc.killedBy = projectile.isPlayer ? 'player' : 'npc';
        }
        
        // Create hit effect
        if (explosions && this.createExplosion) {
            explosions.push(this.createExplosion(projectile.x, projectile.y, true));
        }
        // Lightweight spark
        this.createHitSpark(projectile.x, projectile.y, projectile.type);
        // Debug damage number
        this.eventBus.emit('debug.damage', { x: projectile.x, y: projectile.y, amount: projectile.damage });
        
        // Emit events
        this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
            projectile: projectile,
            target: npc,
            isNPC: true
        });
        
        if (npc.health <= 0) {
            if (!npc.deathEventEmitted) {
                npc.deathEventEmitted = true;
                this.eventBus.emit(GameEvents.NPC_DEATH, {
                    npc: npc,
                    killedBy: npc.killedBy
                });
            }
        }
    }
    
    /**
     * Handle projectile hitting an asteroid
     */
    handleProjectileHitAsteroid(projectile, asteroid, explosions) {
        // Apply damage
        asteroid.health -= projectile.damage;
        
        // Create hit effect
        if (explosions && this.createExplosion) {
            explosions.push(this.createExplosion(projectile.x, projectile.y, true));
        }
        // Lightweight spark
        this.createHitSpark(projectile.x, projectile.y, 'mining');
        
        // Emit event
        this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
            projectile: projectile,
            target: asteroid,
            isAsteroid: true
        });
    }
    
    /**
     * Create explosion helper (should be imported from effects system)
     */
    createExplosion(x, y, small = false) {
        return {
            x: x,
            y: y,
            radius: small ? 5 : 15,
            maxRadius: small ? 15 : 40,
            lifetime: 0,
            maxLifetime: 20
        };
    }

    /**
     * Lightweight hitspark effect (pooled)
     */
    createHitSpark(x, y, type = 'laser', opts = {}) {
        const state = this.stateManager.state;
        if (!state.hitSparks) state.hitSparks = [];
        if (!state.pools) state.pools = {};
        if (!state.pools.hitSparks) state.pools.hitSparks = [];
        const spark = state.pools.hitSparks.pop() || {};
        spark.x = x;
        spark.y = y;
        spark.dir = Math.random() * Math.PI * 2;
        spark.lifetime = 0;
        spark.maxLifetime = 10;
        const scale = Math.max(0.3, Math.min(1.5, opts.scale || 1));
        spark.size = 6 * scale;
        spark.color = (type === 'plasma') ? '#88ffff' : (type === 'rapid') ? '#ffbb66' : (type === 'shield') ? '#66e0ff' : '#ffffaa';
        // Soft-cap
        if (state.hitSparks.length > 120) {
            const old = state.hitSparks.shift();
            if (old) state.pools.hitSparks.push(old);
        }
        state.hitSparks.push(spark);
    }
    
    /**
     * Process weapon input for a ship
     */
    processWeaponInput(ship, keys, audioSystem) {
        if (!ship || !keys) return;
        
        // Keys should always be a Set in Pure EventBus
        const hasKey = (key) => {
            const checkKey = key.toLowerCase();
            // Now that StateManager doesn't proxy Sets, this should work
            if (keys instanceof Set) {
                return keys.has(checkKey);
            }
            // Fallback for object-based keys (shouldn't happen in Pure EventBus)
            return keys[checkKey] || keys['Key' + checkKey.toUpperCase()];
        };
        
        // Fire weapon
        if (hasKey('f') && ship.weaponCooldown <= 0 && ship.weapons && ship.weapons.length > 0) {
            const weapon = ship.weapons[ship.currentWeapon];
            
            // Fire projectile
            this.fireProjectile(ship, ship.angle, true, weapon);
            
            // Set cooldown (with slight cadence variance for rapid fire)
            if (weapon.type === 'rapid') {
                const jitter = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 0 : 1);
                ship.weaponCooldown = Math.max(3, weapon.cooldown + jitter);
            } else {
                ship.weaponCooldown = weapon.cooldown;
            }
            
            // Play sound (with proper context binding)
            if (audioSystem && audioSystem.playLaser) {
                audioSystem.playLaser(weapon.type);
            }
            
            // Emit fired event
            this.eventBus.emit(GameEvents.WEAPON_FIRED, {
                weapon: weapon,
                shooter: ship,
                isPlayer: true
            });
        }
        
        // Switch weapons (emit event only; switching handled centrally)
        if (hasKey('q') && !ship.weaponSwitchPressed && ship.weapons && ship.weapons.length > 1) {
            ship.weaponSwitchPressed = true;
            this.eventBus.emit(GameEvents.INPUT_SWITCH_WEAPON);
        } else if (!hasKey('q')) {
            ship.weaponSwitchPressed = false;
        }
        
        // Update weapon cooldown
        if (ship.weaponCooldown > 0) {
            ship.weaponCooldown--;
        }
    }
    
    /**
     * Fire projectile for NPC
     */
    fireNPCProjectile(npc, target) {
        if (!npc || !npc.weapon || npc.weaponCooldown > 0) return;
        
        // Calculate angle to target
        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        let angle = Math.atan2(dy, dx);

        // Apply range-based aim error using GameConstants.NPC.ACCURACY
        try {
            const dist = Math.sqrt(dx * dx + dy * dy);
            const ACC = GameConstants?.NPC?.ACCURACY || { close: 0.8, medium: 0.5, long: 0.3, max: 0.2 };
            const MOVEP = GameConstants?.NPC?.MOVEMENT_PENALTY ?? 0.5;
            const speed = Math.sqrt((target.vx || 0) ** 2 + (target.vy || 0) ** 2);
            // Determine bucket and base spread
            let acc = ACC.long; let baseSpreadDeg = 9;
            if (dist < 150) { acc = ACC.close; baseSpreadDeg = 3; }
            else if (dist < 300) { acc = ACC.medium; baseSpreadDeg = 6; }
            else if (dist > 450) { acc = ACC.max; baseSpreadDeg = 12; }
            // Movement penalty scales with target speed (normalized to ~0.8 default max speed)
            const speedFactor = Math.min(1, speed / 0.8);
            const effectiveAcc = Math.max(0, Math.min(1, acc * (1 - MOVEP * speedFactor)));
            const spreadDeg = baseSpreadDeg * (1 - effectiveAcc);
            const spreadRad = spreadDeg * Math.PI / 180;
            angle += (Math.random() - 0.5) * 2 * spreadRad;
        } catch (_) {}
        
        // Fire projectile
        this.fireProjectile(npc, angle, false, npc.weapon);
        
        // Set cooldown (with slight cadence variance for rapid fire)
        if (npc.weapon.type === 'rapid') {
            const jitter = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.5 ? 0 : 1);
            npc.weaponCooldown = Math.max(3, npc.weapon.cooldown + jitter);
        } else {
            npc.weaponCooldown = npc.weapon.cooldown;
        }
        
        // Emit event
        this.eventBus.emit(GameEvents.WEAPON_FIRED, {
            weapon: npc.weapon,
            shooter: npc,
            isPlayer: false
        });
    }
    
    /**
     * Get weapon by type
     */
    getWeaponType(type) {
        return this.weaponTypes[type] || this.weaponTypes.laser;
    }
    
    /**
     * Add new weapon type
     */
    addWeaponType(type, config) {
        this.weaponTypes[type] = config;
    }
    
    /**
     * Get all projectiles
     */
    getProjectiles() {
        return this.projectiles;
    }
    
    /**
     * Clear all projectiles
     */
    clearProjectiles() {
        this.projectiles = [];
        this.syncState();
    }
    
    /**
     * Update weapon system (called each frame)
     */
    update(state, deltaTime) {
        // Sync projectiles from state if they exist
        if (state && state.projectiles) {
            this.projectiles = state.projectiles;
        }
        
        // Update projectiles if we have access to game state
        if (state) {
            this.updateProjectiles(
                state.ship,
                state.npcShips,
                state.asteroids,
                state.explosions,
                state.audioSystem
            );
        }
        
        // Process weapon input for player
        if (state && state.ship && state.input && state.input.keys) {
            // Always use state.input.keys directly to avoid Proxy issues
            this.processWeaponInput(state.ship, state.input.keys, state.audioSystem);
        }

        // Decay recoil bloom
        if (state && state.ship) {
            if (state.ship.spreadBloom && state.ship.spreadBloom > 0) {
                state.ship.spreadBloom = Math.max(0, state.ship.spreadBloom - 0.03);
            }
        }
    }
    
    /**
     * Sync weapon state to StateManager
     */
    syncState() {
        // Store projectiles in state
        const state = this.stateManager.state;
        state.projectiles = this.projectiles;
    }
    
    /**
     * Clean up weapon system
     */
    destroy() {
        // Clear projectiles
        this.projectiles = [];
        
        // Unsubscribe from events
        this.eventBus.off(GameEvents.WEAPON_FIRE, this.handleWeaponFire);
        this.eventBus.off(GameEvents.INPUT_SWITCH_WEAPON, this.handleWeaponSwitch);
        this.eventBus.off(GameEvents.PHYSICS_COLLISION, this.handleCollision);
        this.eventBus.off(GameEvents.ENTITY_DESTROYED, this.handleEntityDestroyed);
        
        console.log('[WeaponSystem] Destroyed');
    }
}

export default WeaponSystem;
