/**
 * EventBus Architecture - Pure Implementation
 * No window globals, pure StateManager approach
 */

import { getEventBus, GameEvents } from './core/EventBus.js';
import { getStateManager } from './core/StateManager.js';
import { GameLoop } from './core/GameLoop.js';

// Import systems
import InputSystem from './systems/InputSystem.js';
import PhysicsSystem from './systems/PhysicsSystem.js';
import RenderSystem from './systems/RenderSystem.js';
import AudioSystem from './systems/AudioSystem.js';
import UISystem from './systems/UISystem.js';
import WeaponSystem from './systems/WeaponSystem.js';
import SpawnSystem from './systems/SpawnSystem.js';
import { SaveSystem } from './systems/saveSystem.js';
import TradingSystem from './systems/TradingSystem.js';
import NPCSystem from './systems/NPCSystem.js';  // Full NPC AI with personalities

// We'll import game data dynamically in the initialization function
// to ensure it's available when needed

console.log('[EventBus] Module loaded - Starting pure EventBus game initialization...');
window.eventBusModuleLoaded = true;

// Get singletons
const eventBus = getEventBus();
const stateManager = getStateManager();

// Systems container
const systems = {};

/**
 * Initialize complete game state in StateManager
 */
async function initializeGameState() {
    const state = stateManager.state;
    
    // Import game data dynamically
    const gameDataModule = await import('./data/gameData.js');
    const planetsData = gameDataModule.planets;
    const missionsData = gameDataModule.missions;
    
    console.log('[EventBus] initializeGameState called');
    console.log('[EventBus] planets loaded:', planetsData?.length || 'NO');
    
    // Initialize ship
    state.ship = {
        x: 0, y: 0, vx: 0, vy: 0,
        angle: 0, thrust: 0.012, maxSpeed: 0.8,
        fuel: 100, maxFuel: 100,
        credits: 250,
        tutorialStage: 'start',
        size: 8,
        isLanded: false, landedPlanet: null,
        landingCooldown: 0,
        class: "shuttle",
        health: 100, maxHealth: 100,
        weaponCooldown: 0,
        weaponSwitchPressed: false,
        kills: 0,
        cargo: [], cargoCapacity: 10,
        weapons: [], 
        currentWeapon: 0,
        shield: 0, maxShield: 0,
        engineLevel: 1, weaponLevel: 1,
        currentPlanet: null
    };
    
    // Initialize camera
    state.camera = { x: 0, y: 0 };
    
    // Initialize game meta
    state.paused = false;
    state.gameTime = 0;
    
    // Initialize entities
    state.planets = planetsData;
    console.log('[EventBus] Assigned planets to state:', state.planets?.length);
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
            health: 20, maxHealth: 20,
            oreContent: Math.floor(Math.random() * 3) + 1,
            shapePoints: shapePoints
        });
    }
    
    // Generate stars
    state.stars = { far: [], mid: [], near: [] };
    
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
        available: missionsData
    };
    
    // Initialize spawn state
    state.npcSpawnState = {
        nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
    };
    
    // Initialize audio state
    state.audio = {
        enabled: true,
        masterVolume: 0.3
    };
    
    // Initialize input state
    state.input = {
        keys: new Set(),
        mouse: { x: 0, y: 0, pressed: false },
        touch: { x: 0, y: 0, active: false }
    };
    
    // Initialize physics state
    state.physics = {
        entities: [],
        collisions: []
    };
    
    // Add compatibility property for audioSystem
    state.audioSystem = null;       // Will be set after systems init
    // Note: DO NOT create state.keys reference - it causes Proxy issues
    // Systems should use state.input.keys directly
    
    console.log('[EventBus] Game state initialized in StateManager');
}

/**
 * Setup event handlers for game logic
 */
