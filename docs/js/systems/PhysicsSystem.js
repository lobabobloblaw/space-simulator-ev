import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { GameConstants } from '../utils/Constants.js';
import { MathUtils } from '../utils/MathUtils.js';

/**
 * PhysicsSystem - Handles all physics simulation
 * Movement, velocity, collision detection, etc.
 */
export class PhysicsSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Physics constants
        this.SPACE_FRICTION = 1.0;  // No friction in space!
        this.BRAKE_FRICTION = 0.95;
        const worldHalf = Math.floor(((GameConstants?.WORLD?.ASTEROID_WORLD_SIZE ?? 4000) / 2));
        this.WORLD_BOUNDS = { min: -worldHalf, max: worldHalf };
        
        // Movement state tracking
        this.thrustActive = false;
        this.brakeActive = false;
        this.turnDirection = 0; // -1 left, 0 none, 1 right
        
        // Bound event handlers
        this.handleThrust = this.handleThrust.bind(this);
        this.handleBrake = this.handleBrake.bind(this);
        this.handleTurn = this.handleTurn.bind(this);
        
        console.log('[PhysicsSystem] Created');
    }
    
    /**
     * Initialize the physics system
     */
    init() {
        // Subscribe to input events
        this.subscribeToEvents();
        
        // Initialize physics state in StateManager if needed
        this.initializePhysicsState();
        
        console.log('[PhysicsSystem] Initialized');
    }
    
    /**
     * Subscribe to relevant events
     */
    subscribeToEvents() {
        // Movement controls
        this.eventBus.on(GameEvents.INPUT_THRUST, this.handleThrust);
        this.eventBus.on(GameEvents.INPUT_BRAKE, this.handleBrake);
        this.eventBus.on(GameEvents.INPUT_TURN, this.handleTurn);
    }
    
    /**
     * Initialize physics state in StateManager
     */
    initializePhysicsState() {
        const state = this.stateManager.state;
        
        // Ensure physics namespace exists
        if (!state.physics) {
            state.physics = {
                entities: [],
                collisions: []
            };
        }
    }
    
    /**
     * Handle thrust input
     */
    handleThrust(data) {
        this.thrustActive = data.active;
        
        // Emit physics event for other systems
        this.eventBus.emit(GameEvents.PHYSICS_THRUST_CHANGED, { active: data.active });
    }
    
    /**
     * Handle brake input
     */
    handleBrake(data) {
        this.brakeActive = data.active;
        
        // Emit physics event
        this.eventBus.emit(GameEvents.PHYSICS_BRAKE_CHANGED, { active: data.active });
    }
    
    /**
     * Handle turn input
     */
    handleTurn(data) {
        this.turnDirection = data.direction;
        
        // Emit physics event
        this.eventBus.emit(GameEvents.PHYSICS_TURN_CHANGED, { direction: data.direction });
    }
    
    /**
     * Main physics update
     */
    update(state, deltaTime) {
        // For now, we're working alongside the old physics code
        // We'll handle the player ship physics here and gradually migrate more
        
        // Update player ship physics
        this.updateShipPhysics(state, deltaTime);
        
        // Update NPC physics (when migrated)
        this.updateNPCPhysics(state, deltaTime);
        
        // Projectiles are updated in WeaponSystem; avoid double-updating here
        
        // Update asteroid physics (when migrated)
        this.updateAsteroidPhysics(state, deltaTime);
        
        // Update pickup physics (when migrated)
        this.updatePickupPhysics(state, deltaTime);
        
        // Check collisions
        this.checkCollisions(state);
        
        // Sync physics state
        this.syncPhysicsState(state);
    }
    
    /**
     * Update player ship physics
     */
    updateShipPhysics(state, deltaTime) {
        // Access the ship from state
        const ship = state.ship;
        if (!ship || ship.isDestroyed) return;
        
        // Handle rotation
        if (this.turnDirection !== 0) {
            const turnSpeed = (GameConstants?.PHYSICS?.TURN_SPEED ?? 0.025); // radians per frame
            ship.angle += turnSpeed * this.turnDirection;
            
            // Normalize angle to 0-2π
            while (ship.angle < 0) ship.angle += Math.PI * 2;
            while (ship.angle > Math.PI * 2) ship.angle -= Math.PI * 2;
        }
        
        // Handle thrust
        if (this.thrustActive && ship.fuel > 0.1) {
            const thrustPower = ship.thrust || 0.012;
            const thrustX = Math.cos(ship.angle) * thrustPower;
            const thrustY = Math.sin(ship.angle) * thrustPower;
            
            ship.vx += thrustX;
            ship.vy += thrustY;
            
            // Consume fuel
            ship.fuel = Math.max(0, ship.fuel - 0.1);
            
            // Emit thrust event for effects
            this.eventBus.emit(GameEvents.PHYSICS_SHIP_THRUSTING, { 
                ship, 
                angle: ship.angle 
            });
        }
        
        // Handle braking (retro-thrust opposite current velocity; consumes fuel)
        if (this.brakeActive && ship.fuel > 0.01) {
            const vx0 = ship.vx || 0, vy0 = ship.vy || 0;
            const speed = Math.hypot(vx0, vy0);
            if (speed > 0.0005) {
                const baseThrust = ship.thrust || 0.012;
                const mult = (GameConstants?.SHIP?.BRAKE_THRUST_MULT ?? 1.0);
                const brakePower = baseThrust * mult;
                const ax = -(vx0 / speed) * brakePower;
                const ay = -(vy0 / speed) * brakePower;
                ship.vx += ax;
                ship.vy += ay;
                // Prevent overshoot reversal: if velocity flipped past zero, clamp to 0
                if ((vx0 * ship.vx + vy0 * ship.vy) < 0) { ship.vx = 0; ship.vy = 0; }
                // Consume fuel for brake thrust
                const cost = (GameConstants?.SHIP?.BRAKE_FUEL_COST ?? 0.1);
                ship.fuel = Math.max(0, ship.fuel - cost);
            }
        }
        
        // No friction in space! Ship maintains velocity (Newton's first law)
        // ship.vx *= this.SPACE_FRICTION;  // Commented out - no friction
        // ship.vy *= this.SPACE_FRICTION;  // Commented out - no friction
        
        // Apply velocity limits
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        const maxSpeed = ship.maxSpeed || 0.45;
        
        if (speed > maxSpeed) {
            const scale = maxSpeed / speed;
            ship.vx *= scale;
            ship.vy *= scale;
        }
        
        // Update position
        ship.x += ship.vx;
        ship.y += ship.vy;
        
        // Regenerate fuel slowly
        if (ship.fuel < ship.maxFuel) {
            const rate = (GameConstants?.SHIP?.FUEL_REGEN_RATE ?? 0.01);
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + rate);
        }
        
        // Regenerate shields slowly
        if (ship.shield < ship.maxShield) {
            const rate = (GameConstants?.SHIP?.SHIELD_REGEN_RATE ?? 0.02);
            ship.shield = Math.min(ship.maxShield, ship.shield + rate);
        }
        
        // Regenerate health when landed
        if (ship.isLanded && ship.health < ship.maxHealth) {
            const rate = (GameConstants?.SHIP?.HEALTH_REGEN_RATE_LANDED ?? 0.1);
            ship.health = Math.min(ship.maxHealth, ship.health + rate);
        }
        
        // Update weapon cooldown
        if (ship.weaponCooldown > 0) {
            ship.weaponCooldown--;
        }
        
        // Update landing cooldown
        if (ship.landingCooldown > 0) {
            ship.landingCooldown--;
        }
        
        // Check if ship has moved away from landed planet
        if (ship.isLanded && ship.landedPlanet) {
            const distance = MathUtils.distance(ship.x, ship.y, ship.landedPlanet.x, ship.landedPlanet.y);
            
            if (distance > ship.landedPlanet.radius + (GameConstants?.PHYSICS?.LANDING_CLEAR_DISTANCE ?? 100)) {
                ship.isLanded = false;
                ship.landedPlanet = null;
                
                // Emit takeoff event
                this.eventBus.emit(GameEvents.PHYSICS_SHIP_TAKEOFF);
            }
        }
    }
    
    /**
     * Update NPC physics
     */
    updateNPCPhysics(state, deltaTime) {
        // Access NPCs from state
        const npcShips = state.npcShips;
        if (!npcShips) return;
        
        for (let npc of npcShips) {
            // NPCs handle their own AI in the old system
            // We'll just apply physics constraints here
            
            // No friction in space for NPCs either!
            // npc.vx *= this.SPACE_FRICTION;  // Removed - no friction
            // npc.vy *= this.SPACE_FRICTION;  // Removed - no friction
            
            // Apply velocity limits
            const speed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
            if (speed > npc.maxSpeed) {
                const scale = npc.maxSpeed / speed;
                npc.vx *= scale;
                npc.vy *= scale;
            }
            
            // Position is updated in the old system for now
        }
    }
    
    /**
     * Update projectile physics
     */
    updateProjectilePhysics(state, deltaTime) {
        // Access projectiles from state
        const projectiles = state.projectiles;
        if (!projectiles) return;
        
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            
            // Simple linear motion (no gravity in space)
            proj.x += proj.vx;
            proj.y += proj.vy;
            
            // Update lifetime
            proj.lifetime++;
            
            // Remove old projectiles
            if (proj.lifetime > 60) {
                projectiles.splice(i, 1);
                
                // Emit projectile expired event
                this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_EXPIRED, { projectile: proj });
            }
        }
    }
    
    /**
     * Update asteroid physics
     */
    updateAsteroidPhysics(state, deltaTime) {
        // Access asteroids from state
        const asteroids = state.asteroids;
        if (!asteroids) return;
        
        for (let asteroid of asteroids) {
            // Update position
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            
            // Update rotation
            if (asteroid.rotationSpeed) {
                asteroid.rotation = (asteroid.rotation || 0) + asteroid.rotationSpeed;
            }
            
            // Wrap around world boundaries
            if (asteroid.x > this.WORLD_BOUNDS.max) asteroid.x = this.WORLD_BOUNDS.min;
            if (asteroid.x < this.WORLD_BOUNDS.min) asteroid.x = this.WORLD_BOUNDS.max;
            if (asteroid.y > this.WORLD_BOUNDS.max) asteroid.y = this.WORLD_BOUNDS.min;
            if (asteroid.y < this.WORLD_BOUNDS.min) asteroid.y = this.WORLD_BOUNDS.max;
            
            // Slight random drift
            if (Math.random() < 0.002) {
                asteroid.vx += (Math.random() - 0.5) * 0.05;
                asteroid.vy += (Math.random() - 0.5) * 0.05;
                
                // Clamp velocity
                asteroid.vx = Math.max(-0.4, Math.min(0.4, asteroid.vx));
                asteroid.vy = Math.max(-0.4, Math.min(0.4, asteroid.vy));
            }
        }
    }
    
    /**
     * Update pickup physics
     */
    updatePickupPhysics(state, deltaTime) {
        // Access pickups from state
        const pickups = state.pickups;
        if (!pickups) return;
        
        for (let i = pickups.length - 1; i >= 0; i--) {
            const pickup = pickups[i];
            
            // Float in space with momentum
            pickup.x += pickup.vx;
            pickup.y += pickup.vy;
            
            // Apply friction to slow down
            pickup.vx *= 0.99;
            pickup.vy *= 0.99;
            
            // Update lifetime
            pickup.lifetime++;
            
            // Remove expired pickups
            if (pickup.lifetime >= pickup.maxLifetime) {
                pickups.splice(i, 1);
                
                // Emit pickup expired event
                this.eventBus.emit(GameEvents.PHYSICS_PICKUP_EXPIRED, { pickup });
            }
        }
    }
    
    /**
     * Check all collisions
     */
    checkCollisions(state) {
        const ship = state.ship;
        if (!ship || ship.isDestroyed) return;
        
        const projectiles = state.projectiles || [];
        const asteroids = state.asteroids || [];
        const pickups = state.pickups || [];
        const npcShips = state.npcShips || [];
        
        // Clear previous collisions
        state.physics.collisions = [];
        
        // Ship-asteroid collisions
        for (let asteroid of asteroids) {
            if (this.checkCircleCollision(ship, asteroid)) {
                // Calculate impact physics
                const dx = ship.x - asteroid.x;
                const dy = ship.y - asteroid.y;
                
                // Relative velocity for damage
                const relVx = ship.vx - asteroid.vx;
                const relVy = ship.vy - asteroid.vy;
                const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
                
                // Calculate damage - scales with speed and asteroid size
                const dmgMult = (GameConstants?.PHYSICS?.ASTEROID_IMPACT_DAMAGE_MULT ?? 3);
                const baseDamage = Math.floor(relSpeed * asteroid.radius * dmgMult);
                const minDmg = (GameConstants?.PHYSICS?.MIN_COLLISION_DAMAGE ?? 5);
                let damage = Math.max(minDmg, baseDamage);
                if (this.stateManager.state.debug?.godMode) {
                    damage = 0; // God mode: no damage from impacts
                }
                
                // Apply damage
                if (damage > 0) {
                    let hullDamage = 0;
                    
                    if (ship.shield > 0) {
                        const shieldDamage = Math.min(ship.shield, damage);
                        ship.shield = Math.max(0, ship.shield - shieldDamage);
                        hullDamage = damage - shieldDamage;
                        
                        // Emit shield hit event
                        this.eventBus.emit(GameEvents.AUDIO_PLAY, {
                            sound: 'shieldHit'
                        });
                    } else {
                        hullDamage = damage;
                    }
                    
                    if (hullDamage > 0) {
                        ship.health = Math.max(0, ship.health - hullDamage);
                        
                        // Emit explosion sound
                        this.eventBus.emit(GameEvents.AUDIO_PLAY, {
                            sound: 'explosion',
                            volume: hullDamage < 20 ? 0.5 : 1.0
                        });
                    }
                    
                    // Screen shake/damage flash
                    ship.screenShake = Math.min(20, damage * 0.5);
                    ship.screenShakeDecay = (GameConstants?.PHYSICS?.SCREEN_SHAKE_DECAY ?? 0.8);
                    ship.damageFlash = (GameConstants?.PHYSICS?.DAMAGE_FLASH_INITIAL ?? 1.0);
                    
                    // Emit damage event
                    this.eventBus.emit(GameEvents.SHIP_DAMAGE, {
                        damage: damage,
                        source: 'asteroid',
                        asteroid: asteroid
                    });
                    
                    // Show warning for heavy damage
                    if (damage > (GameConstants?.PHYSICS?.HEAVY_COLLISION_DAMAGE_WARN ?? 30)) {
                        this.eventBus.emit(GameEvents.UI_MESSAGE, {
                            message: `⚠ HULL DAMAGE: -${damage} HP`,
                            type: 'error',
                            duration: 2000,
                            shake: true
                        });
                    }
                }
                
                // Bounce physics - more dramatic
                const angle = Math.atan2(dy, dx);
                const fBase = (GameConstants?.PHYSICS?.BOUNCE_FORCE_BASE ?? 0.5);
                const fMul = (GameConstants?.PHYSICS?.BOUNCE_FORCE_SPEED_MULT ?? 0.3);
                const force = fBase + relSpeed * fMul; // Variable force
                ship.vx += Math.cos(angle) * force;
                ship.vy += Math.sin(angle) * force;
                asteroid.vx -= Math.cos(angle) * force * 0.5;
                asteroid.vy -= Math.sin(angle) * force * 0.5;
                
                // Create impact effects
                const impactX = asteroid.x + dx * 0.5;
                const impactY = asteroid.y + dy * 0.5;
                
                // Main explosion (mark as ship-asteroid impact)
                this.eventBus.emit(GameEvents.EXPLOSION, {
                    x: impactX,
                    y: impactY,
                    size: damage < 20 ? 'small' : 'medium',
                    impactKind: 'ship-asteroid'
                });
                
                // Sparks
                for (let i = 0; i < Math.min(5, damage / 10); i++) {
                    const sparkAngle = angle + (Math.random() - 0.5) * Math.PI;
                    const sparkDist = 10 + Math.random() * 20;
                    this.eventBus.emit(GameEvents.EXPLOSION, {
                        x: impactX + Math.cos(sparkAngle) * sparkDist,
                        y: impactY + Math.sin(sparkAngle) * sparkDist,
                        size: 'small'
                    });
                }
                
                // Emit collision event
                this.eventBus.emit(GameEvents.PHYSICS_COLLISION, {
                    type: 'ship-asteroid',
                    entity1: ship,
                    entity2: asteroid,
                    damage: damage,
                    point: { x: impactX, y: impactY }
                });
                
                // Record collision
                state.physics.collisions.push({
                    type: 'ship-asteroid',
                    timestamp: Date.now(),
                    damage: damage
                });
            }
        }
        
        // Ship-pickup collisions
        for (let i = pickups.length - 1; i >= 0; i--) {
            const pickup = pickups[i];
            const dx = ship.x - pickup.x;
            const dy = ship.y - pickup.y;
            const r = (ship.size || 0) + 10; const r2 = r * r;
            if ((dx*dx + dy*dy) < r2) {
                // Emit pickup collected event
                this.eventBus.emit(GameEvents.PHYSICS_PICKUP_COLLECTED, {
                    ship,
                    pickup,
                    index: i
                });
                
                // Record collision
                state.physics.collisions.push({
                    type: 'ship-pickup',
                    timestamp: Date.now()
                });
            }
        }
        
        // Projectile collisions (simplified for now)
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            
            // Check collision with player (if not player's projectile)
            if (!proj.isPlayer) {
                if (this.checkPointCircleCollision(proj, ship)) {
                    // Emit projectile hit event
                    this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
                        projectile: proj,
                        target: ship,
                        isPlayer: true,
                        index: i
                    });
                    
                    // Record collision
                    state.physics.collisions.push({
                        type: 'projectile-ship',
                        timestamp: Date.now()
                    });
                }
            }
            
            // Check collision with NPCs
            for (let npc of npcShips) {
                if (proj.shooter === npc) continue;
                
                if (this.checkPointCircleCollision(proj, npc)) {
                    // Emit projectile hit event
                    this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
                        projectile: proj,
                        target: npc,
                        isPlayer: false,
                        index: i
                    });
                    
                    // Record collision
                    state.physics.collisions.push({
                        type: 'projectile-npc',
                        timestamp: Date.now()
                    });
                    break;
                }
            }
            
            // Check collision with asteroids
            for (let asteroid of asteroids) {
                if (this.checkPointCircleCollision(proj, asteroid)) {
                    // Emit projectile hit event
                    this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
                        projectile: proj,
                        target: asteroid,
                        isAsteroid: true,
                        index: i
                    });
                    
                    // Record collision
                    state.physics.collisions.push({
                        type: 'projectile-asteroid',
                        timestamp: Date.now()
                    });
                    break;
                }
            }
        }
    }
    
    /**
     * Check collision between two circles
     */
    checkCircleCollision(entity1, entity2) {
        const r1 = entity1.size || entity1.radius || 10;
        const r2 = entity2.size || entity2.radius || 10;
        const sum = r1 + r2; const sum2 = sum * sum;
        const d2 = MathUtils.distanceSquared(entity1.x, entity1.y, entity2.x, entity2.y);
        return d2 < sum2;
    }
    
    /**
     * Check collision between a point and a circle
     */
    checkPointCircleCollision(point, circle) {
        const r = circle.size || circle.radius || 10;
        const r2 = r * r;
        const d2 = MathUtils.distanceSquared(point.x, point.y, circle.x, circle.y);
        return d2 < r2;
    }
    
    /**
     * Apply impulse to an entity
     */
    applyImpulse(entity, forceX, forceY) {
        if (!entity) return;
        
        entity.vx = (entity.vx || 0) + forceX;
        entity.vy = (entity.vy || 0) + forceY;
        
        // Emit impulse event
        this.eventBus.emit(GameEvents.PHYSICS_IMPULSE_APPLIED, {
            entity,
            force: { x: forceX, y: forceY }
        });
    }
    
    /**
     * Calculate distance between two entities
     */
    getDistance(entity1, entity2) {
        return MathUtils.distance(entity1.x, entity1.y, entity2.x, entity2.y);
    }
    
    /**
     * Calculate angle from entity1 to entity2
     */
    getAngle(entity1, entity2) {
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        return Math.atan2(dy, dx);
    }
    
    /**
     * Predict future position of an entity
     */
    predictPosition(entity, time) {
        return {
            x: entity.x + (entity.vx || 0) * time,
            y: entity.y + (entity.vy || 0) * time
        };
    }
    
    /**
     * Sync physics state to StateManager
     */
    syncPhysicsState(state) {
        const ship = state.ship;
        if (!ship) return;
        
        // Update physics state
        state.physics.shipPosition = { x: ship.x, y: ship.y };
        state.physics.shipVelocity = { x: ship.vx, y: ship.vy };
        state.physics.shipAngle = ship.angle;
        state.physics.shipThrusting = this.thrustActive;
        state.physics.shipBraking = this.brakeActive;
        
        // Update entity counts
        state.physics.entityCounts = {
            npcs: (state.npcShips || []).length,
            projectiles: (state.projectiles || []).length,
            asteroids: (state.asteroids || []).length,
            pickups: (state.pickups || []).length
        };
    }
    
    /**
     * Clean up physics system
     */
    destroy() {
        // Unsubscribe from events
        this.eventBus.off(GameEvents.INPUT_THRUST, this.handleThrust);
        this.eventBus.off(GameEvents.INPUT_BRAKE, this.handleBrake);
        this.eventBus.off(GameEvents.INPUT_TURN, this.handleTurn);
        
        console.log('[PhysicsSystem] Destroyed');
    }
}

export default PhysicsSystem;
