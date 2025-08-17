/**
 * All game systems consolidated
 */

// Audio System
export class AudioSystem {
    constructor() {
        this.context = null;
        this.enabled = true;
        this.masterVolume = 0.3;
        this.sounds = {};
    }
    
    init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            document.addEventListener('click', () => {
                if (this.context.state === 'suspended') {
                    this.context.resume();
                }
            }, { once: true });
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }
    
    playLaser(type = 'laser') {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        if (type === 'mining') {
            osc.frequency.setValueAtTime(200, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1 * this.masterVolume, this.context.currentTime);
        } else if (type === 'rapid') {
            osc.frequency.setValueAtTime(800, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.05);
            gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        } else if (type === 'plasma') {
            osc.frequency.setValueAtTime(150, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.2);
            gain.gain.setValueAtTime(0.25 * this.masterVolume, this.context.currentTime);
        } else {
            osc.frequency.setValueAtTime(600, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.context.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        }
        
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    }
    
    playExplosion(small = false) {
        if (!this.enabled || !this.context) return;
        
        const noise = this.context.createBufferSource();
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.3, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < buffer.length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / buffer.length, 2);
        }
        
        noise.buffer = buffer;
        
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(small ? 800 : 400, this.context.currentTime);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        
        gain.gain.setValueAtTime(small ? 0.2 : 0.4 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        noise.start();
    }
    
    playThrust() {
        if (!this.enabled || !this.context) return;
        if (this.sounds.thrustTimeout) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        osc.type = 'triangle';
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(60, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.05 * this.masterVolume, this.context.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0.03 * this.masterVolume, this.context.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.2);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.2);
        
        this.sounds.thrustTimeout = setTimeout(() => {
            this.sounds.thrustTimeout = null;
        }, 150);
    }
    
    playShieldHit() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(2000, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    }
    
    playPickup() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.setValueAtTime(600, this.context.currentTime + 0.05);
        osc.frequency.setValueAtTime(800, this.context.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.15);
    }
    
    playLanding() {
        if (!this.enabled || !this.context) return;
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.connect(gain);
        gain.connect(this.context.destination);
        
        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.context.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.5);
    }
}

// Explosion system
export function createExplosion(x, y, small = false) {
    return {
        x: x,
        y: y,
        radius: small ? 5 : 15,
        maxRadius: small ? 15 : 40,
        lifetime: 0,
        maxLifetime: 20
    };
}

export function updateExplosions(explosions) {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.lifetime++;
        
        if (exp.lifetime >= exp.maxLifetime) {
            explosions.splice(i, 1);
        }
    }
}

// Projectile system
export function fireProjectile(shooter, angle, isPlayer, weapon = null, projectiles) {
    if (!weapon) {
        weapon = { type: "laser", damage: 10, cooldown: 15 };
    }
    
    const projectile = {
        x: shooter.x + Math.cos(angle) * (shooter.size + 5),
        y: shooter.y + Math.sin(angle) * (shooter.size + 5),
        vx: Math.cos(angle) * 2 + shooter.vx,
        vy: Math.sin(angle) * 2 + shooter.vy,
        isPlayer: isPlayer,
        shooter: shooter,
        lifetime: 0,
        damage: weapon.damage,
        type: weapon.type
    };
    
    if (weapon.type === "rapid") {
        projectile.vx = Math.cos(angle) * 3 + shooter.vx;
        projectile.vy = Math.sin(angle) * 3 + shooter.vy;
    } else if (weapon.type === "plasma") {
        projectile.vx = Math.cos(angle) * 1.5 + shooter.vx;
        projectile.vy = Math.sin(angle) * 1.5 + shooter.vy;
    }
    
    projectiles.push(projectile);
}

