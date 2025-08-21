/**
 * NPCSystem - Handles sophisticated NPC AI and behavior
 * Ported from allSystems.js with full personality and interactions
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

export default class NPCSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        console.log('[NPCSystem] Created with full AI personalities');
    }
    
    async init() {
        // Listen for relevant events
        this.eventBus.on(GameEvents.PROJECTILE_FIRED, (data) => {
            // Track player hostility for patrol AI
            if (data.isPlayer) {
                const state = this.stateManager.getState();
                if (!state.playerLastFireTime) {
                    this.stateManager.updateState({ playerLastFireTime: Date.now() });
                }
            }
        });
        
        console.log('[NPCSystem] Initialized with sophisticated AI');
    }
    
    /**
     * Main update loop for all NPCs
     */
    update(state, deltaTime) {
        if (!state || !state.npcShips) return;
        
        const ship = state.ship;
        if (!ship) return;
        
        // Check player hostility status ONCE for all patrols
        const playerHostility = this.checkPlayerHostility(state);
        
        // Handle warning system if player is hostile
        if (playerHostility.isHostile) {
            this.handlePatrolWarning(ship, state.npcShips, playerHostility);
        }
        
        // Clear hostility if player has been peaceful
        if (!playerHostility.recentlyFired && ship.patrolWarningShown) {
            this.checkHostilityClearance(ship);
        }
        
        // Update each NPC
        for (let i = state.npcShips.length - 1; i >= 0; i--) {
            const npc = state.npcShips[i];
            npc.lifetime++;
            
            // Handle NPC removal conditions
            if (this.shouldRemoveNPC(npc, ship, state)) {
                this.removeNPC(i, npc, state);
                continue;
            }
            
            // Clear movement flags
            npc.thrusting = false;
            
            // AI decision making based on behavior type
            const aiDecision = this.makeAIDecision(npc, state, playerHostility);
            
            // Apply AI decisions
            this.applyAIDecision(npc, aiDecision, state);
            
            // Update physics
            this.updateNPCPhysics(npc);
            
            // Update weapon cooldown
            if (npc.weaponCooldown > 0) {
                npc.weaponCooldown--;
            }
        }
    }
    
    /**
     * Check if player is hostile (for patrol AI)
     */
    checkPlayerHostility(state) {
        const ship = state.ship;
        const projectiles = state.projectiles || [];
        
        let isHostile = false;
        let recentlyFired = false;
        const playerIsAlive = !ship.isDestroyed;
        
        if (playerIsAlive && projectiles.length > 0) {
            // Check recent player projectiles
            for (let proj of projectiles) {
                if (proj.isPlayer && proj.lifetime < 30) {
                    recentlyFired = true;
                    const projAngle = Math.atan2(proj.vy, proj.vx);
                    
                    // Check if shooting at patrol or innocent
                    for (let npc of state.npcShips) {
                        if (npc.behavior === "lawful" || npc.behavior === "passive") {
                            const distToNPC = Math.sqrt((npc.x - proj.x) ** 2 + (npc.y - proj.y) ** 2);
                            if (distToNPC < 400) {
                                const angleToNPC = Math.atan2(npc.y - proj.y, npc.x - proj.x);
                                const angleDiff = Math.abs(angleToNPC - projAngle);
                                if (angleDiff < Math.PI / 6) {
                                    isHostile = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (isHostile) break;
                }
            }
        }
        
        // Career criminal check
        if (ship.kills > 5 && ship.pirateKills < ship.kills * 0.5) {
            isHostile = true;
        }
        
        return { isHostile, recentlyFired };
    }
    
    /**
     * Handle patrol warning system
     */
    handlePatrolWarning(ship, npcShips, playerHostility) {
        if (!ship.patrolWarningShown && !ship.patrolWarningExpired) {
            // Check if any patrol is close enough to warn
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
                
                // Emit warning event for UI to handle
                this.eventBus.emit(GameEvents.PATROL_WARNING, {
                    message: 'PATROL WARNING: CEASE HOSTILE ACTIONS'
                });
            }
        }
        
        // Check if warning has expired
        if (ship.patrolWarningShown && Date.now() - ship.patrolWarningTime > 2000) {
            ship.patrolWarningExpired = true;
        }
    }
    
    /**
     * Check if player's hostility should be cleared
     */
    checkHostilityClearance(ship) {
        if (Date.now() - ship.patrolWarningTime > 5000) {
            if (ship.patrolWarningShown && !ship.patrolStandingDown) {
                ship.patrolStandingDown = true;
                ship.patrolWarningShown = false;
                ship.patrolWarningExpired = false;
                
                // Emit stand down event
                this.eventBus.emit(GameEvents.PATROL_STAND_DOWN, {
                    message: 'PATROL: STANDING DOWN'
                });
                
                setTimeout(() => {
                    ship.patrolStandingDown = false;
                }, 2000);
            }
        }
    }
    
    /**
     * Check if NPC should be removed
     */
    shouldRemoveNPC(npc, ship, state) {
        // Remove if ready to dock
        if (npc.readyToDock) {
            return true;
        }
        
        // Remove if dead
        if (npc.health <= 0) {
            this.handleNPCDeath(npc, ship, state);
            return true;
        }
        
        // Remove if too far from player
        const distFromPlayer = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
        if (distFromPlayer > 3000) {
            this.createDepartureEffect(npc, state);
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle NPC death
     */
    handleNPCDeath(npc, ship, state) {
        if (npc.killedBy === 'player') {
            const bounty = npc.behavior === 'aggressive' ? npc.credits : Math.floor(npc.credits * 0.5);
            const killBonus = 25;
            ship.credits += bounty + killBonus;
            ship.kills++;
            
            // Track pirate kills for reputation
            if (npc.behavior === 'aggressive') {
                if (!ship.pirateKills) ship.pirateKills = 0;
                ship.pirateKills++;
            }
            
            // Tutorial progression
            if (ship.tutorialStage === 'combat' && ship.kills >= 1) {
                ship.tutorialStage = 'complete';
            }
        }
        
        // Create explosion effect
        this.eventBus.emit(GameEvents.EXPLOSION_CREATED, {
            x: npc.x,
            y: npc.y,
            size: 'large'
        });
        
        // Create multiple smaller explosions for dramatic effect
        for (let j = 0; j < 4; j++) {
            const angle = (Math.PI * 2 / 4) * j;
            const dist = npc.size * 0.8;
            this.eventBus.emit(GameEvents.EXPLOSION_CREATED, {
                x: npc.x + Math.cos(angle) * dist,
                y: npc.y + Math.sin(angle) * dist,
                size: 'small'
            });
        }
        
        // Pirates drop loot
        if (npc.type === 'pirate' && Math.random() < 0.6) {
            for (let j = 0; j < 2 + Math.floor(Math.random() * 3); j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2 + 1;
                
                // Add pickup to state
                if (!state.pickups) state.pickups = [];
                state.pickups.push({
                    x: npc.x,
                    y: npc.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    type: Math.random() < 0.5 ? 'credits' : 'ore',
                    value: Math.random() < 0.5 ? 10 : 25,
                    lifetime: 0,
                    maxLifetime: 600
                });
            }
        }
        
        // Emit death event
        this.eventBus.emit(GameEvents.NPC_DESTROYED, { npc });
    }
    
    /**
     * Create departure effect when NPC leaves
     */
    createDepartureEffect(npc, state) {
        // Check if near a planet (landing) or far (warping out)
        let nearPlanet = false;
        for (let planet of state.planets) {
            const distToPlanet = Math.sqrt((npc.x - planet.x) ** 2 + (npc.y - planet.y) ** 2);
            if (distToPlanet < planet.radius + 100) {
                nearPlanet = true;
                break;
            }
        }
        
        // Emit warp effect event
        this.eventBus.emit(GameEvents.WARP_EFFECT_CREATED, {
            x: npc.x,
            y: npc.y,
            type: nearPlanet ? 'land' : 'depart'
        });
    }
    
    /**
     * Remove NPC from the array
     */
    removeNPC(index, npc, state) {
        state.npcShips.splice(index, 1);
    }
    
    /**
     * Make AI decision based on NPC behavior
     */
    makeAIDecision(npc, state, playerHostility) {
        const ship = state.ship;
        const decision = {
            desiredAngle: npc.angle,
            shouldThrust: false,
            shouldBrake: false,
            shouldFire: false,
            thrustPower: 1.0
        };
        
        // Clear old messages
        if (npc.messageTime && Date.now() - npc.messageTime > 3000) {
            npc.message = null;
            npc.messageTime = null;
        }
        
        switch (npc.behavior) {
            case "aggressive":
                return this.makePirateDecision(npc, state, decision);
            case "lawful":
                return this.makePatrolDecision(npc, state, playerHostility, decision);
            case "passive":
                return this.makeTraderDecision(npc, state, decision);
            default:
                return this.makeDefaultDecision(npc, state, decision);
        }
    }
    
    /**
     * Pirate AI - hunt players and merchants, evade patrols
     */
    makePirateDecision(npc, state, decision) {
        const ship = state.ship;
        const playerIsAlive = !ship.isDestroyed;
        
        // Check for nearby patrol threats
        let nearbyPatrol = null;
        let patrolDist = 600;
        for (let other of state.npcShips) {
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
            decision.desiredAngle = Math.atan2(evadeY, evadeX);
            
            npc.isFleeing = true;
            npc.state = 'fleeing';
            
            // Pirate panic messages
            if (!npc.lastFleeMessage || Date.now() - npc.lastFleeMessage > 5000) {
                const fleeMessages = [
                    "It's the feds!",
                    "Patrol incoming!",
                    "Time to go!",
                    "Not today!"
                ];
                npc.message = fleeMessages[Math.floor(Math.random() * fleeMessages.length)];
                npc.messageTime = Date.now();
                npc.lastFleeMessage = Date.now();
            }
            
            let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
            
            if (Math.abs(angleDiff) < Math.PI / 6) {
                decision.shouldThrust = true;
            } else if (Math.abs(angleDiff) < Math.PI / 3) {
                decision.shouldThrust = true;
                decision.thrustPower = 0.5;
            } else {
                decision.shouldThrust = false;
            }
        } else {
            // Normal pirate behavior - hunt targets
            let bestTarget = null;
            let bestTargetDist = 800;
            
            // Consider player as target
            if (playerIsAlive) {
                const distToPlayer = Math.sqrt((ship.x - npc.x) ** 2 + (ship.y - npc.y) ** 2);
                if (distToPlayer < bestTargetDist) {
                    bestTarget = ship;
                    bestTargetDist = distToPlayer;
                }
            }
            
            // Look for merchant vessels to raid
            for (let other of state.npcShips) {
                if (other.behavior === "passive") {
                    const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                    if (dist < bestTargetDist) {
                        bestTarget = other;
                        bestTargetDist = dist;
                    }
                }
            }
            
            // Attack the closest target
            if (bestTarget && bestTargetDist < 800) {
                npc.state = 'pursuing';
                
                // Pirate attack messages
                if (bestTargetDist < 400 && (!npc.lastAttackMessage || Date.now() - npc.lastAttackMessage > 8000)) {
                    const attackMessages = [
                        "Surrender your cargo!",
                        "This is a raid!",
                        "You're mine now!",
                        "Nowhere to run!"
                    ];
                    npc.message = attackMessages[Math.floor(Math.random() * attackMessages.length)];
                    npc.messageTime = Date.now();
                    npc.lastAttackMessage = Date.now();
                }
                
                // Calculate intercept angle
                const interceptTime = bestTargetDist / (npc.maxSpeed * 50);
                const targetX = bestTarget.x + bestTarget.vx * interceptTime;
                const targetY = bestTarget.y + bestTarget.vy * interceptTime;
                decision.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
                
                let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
                
                if (Math.abs(angleDiff) < Math.PI / 4) {
                    if (bestTargetDist > 150) {
                        decision.shouldThrust = true;
                    } else if (bestTargetDist < 80) {
                        decision.shouldBrake = true;
                    }
                }
                
                // Fire at target
                if (bestTargetDist < 250 && Math.abs(angleDiff) < Math.PI / 6 && npc.weaponCooldown <= 0) {
                    decision.shouldFire = true;
                }
            } else {
                // Wander when no targets
                npc.state = 'wandering';
                if (!npc.wanderAngle || Math.random() < 0.01) {
                    npc.wanderAngle = Math.random() * Math.PI * 2;
                }
                decision.desiredAngle = npc.wanderAngle;
                
                let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
                if (Math.abs(angleDiff) < Math.PI / 4) {
                    decision.shouldThrust = true;
                }
            }
        }
        
        return decision;
    }
    
    /**
     * Patrol AI - hunt pirates, respond to hostile players
     */
    makePatrolDecision(npc, state, playerHostility, decision) {
        const ship = state.ship;
        const distToPlayer = Math.sqrt((ship.x - npc.x) ** 2 + (ship.y - npc.y) ** 2);
        
        // Check if player is friendly (pirate hunter)
        const playerIsFriendly = ship.pirateKills >= 3 && (!ship.kills || ship.pirateKills >= ship.kills * 0.8);
        
        // PRIORITY 1: Find pirates
        let targetPirate = null;
        let closestPirateDist = playerIsFriendly ? 1500 : 1200;
        let pirateIsAttacking = false;
        
        for (let other of state.npcShips) {
            if (other.behavior === "aggressive") {
                const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                
                const pirateShootingNow = other.weaponCooldown > 0;
                
                // Is pirate near merchant?
                let nearMerchant = false;
                for (let victim of state.npcShips) {
                    if (victim.behavior === "passive") {
                        const distToVictim = Math.sqrt((other.x - victim.x) ** 2 + (other.y - victim.y) ** 2);
                        if (distToVictim < 400) {
                            nearMerchant = true;
                            break;
                        }
                    }
                }
                
                // Is pirate threatening player?
                const nearPlayer = Math.sqrt((other.x - ship.x) ** 2 + (other.y - ship.y) ** 2) < 500;
                const helpingPlayer = playerIsFriendly && nearPlayer;
                
                if (pirateShootingNow || nearMerchant || helpingPlayer) {
                    targetPirate = other;
                    closestPirateDist = dist;
                    pirateIsAttacking = true;
                    
                    if (helpingPlayer && !npc.shownHelpMessage) {
                        npc.shownHelpMessage = true;
                        this.eventBus.emit(GameEvents.PATROL_ASSIST, {
                            message: '✅ PATROL: ENGAGING HOSTILE - ASSISTANCE PROVIDED'
                        });
                    }
                    break;
                } else if (dist < closestPirateDist) {
                    targetPirate = other;
                    closestPirateDist = dist;
                    pirateIsAttacking = false;
                }
            }
        }
        
        // Mark pursuit state
        if (targetPirate) {
            npc.pursuing = true;
            npc.state = 'pursuing';
            if (!npc.pursuitTimer) npc.pursuitTimer = 0;
            
            // Patrol pursuit messages
            if (closestPirateDist < 500 && (!npc.lastPursuitMessage || Date.now() - npc.lastPursuitMessage > 6000)) {
                const pursuitMessages = [
                    "Stop right there!",
                    "Halt, criminal!",
                    "You're under arrest!",
                    "Cease and desist!"
                ];
                npc.message = pursuitMessages[Math.floor(Math.random() * pursuitMessages.length)];
                npc.messageTime = Date.now();
                npc.lastPursuitMessage = Date.now();
            }
        } else {
            npc.pursuing = false;
            npc.pursuitTimer = 0;
        }
        
        // PRIORITY 2: Pursue hostile player
        if (!targetPirate && playerHostility.isHostile && ship.patrolWarningExpired && distToPlayer < 1000) {
            npc.state = 'pursuing';
            
            // Hostile player messages
            if (distToPlayer < 400 && (!npc.lastHostileMessage || Date.now() - npc.lastHostileMessage > 5000)) {
                npc.message = "Criminal detected!";
                npc.messageTime = Date.now();
                npc.lastHostileMessage = Date.now();
            }
            
            const interceptTime = distToPlayer / (npc.maxSpeed * 100);
            const targetX = ship.x + ship.vx * interceptTime * 2;
            const targetY = ship.y + ship.vy * interceptTime * 2;
            decision.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
            
            let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
            
            if (Math.abs(angleDiff) < Math.PI * 1.5) {
                decision.shouldThrust = true;
            }
            
            if (distToPlayer < 450 && Math.abs(angleDiff) < Math.PI / 3 && npc.weaponCooldown <= 0) {
                decision.shouldFire = true;
            }
        } else if (!targetPirate && playerHostility.isHostile && ship.patrolWarningShown && !ship.patrolWarningExpired && distToPlayer < 1000) {
            // Warning period - approach but don't fire
            npc.state = 'warning';
            
            // Warning message
            if (!npc.shownWarningMessage) {
                npc.message = "CEASE FIRE!";
                npc.messageTime = Date.now();
                npc.shownWarningMessage = true;
            }
            
            const interceptTime = distToPlayer / (npc.maxSpeed * 100);
            const targetX = ship.x + ship.vx * interceptTime * 2;
            const targetY = ship.y + ship.vy * interceptTime * 2;
            decision.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
            
            let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
            
            if (Math.abs(angleDiff) < Math.PI * 1.5) {
                decision.shouldThrust = true;
            }
        }
        
        // PRIORITY 3: Pursue pirates
        if (targetPirate) {
            const interceptTime = closestPirateDist / (npc.maxSpeed * 100);
            const targetX = targetPirate.x + targetPirate.vx * interceptTime * 2;
            const targetY = targetPirate.y + targetPirate.vy * interceptTime * 2;
            decision.desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
            
            let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
            
            if (Math.abs(angleDiff) < Math.PI * 0.9) {
                decision.shouldThrust = true;
            }
            
            // Fire with accuracy falloff
            if (closestPirateDist < 600 && Math.abs(angleDiff) < Math.PI / 2 && npc.weaponCooldown <= 0) {
                const accuracy = closestPirateDist < 150 ? 0.8 :
                               closestPirateDist < 300 ? 0.5 :
                               closestPirateDist < 450 ? 0.3 : 0.2;
                
                const targetSpeed = Math.sqrt(targetPirate.vx * targetPirate.vx + targetPirate.vy * targetPirate.vy);
                const movementPenalty = Math.max(0.5, 1 - targetSpeed * 0.5);
                
                if (Math.random() < accuracy * movementPenalty) {
                    decision.shouldFire = true;
                } else {
                    npc.weaponCooldown = npc.weapon.cooldown * 0.5;
                }
            }
            
            // Break off pursuit if too far
            if (closestPirateDist > 800 && Math.random() < 0.05) {
                targetPirate = null;
                npc.pursuing = false;
            }
            
            // Give up after long pursuit
            npc.pursuitTimer++;
            if (npc.pursuitTimer > 300 && Math.random() < 0.1) {
                targetPirate = null;
                npc.pursuing = false;
                npc.pursuitTimer = 0;
            }
        }
        
        // PRIORITY 4: Regular patrol
        if (!targetPirate && !playerHostility.isHostile) {
            npc.pursuing = false;
            npc.state = 'patrolling';
            npc.shownWarningMessage = false; // Reset warning flag
            
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
            decision.desiredAngle = npc.patrolAngle;
            
            if (Math.random() < 0.3) {
                decision.desiredAngle += (Math.random() - 0.5) * 0.5;
            }
            
            let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
            
            if (Math.abs(angleDiff) < Math.PI / 3) {
                decision.shouldThrust = true;
            }
        }
        
        return decision;
    }
    
    /**
     * Trader AI - navigate between planets, flee from threats
     */
    makeTraderDecision(npc, state, decision) {
        const ship = state.ship;
        let fleeing = false;
        
        // Check for player threat
        const playerIsAlive = !ship.isDestroyed;
        const distToPlayer = Math.sqrt((ship.x - npc.x) ** 2 + (ship.y - npc.y) ** 2);
        
        if (playerIsAlive && distToPlayer < 300) {
            const playerProjectiles = state.projectiles.filter(p => p.isPlayer);
            if (ship.weaponCooldown > 0 || playerProjectiles.length > 0) {
                // Flee from player
                decision.desiredAngle = Math.atan2(npc.y - ship.y, npc.x - ship.x);
                fleeing = true;
                npc.isFleeing = true;
                npc.state = 'fleeing';
                
                // Trader panic messages
                if (!npc.lastPanicMessage || Date.now() - npc.lastPanicMessage > 4000) {
                    const panicMessages = [
                        "Help! Help!",
                        "Someone help!",
                        "I'm under attack!",
                        "Mayday! Mayday!"
                    ];
                    npc.message = panicMessages[Math.floor(Math.random() * panicMessages.length)];
                    npc.messageTime = Date.now();
                    npc.lastPanicMessage = Date.now();
                }
                
                let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
                
                if (Math.abs(angleDiff) < Math.PI / 6) {
                    decision.shouldThrust = true;
                } else {
                    decision.shouldThrust = false;
                }
            }
        }
        
        // Check for hostile NPCs
        for (let other of state.npcShips) {
            if (other.behavior === "aggressive") {
                const odx = other.x - npc.x;
                const ody = other.y - npc.y;
                const distToHostile = Math.sqrt(odx * odx + ody * ody);
                if (distToHostile < 200) {
                    decision.desiredAngle = Math.atan2(-ody, -odx);
                    fleeing = true;
                    npc.isFleeing = true;
                    npc.state = 'fleeing';
                    
                    // Trader panic from pirates
                    if (!npc.lastPirateMessage || Date.now() - npc.lastPirateMessage > 5000) {
                        npc.message = "Pirates!";
                        npc.messageTime = Date.now();
                        npc.lastPirateMessage = Date.now();
                    }
                    
                    let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
                    
                    if (Math.abs(angleDiff) < Math.PI / 6) {
                        decision.shouldThrust = true;
                    } else {
                        decision.shouldThrust = false;
                    }
                    break;
                }
            }
        }
        
        if (!fleeing) {
            npc.isFleeing = false;
            if (npc.state === 'fleeing') {
                npc.state = 'traveling';
            }
        }
        
        // Navigate to planet if not fleeing
        if (!fleeing && npc.targetPlanet) {
            const pdx = npc.targetPlanet.x - npc.x;
            const pdy = npc.targetPlanet.y - npc.y;
            const distToPlanet = Math.sqrt(pdx * pdx + pdy * pdy);
            
            if (distToPlanet > npc.targetPlanet.radius + 50) {
                decision.desiredAngle = Math.atan2(pdy, pdx);
                
                let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
                
                if (Math.abs(angleDiff) < Math.PI / 3) {
                    const speed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
                    const approachSpeed = (npc.vx * pdx + npc.vy * pdy) / distToPlanet;
                    
                    if (distToPlanet < 200 && approachSpeed > npc.maxSpeed * 0.3) {
                        decision.shouldBrake = true;
                    } else {
                        decision.shouldThrust = true;
                    }
                }
            } else {
                // At planet - dock
                npc.readyToDock = true;
                
                // Create landing effect
                this.eventBus.emit(GameEvents.WARP_EFFECT_CREATED, {
                    x: npc.x,
                    y: npc.y,
                    type: 'land'
                });
            }
        }
        
        return decision;
    }
    
    /**
     * Default patrol pattern
     */
    makeDefaultDecision(npc, state, decision) {
        if (!npc.patrolCenter) {
            npc.patrolCenter = { x: npc.x, y: npc.y };
            npc.patrolAngle = 0;
            npc.patrolRadius = 300 + Math.random() * 200;
        }
        
        npc.patrolAngle += 0.005;
        const targetX = npc.patrolCenter.x + Math.cos(npc.patrolAngle) * npc.patrolRadius;
        const targetY = npc.patrolCenter.y + Math.sin(npc.patrolAngle) * npc.patrolRadius;
        
        const pdx = targetX - npc.x;
        const pdy = targetY - npc.y;
        decision.desiredAngle = Math.atan2(pdy, pdx);
        
        let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
        
        if (Math.abs(angleDiff) < Math.PI / 3) {
            decision.shouldThrust = true;
        }
        
        return decision;
    }
    
    /**
     * Apply AI decision to NPC
     */
    applyAIDecision(npc, decision, state) {
        // Apply rotation
        let angleDiff = this.normalizeAngle(decision.desiredAngle - npc.angle);
        
        if (Math.abs(angleDiff) > 0.01) {
            const turnSpeed = npc.isFleeing ? npc.turnSpeed * 2.5 : npc.turnSpeed;
            const turnAmount = Math.min(Math.abs(angleDiff), turnSpeed) * Math.sign(angleDiff);
            npc.angle += turnAmount;
        }
        
        // Apply thrust/brake
        if (decision.shouldThrust) {
            const thrustPower = decision.thrustPower || 1.0;
            const thrustX = Math.cos(npc.angle) * npc.thrust * thrustPower;
            const thrustY = Math.sin(npc.angle) * npc.thrust * thrustPower;
            npc.vx += thrustX;
            npc.vy += thrustY;
            npc.thrusting = true;
        } else if (decision.shouldBrake) {
            npc.vx *= 0.95;
            npc.vy *= 0.95;
        } else {
            npc.thrusting = false;
        }
        
        // Fire weapon if decided
        if (decision.shouldFire && npc.weapon && npc.weaponCooldown <= 0) {
            this.fireNPCWeapon(npc, state);
        }
    }
    
    /**
     * Fire NPC weapon
     */
    fireNPCWeapon(npc, state) {
        if (!state.projectiles) state.projectiles = [];
        
        const projectile = {
            x: npc.x + Math.cos(npc.angle) * (npc.size + 5),
            y: npc.y + Math.sin(npc.angle) * (npc.size + 5),
            vx: Math.cos(npc.angle) * 2 + npc.vx,
            vy: Math.sin(npc.angle) * 2 + npc.vy,
            isPlayer: false,
            shooter: npc,
            lifetime: 0,
            damage: npc.weapon.damage,
            type: npc.weapon.type
        };
        
        state.projectiles.push(projectile);
        npc.weaponCooldown = npc.weapon.cooldown;
        
        // Emit fire event for sound
        this.eventBus.emit(GameEvents.WEAPON_FIRED, {
            weapon: npc.weapon,
            shooter: npc,
            isPlayer: false
        });
    }
    
    /**
     * Update NPC physics
     */
    updateNPCPhysics(npc) {
        // Apply space friction (very slight)
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
    
    /**
     * Normalize angle to -PI to PI range
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }
}
