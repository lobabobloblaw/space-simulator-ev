/**
 * Main entry point for Galaxy Trader
 * Full game with all features
 */

// Import all game data - MUST BE AT TOP FOR ES6 MODULES
import { 
    npcTypes, 
    commodities, 
    shopInventory,
    planets,
    missions
} from './data/gameData.js';

import {
    AudioSystem,
    createExplosion,
    updateExplosions,
    fireProjectile,
    updateProjectiles,
    updateNPCs,
    spawnNPC,
    updateAsteroids,
    updatePickups,
    checkLanding,
    updateShip,
    updateTutorialHint,
    updateHUD,
    showLandingOverlay,
    showPanel,
    updateTradingPanel,
    updateShopPanel,
    drawPlanetVisual,
    closeLandingOverlay,
    buyCommodity,
    sellCommodity,
    sellAllCargo,
    buyUpgrade
} from './systems/allSystems.js';

// Get canvas elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const planetCanvas = document.getElementById('planetCanvas');
const planetCtx = planetCanvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 100;

// Game state
const game = {
    camera: { x: 0, y: 0 },
    keys: {},
    paused: false
};

// Make game globally accessible
window.game = game;

// Minimap settings
const minimapScale = 0.018;
const minimapRange = 800;

// Player ship
const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    thrust: 0.004,
    maxSpeed: 0.45,
    fuel: 100,
    maxFuel: 100,
    credits: 250,
    tutorialStage: 'start',
    size: 8,
    isLanded: false,
    landedPlanet: null,
    landingCooldown: 0,
    class: "shuttle",
    health: 100,
    maxHealth: 100,
    weaponCooldown: 0,
    weaponSwitchPressed: false,
    kills: 0,
    cargo: [],
    cargoCapacity: 10,
    weapons: [],
    currentWeapon: 0,
    shield: 0,
    maxShield: 0,
    engineLevel: 1,
    weaponLevel: 1,
    currentPlanet: null
};

// Make ship globally accessible
window.ship = ship;

// Initialize collections
const npcShips = [];
const projectiles = [];
const explosions = [];
const pickups = [];
const asteroids = [];
const stars = { far: [], mid: [], near: [] };

// Make accessible for debugging
window.npcShips = npcShips;
window.projectiles = projectiles;

// Generate asteroids
for (let i = 0; i < 50; i++) {
    asteroids.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 8 + 2,
        color: "#666",
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        health: 20,
        maxHealth: 20,
        oreContent: Math.floor(Math.random() * 3) + 1
    });
}

// Generate stars
for (let i = 0; i < 500; i++) {
    stars.far.push({
        x: (Math.random() - 0.5) * 8000,
        y: (Math.random() - 0.5) * 8000,
        brightness: Math.random() * 0.6 + 0.2,
        size: Math.random() < 0.8 ? 1 : 2
    });
}

for (let i = 0; i < 200; i++) {
    stars.mid.push({
        x: (Math.random() - 0.5) * 6000,
        y: (Math.random() - 0.5) * 6000,
        brightness: Math.random() * 0.7 + 0.3,
        size: 1,
        twinkle: Math.random() * Math.PI * 2
    });
}

for (let i = 0; i < 100; i++) {
    stars.near.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        brightness: Math.random() * 0.8 + 0.4,
        size: Math.random() < 0.7 ? 1 : 2
    });
}

// NPC spawn management
const npcSpawnState = {
    nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
};

// Main game loop
const audioSystem = new AudioSystem();
audioSystem.init();

// Mission system
const missionSystem = {
    active: null,
    completed: [],
    available: missions,
    
    checkCompletion() {
        if (!this.active) return;
        
        if (this.active.isComplete()) {
            ship.credits += this.active.reward;
            this.completed.push(this.active.id);
            this.showMessage(`Mission Complete! +${this.active.reward} credits`);
            this.active = null;
            this.assignNext();
        }
    },
    
    assignNext() {
        for (let mission of this.available) {
            if (!this.completed.includes(mission.id)) {
                this.active = mission;
                this.showMessage(`New Mission: ${mission.title}`);
                break;
            }
        }
    },
    
    showMessage(text) {
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(74, 144, 226, 0.95);color:white;padding:10px 20px;border-radius:5px;font-family:Courier New;font-size:14px;z-index:100;';
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }
};

