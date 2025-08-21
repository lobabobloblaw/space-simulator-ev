/**
 * EventBus - Central event system for loose coupling between game systems
 * Enables publish/subscribe pattern for game events
 */
export class EventBus {
    constructor() {
        this.events = new Map();
        this.debug = false; // Set true to log all events
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (e.g., 'ship.damage', 'game.pause')
     * @param {Function} callback - Function to call when event fires
     * @param {Object} context - Optional 'this' context for callback
     * @returns {Function} Unsubscribe function
     */
    on(event, callback, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const listener = { callback, context };
        this.events.get(event).push(listener);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} callback - Function to call when event fires
     * @param {Object} context - Optional 'this' context
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            callback.apply(context, args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper, context);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     */
    off(event, callback) {
        if (!this.events.has(event)) return;
        
        const listeners = this.events.get(event);
        const index = listeners.findIndex(l => l.callback === callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        
        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     */
    emit(event, ...args) {
        if (this.debug) {
            console.log(`[EventBus] ${event}`, ...args);
        }
        
        if (!this.events.has(event)) return;
        
        const listeners = this.events.get(event).slice(); // Copy to avoid mutation issues
        listeners.forEach(listener => {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`[EventBus] Error in listener for ${event}:`, error);
            }
        });
    }

    /**
     * Clear all event listeners for a specific event or all events
     * @param {string} event - Optional event name (clears all if not provided)
     */
    clear(event = null) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get list of all registered events
     * @returns {Array<string>} Event names
     */
    getEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    getListenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton EventBus instance
 * @returns {EventBus}
 */
export function getEventBus() {
    if (!instance) {
        instance = new EventBus();
    }
    return instance;
}

// Common game events (documentation)
export const GameEvents = {
    // Ship events
    SHIP_DAMAGE: 'ship.damage',
    SHIP_DEATH: 'ship.death',
    SHIP_RESPAWN: 'ship.respawn',
    SHIP_UPGRADE: 'ship.upgrade',
    SHIP_LANDED: 'ship.landed',
    SHIP_THRUST: 'ship.thrust',
    
    // Combat events
    PROJECTILE_HIT: 'combat.projectile.hit',
    WEAPON_FIRE: 'combat.weapon.fire',
    WEAPON_FIRED: 'combat.weapon.fired',
    EXPLOSION: 'combat.explosion',
    ENTITY_DESTROYED: 'combat.entity.destroyed',
    SHIELD_HIT: 'combat.shield.hit',
    
    // NPC events
    NPC_SPAWN: 'npc.spawn',
    NPC_DEATH: 'npc.death',
    NPC_HOSTILE: 'npc.hostile',
    NPC_DESTROYED: 'npc.destroyed',
    PATROL_WARNING: 'npc.patrol.warning',
    PATROL_STAND_DOWN: 'npc.patrol.standDown',
    PATROL_ASSIST: 'npc.patrol.assist',
    PROJECTILE_FIRED: 'combat.projectile.fired',
    EXPLOSION_CREATED: 'combat.explosion.created',
    WARP_EFFECT_CREATED: 'warp.effect.created',
    
    // Economy events
    TRADE_COMPLETE: 'economy.trade.complete',
    CREDITS_CHANGE: 'economy.credits.change',
    
    // Game state events
    GAME_PAUSE: 'game.pause',
    GAME_RESUME: 'game.resume',
    GAME_PAUSE_TOGGLE: 'game.pauseToggle',
    GAME_SAVE: 'game.save',
    GAME_LOAD: 'game.load',
    GAME_CLEAR_SAVE: 'game.clearSave',
    
    // Input events - Raw
    INPUT_KEY_DOWN: 'input.keyDown',
    INPUT_KEY_UP: 'input.keyUp',
    INPUT_MOUSE_DOWN: 'input.mouseDown',
    INPUT_MOUSE_UP: 'input.mouseUp',
    INPUT_MOUSE_MOVE: 'input.mouseMove',
    INPUT_TOUCH_START: 'input.touchStart',
    INPUT_TOUCH_END: 'input.touchEnd',
    INPUT_TOUCH_MOVE: 'input.touchMove',
    
    // Input events - Actions
    INPUT_THRUST: 'input.thrust',
    INPUT_BRAKE: 'input.brake',
    INPUT_TURN: 'input.turn',
    INPUT_FIRE: 'input.fire',
    INPUT_SWITCH_WEAPON: 'input.switchWeapon',
    INPUT_LAND: 'input.land',
    INPUT_INTERACT: 'input.interact',
    
    // UI events
    UI_MESSAGE: 'ui.message',
    UI_UPDATE: 'ui.update',
    MENU_OPEN: 'ui.menu.open',
    MENU_CLOSE: 'ui.menu.close',
    TUTORIAL_UPDATE: 'ui.tutorial.update',
    
    
    // Audio events
    AUDIO_TOGGLE: 'audio.toggle',
    AUDIO_PLAY: 'audio.play',
    AUDIO_STATE_CHANGED: 'audio.state.changed',
    // Music/Radio events
    AUDIO_MUSIC_TOGGLE: 'audio.music.toggle',
    AUDIO_MUSIC_PLAY: 'audio.music.play',
    AUDIO_MUSIC_PAUSE: 'audio.music.pause',
    AUDIO_MUSIC_NEXT: 'audio.music.next',
    AUDIO_MUSIC_PREV: 'audio.music.prev',
    AUDIO_MUSIC_VOLUME: 'audio.music.volume',
    AUDIO_MUSIC_STATE: 'audio.music.state',
    
    // Debug events
    DEBUG_TOGGLE: 'debug.toggle',
    
    // Reputation events
    REPUTATION_CHANGED: 'reputation.changed',
    
    // Physics events
    PICKUP_COLLECTED: 'physics.pickup.collected',
    PHYSICS_THRUST_CHANGED: 'physics.thrust.changed',
    PHYSICS_BRAKE_CHANGED: 'physics.brake.changed',
    PHYSICS_TURN_CHANGED: 'physics.turn.changed',
    PHYSICS_SHIP_THRUSTING: 'physics.ship.thrusting',
    PHYSICS_SHIP_TAKEOFF: 'physics.ship.takeoff',
    PHYSICS_COLLISION: 'physics.collision',
    PHYSICS_PROJECTILE_HIT: 'physics.projectile.hit',
    PHYSICS_PROJECTILE_EXPIRED: 'physics.projectile.expired',
    PHYSICS_PICKUP_COLLECTED: 'physics.pickup.collected',
    PHYSICS_PICKUP_EXPIRED: 'physics.pickup.expired',
    PHYSICS_IMPULSE_APPLIED: 'physics.impulse.applied'
};
