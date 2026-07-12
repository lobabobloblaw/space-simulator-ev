/**
 * RunSystem - Manages the roguelike run lifecycle
 *
 * Handles:
 * - Starting new runs with selected ship
 * - Tracking run-specific statistics
 * - Ending runs (death/victory/abandon)
 * - Coordinating with MetaStateManager for permanent progression
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { getMetaStateManager } from '../core/MetaStateManager.js';
import { getZone, getBoss, canAdvanceZone, zones } from '../data/zones.js';

// Run-specific storage key (ephemeral, deleted on run end)
const RUN_STORAGE_KEY = 'galaxyTraderRun';

// New events for run lifecycle
export const RunEvents = {
    RUN_START: 'run.start',
    RUN_END: 'run.end',
    RUN_VICTORY: 'run.victory',
    ZONE_CHANGE: 'zone.change',
    ZONE_BOSS_SPAWN: 'zone.boss.spawn',
    ZONE_BOSS_DEFEAT: 'zone.boss.defeat'
};

class RunSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.metaManager = getMetaStateManager();

        // Run state
        this._runActive = false;
        this._runStartTime = 0;
        this._runStats = this._createEmptyStats();

        // Zone state
        this._currentZoneId = 'core';
        this._bossSpawned = false;
        this._bossDefeated = false;

        // Bind handlers
        this._handleShipDeath = this._handleShipDeath.bind(this);
        this._handleNPCDeath = this._handleNPCDeath.bind(this);
        this._handleCreditsChange = this._handleCreditsChange.bind(this);
    }

    /**
     * Initialize the run system
     */
    init() {
        // Check for existing run in progress
        const savedRun = this._loadSavedRun();
        if (savedRun) {
            console.log('[RunSystem] Found saved run, can be resumed');
            this._runStats = savedRun.stats || this._createEmptyStats();
            this._currentZoneId = savedRun.zoneId || 'core';
        }

        // Subscribe to game events
        this.eventBus.on(GameEvents.SHIP_DEATH, this._handleShipDeath);
        this.eventBus.on(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.on(GameEvents.CREDITS_CHANGE, this._handleCreditsChange);

        console.log('[RunSystem] Initialized');
    }

    /**
     * Check if there's a run in progress that can be resumed
     */
    hasSavedRun() {
        try {
            return localStorage.getItem(RUN_STORAGE_KEY) !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Start a new run with the selected ship
     */
    startNewRun(shipId = 'shuttle') {
        // End active run first to prevent data loss
        if (this._runActive) {
            console.warn('[RunSystem] Ending active run before starting new one');
            this.endRun('abandoned');
        }

        console.log('[RunSystem] Starting new run with ship:', shipId);

        // Verify ship is unlocked
        if (!this.metaManager.isShipUnlocked(shipId)) {
            console.warn('[RunSystem] Ship not unlocked, defaulting to shuttle');
            shipId = 'shuttle';
        }

        // Reset run state
        this._runActive = true;
        this._runStartTime = Date.now();
        this._runStats = this._createEmptyStats();
        this._runStats.shipId = shipId;
        this._currentZoneId = 'core';
        this._bossSpawned = false;
        this._bossDefeated = false;

        // Clear any existing run save
        this._clearSavedRun();

        // Emit run start event (main_eventbus_pure will handle state initialization)
        this.eventBus.emit(RunEvents.RUN_START, {
            shipId,
            zoneId: this._currentZoneId,
            zone: getZone(this._currentZoneId)
        });

        // Save initial run state
        this._saveRun();

        return {
            shipId,
            zoneId: this._currentZoneId,
            zone: getZone(this._currentZoneId)
        };
    }

    /**
     * Resume a saved run
     */
    resumeRun() {
        const savedRun = this._loadSavedRun();
        if (!savedRun) {
            console.warn('[RunSystem] No saved run to resume');
            return null;
        }

        console.log('[RunSystem] Resuming saved run');
        this._runActive = true;
        this._runStartTime = savedRun.startTime || Date.now();
        this._runStats = savedRun.stats || this._createEmptyStats();
        this._currentZoneId = savedRun.zoneId || 'core';
        this._bossSpawned = savedRun.bossSpawned || false;
        this._bossDefeated = savedRun.bossDefeated || false;

        return {
            shipId: this._runStats.shipId,
            zoneId: this._currentZoneId,
            zone: getZone(this._currentZoneId),
            stats: this._runStats
        };
    }

    /**
     * End the current run
     */
    endRun(reason = 'death') {
        if (!this._runActive) {
            console.warn('[RunSystem] No active run to end');
            return;
        }

        console.log('[RunSystem] Ending run, reason:', reason);

        // Calculate final stats
        const runTimeMs = Date.now() - this._runStartTime;
        this._runStats.runTimeMs = runTimeMs;
        this._runStats.outcome = reason;
        this._runStats.zoneReached = this._currentZoneId;

        // Record to meta progression
        this.metaManager.recordRunEnd(this._runStats);

        // Clear run save (permadeath)
        this._clearSavedRun();

        // Deactivate run
        this._runActive = false;

        // Emit appropriate event
        if (reason === 'victory') {
            this.eventBus.emit(RunEvents.RUN_VICTORY, {
                stats: { ...this._runStats },
                unlocks: this._getVictoryUnlocks()
            });
        } else {
            this.eventBus.emit(RunEvents.RUN_END, {
                reason,
                stats: { ...this._runStats }
            });
        }

        return { ...this._runStats };
    }

    /**
     * Get current run statistics
     */
    getRunStats() {
        return {
            ...this._runStats,
            runTimeMs: this._runActive ? Date.now() - this._runStartTime : this._runStats.runTimeMs,
            zoneId: this._currentZoneId,
            zoneName: getZone(this._currentZoneId)?.name || 'Unknown'
        };
    }

    /**
     * Get current zone
     */
    getCurrentZone() {
        return getZone(this._currentZoneId);
    }

    /**
     * Check if player can advance to next zone
     */
    canAdvance() {
        const state = this.stateManager.state;
        const playerStats = {
            kills: this._runStats.kills,
            credits: state.ship?.credits || 0,
            bossesDefeated: this._runStats.bossesDefeated
        };
        return canAdvanceZone(this._currentZoneId, playerStats);
    }

    /**
     * Advance to the next zone
     */
    advanceZone() {
        const currentIdx = zones.findIndex(z => z.id === this._currentZoneId);
        if (currentIdx === -1 || currentIdx >= zones.length - 1) {
            console.warn('[RunSystem] Cannot advance, at final zone');
            return false;
        }

        const nextZone = zones[currentIdx + 1];
        const previousZoneId = this._currentZoneId;
        this._currentZoneId = nextZone.id;
        this._bossSpawned = false;
        this._bossDefeated = false;

        // Update run stats
        this._runStats.zonesVisited.push(nextZone.id);

        // Save progress
        this._saveRun();

        // Emit zone change
        this.eventBus.emit(RunEvents.ZONE_CHANGE, {
            previousZoneId,
            newZoneId: nextZone.id,
            zone: nextZone
        });

        console.log('[RunSystem] Advanced to zone:', nextZone.name);
        return true;
    }

    /**
     * Spawn the current zone's boss
     */
    spawnZoneBoss() {
        const zone = getZone(this._currentZoneId);
        if (!zone.bossId || this._bossSpawned) {
            return null;
        }

        const boss = getBoss(zone.bossId);
        if (!boss) return null;

        this._bossSpawned = true;
        this._saveRun();

        this.eventBus.emit(RunEvents.ZONE_BOSS_SPAWN, {
            bossId: zone.bossId,
            boss,
            zoneId: this._currentZoneId
        });

        console.log('[RunSystem] Spawning boss:', boss.name);
        return boss;
    }

    /**
     * Record boss defeat
     */
    recordBossDefeat(bossId) {
        // Prevent duplicate boss defeat recording
        if (this._runStats.bossesDefeated.includes(bossId)) return;

        this._bossDefeated = true;
        this._runStats.bossesDefeated.push(bossId);

        const boss = getBoss(bossId);

        // Check for victory trigger
        if (boss?.victoryTrigger) {
            this.endRun('victory');
            return;
        }

        // Grant any unlocks from this boss
        if (boss?.unlocks) {
            if (boss.unlocks.type === 'ship') {
                this.metaManager.unlockShip(boss.unlocks.id);
            } else if (boss.unlocks.type === 'upgrade') {
                this.metaManager.unlockUpgrade(boss.unlocks.id);
            }
        }

        this._saveRun();

        this.eventBus.emit(RunEvents.ZONE_BOSS_DEFEAT, {
            bossId,
            boss,
            zoneId: this._currentZoneId
        });

        console.log('[RunSystem] Boss defeated:', boss?.name);
    }

    // ==================== PRIVATE METHODS ====================

    _createEmptyStats() {
        return {
            shipId: 'shuttle',
            kills: 0,
            pirateKills: 0,
            traderKills: 0,
            patrolKills: 0,
            creditsEarned: 0,
            creditsSpent: 0,
            damageTaken: 0,
            damageDealt: 0,
            bossesDefeated: [],
            zonesVisited: ['core'],
            missionsCompleted: 0,
            runTimeMs: 0,
            outcome: null,
            zoneReached: 'core'
        };
    }

    _handleShipDeath() {
        if (!this._runActive) return;
        this.endRun('death');
    }

    _handleNPCDeath(data) {
        if (!this._runActive) return;

        this._runStats.kills++;

        // Track by type
        if (data.npc?.type === 'pirate' || data.npc?.type === 'elite_pirate') {
            this._runStats.pirateKills++;
        } else if (data.npc?.type === 'trader' || data.npc?.type === 'freighter') {
            this._runStats.traderKills++;
        } else if (data.npc?.type === 'patrol') {
            this._runStats.patrolKills++;
        }

        // Check for boss defeat
        if (data.npc?.type === 'boss' && data.npc?.bossId) {
            this.recordBossDefeat(data.npc.bossId);
        }

        this._saveRun();
    }

    _handleCreditsChange(data) {
        if (!this._runActive) return;

        if (data.delta > 0) {
            this._runStats.creditsEarned += data.delta;
        } else {
            this._runStats.creditsSpent += Math.abs(data.delta);
        }

        this._saveRun();
    }

    _saveRun() {
        if (!this._runActive) return;

        try {
            const runData = {
                startTime: this._runStartTime,
                stats: this._runStats,
                zoneId: this._currentZoneId,
                bossSpawned: this._bossSpawned,
                bossDefeated: this._bossDefeated,
                savedAt: Date.now()
            };
            localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify(runData));
        } catch (e) {
            console.warn('[RunSystem] Failed to save run:', e);
        }
    }

    _loadSavedRun() {
        try {
            const saved = localStorage.getItem(RUN_STORAGE_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    }

    _clearSavedRun() {
        try {
            localStorage.removeItem(RUN_STORAGE_KEY);
        } catch (e) {
            console.warn('[RunSystem] Failed to clear run save:', e);
        }
    }

    _getVictoryUnlocks() {
        // Determine what the player unlocked from this victory
        const unlocks = [];

        // First win unlocks interceptor
        if (this.metaManager.state.stats.totalWins === 1) {
            if (this.metaManager.unlockShip('interceptor')) {
                unlocks.push({ type: 'ship', id: 'interceptor', name: 'Viper Interceptor' });
            }
        }

        return unlocks;
    }

    /**
     * Check if a run is currently active
     */
    isRunActive() {
        return this._runActive;
    }

    /**
     * Get the MetaStateManager instance
     */
    getMetaStateManager() {
        return this.metaManager;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.eventBus.off(GameEvents.SHIP_DEATH, this._handleShipDeath);
        this.eventBus.off(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.off(GameEvents.CREDITS_CHANGE, this._handleCreditsChange);
    }
}

// Singleton
let _instance = null;

export function getRunSystem() {
    if (!_instance) {
        _instance = new RunSystem();
    }
    return _instance;
}

export default RunSystem;
