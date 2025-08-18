/**
 * EventBus-based Main Entry Point for Galaxy Trader
 * This is the new architecture that will replace main.js
 */

console.log('[EventBus Main] Starting to load...');

// Import core infrastructure
import { getEventBus, GameEvents } from './core/EventBus.js';
import { getStateManager } from './core/StateManager.js';
import { GameLoop } from './core/GameLoop.js';

// Import all systems
import InputSystem from './systems/InputSystem.js';
import PhysicsSystem from './systems/PhysicsSystem.js';
import RenderSystem from './systems/RenderSystem.js';
import AudioSystem from './systems/AudioSystem.js';
import UISystem from './systems/UISystem.js';
import WeaponSystem from './systems/WeaponSystem.js';
import SpawnSystem from './systems/SpawnSystem.js';
import { SaveSystem } from './systems/saveSystem.js';  // Note: case-sensitive filename

// Import game data
import { 
    npcTypes, 
    commodities, 
    shopInventory,
    planets,
    missions
} from './data/gameData.js';

// Get singleton instances
const eventBus = getEventBus();
const stateManager = getStateManager();

// Make globally accessible immediately
window.eventBus = eventBus;
window.stateManager = stateManager;
console.log('[EventBus Main] Core instances exposed globally');

// Game instance
let game = null;
let systems = {};

/**
 * Initialize all game systems using EventBus architecture
 */
async function initializeSystems() {
    console.log('[EventBus Main] Initializing systems...');
    
    // Create all systems
    systems = {
        input: new InputSystem(),
        physics: new PhysicsSystem(),
        render: new RenderSystem(document.getElementById('gameCanvas')),
        audio: new AudioSystem(),
        ui: new UISystem(),
        weapon: new WeaponSystem(),
        spawn: new SpawnSystem(),
        save: new SaveSystem()
    };
    
    // Initialize each system
    for (const [name, system] of Object.entries(systems)) {
        if (system.init) {
            await system.init();
            console.log(`[EventBus Main] Initialized ${name} system`);
        }
    }
    
    // Make systems globally accessible for debugging
    window.eventBusSystems = systems;
    
    return systems;
}

/**
 * Initialize game state
 */
