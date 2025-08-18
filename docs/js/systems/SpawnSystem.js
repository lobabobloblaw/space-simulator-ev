/**
 * SpawnSystem - Handles NPC spawning, AI behavior, asteroids, and pickups
 * Uses EventBus for all entity spawning and behavior management
 */

import { EventBus } from '../core/EventBus.js';
import { StateManager } from '../core/StateManager.js';

export class SpawnSystem {
    constructor() {
        this.eventBus = EventBus.getInstance();
        this.stateManager = StateManager.getInstance();
        
        // NPC spawn state
        this.npcSpawnState = {
            nextShipSpawn: Date.now() + 3000
        };
        
        // NPC type definitions
        this.npcTypes = {
            trader: {
                size: 12,
                color: "#4287f5",
                health: 20,
                maxHealth: 20,
                credits: 100,
                cargoCapacity: 20,
                behavior: "passive",
                maxSpeed: 0.3,
                thrust: 0.005,
                turnSpeed: 0.08,
                weapon: { type: "laser", damage: 5, cooldown: 30 }
            },
            freighter: {
                size: 20,
                color: "#f5a442",
                health: 40,
                maxHealth: 40,
                credits: 200,
                cargoCapacity: 50,
                behavior: "passive",
                maxSpeed: 0.2,
                thrust: 0.003,
                turnSpeed: 0.04,
                weapon: null
            },
            pirate: {
                size: 10,
                color: "#f54242",
                health: 25,
                maxHealth: 25,
                credits: 50,
                cargoCapacity: 10,
                behavior: "aggressive",
                maxSpeed: 0.4,
                thrust: 0.008,
                turnSpeed: 0.10,
                weapon: { type: "rapid", damage: 5, cooldown: 10 }
            },
            patrol: {
                size: 14,
                color: "#42f554",
                health: 35,
                maxHealth: 35,
                credits: 0,
                cargoCapacity: 0,
                behavior: "lawful",
                maxSpeed: 0.35,
                thrust: 0.007,
                turnSpeed: 0.09,
                weapon: { type: "laser", damage: 8, cooldown: 20 }
            }
        };
        
        // Bind methods
        this.update = this.update.bind(this);
        this.handleEntityDestroyed = this.handleEntityDestroyed.bind(this);
        this.handleProjectileHit = this.handleProjectileHit.bind(this);
        this.handlePickupCollected = this.handlePickupCollected.bind(this);
    }
    
    init() {
        // Subscribe to events
        this.eventBus.on('ENTITY_DESTROYED', this.handleEntityDestroyed);
        this.eventBus.on('PHYSICS_PROJECTILE_HIT', this.handleProjectileHit);
        this.eventBus.on('PICKUP_COLLECTED', this.handlePickupCollected);
        
        // Initial asteroid field generation
        this.generateAsteroidField();
    }
    
    update(deltaTime) {
        const state = this.stateManager.getState();
        const ship = state.ship;
        const npcShips = state.npcShips || [];
        const asteroids = state.asteroids || [];
        const pickups = state.pickups || [];
        const planets = state.planets || [];
        
        // Update NPC spawning and behavior
        this.updateNPCs(npcShips, ship, planets, state.projectiles || []);
        
        // Update asteroids
        this.updateAsteroids(asteroids, ship, pickups);
        
        // Update pickups
        this.updatePickups(pickups, ship);
    }
    