export function updateProjectiles(projectiles, ship, npcShips, asteroids, explosions, audioSystem) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.lifetime++;
        
        if (proj.lifetime > 60) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (!proj.isPlayer) {
            const dx = ship.x - proj.x;
            const dy = ship.y - proj.y;
            if (Math.sqrt(dx * dx + dy * dy) < ship.size) {
                if (ship.shield > 0) {
                    ship.shield = Math.max(0, ship.shield - proj.damage);
                    explosions.push(createExplosion(proj.x, proj.y, true));
                    audioSystem.playShieldHit();
                } else {
                    ship.health = Math.max(0, ship.health - proj.damage);  // Clamp to 0, not negative
                    explosions.push(createExplosion(proj.x, proj.y, true));
                    audioSystem.playExplosion(true);
                }
                projectiles.splice(i, 1);
                continue;
            }
        }
        
        // Check collision with NPCs
        for (let npc of npcShips) {
            if (proj.shooter === npc) continue;
            
            const dx = npc.x - proj.x;
            const dy = npc.y - proj.y;
            if (Math.sqrt(dx * dx + dy * dy) < npc.size) {
                npc.health -= proj.damage;
                explosions.push(createExplosion(proj.x, proj.y, true));
                
                if (npc.health <= 0 && !npc.killedBy) {
                    npc.killedBy = proj.isPlayer ? 'player' : 'npc';
                }
                
                projectiles.splice(i, 1);
                break;
            }
        }
        
        // Check collision with asteroids
        for (let asteroid of asteroids) {
            const dx = asteroid.x - proj.x;
            const dy = asteroid.y - proj.y;
            if (Math.sqrt(dx * dx + dy * dy) < asteroid.radius) {
                asteroid.health -= proj.damage;
                explosions.push(createExplosion(proj.x, proj.y, true));
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

// Ship update
export function updateShip(ship, game, audioSystem, projectiles, pickups, explosions) {
    // Check if ship is destroyed
    if (ship.health <= 0) {
        // Handle ship destruction
        if (!ship.isDestroyed) {
            ship.isDestroyed = true;
            ship.health = 0; // Clamp to 0, not negative
            
            // Create big explosion at ship location
            explosions.push(createExplosion(ship.x, ship.y, false));
            explosions.push(createExplosion(ship.x + 10, ship.y - 10, true));
            explosions.push(createExplosion(ship.x - 10, ship.y + 10, true));
            audioSystem.playExplosion(false);
            
            // Show game over message
            const msg = document.createElement('div');
            msg.className = 'game-notification error';
            msg.style.cssText = 'font-size: 24px; padding: 20px; top: 50%; transform: translateY(-50%);';
            msg.innerHTML = 'SHIP DESTROYED<br><span style="font-size: 14px;">Press R to respawn at last planet</span>';
            document.body.appendChild(msg);
            
            // Stop ship movement
            ship.vx = 0;
            ship.vy = 0;
        }
        
        // Check for respawn
        if (game.keys['KeyR'] && ship.isDestroyed) {
            // Respawn at last visited planet or default location
            if (ship.landedPlanet) {
                ship.x = ship.landedPlanet.x + ship.landedPlanet.radius + 50;
                ship.y = ship.landedPlanet.y;
            } else {
                ship.x = 0;
                ship.y = 0;
            }
            
            // Reset ship state
            ship.health = ship.maxHealth;
            ship.shield = Math.min(50, ship.maxShield); // Half shields
            ship.fuel = ship.maxFuel;
            ship.vx = 0;
            ship.vy = 0;
            ship.angle = 0;
            ship.isDestroyed = false;
            ship.credits = Math.max(0, ship.credits - 100); // Death penalty
            
            // Clear any game over messages
            const notifications = document.querySelectorAll('.game-notification');
            notifications.forEach(n => {
                if (n.textContent.includes('DESTROYED')) n.remove();
            });
            
            // Show respawn message
            const msg = document.createElement('div');
            msg.className = 'game-notification info';
            msg.textContent = 'RESPAWNED - DEATH PENALTY: -100 CREDITS';
            document.body.appendChild(msg);
            setTimeout(() => msg.remove(), 3000);
        }
        
        return; // Don't process any other ship updates while destroyed
    }
    
    // Rotation
    if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
        ship.angle -= 0.012;
    }
    if (game.keys['ArrowRight'] || game.keys['KeyD']) {
        ship.angle += 0.012;
    }
    
    // Thrust
    if ((game.keys['ArrowUp'] || game.keys['KeyW']) && ship.fuel > 0.1) {
        const thrustX = Math.cos(ship.angle) * ship.thrust;
        const thrustY = Math.sin(ship.angle) * ship.thrust;
        ship.vx += thrustX;
        ship.vy += thrustY;
        ship.fuel = Math.max(0, ship.fuel - 0.1);
        audioSystem.playThrust();
    }
    
    // Brake
    if (game.keys['Space']) {
        ship.vx *= 0.95;
        ship.vy *= 0.95;
    }
    
    // Fire weapon
    if (game.keys['KeyF'] && ship.weaponCooldown <= 0 && ship.weapons.length > 0) {
        const weapon = ship.weapons[ship.currentWeapon];
        fireProjectile(ship, ship.angle, true, weapon, projectiles);
        ship.weaponCooldown = weapon.cooldown;
        audioSystem.playLaser(weapon.type);
    }
    
    // Switch weapons
    if (game.keys['KeyQ'] && !ship.weaponSwitchPressed && ship.weapons.length > 1) {
        ship.currentWeapon = (ship.currentWeapon + 1) % ship.weapons.length;
        ship.weaponSwitchPressed = true;
    } else if (!game.keys['KeyQ']) {
        ship.weaponSwitchPressed = false;
    }
    
    // Apply velocity limits
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.maxSpeed) {
        ship.vx = (ship.vx / speed) * ship.maxSpeed;
        ship.vy = (ship.vy / speed) * ship.maxSpeed;
    }
    
    // Update position
    ship.x += ship.vx;
    ship.y += ship.vy;
    
    // Update weapon cooldown
    if (ship.weaponCooldown > 0) {
        ship.weaponCooldown--;
    }
    
    // Manage landing cooldown
    if (ship.landingCooldown > 0) {
        ship.landingCooldown--;
    }
    
    // Check if ship has moved away from landed planet
    if (ship.isLanded && ship.landedPlanet) {
        const dx = ship.x - ship.landedPlanet.x;
        const dy = ship.y - ship.landedPlanet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > ship.landedPlanet.radius + 100) {
            ship.isLanded = false;
            ship.landedPlanet = null;
        }
    }
    
    // Slowly regenerate fuel
    if (ship.fuel < ship.maxFuel) {
        ship.fuel = Math.min(ship.maxFuel, ship.fuel + 0.01);
    }
    
    // Slowly regenerate shields
    if (ship.shield < ship.maxShield) {
        ship.shield = Math.min(ship.maxShield, ship.shield + 0.02);
    }
    
    // Slowly regenerate health when landed
    if (ship.isLanded && ship.health < ship.maxHealth) {
        ship.health = Math.min(ship.maxHealth, ship.health + 0.1);
    }
    
    // Check for pickup collection
    for (let i = pickups.length - 1; i >= 0; i--) {
        const pickup = pickups[i];
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
                    
                    explosions.push(createExplosion(pickup.x, pickup.y, true));
                    audioSystem.playPickup();
                    pickups.splice(i, 1);
                }
            } else if (pickup.type === 'credits') {
                ship.credits += pickup.value;
                explosions.push(createExplosion(pickup.x, pickup.y, true));
                audioSystem.playPickup();
                pickups.splice(i, 1);
            }
        }
    }
}

