import { getEventBus, GameEvents } from './EventBus.js';
import { getStateManager } from './StateManager.js';

/**
 * MigrationBridge - Connects new architecture with existing code
 * Allows gradual migration without breaking the game
 */
export class MigrationBridge {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Store references to old global objects
        this.oldGlobals = {};
        
        // Track what's been migrated
        this.migrated = new Set();
    }
    
    /**
     * Initialize bridge with existing game objects
     */
    init() {
        console.log('[MigrationBridge] Initializing...');
        
        // Capture existing globals
        this.captureGlobals();
        
        // Sync state with existing globals
        this.syncStateFromGlobals();
        
        // Set up bidirectional sync
        this.setupStateSync();
        
        // Bridge existing functions to events
        this.bridgeExistingFunctions();
        
        console.log('[MigrationBridge] Ready');
    }
    
    /**
     * Capture references to existing global objects
     */
    captureGlobals() {
        // Store references to existing globals
        if (window.ship) this.oldGlobals.ship = window.ship;
        if (window.npcShips) this.oldGlobals.npcShips = window.npcShips;
        if (window.projectiles) this.oldGlobals.projectiles = window.projectiles;
        if (window.explosions) this.oldGlobals.explosions = window.explosions;
        if (window.planets) this.oldGlobals.planets = window.planets;
        if (window.asteroids) this.oldGlobals.asteroids = window.asteroids;
        if (window.camera) this.oldGlobals.camera = window.camera;
        if (window.keys) this.oldGlobals.keys = window.keys;
        if (window.currentPlanet) this.oldGlobals.currentPlanet = window.currentPlanet;
        if (window.currentMission) this.oldGlobals.currentMission = window.currentMission;
    }
    
    /**
     * Sync StateManager with existing globals
     */
    syncStateFromGlobals() {
        const state = this.stateManager.state;
        
        // Sync ship state
        if (this.oldGlobals.ship) {
            Object.assign(state.ship, this.oldGlobals.ship);
        }
        
        // Sync entity arrays
        if (this.oldGlobals.npcShips) state.npcShips = this.oldGlobals.npcShips;
        if (this.oldGlobals.projectiles) state.projectiles = this.oldGlobals.projectiles;
        if (this.oldGlobals.explosions) state.explosions = this.oldGlobals.explosions;
        if (this.oldGlobals.planets) state.planets = this.oldGlobals.planets;
        if (this.oldGlobals.asteroids) state.asteroids = this.oldGlobals.asteroids;
        
        // Sync camera
        if (this.oldGlobals.camera) {
            Object.assign(state.camera, this.oldGlobals.camera);
        }
        
        // Sync other state
        if (this.oldGlobals.currentPlanet) state.currentPlanet = this.oldGlobals.currentPlanet;
        if (this.oldGlobals.currentMission) state.currentMission = this.oldGlobals.currentMission;
    }
    
    /**
     * Set up bidirectional sync between old globals and StateManager
     */
    setupStateSync() {
        const state = this.stateManager.state;
        
        // Create proxies for old globals that sync to StateManager
        if (window.ship) {
            window.ship = new Proxy(state.ship, {
                set: (target, property, value) => {
                    target[property] = value;
                    // Old code can still modify window.ship
                    return true;
                },
                get: (target, property) => {
                    return target[property];
                }
            });
        }
        
        // Point array references to state arrays
        if (window.npcShips) window.npcShips = state.npcShips;
        if (window.projectiles) window.projectiles = state.projectiles;
        if (window.explosions) window.explosions = state.explosions;
        if (window.planets) window.planets = state.planets;
        if (window.asteroids) window.asteroids = state.asteroids;
        
        // Sync camera
        if (window.camera) {
            window.camera = new Proxy(state.camera, {
                set: (target, property, value) => {
                    target[property] = value;
                    return true;
                },
                get: (target, property) => {
                    return target[property];
                }
            });
        }
        
        // Sync keys to input state
        if (window.keys) {
            window.keys = state.input.keys;
        }
    }
    
    /**
     * Bridge existing functions to emit events
     */
    bridgeExistingFunctions() {
        // Bridge damage function
        if (window.damageShip) {
            const originalDamage = window.damageShip;
            window.damageShip = (ship, damage, source) => {
                // Call original
                originalDamage(ship, damage, source);
                
                // Emit event if player ship
                if (ship === window.ship) {
                    this.eventBus.emit(GameEvents.SHIP_DAMAGE, {
                        damage,
                        source,
                        health: ship.health
                    });
                }
            };
        }
        
        // Bridge explosion creation
        if (window.createExplosion) {
            const originalCreate = window.createExplosion;
            window.createExplosion = (x, y, size, color) => {
                // Call original
                originalCreate(x, y, size, color);
                
                // Emit event
                this.eventBus.emit(GameEvents.EXPLOSION, { x, y, size, color });
            };
        }
        
        // Bridge save/load
        if (window.saveGame) {
            const originalSave = window.saveGame;
            window.saveGame = () => {
                // Use new save system
                this.stateManager.saveToStorage();
                // Call original for compatibility
                originalSave();
            };
        }
        
        if (window.loadGame) {
            const originalLoad = window.loadGame;
            window.loadGame = () => {
                // Use new load system
                this.stateManager.loadFromStorage();
                // Call original for compatibility
                originalLoad();
            };
        }
    }
    
    /**
     * Mark a system as migrated
     */
    markMigrated(systemName) {
        this.migrated.add(systemName);
        console.log(`[MigrationBridge] System '${systemName}' migrated to new architecture`);
    }
    
    /**
     * Check if a system has been migrated
     */
    isMigrated(systemName) {
        return this.migrated.has(systemName);
    }
    
    /**
     * Get migration status
     */
    getStatus() {
        const systems = [
            'input', 'physics', 'render', 'audio', 
            'ui', 'weapons', 'spawn', 'save'
        ];
        
        const status = {
            migrated: Array.from(this.migrated),
            pending: systems.filter(s => !this.migrated.has(s)),
            progress: Math.round((this.migrated.size / systems.length) * 100)
        };
        
        return status;
    }
    
    /**
     * Call old update function if not migrated
     */
    callOldUpdate(deltaTime) {
        // Call old update functions for non-migrated systems
        if (!this.isMigrated('physics') && window.updatePhysics) {
            window.updatePhysics(deltaTime);
        }
        
        if (!this.isMigrated('spawn') && window.updateSpawns) {
            window.updateSpawns(deltaTime);
        }
        
        if (!this.isMigrated('weapons') && window.updateProjectiles) {
            window.updateProjectiles(deltaTime);
        }
        
        if (!this.isMigrated('explosions') && window.updateExplosions) {
            window.updateExplosions(deltaTime);
        }
        
        if (!this.isMigrated('npc') && window.updateNPCs) {
            window.updateNPCs(deltaTime);
        }
    }
    
    /**
     * Call old render function if not migrated
     */
    callOldRender(ctx) {
        if (!this.isMigrated('render') && window.render) {
            window.render(ctx);
        }
    }
    
    /**
     * Clean up bridge when fully migrated
     */
    cleanup() {
        // Restore original globals if needed
        Object.entries(this.oldGlobals).forEach(([key, value]) => {
            if (window[key] === undefined) {
                window[key] = value;
            }
        });
        
        console.log('[MigrationBridge] Cleaned up');
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton MigrationBridge instance
 * @returns {MigrationBridge}
 */
export function getMigrationBridge() {
    if (!instance) {
        instance = new MigrationBridge();
    }
    return instance;
}

export default MigrationBridge;
