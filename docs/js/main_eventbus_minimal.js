/**
 * Minimal EventBus Main - Simplified for testing
 */

console.log('[Minimal EventBus] Starting...');

// Import only core modules
import { getEventBus, GameEvents } from './core/EventBus.js';
import { getStateManager } from './core/StateManager.js';

console.log('[Minimal EventBus] Modules imported');

// Get instances
const eventBus = getEventBus();
const stateManager = getStateManager();

// Expose globally
window.eventBus = eventBus;
window.stateManager = stateManager;
window.GameEvents = GameEvents;

console.log('[Minimal EventBus] ✅ EventBus deployed!');
console.log('EventBus:', eventBus);
console.log('StateManager:', stateManager);

// Basic initialization
const state = stateManager.getState();
state.game = { isRunning: true };
state.player = { x: 0, y: 0, health: 100 };
state.entities = [];

// Test event
eventBus.on('test', (data) => {
    console.log('Test event received:', data);
});

eventBus.emit('test', { message: 'EventBus is working!' });

console.log('[Minimal EventBus] Initialization complete');

export { eventBus, stateManager };