    spawnNPC(npcShips, ship, planets) {
        const state = this.stateManager.getState();
        const warpEffects = state.warpEffects || [];
        
        // Determine spawn type with weighted probability
        const weights = { freighter: 0.25, trader: 0.3, patrol: 0.2, pirate: 0.25 };
        let random = Math.random();
        let type = 'trader';
        let cumulative = 0;
        
        for (let t in weights) {
            cumulative += weights[t];
            if (random < cumulative) {
                type = t;
                break;
            }
        }
        
        const template = this.npcTypes[type];
        
        // Spawn location based on type
        let spawnX, spawnY, initialVx, initialVy;
        let spawnEffect = 'arrive';
        
        if (type === 'trader') {
            // Spawn near planets
            const spawnPlanet = planets[Math.floor(Math.random() * planets.length)];
            const angle = Math.random() * Math.PI * 2;
            const distance = spawnPlanet.radius + 100 + Math.random() * 100;
            spawnX = spawnPlanet.x + Math.cos(angle) * distance;
            spawnY = spawnPlanet.y + Math.sin(angle) * distance;
            initialVx = Math.cos(angle) * template.maxSpeed * 0.5;
            initialVy = Math.sin(angle) * template.maxSpeed * 0.5;
            spawnEffect = 'takeoff';
        } else if (type === 'pirate') {
            // Spawn at distance from player
            const angle = Math.random() * Math.PI * 2;
            const distance = 1200 + Math.random() * 300;
            spawnX = ship.x + Math.cos(angle) * distance;
            spawnY = ship.y + Math.sin(angle) * distance;
            initialVx = -Math.cos(angle) * template.maxSpeed * 0.3;
            initialVy = -Math.sin(angle) * template.maxSpeed * 0.3;
            spawnEffect = 'arrive';
        } else if (type === 'patrol') {
            // Spawn in patrol area
            const angle = Math.random() * Math.PI * 2;
            const distance = 400 + Math.random() * 400;
            spawnX = ship.x + Math.cos(angle) * distance;
            spawnY = ship.y + Math.sin(angle) * distance;
            initialVx = -Math.cos(angle) * template.maxSpeed * 0.5;
            initialVy = -Math.sin(angle) * template.maxSpeed * 0.5;
            spawnEffect = 'arrive';
        } else {
            // Default spawn pattern
            const angle = Math.random() * Math.PI * 2;
            const distance = 600 + Math.random() * 600;
            spawnX = ship.x + Math.cos(angle) * distance;
            spawnY = ship.y + Math.sin(angle) * distance;
            const velAngle = Math.random() * Math.PI * 2;
            initialVx = Math.cos(velAngle) * template.maxSpeed * 0.3;
            initialVy = Math.sin(velAngle) * template.maxSpeed * 0.3;
            spawnEffect = 'arrive';
        }
        
        // Create warp effect at spawn location
        this.eventBus.emit('WARP_EFFECT_CREATE', {
            x: spawnX,
            y: spawnY,
            type: spawnEffect
        });
        
        // Create the NPC
        const npc = {
            x: spawnX,
            y: spawnY,
            vx: initialVx,
            vy: initialVy,
            angle: Math.atan2(initialVy, initialVx),
            type: type,
            ...template,
            targetPlanet: (type === 'trader' || type === 'freighter') ? 
                planets[Math.floor(Math.random() * planets.length)] : null,
            weaponCooldown: 0,
            lifetime: 0,
            thrusting: false
        };
        
        npcShips.push(npc);
        
        // Emit spawn event
        this.eventBus.emit('NPC_SPAWNED', { npc, type });
    }
    