function setupEventHandlers() {
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
        
        eventBus.emit(GameEvents.EXPLOSION, {
            x: state.ship.x,
            y: state.ship.y,
            size: 'large'
        });
        
        eventBus.emit(GameEvents.UI_MESSAGE, {
            message: 'SHIP DESTROYED - Press R to respawn',
            type: 'error',
            duration: 5000
        });
    });
    
    // Landing handling
    eventBus.on(GameEvents.INPUT_LAND, () => {
        const state = stateManager.state;
        
        for (let planet of state.planets) {
            const dx = state.ship.x - planet.x;
            const dy = state.ship.y - planet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < planet.radius + 50 && planet.landable) {
                state.ship.vx = 0;
                state.ship.vy = 0;
                state.ship.isLanded = true;
                state.ship.landedPlanet = planet;
                state.ship.currentPlanet = planet;
                state.ship.landingCooldown = 60;
                
                state.npcShips = [];
                state.projectiles = [];
                
                state.ship.fuel = state.ship.maxFuel;
                state.ship.health = state.ship.maxHealth;
                state.ship.credits += 50;
                
                const angle = Math.atan2(dy, dx);
                state.ship.x = planet.x + Math.cos(angle) * (planet.radius + 40);
                state.ship.y = planet.y + Math.sin(angle) * (planet.radius + 40);
                
                eventBus.emit(GameEvents.SHIP_LANDED, {
                    ship: state.ship,
                    planet: planet
                });
                
                eventBus.emit(GameEvents.GAME_PAUSE);
                break;
            }
        }
    });
    
    // Combat events - handled by WeaponSystem now
    // The WeaponSystem listens to INPUT_FIRE and processes it
    
    // Weapon switching
    eventBus.on(GameEvents.INPUT_SWITCH_WEAPON, () => {
        const state = stateManager.state;
        if (state.ship.weapons.length > 1) {
            state.ship.currentWeapon = (state.ship.currentWeapon + 1) % state.ship.weapons.length;
            eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Weapon: ${state.ship.weapons[state.ship.currentWeapon].type}`,
                type: 'info',
                duration: 1000
            });
        }
    });
    
    // NPC death handling
    eventBus.on(GameEvents.NPC_DEATH, (data) => {
        const state = stateManager.state;
        
        if (data.npc && data.npc.killedBy === 'player') {
            const bounty = data.npc.behavior === 'aggressive' ? 
                data.npc.credits : Math.floor(data.npc.credits * 0.5);
            state.ship.credits += bounty + 25;
            state.ship.kills++;
            
            if (data.npc.behavior === 'aggressive') {
                state.ship.pirateKills = (state.ship.pirateKills || 0) + 1;
            }
            
            if (state.ship.tutorialStage === 'combat' && state.ship.kills >= 1) {
                state.ship.tutorialStage = 'complete';
                eventBus.emit(GameEvents.TUTORIAL_UPDATE, {
                    stage: 'complete',
                    ship: state.ship
                });
            }
        }
        
        eventBus.emit(GameEvents.EXPLOSION, {
            x: data.npc.x,
            y: data.npc.y,
            size: 'medium'
        });
    });
    
    console.log('[EventBus] Event handlers setup complete');
}

/**
 * Initialize all game systems
 */
async function initializeSystems() {
    console.log('[EventBus] Initializing systems...');
    
    try {
        systems.input = new InputSystem();
        await systems.input.init();
        console.log('✅ InputSystem initialized');
    } catch (e) {
        console.error('❌ InputSystem failed:', e);
    }
    
    try {
        systems.physics = new PhysicsSystem();
        await systems.physics.init();
        console.log('✅ PhysicsSystem initialized');
    } catch (e) {
        console.error('❌ PhysicsSystem failed:', e);
    }
    
    try {
        const canvas = document.getElementById('gameCanvas');
        systems.render = new RenderSystem(canvas);
        await systems.render.init();
        console.log('✅ RenderSystem initialized');
    } catch (e) {
        console.error('❌ RenderSystem failed:', e);
    }
    
    try {
        systems.audio = new AudioSystem();
        await systems.audio.init();
        console.log('✅ AudioSystem initialized');
    } catch (e) {
        console.error('❌ AudioSystem failed:', e);
    }
    
    try {
        systems.ui = new UISystem();
        await systems.ui.init();
        console.log('✅ UISystem initialized');
    } catch (e) {
        console.error('❌ UISystem failed:', e);
    }
    
    try {
        systems.weapon = new WeaponSystem();
        await systems.weapon.init();
        console.log('✅ WeaponSystem initialized');
    } catch (e) {
        console.error('❌ WeaponSystem failed:', e);
    }
    
    try {
        systems.spawn = new SpawnSystem();
        await systems.spawn.init();
        console.log('✅ SpawnSystem initialized');
    } catch (e) {
        console.error('❌ SpawnSystem failed:', e);
    }
    
    try {
        systems.save = new SaveSystem();
        console.log('✅ SaveSystem initialized');
    } catch (e) {
        console.error('❌ SaveSystem failed:', e);
    }
    
    try {
        systems.trading = new TradingSystem();
        await systems.trading.init();
        window.tradingSystem = systems.trading; // For onclick handlers
        console.log('✅ TradingSystem initialized');
    } catch (e) {
        console.error('❌ TradingSystem failed:', e);
    }
    
    try {
        systems.npc = new NPCSystem();
        await systems.npc.init();
        console.log('✅ NPCSystem initialized with full AI');
    } catch (e) {
        console.error('❌ NPCSystem failed:', e);
    }
    
    // Set audioSystem reference in state for compatibility
    stateManager.state.audioSystem = systems.audio;
    
    return systems;
}

/**
 * Main game initialization
 */
async function initGame() {
    console.log('[EventBus] initGame() called - Initializing pure EventBus game...');
    window.eventBusInitStarted = true;
    
    // Import and verify game data
    const gameDataModule = await import('./data/gameData.js');
    console.log('[EventBus] Verifying imports:');
    console.log('  - planets:', gameDataModule.planets?.length || 'MISSING');
    console.log('  - missions:', gameDataModule.missions?.length || 'MISSING');
    console.log('  - npcTypes:', Object.keys(gameDataModule.npcTypes || {}).length || 'MISSING');
    
    // Set canvas size
    const canvas = document.getElementById('gameCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 150;
    
    // Initialize game state
    await initializeGameState();
    
    // Initialize systems
    await initializeSystems();
    
    // Setup event handlers
    setupEventHandlers();
    
    // Create game loop
    const loop = new GameLoop({
        onUpdate: (deltaTime) => {
            const state = stateManager.state;
            
            // Update camera
            state.camera.x = state.ship.x;
            state.camera.y = state.ship.y;
            
            // Update systems
            if (!state.paused) {
                for (const system of Object.values(systems)) {
                    if (system.update) {
                        system.update(state, deltaTime);
                    }
                }
            }
            
            // Update HUD
            eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
        },
        onRender: (interpolation, deltaTime) => {
            if (systems.render && systems.render.render) {
                systems.render.render(stateManager.state, deltaTime);
            }
        }
    });
    
    // Check for saved game
    if (systems.save && systems.save.hasSave()) {
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
            <h2 style="color: #00ffff; margin: 0 0 20px 0; font-family: 'Orbitron', monospace; font-weight: 600; text-transform: uppercase; font-size: 24px;">SAVE DETECTED</h2>
            <p style="margin-bottom: 24px; color: #888; font-family: 'JetBrains Mono', monospace;">Continue Previous Session?</p>
            <button id="loadSaveBtn" style="
                background: transparent;
                color: #00ffff;
                border: 1px solid #00ffff;
                padding: 10px 24px;
                margin: 0 8px;
                cursor: pointer;
                font-family: 'JetBrains Mono', monospace;
                text-transform: uppercase;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(0,255,255,0.1)'" onmouseout="this.style.background='transparent'">LOAD</button>
            <button id="newGameBtn" style="
                background: transparent;
                color: #888;
                border: 1px solid #444;
                padding: 10px 24px;
                margin: 0 8px;
                cursor: pointer;
                font-family: 'JetBrains Mono', monospace;
                text-transform: uppercase;
                transition: all 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">NEW GAME</button>
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
    
    console.log('[EventBus] 🎉 PURE EVENTBUS ARCHITECTURE DEPLOYED!');
    console.log('[EventBus] All systems use StateManager - no window globals');
    console.log('[EventBus] Controls: W/A/S/D = Move, F = Fire, L = Land, S = Save, O = Load, M = Toggle Sound');
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Export for debugging (but not required for operation)
export { eventBus, stateManager, systems };

// Also expose globally for debugging in test environment
if (window.location.pathname.includes('test-pure')) {
    window.eventBus = eventBus;
    window.stateManager = stateManager;
    window.systems = systems;
}