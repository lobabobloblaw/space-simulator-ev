/**
 * SaveSystemAdapter - Nuclear Option Fix
 * Forces state persistence by reloading after save operations
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { logError, checkLocalStorage, notifyUser } from '../utils/ErrorUtils.js';
import { validateSaveData } from '../utils/SaveUtils.js';

export class SaveSystemAdapterFixed {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.SAVE_KEY = 'galaxyTraderSave';
        this.LOAD_PENDING_KEY = 'galaxyTraderLoadPending';
        this.SAVE_MAX_NPCS = 28; // tighter cap to reduce JSON size and stall risk
        this._saveScheduled = false;
        this._savePending = false;
        this._saveDeferCount = 0;
        // Idle gating for autosave: require a streak of light frames before writing
        this._idleLightStreak = 0;
        this._idleLightMs = 16;   // treat <16ms as light frame (stricter)
        this._idleLightNeed = 12; // require a longer streak of light frames
        this._idleRecheckMs = 180; // recheck cadence while waiting
        // Interaction gating: postpone autosave shortly after target cycling
        this._activeInteractUntil = 0; // timestamp when it's OK to autosave again
        this._quietMs = 12000; // default quiet window after input/targeting (12s)

        // Race condition prevention
        this._saveLock = false; // Mutex to prevent concurrent saves
        this._saveVersion = 0; // Incremented each save to detect stale operations
        this._saveRetryCount = 0; // Depth guard for pending save retries
        this._saveRetryMax = 2;

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
                'fuel','credits','health','maxHealth','shield','maxShield',
                'cargo','weapons','currentWeapon',
                'kills','pirateKills','missionKills',
                // Upgrade levels — the stats themselves are derived from these
                // by ShipStats after load (see main's post-load handler)
                'engineLevel','weaponLevel','radarLevel','shieldLevel','cargoLevel',
                'cargoCapacity','tutorialStage','spriteId',
                // optional UI/flags we might persist later
                'isLanded','landedPlanet','landingCooldown','class','shipClass',
                // live mission progress store (MissionSystem reads/writes these on ship)
                'missions','missionStates'
            ]);
            for (const key of Object.keys(source)) {
                if (dangerous.has(key) || !allowed.has(key)) continue;
                const val = source[key];
                // Minimal type sanity where cheap
                if ((key === 'cargo' || key === 'weapons') && !Array.isArray(val)) continue;
                if ((key === 'missions' || key === 'missionStates') && (val === null || typeof val !== 'object' || Array.isArray(val))) continue;
                target[key] = val;
            }
        } catch(e) { logError('SaveSystem._assignShipSafe', e); }
    }

    /**
     * Validate save data structure after JSON.parse.
     * Delegates to shared SaveUtils validator.
     */
    _validateSaveData(data) {
        return validateSaveData(data);
    }

    /**
     * Initialize the adapter
     */
    init() {
        // Check localStorage availability (handles private browsing mode)
        const storageCheck = checkLocalStorage();
        this._storageAvailable = storageCheck.available;

        if (!storageCheck.available) {
            console.warn('[SaveSystemAdapterFixed] localStorage unavailable:', storageCheck.reason);

            // Notify user with appropriate message
            if (storageCheck.reason === 'private_browsing') {
                notifyUser('PRIVATE BROWSING: Saves disabled', 'warning');
            } else if (storageCheck.reason === 'quota_exceeded') {
                notifyUser('STORAGE FULL: Clear browser data', 'warning');
            } else {
                notifyUser('SAVES UNAVAILABLE', 'warning');
            }
        }

        // Check if we need to apply a pending load (only if storage available)
        if (this._storageAvailable && localStorage.getItem(this.LOAD_PENDING_KEY) === 'true') {
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
        // Watch target changes to avoid saving mid-cycling
        this.eventBus.on(GameEvents.TARGET_SET, () => {
            try {
                const now = performance.now ? performance.now() : Date.now();
                // Avoid autosaves for a short window after targeting interaction
                const quiet = (typeof window !== 'undefined' && Number(window.SAVE_QUIET_MS)) || this._quietMs;
                this._activeInteractUntil = now + Math.max(1000, quiet|0);
            } catch(e) { logError('SaveSystem.TARGET_SET', e); }
        });
        // Watch user input (keys/mouse/touch) to extend quiet window during active interaction
        const bumpQuiet = () => {
            try { const now = performance.now ? performance.now() : Date.now(); const quiet = (typeof window !== 'undefined' && Number(window.SAVE_QUIET_MS)) || this._quietMs; this._activeInteractUntil = Math.max(this._activeInteractUntil||0, now + Math.max(1000, quiet|0)); } catch(e) { logError('SaveSystem.bumpQuiet', e); }
        };
        this.eventBus.on(GameEvents.INPUT_KEY_DOWN, bumpQuiet);
        this.eventBus.on(GameEvents.INPUT_MOUSE_DOWN, bumpQuiet);
        this.eventBus.on(GameEvents.INPUT_TOUCH_START, bumpQuiet);
        
        console.log('[SaveSystemAdapterFixed] Initialized');
    }
    
    /**
     * Handle save event
     */
    handleSave(data = null) {
        try { if (typeof window !== 'undefined' && window.DEBUG_SAVE) console.log('[SaveSystemAdapterFixed] SAVE triggered'); } catch(e) { /* debug logging only */ }

        // Skip save if localStorage is unavailable (private browsing, etc.)
        if (!this._storageAvailable) {
            const reason = (data && data.reason) || 'manual';
            if (reason !== 'auto') {
                this.showMessage('SAVES UNAVAILABLE', 'warning');
            }
            return false;
        }

        try {
            // QA override to disable autosave entirely
            if ((data && data.reason === 'auto') && (typeof window !== 'undefined' && window.SAVE_DISABLED)) {
                if (window.DEBUG_SAVE) console.log('[SaveSystemAdapterFixed] Autosave disabled via SAVE_DISABLED');
                return true;
            }
        } catch(e) { logError('SaveSystem.handleSave.disabled_check', e); }
        // Coalesce autosaves; run off the critical path during idle time
        if (this._saveScheduled) { this._savePending = true; return true; }
        this._saveScheduled = true;
        const run = () => {
            try {
                // Avoid saving on heavy frames to prevent visible hitches
                try {
                    const state = this.stateManager.state;
                    // Prefer state.diagnostics, fallback to window.__lastFrameMs
                    const lastFrameMs = (state?.diagnostics?.lastFrameMs) ||
                                        (typeof window !== 'undefined' ? window.__lastFrameMs : 0) || 0;
                    const heavy = lastFrameMs > 24;
                    const isAuto = !data || data.reason === 'auto';
                    if (isAuto && heavy && this._saveDeferCount < 20) { // extend defers to reduce visible hitches
                        this._saveDeferCount++;
                        setTimeout(run, 350);
                        return;
                    }
                } catch(e) { logError('SaveSystem.handleSave.heavy_frame_check', e); }
                // Interaction quiet window after target cycling
                try {
                    const isAuto = !data || data.reason === 'auto';
                    if (isAuto) {
                        const now = performance.now ? performance.now() : Date.now();
                        if (now < (this._activeInteractUntil || 0)) {
                            setTimeout(run, 600);
                            return;
                        }
                    }
                } catch(e) { logError('SaveSystem.handleSave.interaction_check', e); }
                // Skip autosave while profilers are active (to avoid test-induced "other" spikes)
                try {
                    const isAuto = !data || data.reason === 'auto';
                    const diagOn = !!(typeof window !== 'undefined' && (window.RENDER_PROF_OVERLAY || window.RENDER_PROF_LOG || window.UPDATE_PROF_LOG || window.UPDATE_PROF_OVERLAY));
                    if (isAuto && diagOn) {
                        setTimeout(run, 1200);
                        return;
                    }
                } catch(e) { logError('SaveSystem.handleSave.profiler_check', e); }
                // For autosave, also require a brief streak of light frames
                try {
                    const isAuto = !data || data.reason === 'auto';
                    if (isAuto) {
                        const state = this.stateManager.state;
                        // Prefer state.diagnostics, fallback to window.__lastFrameMs
                        const last = (state?.diagnostics?.lastFrameMs) ||
                                     (typeof window !== 'undefined' ? window.__lastFrameMs : 0) || 0;
                        if (last > 0 && last <= this._idleLightMs) this._idleLightStreak += 1; else this._idleLightStreak = 0;
                        if (this._idleLightStreak < this._idleLightNeed) {
                            setTimeout(run, this._idleRecheckMs);
                            return;
                        }
                        this._idleLightStreak = 0;
                    }
                } catch(e) { logError('SaveSystem.handleSave.idle_check', e); }

                // Mutex: prevent concurrent save operations
                if (this._saveLock) {
                    console.log('[SaveSystemAdapterFixed] Save already in progress, queueing');
                    this._savePending = true;
                    this._saveScheduled = false;
                    return;
                }
                this._saveLock = true;

                const light = (!data || data.reason === 'auto');
                const reason = (data && data.reason) || 'manual';

                // Progressive save strategy to handle QuotaExceededError
                let saveSuccess = false;
                let payload = null;
                let saveMode = light ? 'light' : 'full';

                // Strategy 1: Try requested mode (full or light)
                try {
                    payload = this._buildSaveData(light);
                    const json = JSON.stringify(payload);
                    localStorage.setItem(this.SAVE_KEY, json);
                    saveSuccess = true;
                    this._trackSaveSize(json);
                } catch (e) {
                    if (e.name === 'QuotaExceededError' && !light) {
                        console.warn('[SaveSystemAdapterFixed] Quota exceeded, trying light mode...');

                        // Strategy 2: Try light mode (no NPCs/asteroids/pickups)
                        try {
                            payload = this._buildSaveData(true);
                            const json = JSON.stringify(payload);
                            localStorage.setItem(this.SAVE_KEY, json);
                            saveSuccess = true;
                            saveMode = 'light';
                            this._trackSaveSize(json);
                        } catch (e2) {
                            if (e2.name === 'QuotaExceededError') {
                                console.warn('[SaveSystemAdapterFixed] Quota still exceeded, trying critical-only mode...');

                                // Strategy 3: Critical only (ship + reputation)
                                try {
                                    payload = this._buildCriticalSaveData();
                                    const json = JSON.stringify(payload);
                                    localStorage.setItem(this.SAVE_KEY, json);
                                    saveSuccess = true;
                                    saveMode = 'critical';
                                    this._trackSaveSize(json);
                                } catch (e3) {
                                    throw e3; // Give up, throw to outer catch
                                }
                            } else {
                                throw e2;
                            }
                        }
                    } else {
                        throw e; // Not quota error or already light, rethrow
                    }
                }

                if (saveSuccess && payload) {
                    // Show appropriate message based on save mode
                    if (reason !== 'auto') {
                        if (saveMode === 'critical') {
                            this.showMessage('SAVE LIMITED (STORAGE FULL)', 'warning');
                        } else if (saveMode === 'light' && !light) {
                            this.showMessage('SAVE REDUCED (STORAGE LOW)', 'warning');
                        } else {
                            this.showMessage('GAME SAVED', 'success');
                        }
                    }
                    try {
                        if (typeof window !== 'undefined' && window.DEBUG_SAVE) {
                            console.log(`[SaveSystemAdapterFixed] Saved (${saveMode}) - Credits:`, payload.ship.credits, 'reason:', reason);
                        }
                    } catch(e) { /* debug logging only */ }
                }
            } catch (e) {
                console.error('[SaveSystemAdapterFixed] Save failed:', e);
                if (e.name === 'QuotaExceededError') {
                    this.showMessage('SAVE FAILED - STORAGE FULL', 'error');
                } else {
                    this.showMessage('SAVE FAILED', 'error');
                }
            } finally {
                this._saveLock = false; // Release mutex
                this._saveScheduled = false;
                this._saveDeferCount = 0;
                if (this._savePending) {
                    this._savePending = false;
                    if (this._saveRetryCount < this._saveRetryMax) {
                        this._saveRetryCount++;
                        this.handleSave();
                    } else {
                        console.warn('[SaveSystemAdapterFixed] Max save retries reached, giving up');
                        this._saveRetryCount = 0;
                    }
                } else {
                    this._saveRetryCount = 0;
                }
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

    /**
     * Track save size for debugging/monitoring
     */
    _trackSaveSize(json) {
        try {
            const bytes = (typeof TextEncoder !== 'undefined') ?
                new TextEncoder().encode(json).length : (json.length * 2);
            const kb = Number((bytes / 1024).toFixed(1));

            // Write to state.diagnostics (preferred)
            const state = this.stateManager.state;
            if (state && state.diagnostics) {
                state.diagnostics.lastSaveSizeBytes = bytes;
                state.diagnostics.lastSaveSizeKB = kb;
            }

            // Keep window globals for backwards compat with QA tools
            if (typeof window !== 'undefined') {
                window.LAST_SAVE_SIZE_BYTES = bytes;
                window.LAST_SAVE_SIZE_KB = kb;
            }
        } catch(e) { logError('SaveSystem._trackSaveSize', e); }
    }

    /**
     * Build critical-only save data (minimal size for quota issues)
     */
    _buildCriticalSaveData() {
        const state = this.stateManager.state;
        return {
            version: '6.0-critical',
            timestamp: Date.now(),
            ship: {
                x: state.ship.x,
                y: state.ship.y,
                angle: state.ship.angle,
                credits: state.ship.credits,
                health: state.ship.health,
                maxHealth: state.ship.maxHealth || 100,
                shield: state.ship.shield,
                maxShield: state.ship.maxShield || 0,
                cargo: state.ship.cargo || [],
                weapons: state.ship.weapons || [],
                kills: state.ship.kills || 0,
                weaponSlots: state.ship.weaponSlots || 1,
                cargoCapacity: state.ship.cargoCapacity || 10,
                engineLevel: state.ship.engineLevel || 1,
                shieldLevel: state.ship.shieldLevel || 0,
                cargoLevel: state.ship.cargoLevel || 0,
                radarLevel: state.ship.radarLevel || 0,
                shipClass: state.ship.shipClass || state.ship.class || 'shuttle',
                class: state.ship.class || state.ship.shipClass || 'shuttle'
            },
            reputation: state.reputation || { trader: 0, patrol: 0, pirate: 0 }
        };
    }

    _buildSaveData(light = false) {
        const state = this.stateManager.state;

        // Snapshot ship data upfront to prevent race conditions
        // (state could change between reads in a multi-threaded-like scenario)
        const ship = state.ship;
        const shipSnapshot = {
            x: ship.x,
            y: ship.y,
            vx: ship.vx,
            vy: ship.vy,
            angle: ship.angle,
            fuel: ship.fuel,
            credits: ship.credits,
            health: ship.health,
            maxHealth: ship.maxHealth || 100,
            shield: ship.shield,
            cargo: ship.cargo ? [...ship.cargo] : [],
            weapons: ship.weapons ? [...ship.weapons] : [],
            currentWeapon: ship.currentWeapon || 0,
            kills: ship.kills || 0,
            pirateKills: ship.pirateKills || 0,
            missionKills: ship.missionKills || 0,
            engineLevel: ship.engineLevel || 1,
            weaponLevel: ship.weaponLevel || 1,
            radarLevel: ship.radarLevel || 0,
            shieldLevel: ship.shieldLevel || 0,
            cargoLevel: ship.cargoLevel || 0,
            maxShield: ship.maxShield || 0,
            cargoCapacity: ship.cargoCapacity || 10,
            tutorialStage: ship.tutorialStage || 'start',
            shipClass: ship.shipClass || ship.class || 'shuttle',
            class: ship.class || ship.shipClass || 'shuttle',
            // Live mission progress (the store MissionSystem and the mission board
            // actually read/write); deep-copied plain data — JSON.stringify() on the
            // full payload drops any non-serializable fields (e.g. static missions'
            // isComplete() functions) same as it always has for the rest of the save.
            missions: ship.missions ? {
                active: Array.isArray(ship.missions.active) ? [...ship.missions.active] : [],
                completed: Array.isArray(ship.missions.completed) ? [...ship.missions.completed] : [],
                available: Array.isArray(ship.missions.available) ? [...ship.missions.available] : []
            } : { active: [], completed: [], available: [] },
            missionStates: ship.missionStates ? { ...ship.missionStates } : {}
        };

        // Snapshot reputation
        const rep = state.reputation;
        const repSnapshot = rep ? { trader: rep.trader || 0, patrol: rep.patrol || 0, pirate: rep.pirate || 0 } : { trader: 0, patrol: 0, pirate: 0 };

        // Snapshot mission data
        const missionSnapshot = {
            activeId: state.missionSystem?.active?.id || null,
            completed: state.missionSystem?.completed ? [...state.missionSystem.completed] : []
        };

        // Trim large arrays to keep payloads small and stable
        const npcList = light ? [] : (state.npcShips || []).slice(0, this.SAVE_MAX_NPCS);

        // Increment save version for this operation
        this._saveVersion++;

        return {
            version: '6.1', // Bumped for snapshot-based saves
            saveVersion: this._saveVersion,
            timestamp: Date.now(),
            ship: shipSnapshot,
            reputation: repSnapshot,
            mission: missionSnapshot,
            // Persist essentials for NPCs only on manual saves; autosave omits
            npcs: npcList.map(npc => ({ x: npc.x, y: npc.y, vx: npc.vx, vy: npc.vy, angle: npc.angle, type: npc.type, size: npc.size, health: npc.health, maxHealth: npc.maxHealth })),
            // Autosave omits asteroids/pickups entirely; manual keeps a small slice
            asteroids: light ? [] : (state.asteroids || []).slice(0, 12).map(ast => ({
                x: ast.x,
                y: ast.y,
                vx: ast.vx,
                vy: ast.vy,
                health: ast.health,
                oreContent: ast.oreContent,
                radius: ast.radius
            })),
            pickups: light ? [] : (state.pickups || []).slice(0, 20).map(p => ({ x: p.x, y: p.y, type: p.type, value: p.value }))
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

            // Validate save data structure
            if (!this._validateSaveData(data)) {
                console.error('[SaveSystemAdapterFixed] Save data validation failed, aborting load');
                return false;
            }

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
            
            // Restore NPCs if any (wrapped in try/catch to prevent partial corruption)
            try {
                if (data.npcs && data.npcs.length > 0) {
                    const restoredNpcs = [];
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
                        restoredNpcs.push(npc);
                    });
                    // Only replace if restore succeeded
                    state.npcShips.length = 0;
                    restoredNpcs.forEach(n => state.npcShips.push(n));
                }
            } catch (e) { logError('SaveSystem.applyLoadedState.npcs', e); }
            
            // Restore some asteroids (wrapped to prevent partial corruption)
            try {
                if (data.asteroids && data.asteroids.length > 0) {
                    const restoredAsteroids = [];
                    data.asteroids.forEach(astData => {
                        const shapePoints = [];
                        for (let j = 0; j < 8; j++) {
                            shapePoints.push(0.7 + Math.random() * 0.6);
                        }
                        restoredAsteroids.push({
                            ...astData,
                            color: "#666",
                            rotationSpeed: (Math.random() - 0.5) * 0.02,
                            rotation: Math.random() * Math.PI * 2,
                            maxHealth: 20,
                            shapePoints: shapePoints
                        });
                    });
                    state.asteroids.length = 0;
                    restoredAsteroids.forEach(a => state.asteroids.push(a));
                }
            } catch (e) { logError('SaveSystem.applyLoadedState.asteroids', e); }

            // If loading a critical save (no NPCs/asteroids), signal SpawnSystem to repopulate
            if ((!data.npcs || data.npcs.length === 0) && (!data.asteroids || data.asteroids.length === 0)) {
                console.log('[SaveSystemAdapterFixed] Sparse save detected, requesting world repopulation');
                this.eventBus.emit('world.repopulate');
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
        if (!this._storageAvailable) return false;
        try {
            return localStorage.getItem(this.SAVE_KEY) !== null;
        } catch (e) {
            logError('SaveSystem.hasSave', e);
            return false;
        }
    }
    
    /**
     * Show a temporary message with graceful degradation notification
     */
    showMessage(text, type = 'info') {
        // Emit UI_MESSAGE event for centralized handling
        try {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: text,
                type: type,
                duration: 2500
            });
        } catch (e) {
            console.warn('[SaveSystemAdapterFixed] Failed to emit UI_MESSAGE:', e);
        }

        // Only use DOM fallback if no UISystem is listening (M7: prevent double notification)
        if (this.eventBus.getListenerCount && this.eventBus.getListenerCount(GameEvents.UI_MESSAGE) > 0) return;
        const msg = document.createElement('div');
        msg.textContent = text.toUpperCase();
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : type === 'warning' ? '#ffaa44' : '#4444ff'};
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
            // Clears the run save and the ephemeral run-state key; deliberately
            // leaves 'galaxyTraderMeta' untouched — that's permanent cross-run
            // progression (unlocks/stats), not part of "clear save".
            try {
                const clearedKeys = [this.SAVE_KEY, this.LOAD_PENDING_KEY, 'galaxyTraderRun'];
                clearedKeys.forEach(k => localStorage.removeItem(k));
                console.log('[SaveSystemAdapterFixed] Cleared keys:', clearedKeys.join(', '));
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
