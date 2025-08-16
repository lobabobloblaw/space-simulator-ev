/**
 * Simplified main.js to test basic functionality
 */

console.log('Starting simple test...');

// Simple game state
const game = {
    camera: { x: 0, y: 0 },
    keys: {},
    paused: false
};

// Simple ship
const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    size: 8,
    health: 100,
    fuel: 100,
    credits: 250,
    kills: 0,
    cargo: [],
    cargoCapacity: 10,
    weapons: [],
    shield: 0,
    maxShield: 0
};

// Get canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 100;

// Simple render function
function render() {
    // Clear canvas to dark blue so we can see it's working
    ctx.fillStyle = '#001122';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw a test rectangle
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(100, 100, 200, 200);
    
    // Draw ship at center
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(ship.size, 0);
    ctx.lineTo(-ship.size, -ship.size/2);
    ctx.lineTo(-ship.size/2, 0);
    ctx.lineTo(-ship.size, ship.size/2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    
    // Draw text
    ctx.fillStyle = '#0f0';
    ctx.font = '20px Arial';
    ctx.fillText('Game is running!', 10, 30);
}

// Simple game loop
function gameLoop() {
    render();
    requestAnimationFrame(gameLoop);
}

// Simple HUD update
function updateHUD() {
    document.getElementById('health').textContent = '100%';
    document.getElementById('fuel').textContent = '100%';
    document.getElementById('credits').textContent = '250';
}

console.log('Starting game loop...');
updateHUD();
gameLoop();

console.log('Simple test complete!');