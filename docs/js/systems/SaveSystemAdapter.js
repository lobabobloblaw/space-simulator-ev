/**
 * SaveSystemAdapter - Bridges SaveSystem with EventBus architecture
 * Handles GAME_SAVE and GAME_LOAD events
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { SaveSystem } from './SaveSystem.js';

export class SaveSystemAdapter {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.saveSystem = new SaveSystem();
        
        // Bind event handlers
        this.handleSave = this.handleSave.bind(this);
        this.handleLoad = this.handleLoad.bind(this);
        
        console.log('[SaveSystemAdapter] Created');
    }
    
    /**
     * Initialize the adapter
     */
    init() {
        // Subscribe to save/load events
        this.eventBus.on(GameEvents.GAME_SAVE, this.handleSave);
        this.eventBus.on(GameEvents.GAME_LOAD, this.handleLoad);
        
        console.log('[SaveSystemAdapter] Initialized - Save/Load connected to EventBus');
        console.log('[SaveSystemAdapter] Listening for GAME_SAVE and GAME_LOAD events');
    }
    
    /**
     * Handle save event
     */
    handleSave() {
        console.log('[SaveSystemAdapter] handleSave called');
        const state = this.stateManager.state;
        
        // Create compatibility objects for SaveSystem
        const game = {
            camera: state.camera
        };
        
        const missionSystem = state.missionSystem;
        
        // Call the original SaveSystem method
        const success = this.saveSystem.saveGame(
            state.ship,
            game,
            missionSystem,
            state.npcShips,
            state.asteroids,
            state.pickups
        );
        
        if (success) {
            console.log('[SaveSystemAdapter] Game saved successfully');
        }
    }
    
    /**
     * Handle load event
     */
    handleLoad() {
        console.log('[SaveSystemAdapter] handleLoad called');
        try {
            const saveData = localStorage.getItem('galaxyTraderSave');
            if (!saveData) {
                console.log('[SaveSystemAdapter] No save data found');
                this.saveSystem.showMessage('NO SAVE FOUND', 'error');
                return false;
            }
            console.log('[SaveSystemAdapter] Save data found, loading...');

            const data = JSON.parse(saveData);
            const state = this.stateManager.state;
            
            // Directly update ship state in StateManager
            Object.keys(data.ship).forEach(key => {
                state.ship[key] = data.ship[key];
            });
            state.ship.isLanded = false;
            state.ship.landedPlanet = null;
            
            // Restore mission state
            state.missionSystem.completed = data.mission.completed || [];
            if (data.mission.activeId) {
                state.missionSystem.active = state.missionSystem.available.find(m => m.id === data.mission.activeId) || null;
            }
            
            // Clear and restore NPCs (empty for fresh spawn)
            state.npcShips.length = 0;
            
            // Restore asteroids
            state.asteroids.length = 0;
            if (data.asteroids) {
                data.asteroids.forEach(astData => {
                    state.asteroids.push({
                        ...astData,
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: (Math.random() - 0.5) * 0.3,
                        radius: astData.radius || Math.random() * 8 + 2,
                        color: "#666",
                        rotationSpeed: (Math.random() - 0.5) * 0.02,
                        maxHealth: 20
                    });
                });
            }
            
            // Restore pickups
            state.pickups.length = 0;
            if (data.pickups) {
                data.pickups.forEach(p => state.pickups.push({...p}));
            }
            
            // Update camera to ship position
            state.camera.x = state.ship.x;
            state.camera.y = state.ship.y;
            
            this.saveSystem.showMessage('GAME LOADED', 'success');
            console.log('[SaveSystemAdapter] Game loaded successfully');
            console.log('[SaveSystemAdapter] Ship credits after load:', state.ship.credits);
            console.log('[SaveSystemAdapter] Ship hull after load:', state.ship.health);
            
            // Notify other systems that game was loaded
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            
            return true;
        } catch (e) {
            console.error('[SaveSystemAdapter] Load failed:', e);
            this.saveSystem.showMessage('LOAD FAILED', 'error');
            return false;
        }
    }
    
    /**
     * Check if save exists
     */
    hasSave() {
        return this.saveSystem.hasSave();
    }
    
    /**
     * Destroy the adapter
     */
    destroy() {
        this.eventBus.off(GameEvents.GAME_SAVE, this.handleSave);
        this.eventBus.off(GameEvents.GAME_LOAD, this.handleLoad);
        
        console.log('[SaveSystemAdapter] Destroyed');
    }
}

export default SaveSystemAdapter;