function initializeGameState() {
    const state = stateManager.state;
    
    // Initialize ship
    state.ship = {
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
    
    // Initialize camera
    state.camera = {
        x: state.ship.x,
        y: state.ship.y
    };
    
    // Initialize game meta
    state.paused = false;
    state.gameTime = 0;
    
    // Initialize entities
    state.planets = planets;
    state.npcShips = [];
    state.asteroids = [];
    state.projectiles = [];
    state.explosions = [];
    state.warpEffects = [];
    state.pickups = [];
    
    // Generate asteroids
    for (let i = 0; i < 50; i++) {
        const shapePoints = [];
        for (let j = 0; j < 8; j++) {
            shapePoints.push(0.7 + Math.random() * 0.6);
        }
        
        state.asteroids.push({
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
            shapePoints: shapePoints
        });
    }
    
    // Generate stars for background
    state.stars = {
        far: [],
        mid: [],
        near: []
    };
    
    // Far stars
    for (let i = 0; i < 3000; i++) {
        state.stars.far.push({
            x: (Math.random() - 0.5) * 12000,
            y: (Math.random() - 0.5) * 12000,
            brightness: Math.random() * 0.5 + 0.3,
            size: Math.random() < 0.95 ? 1 : 2,
            color: Math.random() < 0.94 ? '#ffffff' : 
                   Math.random() < 0.5 ? '#ffeeee' :
                   Math.random() < 0.7 ? '#eeeeff' : '#ffffee'
        });
    }
    
    // Mid stars
    for (let i = 0; i < 1200; i++) {
        state.stars.mid.push({
            x: (Math.random() - 0.5) * 8000,
            y: (Math.random() - 0.5) * 8000,
            brightness: Math.random() * 0.6 + 0.4,
            size: Math.random() < 0.9 ? 1 : 2,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.01 + Math.random() * 0.03,
            color: Math.random() < 0.92 ? '#ffffff' : 
                   Math.random() < 0.6 ? '#ffeeee' : '#eeeeff'
        });
    }
    
    // Near stars
    for (let i = 0; i < 600; i++) {
        state.stars.near.push({
            x: (Math.random() - 0.5) * 6000,
            y: (Math.random() - 0.5) * 6000,
            brightness: Math.random() * 0.7 + 0.5,
            size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
            color: '#ffffff'
        });
    }
    
    // Initialize mission system
    state.missionSystem = {
        active: null,
        completed: [],
        available: missions
    };
    
    // Initialize spawn state
    state.npcSpawnState = {
        nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
    };
    
    // HYBRID APPROACH: Bridge to window globals for compatibility
    // This allows systems that still use window.ship to work
    window.ship = state.ship;
    window.planets = state.planets;
    window.asteroids = state.asteroids;
    window.npcShips = state.npcShips;
    window.projectiles = state.projectiles;
    window.explosions = state.explosions;
    window.warpEffects = state.warpEffects;
    window.pickups = state.pickups;
    window.game = { 
        camera: state.camera, 
        paused: state.paused 
    };
    window.missionSystem = state.missionSystem;
    
    console.log('[EventBus Main] Game state initialized with hybrid window globals');
}

/**
 * Wire up event handlers
 */
function setupEventHandlers() {
    console.log('[EventBus Main] Setting up event handlers...');
    
    // Input to game actions
    eventBus.on(GameEvents.INPUT_KEY_DOWN, (data) => {
        const state = stateManager.state;
        
        // Handle pause toggle
        if (data.key === 'Escape') {
            eventBus.emit(GameEvents.GAME_PAUSE_TOGGLE);
        }
        
        // Handle save/load
        if (data.key === 'KeyS' && !data.ctrlKey && !data.metaKey && !state.paused) {
            eventBus.emit(GameEvents.GAME_SAVE);
        }
        
        if (data.key === 'KeyO' && !state.paused) {
            eventBus.emit(GameEvents.GAME_LOAD);
        }
        
        // Handle sound toggle
        if (data.key === 'KeyM') {
            eventBus.emit(GameEvents.AUDIO_TOGGLE);
        }
        
        // Handle landing
        if (data.key === 'KeyL') {
            eventBus.emit(GameEvents.INPUT_LAND);
        }
        
        // Handle firing
        if (data.key === 'KeyF') {
            eventBus.emit(GameEvents.INPUT_FIRE);
        }
        
        // Handle weapon switch
        if (data.key === 'KeyQ') {
            eventBus.emit(GameEvents.INPUT_SWITCH_WEAPON);
        }
    });
    
    // Ship damage handling
    eventBus.on(GameEvents.SHIP_DAMAGE, (data) => {
        const state = stateManager.state;
        if (state.ship.health <= 0) {
            eventBus.emit(GameEvents.SHIP_DEATH);
        }
    });
    
    // Ship death handling
    eventBus.on(GameEvents.SHIP_DEATH, () => {
        const state = stateManager.state;
        state.ship.isDestroyed = true;
        
        // Create explosions
        eventBus.emit(GameEvents.EXPLOSION, {
            x: state.ship.x,
            y: state.ship.y,
            size: 'large'
        });
        
        // Show death message
        eventBus.emit(GameEvents.UI_MESSAGE, {
            message: 'SHIP DESTROYED - Press R to respawn',
            type: 'error',
            duration: 5000
        });
    });
    
    // Landing handling
    eventBus.on(GameEvents.INPUT_LAND, () => {
        const state = stateManager.state;
        
        // Check if near any planet
        for (let planet of state.planets) {
            const dx = state.ship.x - planet.x;
            const dy = state.ship.y - planet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < planet.radius + 50 && planet.landable) {
                // Land on planet
                state.ship.vx = 0;
                state.ship.vy = 0;
                state.ship.isLanded = true;
                state.ship.landedPlanet = planet;
                state.ship.currentPlanet = planet;
                state.ship.landingCooldown = 60;
                
                // Clear threats
                state.npcShips = [];
                state.projectiles = [];
                
                // Restore resources
                state.ship.fuel = state.ship.maxFuel;
                state.ship.health = state.ship.maxHealth;
                state.ship.credits += 50;
                
                // Position ship at planet edge
                const angle = Math.atan2(dy, dx);
                state.ship.x = planet.x + Math.cos(angle) * (planet.radius + 40);
                state.ship.y = planet.y + Math.sin(angle) * (planet.radius + 40);
                
                // Emit landed event
                eventBus.emit(GameEvents.SHIP_LANDED, {
                    ship: state.ship,
                    planet: planet
                });
                
                // Pause game and show landing overlay
                eventBus.emit(GameEvents.GAME_PAUSE);
                
                break;
            }
        }
    });
    
    // Combat events
    eventBus.on(GameEvents.INPUT_FIRE, () => {
        const state = stateManager.state;
        if (state.ship.weaponCooldown <= 0 && state.ship.weapons.length > 0) {
            const weapon = state.ship.weapons[state.ship.currentWeapon];
            
            eventBus.emit(GameEvents.WEAPON_FIRE, {
                shooter: state.ship,
                angle: state.ship.angle,
                isPlayer: true,
                weapon: weapon
            });
            
            state.ship.weaponCooldown = weapon.cooldown;
        }
    });
    
    // NPC death handling
    eventBus.on(GameEvents.NPC_DEATH, (data) => {
        const state = stateManager.state;
        
        if (data.npc && data.npc.killedBy === 'player') {
            // Award credits and increment kills
            const bounty = data.npc.behavior === 'aggressive' ? 
                data.npc.credits : Math.floor(data.npc.credits * 0.5);
            state.ship.credits += bounty + 25;
            state.ship.kills++;
            
            if (data.npc.behavior === 'aggressive') {
                state.ship.pirateKills = (state.ship.pirateKills || 0) + 1;
            }
            
            // Check tutorial progress
            if (state.ship.tutorialStage === 'combat' && state.ship.kills >= 1) {
                state.ship.tutorialStage = 'complete';
                eventBus.emit(GameEvents.TUTORIAL_UPDATE, {
                    stage: 'complete',
                    ship: state.ship
                });
            }
        }
        
        // Create explosion
        eventBus.emit(GameEvents.EXPLOSION, {
            x: data.npc.x,
            y: data.npc.y,
            size: 'medium'
        });
    });
    
    console.log('[EventBus Main] Event handlers setup complete');
}

