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
import WebGLRenderSystem from './systems/WebGLRenderSystem.js';
import AudioSystem from './systems/AudioSystem.js';
import UISystem from './systems/UISystem.js';
import WeaponSystem from './systems/WeaponSystem.js';
import SpawnSystem from './systems/SpawnSystem.js';
import SaveSystemAdapterFixed from './systems/SaveSystemAdapterFixed.js';
import TradingSystem from './systems/TradingSystem.js';
import ShopSystem from './systems/ShopSystem.js';  // Shop system for outfitter
import NPCSystem from './systems/NPCSystem.js';  // Full NPC AI with personalities
import DebugSystem from './systems/DebugSystem.js';
import TargetingSystem from './systems/TargetingSystem.js';
import AssetSystem from './systems/AssetSystem.js';
import { GameConstants } from './utils/Constants.js';

// We'll import game data dynamically in the initialization function
// to ensure it's available when needed

console.log('[EventBus] Module loaded - Starting pure EventBus game initialization...');
console.log('[EventBus] Current URL:', window.location.href);
console.log('[EventBus] Script base path:', import.meta.url);
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
    console.log('[EventBus] initializeGameState called');
    console.log('[EventBus] Importing game data...');
    
    // Import game data
    let planetsData, missionsData;
    try {
        console.log('[EventBus] Attempting to import gameData.js...');
        const gameDataModule = await import('./data/gameData.js');
        console.log('[EventBus] Import returned:', gameDataModule);
        planetsData = gameDataModule.planets;
        missionsData = gameDataModule.missions;
        console.log('[EventBus] Game data imported successfully');
        console.log('[EventBus] Planets loaded:', planetsData?.length || 'NO');
        console.log('[EventBus] Missions loaded:', missionsData?.length || 'NO');
        
        // Verify planets data
        if (!planetsData || planetsData.length === 0) {
            console.error('[EventBus] WARNING: No planets in imported data!');
            console.log('[EventBus] gameDataModule keys:', Object.keys(gameDataModule));
        }
    } catch (e) {
        console.error('[EventBus] Failed to import game data:', e);
        console.error('[EventBus] Error stack:', e.stack);
        // Fallback to empty arrays to prevent crashes
        planetsData = [];
        missionsData = [];
        console.error('[EventBus] Using empty arrays as fallback');
    }
    
    // CHECK FOR SAVED DATA FIRST!
    const savedData = localStorage.getItem('galaxyTraderSave');
    let shipData = null;
    let missionData = null;
    
    if (savedData) {
        try {
            const save = JSON.parse(savedData);
            shipData = save.ship;
            missionData = save.missionSystem;
            console.log('[EventBus] Found save during init - loading credits:', shipData?.credits);
            console.log('[EventBus] Save data keys:', Object.keys(save));
        } catch (e) {
            console.log('[EventBus] Invalid save data, using defaults:', e);
        }
    } else {
        console.log('[EventBus] No save found - using defaults');
    }
    
    // Initialize ship with saved data OR defaults
    state.ship = {
        x: shipData?.x ?? 0,
        y: shipData?.y ?? 0,
        vx: shipData?.vx ?? 0,
        vy: shipData?.vy ?? 0,
        angle: shipData?.angle ?? 0,
        thrust: shipData?.thrust ?? 0.012,
        maxSpeed: shipData?.maxSpeed ?? 0.8,
        fuel: shipData?.fuel ?? 100,
        maxFuel: shipData?.maxFuel ?? 100,
        credits: shipData?.credits ?? 250,  // Use saved credits or default 250
        tutorialStage: shipData?.tutorialStage ?? 'start',
        size: shipData?.size ?? 8,
        isLanded: false,  // Always start not landed
        landedPlanet: null,
        landingCooldown: 0,
        class: shipData?.class ?? "shuttle",
        health: shipData?.health ?? 100,
        maxHealth: shipData?.maxHealth ?? 100,
        weaponCooldown: 0,
        weaponSwitchPressed: false,
        kills: shipData?.kills ?? 0,
        cargo: shipData?.cargo ?? [],
        cargoCapacity: shipData?.cargoCapacity ?? 10,
        weapons: shipData?.weapons ?? [],
        currentWeapon: shipData?.currentWeapon ?? 0,
        shield: shipData?.shield ?? 0,
        maxShield: shipData?.maxShield ?? 0,
        engineLevel: shipData?.engineLevel ?? 1,
        weaponLevel: shipData?.weaponLevel ?? 1,
        radarLevel: shipData?.radarLevel ?? 0,
        currentPlanet: null,
        pirateKills: shipData?.pirateKills ?? 0
    };
    
    // Assign basic faction for the player (generic civilian)
    state.ship.faction = state.ship.faction || 'civilian';
    console.log('[EventBus] Ship initialized with credits:', state.ship.credits);
    
    // Initialize camera
    state.camera = { x: 0, y: 0 };
    
    // Initialize game meta
    state.paused = false;
    state.gameTime = 0;
    
    // Initialize entities - ALWAYS fresh, never from save
    state.planets = planetsData;  // Always use fresh planet data
    console.log('[EventBus] Assigned planets to state:', state.planets?.length);
    
    // Initialize with some NPCs already in the system
    state.npcShips = [];
    
    // Spawn 3-5 initial NPCs already traveling through the system
    const initialNPCCount = 3 + Math.floor(Math.random() * 3);
    const npcTypes = ['trader', 'freighter', 'patrol', 'pirate'];
    const npcTemplates = {
        freighter: {
            size: 18, color: "#4488ff", maxSpeed: 0.25, thrust: 0.002,
            turnSpeed: 0.008, health: 80, maxHealth: 80, credits: 100,
            behavior: "passive", weapon: { type: "laser", damage: 5, cooldown: 30 }
        },
        trader: {
            size: 12, color: "#44ff88", maxSpeed: 0.35, thrust: 0.003,
            turnSpeed: 0.01, health: 60, maxHealth: 60, credits: 75,
            behavior: "passive", weapon: null
        },
        patrol: {
            size: 14, color: "#8888ff", maxSpeed: 0.45, thrust: 0.004,
            turnSpeed: 0.012, health: 100, maxHealth: 100, credits: 50,
            behavior: "lawful", weapon: { type: "rapid", damage: 7, cooldown: 9 }
        },
        pirate: {
            size: 10, color: "#ff4444", maxSpeed: 0.5, thrust: 0.005,
            turnSpeed: 0.015, health: 70, maxHealth: 70, credits: 150,
            behavior: "aggressive", weapon: { type: "plasma", damage: 15, cooldown: 26 }
        }
    };
    
    state.nextEntityId = state.nextEntityId || 1;
    for (let i = 0; i < initialNPCCount; i++) {
        const type = npcTypes[Math.floor(Math.random() * npcTypes.length)];
        const template = npcTemplates[type];
        
        // Random position in the system (not too close to player start)
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 700;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        // Random velocity (already traveling)
        const velAngle = Math.random() * Math.PI * 2;
        const speed = template.maxSpeed * (0.3 + Math.random() * 0.4);
        const vx = Math.cos(velAngle) * speed;
        const vy = Math.sin(velAngle) * speed;
        
        // For traders/freighters, set a target planet
        let targetPlanet = null;
        if ((type === 'trader' || type === 'freighter') && planetsData.length > 0) {
            targetPlanet = planetsData[Math.floor(Math.random() * planetsData.length)];
        }
        
        state.npcShips.push({
            id: state.nextEntityId++,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            angle: Math.atan2(vy, vx),
            type: type,
            ...template,
            faction: (type === 'patrol') ? 'patrol' : (type === 'pirate') ? 'pirate' : 'trader',
            targetPlanet: targetPlanet,
            weaponCooldown: Math.random() * 30,  // Random cooldown state
            lifetime: Math.floor(Math.random() * 300),  // Been around for a while
            thrusting: false,
            state: type === 'patrol' ? 'patrolling' : null
        });
    }
    
    console.log(`[EventBus] Spawned ${initialNPCCount} initial NPCs already in system`)
    state.asteroids = [];  // Will be generated below
    state.projectiles = [];  // Projectiles don't persist
    state.explosions = [];  // Effects don't persist
    state.warpEffects = [];  // Effects don't persist
    state.pickups = [];  // Pickups don't persist
    
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
    
    // Generate stars - ALWAYS fresh, never from save
    // Density is configurable for easy tuning
    const STAR_DENSITY = 2.0; // 1.0 = baseline; increase for denser fields
    state.renderSettings = state.renderSettings || {};
    state.renderSettings.starDensity = STAR_DENSITY;
    // Default sprites ON; can be toggled via debug overlay
    state.renderSettings.useSprites = state.renderSettings.useSprites ?? true;
    // Optional overlay toggles (persist if available)
    try {
        const persistedCull = localStorage.getItem('gt.render.spriteCulling');
        if (persistedCull !== null) state.renderSettings.spriteCulling = (persistedCull === 'true');
        else state.renderSettings.spriteCulling = state.renderSettings.spriteCulling || false;
        const persistedFX = localStorage.getItem('gt.render.useEffectsSprites');
        if (persistedFX !== null) state.renderSettings.useEffectsSprites = (persistedFX === 'true');
        else state.renderSettings.useEffectsSprites = state.renderSettings.useEffectsSprites || false;
        // NPC FX overlays remain opt-in (default OFF)
        const persistedFXNPC = localStorage.getItem('gt.render.useEffectsSpritesNPC');
        if (persistedFXNPC !== null) state.renderSettings.useEffectsSpritesNPC = (persistedFXNPC === 'true');
        else state.renderSettings.useEffectsSpritesNPC = state.renderSettings.useEffectsSpritesNPC || false;
    } catch(_) {
        state.renderSettings.spriteCulling = state.renderSettings.spriteCulling || false;
        state.renderSettings.useEffectsSprites = state.renderSettings.useEffectsSprites || false;
        state.renderSettings.useEffectsSpritesNPC = state.renderSettings.useEffectsSpritesNPC || false;
    }
    state.stars = { far: [], mid: [], near: [] };
    
    // Far stars
    for (let i = 0; i < Math.floor(3000 * STAR_DENSITY); i++) {
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
    for (let i = 0; i < Math.floor(1200 * STAR_DENSITY); i++) {
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
    for (let i = 0; i < Math.floor(600 * STAR_DENSITY); i++) {
        state.stars.near.push({
            x: (Math.random() - 0.5) * 6000,
            y: (Math.random() - 0.5) * 6000,
            brightness: Math.random() * 0.7 + 0.5,
            size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
            color: '#ffffff'
        });
    }
    
    // Initialize mission system with saved data OR defaults
    state.missionSystem = {
        active: missionData?.active ?? null,
        completed: missionData?.completed ?? [],
        available: missionData?.available ?? missionsData
    };
    
    // Initialize reputation scaffold
    state.reputation = state.reputation || { trader: 0, patrol: 0, pirate: 0 };
    
    // Initialize spawn state
    state.npcSpawnState = {
        nextShipSpawn: Date.now() + Math.random() * 3000 + 2000
    };
    
    // Initialize audio state
    state.audio = {
        enabled: false, // SFX muted by default
        masterVolume: 0.3,
        musicVolume: 0.6
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
    
    // Ship death handling (add brief destruct sequence before explosion)
    eventBus.on(GameEvents.SHIP_DEATH, () => {
        const state = stateManager.state;
        const now = performance.now ? performance.now() : Date.now();
        // Begin destruct sequence; delay final explosion a bit for drama
        state.ship.deathSeq = { start: now, duration: 600 };
        // Audio: subtle crackle during pre-explosion
        try { eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'crackle', intensity: 0.12 }); } catch(_) {}
        // Stop motion
        state.ship.vx = 0; state.ship.vy = 0;
        // Trigger explosion after delay and then mark destroyed
        setTimeout(() => {
            eventBus.emit(GameEvents.EXPLOSION, {
                x: state.ship.x,
                y: state.ship.y,
                size: 'large'
            });
            state.ship.isDestroyed = true;
            // Clear sequence marker
            delete state.ship.deathSeq;
            eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'SHIP DESTROYED - Press R to respawn',
                type: 'error',
                duration: 5000
            });
        }, 600);
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

    // Allow respawn via 'R' after death
    eventBus.on(GameEvents.INPUT_KEY_DOWN, (data) => {
        try {
            const key = (data?.key || '').toLowerCase();
            const state = stateManager.state;
            if (key === 'r' && state.ship?.isDestroyed) {
                respawnPlayer();
            }
        } catch (_) {}
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
                // Reputation: defeating pirates increases patrol standing
                state.reputation = state.reputation || { trader: 0, patrol: 0, pirate: 0 };
                state.reputation.patrol = (state.reputation.patrol || 0) + 1;
                eventBus.emit(GameEvents.REPUTATION_CHANGED, { faction: 'patrol', delta: +1, total: state.reputation.patrol });
                eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Reputation +1 (Patrol)', type: 'info', duration: 1200 });
                // Reputation: pirates dislike you for killing their own
                state.reputation.pirate = (state.reputation.pirate || 0) - 1;
                eventBus.emit(GameEvents.REPUTATION_CHANGED, { faction: 'pirate', delta: -1, total: state.reputation.pirate });
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
 * Respawn the player ship after destruction
 */
function respawnPlayer() {
    const state = stateManager.state;
    const ship = state.ship;
    
    // Determine spawn point: last landed planet if available, else origin
    let spawnX = 0, spawnY = 0;
    let planet = ship.landedPlanet || null;
    if (!planet && state.planets && state.planets.length > 0) {
        // Choose nearest planet to current ship position
        let best = null, bestD = Infinity;
        for (const p of state.planets) {
            const dx = ship.x - p.x, dy = ship.y - p.y;
            const d = dx*dx + dy*dy;
            if (d < bestD) { bestD = d; best = p; }
        }
        planet = best;
    }
    if (planet) {
        const angle = Math.random() * Math.PI * 2;
        const dist = (planet.radius || 40) + 80;
        spawnX = planet.x + Math.cos(angle) * dist;
        spawnY = planet.y + Math.sin(angle) * dist;
    }
    
    // Reset ship state
    ship.isDestroyed = false;
    ship.health = ship.maxHealth;
    if (ship.maxShield > 0) {
        ship.shield = Math.floor(ship.maxShield * (GameConstants?.SHIP?.RESPAWN_SHIELD_FRACTION || 0.5));
    }
    ship.x = spawnX;
    ship.y = spawnY;
    ship.vx = 0;
    ship.vy = 0;
    ship.weaponCooldown = 0;
    ship.landingCooldown = 30;
    ship.isLanded = false;
    ship.currentPlanet = planet || null;
    
    // Apply death penalty (credits)
    const penalty = GameConstants?.SHIP?.DEATH_PENALTY ?? 100;
    ship.credits = Math.max(0, (ship.credits || 0) - penalty);
    
    // Clear hostile projectiles around spawn
    state.projectiles = [];
    
    // Notify systems
    eventBus.emit(GameEvents.SHIP_RESPAWN, { ship });
    eventBus.emit(GameEvents.UI_MESSAGE, {
        message: 'Respawned near nearest planet',
        type: 'info',
        duration: 2000
    });
}

/**
 * Initialize all game systems
 */
async function initializeSystems() {
    console.log('[EventBus] Initializing systems...');
    
    try {
        systems.assets = new AssetSystem();
        await systems.assets.init();
        console.log('✅ AssetSystem initialized');
    } catch (e) {
        console.error('❌ AssetSystem failed:', e);
    }

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
        const useWebGL = (typeof window !== 'undefined') && !!window.RENDER_WEBGL;
        systems.render = useWebGL ? new WebGLRenderSystem(canvas) : new RenderSystem(canvas);
        await systems.render.init();
        console.log(useWebGL ? '✅ WebGLRenderSystem initialized' : '✅ RenderSystem initialized');
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
        console.log('🔧 Creating SaveSystemAdapterFixed...');
        systems.save = new SaveSystemAdapterFixed();
        console.log('🔧 SaveSystemAdapterFixed created, now initializing...');
        await systems.save.init();
        console.log('✅ SaveSystemAdapterFixed initialized - Save/Load connected');
        
        // Test that it's working
        console.log('🔧 Testing save system...');
        console.log('  - EventBus connected:', !!systems.save.eventBus);
        console.log('  - StateManager connected:', !!systems.save.stateManager);
        console.log('  - State ship exists:', !!systems.save.stateManager?.state?.ship);
        console.log('  - Current credits:', systems.save.stateManager?.state?.ship?.credits);
    } catch (e) {
        console.error('❌ SaveSystemAdapterFixed failed:', e);
        console.error('Stack trace:', e.stack);
    }
    
    try {
        systems.trading = new TradingSystem();
        await systems.trading.init();
        console.log('✅ TradingSystem initialized');
    } catch (e) {
        console.error('❌ TradingSystem failed:', e);
    }
    
    try {
        systems.shop = new ShopSystem();
        await systems.shop.init();
        console.log('✅ ShopSystem initialized');
    } catch (e) {
        console.error('❌ ShopSystem failed:', e);
    }
    
    try {
        systems.npc = new NPCSystem();
        await systems.npc.init();
        console.log('✅ NPCSystem initialized with full AI');
    } catch (e) {
        console.error('❌ NPCSystem failed:', e);
    }
    
    try {
        systems.targeting = new TargetingSystem();
        await systems.targeting.init();
        console.log('✅ TargetingSystem initialized');
    } catch (e) {
        console.error('❌ TargetingSystem failed:', e);
    }
    
    try {
        systems.debug = new DebugSystem();
        await systems.debug.init();
        console.log('✅ DebugSystem initialized');
    } catch (e) {
        console.error('❌ DebugSystem failed:', e);
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
    console.log('  - shopInventory:', Object.keys(gameDataModule.shopInventory || {}).length || 'MISSING');
    console.log('  - commodities:', Object.keys(gameDataModule.commodities || {}).length || 'MISSING');
    
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
    // Lightweight update profiler (auto-logs on spikes; off by default, auto armed)
    const __updProf = { lastLogTs: 0, cooldownUntil: 0 };
    // Throttle UI_UPDATE to reduce DOM churn; emit at ~8–10Hz
    const __ui = { lastTs: 0, minInterval: 120 };
    const loop = new GameLoop({
        onUpdate: (deltaTime) => {
            const state = stateManager.state;
            
            // Update camera
            state.camera.x = state.ship.x;
            state.camera.y = state.ship.y;
            
            // Update systems
            if (!state.paused) {
                const doProf = !!(typeof window !== 'undefined' && (window.UPDATE_PROF_LOG || window.UPDATE_PROF_OVERLAY));
                const now0 = performance.now ? performance.now() : Date.now();
                let totalMs = 0; const breakdown = {}; let worstK = null, worstV = -1;
                for (const [key, system] of Object.entries(systems)) {
                    if (!system || typeof system.update !== 'function') continue;
                    const t0 = doProf ? (performance.now ? performance.now() : Date.now()) : 0;
                    system.update(state, deltaTime);
                    if (doProf) {
                        const dt = (performance.now ? performance.now() : Date.now()) - t0;
                        breakdown[key] = Number(dt.toFixed(2));
                        totalMs += dt;
                        if (dt > worstV) { worstV = dt; worstK = key; }
                    }
                }
                // Auto arm & log on spikes even without toggles
                try {
                    const th = Number((typeof window !== 'undefined' && window.UPDATE_PROF_T) || 18);
                    const now = performance.now ? performance.now() : Date.now();
                    if (totalMs > th && now >= (__updProf.cooldownUntil||0)) {
                        if (now - (__updProf.lastLogTs||0) > 500) {
                            __updProf.lastLogTs = now;
                            const payload = { updateMs: Number(totalMs.toFixed(2)), worst: { [worstK||'-']: Number((worstV>0?worstV:0).toFixed(2)) }, breakdown };
                            // Keep a copy for later inspection
                            if (typeof window !== 'undefined') window.LAST_UPDATE_PROFILE = payload;
                            try { console.warn('[UpdateProfile]', JSON.parse(JSON.stringify(payload))); } catch(_) { console.warn('[UpdateProfile]', payload); }
                            try {
                                const s = `upd:${payload.updateMs} worst:${worstK||'-'}:${(worstV>0?worstV.toFixed(1):'0')}`;
                                console.warn('[UpdateProfileStr]', s);
                            } catch(_) {}
                        }
                        __updProf.cooldownUntil = now + 3000; // 3s cooldown
                    }
                } catch(_) {}
            }
            
            // Update HUD (throttled)
            try {
                const now = performance.now ? performance.now() : Date.now();
                if (now - (__ui.lastTs||0) >= (__ui.minInterval||120)) {
                    __ui.lastTs = now;
                    eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
                }
            } catch(_) {
                // Fallback if perf API unavailable
                eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            }
        },
        onRender: (interpolation, deltaTime) => {
            if (systems.render && systems.render.render) {
                systems.render.render(stateManager.state, deltaTime);
            }
        },
        onFPS: (stats) => {
            // Forward to DebugSystem via EventBus
            eventBus.emit('debug.fps', stats);
        }
    });
    
    // Check if we loaded a saved game during initialization
    const savedData = localStorage.getItem('galaxyTraderSave');
    if (savedData) {
        try {
            const save = JSON.parse(savedData);
            if (save.ship) {
                // Show a brief notification that save was loaded
                eventBus.emit(GameEvents.UI_MESSAGE, {
                    message: `Save loaded - Credits: ${save.ship.credits}, Kills: ${save.ship.kills}`,
                    type: 'success',
                    duration: 3000
                });
                console.log('[EventBus] Save automatically loaded during initialization');
            }
        } catch (e) {
            console.log('[EventBus] Could not parse save notification:', e);
        }
    }
    
    // Wire up UI buttons
    const departBtn = document.getElementById('departBtn');
    const stationBtn = document.getElementById('stationBtn');
    const tradeBtn = document.getElementById('tradeBtn');
    const outfitterBtn = document.getElementById('outfitterBtn');
    
    if (departBtn) departBtn.onclick = () => eventBus.emit(GameEvents.MENU_CLOSE);
    if (stationBtn) stationBtn.onclick = () => eventBus.emit(GameEvents.MENU_OPEN, { panel: 'landing' });
    if (tradeBtn) tradeBtn.onclick = () => {
        const state = stateManager.state;
        eventBus.emit(GameEvents.MENU_OPEN, { 
            panel: 'trading',
            ship: state.ship,
            commodities: gameDataModule.commodities
        });
    };
    if (outfitterBtn) outfitterBtn.onclick = () => {
        const state = stateManager.state;
        eventBus.emit(GameEvents.MENU_OPEN, { 
            panel: 'shop',
            ship: state.ship,
            shopInventory: gameDataModule.shopInventory
        });
    };
    
    // Start game loop
    loop.start();
    
    // Start first mission
    const state = stateManager.state;
    
    // Initialize tutorial hint for weaponless start
    if (!state.ship.weapons || state.ship.weapons.length === 0) {
        eventBus.emit(GameEvents.TUTORIAL_UPDATE, {
            stage: 'start',
            ship: state.ship
        });
    }
    if (state.missionSystem && state.missionSystem.available.length > 0) {
        state.missionSystem.active = state.missionSystem.available[0];
        eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `New Mission: ${state.missionSystem.active.title}`,
            type: 'info',
            duration: 3000
        });
    }
    
    // Autosave every 30 seconds (idle-coalesced in adapter)
    setInterval(() => {
        const state = stateManager.state;
        if (!state.paused && state.ship.health > 0 && !state.ship.isDestroyed) {
            eventBus.emit(GameEvents.GAME_SAVE, { reason: 'auto' });
        }
    }, 30000);
    
    console.log('[EventBus] 🎉 PURE EVENTBUS ARCHITECTURE DEPLOYED!');
    console.log('[EventBus] All systems use StateManager - no window globals');
    console.log('[EventBus] Controls: W/A/S/D = Move, F = Fire, L = Land, M = Toggle Sound, F5 = Save, F9 = Load, F12 = Clear Save');
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

// Expose globally for debugging
// TODO: Remove in production
window.eventBus = eventBus;
window.stateManager = stateManager;
window.systems = systems;
window.GameEvents = GameEvents;
