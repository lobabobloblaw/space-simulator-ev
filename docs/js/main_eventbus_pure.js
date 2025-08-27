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

// Arm a LongTask observer as early as possible when LT_TRACE is enabled
try {
    if (typeof window !== 'undefined') {
        const qs = window.location.search || '';
        if (/(?:^|[?&])lt=1(?:&|$)/.test(qs)) window.LT_TRACE = true;
    }
    if (typeof window !== 'undefined' && window.LT_TRACE && 'PerformanceObserver' in window && !window.__earlyLTObs) {
        const obs = new PerformanceObserver((list) => {
            for (const e of list.getEntries() || []) {
                window.__LAST_LONGTASK_TS = e.startTime || performance.now();
                window.__LAST_LONGTASK_DUR = e.duration || 0;
            }
        });
        obs.observe({ type: 'longtask', buffered: true });
        window.__earlyLTObs = obs;
    }
} catch(_) {}

// Get singletons
const eventBus = getEventBus();
const stateManager = getStateManager();

// Systems container
const systems = {};

// ---- initializeGameState() helper splits (no behavior changes) ----
async function loadGameData() {
    let planetsData = [], missionsData = [];
    try {
        console.log('[EventBus] Attempting to import gameData.js...');
        const gameDataModule = await import('./data/gameData.js');
        planetsData = gameDataModule.planets || [];
        missionsData = gameDataModule.missions || [];
        console.log('[EventBus] Game data imported. Planets:', planetsData.length, 'Missions:', missionsData.length);
        if (!planetsData.length) console.error('[EventBus] WARNING: No planets in imported data!');
    } catch (e) {
        console.error('[EventBus] Failed to import game data:', e);
        console.error('[EventBus] Using empty arrays as fallback');
    }
    return { planetsData, missionsData };
}

function loadSaveOrDefaults(state) {
    const skipSave = /(?:^|[?&])(fresh|nosave)=1(?:&|$)/.test(window.location.search || '');
    const savedData = skipSave ? null : localStorage.getItem('galaxyTraderSave');
    let shipData = null, missionData = null;
    if (savedData) {
        try {
            const save = JSON.parse(savedData);
            shipData = save.ship || null;
            missionData = save.missionSystem || null;
            console.log('[EventBus] Found save during init - loading credits:', shipData?.credits);
            state.__loadedFromSave = true;
        } catch (e) {
            console.log('[EventBus] Invalid save data, using defaults:', e);
        }
    } else {
        console.log('[EventBus] No save found - using defaults');
    }
    return { shipData, missionData };
}

function initShip(state, shipData) {
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
        credits: shipData?.credits ?? 250,
        tutorialStage: shipData?.tutorialStage ?? 'start',
        size: shipData?.size ?? 8,
        isLanded: false,
        landedPlanet: null,
        landingCooldown: 0,
        class: shipData?.class ?? 'shuttle',
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
    state.ship.faction = state.ship.faction || 'civilian';
    // Player-only sprite override (keeps NPC mappings unchanged). Respects saved spriteId.
    try { if (!state.ship.spriteId) state.ship.spriteId = 'ships/shuttle_1'; } catch(_) {}
    state.camera = { x: 0, y: 0 };
    state.paused = false;
    state.gameTime = 0;
    console.log('[EventBus] Ship initialized with credits:', state.ship.credits);
}

