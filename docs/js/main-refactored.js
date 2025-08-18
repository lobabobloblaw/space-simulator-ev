/**
 * main-refactored.js - New entry point using modular architecture
 * Gradually replaces main.js while maintaining compatibility
 */

import Game from './core/Game.js';
import { getMigrationBridge } from './core/MigrationBridge.js';
import { getEventBus, GameEvents } from './core/EventBus.js';
import { getStateManager } from './core/StateManager.js';

// Global instances
let game = null;
let migrationBridge = null;

/**
 * Initialize the game
 */
async function init() {
    console.log('=== Galaxy Trader - Initializing New Architecture ===');
    
    // Get canvas
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    // Initialize core systems
    const eventBus = getEventBus();
    const stateManager = getStateManager();
    migrationBridge = getMigrationBridge();
    
    // Enable event debugging in development
    if (window.location.hostname === 'localhost') {
        eventBus.debug = true;
    }
    
    // Create game instance
    game = new Game(canvas);
    
    // NOW prevent the old game loop from starting (after globals are set)
    window.preventOldInit = true;
    
    // Initialize migration bridge BEFORE game init
    // This ensures old code is connected to new architecture
    migrationBridge.init();
    
    // Override the old game loop with new architecture
    overrideOldGameLoop();
    
    // Initialize the game
    await game.init();
    
    // Input is now handled by InputSystem
    // Just set up UI event handlers
    setupUIHandlers();
    
    // Start the game
    game.start();
    
    // Log migration status
    console.log('Migration Status:', migrationBridge.getStatus());
    
    // Expose for debugging
    if (window.location.hostname === 'localhost') {
        window.gameDebug = {
            game,
            eventBus,
            stateManager,
            migrationBridge,
            
            // Helpers
            emit: (event, data) => eventBus.emit(event, data),
            getState: (path) => stateManager.get(path),
            setState: (path, value) => stateManager.set(path, value),
            migrationStatus: () => migrationBridge.getStatus()
        };
        
        console.log('Debug tools available at window.gameDebug');
    }
}

/**
 * Override old game loop to use new architecture
 */
function overrideOldGameLoop() {
    // Prevent old main.js from starting its own loop
    if (window.gameLoop) {
        cancelAnimationFrame(window.gameLoop);
        window.gameLoop = null;
    }
    
    // Override the old update function
    if (window.update) {
        const oldUpdate = window.update;
        window.update = function(deltaTime) {
            // New systems update through Game class
            // Old systems update through migration bridge
            migrationBridge.callOldUpdate(deltaTime);
        };
    }
    
    // Override the old render function
    if (window.render) {
        const oldRender = window.render;
        window.render = function(ctx) {
            // New systems render through Game class
            // Old systems render through migration bridge
            migrationBridge.callOldRender(ctx);
        };
    }
}

// Input handling has been moved to InputSystem.js
// The InputSystem is initialized by Game.js and handles all input events

/**
 * Set up UI event handlers
 */
function setupUIHandlers() {
    const eventBus = getEventBus();
    
    // Listen for UI messages
    eventBus.on(GameEvents.UI_MESSAGE, (data) => {
        // This will be handled by UISystem when migrated
        // For now, call old message display if it exists
        if (window.showMessage) {
            window.showMessage(data.text, data.duration, data.type);
        }
    });
    
    // Listen for menu events
    eventBus.on(GameEvents.MENU_OPEN, (menuType) => {
        console.log(`Opening ${menuType} menu`);
    });
    
    eventBus.on(GameEvents.MENU_CLOSE, (menuType) => {
        console.log(`Closing ${menuType} menu`);
    });
}

// Wait for DOM and old code to load, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[main-refactored] DOM loaded, waiting for old code...');
        // Give old main.js time to set up globals
        setTimeout(() => {
            console.log('[main-refactored] Initializing after delay...');
            init().catch(error => {
                console.error('[main-refactored] Init error:', error);
            });
        }, 500);  // Increased delay
    });
} else {
    // DOM already loaded, init after delay for old code
    console.log('[main-refactored] DOM already loaded, waiting for old code...');
    setTimeout(() => {
        console.log('[main-refactored] Initializing after delay...');
        init().catch(error => {
            console.error('[main-refactored] Init error:', error);
        });
    }, 500);  // Increased delay
}

// DO NOT prevent old init immediately - we need globals to be set up first!
// The init() function will set this flag after capturing the old state

export { game, migrationBridge };
