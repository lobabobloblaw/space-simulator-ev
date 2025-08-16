/**
 * Minimal working version with modules
 */

console.log('Starting modular version...');

// Import only the essentials
import { Game } from './core/Game.js';
import { Ship } from './entities/Ship.js';

// Get canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 100;

// Initialize game and ship
const game = new Game();
const ship = new Ship();

// Make game accessible globally for debugging
window.game = game;
window.ship = ship;

// Simple planets data
const planets = [
    { x: 500, y: 300, radius: 40, name: "Terra Nova", color: "#4A90E2" },
    { x: -800, y: -600, radius: 60, name: "Crimson Moon", color: "#E74C3C" }
];

// Empty arrays for now
const asteroids = [];
const npcs = [];
const projectiles = [];
const pickups = [];
const explosions = [];

// Simple render function
function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save context for camera transform
    ctx.save();
    
    // Apply camera (center on ship)
    ctx.translate(canvas.width / 2 - game.camera.x, canvas.height / 2 - game.camera.y);
    
    // Draw planets
    for (let planet of planets) {
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, planet.x, planet.y - planet.radius - 10);
    }
    
    // Draw ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(ship.size, 0);
    ctx.lineTo(-ship.size, -ship.size/2);
    ctx.lineTo(-ship.size/2, 0);
    ctx.lineTo(-ship.size, ship.size/2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Restore context
    ctx.restore();
    
    // Draw UI text
    ctx.fillStyle = '#0f0';
    ctx.font = '14px Arial';
    ctx.fillText('Modular version running!', 10, 30);
}

// Simple input handling
document.addEventListener('keydown', (e) => {
    game.keys[e.code] = true;
});

document.addEventListener('keyup', (e) => {
    game.keys[e.code] = false;
});

// Simple update function
function update() {
    // Update camera to follow ship
    game.camera.x = ship.x;
    game.camera.y = ship.y;
    
    // Simple ship movement
    if (game.keys['ArrowLeft'] || game.keys['KeyA']) {
        ship.angle -= 0.05;
    }
    if (game.keys['ArrowRight'] || game.keys['KeyD']) {
        ship.angle += 0.05;
    }
    if (game.keys['ArrowUp'] || game.keys['KeyW']) {
        ship.vx += Math.cos(ship.angle) * 0.1;
        ship.vy += Math.sin(ship.angle) * 0.1;
    }
    
    // Apply velocity
    ship.x += ship.vx;
    ship.y += ship.vy;
    
    // Apply friction
    ship.vx *= 0.99;
    ship.vy *= 0.99;
}

// Simple HUD update
function updateHUD() {
    document.getElementById('health').textContent = Math.round(ship.health) + '%';
    document.getElementById('fuel').textContent = Math.round(ship.fuel) + '%';
    document.getElementById('credits').textContent = ship.credits;
    document.getElementById('kills').textContent = ship.kills;
    
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    document.getElementById('speed').textContent = (speed * 10).toFixed(1);
}

// Game loop
function gameLoop() {
    update();
    render();
    updateHUD();
    requestAnimationFrame(gameLoop);
}

// Start the game
console.log('Starting game loop...');
gameLoop();
console.log('Game started successfully!');