// NPC system
export function spawnNPC(npcShips, ship, planets, npcTypes) {
    const types = Object.keys(npcTypes);
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
    
    const template = npcTypes[type];
    
    // Spawn location based on type
    let spawnX, spawnY, initialVx, initialVy;
    
    if (type === 'trader') {
        const spawnPlanet = planets[Math.floor(Math.random() * planets.length)];
        const angle = Math.random() * Math.PI * 2;
        const distance = spawnPlanet.radius + 100 + Math.random() * 100;
        spawnX = spawnPlanet.x + Math.cos(angle) * distance;
        spawnY = spawnPlanet.y + Math.sin(angle) * distance;
        initialVx = Math.cos(angle) * template.maxSpeed * 0.5;
        initialVy = Math.sin(angle) * template.maxSpeed * 0.5;
    } else if (type === 'pirate') {
        const angle = Math.random() * Math.PI * 2;
        const distance = 1200 + Math.random() * 300;
        spawnX = ship.x + Math.cos(angle) * distance;
        spawnY = ship.y + Math.sin(angle) * distance;
        initialVx = -Math.cos(angle) * template.maxSpeed * 0.3;
        initialVy = -Math.sin(angle) * template.maxSpeed * 0.3;
    } else if (type === 'patrol') {
        const angle = Math.random() * Math.PI * 2;
        const distance = 400 + Math.random() * 400;
        spawnX = ship.x + Math.cos(angle) * distance;
        spawnY = ship.y + Math.sin(angle) * distance;
        initialVx = -Math.cos(angle) * template.maxSpeed * 0.5;
        initialVy = -Math.sin(angle) * template.maxSpeed * 0.5;
    } else {
        const angle = Math.random() * Math.PI * 2;
        const distance = 600 + Math.random() * 600;
        spawnX = ship.x + Math.cos(angle) * distance;
        spawnY = ship.y + Math.sin(angle) * distance;
        const velAngle = Math.random() * Math.PI * 2;
        initialVx = Math.cos(velAngle) * template.maxSpeed * 0.3;
        initialVy = Math.sin(velAngle) * template.maxSpeed * 0.3;
    }
    
    const npc = {
        x: spawnX,
        y: spawnY,
        vx: initialVx,
        vy: initialVy,
        angle: Math.atan2(initialVy, initialVx),
        type: type,
        ...template,
        targetPlanet: type === 'trader' ? 
            planets[Math.floor(Math.random() * planets.length)] : null,
        weaponCooldown: 0,
        lifetime: 0,
        thrusting: false
    };
    
    npcShips.push(npc);
}

