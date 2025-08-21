import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * InputSystem - Handles all user input (keyboard, mouse, touch)
 * Converts raw input events to game events
 */
export class InputSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Input state
        this.keys = new Set();
        this.mouse = { x: 0, y: 0, pressed: false };
        this.touch = { x: 0, y: 0, active: false, identifier: null };
        
        // Control mapping
        this.keyMap = {
            // Movement
            'w': 'thrust',
            'arrowup': 'thrust',
            'arrowdown': 'brake',
            ' ': 'brake',
            'a': 'turnLeft',
            'arrowleft': 'turnLeft',
            'd': 'turnRight',
            'arrowright': 'turnRight',
            
            // Combat
            'f': 'fire',
            'q': 'switchWeapon',
            
            // Interaction
            'l': 'land',
            'e': 'interact',
            
            // System
            'escape': 'pause',
            'p': 'pause',
            'm': 'toggleSound',
            
            // Debug/Dev
            'tab': 'toggleDebug'
        };
        
        // Touch control zones (for mobile)
        this.touchZones = {
            thrust: { x: 0.1, y: 0.7, w: 0.15, h: 0.2 },
            brake: { x: 0.1, y: 0.5, w: 0.15, h: 0.15 },
            fire: { x: 0.75, y: 0.7, w: 0.15, h: 0.2 },
            land: { x: 0.75, y: 0.5, w: 0.15, h: 0.15 }
        };
        
        // Bound handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        
        console.log('[InputSystem] Created');
    }
    
    /**
     * Initialize the input system
     */
    init() {
        // Attach event listeners
        this.attachListeners();
        
        // Sync initial state
        this.syncState();
        
        console.log('[InputSystem] Initialized');
    }
    
    /**
     * Attach DOM event listeners
     */
    attachListeners() {
        // Keyboard
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Mouse
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.addEventListener('mousedown', this.handleMouseDown);
            canvas.addEventListener('mouseup', this.handleMouseUp);
            canvas.addEventListener('mousemove', this.handleMouseMove);
            canvas.addEventListener('contextmenu', this.handleContextMenu);
            
            // Touch
            canvas.addEventListener('touchstart', this.handleTouchStart);
            canvas.addEventListener('touchend', this.handleTouchEnd);
            canvas.addEventListener('touchmove', this.handleTouchMove);
        }
        
        // Prevent space bar scrolling
        window.addEventListener('keydown', (e) => {
            if (e.key === ' ' && e.target === document.body) {
                e.preventDefault();
            }
        });
    }
    
    /**
     * Handle keyboard down events
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // Ignore if already pressed (key repeat)
        if (this.keys.has(key)) return;
        
        // Add to pressed keys
        this.keys.add(key);
        
        // Get mapped action
        const action = this.keyMap[key];
        
        // Emit specific events based on action
        if (action) {
            switch(action) {
                case 'thrust':
                    this.eventBus.emit(GameEvents.INPUT_THRUST, { active: true });
                    break;
                case 'brake':
                    this.eventBus.emit(GameEvents.INPUT_BRAKE, { active: true });
                    e.preventDefault();
                    break;
                case 'turnLeft':
                    this.eventBus.emit(GameEvents.INPUT_TURN, { direction: -1 });
                    break;
                case 'turnRight':
                    this.eventBus.emit(GameEvents.INPUT_TURN, { direction: 1 });
                    break;
                case 'fire':
                    this.eventBus.emit(GameEvents.INPUT_FIRE, { active: true });
                    break;
                case 'switchWeapon':
                    this.eventBus.emit(GameEvents.INPUT_SWITCH_WEAPON);
                    break;
                case 'land':
                    this.eventBus.emit(GameEvents.INPUT_LAND);
                    break;
                case 'interact':
                    this.eventBus.emit(GameEvents.INPUT_INTERACT);
                    break;
                case 'pause':
                    this.eventBus.emit(GameEvents.GAME_PAUSE_TOGGLE);
                    e.preventDefault();
                    break;
                case 'toggleSound':
                    this.eventBus.emit(GameEvents.AUDIO_TOGGLE);
                    break;
                case 'toggleDebug':
                    this.eventBus.emit(GameEvents.DEBUG_TOGGLE);
                    e.preventDefault();
                    break;
            }
        }
        
        // Special handling for save/load/clear using Function Keys
        // F5 = Quick Save
        if (key === 'f5') {
            e.preventDefault();
            this.eventBus.emit(GameEvents.GAME_SAVE);
        }
        // F9 = Quick Load
        else if (key === 'f9') {
            e.preventDefault();
            this.eventBus.emit(GameEvents.GAME_LOAD);
        }
        // F12 = Clear save (with confirmation)
        else if (key === 'f12') {
            e.preventDefault();
            this.eventBus.emit(GameEvents.GAME_CLEAR_SAVE);
        }
        
        // Emit raw key event for systems that need it
        this.eventBus.emit(GameEvents.INPUT_KEY_DOWN, { key, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, metaKey: e.metaKey });
    }
    
    /**
     * Handle keyboard up events
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        
        // Remove from pressed keys
        this.keys.delete(key);
        
        // Get mapped action
        const action = this.keyMap[key];
        
        // Emit release events for continuous actions
        if (action) {
            switch(action) {
                case 'thrust':
                    this.eventBus.emit(GameEvents.INPUT_THRUST, { active: false });
                    break;
                case 'brake':
                    this.eventBus.emit(GameEvents.INPUT_BRAKE, { active: false });
                    break;
                case 'turnLeft':
                case 'turnRight':
                    // Check if other turn key is still pressed
                    const leftPressed = this.keys.has('a') || this.keys.has('arrowleft');
                    const rightPressed = this.keys.has('d') || this.keys.has('arrowright');
                    const direction = leftPressed ? -1 : (rightPressed ? 1 : 0);
                    this.eventBus.emit(GameEvents.INPUT_TURN, { direction });
                    break;
                case 'fire':
                    this.eventBus.emit(GameEvents.INPUT_FIRE, { active: false });
                    break;
            }
        }
        
        // Emit raw key event
        this.eventBus.emit(GameEvents.INPUT_KEY_UP, { key });
    }
    
    /**
     * Handle mouse down events
     */
    handleMouseDown(e) {
        this.mouse.pressed = true;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        // Fire on left click
        if (e.button === 0) {
            this.eventBus.emit(GameEvents.INPUT_FIRE, { active: true, mouse: true });
        }
        
        // Emit mouse event
        this.eventBus.emit(GameEvents.INPUT_MOUSE_DOWN, {
            x: e.clientX,
            y: e.clientY,
            button: e.button
        });
    }
    
    /**
     * Handle mouse up events
     */
    handleMouseUp(e) {
        this.mouse.pressed = false;
        
        // Stop firing
        if (e.button === 0) {
            this.eventBus.emit(GameEvents.INPUT_FIRE, { active: false, mouse: true });
        }
        
        // Emit mouse event
        this.eventBus.emit(GameEvents.INPUT_MOUSE_UP, {
            x: e.clientX,
            y: e.clientY,
            button: e.button
        });
    }
    
    /**
     * Handle mouse move events
     */
    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        // Emit mouse move for aiming systems
        this.eventBus.emit(GameEvents.INPUT_MOUSE_MOVE, {
            x: e.clientX,
            y: e.clientY,
            pressed: this.mouse.pressed
        });
    }
    
    /**
     * Handle touch start events
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        this.touch.active = true;
        this.touch.x = touch.clientX;
        this.touch.y = touch.clientY;
        this.touch.identifier = touch.identifier;
        
        // Check touch zones
        const zone = this.getTouchZone(touch.clientX, touch.clientY);
        if (zone) {
            this.handleTouchZone(zone, true);
        }
        
        // Emit touch event
        this.eventBus.emit(GameEvents.INPUT_TOUCH_START, {
            x: touch.clientX,
            y: touch.clientY,
            zone
        });
    }
    
    /**
     * Handle touch end events
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        // Find the ended touch
        let endedTouch = null;
        for (let touch of e.changedTouches) {
            if (touch.identifier === this.touch.identifier) {
                endedTouch = touch;
                break;
            }
        }
        
        if (endedTouch) {
            // Check what zone was released
            const zone = this.getTouchZone(endedTouch.clientX, endedTouch.clientY);
            if (zone) {
                this.handleTouchZone(zone, false);
            }
            
            this.touch.active = false;
            this.touch.identifier = null;
            
            // Emit touch event
            this.eventBus.emit(GameEvents.INPUT_TOUCH_END, {
                x: endedTouch.clientX,
                y: endedTouch.clientY,
                zone
            });
        }
    }
    
    /**
     * Handle touch move events
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        const touch = e.touches[0];
        if (touch && touch.identifier === this.touch.identifier) {
            this.touch.x = touch.clientX;
            this.touch.y = touch.clientY;
            
            // Emit touch move for aiming
            this.eventBus.emit(GameEvents.INPUT_TOUCH_MOVE, {
                x: touch.clientX,
                y: touch.clientY
            });
        }
    }
    
    /**
     * Prevent context menu on right click
     */
    handleContextMenu(e) {
        e.preventDefault();
        return false;
    }
    
    /**
     * Get which touch zone was touched
     */
    getTouchZone(x, y) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return null;
        
        // Normalize to 0-1 range
        const nx = x / canvas.width;
        const ny = y / canvas.height;
        
        // Check each zone
        for (const [name, zone] of Object.entries(this.touchZones)) {
            if (nx >= zone.x && nx <= zone.x + zone.w &&
                ny >= zone.y && ny <= zone.y + zone.h) {
                return name;
            }
        }
        
        return null;
    }
    
    /**
     * Handle touch zone activation
     */
    handleTouchZone(zone, active) {
        switch(zone) {
            case 'thrust':
                this.eventBus.emit(GameEvents.INPUT_THRUST, { active });
                break;
            case 'brake':
                this.eventBus.emit(GameEvents.INPUT_BRAKE, { active });
                break;
            case 'fire':
                this.eventBus.emit(GameEvents.INPUT_FIRE, { active });
                break;
            case 'land':
                if (active) {
                    this.eventBus.emit(GameEvents.INPUT_LAND);
                }
                break;
        }
    }
    
    /**
     * Update input system (called each frame)
     */
    update(state, deltaTime) {
        // Sync input state to StateManager
        this.syncState();
        
        // Handle continuous turning based on current keys
        const leftPressed = this.keys.has('a') || this.keys.has('arrowleft');
        const rightPressed = this.keys.has('d') || this.keys.has('arrowright');
        
        if (leftPressed || rightPressed) {
            const direction = leftPressed ? -1 : 1;
            // This is handled by physics system listening to INPUT_TURN events
        }
    }
    
    /**
     * Sync input state to StateManager
     */
    syncState() {
        const inputState = this.stateManager.state.input;
        
        // Sync keys
        inputState.keys = this.keys;
        
        // Sync mouse
        inputState.mouse.x = this.mouse.x;
        inputState.mouse.y = this.mouse.y;
        inputState.mouse.pressed = this.mouse.pressed;
        
        // Sync touch
        inputState.touch.x = this.touch.x;
        inputState.touch.y = this.touch.y;
        inputState.touch.active = this.touch.active;
    }
    
    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(key) {
        return this.keys.has(key.toLowerCase());
    }
    
    /**
     * Check if any of the given keys are pressed
     */
    isAnyKeyPressed(keys) {
        return keys.some(key => this.isKeyPressed(key));
    }
    
    /**
     * Get current input vector for movement
     */
    getMovementVector() {
        const vector = { x: 0, y: 0 };
        
        // Check thrust
        if (this.isAnyKeyPressed(['w', 'arrowup'])) {
            vector.y = 1;
        }
        
        // Check turning
        if (this.isAnyKeyPressed(['a', 'arrowleft'])) {
            vector.x = -1;
        } else if (this.isAnyKeyPressed(['d', 'arrowright'])) {
            vector.x = 1;
        }
        
        return vector;
    }
    
    /**
     * Clean up input system
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            canvas.removeEventListener('mousedown', this.handleMouseDown);
            canvas.removeEventListener('mouseup', this.handleMouseUp);
            canvas.removeEventListener('mousemove', this.handleMouseMove);
            canvas.removeEventListener('contextmenu', this.handleContextMenu);
            canvas.removeEventListener('touchstart', this.handleTouchStart);
            canvas.removeEventListener('touchend', this.handleTouchEnd);
            canvas.removeEventListener('touchmove', this.handleTouchMove);
        }
        
        console.log('[InputSystem] Destroyed');
    }
}

export default InputSystem;