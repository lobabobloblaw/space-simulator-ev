/**
 * Save/Load System for Galaxy Trader - EventBus Compatible
 * Handles game state persistence using StateManager and EventBus
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

export class SaveSystemEventBus {
    constructor() {
        this.SAVE_KEY = 'galaxyTraderSave';
        this.AUTOSAVE_KEY = 'galaxyTraderAutosave';
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
    }

    async init() {
        // Listen for save/load events
        this.eventBus.on(GameEvents.GAME_SAVE, () => this.saveGame());
        this.eventBus.on(GameEvents.GAME_LOAD, () => this.loadGame());
        
        console.log('[SaveSystemEventBus] Initialized with EventBus integration');
    }

    /**
     * Save the current game state from StateManager
     */
    saveGame() {
        try {
            const state = this.stateManager.state;
            
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                ship: {
                    x: state.ship.x,
                    y: state.ship.y,
                    vx: state.ship.vx,
                    vy: state.ship.vy,
                    angle: state.ship.angle,
                    fuel: state.ship.fuel,
                    credits: state.ship.credits,
                    health: state.ship.health,
                    shield: state.ship.shield,
                    cargo: state.ship.cargo,
                    weapons: state.ship.weapons,
                    currentWeapon: state.ship.currentWeapon,
                    kills: state.ship.kills,
                    engineLevel: state.ship.engineLevel,
                    weaponLevel: state.ship.weaponLevel,
                    maxShield: state.ship.maxShield,
                    cargoCapacity: state.ship.cargoCapacity,
                    tutorialStage: state.ship.tutorialStage
                },
                mission: {
                    activeId: state.missionSystem?.active?.id || null,
                    completed: state.missionSystem?.completed || []
                },
                npcs: state.npcShips.map(npc => ({
                    x: npc.x,
                    y: npc.y,
                    type: npc.type,
                    health: npc.health
                })),
                asteroids: state.asteroids.map(ast => ({
                    x: ast.x,
                    y: ast.y,
                    health: ast.health,
                    oreContent: ast.oreContent,
                    radius: ast.radius
                })),
                pickups: state.pickups.map(p => ({
                    x: p.x,
                    y: p.y,
                    type: p.type,
                    value: p.value
                }))
            };

            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            this.showMessage('GAME SAVED', 'success');
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            this.showMessage('SAVE FAILED', 'error');
            return false;
        }
    }

    /**
     * Load a saved game state into StateManager
     */
    loadGame() {
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (!saveData) {
                this.showMessage('NO SAVE FOUND', 'error');
                return false;
            }

            const data = JSON.parse(saveData);
            const state = this.stateManager.state;
            
            // Restore ship state
            Object.assign(state.ship, data.ship);
            state.ship.isLanded = false;
            state.ship.landedPlanet = null;
            
            // Restore mission state
            if (state.missionSystem) {
                state.missionSystem.completed = data.mission.completed || [];
                if (data.mission.activeId) {
                    state.missionSystem.active = state.missionSystem.available.find(m => m.id === data.mission.activeId) || null;
                }
            }
            
            // Clear existing entities
            state.npcShips.length = 0;
            state.projectiles.length = 0;
            
            // Restore asteroids
            state.asteroids.length = 0;
            if (data.asteroids) {
                data.asteroids.forEach(astData => {
                    state.asteroids.push({
                        ...astData,
                        vx: (Math.random() - 0.5) * 0.3,
                        vy: (Math.random() - 0.5) * 0.3,
                        color: "#666",
                        rotationSpeed: (Math.random() - 0.5) * 0.02,
                        rotation: Math.random() * Math.PI * 2,
                        maxHealth: 20,
                        shapePoints: Array.from({length: 8}, () => 0.7 + Math.random() * 0.6)
                    });
                });
            }
            
            // Restore pickups
            state.pickups.length = 0;
            if (data.pickups) {
                data.pickups.forEach(p => state.pickups.push({...p}));
            }
            
            // Update camera
            state.camera.x = state.ship.x;
            state.camera.y = state.ship.y;
            
            this.showMessage('GAME LOADED', 'success');
            
            // Emit events for other systems to respond
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.showMessage('LOAD FAILED', 'error');
            return false;
        }
    }

    /**
     * Check if a save exists
     */
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }

    /**
     * Show a temporary message to the player
     */
    showMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `game-notification ${type}`;
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4a4' : type === 'error' ? '#f44' : '#44a'};
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            z-index: 10000;
            transition: opacity 0.3s;
        `;
        msg.textContent = text.toUpperCase();
        document.body.appendChild(msg);
        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 300);
        }, 2200);
    }
}
