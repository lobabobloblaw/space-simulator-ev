/**
 * Main entry point for Galaxy Trader
 * Full game with all features
 */

// Log initialization
console.log('[main.js] Loading game code...');

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
    createWarpEffect,
    updateWarpEffects,
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
    buyUpgrade,
    SaveSystem,
    TouchControls
} from './systems/allSystems.js';

import { ProceduralPlanetRenderer } from './systems/proceduralPlanetRenderer.js';

// Get canvas elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const minimapCtx = minimapCanvas.getContext('2d');
const planetCanvas = document.getElementById('planetCanvas');
const planetCtx = planetCanvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 150;  // HUD height (110px) + padding (40px)

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
const warpEffects = [];
const pickups = [];
const asteroids = [];
const stars = { far: [], mid: [], near: [] };

// Make accessible for debugging
window.npcShips = npcShips;
window.projectiles = projectiles;
window.warpEffects = warpEffects;
window.explosions = explosions;
window.pickups = pickups;
window.planets = planets;
window.checkLanding = checkLanding;
// window.audioSystem will be set after initialization

// Generate asteroids
for (let i = 0; i < 50; i++) {
    // Generate unique shape for each asteroid
    const shapePoints = [];
    for (let j = 0; j < 8; j++) {
        shapePoints.push(0.7 + Math.random() * 0.6); // Random variance between 0.7 and 1.3
    }
    
    asteroids.push({
        x: (Math.random() - 0.5) * 4000,
        y: (Math.random() - 0.5) * 4000,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 8 + 2,
        color: "#666",
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotation: Math.random() * Math.PI * 2,
        health: 20,
        maxHealth: 20,
        oreContent: Math.floor(Math.random() * 3) + 1,
        shapePoints: shapePoints  // Store unique shape
    });
}

// Generate stars - MASSIVE expansive star field
for (let i = 0; i < 3000; i++) {  // Lots of distant stars
    stars.far.push({
        x: (Math.random() - 0.5) * 12000,  // Wider distribution
        y: (Math.random() - 0.5) * 12000,
        brightness: Math.random() * 0.5 + 0.3,
        size: Math.random() < 0.95 ? 1 : 2,  // Mostly small points
        color: Math.random() < 0.94 ? '#ffffff' : 
               Math.random() < 0.5 ? '#ffeeee' :  // Slight red tint
               Math.random() < 0.7 ? '#eeeeff' :  // Slight blue tint
               '#ffffee'  // Slight yellow tint
    });
}

for (let i = 0; i < 1200; i++) {  // Many mid-range stars
    stars.mid.push({
        x: (Math.random() - 0.5) * 8000,
        y: (Math.random() - 0.5) * 8000,
        brightness: Math.random() * 0.6 + 0.4,
        size: Math.random() < 0.9 ? 1 : 2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.03,  // Much slower twinkle
        color: Math.random() < 0.92 ? '#ffffff' : 
               Math.random() < 0.6 ? '#ffeeee' : '#eeeeff'
    });
}

for (let i = 0; i < 600; i++) {  // More near stars
    stars.near.push({
        x: (Math.random() - 0.5) * 6000,
        y: (Math.random() - 0.5) * 6000,
        brightness: Math.random() * 0.7 + 0.5,
        size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
        color: '#ffffff'
    });
}

// NPC spawn management
const npcSpawnState = {
    nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
};

// Main game loop
const audioSystem = new AudioSystem();
audioSystem.init();
window.audioSystem = audioSystem;  // Now make it accessible

// Initialize planet renderer
const planetRenderer = new ProceduralPlanetRenderer();
planetRenderer.initializePlanets(planets);

// Initialize save system
const saveSystem = new SaveSystem();

// Initialize touch controls for mobile devices
const touchControls = new TouchControls(game, ship, canvas);
window.touchControls = touchControls;  // Make accessible for debugging

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
        msg.className = 'game-notification info';
        msg.textContent = text;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 3000);
    }
};

