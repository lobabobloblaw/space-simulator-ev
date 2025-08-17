#!/usr/bin/env node
const fs = require('fs');

// Read the file
const filePath = '/Users/alexvoigt/Documents/Claude/space-simulator-ev/docs/js/systems/allSystems.js';
let content = fs.readFileSync(filePath, 'utf8');

// Backup original
fs.writeFileSync(filePath + '.backup', content);

// Fix 1: Remove zigzag evasion and add proper flee behavior for pirates evading patrols
// This is within the pirate (aggressive) behavior section
const oldPatrolEvasion = `            // EVADE PATROL if one is nearby and pursuing
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
                }`;

const newPatrolEvasion = `            // EVADE PATROL if one is nearby and pursuing
            if (nearbyPatrol && nearbyPatrol.pursuing) {
                // Calculate escape vector
                const evadeX = npc.x - nearbyPatrol.x;
                const evadeY = npc.y - nearbyPatrol.y;
                desiredAngle = Math.atan2(evadeY, evadeX);  // Run away
                
                // Mark as fleeing for faster turning
                npc.isFleeing = true;
                
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Only thrust when facing the escape direction (tighter tolerance)
                if (Math.abs(angleDiff) < Math.PI / 6) {  // 30 degrees
                    shouldThrust = true;  // Full power escape!
                } else if (Math.abs(angleDiff) < Math.PI / 3) {  // 60 degrees
                    // Partial thrust while still turning
                    shouldThrust = true;
                    npc.thrustPower = 0.5;  // Half power
                } else {
                    // Just turn, don't thrust yet
                    shouldThrust = false;
                }`;

content = content.replace(oldPatrolEvasion, newPatrolEvasion);

// Fix 2: Improve passive NPC fleeing from player threats
const oldPassiveFlee = `            // Check for threats (only if player is alive)
            const playerIsAlive = !ship.isDestroyed;
            if (playerIsAlive && distToPlayer < 300 && (ship.weaponCooldown > 0 || projectiles.some(p => p.isPlayer))) {
                // Set flee direction if not already fleeing
                if (!npc.fleeDirection) {
                    npc.fleeDirection = Math.atan2(-dy, -dx);
                    npc.fleeTimer = 60; // Flee for 60 frames in this direction
                }
                desiredAngle = npc.fleeDirection;
                shouldThrust = true;
                fleeing = true;
            }`;

const newPassiveFlee = `            // Check for threats (only if player is alive)
            const playerIsAlive = !ship.isDestroyed;
            if (playerIsAlive && distToPlayer < 300 && (ship.weaponCooldown > 0 || projectiles.some(p => p.isPlayer))) {
                // Calculate escape direction away from threat
                desiredAngle = Math.atan2(-dy, -dx);
                fleeing = true;
                npc.isFleeing = true;
                
                // Check alignment before thrusting
                let angleDiff = desiredAngle - npc.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // Only thrust when properly aligned
                if (Math.abs(angleDiff) < Math.PI / 6) {  // 30 degrees
                    shouldThrust = true;
                } else {
                    shouldThrust = false;  // Turn first, then flee
                }
            }`;

content = content.replace(oldPassiveFlee, newPassiveFlee);

// Fix 3: Improve passive NPC fleeing from hostile NPCs
const oldHostileFlee = `            // Check for hostile NPCs nearby
            for (let other of npcShips) {
                if (other.behavior === "aggressive") {
                    const odx = other.x - npc.x;
                    const ody = other.y - npc.y;
                    const distToHostile = Math.sqrt(odx * odx + ody * ody);
                    if (distToHostile < 200) {
                        // Set flee direction if not already fleeing
                        if (!npc.fleeDirection) {
                            npc.fleeDirection = Math.atan2(-ody, -odx);
                            npc.fleeTimer = 60; // Flee for 60 frames in this direction
                        }
                        desiredAngle = npc.fleeDirection;
                        shouldThrust = true;
                        fleeing = true;
                        break;
                    }
                }
            }`;

const newHostileFlee = `            // Check for hostile NPCs nearby
            for (let other of npcShips) {
                if (other.behavior === "aggressive") {
                    const odx = other.x - npc.x;
                    const ody = other.y - npc.y;
                    const distToHostile = Math.sqrt(odx * odx + ody * ody);
                    if (distToHostile < 200) {
                        // Calculate escape direction
                        desiredAngle = Math.atan2(-ody, -odx);
                        fleeing = true;
                        npc.isFleeing = true;
                        
                        // Check alignment
                        let angleDiff = desiredAngle - npc.angle;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        // Only thrust when aligned
                        if (Math.abs(angleDiff) < Math.PI / 6) {
                            shouldThrust = true;
                        } else {
                            shouldThrust = false;
                        }
                        break;
                    }
                }
            }`;

content = content.replace(oldHostileFlee, newHostileFlee);

// Fix 4: Replace flee timer management with fleeing state clear
const oldFleeTimer = `            // Update flee timer and clear when done
            if (npc.fleeTimer) {
                npc.fleeTimer--;
                if (npc.fleeTimer <= 0) {
                    npc.fleeDirection = null;
                    npc.fleeTimer = 0;
                }
            }`;

const newFleeState = `            // Clear fleeing state when no threats
            if (!fleeing) {
                npc.isFleeing = false;
            }`;

content = content.replace(oldFleeTimer, newFleeState);

// Fix 5: Improve turning speed when fleeing
const oldTurnSpeed = `        if (Math.abs(angleDiff) > 0.01) {
            // Turn toward target, but respect turn speed limit
            // Slightly faster turning when fleeing for quick initial alignment
            const turnSpeed = npc.fleeTimer && npc.fleeTimer > 50 ? npc.turnSpeed * 1.5 : npc.turnSpeed;
            const turnAmount = Math.min(Math.abs(angleDiff), turnSpeed) * Math.sign(angleDiff);
            npc.angle += turnAmount;
        }`;

const newTurnSpeed = `        if (Math.abs(angleDiff) > 0.01) {
            // Turn toward target, but respect turn speed limit
            // Much faster turning when fleeing for quick escape
            const turnSpeed = npc.isFleeing ? npc.turnSpeed * 2.5 : npc.turnSpeed;
            const turnAmount = Math.min(Math.abs(angleDiff), turnSpeed) * Math.sign(angleDiff);
            npc.angle += turnAmount;
        }`;

content = content.replace(oldTurnSpeed, newTurnSpeed);

// Fix 6: Add thrust power management
const oldThrust = `        // Apply thrust/brake based on AI decision
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
        }`;

const newThrust = `        // Apply thrust/brake based on AI decision
        if (shouldThrust) {
            // Forward thrust - use reduced power if specified
            const thrustPower = npc.thrustPower || 1.0;
            const thrustX = Math.cos(npc.angle) * npc.thrust * thrustPower;
            const thrustY = Math.sin(npc.angle) * npc.thrust * thrustPower;
            npc.vx += thrustX;
            npc.vy += thrustY;
            npc.thrusting = true;
            npc.thrustPower = 1.0;  // Reset for next frame
        } else if (shouldBrake) {
            // Brake
            npc.vx *= 0.95;
            npc.vy *= 0.95;
        } else {
            npc.thrusting = false;
        }`;

content = content.replace(oldThrust, newThrust);

// Write the fixed content
fs.writeFileSync(filePath, content);

console.log('NPC flee behavior fixes applied successfully!');
console.log('Backup saved as allSystems.js.backup');
