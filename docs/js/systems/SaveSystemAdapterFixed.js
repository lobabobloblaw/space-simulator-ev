/**
 * SaveSystemAdapter - Nuclear Option Fix
 * Forces state persistence by reloading after save operations
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

export class SaveSystemAdapterFixed {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.SAVE_KEY = 'galaxyTraderSave';
        this.LOAD_PENDING_KEY = 'galaxyTraderLoadPending';
        this.SAVE_MAX_NPCS = 40; // cap payload to avoid long JSON tasks
        this._saveScheduled = false;
        this._savePending = false;
        
        // Bind event handlers
        this.handleSave = this.handleSave.bind(this);
        this.handleLoad = this.handleLoad.bind(this);
        this.handleClearSave = this.handleClearSave.bind(this);
        this.clearConfirmPending = false;
        
        console.log('[SaveSystemAdapterFixed] Created - Nuclear reload version');
    }

    // Safely copy only known ship fields; prevent prototype pollution
    _assignShipSafe(target, source) {
        try {
            if (!source || typeof source !== 'object') return;
            const dangerous = new Set(['__proto__', 'prototype', 'constructor']);
            const allowed = new Set([
                'x','y','vx','vy','angle',
                'fuel','credits','health','shield','maxShield',
                'cargo','weapons','currentWeapon',
                'kills','engineLevel','weaponLevel','radarLevel',
                'cargoCapacity','tutorialStage',
                // optional UI/flags we might persist later
                'isLanded','landedPlanet','landingCooldown','class'
            ]);
            for (const key of Object.keys(source)) {
                if (dangerous.has(key) || !allowed.has(key)) continue;
                const val = source[key];
                // Minimal type sanity where cheap
                if ((key === 'cargo' || key === 'weapons') && !Array.isArray(val)) continue;
                target[key] = val;
            }
        } catch(_) {}
    }
    
    /**
     * Initialize the adapter
     */
    init() {
        // Check if we need to apply a pending load
        if (localStorage.getItem(this.LOAD_PENDING_KEY) === 'true') {
            console.log('[SaveSystemAdapterFixed] Applying pending load...');
            localStorage.removeItem(this.LOAD_PENDING_KEY);
            
            // Apply the saved state immediately
            setTimeout(() => {
                this.applyLoadedState();
            }, 100);
        }
        
        // Subscribe to save/load/clear events
        this.eventBus.on(GameEvents.GAME_SAVE, this.handleSave);
        this.eventBus.on(GameEvents.GAME_LOAD, this.handleLoad);
        this.eventBus.on(GameEvents.GAME_CLEAR_SAVE, this.handleClearSave);
        
        console.log('[SaveSystemAdapterFixed] Initialized');
    }
    
    /**
     * Handle save event
     */
    handleSave(data = null) {
        try { if (typeof window !== 'undefined' && window.DEBUG_SAVE) console.log('[SaveSystemAdapterFixed] SAVE triggered'); } catch(_) {}
        // Coalesce autosaves; run off the critical path during idle time
        if (this._saveScheduled) { this._savePending = true; return true; }
        this._saveScheduled = true;
        const run = () => {
            try {
                const payload = this._buildSaveData();
                // JSON + setItem can be a long task; do it here (idle/fallback timeout)
                const json = JSON.stringify(payload);
                localStorage.setItem(this.SAVE_KEY, json);
                // QA: compute save size (bytes/KB) for optional HUD display
                try {
                    const bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(json).length : (json.length * 2);
                    if (typeof window !== 'undefined') {
                        window.LAST_SAVE_SIZE_BYTES = bytes;
                        window.LAST_SAVE_SIZE_KB = Number((bytes / 1024).toFixed(1));
                    }
                } catch(_) {}
                // Only show toast for manual saves
                const reason = (data && data.reason) || 'manual';
                if (reason !== 'auto') this.showMessage('GAME SAVED', 'success');
                try { if (typeof window !== 'undefined' && window.DEBUG_SAVE) console.log('[SaveSystemAdapterFixed] Saved - Credits:', payload.ship.credits, 'reason:', reason); } catch(_) {}
            } catch (e) {
                console.error('[SaveSystemAdapterFixed] Save failed:', e);
                this.showMessage('SAVE FAILED', 'error');
            } finally {
                this._saveScheduled = false;
                if (this._savePending) { this._savePending = false; this.handleSave(); }
            }
        };
        try {
            // Prefer requestIdleCallback to minimize contention with rAF
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(run, { timeout: 2000 });
            } else {
                // Soft defer to reduce overlap with rAF/render
                setTimeout(run, 300);
            }
        } catch(_) { setTimeout(run, 300); }
        return true;
    }

    _buildSaveData() {
        const state = this.stateManager.state;
        // Trim large arrays to keep payloads small and stable
        const npcList = (state.npcShips || []).slice(0, this.SAVE_MAX_NPCS);
        return {
            version: '6.0',
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
                cargo: state.ship.cargo || [],
                weapons: state.ship.weapons || [],
                currentWeapon: state.ship.currentWeapon || 0,
                kills: state.ship.kills || 0,
                engineLevel: state.ship.engineLevel || 1,
                weaponLevel: state.ship.weaponLevel || 1,
                radarLevel: state.ship.radarLevel || 0,
                maxShield: state.ship.maxShield || 0,
                cargoCapacity: state.ship.cargoCapacity || 10,
                tutorialStage: state.ship.tutorialStage || 'start'
            },
            reputation: state.reputation || { trader: 0, patrol: 0, pirate: 0 },
            mission: {
                activeId: state.missionSystem?.active?.id || null,
                completed: state.missionSystem?.completed || []
            },
            npcs: npcList.map(npc => ({
                x: npc.x,
                y: npc.y,
                vx: npc.vx,
                vy: npc.vy,
                angle: npc.angle,
                type: npc.type,
                size: npc.size,
                health: npc.health,
                maxHealth: npc.maxHealth,
                behavior: npc.behavior,
                credits: npc.credits,
                cargo: npc.cargo,
                weapons: npc.weapons,
                currentWeapon: npc.currentWeapon,
                faction: npc.faction,
                personality: npc.personality,
                homeStation: npc.homeStation
            })),
            asteroids: (state.asteroids || []).slice(0, 20).map(ast => ({
                x: ast.x,
                y: ast.y,
                vx: ast.vx,
                vy: ast.vy,
                health: ast.health,
                oreContent: ast.oreContent,
                radius: ast.radius
            })),
            pickups: (state.pickups || []).map(p => ({ x: p.x, y: p.y, type: p.type, value: p.value }))
        };
    }
    
    /**
     * Handle load event - Nuclear option: reload the page
     */
    handleLoad() {
        console.log('[SaveSystemAdapterFixed] LOAD triggered - using nuclear reload');
        
        const saveData = localStorage.getItem(this.SAVE_KEY);
        if (!saveData) {
            this.showMessage('NO SAVE FOUND', 'error');
            return false;
        }
        
        // Set flag to apply load after reload
        localStorage.setItem(this.LOAD_PENDING_KEY, 'true');
        
        // Show message
        this.showMessage('LOADING...', 'info');
        
        // Reload the page after a brief delay
        setTimeout(() => {
            window.location.reload();
        }, 500);
        
        return true;
    }
    
    /**
     * Apply loaded state after page reload
     */
    applyLoadedState() {
        console.log('[SaveSystemAdapterFixed] Applying loaded state after reload');
        
        try {
            const saveData = localStorage.getItem(this.SAVE_KEY);
            if (!saveData) {
                console.log('[SaveSystemAdapterFixed] No save data found');
                return false;
            }
            
            const data = JSON.parse(saveData);
            console.log('[SaveSystemAdapterFixed] Applying save - Credits:', data.ship.credits);
            
            const state = this.stateManager.state;
            
            // Safely apply whitelisted ship properties
            this._assignShipSafe(state.ship, data.ship);
            
            // Restore reputation scaffold
            if (data.reputation) {
                state.reputation = { trader: 0, patrol: 0, pirate: 0, ...data.reputation };
            }
            
            // Restore mission state
            if (data.mission && state.missionSystem) {
                state.missionSystem.completed = data.mission.completed || [];
                if (data.mission.activeId && state.missionSystem.available) {
                    state.missionSystem.active = state.missionSystem.available.find(m => m.id === data.mission.activeId) || null;
                }
            }
            
            // Restore NPCs if any
            if (data.npcs && data.npcs.length > 0) {
                state.npcShips.length = 0;
                data.npcs.forEach(npcData => {
                    // Drop legacy/optional 'scavenger' NPCs (feature removed)
                    if (npcData && npcData.type === 'scavenger') return;
                    const npc = {
                        ...npcData,
                        color: npcData.type === 'pirate' ? '#ff4444' : 
                               npcData.type === 'trader' ? '#44ff44' : 
                               npcData.type === 'patrol' ? '#4444ff' : 
                               npcData.type === 'freighter' ? '#4488ff' : '#888888',
                        state: 'idle',
                        target: null,
                        lastScan: 0,
                        weaponCooldown: 0,
                        fleeThreshold: 0.3,
                        aggressionLevel: npcData.behavior === 'aggressive' ? 0.8 : 0.3
                    };
                    state.npcShips.push(npc);
                });
            }
            
            // Restore some asteroids
            if (data.asteroids && data.asteroids.length > 0) {
                // Clear existing and add saved ones
                state.asteroids.length = 0;
                data.asteroids.forEach(astData => {
                    const shapePoints = [];
                    for (let j = 0; j < 8; j++) {
                        shapePoints.push(0.7 + Math.random() * 0.6);
                    }
                    
                    state.asteroids.push({
                        ...astData,
                        color: "#666",
                        rotationSpeed: (Math.random() - 0.5) * 0.02,
                        rotation: Math.random() * Math.PI * 2,
                        maxHealth: 20,
                        shapePoints: shapePoints
                    });
                });
            }
            
            // Update camera
            state.camera.x = state.ship.x;
            state.camera.y = state.ship.y;
            
            // Force UI update
            this.forceUIUpdate(state.ship);
            
            // Emit events
            this.eventBus.emit('state.loaded', { ship: state.ship });
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            
            this.showMessage('GAME LOADED', 'success');
            console.log('[SaveSystemAdapterFixed] Load complete - Credits:', state.ship.credits);
            
            return true;
        } catch (e) {
            console.error('[SaveSystemAdapterFixed] Load failed:', e);
            this.showMessage('LOAD FAILED', 'error');
            return false;
        }
    }
    
    /**
     * Check if save exists
     */
    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }
    
    /**
     * Show a temporary message
     */
    showMessage(text, type = 'info') {
        const msg = document.createElement('div');
        msg.textContent = text.toUpperCase();
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
            color: white;
            padding: 10px 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
            border-radius: 4px;
            z-index: 10000;
            animation: fadeInOut 2.5s ease-in-out;
        `;
        
        if (!document.querySelector('#saveNotificationKeyframes')) {
            const style = document.createElement('style');
            style.id = 'saveNotificationKeyframes';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-20px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; }
                    100% { opacity: 0; transform: translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2500);
    }
    
    /**
     * Force UI update
     */
    forceUIUpdate(ship) {
        const elements = {
            credits: ship.credits || 0,
            health: Math.max(0, Math.round(ship.health)) + '%',
            fuel: Math.round(ship.fuel) + '%',
            speed: (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1),
            kills: ship.kills || 0,
            shield: ship.shield > 0 ? Math.round(ship.shield) : 'None'
        };
        
        const cargoUsed = Array.isArray(ship.cargo)
            ? ship.cargo.reduce((sum, item) => sum + (item?.quantity ?? 1), 0)
            : 0;
        elements.cargo = cargoUsed + '/' + (ship.cargoCapacity || 10);
        elements.location = ship.isLanded && ship.landedPlanet ? ship.landedPlanet.name : 'SPACE';
        elements.weapon = ship.weapons && ship.weapons.length > 0 ? 
            ship.weapons[ship.currentWeapon].type.toUpperCase() : 'NONE';
        
        Object.keys(elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = elements[id];
        });
    }
    
    /**
     * Get default NPC size
     */
    getNPCDefaultSize(type) {
        const sizes = {
            freighter: 18,
            trader: 12,
            patrol: 14,
            pirate: 10
        };
        return sizes[type] || 12;
    }
    
    /**
     * Handle clear save event - requires confirmation
     */
    handleClearSave() {
        console.log('[SaveSystemAdapterFixed] CLEAR SAVE triggered');
        
        if (!this.clearConfirmPending) {
            // First press - ask for confirmation
            this.clearConfirmPending = true;
            this.showMessage('PRESS F12 AGAIN TO CLEAR SAVE', 'error');
            
            // Cancel confirmation after 3 seconds
            setTimeout(() => {
                this.clearConfirmPending = false;
            }, 3000);
        } else {
            // Second press - actually clear
            try {
                localStorage.removeItem(this.SAVE_KEY);
                localStorage.removeItem(this.LOAD_PENDING_KEY);
                this.clearConfirmPending = false;
                this.showMessage('SAVE CLEARED - RESTARTING', 'success');
                
                // Reload page to reset to default state
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } catch (e) {
                console.error('[SaveSystemAdapterFixed] Clear save failed:', e);
                this.showMessage('CLEAR FAILED', 'error');
            }
        }
    }
    
    /**
     * Destroy the adapter
     */
    destroy() {
        this.eventBus.off(GameEvents.GAME_SAVE, this.handleSave);
        this.eventBus.off(GameEvents.GAME_LOAD, this.handleLoad);
        this.eventBus.off(GameEvents.GAME_CLEAR_SAVE, this.handleClearSave);
        console.log('[SaveSystemAdapterFixed] Destroyed');
    }
}

export default SaveSystemAdapterFixed;