// Input handling
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
    
    if (game.paused && ship.isLanded) {
        if (e.code === 'Digit1') closeLandingOverlay(game);
        if (e.code === 'Digit2') showPanel('landing', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
        if (e.code === 'Digit3') showPanel('trading', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
        if (e.code === 'Digit4') showPanel('shop', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
    }
    
    // Save game (KeyS when not typing)
    if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !game.paused) {
        saveSystem.saveGame(ship, game, missionSystem, npcShips, asteroids, pickups);
    }
    
    // Load game (KeyO for Open save)
    if (e.code === 'KeyO' && !game.paused) {
        if (saveSystem.loadGame(ship, game, missionSystem, missions, npcShips, asteroids, pickups)) {
            // Reset camera after load
            game.camera.x = ship.x;
            game.camera.y = ship.y;
        }
    }
    
    if (e.code === 'KeyM') {
        audioSystem.enabled = !audioSystem.enabled;
        const msg = document.createElement('div');
        msg.className = 'game-notification info';
        msg.textContent = audioSystem.enabled ? 'SOUND: ENABLED' : 'SOUND: DISABLED';
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
    canvas.height = window.innerHeight - 150;  // HUD height (110px) + padding (40px)
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
    
    // Draw nebula clouds in deep background for atmosphere
    ctx.globalAlpha = 0.03;
    const nebulaGradient1 = ctx.createRadialGradient(
        -game.camera.x * 0.05 + 200, -game.camera.y * 0.05 - 300, 100,
        -game.camera.x * 0.05 + 200, -game.camera.y * 0.05 - 300, 600
    );
    nebulaGradient1.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
    nebulaGradient1.addColorStop(0.5, 'rgba(100, 50, 200, 0.2)');
    nebulaGradient1.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient1;
    ctx.fillRect(-2000, -2000, 4000, 4000);
    
    const nebulaGradient2 = ctx.createRadialGradient(
        -game.camera.x * 0.05 - 500, -game.camera.y * 0.05 + 400, 150,
        -game.camera.x * 0.05 - 500, -game.camera.y * 0.05 + 400, 800
    );
    nebulaGradient2.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
    nebulaGradient2.addColorStop(0.5, 'rgba(50, 100, 200, 0.15)');
    nebulaGradient2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient2;
    ctx.fillRect(-2000, -2000, 4000, 4000);
    
    // Draw stars with enhanced parallax layers
    // Far stars (minimal parallax) - like distant galaxies
    for (let star of stars.far) {
        const screenX = star.x - game.camera.x * 0.05;  // Even less parallax for depth
        const screenY = star.y - game.camera.y * 0.05;
        
        // Wrap stars around for infinite field
        const wrappedX = ((screenX + 6000) % 12000) - 6000;
        const wrappedY = ((screenY + 6000) % 12000) - 6000;
        
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = star.color || '#ffffff';
        
        if (star.size > 2) {
            // Draw larger stars with a subtle glow
            ctx.shadowColor = star.color || '#ffffff';
            ctx.shadowBlur = star.size;
            ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
        }
    }
    
    // Mid stars (moderate parallax and twinkling)
    for (let star of stars.mid) {
        const screenX = star.x - game.camera.x * 0.2;  // Adjusted parallax
        const screenY = star.y - game.camera.y * 0.2;
        
        // Wrap stars
        const wrappedX = ((screenX + 4000) % 8000) - 4000;
        const wrappedY = ((screenY + 4000) % 8000) - 4000;
        
        // Very subtle twinkling effect
        star.twinkle += star.twinkleSpeed || 0.02;
        const twinkle = Math.sin(star.twinkle) * 0.1 + 0.9;  // Only varies between 0.8 and 1.0
        
        ctx.globalAlpha = star.brightness * twinkle;
        ctx.fillStyle = star.color || '#ffffff';
        ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
    }
    
    // Near stars (maximum parallax) - foreground stars
    for (let star of stars.near) {
        const screenX = star.x - game.camera.x * 0.4;  // Strong parallax
        const screenY = star.y - game.camera.y * 0.4;
        
        // Wrap stars
        const wrappedX = ((screenX + 3000) % 6000) - 3000;
        const wrappedY = ((screenY + 3000) % 6000) - 3000;
        
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = star.color || '#ffffff';
        
        if (star.size > 1) {
            // Subtle glow for brighter near stars
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 2;
            ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            ctx.shadowBlur = 0;
        } else {
            ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
        }
    }
    
    ctx.globalAlpha = 1;
    
    // Draw planets with advanced rendering system
    for (let planet of planets) {
        // Use the new planet renderer
        planetRenderer.renderPlanet(ctx, planet, Date.now());
        
        // Planet name with enhanced visibility
        ctx.save();
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, planet.radius / 8)}px 'Orbitron', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(planet.name.toUpperCase(), planet.x, planet.y - planet.radius - 25);
        
        // Distance indicator when nearby
        const dx = ship.x - planet.x;
        const dy = ship.y - planet.y;
        const distToPlanet = Math.sqrt(dx * dx + dy * dy);
        
        if (distToPlanet < planet.radius * 3 && distToPlanet > planet.radius + 50) {
            ctx.shadowBlur = 5;
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillStyle = planet.color;
            const displayDist = Math.round(distToPlanet - planet.radius);
            ctx.fillText(`[ ${displayDist} ]`, planet.x, planet.y - planet.radius - 10);
        }
        
        ctx.shadowBlur = 0;
        ctx.restore();
    }
    
    // Draw asteroids with rotation
    for (let asteroid of asteroids) {
        ctx.save();
        ctx.translate(asteroid.x, asteroid.y);
        
        // Use stored rotation or calculate if missing
        if (!asteroid.rotation) asteroid.rotation = 0;
        asteroid.rotation += asteroid.rotationSpeed;
        ctx.rotate(asteroid.rotation);
        
        // Damaged asteroids are redder
        const damage = 1 - (asteroid.health / asteroid.maxHealth);
        const r = 102 + Math.floor(damage * 100);
        ctx.fillStyle = `rgb(${r}, 102, 102)`;
        ctx.strokeStyle = `rgb(${Math.min(r + 30, 255)}, 102, 102)`;
        ctx.lineWidth = 1;
        
        // Irregular asteroid shape using stored points or generate if missing
        if (!asteroid.shapePoints) {
            asteroid.shapePoints = [];
            for (let j = 0; j < 8; j++) {
                asteroid.shapePoints.push(0.7 + Math.random() * 0.6);
            }
        }
        
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const variance = asteroid.shapePoints[i];
            const r = asteroid.radius * variance;
            if (i === 0) {
                ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            } else {
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();  // Add outline for better definition
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
    
    // Draw warp effects
    for (let effect of warpEffects) {
        const progress = effect.lifetime / effect.maxLifetime;
        
        if (effect.type === 'arrive') {
            // Hyperspace arrival - expanding blue-white flash
            const radius = 5 + (60 * (1 - progress));
            const alpha = (1 - progress) * 0.8;
            
            // Space distortion effect
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius * 1.5, 0, Math.PI * 2);
            ctx.stroke();
            
            // Bright flash
            const flashGradient = ctx.createRadialGradient(
                effect.x, effect.y, 0,
                effect.x, effect.y, radius
            );
            flashGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            flashGradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.7})`);
            flashGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = flashGradient;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Light streaks
            if (progress < 0.3) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress * 3) * 0.5})`;
                ctx.lineWidth = 1;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i;
                    ctx.beginPath();
                    ctx.moveTo(effect.x, effect.y);
                    ctx.lineTo(
                        effect.x + Math.cos(angle) * radius * 3,
                        effect.y + Math.sin(angle) * radius * 3
                    );
                    ctx.stroke();
                }
            }
            
        } else if (effect.type === 'depart') {
            // Hyperspace departure - collapsing blue flash
            const radius = 60 * progress;
            const alpha = (1 - progress) * 0.8;
            
            // Collapsing ring
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Center flash
            if (progress > 0.7) {
                const flashAlpha = (progress - 0.7) * 3;
                ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 10 * (1 - progress), 0, Math.PI * 2);
                ctx.fill();
            }
            
        } else if (effect.type === 'land') {
            // Landing at planet - descending dust cloud
            const alpha = (1 - progress) * 0.6;
            
            // Dust cloud
            for (let i = 0; i < 5; i++) {
                const cloudX = effect.x + (Math.random() - 0.5) * 30;
                const cloudY = effect.y + progress * 20;
                const size = 10 + i * 3;
                
                ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(cloudX, cloudY, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Landing light
            ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.5})`;
            ctx.fillRect(effect.x - 2, effect.y - 30 + progress * 30, 4, 20);
            
        } else if (effect.type === 'takeoff') {
            // Takeoff from planet - ascending thrust plume
            const alpha = (1 - progress) * 0.8;
            
            // Thrust plume
            const plumeGradient = ctx.createLinearGradient(
                effect.x, effect.y,
                effect.x, effect.y + 40
            );
            plumeGradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
            plumeGradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.6})`);
            plumeGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = plumeGradient;
            ctx.beginPath();
            ctx.moveTo(effect.x - 5, effect.y);
            ctx.lineTo(effect.x + 5, effect.y);
            ctx.lineTo(effect.x + 8, effect.y + 40);
            ctx.lineTo(effect.x - 8, effect.y + 40);
            ctx.closePath();
            ctx.fill();
            
            // Smoke rings
            for (let i = 0; i < 3; i++) {
                const ringY = effect.y + 10 + i * 10 + progress * 20;
                const ringSize = 5 + i * 3 + progress * 10;
                ctx.strokeStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(effect.x, ringY, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }
    
    // Draw player ship with detailed effects (only if not destroyed)
    if (!ship.isDestroyed) {
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
    }
    
    // Health indicator for damaged player (only if not destroyed)
    if (!ship.isDestroyed && ship.health < ship.maxHealth) {
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
    
    // Draw touch controls on top of everything
    touchControls.render();
}

function renderMinimap() {
    const centerX = 50;  // Center of 100x100 canvas
    const centerY = 50;
    const maxRadius = 45;  // Stay within circle bounds
    
    // Clear minimap with dark background
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    minimapCtx.fillRect(0, 0, 100, 100);
    
    // Draw range circles (radar style)
    minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    minimapCtx.lineWidth = 1;
    for (let r = 15; r <= 45; r += 15) {
        minimapCtx.beginPath();
        minimapCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
        minimapCtx.stroke();
    }
    
    // Draw planets on minimap (white)
    minimapCtx.fillStyle = '#ffffff';
    minimapCtx.shadowColor = '#ffffff';
    minimapCtx.shadowBlur = 3;
    for (let planet of planets) {
        const dx = (planet.x - ship.x) * minimapScale;
        const dy = (planet.y - ship.y) * minimapScale;
        if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
            minimapCtx.beginPath();
            minimapCtx.arc(centerX + dx, centerY + dy, 3, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    }
    minimapCtx.shadowBlur = 0;
    
    // Draw NPCs on minimap (white)
    minimapCtx.fillStyle = '#ffffff';
    for (let npc of npcShips) {
        const dx = (npc.x - ship.x) * minimapScale;
        const dy = (npc.y - ship.y) * minimapScale;
        if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
            minimapCtx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
        }
    }
    
    // Draw player at center with direction indicator (bright white)
    minimapCtx.save();
    minimapCtx.translate(centerX, centerY);
    minimapCtx.rotate(ship.angle);
    minimapCtx.fillStyle = '#ffffff';
    minimapCtx.shadowColor = '#ffffff';
    minimapCtx.shadowBlur = 5;
    minimapCtx.beginPath();
    minimapCtx.moveTo(4, 0);
    minimapCtx.lineTo(-2, -2);
    minimapCtx.lineTo(-2, 2);
    minimapCtx.closePath();
    minimapCtx.fill();
    minimapCtx.restore();
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
            checkLanding(ship, planets, audioSystem, npcShips, projectiles, explosions, game, warpEffects);
        }
        
        // Update NPCs
        updateNPCs(npcShips, ship, planets, projectiles, audioSystem, npcTypes, npcSpawnState, warpEffects);
        
        // Update projectiles
        updateProjectiles(projectiles, ship, npcShips, asteroids, explosions, audioSystem);
        
        // Update explosions
        updateExplosions(explosions);
        
        // Update warp effects
        updateWarpEffects(warpEffects);
        
        // Update asteroids
        updateAsteroids(asteroids, ship, pickups, explosions);
        
        // Update pickups
        updatePickups(pickups, ship, audioSystem, explosions);
        
        // Check mission completion
        missionSystem.checkCompletion();
        
        // Update tutorial
        updateTutorialHint(ship);
        
        // Update touch controls
        touchControls.update();
    }
    
    // Always render
    render();
    
    // Update HUD
    updateHUD(ship);
    
    requestAnimationFrame(gameLoop);
}

