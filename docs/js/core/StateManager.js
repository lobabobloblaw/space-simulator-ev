import { getEventBus, GameEvents } from './EventBus.js';

/**
 * @typedef {Object} RenderSettings
 * @property {boolean} [useSprites] Enable ship/NPC sprites
 * @property {boolean} [spriteCulling] Enable gentle culling for NPCs
 * @property {boolean} [useEffectsSprites] Enable effects sprite overlays (thrusters)
 * @property {boolean} [useEffectsSpritesNPC] Enable NPC effects sprite overlays (opt-in)
 * @property {number}  [starDensity] Starfield density multiplier
 */

/**
 * @typedef {Object} DebugState
 * @property {boolean} enabled Debug overlay enabled
 * @property {boolean} drawHitboxes Draw hitboxes
 * @property {boolean} drawVectors Draw vectors
 * @property {boolean} drawNPCInfo Draw NPC info
 * @property {boolean} showParticles Show particles
 * @property {{current:number, average:number, update:number, render:number}} fps FPS stats
 * @property {string} [renderQuality] 'low'|'medium'|'high'
 * @property {boolean} [renderLint] Render lint logging enabled
 * @property {boolean} [renderLintTrace] Include stack traces in lint logs
 * @property {boolean} [renderLintReset] Auto-reset canvas state on lint findings
 */

/**
 * StateManager - Centralized game state management
 * Single source of truth for all game state
 */
export class StateManager {
    constructor() {
        this.eventBus = getEventBus();
        
        // Initialize state structure
        this.state = {
            // Game meta
            paused: false,
            gameTime: 0,
            deltaTime: 0,
            fps: 60,
            
            // Player ship
            // initShip() in main_eventbus_pure.js builds the authoritative boot
            // ship (this skeleton is overwritten wholesale at startup)
            ship: {
                x: 0,
                y: 0,
                angle: 0,
                vx: 0,
                vy: 0,
                health: 100,
                maxHealth: 100,
                shield: 0,
                maxShield: 0,
                credits: 250,
                cargo: [],
                weapons: [],
                currentWeapon: 0,
                kills: 0,
                pirateKills: 0,
                missionKills: 0,
                hasWarning: false,
                isHostileToPatrols: false
            },
            
            // Camera
            camera: {
                x: 0,
                y: 0,
                zoom: 1
            },
            
            // Input state
            input: {
                keys: new Set(),
                mouse: { x: 0, y: 0, pressed: false },
                touch: { active: false, x: 0, y: 0 }
            },
            
            // Entities
            planets: [],
            asteroids: [],
            npcShips: [],
            projectiles: [],
            explosions: [],
            particles: [],
            
            // UI state
            ui: {
                currentMenu: null,
                messages: [],
                landingMenuOpen: false,
                shopMenuOpen: false,
                missionMenuOpen: false
            },

            // Game systems
            currentPlanet: null,
            currentMission: null,
            reputation: {
                trader: 0,
                pirate: 0,
                patrol: 0
            },

            // Diagnostics (frame timing, save stats) - moved from window globals
            diagnostics: {
                lastFrameMs: 0,
                lastSaveSizeBytes: 0,
                lastSaveSizeKB: 0
            }
        };

        // Create proxies for nested objects to track changes
        this.createStateProxy();
    }
    
    /**
     * Create proxy to automatically emit events on state changes
     */
    createStateProxy() {
        const createProxy = (obj, path = '') => {
            return new Proxy(obj, {
                set: (target, property, value) => {
                    const oldValue = target[property];
                    target[property] = value;
                    
                    // Create full path for the property
                    const fullPath = path ? `${path}.${property}` : property;
                    
                    // Emit state change event
                    this.eventBus.emit('state.change', {
                        path: fullPath,
                        oldValue,
                        newValue: value
                    });
                    
                    // Emit specific events for important changes
                    this.emitSpecificEvents(fullPath, value, oldValue);
                    
                    return true;
                },
                get: (target, property) => {
                    const value = target[property];
                    // Don't proxy Sets, Maps, Arrays, or other special objects
                    if (typeof value === 'object' && 
                        value !== null && 
                        !Array.isArray(value) &&
                        !(value instanceof Set) &&
                        !(value instanceof Map) &&
                        !(value instanceof Date) &&
                        !(value instanceof RegExp)) {
                        const fullPath = path ? `${path}.${property}` : property;
                        return createProxy(value, fullPath);
                    }
                    return value;
                }
            });
        };
        
        this.state = createProxy(this.state);
    }
    
    /**
     * Emit specific game events based on state changes
     */
    emitSpecificEvents(path, newValue, oldValue) {
        // Only emit on actual changes; no-op writes (e.g. paused = false when
        // already false) must not re-fire events or handlers that set state
        // in response would recurse forever.
        if (newValue === oldValue) return;
        switch(path) {
            case 'ship.health':
                if (newValue < oldValue) {
                    this.eventBus.emit(GameEvents.SHIP_DAMAGE, {
                        damage: oldValue - newValue,
                        health: newValue
                    });
                }
                if (newValue <= 0 && oldValue > 0) {
                    this.eventBus.emit(GameEvents.SHIP_DEATH);
                }
                break;
                
            case 'ship.credits':
                this.eventBus.emit(GameEvents.CREDITS_CHANGE, {
                    oldAmount: oldValue,
                    newAmount: newValue,
                    change: newValue - oldValue
                });
                break;
                
            case 'paused':
                this.eventBus.emit(newValue ? GameEvents.GAME_PAUSE : GameEvents.GAME_RESUME);
                break;
        }
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton StateManager instance
 * @returns {StateManager}
 */
export function getStateManager() {
    if (!instance) {
        instance = new StateManager();
    }
    return instance;
}

export default StateManager;