// Input handling
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
    
    if (game.paused && ship.isLanded) {
        if (e.code === 'Digit1') closeLandingOverlay();
        if (e.code === 'Digit2') showPanel('landing');
        if (e.code === 'Digit3') showPanel('trading');
        if (e.code === 'Digit4') showPanel('shop');
    }
    
    if (e.code === 'KeyM') {
        audioSystem.enabled = !audioSystem.enabled;
        const msg = document.createElement('div');
        msg.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.8);color:white;padding:5px 10px;border-radius:3px;font-family:Courier New;font-size:11px;';
        msg.textContent = audioSystem.enabled ? '🔊 Sound ON' : '🔇 Sound OFF';
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
    }
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});

// Window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 100;
});

// Main render function with full visual effects
function render() {
    // Clear canvas with subtle gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000011');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply camera transform
    ctx.translate(canvas.width / 2 - game.camera.x, canvas.height / 2 - game.camera.y);
    
    // Draw stars with parallax layers
    // Far stars (no parallax)
    for (let star of stars.far) {
        const screenX = star.x - game.camera.x * 0.1;  // Very slight parallax
        const screenY = star.y - game.camera.y * 0.1;
        
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, screenY, star.size, star.size);
    }
    
    // Mid stars (some parallax and twinkling)
    for (let star of stars.mid) {
        const screenX = star.x - game.camera.x * 0.3;  // More parallax
        const screenY = star.y - game.camera.y * 0.3;
        
        // Twinkling effect
        star.twinkle += 0.05;
        const twinkle = Math.sin(star.twinkle) * 0.3 + 0.7;
        
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, screenY, star.size, star.size);
    }
    
    // Near stars (more parallax)
    for (let star of stars.near) {
        const screenX = star.x - game.camera.x * 0.5;  // Maximum parallax
        const screenY = star.y - game.camera.y * 0.5;
        
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX, screenY, star.size, star.size);
    }
    
    ctx.globalAlpha = 1;
    
    // Draw planets with atmospheric glow
    for (let planet of planets) {
        // Atmospheric glow
        const glowGradient = ctx.createRadialGradient(
            planet.x, planet.y, planet.radius * 0.8,
            planet.x, planet.y, planet.radius * 1.5
        );
        glowGradient.addColorStop(0, planet.color + '44');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Planet body with gradient
        const planetGradient = ctx.createRadialGradient(
            planet.x - planet.radius * 0.3, 
            planet.y - planet.radius * 0.3, 
            0,
            planet.x, planet.y, planet.radius
        );
        planetGradient.addColorStop(0, planet.color);
        planetGradient.addColorStop(0.7, planet.color);
        planetGradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = planetGradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Planet ring/outline
        ctx.strokeStyle = planet.color + '88';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Planet name with glow
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, planet.x, planet.y - planet.radius - 15);
        ctx.shadowBlur = 0;
    }
    
    // Draw asteroids with rotation
    for (let asteroid of asteroids) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate((Date.now() * 0.001 * asteroid.rotationSpeed) % (Math.PI * 2));
        
        // Damaged asteroids are redder
        const damage = 1 - (asteroid.health / asteroid.maxHealth);
        const r = 102 + Math.floor(damage * 100);
        ctx.fillStyle = `rgb(${r}, 102, 102)`;
        
        // Irregular asteroid shape
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const variance = 0.8 + Math.sin(i * 1.5) * 0.2;
            const r = asteroid.radius * variance;
            if (i === 0) {
                ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            } else {
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // Draw pickups with glow effect
    for (let pickup of pickups) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        
        // Glow
        const glowGradient = ctx.createRadialGradient(
            pickup.x, pickup.y, 0,
            pickup.x, pickup.y, 15
        );
        
        if (pickup.type === 'ore') {
            glowGradient.addColorStop(0, 'rgba(136, 136, 136, 0.8)');
            glowGradient.addColorStop(1, 'transparent');
        } else {
            glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            glowGradient.addColorStop(1, 'transparent');
        }
        
        ctx.globalAlpha = pulse;
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.globalAlpha = 1;
        ctx.fillStyle = pickup.type === 'ore' ? '#888' : '#ffd700';
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw NPCs with engine effects
    for (let npc of npcShips) {
        ctx.save();
        ctx.translate(npc.x, npc.y);
        ctx.rotate(npc.angle);
        
        // Engine thrust effect
        if (npc.thrusting) {
            const flicker = Math.random();
            const thrustGradient = ctx.createLinearGradient(
                -npc.size - 10, 0,
                -npc.size, 0
            );
            thrustGradient.addColorStop(0, 'transparent');
            thrustGradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.5 * flicker})`);
            thrustGradient.addColorStop(1, `rgba(255, 200, 0, ${0.8 * flicker})`);
            
            ctx.fillStyle = thrustGradient;
            ctx.beginPath();
            ctx.moveTo(-npc.size - 10 - Math.random() * 5, 0);
            ctx.lineTo(-npc.size, -3);
            ctx.lineTo(-npc.size, 3);
            ctx.closePath();
            ctx.fill();
        }
        
        // Ship body with gradient
        const shipGradient = ctx.createLinearGradient(
            npc.size, 0, -npc.size, 0
        );
        shipGradient.addColorStop(0, npc.color);
        shipGradient.addColorStop(0.5, npc.color);
        shipGradient.addColorStop(1, '#000000');
        
        ctx.fillStyle = shipGradient;
        ctx.strokeStyle = npc.color;
        ctx.lineWidth = 1;
        
        // Draw different ship shapes based on type
        ctx.beginPath();
        
        if (npc.type === 'freighter') {
            // HUGE rectangular freighter with cargo pods
            const width = npc.size * 1.3;
            const height = npc.size * 0.7;
            
            // Main body - massive rectangular hull
            ctx.fillRect(-width, -height, width * 2, height * 2);
            
            // Cargo pods (boxes along the sides)
            ctx.fillStyle = npc.color + '88';
            for (let i = 0; i < 5; i++) {
                const podX = -width * 0.8 + (i * width * 0.4);
                ctx.fillRect(podX, -height * 1.2, width * 0.3, height * 0.3);
                ctx.fillRect(podX, height * 0.9, width * 0.3, height * 0.3);
            }
            
            // Engine blocks at rear
            ctx.fillStyle = '#333';
            ctx.fillRect(-width - 4, -height * 0.5, 4, height * 0.3);
            ctx.fillRect(-width - 4, height * 0.2, 4, height * 0.3);
            
            // Bridge window
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fillRect(width * 0.7, -2, 6, 4);
            
        } else if (npc.type === 'pirate') {
            // Angular aggressive fighter with weapon pods
            // Triple-arrow design
            ctx.moveTo(npc.size * 1.2, 0);
            ctx.lineTo(npc.size * 0.6, -npc.size * 0.4);
            ctx.lineTo(npc.size * 0.3, -npc.size * 0.3);
            ctx.lineTo(-npc.size * 0.5, -npc.size * 0.7);
            ctx.lineTo(-npc.size * 0.8, -npc.size * 0.4);
            ctx.lineTo(-npc.size * 0.7, 0);
            ctx.lineTo(-npc.size * 0.8, npc.size * 0.4);
            ctx.lineTo(-npc.size * 0.5, npc.size * 0.7);
            ctx.lineTo(npc.size * 0.3, npc.size * 0.3);
            ctx.lineTo(npc.size * 0.6, npc.size * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Weapon pods
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(npc.size * 0.2, -npc.size * 0.5, 3, 3);
            ctx.fillRect(npc.size * 0.2, npc.size * 0.5 - 3, 3, 3);
            
            // Cockpit
            ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
            ctx.fillRect(npc.size * 0.5, -2, 4, 4);
            
        } else if (npc.type === 'patrol') {
            // Military patrol ship with wide wings
            // Wide wing span
            const wingSpan = npc.size * 1.2;
            
            // Main fuselage
            ctx.moveTo(npc.size, 0);
            ctx.lineTo(0, -npc.size * 0.3);
            ctx.lineTo(-npc.size * 0.7, -npc.size * 0.2);
            ctx.lineTo(-npc.size * 0.7, npc.size * 0.2);
            ctx.lineTo(0, npc.size * 0.3);
            ctx.closePath();
            ctx.fill();
            
            // Wide wings
            ctx.fillRect(-npc.size * 0.4, -wingSpan, npc.size * 0.8, wingSpan * 2);
            
            // Wing tips
            ctx.beginPath();
            ctx.moveTo(npc.size * 0.4, -wingSpan);
            ctx.lineTo(npc.size * 0.7, -wingSpan * 0.8);
            ctx.lineTo(npc.size * 0.4, -wingSpan * 0.6);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(npc.size * 0.4, wingSpan);
            ctx.lineTo(npc.size * 0.7, wingSpan * 0.8);
            ctx.lineTo(npc.size * 0.4, wingSpan * 0.6);
            ctx.closePath();
            ctx.fill();
            
            // Twin engines
            ctx.fillStyle = '#444';
            ctx.fillRect(-npc.size * 0.9, -wingSpan * 0.5, 4, 6);
            ctx.fillRect(-npc.size * 0.9, wingSpan * 0.5 - 6, 4, 6);
            
            // Military markings
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -wingSpan * 0.3);
            ctx.lineTo(0, wingSpan * 0.3);
            ctx.stroke();
            
            // Cockpit
            ctx.fillStyle = 'rgba(50, 150, 255, 0.6)';
            ctx.fillRect(npc.size * 0.3, -3, 5, 6);
            
        } else if (npc.type === 'trader') {
            // Rounded bulbous trader vessel
            // Rounded hull using curves
            const width = npc.size * 0.8;
            const height = npc.size * 0.6;
            
            // Main rounded body
            ctx.arc(0, 0, npc.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            
            // Cargo bulge
            ctx.beginPath();
            ctx.ellipse(-npc.size * 0.2, 0, npc.size * 0.6, npc.size * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Engine pods
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(-npc.size * 0.8, -npc.size * 0.4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-npc.size * 0.8, npc.size * 0.4, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Viewports
            ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
            for (let i = 0; i < 3; i++) {
                const angle = -Math.PI * 0.2 + (i * Math.PI * 0.2);
                const x = Math.cos(angle) * npc.size * 0.5;
                const y = Math.sin(angle) * npc.size * 0.5;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
        } else {
            // Default V-shape for any undefined types
            ctx.moveTo(npc.size, 0);
            ctx.lineTo(-npc.size * 0.7, -npc.size * 0.6);
            ctx.lineTo(-npc.size * 0.4, -npc.size * 0.3);
            ctx.lineTo(-npc.size * 0.6, 0);
            ctx.lineTo(-npc.size * 0.4, npc.size * 0.3);
            ctx.lineTo(-npc.size * 0.7, npc.size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Cockpit window
            ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
            ctx.fillRect(npc.size * 0.3, -2, 4, 4);
        }
        
        ctx.restore();
        
        // Health bar for damaged NPCs
        if (npc.health < npc.maxHealth) {
            const barWidth = 30;
            const barHeight = 3;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(npc.x - barWidth/2, npc.y - npc.size - 10, barWidth, barHeight);
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(npc.x - barWidth/2, npc.y - npc.size - 10, 
                        barWidth * (npc.health / npc.maxHealth), barHeight);
        }
    }
    
    // Draw projectiles with trails
    for (let proj of projectiles) {
        // Trail effect
        const trailGradient = ctx.createLinearGradient(
            proj.x - proj.vx * 5, proj.y - proj.vy * 5,
            proj.x, proj.y
        );
        
        // Color based on weapon type
        let color = '#ffff00';
        if (proj.type === 'plasma') {
            color = '#00ffff';
        } else if (proj.type === 'rapid') {
            color = '#ff8800';
        } else if (proj.type === 'mining') {
            color = '#888888';
        }
        
        trailGradient.addColorStop(0, 'transparent');
        trailGradient.addColorStop(1, color);
        
        ctx.strokeStyle = trailGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(proj.x - proj.vx * 5, proj.y - proj.vy * 5);
        ctx.lineTo(proj.x, proj.y);
        ctx.stroke();
        
        // Projectile core with glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.type === 'plasma' ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    // Draw explosions with better effects
    for (let exp of explosions) {
        const progress = exp.lifetime / exp.maxLifetime;
        const radius = exp.radius + (exp.maxRadius - exp.radius) * progress;
        
        // Multiple explosion rings
        for (let i = 0; i < 3; i++) {
            const ringProgress = Math.max(0, progress - i * 0.1);
            const ringRadius = radius * (1 - i * 0.2);
            const alpha = (1 - ringProgress) * (1 - i * 0.3);
            
            const gradient = ctx.createRadialGradient(
                exp.x, exp.y, ringRadius * 0.5,
                exp.x, exp.y, ringRadius
            );
            gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
            gradient.addColorStop(0.3, `rgba(255, 150, 0, ${alpha * 0.8})`);
            gradient.addColorStop(0.7, `rgba(255, 50, 0, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Explosion sparks
        if (progress < 0.5) {
            ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress * 2})`;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const dist = radius * 1.5 * progress;
                const sparkX = exp.x + Math.cos(angle) * dist;
                const sparkY = exp.y + Math.sin(angle) * dist;
                ctx.fillRect(sparkX - 1, sparkY - 1, 2, 2);
            }
        }
    }
    
    // Draw player ship with detailed effects
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    
    // Engine thrust effect
    if (game.keys['KeyW'] || game.keys['ArrowUp']) {
        const flicker = Math.random();
        const thrustGradient = ctx.createLinearGradient(
            -ship.size - 15, 0,
            -ship.size, 0
        );
        thrustGradient.addColorStop(0, 'transparent');
        thrustGradient.addColorStop(0.4, `rgba(100, 150, 255, ${0.3 * flicker})`);
        thrustGradient.addColorStop(0.7, `rgba(150, 200, 255, ${0.6 * flicker})`);
        thrustGradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * flicker})`);
        
        ctx.fillStyle = thrustGradient;
        ctx.beginPath();
        ctx.moveTo(-ship.size - 15 - Math.random() * 7, 0);
        ctx.lineTo(-ship.size, -4);
        ctx.lineTo(-ship.size, 4);
        ctx.closePath();
        ctx.fill();
    }
    
    // Shield effect
    if (ship.shield > 0) {
        const shieldAlpha = Math.min(0.3, ship.shield / ship.maxShield);
        const shieldGradient = ctx.createRadialGradient(
            0, 0, ship.size,
            0, 0, ship.size * 2
        );
        shieldGradient.addColorStop(0, `rgba(0, 200, 255, ${shieldAlpha})`);
        shieldGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(0, 0, ship.size * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Ship body with metallic gradient
    const shipGradient = ctx.createLinearGradient(
        ship.size, 0, -ship.size, 0
    );
    shipGradient.addColorStop(0, '#ffffff');
    shipGradient.addColorStop(0.3, '#dddddd');
    shipGradient.addColorStop(0.7, '#888888');
    shipGradient.addColorStop(1, '#444444');
    
    ctx.fillStyle = shipGradient;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    // Detailed ship shape
    ctx.beginPath();
    ctx.moveTo(ship.size * 1.2, 0);
    ctx.lineTo(-ship.size * 0.6, -ship.size * 0.7);
    ctx.lineTo(-ship.size * 0.3, -ship.size * 0.4);
    ctx.lineTo(-ship.size * 0.5, 0);
    ctx.lineTo(-ship.size * 0.3, ship.size * 0.4);
    ctx.lineTo(-ship.size * 0.6, ship.size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Cockpit
    ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.fillRect(ship.size * 0.4, -3, 5, 6);
    
    // Weapon indicators
    if (ship.weapons.length > 0) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ship.size * 0.8, -2, 2, 4);
    }
    
    ctx.restore();
    
    // Health indicator for damaged player
    if (ship.health < ship.maxHealth) {
        const barWidth = 40;
        const barHeight = 4;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(ship.x - barWidth/2, ship.y - ship.size - 15, barWidth, barHeight);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(ship.x - barWidth/2, ship.y - ship.size - 15, 
                    barWidth * (ship.health / ship.maxHealth), barHeight);
    }
    
    // Restore context
    ctx.restore();
    
    // Draw minimap
    renderMinimap();
}

