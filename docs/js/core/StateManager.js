import { getEventBus, GameEvents } from './EventBus.js';

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
                credits: 1000,
                cargo: [],
                weapons: [],
                currentWeaponIndex: 0,
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
    
    /**
     * Get current state or a specific path
     * @param {string} path - Dot-notation path (e.g., 'ship.health')
     * @returns {any} State value
     */
    get(path = null) {
        if (!path) return this.state;
        
        const keys = path.split('.');
        let value = this.state;
        
        for (const key of keys) {
            value = value[key];
            if (value === undefined) return undefined;
        }
        
        return value;
    }
    
    /**
     * Set state value at path
     * @param {string} path - Dot-notation path
     * @param {any} value - New value
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;
        
        for (const key of keys) {
            if (!target[key]) target[key] = {};
            target = target[key];
        }
        
        target[lastKey] = value;
    }
    
    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with paths and values
     */
    update(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value);
        });
    }
    
    /**
     * Reset state to defaults
     * @param {string} section - Optional section to reset (e.g., 'ship')
     */
    reset(section = null) {
        if (section) {
            // Reset specific section
            // Implementation depends on having default values stored
            console.warn(`Reset for section ${section} not yet implemented`);
        } else {
            // Full reset would reinitialize everything
            this.constructor.call(this);
        }
    }
    
    /**
     * Add an entity to a collection
     * @param {string} collection - Collection name (e.g., 'npcShips')
     * @param {Object} entity - Entity to add
     */
    addEntity(collection, entity) {
        if (Array.isArray(this.state[collection])) {
            this.state[collection].push(entity);
            
            // Emit specific spawn events
            if (collection === 'npcShips') {
                this.eventBus.emit(GameEvents.NPC_SPAWN, entity);
            }
        }
    }
    
    /**
     * Remove an entity from a collection
     * @param {string} collection - Collection name
     * @param {Object|Function} entityOrPredicate - Entity or filter function
     */
    removeEntity(collection, entityOrPredicate) {
        if (!Array.isArray(this.state[collection])) return;
        
        const index = typeof entityOrPredicate === 'function'
            ? this.state[collection].findIndex(entityOrPredicate)
            : this.state[collection].indexOf(entityOrPredicate);
            
        if (index !== -1) {
            const removed = this.state[collection].splice(index, 1)[0];
            
            // Emit specific death events
            if (collection === 'npcShips') {
                this.eventBus.emit(GameEvents.NPC_DEATH, removed);
            }
            
            return removed;
        }
    }
    
    /**
     * Save current state to localStorage
     */
    saveToStorage() {
        try {
            const saveData = {
                ship: this.state.ship,
                reputation: this.state.reputation,
                gameTime: this.state.gameTime
            };
            localStorage.setItem('galaxyTraderSave', JSON.stringify(saveData));
            this.eventBus.emit(GameEvents.GAME_SAVE);
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }
    
    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            const saveData = localStorage.getItem('galaxyTraderSave');
            if (saveData) {
                const data = JSON.parse(saveData);
                this.update({
                    'ship': { ...this.state.ship, ...data.ship },
                    'reputation': { ...this.state.reputation, ...data.reputation },
                    'gameTime': data.gameTime || 0
                });
                this.eventBus.emit(GameEvents.GAME_LOAD);
                return true;
            }
        } catch (error) {
            console.error('Failed to load game:', error);
        }
        return false;
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