// Wire up UI functions
window.closeLandingOverlay = () => closeLandingOverlay(game);
window.showPanel = (panel) => showPanel(panel, ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
window.buyCommodity = (type, price) => buyCommodity(type, price, ship, commodities);
window.sellCommodity = (type, price) => sellCommodity(type, price, ship, commodities);
window.sellAllCargo = () => sellAllCargo(ship, commodities);
window.buyUpgrade = (itemId) => buyUpgrade(itemId, ship, shopInventory, updateShopPanel);
window.drawPlanetVisual = drawPlanetVisual;

// Create a game instance object for easier access
window.gameInstance = {
    closeLandingOverlay: () => closeLandingOverlay(game),
    showPanel: (panel) => showPanel(panel, ship, updateTradingPanel, updateShopPanel, commodities, shopInventory),
    buyCommodity: (type, price) => buyCommodity(type, price, ship, commodities),
    sellCommodity: (type, price) => sellCommodity(type, price, ship, commodities),
    sellAllCargo: () => sellAllCargo(ship, commodities),
    buyUpgrade: (itemId) => buyUpgrade(itemId, ship, shopInventory, updateShopPanel)
};

// Wire up landing buttons
document.getElementById('departBtn').onclick = () => closeLandingOverlay(game);
document.getElementById('stationBtn').onclick = () => showPanel('landing', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
document.getElementById('tradeBtn').onclick = () => showPanel('trading', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);
document.getElementById('outfitterBtn').onclick = () => showPanel('shop', ship, updateTradingPanel, updateShopPanel, commodities, shopInventory);

// Start first mission
missionSystem.assignNext();

// Check for existing save on startup
if (saveSystem.hasSave()) {
    // Show load prompt
    const loadPrompt = document.createElement('div');
    loadPrompt.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #141414;
        border: 1px solid rgba(0, 255, 255, 0.3);
        padding: 32px;
        z-index: 10000;
        font-family: 'JetBrains Mono', monospace;
        color: white;
        text-align: center;
        box-shadow: 0 0 40px rgba(0, 255, 255, 0.2);
    `;
    loadPrompt.innerHTML = `
        <h2 style="color: #00ffff; margin: 0 0 20px 0; font-weight: 300; letter-spacing: 4px; font-size: 18px;">SAVE DETECTED</h2>
        <p style="margin-bottom: 24px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-size: 12px;">Continue Previous Session?</p>
        <button id="loadSaveBtn" style="
            background: transparent;
            color: #00ffff;
            border: 1px solid #00ffff;
            padding: 10px 24px;
            margin: 0 8px;
            cursor: pointer;
            font-family: inherit;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 11px;
            transition: all 0.2s;
        ">LOAD</button>
        <button id="newGameBtn" style="
            background: transparent;
            color: #888;
            border: 1px solid #444;
            padding: 10px 24px;
            margin: 0 8px;
            cursor: pointer;
            font-family: inherit;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 11px;
            transition: all 0.2s;
        ">NEW GAME</button>
    `;
    document.body.appendChild(loadPrompt);
    
    document.getElementById('loadSaveBtn').onclick = () => {
        saveSystem.loadGame(ship, game, missionSystem, missions, npcShips, asteroids, pickups);
        loadPrompt.remove();
    };
    
    document.getElementById('newGameBtn').onclick = () => {
        loadPrompt.remove();
    };
}

// Autosave every 30 seconds
setInterval(() => {
    if (!game.paused && ship.health > 0 && !ship.isDestroyed) {
        saveSystem.autoSave(ship, game, missionSystem, npcShips, asteroids, pickups);
    }
}, 30000);

// Start the original game immediately
console.log('Galaxy Trader initialized!');
console.log('Controls: W/A/S/D = Move, F = Fire, L = Land, S = Save, O = Load, M = Toggle Sound');

// Mark game as started
window.gameStarted = true;
window.oldMainLoaded = true;

// Start game loop
gameLoop();