function renderMinimap() {
    const centerX = 37.5;
    const centerY = 37.5;
    
    // Clear minimap
    minimapCtx.clearRect(0, 0, 75, 75);
    
    // Draw planets on minimap
    minimapCtx.fillStyle = '#44f';
    for (let planet of planets) {
        const dx = (planet.x - ship.x) * minimapScale;
        const dy = (planet.y - ship.y) * minimapScale;
        if (Math.abs(dx) < 37 && Math.abs(dy) < 37) {
            minimapCtx.beginPath();
            minimapCtx.arc(centerX + dx, centerY + dy, 2, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    }
    
    // Draw NPCs on minimap
    for (let npc of npcShips) {
        const dx = (npc.x - ship.x) * minimapScale;
        const dy = (npc.y - ship.y) * minimapScale;
        if (Math.abs(dx) < 37 && Math.abs(dy) < 37) {
            minimapCtx.fillStyle = npc.behavior === 'aggressive' ? '#f44' : '#888';
            minimapCtx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
        }
    }
    
    // Draw player at center
    minimapCtx.fillStyle = '#0f0';
    minimapCtx.fillRect(centerX - 1, centerY - 1, 2, 2);
}

// Main game loop
function gameLoop() {
    if (!game.paused) {
        // Update game state
        game.camera.x = ship.x;
        game.camera.y = ship.y;
        
        // Update ship
        updateShip(ship, game, audioSystem, projectiles, pickups, explosions);
        
        // Check for landing
        if (game.keys['KeyL']) {
            checkLanding(ship, planets, audioSystem, npcShips, projectiles, explosions, game);
        }
        
        // Update NPCs
        updateNPCs(npcShips, ship, planets, projectiles, audioSystem, npcTypes, npcSpawnState);
        
        // Update projectiles
        updateProjectiles(projectiles, ship, npcShips, asteroids, explosions, audioSystem);
        
        // Update explosions
        updateExplosions(explosions);
        
        // Update asteroids
        updateAsteroids(asteroids, ship, pickups, explosions);
        
        // Update pickups
        updatePickups(pickups, ship, audioSystem, explosions);
        
        // Check mission completion
        missionSystem.checkCompletion();
        
        // Update tutorial
        updateTutorialHint(ship);
    }
    
    // Always render
    render();
    
    // Update HUD
    updateHUD(ship);
    
    requestAnimationFrame(gameLoop);
}

// Wire up UI functions
window.closeLandingOverlay = () => closeLandingOverlay(game);
window.showPanel = (panel) => showPanel(panel, ship, updateTradingPanel, updateShopPanel);
window.buyCommodity = (type, price) => buyCommodity(type, price, ship, updateTradingPanel);
window.sellCommodity = (type, price) => sellCommodity(type, price, ship, updateTradingPanel);
window.sellAllCargo = () => sellAllCargo(ship, updateTradingPanel);
window.buyUpgrade = (itemId) => buyUpgrade(itemId, ship, shopInventory, updateShopPanel);

// Wire up landing buttons
document.getElementById('departBtn').onclick = () => closeLandingOverlay(game);
document.getElementById('stationBtn').onclick = () => showPanel('landing', ship, updateTradingPanel, updateShopPanel);
document.getElementById('tradeBtn').onclick = () => showPanel('trading', ship, updateTradingPanel, updateShopPanel);
document.getElementById('outfitterBtn').onclick = () => showPanel('shop', ship, updateTradingPanel, updateShopPanel);

// Start first mission
missionSystem.assignNext();

// Start the game
console.log('Galaxy Trader initialized!');
gameLoop();