function seedNPCs(state, planetsData) {
    state.npcShips = [];
    const initialNPCCount = 3 + Math.floor(Math.random() * 3);
    const npcTypes = ['trader', 'freighter', 'patrol', 'pirate'];
    const npcTemplates = {
        freighter: { size: 18, color: '#4488ff', maxSpeed: 0.25, thrust: 0.002, turnSpeed: 0.008, health: 80, maxHealth: 80, credits: 100, behavior: 'passive', weapon: { type: 'laser', damage: 5, cooldown: 30 } },
        trader: { size: 12, color: '#44ff88', maxSpeed: 0.35, thrust: 0.003, turnSpeed: 0.01, health: 60, maxHealth: 60, credits: 75, behavior: 'passive', weapon: null },
        patrol: { size: 14, color: '#8888ff', maxSpeed: 0.45, thrust: 0.004, turnSpeed: 0.012, health: 100, maxHealth: 100, credits: 50, behavior: 'lawful', weapon: { type: 'rapid', damage: 7, cooldown: 9 } },
        pirate: { size: 10, color: '#ff4444', maxSpeed: 0.5, thrust: 0.005, turnSpeed: 0.015, health: 70, maxHealth: 70, credits: 150, behavior: 'aggressive', weapon: { type: 'plasma', damage: 15, cooldown: 26 } }
    };
    state.nextEntityId = state.nextEntityId || 1;
    for (let i = 0; i < initialNPCCount; i++) {
        const type = npcTypes[Math.floor(Math.random() * npcTypes.length)];
        const template = npcTemplates[type];
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 700;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const velAngle = Math.random() * Math.PI * 2;
        const speed = template.maxSpeed * (0.3 + Math.random() * 0.4);
        const vx = Math.cos(velAngle) * speed;
        const vy = Math.sin(velAngle) * speed;
        let targetPlanet = null;
        if ((type === 'trader' || type === 'freighter') && planetsData.length > 0) {
            targetPlanet = planetsData[Math.floor(Math.random() * planetsData.length)];
        }
        state.npcShips.push({
            id: state.nextEntityId++, x, y, vx, vy,
            angle: Math.atan2(vy, vx), type, ...template,
            faction: (type === 'patrol') ? 'patrol' : (type === 'pirate') ? 'pirate' : 'trader',
            targetPlanet, weaponCooldown: Math.random() * 30, lifetime: Math.floor(Math.random() * 300), thrusting: false,
            state: type === 'patrol' ? 'patrolling' : null
        });
    }
    console.log(`[EventBus] Spawned ${initialNPCCount} initial NPCs already in system`);
}

function initAsteroids(state) {
    state.asteroids = [];
    state.projectiles = [];
    state.explosions = [];
    state.warpEffects = [];
    state.pickups = [];
    for (let i = 0; i < 50; i++) {
        const shapePoints = [];
        for (let j = 0; j < 8; j++) shapePoints.push(0.7 + Math.random() * 0.6);
        state.asteroids.push({
            x: (Math.random() - 0.5) * 4000,
            y: (Math.random() - 0.5) * 4000,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            radius: Math.random() * 8 + 2,
            color: '#666',
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            rotation: Math.random() * Math.PI * 2,
            health: 20, maxHealth: 20,
            oreContent: Math.floor(Math.random() * 3) + 1,
            shapePoints
        });
    }
}

function initStars(state) {
    const STAR_DENSITY = 2.0;
    state.renderSettings = state.renderSettings || {};
    state.renderSettings.starDensity = STAR_DENSITY;
    state.renderSettings.useSprites = state.renderSettings.useSprites ?? true;
    try {
        const persistedCull = localStorage.getItem('gt.render.spriteCulling');
        if (persistedCull !== null) state.renderSettings.spriteCulling = (persistedCull === 'true');
        else state.renderSettings.spriteCulling = state.renderSettings.spriteCulling || false;
        const persistedFX = localStorage.getItem('gt.render.useEffectsSprites');
        if (persistedFX !== null) state.renderSettings.useEffectsSprites = (persistedFX === 'true');
        else state.renderSettings.useEffectsSprites = state.renderSettings.useEffectsSprites || false;
        const persistedFXNPC = localStorage.getItem('gt.render.useEffectsSpritesNPC');
        if (persistedFXNPC !== null) state.renderSettings.useEffectsSpritesNPC = (persistedFXNPC === 'true');
        else state.renderSettings.useEffectsSpritesNPC = state.renderSettings.useEffectsSpritesNPC || false;
    } catch(_) {
        state.renderSettings.spriteCulling = state.renderSettings.spriteCulling || false;
        state.renderSettings.useEffectsSprites = state.renderSettings.useEffectsSprites || false;
        state.renderSettings.useEffectsSpritesNPC = state.renderSettings.useEffectsSpritesNPC || false;
    }
    state.stars = { far: [], mid: [], near: [] };
    for (let i = 0; i < Math.floor(3000 * STAR_DENSITY); i++) {
        state.stars.far.push({
            x: (Math.random() - 0.5) * 12000,
            y: (Math.random() - 0.5) * 12000,
            brightness: Math.random() * 0.5 + 0.3,
            size: Math.random() < 0.95 ? 1 : 2,
            color: Math.random() < 0.94 ? '#ffffff' : (Math.random() < 0.5 ? '#ffeeee' : (Math.random() < 0.7 ? '#eeeeff' : '#ffffee'))
        });
    }
    for (let i = 0; i < Math.floor(1200 * STAR_DENSITY); i++) {
        state.stars.mid.push({
            x: (Math.random() - 0.5) * 8000,
            y: (Math.random() - 0.5) * 8000,
            brightness: Math.random() * 0.6 + 0.4,
            size: Math.random() < 0.9 ? 1 : 2,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.01 + Math.random() * 0.03,
            color: Math.random() < 0.92 ? '#ffffff' : (Math.random() < 0.6 ? '#ffeeee' : '#eeeeff')
        });
    }
    for (let i = 0; i < Math.floor(600 * STAR_DENSITY); i++) {
        state.stars.near.push({
            x: (Math.random() - 0.5) * 6000,
            y: (Math.random() - 0.5) * 6000,
            brightness: Math.random() * 0.7 + 0.5,
            size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
            color: '#ffffff'
        });
    }
}

