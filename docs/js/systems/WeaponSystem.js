import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

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
        
        // Create projectile with proper velocity based on weapon type
        const projectile = {
            x: shooter.x + Math.cos(angle) * (shooter.size + 5),
            y: shooter.y + Math.sin(angle) * (shooter.size + 5),
            vx: Math.cos(angle) * weapon.speed + shooter.vx,
            vy: Math.sin(angle) * weapon.speed + shooter.vy,
            isPlayer: isPlayer,
            shooter: shooter,
            lifetime: 0,
            damage: weapon.damage,
            type: weapon.type
        };
        
        // Adjust velocity for specific weapon types
        if (weapon.type === "rapid") {
            projectile.vx = Math.cos(angle) * 3 + shooter.vx;
            projectile.vy = Math.sin(angle) * 3 + shooter.vy;
        } else if (weapon.type === "plasma") {
            projectile.vx = Math.cos(angle) * 1.5 + shooter.vx;
            projectile.vy = Math.sin(angle) * 1.5 + shooter.vy;
        } else if (weapon.type === "mining") {
            projectile.vx = Math.cos(angle) * 2 + shooter.vx;
            projectile.vy = Math.sin(angle) * 2 + shooter.vy;
        } else {
            // Default laser
            projectile.vx = Math.cos(angle) * 2 + shooter.vx;
            projectile.vy = Math.sin(angle) * 2 + shooter.vy;
        }
        
        // Add to projectiles array
        this.projectiles.push(projectile);
        
        // Sync to state
        this.syncState();
        
        console.log(`[WeaponSystem] Fired ${weapon.type} projectile`);
    }
    
    /**
     * Update projectiles
     */
    updateProjectiles(ship, npcShips, asteroids, explosions, audioSystem) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Update position
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.lifetime++;
            
            // Remove expired projectiles
            if (proj.lifetime > 60) {
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
        // Apply damage
        if (ship.shield > 0) {
            ship.shield = Math.max(0, ship.shield - projectile.damage);
            this.eventBus.emit(GameEvents.SHIELD_HIT, {
                ship: ship,
                damage: projectile.damage
            });
            
            // Create shield hit effect
            if (explosions && this.createExplosion) {
                explosions.push(this.createExplosion(projectile.x, projectile.y, true));
            }
            
            // Play shield hit sound
            if (audioSystem) {
                audioSystem.playShieldHit();
            }
        } else {
            ship.health = Math.max(0, ship.health - projectile.damage);
            this.eventBus.emit(GameEvents.SHIP_DAMAGE, {
                ship: ship,
                damage: projectile.damage
            });
            
            // Create hit effect
            if (explosions && this.createExplosion) {
                explosions.push(this.createExplosion(projectile.x, projectile.y, true));
            }
            
            // Play hit sound
            if (audioSystem) {
                audioSystem.playExplosion(true);
            }
        }
        
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
        // Apply damage
        npc.health -= projectile.damage;
        
        // Mark killer if NPC dies
        if (npc.health <= 0 && !npc.killedBy) {
            npc.killedBy = projectile.isPlayer ? 'player' : 'npc';
        }
        
        // Create hit effect
        if (explosions && this.createExplosion) {
            explosions.push(this.createExplosion(projectile.x, projectile.y, true));
        }
        
        // Emit events
        this.eventBus.emit(GameEvents.PHYSICS_PROJECTILE_HIT, {
            projectile: projectile,
            target: npc,
            isNPC: true
        });
        
        if (npc.health <= 0) {
            this.eventBus.emit(GameEvents.NPC_DEATH, {
                npc: npc,
                killedBy: npc.killedBy
            });
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
            
            // Set cooldown
            ship.weaponCooldown = weapon.cooldown;
            
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
        
        // Switch weapons
        if (hasKey('q') && !ship.weaponSwitchPressed && ship.weapons && ship.weapons.length > 1) {
            ship.currentWeapon = (ship.currentWeapon + 1) % ship.weapons.length;
            ship.weaponSwitchPressed = true;
            
            // Emit switch event
            this.eventBus.emit(GameEvents.INPUT_SWITCH_WEAPON, {
                ship: ship,
                newWeapon: ship.weapons[ship.currentWeapon]
            });
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
        const angle = Math.atan2(dy, dx);
        
        // Fire projectile
        this.fireProjectile(npc, angle, false, npc.weapon);
        
        // Set cooldown
        npc.weaponCooldown = npc.weapon.cooldown;
        
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
