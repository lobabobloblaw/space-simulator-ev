/**
 * Save/Load System for Galaxy Trader
 * Handles game state persistence using localStorage
 */

export class SaveSystem {
    constructor() {
        this.SAVE_KEY = 'galaxyTraderSave';
        this.AUTOSAVE_KEY = 'galaxyTraderAutosave';
    }

    /**
     * Save the current game state
     */
    saveGame(ship, game, missionSystem, npcShips, asteroids, pickups) {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                ship: {
                    x: ship.x,
                    y: ship.y,
                    vx: ship.vx,
                    vy: ship.vy,
                    angle: ship.angle,
                    fuel: ship.fuel,
                    credits: ship.credits,
                    health: ship.health,
                    shield: ship.shield,
                    cargo: ship.cargo,
                    weapons: ship.weapons,
                    currentWeapon: ship.currentWeapon,
                    kills: ship.kills,
                    engineLevel: ship.engineLevel,
                    weaponLevel: ship.weaponLevel,
                    maxShield: ship.maxShield,
                    cargoCapacity: ship.cargoCapacity,
                    tutorialStage: ship.tutorialStage
                },
                mission: {
                    activeId: missionSystem.active?.id || null,
                    completed: missionSystem.completed
                },
                npcs: npcShips.map(npc => ({
                    x: npc.x,
                    y: npc.y,
                    type: npc.type,
                    health: npc.health
                })),
                asteroids: asteroids.map(ast => ({
                    x: ast.x,
                    y: ast.y,
                    health: ast.health,
                    oreContent: ast.oreContent
                })),
                pickups: pickups.map(p => ({
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
     * Load a saved game state
     */
    loadGame(ship, game, missionSystem, missions, npcShips, asteroids, pickups) {
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (!saveData) {
                this.showMessage('NO SAVE FOUND', 'error');
                return false;
            }

            const data = JSON.parse(saveData);
            
            // Restore ship state
            Object.assign(ship, data.ship);
            ship.isLanded = false;
            ship.landedPlanet = null;
            
            // Restore mission state
            missionSystem.completed = data.mission.completed || [];
            if (data.mission.activeId) {
                missionSystem.active = missions.find(m => m.id === data.mission.activeId) || null;
            }
            
            // Clear and restore NPCs
            npcShips.length = 0;
            data.npcs.forEach(npcData => {
                npcShips.push({
                    ...npcData,
                    vx: 0,
                    vy: 0,
                    angle: Math.random() * Math.PI * 2,
                    size: 10,
                    maxHealth: 100,
                    behavior: npcData.type === 'pirate' ? 'aggressive' : 'passive',
                    color: this.getNPCColor(npcData.type),
                    thrusting: false
                });
            });
            
            // Restore asteroids
            asteroids.length = 0;
            data.asteroids.forEach(astData => {
                asteroids.push({
                    ...astData,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 8 + 2,
                    color: "#666",
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    maxHealth: 20
                });
            });
            
            // Restore pickups
            pickups.length = 0;
            data.pickups.forEach(p => pickups.push({...p}));
            
            // Update camera
            game.camera.x = ship.x;
            game.camera.y = ship.y;
            
            this.showMessage('GAME LOADED', 'success');
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            this.showMessage('LOAD FAILED', 'error');
            return false;
        }
    }

    /**
     * Auto-save the game
     */
    autoSave(ship, game, missionSystem, npcShips, asteroids, pickups) {
        try {
            const saveData = {
                version: '1.0',
                timestamp: Date.now(),
                ship: {
                    x: ship.x,
                    y: ship.y,
                    vx: ship.vx,
                    vy: ship.vy,
                    angle: ship.angle,
                    fuel: ship.fuel,
                    credits: ship.credits,
                    health: ship.health,
                    shield: ship.shield,
                    cargo: ship.cargo,
                    weapons: ship.weapons,
                    currentWeapon: ship.currentWeapon,
                    kills: ship.kills,
                    engineLevel: ship.engineLevel,
                    weaponLevel: ship.weaponLevel,
                    maxShield: ship.maxShield,
                    cargoCapacity: ship.cargoCapacity,
                    tutorialStage: ship.tutorialStage
                },
                mission: {
                    activeId: missionSystem.active?.id || null,
                    completed: missionSystem.completed
                }
            };

            localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Autosave failed:', e);
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
     * Check if autosave exists
     */
    hasAutoSave() {
        return localStorage.getItem(this.AUTOSAVE_KEY) !== null;
    }

    /**
     * Delete save data
     */
    deleteSave() {
        localStorage.removeItem(this.SAVE_KEY);
        this.showMessage('SAVE DELETED', 'info');
    }

    /**
     * Get NPC color by type
     */
    getNPCColor(type) {
        const colors = {
            pirate: '#f44',
            patrol: '#4a90e2',
            trader: '#4a4',
            freighter: '#888'
        };
        return colors[type] || '#888';
    }

    /**
     * Show a temporary message to the player
     */
    showMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.className = `game-notification ${type}`;
        msg.textContent = text.toUpperCase();
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);
    }
}