function initMissions(state, missionsData, missionData) {
    state.missionSystem = {
        active: missionData?.active ?? null,
        completed: missionData?.completed ?? [],
        available: missionData?.available ?? missionsData
    };
}

function initOtherState(state) {
    state.reputation = state.reputation || { trader: 0, patrol: 0, pirate: 0 };
    state.npcSpawnState = { nextShipSpawn: Date.now() + Math.random() * 3000 + 2000 };
    state.audio = { enabled: false, masterVolume: 0.3, musicVolume: 0.6 };
    state.input = { keys: new Set(), mouse: { x: 0, y: 0, pressed: false }, touch: { x: 0, y: 0, active: false } };
    state.physics = { entities: [], collisions: [] };
    state.audioSystem = null;
}

/**
 * Initialize complete game state in StateManager (orchestrates helpers)
 */
async function initializeGameState() {
    const state = stateManager.state;
    console.log('[EventBus] initializeGameState called');
    const { planetsData, missionsData } = await loadGameData();
    const { shipData, missionData } = loadSaveOrDefaults(state);
    initShip(state, shipData);
    state.planets = planetsData;
    console.log('[EventBus] Assigned planets to state:', state.planets?.length);
    seedNPCs(state, planetsData);
    initAsteroids(state);
    initStars(state);
    initMissions(state, missionsData, missionData);
    initOtherState(state);
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
        state.ship.deathSeq = { start: now, duration: (GameConstants?.SHIP?.DESTRUCT_SEQUENCE_MS ?? 600) };
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
                duration: (GameConstants?.UI?.NOTIF_SHIP_DESTROYED_MS ?? 5000)
            });
        }, 600);
    });
    
    // Landing handling
    eventBus.on(GameEvents.INPUT_LAND, () => {
        const state = stateManager.state;
        
        for (let planet of state.planets) {
            const dx = state.ship.x - planet.x;
            const dy = state.ship.y - planet.y;
            const rr = (planet.radius + (GameConstants?.SHIP?.LANDING_DISTANCE ?? 50));
            if ((dx*dx + dy*dy) < rr * rr && planet.landable) {
                state.ship.vx = 0;
                state.ship.vy = 0;
                state.ship.isLanded = true;
                state.ship.landedPlanet = planet;
                state.ship.currentPlanet = planet;
                state.ship.landingCooldown = (GameConstants?.SHIP?.LANDING_COOLDOWN ?? 60);
                
                state.npcShips = [];
                state.projectiles = [];
                
                state.ship.fuel = state.ship.maxFuel;
                state.ship.health = state.ship.maxHealth;
                state.ship.credits += 50;
                
                const angle = Math.atan2(dy, dx);
                const posOff = (GameConstants?.SHIP?.LANDING_POS_OFFSET ?? 40);
                state.ship.x = planet.x + Math.cos(angle) * (planet.radius + posOff);
                state.ship.y = planet.y + Math.sin(angle) * (planet.radius + posOff);
                
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
                duration: (GameConstants?.UI?.NOTIF_WEAPON_SWITCH_MS ?? 1000)
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
                eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Reputation +1 (Patrol)', type: 'info', duration: (GameConstants?.UI?.NOTIF_REPUTATION_MS ?? 1200) });
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
    ship.landingCooldown = (GameConstants?.SHIP?.RESPAWN_LANDING_COOLDOWN ?? 30);
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
        const useWebGL = (typeof window !== 'undefined') && (
            !!window.RENDER_WEBGL ||
            /(?:^|[?&])webgl=1(?:&|$)/.test(window.location.search || '') ||
            (typeof localStorage !== 'undefined' && localStorage.getItem('RENDER_WEBGL') === '1')
        );
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
    // Wire overlay logo + version (CSP-safe)
    try {
        const overlay = document.getElementById('logoOverlay');
        const img = document.getElementById('logo-overlay-img');
        const ver = document.getElementById('gameVersion');
        if (ver) {
            const v = (GameConstants?.META?.VERSION) || '';
            ver.textContent = v ? `v${v}` : '';
        }
        if (overlay) overlay.style.display = 'flex'; // always show overlay so version text is visible
        if (img) {
            const setImgVis = () => {
                try {
                    if (img.naturalWidth > 0) { img.style.display = 'block'; }
                    else { img.style.display = 'none'; }
                } catch(_) {}
            };
            setImgVis();
            img.addEventListener('load', setImgVis, { once: true });
            img.addEventListener('error', () => { try { img.style.display = 'none'; } catch(_) {} }, { once: true });
        }
    } catch(_) {}
    
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
    // Throttle UI_UPDATE to reduce DOM churn; emit at ~8–10Hz with adaptive backoff
    const __ui = { lastTs: 0, minInterval: 120, backoffUntil: 0, lastCost: 0 };
    // Optional: UI long-task guard (armed via window.UI_LONG_GUARD). On first use, installs a LongTask observer
    const __uiLT = { armed: false };
    // Optional: basic mark ring buffer for LongTask attribution (armed via window.LT_TRACE)
    const __marks = { list: [], cap: 256 };
    const mark = (label) => {
        try {
            if (!(typeof window !== 'undefined' && window.LT_TRACE)) return;
            const t = performance.now ? performance.now() : Date.now();
            __marks.list.push({ t, l: String(label) });
            if (__marks.list.length > __marks.cap) __marks.list.splice(0, __marks.list.length - __marks.cap);
        } catch(_) {}
    };
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
                    mark('u:' + key);
                    const t0 = doProf ? (performance.now ? performance.now() : Date.now()) : 0;
                    system.update(state, deltaTime);
                    mark('u:' + key + ':done');
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
            
            // Update HUD (throttled, light-frame gated, adaptive backoff)
            try {
                const now = performance.now ? performance.now() : Date.now();
                // Allow runtime override of UI update throttle and disabling
                try { if (typeof window !== 'undefined' && Number(window.UI_UPDATE_MS)) __ui.minInterval = Math.max(60, Number(window.UI_UPDATE_MS)); } catch(_) {}
                const uiDisabled = !!(typeof window !== 'undefined' && window.UI_DISABLE_UPDATE);
                // If guard requested, arm a LongTask observer once and consult recent activity before emitting UI updates
                try {
                    if (typeof window !== 'undefined' && (window.UI_LONG_GUARD || window.LT_TRACE) && !__uiLT.armed && 'PerformanceObserver' in window) {
                        const obs = new PerformanceObserver((list) => {
                            for (const e of list.getEntries() || []) {
                                // record ts/dur for latest longtask
                                window.__LAST_LONGTASK_TS = e.startTime || performance.now();
                                window.__LAST_LONGTASK_DUR = e.duration || 0;
                                // If LT tracing enabled, dump recent marks within ~500ms of start
                                try {
                                    if (window.LT_TRACE) {
                                        const cut = (e.startTime || (performance.now?performance.now():Date.now())) - 500;
                                        const recent = __marks.list.filter(m => m.t >= cut && m.t <= ((e.startTime||0) + 5)).map(m => m.l);
                                        const payload = {
                                            ts: Number(((e.startTime||0).toFixed?.(1)) || e.startTime || 0),
                                            dur: Number(((e.duration||0).toFixed?.(1)) || e.duration || 0),
                                            lastFrameMs: Number((((window.__lastFrameMs)||0).toFixed?.(1)) || (window.__lastFrameMs||0)),
                                            lastUiMs: Number((((window.LAST_UI_UPDATE_COST_MS)||0).toFixed?.(1)) || (window.LAST_UI_UPDATE_COST_MS||0)),
                                            recent
                                        };
                                        try { window.LAST_LTTRACE = payload; } catch(_) {}
                                        // Log a compact, expandable, and a joined recent string for quick scanning
                                        console.warn('[LTTrace]', payload);
                                        try { console.warn('[LTTraceStr]', recent.join(' -> ')); } catch(_) {}
                                    }
                                } catch(_) {}
                            }
                        });
                        obs.observe({ type: 'longtask', buffered: true });
                        __uiLT.armed = true;
                        window.__uiLTObs = obs;
                    }
                } catch(_) {}
                if (!uiDisabled) {
                    // Skip if last render frame was heavy to avoid compounding jank
                    const lastFrameMs = (typeof window !== 'undefined' && window.__lastFrameMs) ? window.__lastFrameMs : 0;
                    const heavyFrame = lastFrameMs > 24; // ~40fps budget miss
                    // Optional long-task presence guard: skip UI emission briefly after a long task
                    const lastLT = (typeof window !== 'undefined' && window.__LAST_LONGTASK_TS) ? window.__LAST_LONGTASK_TS : 0;
                    const recentLongTask = lastLT && (now - lastLT) < 260; // ~quarter second cooldown after a long task
                    // Adaptive backoff if prior UI emission was costly (> 24ms)
                    const inBackoff = now < (__ui.backoffUntil || 0);
                    const baseInterval = __ui.minInterval || 120;
                    const interval = inBackoff ? Math.max(baseInterval, 300) : baseInterval;
                    if (!heavyFrame && !recentLongTask && now - (__ui.lastTs || 0) >= interval) {
                        __ui.lastTs = now;
                        let t0 = 0;
                        try { t0 = performance.now ? performance.now() : Date.now(); } catch(_) {}
                        mark('ui:emit');
                        eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
                        try {
                            const dt = (performance.now ? performance.now() : Date.now()) - t0;
                            __ui.lastCost = dt;
                            // If UI work was heavy, extend backoff window briefly
                            if (dt > 24) {
                                __ui.backoffUntil = (performance.now ? performance.now() : Date.now()) + 4000; // 4s
                                try {
                                    if (typeof window !== 'undefined' && window.UI_PROF_WARN) {
                                        console.warn('[UIProfile]', { costMs: Number(dt.toFixed(2)), heavyFrame, interval, backoffUntil: __ui.backoffUntil });
                                    }
                                } catch(_) {}
                            }
                            // Always expose last UI cost for QA
                            if (typeof window !== 'undefined') {
                                window.LAST_UI_UPDATE_COST_MS = dt;
                                window.LAST_UI_UPDATE_TS = (performance.now ? performance.now() : Date.now());
                            }
                        } catch(_) {}
                        mark('ui:emit:done');
                    }
                }
            } catch(_) {
                // Fallback if perf API unavailable
                eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            }
        },
        onRender: (interpolation, deltaTime) => {
            if (systems.render && systems.render.render) {
                mark('r:start');
                systems.render.render(stateManager.state, deltaTime);
                mark('r:end');
            }
        },
        onFPS: (stats) => {
            // Forward to DebugSystem via EventBus
            eventBus.emit('debug.fps', stats);
        }
    });
    
    // Notify if we loaded a saved game during initialization (no re-parse)
    try {
        const st = stateManager.state;
        if (st && st.__loadedFromSave) {
            eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Save loaded - Credits: ${st.ship?.credits ?? 0}, Kills: ${st.ship?.kills ?? 0}`,
                type: 'success',
                duration: 3000
            });
            console.log('[EventBus] Save automatically loaded during initialization');
        }
    } catch(_) {}
    
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
    
    // Autosave (idle/light gated in adapter). QA controls:
    //  - window.SAVE_DISABLED = true (skip)
    //  - window.SAVE_INTERVAL_MS (default 30000)
    //  - window.SAVE_FIRST_DELAY_MS (default 120000)
    const __SAVE_DISABLED = !!(typeof window !== 'undefined' && window.SAVE_DISABLED);
    const __SAVE_IVL = (typeof window !== 'undefined' && Number(window.SAVE_INTERVAL_MS)) || 30000;
    const __SAVE_FIRST = (typeof window !== 'undefined' && Number(window.SAVE_FIRST_DELAY_MS)) || 120000;
    if (!__SAVE_DISABLED && __SAVE_IVL > 0) {
        setTimeout(() => {
            // Fire and then schedule interval to keep cadence predictable
            const tick = () => {
                const state = stateManager.state;
                if (!state.paused && state.ship.health > 0 && !state.ship.isDestroyed) {
                    mark('save:tick');
                    eventBus.emit(GameEvents.GAME_SAVE, { reason: 'auto' });
                }
            };
            tick();
            setInterval(tick, __SAVE_IVL);
        }, __SAVE_FIRST);
    }
    
    console.log('[EventBus] 🎉 PURE EVENTBUS ARCHITECTURE DEPLOYED!');
    console.log('[EventBus] All systems use StateManager - no window globals');
    console.log('[EventBus] Controls: W/A/S/D = Move, F = Fire, L = Land, M = Toggle Sound, F5 = Save, F9 = Load, F12 = Clear Save');
}

// Handle window resize
window.addEventListener('resize', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        // Emit CSS pixel dimensions; RenderSystem will size backing stores by DPR
        let reserve = 150;
        try { const root = document.documentElement; const rs = getComputedStyle(root).getPropertyValue('--hud-reserve').trim(); reserve = parseInt(rs || '150', 10) || 150; } catch(_) {}
        eventBus.emit('canvas.resize', {
            width: window.innerWidth,
            height: window.innerHeight - reserve
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
