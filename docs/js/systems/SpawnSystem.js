import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * SpawnSystem - Handles spawning of NPCs, asteroids, and pickups
 */
export class SpawnSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Spawn configuration
        this.maxNearbyNPCs = 5;
        this.maxTotalNPCs = 12;
        this.spawnRadius = 1200;
        this.despawnRadius = 3000;
        
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
        this.handleExplosion = this.handleExplosion.bind(this);
        
        console.log('[SpawnSystem] Created');
    }
    
    /**
     * Initialize the spawn system
     */
    init() {
        // Subscribe to events
        this.subscribeToEvents();
        
        console.log('[SpawnSystem] Initialized');
    }
    
    /**
     * Subscribe to game events
     */
    subscribeToEvents() {
        this.eventBus.on(GameEvents.NPC_DEATH, this.handleNPCDeath);
        this.eventBus.on('asteroid.destroyed', this.handleAsteroidDestroyed);
        this.eventBus.on('pickup.expired', this.handlePickupExpired);
        this.eventBus.on(GameEvents.EXPLOSION, this.handleExplosion);
    }
    
    /**
     * Handle NPC death - drop loot
     */
    handleNPCDeath(data) {
        if (!data || !data.npc) return;
        
        const npc = data.npc;
        const state = this.stateManager.state;
        
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
        
        // Drop ore at asteroid location
        const oreDrops = asteroid.oreContent || 1;
        for (let j = 0; j < oreDrops; j++) {
            const angle = (Math.PI * 2 / oreDrops) * j;
            
            const pickup = {
                x: asteroid.x + Math.cos(angle) * 10,
                y: asteroid.y + Math.sin(angle) * 10,
                vx: Math.cos(angle) * 0.5 + asteroid.vx * 0.5,
                vy: Math.sin(angle) * 0.5 + asteroid.vy * 0.5,
                type: 'ore',
                value: 1,
                lifetime: 0,
                maxLifetime: 600
            };
            
            state.pickups.push(pickup);
        }
        
        // Replace with smaller asteroids if big enough
        if (asteroid.radius > 5) {
            for (let j = 0; j < 2; j++) {
                const angle = Math.random() * Math.PI * 2;
                
                // Generate unique shape for fragment
                const shapePoints = [];
                for (let k = 0; k < 8; k++) {
                    shapePoints.push(0.7 + Math.random() * 0.6);
                }
                
                const fragment = {
                    x: asteroid.x + Math.cos(angle) * asteroid.radius,
                    y: asteroid.y + Math.sin(angle) * asteroid.radius,
                    vx: Math.cos(angle) * 0.5 + asteroid.vx,
                    vy: Math.sin(angle) * 0.5 + asteroid.vy,
                    radius: asteroid.radius * 0.6,
                    color: "#666",
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    rotation: Math.random() * Math.PI * 2,
                    health: 10,
                    maxHealth: 10,
                    oreContent: 1,
                    shapePoints: shapePoints
                };
                
                state.asteroids.push(fragment);
            }
        }
    }
    
    /**
     * Handle pickup expired
     */
    handlePickupExpired(data) {
        // Could add visual effect when pickup expires
    }
    
    /**
     * Handle explosion creation
     */
    handleExplosion(data) {
        if (!data) return;
        
        const state = this.stateManager.state;
        if (!state.explosions) state.explosions = [];
        
        // Determine explosion size parameters
        let radius, maxRadius, maxLifetime;
        
        if (data.size === 'small') {
            radius = 5;
            maxRadius = 15;
            maxLifetime = 20;
        } else if (data.size === 'large') {
            radius = 15;
            maxRadius = 40;
            maxLifetime = 20;
        } else {
            // Default medium
            radius = 10;
            maxRadius = 25;
            maxLifetime = 20;
        }
        
        // Create explosion object
        const explosion = {
            x: data.x,
            y: data.y,
            radius: radius,
            maxRadius: maxRadius,
            lifetime: 0,
            maxLifetime: maxLifetime
        };
        
        state.explosions.push(explosion);
    }
    
    /**
     * Spawn an NPC
     */
    spawnNPC() {
        const state = this.stateManager.state;
        
        // Select NPC type based on weights
        let random = Math.random();
        let type = 'trader';
        let cumulative = 0;
        
        for (let t in this.spawnWeights) {
            cumulative += this.spawnWeights[t];
            if (random < cumulative) {
                type = t;
                break;
            }
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
                    spawnEffect = null; // No effect for already-present ships
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
                spawnEffect = null; // Already in system
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
            spawnEffect = Math.random() < 0.3 ? 'arrive' : null; // Only some show warp effect
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
                spawnEffect = null; // Already patrolling
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
                spawnEffect = null;
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
            spawnEffect = Math.random() < 0.2 ? 'arrive' : null;
        }
        
        // Create warp effect at spawn location if appropriate
        if (state.warpEffects && spawnEffect) {
            state.warpEffects.push({
                x: spawnX,
                y: spawnY,
                type: spawnEffect,
                lifetime: 0,
                maxLifetime: spawnEffect === 'arrive' || spawnEffect === 'depart' ? 30 : 20
            });
        }
        
        // Create NPC
        const npc = {
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
        
        console.log(`[SpawnSystem] Spawned ${type} NPC`);
    }
    
    /**
     * Update spawn system
     */
    update(state, deltaTime) {
        if (!state) return;
        
        // Count nearby NPCs
        let nearbyCount = 0;
        for (let npc of state.npcShips) {
            const dist = Math.sqrt((npc.x - state.ship.x) ** 2 + (npc.y - state.ship.y) ** 2);
            if (dist < 1000) nearbyCount++;
        }
        
        // Check if we should spawn new NPCs
        if (!state.npcSpawnState) {
            state.npcSpawnState = {
                nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
            };
        }
        
        if (Date.now() > state.npcSpawnState.nextShipSpawn && 
            nearbyCount < this.maxNearbyNPCs && 
            state.npcShips.length < this.maxTotalNPCs) {
            
            this.spawnNPC();
            
            const spawnDelay = 3000 + (nearbyCount * 2000);
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
                        if (distToPlanet < planet.radius + 100) {
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
                console.log(`[SpawnSystem] Despawned distant NPC`);
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
            if (asteroid.x > 2000) asteroid.x = -2000;
            if (asteroid.x < -2000) asteroid.x = 2000;
            if (asteroid.y > 2000) asteroid.y = -2000;
            if (asteroid.y < -2000) asteroid.y = 2000;
            
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
            for (let i = state.warpEffects.length - 1; i >= 0; i--) {
                const effect = state.warpEffects[i];
                effect.lifetime++;
                
                if (effect.lifetime >= effect.maxLifetime) {
                    state.warpEffects.splice(i, 1);
                }
            }
        }
        
        // Update explosions
        if (state.explosions) {
            for (let i = state.explosions.length - 1; i >= 0; i--) {
                const exp = state.explosions[i];
                exp.lifetime++;
                
                if (exp.lifetime >= exp.maxLifetime) {
                    state.explosions.splice(i, 1);
                }
            }
        }
    }
    
    /**
     * Clean up spawn system
     */
    destroy() {
        // Unsubscribe from events
        this.eventBus.off(GameEvents.NPC_DEATH, this.handleNPCDeath);
        this.eventBus.off('asteroid.destroyed', this.handleAsteroidDestroyed);
        this.eventBus.off('pickup.expired', this.handlePickupExpired);
        this.eventBus.off(GameEvents.EXPLOSION, this.handleExplosion);
        
        console.log('[SpawnSystem] Destroyed');
    }
}

export default SpawnSystem;