/**
 * Main game loop using EventBus
 */
function gameLoop(deltaTime) {
    const state = stateManager.state;
    
    // Update camera to follow ship
    state.camera.x = state.ship.x;
    state.camera.y = state.ship.y;
    
    // HYBRID: Keep window globals in sync
    if (window.game) {
        window.game.camera = state.camera;
        window.game.paused = state.paused;
    }
    
    // Update all systems
    for (const [name, system] of Object.entries(systems)) {
        if (system.update && !state.paused) {
            system.update(state, deltaTime);
        }
    }
    
    // Render (always, even when paused)
    if (systems.render && systems.render.render) {
        systems.render.render(state, deltaTime);
    }
    
    // Update HUD
    eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
}

/**
 * Initialize the game with EventBus architecture
 */
async function initGame() {
    console.log('[EventBus Main] Starting EventBus-based game initialization...');
    
    // Check if canvas exists
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('[EventBus Main] Canvas not found!');
        return;
    }
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 150;
    
    // Initialize game state
    initializeGameState();
    
    // Initialize all systems
    await initializeSystems();
    
    // Setup event handlers
    setupEventHandlers();
    
    // Create game loop
    const loop = new GameLoop({
        onUpdate: gameLoop,
        onRender: (interpolation, deltaTime) => {
            if (systems.render && systems.render.render) {
                systems.render.render(stateManager.state, deltaTime);
            }
        }
    });
    
    // Check for saved game
    if (systems.save && systems.save.hasSave()) {
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
            <h2 style="color: #00ffff; margin: 0 0 20px 0;">SAVE DETECTED</h2>
            <p style="margin-bottom: 24px; color: #888;">Continue Previous Session?</p>
            <button id="loadSaveBtn" style="
                background: transparent;
                color: #00ffff;
                border: 1px solid #00ffff;
                padding: 10px 24px;
                margin: 0 8px;
                cursor: pointer;
            ">LOAD</button>
            <button id="newGameBtn" style="
                background: transparent;
                color: #888;
                border: 1px solid #444;
                padding: 10px 24px;
                margin: 0 8px;
                cursor: pointer;
            ">NEW GAME</button>
        `;
        document.body.appendChild(loadPrompt);
        
        document.getElementById('loadSaveBtn').onclick = () => {
            eventBus.emit(GameEvents.GAME_LOAD);
            loadPrompt.remove();
        };
        
        document.getElementById('newGameBtn').onclick = () => {
            loadPrompt.remove();
        };
    }
    
    // Wire up UI buttons
    const departBtn = document.getElementById('departBtn');
    const stationBtn = document.getElementById('stationBtn');
    const tradeBtn = document.getElementById('tradeBtn');
    const outfitterBtn = document.getElementById('outfitterBtn');
    
    if (departBtn) departBtn.onclick = () => eventBus.emit(GameEvents.MENU_CLOSE);
    if (stationBtn) stationBtn.onclick = () => eventBus.emit(GameEvents.MENU_OPEN, { panel: 'landing' });
    if (tradeBtn) tradeBtn.onclick = () => eventBus.emit(GameEvents.MENU_OPEN, { panel: 'trading' });
    if (outfitterBtn) outfitterBtn.onclick = () => eventBus.emit(GameEvents.MENU_OPEN, { panel: 'shop' });
    
    // Create game instance for UI callbacks
    window.gameInstance = {
        closeLandingOverlay: () => eventBus.emit(GameEvents.MENU_CLOSE),
        showPanel: (panel) => eventBus.emit(GameEvents.MENU_OPEN, { panel }),
        buyCommodity: (type, price) => {
            const state = stateManager.state;
            eventBus.emit('economy.buy', { 
                type, 
                price, 
                ship: state.ship,
                commodities 
            });
        },
        sellCommodity: (type, price) => {
            const state = stateManager.state;
            eventBus.emit('economy.sell', { 
                type, 
                price, 
                ship: state.ship,
                commodities 
            });
        },
        sellAllCargo: () => {
            const state = stateManager.state;
            eventBus.emit('economy.sellAll', { 
                ship: state.ship,
                commodities 
            });
        },
        buyUpgrade: (itemId) => {
            const state = stateManager.state;
            eventBus.emit('economy.buyUpgrade', { 
                itemId, 
                ship: state.ship,
                shopInventory 
            });
        }
    };
    
    // Start game loop
    loop.start();
    
    // Start first mission
    const state = stateManager.state;
    if (state.missionSystem && state.missionSystem.available.length > 0) {
        state.missionSystem.active = state.missionSystem.available[0];
        eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `New Mission: ${state.missionSystem.active.title}`,
            type: 'info',
            duration: 3000
        });
    }
    
    // Autosave every 30 seconds
    setInterval(() => {
        const state = stateManager.state;
        if (!state.paused && state.ship.health > 0 && !state.ship.isDestroyed) {
            eventBus.emit(GameEvents.GAME_SAVE);
        }
    }, 30000);
    
    console.log('[EventBus Main] Game initialized successfully!');
    console.log('[EventBus Main] Controls: W/A/S/D = Move, F = Fire, L = Land, S = Save, O = Load, M = Toggle Sound');
    
    // Mark as using EventBus architecture
    window.eventBusActive = true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initGame().catch(error => {
            console.error('[EventBus Main] Fatal initialization error:', error);
            alert('Game failed to load: ' + error.message);
        });
    });
} else {
    initGame().catch(error => {
        console.error('[EventBus Main] Fatal initialization error:', error);
        alert('Game failed to load: ' + error.message);
    });
}

// Handle window resize
window.addEventListener('resize', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - 150;
        eventBus.emit('canvas.resize', {
            width: canvas.width,
            height: canvas.height
        });
    }
});

// Export for debugging
export { eventBus, stateManager, systems };
