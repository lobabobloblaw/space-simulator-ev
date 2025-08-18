import { getEventBus, GameEvents } from './EventBus.js';
import { getStateManager } from './StateManager.js';
import InputSystem from '../systems/InputSystem.js';
import PhysicsSystem from '../systems/PhysicsSystem.js';
import RenderSystem from '../systems/RenderSystem.js';

/**
 * Game - Main orchestrator that coordinates all game systems
 * Manages system lifecycle and game loop
 */
export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Core infrastructure
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Systems (will be initialized in init())
        this.systems = new Map();
        
        // Game loop properties
        this.lastTime = 0;
        this.running = false;
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsTime = 0;
        
        // Bind methods
        this.update = this.update.bind(this);
    }
    
    /**
     * Initialize game systems
     */
    async init() {
        console.log('[Game] Initializing...');
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Initialize systems in dependency order
        await this.initializeSystems();
        
        // Subscribe to global events
        this.subscribeToEvents();
        
        // Load saved game if exists
        if (this.stateManager.loadFromStorage()) {
            console.log('[Game] Loaded saved game');
        } else {
            console.log('[Game] Starting new game');
            this.initializeNewGame();
        }
        
        console.log('[Game] Initialization complete');
    }
    
    /**
     * Initialize all game systems
     */
    async initializeSystems() {
        // Add systems in dependency order
        
        // Input system - handles all user input
        this.systems.set('input', new InputSystem());
        
        // Physics system - handles movement and collisions
        this.systems.set('physics', new PhysicsSystem());
        
        // Render system - handles all visual rendering
        this.systems.set('render', new RenderSystem(this.canvas));
        
        // this.systems.set('audio', new AudioSystem());
        // this.systems.set('ui', new UISystem());
        // this.systems.set('spawn', new SpawnSystem());
        // this.systems.set('weapon', new WeaponSystem());
        
        // Initialize each system
        for (const [name, system] of this.systems) {
            if (system.init) {
                await system.init();
                console.log(`[Game] Initialized ${name} system`);
            }
        }
    }
    
    /**
     * Subscribe to important game events
     */
    subscribeToEvents() {
        // Pause/resume
        this.eventBus.on(GameEvents.GAME_PAUSE, () => {
            this.pause();
        });
        
        this.eventBus.on(GameEvents.GAME_RESUME, () => {
            this.resume();
        });
        
        this.eventBus.on(GameEvents.GAME_PAUSE_TOGGLE, () => {
            if (this.stateManager.state.paused) {
                this.resume();
            } else {
                this.pause();
            }
        });
        
        // Save/load
        this.eventBus.on(GameEvents.GAME_SAVE, () => {
            this.saveGame();
        });
        
        this.eventBus.on(GameEvents.GAME_LOAD, () => {
            this.loadGame();
        });
        
        // System coordination events
        this.eventBus.on(GameEvents.SHIP_DEATH, () => {
            this.handlePlayerDeath();
        });
        
        // Mark input system as migrated when it's initialized
        if (this.systems.has('input')) {
            // Use a one-time listener to mark migration on first input event
            this.eventBus.once(GameEvents.INPUT_KEY_DOWN, () => {
                // Try multiple ways to get migration bridge
                const migrationBridge = window.refactorDebug?.migrationBridge || 
                                       window.migrationBridge || 
                                       (typeof getMigrationBridge !== 'undefined' ? getMigrationBridge() : null);
                                       
                if (migrationBridge && !migrationBridge.isMigrated('input')) {
                    migrationBridge.markMigrated('input');
                    console.log('[Game] Input system marked as migrated');
                }
            });
        }
        
        // Mark physics system as migrated when it's initialized
        if (this.systems.has('physics')) {
            // Mark physics as migrated when first physics event occurs
            this.eventBus.once(GameEvents.PHYSICS_THRUST_CHANGED, () => {
                const migrationBridge = window.refactorDebug?.migrationBridge || 
                                       window.migrationBridge || 
                                       (typeof getMigrationBridge !== 'undefined' ? getMigrationBridge() : null);
                                       
                if (migrationBridge && !migrationBridge.isMigrated('physics')) {
                    migrationBridge.markMigrated('physics');
                    console.log('[Game] Physics system marked as migrated');
                }
            });
        }
        
        // Mark render system as migrated when it's initialized
        if (this.systems.has('render')) {
            // Mark render as migrated immediately since it's always rendering
            setTimeout(() => {
                const migrationBridge = window.refactorDebug?.migrationBridge || 
                                       window.migrationBridge || 
                                       (typeof getMigrationBridge !== 'undefined' ? getMigrationBridge() : null);
                                       
                if (migrationBridge && !migrationBridge.isMigrated('render')) {
                    migrationBridge.markMigrated('render');
                    console.log('[Game] Render system marked as migrated');
                }
            }, 100);
        }
    }
    
    /**
     * Initialize a new game
     */
    initializeNewGame() {
        const state = this.stateManager.state;
        
        // Set initial player position
        state.ship.x = 0;
        state.ship.y = 0;
        state.ship.angle = 0;
        state.ship.health = 100;
        state.ship.credits = 1000;
        
        // Camera follows ship
        state.camera.x = state.ship.x;
        state.camera.y = state.ship.y;
        
        // TODO: Initialize planets, asteroids, etc.
        // This will come from existing initialization code
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (this.running) return;
        
        console.log('[Game] Starting game loop');
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.update);
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        console.log('[Game] Stopping game loop');
        this.running = false;
    }
    
    /**
     * Pause the game
     */
    pause() {
        this.stateManager.state.paused = true;
        console.log('[Game] Paused');
    }
    
    /**
     * Resume the game
     */
    resume() {
        this.stateManager.state.paused = false;
        this.lastTime = performance.now(); // Reset to avoid huge delta
        console.log('[Game] Resumed');
    }
    
    /**
     * Main game loop
     */
    update(currentTime) {
        if (!this.running) return;
        
        // Calculate delta time
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.updateFPS(currentTime);
        
        // Store delta in state for systems to use
        this.stateManager.state.deltaTime = deltaTime;
        this.stateManager.state.gameTime += deltaTime;
        
        // Update all systems if not paused
        if (!this.stateManager.state.paused) {
            this.updateSystems(deltaTime);
        }
        
        // Always render (even when paused to show pause menu)
        this.render(deltaTime);
        
        // Continue loop
        requestAnimationFrame(this.update);
    }
    
    /**
     * Update all game systems
     */
    updateSystems(deltaTime) {
        const state = this.stateManager.state;
        
        // Update systems in order
        for (const [name, system] of this.systems) {
            if (system.update) {
                system.update(state, deltaTime);
            }
        }
        
        // TODO: Call existing update functions until they're migrated
        // This is where we'll temporarily call the old update logic
    }
    
    /**
     * Render the game
     */
    render(deltaTime) {
        // Render via render system
        const renderSystem = this.systems.get('render');
        if (renderSystem) {
            renderSystem.render(this.stateManager.state, deltaTime);
        } else {
            // Fallback: clear canvas if no render system
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // TODO: Call existing render functions until migrated
            // This is where we'll temporarily call the old render logic
        }
    }
    
    /**
     * Update FPS counter
     */
    updateFPS(currentTime) {
        this.frameCount++;
        
        if (currentTime >= this.fpsTime + 1000) {
            this.stateManager.state.fps = Math.round(this.frameCount * 1000 / (currentTime - this.fpsTime));
            this.fpsTime = currentTime;
            this.frameCount = 0;
        }
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath() {
        console.log('[Game] Player died');
        
        // Show death message
        this.eventBus.emit('ui.message', {
            text: 'You have been destroyed!',
            duration: 3000,
            type: 'error'
        });
        
        // Respawn after delay
        setTimeout(() => {
            this.respawnPlayer();
        }, 3000);
    }
    
    /**
     * Respawn the player
     */
    respawnPlayer() {
        const state = this.stateManager.state;
        
        // Reset player state
        state.ship.health = state.ship.maxHealth;
        state.ship.x = 0;
        state.ship.y = 0;
        state.ship.vx = 0;
        state.ship.vy = 0;
        
        // Lose some credits
        state.ship.credits = Math.floor(state.ship.credits * 0.9);
        
        this.eventBus.emit('ship.respawn');
        this.eventBus.emit('ui.message', {
            text: 'Respawned at station',
            duration: 2000,
            type: 'info'
        });
    }
    
    /**
     * Save the game
     */
    saveGame() {
        if (this.stateManager.saveToStorage()) {
            this.eventBus.emit('ui.message', {
                text: 'Game saved',
                duration: 2000,
                type: 'success'
            });
        } else {
            this.eventBus.emit('ui.message', {
                text: 'Failed to save game',
                duration: 2000,
                type: 'error'
            });
        }
    }
    
    /**
     * Load the game
     */
    loadGame() {
        if (this.stateManager.loadFromStorage()) {
            this.eventBus.emit('ui.message', {
                text: 'Game loaded',
                duration: 2000,
                type: 'success'
            });
        } else {
            this.eventBus.emit('ui.message', {
                text: 'No save game found',
                duration: 2000,
                type: 'error'
            });
        }
    }
    
    /**
     * Resize canvas to fit window
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Notify systems of resize
        this.eventBus.emit('canvas.resize', {
            width: this.canvas.width,
            height: this.canvas.height
        });
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.stop();
        
        // Destroy all systems
        for (const [name, system] of this.systems) {
            if (system.destroy) {
                system.destroy();
            }
        }
        
        // Clear event listeners
        this.eventBus.clear();
        
        console.log('[Game] Destroyed');
    }
}

export default Game;