export function updateNPCs(npcShips, ship, planets, projectiles, audioSystem, npcTypes, npcSpawnState) {
    // Count nearby NPCs
    let nearbyCount = 0;
    for (let npc of npcShips) {
        const dist = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
        if (dist < 1000) nearbyCount++;
    }
    
    // Spawn new NPCs periodically
    const maxNearby = 5;
    if (Date.now() > npcSpawnState.nextShipSpawn && nearbyCount < maxNearby && npcShips.length < 12) {
        spawnNPC(npcShips, ship, planets, npcTypes);
        const spawnDelay = 3000 + (nearbyCount * 2000);
        npcSpawnState.nextShipSpawn = Date.now() + Math.random() * spawnDelay + spawnDelay/2;
    }
    
    // Update each NPC
    for (let i = npcShips.length - 1; i >= 0; i--) {
        const npc = npcShips[i];
        npc.lifetime++;
        
        // Remove dead NPCs
        if (npc.health <= 0) {
            if (npc.killedBy === 'player') {
                const bounty = npc.behavior === 'aggressive' ? npc.credits : Math.floor(npc.credits * 0.5);
                const killBonus = 25;
                ship.credits += bounty + killBonus;
                ship.kills++;
                
                if (ship.tutorialStage === 'combat' && ship.kills >= 1) {
                    ship.tutorialStage = 'complete';
                }
            }
            
            // Pirates drop loot
            if (npc.type === 'pirate' && Math.random() < 0.6) {
                // Would add pickup here
            }
            
            audioSystem.playExplosion();
            npcShips.splice(i, 1);
            continue;
        }
        
        // Remove NPCs that are too far away
        const distFromPlayer = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
        if (distFromPlayer > 3000) {
            npcShips.splice(i, 1);
            continue;
        }
        
        // Clear movement flags
        npc.thrusting = false;
        
        // AI decision making - determine desired angle and whether to thrust
        const dx = ship.x - npc.x;
        const dy = ship.y - npc.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        let desiredAngle = npc.angle;
        let shouldThrust = false;
        let shouldBrake = false;
        
        if (npc.behavior === "aggressive") {
            // Pirates hunt player AND merchant vessels, but evade patrols
            const distToPlayer = Math.sqrt((ship.x - npc.x) ** 2 + (ship.y - npc.y) ** 2);
            const playerIsAlive = !ship.isDestroyed;
            
            // Check for nearby patrol threats
            let nearbyPatrol = null;
            let patrolDist = 600;  // Wider detection range for patrols
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
                // Evasive maneuvers!
                const evadeX = npc.x - nearbyPatrol.x;
                const evadeY = npc.y - nearbyPatrol.y;
                desiredAngle = Math.atan2(evadeY, evadeX);  // Run away
                
                // Add zigzag evasion
                desiredAngle += Math.sin(npc.lifetime * 0.1) * 0.5;
                
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI * 0.8) {
                    shouldThrust = true;  // Run!
                }
            } else {
                // Normal pirate behavior - hunt targets
                // Look for closest target (player or merchant)
                let bestTarget = null;
                let bestTargetDist = 800;
                let targetIsPlayer = false;
                
                // Consider player as target (only if alive)
                if (playerIsAlive && distToPlayer < bestTargetDist) {
                    bestTarget = ship;
                    bestTargetDist = distToPlayer;
                    targetIsPlayer = true;
                }
                
                // Look for merchant vessels to raid
                for (let other of npcShips) {
                    if (other.behavior === "passive") {  // Traders and freighters
                        const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                        if (dist < bestTargetDist) {
                            bestTarget = other;
                            bestTargetDist = dist;
                            targetIsPlayer = false;
                        }
                    }
                }
            
                // Attack the closest target
                if (bestTarget && bestTargetDist < 800) {
                    // Calculate intercept angle (lead the target)
                    const interceptTime = bestTargetDist / (npc.maxSpeed * 50);
                    const targetX = bestTarget.x + bestTarget.vx * interceptTime;
                    const targetY = bestTarget.y + bestTarget.vy * interceptTime;
                    desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
                    
                    // Check if we're facing roughly the right direction
                    let angleDiff = desiredAngle - npc.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    if (Math.abs(angleDiff) < Math.PI / 4) {
                        // Facing the right way - manage distance
                        if (bestTargetDist > 150) {
                            shouldThrust = true;
                        } else if (bestTargetDist < 80) {
                            shouldBrake = true;  // Just brake when too close
                        }
                    }
                    
                    // Fire at target when in range and facing them
                    if (bestTargetDist < 250 && Math.abs(angleDiff) < Math.PI / 6 && npc.weaponCooldown <= 0 && npc.weapon) {
                        fireProjectile(npc, npc.angle, false, npc.weapon, projectiles);
                        npc.weaponCooldown = npc.weapon.cooldown;
                    }
                } else {
                    // Wander when no targets nearby
                    if (!npc.wanderAngle || Math.random() < 0.01) {
                        npc.wanderAngle = Math.random() * Math.PI * 2;
                    }
                    desiredAngle = npc.wanderAngle;
                    
                    let angleDiff = desiredAngle - npc.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    if (Math.abs(angleDiff) < Math.PI / 4) {
                        shouldThrust = true;
                    }
                }
            }  // End of normal pirate behavior
        } else if (npc.behavior === "lawful") {
            // Patrol ships - AGGRESSIVELY hunt pirates attacking merchants
            const distToPlayer = Math.sqrt((ship.x - npc.x) ** 2 + (ship.y - npc.y) ** 2);
            
            // Check if player has been aggressive (and is alive)
            const playerIsAlive = !ship.isDestroyed;
            const playerIsHostile = playerIsAlive && (ship.weaponCooldown > 0 || ship.kills > 2);
            
            // PRIORITY 1: Find ANY pirate, especially if attacking
            let targetPirate = null;
            let closestPirateDist = 1200;  // Much larger detection range
            let pirateIsAttacking = false;
            
            for (let other of npcShips) {
                if (other.behavior === "aggressive") {
                    const dist = Math.sqrt((other.x - npc.x) ** 2 + (other.y - npc.y) ** 2);
                    
                    // Is this pirate actively shooting? (check if cooldown is active)
                    const pirateShootingNow = other.weaponCooldown > 0;
                    
                    // Is pirate near ANY merchant?
                    let nearMerchant = false;
                    for (let victim of npcShips) {
                        if (victim.behavior === "passive") {
                            const distToVictim = Math.sqrt(
                                (other.x - victim.x) ** 2 + (other.y - victim.y) ** 2
                            );
                            if (distToVictim < 400) {  // Wider protection radius
                                nearMerchant = true;
                                break;
                            }
                        }
                    }
                    
                    // Is pirate threatening player?
                    const nearPlayer = Math.sqrt(
                        (other.x - ship.x) ** 2 + (other.y - ship.y) ** 2
                    ) < 500;
                    
                    // ALWAYS prioritize pirates that are shooting or near victims
                    if (pirateShootingNow || nearMerchant) {
                        targetPirate = other;
                        closestPirateDist = dist;
                        pirateIsAttacking = true;

                        break;  // Immediately target this pirate!
                    } else if (dist < closestPirateDist) {
                        // Otherwise target closest pirate
                        targetPirate = other;
                        closestPirateDist = dist;
                        pirateIsAttacking = false;
                    }
                }
            }
            
            // Check if we found a pirate to pursue
            if (targetPirate) {
                npc.pursuing = true;  // Mark as pursuing
                if (!npc.pursuitTimer) npc.pursuitTimer = 0;  // Initialize pursuit timer
            } else {
                npc.pursuing = false;  // Clear pursuit state if no target
                npc.pursuitTimer = 0;  // Reset timer
            }
            
            // PRIORITY 2: Pursue hostile player
            if (!targetPirate && playerIsHostile && distToPlayer < 1000) {
                // Pursue hostile/armed player
                const interceptTime = distToPlayer / (npc.maxSpeed * 100);
                const targetX = ship.x + ship.vx * interceptTime * 2;
                const targetY = ship.y + ship.vy * interceptTime * 2;
                desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
                
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI * 1.5) {
                    shouldThrust = true;
                }
                
                // Fire at hostile player
                if (distToPlayer < 450 && Math.abs(angleDiff) < Math.PI / 3 && npc.weaponCooldown <= 0 && npc.weapon) {
                    fireProjectile(npc, npc.angle, false, npc.weapon, projectiles);
                    npc.weaponCooldown = npc.weapon.cooldown;
                }
            } 
            // PRIORITY 3: AGGRESSIVELY pursue and destroy pirates
            else if (targetPirate) {
                // Predict pirate's position for intercept
                const interceptTime = closestPirateDist / (npc.maxSpeed * 100);
                const targetX = targetPirate.x + targetPirate.vx * interceptTime * 2;
                const targetY = targetPirate.y + targetPirate.vy * interceptTime * 2;
                desiredAngle = Math.atan2(targetY - npc.y, targetX - npc.x);
                
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Always thrust when chasing pirates (very aggressive)
                if (Math.abs(angleDiff) < Math.PI * 0.9) {  // Almost always thrust
                    shouldThrust = true;
                }
                
                // Open fire at longer range but with MAJOR accuracy falloff
                if (closestPirateDist < 600 && Math.abs(angleDiff) < Math.PI / 2 && 
                    npc.weaponCooldown <= 0 && npc.weapon) {
                    // Much worse accuracy at range
                    const accuracy = closestPirateDist < 150 ? 0.8 :  // 80% at close range
                                   closestPirateDist < 300 ? 0.5 :   // 50% at medium range
                                   closestPirateDist < 450 ? 0.3 :   // 30% at long range
                                   0.2;                               // 20% at max range
                    
                    // Add movement penalty - harder to hit moving targets
                    const targetSpeed = Math.sqrt(targetPirate.vx * targetPirate.vx + targetPirate.vy * targetPirate.vy);
                    const movementPenalty = Math.max(0.5, 1 - targetSpeed * 0.5);
                    
                    if (Math.random() < accuracy * movementPenalty) {
                        fireProjectile(npc, npc.angle, false, npc.weapon, projectiles);
                        npc.weaponCooldown = npc.weapon.cooldown;
                    } else {
                        // Still use cooldown even on miss (simulates taking the shot)
                        npc.weaponCooldown = npc.weapon.cooldown * 0.5;
                    }
                }
                
                // More likely to break off pursuit if pirate is escaping
                if (closestPirateDist > 800 && Math.random() < 0.05) {  // 5% chance per frame
                    targetPirate = null;
                    npc.pursuing = false;
                }
                
                // Also give up if chasing too long without hitting
                if (!npc.pursuitTimer) npc.pursuitTimer = 0;
                npc.pursuitTimer++;
                if (npc.pursuitTimer > 300 && Math.random() < 0.1) {  // After 5 seconds, start giving up
                    targetPirate = null;
                    npc.pursuing = false;
                    npc.pursuitTimer = 0;
                }
            } 
            // PRIORITY 4: Regular patrol
            else {
                // No longer pursuing anyone
                npc.pursuing = false;
                
                // Initialize patrol pattern with random variation
                if (!npc.patrolAngle) {
                    npc.patrolAngle = Math.random() * Math.PI * 2;
                    npc.patrolSpeed = 0.008 + Math.random() * 0.008;  // Vary patrol speed
                    npc.patrolDirection = Math.random() < 0.5 ? 1 : -1;  // Random direction
                }
                
                // Mix of circular and wandering movement
                if (Math.random() < 0.02) {  // 2% chance to change pattern
                    npc.patrolDirection *= -1;  // Reverse direction
                    npc.patrolSpeed = 0.008 + Math.random() * 0.008;
                }
                
                npc.patrolAngle += npc.patrolSpeed * npc.patrolDirection;
                desiredAngle = npc.patrolAngle;
                
                // Add some drift
                if (Math.random() < 0.3) {  // 30% chance to drift
                    desiredAngle += (Math.random() - 0.5) * 0.5;
                }
                
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) < Math.PI / 3) {
                    shouldThrust = true;
                }
            }
        } else if (npc.behavior === "passive") {
            // Traders navigate between planets
            let fleeing = false;
            
            // Check for threats (only if player is alive)
            const playerIsAlive = !ship.isDestroyed;
            if (playerIsAlive && distToPlayer < 300 && (ship.weaponCooldown > 0 || projectiles.some(p => p.isPlayer))) {
                // Flee from player threat
                desiredAngle = Math.atan2(-dy, -dx);
                shouldThrust = true;
                fleeing = true;
            }
            
            // Check for hostile NPCs nearby
            for (let other of npcShips) {
                if (other.behavior === "aggressive") {
                    const odx = other.x - npc.x;
                    const ody = other.y - npc.y;
                    const distToHostile = Math.sqrt(odx * odx + ody * ody);
                    if (distToHostile < 200) {
                        desiredAngle = Math.atan2(-ody, -odx);
                        shouldThrust = true;
                        fleeing = true;
                        break;
                    }
                }
            }
            
            if (!fleeing && npc.targetPlanet) {
                // Navigate to target planet
                const pdx = npc.targetPlanet.x - npc.x;
                const pdy = npc.targetPlanet.y - npc.y;
                const distToPlanet = Math.sqrt(pdx * pdx + pdy * pdy);
                
                if (distToPlanet > npc.targetPlanet.radius + 50) {
                    desiredAngle = Math.atan2(pdy, pdx);
                    
                    let angleDiff = desiredAngle - npc.angle;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    // Only thrust if facing the right direction
                    if (Math.abs(angleDiff) < Math.PI / 3) {
                        // Slow down if approaching too fast
                        const speed = Math.sqrt(npc.vx * npc.vx + npc.vy * npc.vy);
                        const approachSpeed = (npc.vx * pdx + npc.vy * pdy) / distToPlanet;
                        
                        if (distToPlanet < 200 && approachSpeed > npc.maxSpeed * 0.3) {
                            shouldBrake = true;
                        } else {
                            shouldThrust = true;
                        }
                    }
                } else {
                    // At planet - brake and pick new destination
                    shouldBrake = true;
                    
                    if (Math.random() < 0.01) {
                        // Pick a new planet to visit
                        const otherPlanets = planets.filter(p => p !== npc.targetPlanet);
                        npc.targetPlanet = otherPlanets[Math.floor(Math.random() * otherPlanets.length)];
                    }
                }
            }
        } else {
            // Patrol ships - systematic patrol pattern
            if (!npc.patrolCenter) {
                // Initialize patrol pattern
                npc.patrolCenter = { x: npc.x, y: npc.y };
                npc.patrolAngle = 0;
                npc.patrolRadius = 300 + Math.random() * 200;
            }
            
            // Move in a circular patrol pattern
            npc.patrolAngle += 0.005;
            const targetX = npc.patrolCenter.x + Math.cos(npc.patrolAngle) * npc.patrolRadius;
            const targetY = npc.patrolCenter.y + Math.sin(npc.patrolAngle) * npc.patrolRadius;
            
            const pdx = targetX - npc.x;
            const pdy = targetY - npc.y;
            desiredAngle = Math.atan2(pdy, pdx);
            
            let angleDiff = desiredAngle - npc.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            if (Math.abs(angleDiff) < Math.PI / 3) {
                shouldThrust = true;
            }
            
            // Investigate nearby combat
            if (distToPlayer < 400 && ship.weaponCooldown > 0) {
                desiredAngle = Math.atan2(dy, dx);
                shouldThrust = true;
            }
        }
        
        // Apply rotation toward desired angle
        let angleDiff = desiredAngle - npc.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        if (Math.abs(angleDiff) > 0.01) {
            // Turn toward target, but respect turn speed limit
            const turnAmount = Math.min(Math.abs(angleDiff), npc.turnSpeed) * Math.sign(angleDiff);
            npc.angle += turnAmount;
        }
        
        // Apply thrust/brake based on AI decision
        if (shouldThrust) {
            // Forward thrust
            const thrustX = Math.cos(npc.angle) * npc.thrust;
            const thrustY = Math.sin(npc.angle) * npc.thrust;
            npc.vx += thrustX;
            npc.vy += thrustY;
            npc.thrusting = true;
        } else if (shouldBrake) {
            // Brake
            npc.vx *= 0.95;
            npc.vy *= 0.95;
        } else {
            npc.thrusting = false;
        }
        
        // Update weapon cooldown
        if (npc.weaponCooldown > 0) {
            npc.weaponCooldown--;
        }
        
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
}
export function updateAsteroids(asteroids, ship, pickups, explosions) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];
        
        // Remove destroyed asteroids and drop ore
        if (asteroid.health <= 0) {
            // Drop ore at asteroid location
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
            
            // Create small explosion
            explosions.push(createExplosion(asteroid.x, asteroid.y, true));
            
            // Replace with smaller asteroids if big enough
            if (asteroid.radius > 5) {
                for (let j = 0; j < 2; j++) {
                    const angle = Math.random() * Math.PI * 2;
                    asteroids.push({
                        x: asteroid.x + Math.cos(angle) * asteroid.radius,
                        y: asteroid.y + Math.sin(angle) * asteroid.radius,
                        vx: Math.cos(angle) * 0.5 + asteroid.vx,
                        vy: Math.sin(angle) * 0.5 + asteroid.vy,
                        radius: asteroid.radius * 0.6,
                        color: "#666",
                        rotationSpeed: (Math.random() - 0.5) * 0.02,
                        health: 10,
                        maxHealth: 10,
                        oreContent: 1
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
            // Calculate relative velocity for damage
            const relVx = ship.vx - asteroid.vx;
            const relVy = ship.vy - asteroid.vy;
            const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);
            
            // Damage based on relative speed and asteroid size
            const damage = Math.floor(relSpeed * asteroid.radius * 2);
            
            if (ship.shield > 0) {
                ship.shield = Math.max(0, ship.shield - damage);
            } else {
                ship.health = Math.max(0, ship.health - damage);  // Clamp to 0, not negative
            }
            
            // Bounce both objects
            const angle = Math.atan2(dy, dx);
            const force = 0.5;
            ship.vx += Math.cos(angle) * force;
            ship.vy += Math.sin(angle) * force;
            asteroid.vx -= Math.cos(angle) * force * 0.5;
            asteroid.vy -= Math.sin(angle) * force * 0.5;
            
            // Create impact effect
            explosions.push(createExplosion(asteroid.x + dx * 0.5, asteroid.y + dy * 0.5, true));
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

export function updatePickups(pickups, ship, audioSystem, explosions) {
    for (let i = pickups.length - 1; i >= 0; i--) {
        const pickup = pickups[i];
        
        // Update position (floating in space)
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
            // Collect the pickup
            if (pickup.type === 'ore') {
                // Add ore to cargo if space available
                const cargoUsed = ship.cargo.reduce((sum, item) => sum + item.quantity, 0);
                if (cargoUsed < ship.cargoCapacity) {
                    const existing = ship.cargo.find(c => c.type === 'ore');
                    if (existing) {
                        existing.quantity += pickup.value;
                    } else {
                        ship.cargo.push({ type: 'ore', quantity: pickup.value });
                    }
                    
                    // Visual feedback
                    explosions.push(createExplosion(pickup.x, pickup.y, true));
                    audioSystem.playPickup();
                    pickups.splice(i, 1);
                }
            } else if (pickup.type === 'credits') {
                ship.credits += pickup.value;
                explosions.push(createExplosion(pickup.x, pickup.y, true));
                audioSystem.playPickup();
                pickups.splice(i, 1);
            }
        }
    }
}
// Removed extra arguments that were causing issues
export function checkLanding(ship, planets, audioSystem, npcShips, projectiles, explosions, game) {
    if (ship.landingCooldown > 0) return;
    
    for (let planet of planets) {
        const dx = ship.x - planet.x;
        const dy = ship.y - planet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < planet.radius + 50 && planet.landable) {
            if (ship.isLanded && ship.landedPlanet === planet) {
                return;
            }
            
            // Successful landing
            ship.vx = 0;
            ship.vy = 0;
            ship.isLanded = true;
            ship.landedPlanet = planet;
            ship.landingCooldown = 60;
            
            // Clear threats
            npcShips.length = 0;
            projectiles.length = 0;
            explosions.length = 0;
            
            // Landing benefits
            ship.fuel = ship.maxFuel;
            ship.health = ship.maxHealth;
            ship.credits += 50;
            audioSystem.playLanding();
            
            // Position ship just outside planet
            const angle = Math.atan2(dy, dx);
            ship.x = planet.x + Math.cos(angle) * (planet.radius + 40);
            ship.y = planet.y + Math.sin(angle) * (planet.radius + 40);
            
            // Show landing overlay
            document.getElementById('landingOverlay').style.display = 'block';
            document.getElementById('planetName').textContent = planet.name;
            document.getElementById('planetDescription').textContent = planet.description;
            ship.currentPlanet = planet;
            game.paused = true;
            
            // Show the landing info panel by default
            showPanel('landing', ship, null, null, null, null);
            
            break;
        }
    }
}
export function updateTutorialHint(ship) {
    const hintElement = document.getElementById('tutorialHint');
    if (!hintElement) return;
    
    let message = null;
    
    switch(ship.tutorialStage) {
        case 'start':
            if (ship.weapons.length === 0) {
                message = "WARNING: UNARMED // LOCATE PLANET AND TRADE FOR WEAPONS";
            } else {
                ship.tutorialStage = 'armed';
            }
            break;
            
        case 'armed':
            message = "WEAPONS ONLINE // F: FIRE / Q: SWITCH / ENGAGE HOSTILES";
            setTimeout(() => {
                ship.tutorialStage = 'combat';
            }, 5000);
            break;
            
        case 'combat':
            // No message during combat
            break;
            
        case 'complete':
            message = "TARGET ELIMINATED // CONTINUE TRADING FOR UPGRADES";
            setTimeout(() => {
                ship.tutorialStage = 'done';
            }, 5000);
            break;
    }
    
    if (message) {
        hintElement.textContent = message;
        hintElement.classList.add('visible');
    } else {
        hintElement.classList.remove('visible');
    }
}
export function updateHUD(ship) {
    document.getElementById('health').textContent = Math.max(0, Math.round(ship.health)) + '%';
    document.getElementById('shield').textContent = ship.shield > 0 ? Math.round(ship.shield) : 'None';
    document.getElementById('fuel').textContent = Math.round(ship.fuel) + '%';
    document.getElementById('speed').textContent = (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1);
    document.getElementById('cargo').textContent = ship.cargo.reduce((sum, item) => sum + item.quantity, 0) + '/' + ship.cargoCapacity;
    document.getElementById('location').textContent = ship.isLanded ? ship.landedPlanet?.name : 'SPACE';
    document.getElementById('credits').textContent = ship.credits;
    document.getElementById('weapon').textContent = ship.weapons.length > 0 ? ship.weapons[ship.currentWeapon].type.toUpperCase() : 'NONE';
    document.getElementById('kills').textContent = ship.kills;
}
export function showLandingOverlay() {}
export function showPanel(panel, ship, updateTradingPanelFunc, updateShopPanelFunc, commodities, shopInventory) {
    // Get all panels
    const tradingPanel = document.getElementById('tradingPanel');
    const shopPanel = document.getElementById('shopPanel');
    const landingInfo = document.getElementById('landingInfo');
    
    // Hide all panels first
    if (tradingPanel) tradingPanel.style.display = 'none';
    if (shopPanel) shopPanel.style.display = 'none';
    if (landingInfo) landingInfo.style.display = 'none';
    
    // Show the requested panel
    if (panel === 'landing') {
        // Show landing info panel
        if (landingInfo) {
            landingInfo.style.display = 'flex';
        }
    } else if (panel === 'trading') {
        // Show trading panel
        if (tradingPanel) {
            tradingPanel.style.display = 'flex';  // Use flex instead of block
            if (updateTradingPanelFunc && ship && commodities) {
                updateTradingPanelFunc(ship, commodities);
            }
        }
    } else if (panel === 'shop') {
        // Show shop panel
        if (shopPanel) {
            shopPanel.style.display = 'flex';  // Use flex instead of block
            if (updateShopPanelFunc && ship && shopInventory) {
                updateShopPanelFunc(ship, shopInventory);
            }
        }
    }
}
export function updateTradingPanel(ship, commodities) {
    if (!ship.currentPlanet) return;
    
    // Update status
    document.getElementById('tradeCredits').textContent = ship.credits;
    const cargoUsed = ship.cargo.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('tradeCargo').textContent = `${cargoUsed}/${ship.cargoCapacity}`;
    
    // Calculate total cargo value
    let totalValue = 0;
    for (let item of ship.cargo) {
        totalValue += item.quantity * ship.currentPlanet.commodityPrices[item.type];
    }
    
    // Build commodity list
    const list = document.getElementById('commodityList');
    list.innerHTML = '';
    
    // Add sell all button if carrying cargo
    if (cargoUsed > 0) {
        const sellAllRow = document.createElement('div');
        sellAllRow.className = 'commodity-row';
        sellAllRow.style.borderBottom = '2px solid #333';
        sellAllRow.innerHTML = `
            <div class="commodity-info">
                <div class="commodity-name">💰 Sell All Cargo</div>
                <div>Total value: ${totalValue}</div>
            </div>
            <div class="buy-sell-buttons">
                <button onclick="window.gameInstance.sellAllCargo()">Sell All</button>
            </div>
        `;
        list.appendChild(sellAllRow);
    }
    
    for (let key in commodities) {
        const commodity = commodities[key];
        const price = ship.currentPlanet.commodityPrices[key];
        const basePrice = commodity.basePrice;
        const owned = ship.cargo.find(c => c.type === key);
        const ownedQty = owned ? owned.quantity : 0;
        
        // Show price indicator
        let priceIndicator = '';
        if (price < basePrice * 0.7) {
            priceIndicator = ' 📉'; // Good buy price
        } else if (price > basePrice * 1.3) {
            priceIndicator = ' 📈'; // Good sell price
        }
        
        const row = document.createElement('div');
        row.className = 'commodity-row';
        row.innerHTML = `
            <div class="commodity-info">
                <div class="commodity-name">${commodity.icon} ${commodity.name}</div>
                <div>Owned: ${ownedQty}</div>
            </div>
            <div class="price">${price}${priceIndicator}</div>
            <div class="buy-sell-buttons">
                <button onclick="window.gameInstance.buyCommodity('${key}', ${price})">Buy</button>
                <button onclick="window.gameInstance.sellCommodity('${key}', ${price})" ${ownedQty === 0 ? 'disabled' : ''}>Sell</button>
            </div>
        `;
        list.appendChild(row);
    }
}
export function updateShopPanel(ship, shopInventory) {
    if (!ship.currentPlanet) return;
    
    // Update credits display
    document.getElementById('shopCredits').textContent = ship.credits;
    
    // Build shop list
    const list = document.getElementById('shopList');
    list.innerHTML = '';
    
    // Only show items available at this planet
    const availableItems = ship.currentPlanet.shopItems || [];
    
    for (let itemId of availableItems) {
        const item = shopInventory[itemId];
        if (!item) continue;
        
        // Check if already purchased (for certain upgrades)
        let alreadyOwned = false;
        if (item.type === 'shield' && ship.maxShield >= item.value) {
            alreadyOwned = true;
        } else if (item.type === 'engine' && ship.engineLevel >= item.value) {
            alreadyOwned = true;
        }
        
        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';
        shopItem.innerHTML = `
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div style="font-size: 10px; color: #999;">${item.description}</div>
            </div>
            <div class="price">${item.price}</div>
            <button class="shop-buy-button" 
                    onclick="window.gameInstance.buyUpgrade('${itemId}')" 
                    ${alreadyOwned || ship.credits < item.price ? 'disabled' : ''}>
                ${alreadyOwned ? 'Owned' : 'Buy'}
            </button>
        `;
        list.appendChild(shopItem);
    }
    
    if (availableItems.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items available at this station</div>';
    }
}
export function drawPlanetVisual() {}
export function closeLandingOverlay(game) {
    document.getElementById('landingOverlay').style.display = 'none';
    game.paused = false;
    
    // Reset landing cooldown so player can land again
    if (window.ship) {
        window.ship.landingCooldown = 0;
    }
}
export function buyCommodity(type, price, ship, commodities) {
    const cargoUsed = ship.cargo.reduce((sum, item) => sum + item.quantity, 0);
    
    if (ship.credits < price) {
        const msg = document.createElement('div');
        msg.className = 'game-notification error';
        msg.textContent = 'INSUFFICIENT CREDITS';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
        return;
    }
    
    if (cargoUsed >= ship.cargoCapacity) {
        const msg = document.createElement('div');
        msg.className = 'game-notification error';
        msg.textContent = 'CARGO HOLD FULL';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
        return;
    }
    
    ship.credits -= price;
    
    const existing = ship.cargo.find(c => c.type === type);
    if (existing) {
        existing.quantity++;
    } else {
        ship.cargo.push({ type: type, quantity: 1 });
    }
    
    // Update the trading panel
    updateTradingPanel(ship, commodities);
}

export function sellCommodity(type, price, ship, commodities) {
    const cargo = ship.cargo.find(c => c.type === type);
    if (!cargo || cargo.quantity === 0) return;
    
    ship.credits += price;
    cargo.quantity--;
    
    // Remove cargo entry if quantity reaches 0
    if (cargo.quantity === 0) {
        const index = ship.cargo.indexOf(cargo);
        ship.cargo.splice(index, 1);
    }
    
    // Update the trading panel
    updateTradingPanel(ship, commodities);
}

export function sellAllCargo(ship, commodities) {
    if (!ship.currentPlanet || ship.cargo.length === 0) return;
    
    let totalEarned = 0;
    
    // Calculate total value and sell all cargo
    for (let item of ship.cargo) {
        const price = ship.currentPlanet.commodityPrices[item.type];
        totalEarned += item.quantity * price;
    }
    
    // Add credits and clear cargo
    ship.credits += totalEarned;
    ship.cargo = [];
    
    // Show feedback
    const msg = document.createElement('div');
    msg.className = 'game-notification success';
    msg.textContent = `CARGO SOLD: +${totalEarned} CREDITS`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
    
    // Update the trading panel
    updateTradingPanel(ship, commodities);
}
export function buyUpgrade(itemId, ship, shopInventory) {
    const item = shopInventory[itemId];
    if (!item) return;
    
    // Check if player can afford it
    if (ship.credits < item.price) {
        const msg = document.createElement('div');
        msg.className = 'game-notification error';
        msg.textContent = 'INSUFFICIENT CREDITS';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
        return;
    }
    
    // Process purchase based on item type
    if (item.type === 'weapon') {
        // Add weapon to arsenal
        ship.weapons.push(item.value);
        ship.currentWeapon = ship.weapons.length - 1; // Switch to new weapon
        
    } else if (item.type === 'shield') {
        // Upgrade shields
        ship.maxShield = item.value;
        ship.shield = item.value;
        
    } else if (item.type === 'engine') {
        // Upgrade engine
        ship.engineLevel = item.value;
        
        // Apply engine upgrades
        if (item.value === 2) {
            ship.thrust = 0.007 * 1.5;  // 50% boost
            ship.maxSpeed = 0.45 * 1.3; // 30% boost
        } else if (item.value === 3) {
            ship.thrust = 0.007 * 2;    // 100% boost
            ship.maxSpeed = 0.45 * 1.6; // 60% boost
        }
        
    } else if (item.type === 'cargo') {
        // Expand cargo capacity
        ship.cargoCapacity += item.value;
    }
    
    // Deduct credits
    ship.credits -= item.price;
    
    // Show purchase confirmation
    const msg = document.createElement('div');
    msg.className = 'game-notification success';
    msg.textContent = `PURCHASED: ${item.name.toUpperCase()}`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
    
    // Update shop display
    updateShopPanel(ship, shopInventory);
}

// Export SaveSystem
export { SaveSystem } from './saveSystem.js';

// Export TouchControls
export { TouchControls } from './touchControls.js';