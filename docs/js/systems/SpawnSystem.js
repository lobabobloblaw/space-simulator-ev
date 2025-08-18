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
        
        if (type === 'trader') {
            // Spawn near a random planet
            const planet = state.planets[Math.floor(Math.random() * state.planets.length)];
            const angle = Math.random() * Math.PI * 2;
            const distance = planet.radius + 100 + Math.random() * 100;
            spawnX = planet.x + Math.cos(angle) * distance;
            spawnY = planet.y + Math.sin(angle) * distance;
            initialVx = Math.cos(angle) * template.maxSpeed * 0.5;
            initialVy = Math.sin(angle) * template.maxSpeed * 0.5;
            spawnEffect = 'takeoff';
        } else if (type === 'pirate') {
            // Spawn at distance from player
            const angle = Math.random() * Math.PI * 2;
            const distance = 1200 + Math.random() * 300;
            spawnX = state.ship.x + Math.cos(angle) * distance;
            spawnY = state.ship.y + Math.sin(angle) * distance;
            initialVx = -Math.cos(angle) * template.maxSpeed * 0.3;
            initialVy = -Math.sin(angle) * template.maxSpeed * 0.3;
            spawnEffect = 'arrive';
        } else if (type === 'patrol') {
            // Spawn at medium distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 400 + Math.random() * 400;
            spawnX = state.ship.x + Math.cos(angle) * distance;
            spawnY = state.ship.y + Math.sin(angle) * distance;
            initialVx = -Math.cos(angle) * template.maxSpeed * 0.5;
            initialVy = -Math.sin(angle) * template.maxSpeed * 0.5;
            spawnEffect = 'arrive';
        } else {
            // Default spawn
            const angle = Math.random() * Math.PI * 2;
            const distance = 600 + Math.random() * 600;
            spawnX = state.ship.x + Math.cos(angle) * distance;
            spawnY = state.ship.y + Math.sin(angle) * distance;
            const velAngle = Math.random() * Math.PI * 2;
            initialVx = Math.cos(velAngle) * template.maxSpeed * 0.3;
            initialVy = Math.sin(velAngle) * template.maxSpeed * 0.3;
            spawnEffect = 'arrive';
        }
        
        // Create warp effect at spawn location
        if (state.warpEffects) {
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
        
        console.log('[SpawnSystem] Destroyed');
    }
}

export default SpawnSystem;