    updateNPCs(npcShips, ship, planets, projectiles) {
        const state = this.stateManager.getState();
        const warpEffects = state.warpEffects || [];
        
        // Count nearby NPCs
        let nearbyCount = 0;
        for (let npc of npcShips) {
            const dist = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
            if (dist < 1000) nearbyCount++;
        }
        
        // Spawn new NPCs periodically
        const maxNearby = 5;
        if (Date.now() > this.npcSpawnState.nextShipSpawn && nearbyCount < maxNearby && npcShips.length < 12) {
            this.spawnNPC(npcShips, ship, planets);
            const spawnDelay = 3000 + (nearbyCount * 2000);
            this.npcSpawnState.nextShipSpawn = Date.now() + Math.random() * spawnDelay + spawnDelay/2;
        }
        
        // Check player hostility status
        let playerIsHostile = false;
        let playerRecentlyFired = false;
        const playerIsAlive = !ship.isDestroyed;
        
        if (playerIsAlive && projectiles.length > 0) {
            for (let proj of projectiles) {
                if (proj.isPlayer && proj.lifetime < 30) {
                    playerRecentlyFired = true;
                    const projAngle = Math.atan2(proj.vy, proj.vx);
                    
                    for (let npc of npcShips) {
                        if (npc.behavior === "lawful" || npc.behavior === "passive") {
                            const distToNPC = Math.sqrt((npc.x - proj.x) ** 2 + (npc.y - proj.y) ** 2);
                            if (distToNPC < 400) {
                                const angleToNPC = Math.atan2(npc.y - proj.y, npc.x - proj.x);
                                const angleDiff = Math.abs(angleToNPC - projAngle);
                                if (angleDiff < Math.PI / 6) {
                                    playerIsHostile = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (playerIsHostile) break;
                }
            }
        }
        
        // Career criminal check
        if (ship.kills > 5 && ship.pirateKills < ship.kills * 0.5) {
            playerIsHostile = true;
        }
        
        // Handle warning system
        if (playerIsHostile && !ship.patrolWarningShown && !ship.patrolWarningExpired) {
            let patrolNearby = false;
            for (let npc of npcShips) {
                if (npc.behavior === "lawful") {
                    const dist = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
                    if (dist < 1000) {
                        patrolNearby = true;
                        break;
                    }
                }
            }
            
            if (patrolNearby) {
                ship.patrolWarningShown = true;
                ship.patrolWarningTime = Date.now();
                
                this.eventBus.emit('UI_NOTIFICATION', {
                    type: 'error',
                    message: '⚠ PATROL WARNING: CEASE HOSTILE ACTIONS',
                    duration: 3000,
                    style: 'background: linear-gradient(90deg, #ff0044, #aa0033); border: 1px solid #ff0066; font-size: 16px; text-shadow: 0 0 10px #ff0066;'
                });
            }
        }
        
        // Check if warning has expired
        if (ship.patrolWarningShown && Date.now() - ship.patrolWarningTime > 2000) {
            ship.patrolWarningExpired = true;
        }
        
        // Clear hostility if player stops firing
        if (!playerRecentlyFired && ship.patrolWarningShown) {
            if (Date.now() - ship.patrolWarningTime > 5000) {
                if (ship.patrolWarningShown && !ship.patrolStandingDown) {
                    ship.patrolStandingDown = true;
                    ship.patrolWarningShown = false;
                    ship.patrolWarningExpired = false;
                    
                    this.eventBus.emit('UI_NOTIFICATION', {
                        type: 'success',
                        message: 'PATROL: STANDING DOWN',
                        duration: 2000
                    });
                    
                    setTimeout(() => {
                        ship.patrolStandingDown = false;
                    }, 2000);
                }
            }
        }
        
        // Update each NPC
        for (let i = npcShips.length - 1; i >= 0; i--) {
            const npc = npcShips[i];
            npc.lifetime++;
            
            // Remove NPCs that have docked at planets
            if (npc.readyToDock) {
                npcShips.splice(i, 1);
                continue;
            }
            
            // Remove dead NPCs
            if (npc.health <= 0) {
                this.handleNPCDeath(npc, ship, npcShips, i);
                continue;
            }
            
            // Remove NPCs that are too far away
            const distFromPlayer = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
            if (distFromPlayer > 3000) {
                let nearPlanet = false;
                for (let planet of planets) {
                    const distToPlanet = Math.sqrt((npc.x - planet.x) ** 2 + (npc.y - planet.y) ** 2);
                    if (distToPlanet < planet.radius + 100) {
                        nearPlanet = true;
                        break;
                    }
                }
                
                this.eventBus.emit('WARP_EFFECT_CREATE', {
                    x: npc.x,
                    y: npc.y,
                    type: nearPlanet ? 'land' : 'depart'
                });
                
                npcShips.splice(i, 1);
                continue;
            }
            
            // Update NPC behavior
            this.updateNPCBehavior(npc, ship, npcShips, planets, projectiles, playerIsHostile);
            
            // Update NPC physics
            this.updateNPCPhysics(npc);
        }
    }
    
    updateNPCBehavior(npc, ship, npcShips, planets, projectiles, playerIsHostile) {
        npc.thrusting = false;
        
        const dx = ship.x - npc.x;
        const dy = ship.y - npc.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        let desiredAngle = npc.angle;
        let shouldThrust = false;
        let shouldBrake = false;
        
        if (npc.behavior === "aggressive") {
            this.updateAggressiveBehavior(npc, ship, npcShips, distToPlayer, desiredAngle, shouldThrust, shouldBrake, projectiles);
        } else if (npc.behavior === "lawful") {
            this.updateLawfulBehavior(npc, ship, npcShips, distToPlayer, desiredAngle, shouldThrust, playerIsHostile, projectiles);
        } else if (npc.behavior === "passive") {
            this.updatePassiveBehavior(npc, ship, npcShips, planets, distToPlayer, desiredAngle, shouldThrust, shouldBrake, projectiles);
        }
    }
    
    updateAggressiveBehavior(npc, ship, npcShips, distToPlayer, desiredAngle, shouldThrust, shouldBrake, projectiles) {
        const playerIsAlive = !ship.isDestroyed;
        
        // Check for nearby patrol threats
        let nearbyPatrol = null;
        let patrolDist = 600;
        for (let other of npcShips) {
            if (other.behavior === "lawful") {
                const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                if (dist < patrolDist) {
                    nearbyPatrol = other;
                    patrolDist = dist;
                    break;
                }
            }
        }
        
        // EVADE PATROL if one is nearby and pursuing
        if (nearbyPatrol && nearbyPatrol.pursuing) {
            const evadeX = npc.x - nearbyPatrol.x;
            const evadeY = npc.y - nearbyPatrol.y;
            npc.desiredAngle = Math.atan2(evadeY, evadeX);
            npc.isFleeing = true;
            
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI / 6) {
                npc.shouldThrust = true;
            } else if (Math.abs(angleDiff) < Math.PI / 3) {
                npc.shouldThrust = true;
                npc.thrustPower = 0.5;
            } else {
                npc.shouldThrust = false;
            }
        } else {
            // Normal pirate behavior - hunt targets
            let bestTarget = null;
            let bestTargetDist = 800;
            let targetIsPlayer = false;
            
            if (playerIsAlive && distToPlayer < bestTargetDist) {
                bestTarget = ship;
                bestTargetDist = distToPlayer;
                targetIsPlayer = true;
            }
            
            for (let other of npcShips) {
                if (other.behavior === "passive") {
                    const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                    if (dist < bestTargetDist) {
                        bestTarget = other;
                        bestTargetDist = dist;
                        targetIsPlayer = false;
                    }
                }
            }
            
            if (bestTarget && bestTargetDist < 800) {
                const interceptTime = bestTargetDist / (npc.maxSpeed * 50);
                const targetX = bestTarget.x + bestTarget.vx * interceptTime;
                const targetY = bestTarget.y + bestTarget.vy * interceptTime;
                npc.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
                
                let angleDiff = npc.desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI / 4) {
                    if (bestTargetDist > 150) {
                        npc.shouldThrust = true;
                    } else if (bestTargetDist < 80) {
                        npc.shouldBrake = true;
                    }
                }
                
                // Fire at target
                if (bestTargetDist < 250 && Math.abs(angleDiff) < Math.PI / 6 && npc.weaponCooldown <= 0 && npc.weapon) {
                    this.eventBus.emit('WEAPON_FIRE', {
                        shooter: npc,
                        angle: npc.angle,
                        isPlayer: false,
                        weapon: npc.weapon
                    });
                    npc.weaponCooldown = npc.weapon.cooldown;
                }
            } else {
                // Wander when no targets
                if (!npc.wanderAngle || Math.random() < 0.01) {
                    npc.wanderAngle = Math.random() * Math.PI * 2;
                }
                npc.desiredAngle = npc.wanderAngle;
                
                let angleDiff = npc.desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI / 4) {
                    npc.shouldThrust = true;
                }
            }
        }
    }
    
    updateLawfulBehavior(npc, ship, npcShips, distToPlayer, desiredAngle, shouldThrust, playerIsHostile, projectiles) {
        const playerIsFriendly = ship.pirateKills >= 3 && (!ship.kills || ship.pirateKills >= ship.kills * 0.8);
        
        // Find pirates
        let targetPirate = null;
        let closestPirateDist = 1200;
        let pirateIsAttacking = false;
        
        const detectionRange = playerIsFriendly ? 1500 : 1200;
        
        for (let other of npcShips) {
            if (other.behavior === "aggressive") {
                const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                
                const pirateShootingNow = other.weaponCooldown > 0;
                
                let nearMerchant = false;
                for (let victim of npcShips) {
                    if (victim.behavior === "passive") {
                        const distToVictim = Math.sqrt((other.x - victim.x) ** 2 + (other.y - victim.y) ** 2);
                        if (distToVictim < 400) {
                            nearMerchant = true;
                            break;
                        }
                    }
                }
                
                const nearPlayer = Math.sqrt((other.x - ship.x) ** 2 + (other.y - ship.y) ** 2) < 500;
                const helpingPlayer = playerIsFriendly && nearPlayer;
                
                if (pirateShootingNow || nearMerchant || helpingPlayer) {
                    targetPirate = other;
                    closestPirateDist = dist;
                    pirateIsAttacking = true;
                    
                    if (helpingPlayer && !npc.shownHelpMessage) {
                        npc.shownHelpMessage = true;
                        this.eventBus.emit('UI_NOTIFICATION', {
                            type: 'success',
                            message: '✅ PATROL: ENGAGING HOSTILE - ASSISTANCE PROVIDED',
                            duration: 2000
                        });
                    }
                    break;
                } else if (dist < detectionRange) {
                    targetPirate = other;
                    closestPirateDist = dist;
                    pirateIsAttacking = false;
                }
            }
        }
        
        if (targetPirate) {
            npc.pursuing = true;
            if (!npc.pursuitTimer) npc.pursuitTimer = 0;
        } else {
            npc.pursuing = false;
            npc.pursuitTimer = 0;
        }
        
        // Handle hostile player
        if (!targetPirate && playerIsHostile && ship.patrolWarningExpired && distToPlayer < 1000) {
            const interceptTime = distToPlayer / (npc.maxSpeed * 100);
            const targetX = ship.x + ship.vx * interceptTime * 2;
            const targetY = ship.y + ship.vy * interceptTime * 2;
            npc.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
            
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI * 1.5) {
                npc.shouldThrust = true;
            }
            
            if (distToPlayer < 450 && Math.abs(angleDiff) < Math.PI / 3 && npc.weaponCooldown <= 0 && npc.weapon) {
                this.eventBus.emit('WEAPON_FIRE', {
                    shooter: npc,
                    angle: npc.angle,
                    isPlayer: false,
                    weapon: npc.weapon
                });
                npc.weaponCooldown = npc.weapon.cooldown;
            }
        } else if (targetPirate) {
            // Pursue pirate
            const interceptTime = closestPirateDist / (npc.maxSpeed * 100);
            const targetX = targetPirate.x + targetPirate.vx * interceptTime * 2;
            const targetY = targetPirate.y + targetPirate.vy * interceptTime * 2;
            npc.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
            
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI * 0.9) {
                npc.shouldThrust = true;
            }
            
            if (closestPirateDist < 600 && Math.abs(angleDiff) < Math.PI / 2 && npc.weaponCooldown <= 0 && npc.weapon) {
                const accuracy = closestPirateDist < 150 ? 0.8 :
                               closestPirateDist < 300 ? 0.5 :
                               closestPirateDist < 450 ? 0.3 : 0.2;
                
                const targetSpeed = Math.sqrt(targetPirate.vx * targetPirate.vx + targetPirate.vy * targetPirate.vy);
                const movementPenalty = Math.max(0.5, 1 - targetSpeed * 0.5);
                
                if (Math.random() < accuracy * movementPenalty) {
                    this.eventBus.emit('WEAPON_FIRE', {
                        shooter: npc,
                        angle: npc.angle,
                        isPlayer: false,
                        weapon: npc.weapon
                    });
                    npc.weaponCooldown = npc.weapon.cooldown;
                } else {
                    npc.weaponCooldown = npc.weapon.cooldown * 0.5;
                }
            }
            
            if (closestPirateDist > 800 && Math.random() < 0.05) {
                targetPirate = null;
                npc.pursuing = false;
            }
            
            npc.pursuitTimer++;
            if (npc.pursuitTimer > 300 && Math.random() < 0.1) {
                targetPirate = null;
                npc.pursuing = false;
                npc.pursuitTimer = 0;
            }
        } else {
            // Regular patrol
            npc.pursuing = false;
            
            if (!npc.patrolAngle) {
                npc.patrolAngle = Math.random() * Math.PI * 2;
                npc.patrolSpeed = 0.008 + Math.random() * 0.008;
                npc.patrolDirection = Math.random() < 0.5 ? 1 : -1;
            }
            
            if (Math.random() < 0.02) {
                npc.patrolDirection *= -1;
                npc.patrolSpeed = 0.008 + Math.random() * 0.008;
            }
            
            npc.patrolAngle += npc.patrolSpeed * npc.patrolDirection;
            npc.desiredAngle = npc.patrolAngle;
            
            if (Math.random() < 0.3) {
                npc.desiredAngle += (Math.random() - 0.5) * 0.5;
            }
            
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI / 3) {
                npc.shouldThrust = true;
            }
        }
    }
    
    updatePassiveBehavior(npc, ship, npcShips, planets, distToPlayer, desiredAngle, shouldThrust, shouldBrake, projectiles) {
        let fleeing = false;
        const playerIsAlive = !ship.isDestroyed;
        
        // Check for threats
        if (playerIsAlive && distToPlayer < 300 && (ship.weaponCooldown > 0 || projectiles.some(p => p.isPlayer))) {
            npc.desiredAngle = Math.atan2(-ship.y + npc.y, -ship.x + npc.x);
            fleeing = true;
            npc.isFleeing = true;
            
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI / 6) {
                npc.shouldThrust = true;
            } else {
                npc.shouldThrust = false;
            }
        }
        
        // Check for hostile NPCs
        for (let other of npcShips) {
            if (other.behavior === "aggressive") {
                const odx = other.x - npc.x;
                const ody = other.y - npc.y;
                const distToHostile = Math.sqrt(odx * odx + ody * ody);
                if (distToHostile < 200) {
                    npc.desiredAngle = Math.atan2(-ody, -odx);
                    fleeing = true;
                    npc.isFleeing = true;
                    
                    let angleDiff = npc.desiredAngle - npc.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    if (Math.abs(angleDiff) < Math.PI / 6) {
                        npc.shouldThrust = true;
                    } else {
                        npc.shouldThrust = false;
                    }
                    break;
                }
            }
        }
        
        if (!fleeing) {
            npc.isFleeing = false;
        }
        
        if (!fleeing && npc.targetPlanet) {
            const pdx = npc.targetPlanet.x - npc.x;
            const pdy = npc.targetPlanet.y - npc.y;
            const distToPlanet = Math.sqrt(pdx * pdx + pdy * pdy);
            
            if (distToPlanet > npc.targetPlanet.radius + 50) {
                npc.desiredAngle = Math.atan2(pdy, pdx);
                
                let angleDiff = npc.desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI / 3) {
                    const speed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
                    const approachSpeed = (npc.vx * pdx + npc.vy * pdy) / distToPlanet;
                    
                    if (distToPlanet < 200 && approachSpeed > npc.maxSpeed * 0.3) {
                        npc.shouldBrake = true;
                    } else {
                        npc.shouldThrust = true;
                    }
                }
            } else {
                npc.readyToDock = true;
                
                this.eventBus.emit('WARP_EFFECT_CREATE', {
                    x: npc.x,
                    y: npc.y,
                    type: 'land'
                });
            }
        }
    }
    
    updateNPCPhysics(npc) {
        // Apply rotation
        if (npc.desiredAngle !== undefined) {
            let angleDiff = npc.desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) > 0.01) {
                const turnSpeed = npc.isFleeing ? npc.turnSpeed * 2.5 : npc.turnSpeed;
                const turnAmount = Math.min(Math.abs(angleDiff), turnSpeed) * Math.sign(angleDiff);
                npc.angle += turnAmount;
            }
        }
        
        // Apply thrust/brake
        if (npc.shouldThrust) {
            const thrustPower = npc.thrustPower || 1.0;
            const thrustX = Math.cos(npc.angle) * npc.thrust * thrustPower;
            const thrustY = Math.sin(npc.angle) * npc.thrust * thrustPower;
            npc.vx += thrustX;
            npc.vy += thrustY;
            npc.thrusting = true;
            npc.thrustPower = 1.0;
        } else if (npc.shouldBrake) {
            npc.vx *= 0.95;
            npc.vy *= 0.95;
        } else {
            npc.thrusting = false;
        }
        
        // Update weapon cooldown
        if (npc.weaponCooldown > 0) {
            npc.weaponCooldown--;
        }
        
        // Apply space friction
        npc.vx *= 0.999;
        npc.vy *= 0.999;
        
        // Apply velocity limits
        const speed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
        if (speed > npc.maxSpeed) {
            npc.vx = (npc.vx / speed) * npc.maxSpeed;
            npc.vy = (npc.vy / speed) * npc.maxSpeed;
        }
        
        // Update position
        npc.x += npc.vx;
        npc.y += npc.vy;
    }
    
    handleNPCDeath(npc, ship, npcShips, index) {
        if (npc.killedBy === 'player') {
            const bounty = npc.behavior === 'aggressive' ? npc.credits : Math.floor(npc.credits * 0.5);
            const killBonus = 25;
            ship.credits += bounty + killBonus;
            ship.kills++;
            
            if (npc.behavior === 'aggressive') {
                if (!ship.pirateKills) ship.pirateKills = 0;
                ship.pirateKills++;
            }
            
            if (ship.tutorialStage === 'combat' && ship.kills >= 1) {
                ship.tutorialStage = 'complete';
            }
        }
        
        // Create explosion effects
        this.eventBus.emit('EXPLOSION_CREATE', {
            x: npc.x,
            y: npc.y,
            small: false
        });
        
        for (let j = 0; j < 4; j++) {
            const angle = (Math.PI * 2 / 4) * j;
            const dist = npc.size * 0.8;
            this.eventBus.emit('EXPLOSION_CREATE', {
                x: npc.x + Math.cos(angle) * dist,
                y: npc.y + Math.sin(angle) * dist,
                small: true
            });
        }
        
        // Pirates drop loot
        if (npc.type === 'pirate' && Math.random() < 0.6) {
            this.spawnPickups(npc.x, npc.y, 'pirate');
        }
        
        this.eventBus.emit('SOUND_PLAY', { type: 'explosion' });
        npcShips.splice(index, 1);
    }
    
    generateAsteroidField() {
        const state = this.stateManager.getState();
        const asteroids = state.asteroids || [];
        
        // Generate initial asteroid field
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 1500;
            
            // Generate unique shape for each asteroid
            const shapePoints = [];
            for (let k = 0; k < 8; k++) {
                shapePoints.push(0.7 + Math.random() * 0.6);
            }
            
            asteroids.push({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.2,
                vy: (Math.random() - 0.5) * 0.2,
                radius: 10 + Math.random() * 15,
                color: "#666",
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                rotation: Math.random() * Math.PI * 2,
                health: 20,
                maxHealth: 20,
                oreContent: 2 + Math.floor(Math.random() * 3),
                shapePoints: shapePoints
            });
        }
        
        this.stateManager.updateState({ asteroids });
    }
    
    updateAsteroids(asteroids, ship, pickups) {
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            
            // Remove destroyed asteroids
            if (asteroid.health <= 0) {
                // Drop ore
                const oreDrops = asteroid.oreContent;
                for (let j = 0; j < oreDrops; j++) {
                    const angle = (Math.PI * 2 / oreDrops) * j;
                    pickups.push({
                        x: asteroid.x + Math.cos(angle) * 10,
                        y: asteroid.y + Math.sin(angle) * 10,
                        vx: Math.cos(angle) * 0.5 + asteroid.vx * 0.5,
                        vy: Math.sin(angle) * 0.5 + asteroid.vy * 0.5,
                        type: 'ore',
                        value: 1,
                        lifetime: 0,
                        maxLifetime: 600
                    });
                }
                
                // Create explosion
                this.eventBus.emit('EXPLOSION_CREATE', {
                    x: asteroid.x,
                    y: asteroid.y,
                    small: asteroid.radius < 5
                });
                
                // Add debris particles
                for (let j = 0; j < 3; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = asteroid.radius * 0.5;
                    this.eventBus.emit('EXPLOSION_CREATE', {
                        x: asteroid.x + Math.cos(angle) * dist,
                        y: asteroid.y + Math.sin(angle) * dist,
                        small: true
                    });
                }
                
                // Replace with smaller asteroids if big enough
                if (asteroid.radius > 5) {
                    for (let j = 0; j < 2; j++) {
                        const angle = Math.random() * Math.PI * 2;
                        
                        const shapePoints = [];
                        for (let k = 0; k < 8; k++) {
                            shapePoints.push(0.7 + Math.random() * 0.6);
                        }
                        
                        asteroids.push({
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
                        });
                    }
                }
                
                asteroids.splice(i, 1);
                continue;
            }
            
            // Update position
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            
            // Check collision with player ship
            const dx = ship.x - asteroid.x;
            const dy = ship.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ship.size + asteroid.radius) {
                const relVx = ship.vx - asteroid.vx;
                const relVy = ship.vy - asteroid.vy;
                const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
                
                const damage = Math.floor(relSpeed * asteroid.radius * 2);
                
                this.eventBus.emit('SHIP_DAMAGE', {
                    target: ship,
                    damage: damage,
                    source: 'asteroid'
                });
                
                // Bounce both objects
                const angle = Math.atan2(dy, dx);
                const force = 0.5;
                ship.vx += Math.cos(angle) * force;
                ship.vy += Math.sin(angle) * force;
                asteroid.vx -= Math.cos(angle) * force * 0.5;
                asteroid.vy -= Math.sin(angle) * force * 0.5;
                
                this.eventBus.emit('EXPLOSION_CREATE', {
                    x: asteroid.x + dx * 0.5,
                    y: asteroid.y + dy * 0.5,
                    small: true
                });
            }
            
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
    }
    
    updatePickups(pickups, ship) {
        for (let i = pickups.length - 1; i >= 0; i--) {
            const pickup = pickups[i];
            
            // Update position
            pickup.x += pickup.vx;
            pickup.y += pickup.vy;
            
            // Slow down over time
            pickup.vx *= 0.99;
            pickup.vy *= 0.99;
            
            // Update lifetime
            pickup.lifetime++;
            
            // Remove old pickups
            if (pickup.lifetime >= pickup.maxLifetime) {
                pickups.splice(i, 1);
                continue;
            }
            
            // Check collection by player
            const dx = ship.x - pickup.x;
            const dy = ship.y - pickup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < ship.size + 10) {
                if (pickup.type === 'ore') {
                    const cargoUsed = ship.cargo.reduce((sum, item) => sum + item.quantity, 0);
                    if (cargoUsed < ship.cargoCapacity) {
                        const existing = ship.cargo.find(c => c.type === 'ore');
                        if (existing) {
                            existing.quantity += pickup.value;
                        } else {
                            ship.cargo.push({ type: 'ore', quantity: pickup.value });
                        }
                        
                        this.eventBus.emit('EXPLOSION_CREATE', {
                            x: pickup.x,
                            y: pickup.y,
                            small: true
                        });
                        this.eventBus.emit('SOUND_PLAY', { type: 'pickup' });
                        pickups.splice(i, 1);
                    }
                } else if (pickup.type === 'credits') {
                    ship.credits += pickup.value;
                    this.eventBus.emit('EXPLOSION_CREATE', {
                        x: pickup.x,
                        y: pickup.y,
                        small: true
                    });
                    this.eventBus.emit('SOUND_PLAY', { type: 'pickup' });
                    pickups.splice(i, 1);
                }
            }
        }
    }
    
    spawnPickups(x, y, source) {
        const state = this.stateManager.getState();
        const pickups = state.pickups || [];
        
        let numPickups = 2 + Math.floor(Math.random() * 3);
        if (source === 'pirate') {
            for (let j = 0; j < numPickups; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                pickups.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    type: Math.random() < 0.5 ? 'credits' : 'ore',
                    value: Math.random() < 0.5 ? 10 : 25,
                    lifetime: 0,
                    maxLifetime: 600
                });
            }
        }
        
        this.stateManager.updateState({ pickups });
    }
    
    handleEntityDestroyed(data) {
        // Handle entity destruction events if needed
    }
    
    handleProjectileHit(data) {
        // Handle projectile hits on NPCs/asteroids
    }
    
    handlePickupCollected(data) {
        // Handle pickup collection events
    }
    
    destroy() {
        // Unsubscribe from events
        this.eventBus.off('ENTITY_DESTROYED', this.handleEntityDestroyed);
        this.eventBus.off('PHYSICS_PROJECTILE_HIT', this.handleProjectileHit);
        this.eventBus.off('PICKUP_COLLECTED', this.handlePickupCollected);
    }
}
