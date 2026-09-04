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
import * as Persistence from '../core/Persistence.js';
import { getZone, getBoss, canAdvanceZone, zones } from '../data/zones.js';
import { shipClasses, shopInventory } from '../data/gameData.js';

// Schema of the ephemeral run blob ('galaxyTraderRun'). Owned by
// core/Persistence.js, which also holds the migration chain; mirrored here so
// the version this system writes is visible at the top of the file.
export const RUN_SCHEMA_VERSION = Persistence.SCHEMA.run; // 1

// Run saves are throttled: at most one write per window, with a trailing write.
// Zone changes, boss spawn/defeat, run end and page-hide flush immediately.
const RUN_SAVE_DEBOUNCE_MS = 1000;

// New events for run lifecycle
export const RunEvents = {
    RUN_START: 'run.start',
    RUN_END: 'run.end',
    RUN_VICTORY: 'run.victory',
    ZONE_CHANGE: 'zone.change',
    ZONE_BOSS_SPAWN: 'zone.boss.spawn',
    ZONE_BOSS_PHASE: 'zone.boss.phase',
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

        // Boss trigger state (armed on zone entry for zones with a bossId)
        this._zoneKills = 0;
        this._bossWarned = false;
        this._bossTimer = null;

        // Debounced run-save state (S2)
        this._runSaveTimer = null;
        this._runSaveDirty = false;
        this._lastRunWriteAt = 0;
        this._unregisterFlush = null;

        // Bind handlers
        this._handleShipDeath = this._handleShipDeath.bind(this);
        this._handleNPCDeath = this._handleNPCDeath.bind(this);
        this._handleCreditsChange = this._handleCreditsChange.bind(this);
        this._handleZoneChange = this._handleZoneChange.bind(this);
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

        // Flush any debounced run save before the page goes away
        if (!this._unregisterFlush) {
            this._unregisterFlush = Persistence.onFlush(() => this._flushRun());
        }

        // Subscribe to game events
        this.eventBus.on(GameEvents.SHIP_DEATH, this._handleShipDeath);
        this.eventBus.on(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.on(GameEvents.CREDITS_CHANGE, this._handleCreditsChange);
        this.eventBus.on(RunEvents.ZONE_CHANGE, this._handleZoneChange);

        console.log('[RunSystem] Initialized');
    }

    /**
     * Check if there's a run in progress that can be resumed.
     * A run whose `runId` does not match the main save's is not resumable
     * (the ship in that save belongs to a different run) — _loadSavedRun()
     * drops it, so the menu hides CONTINUE instead of resuming a mismatch.
     */
    hasSavedRun() {
        return this._loadSavedRun() !== null;
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
        // Identity shared with the main save, so a resumed run and the ship it
        // resumes with can be proven to belong together (S1)
        this._runStats.runId = this._newRunId();
        this._currentZoneId = 'core';
        this._bossSpawned = false;
        this._bossDefeated = false;
        this._armBossTrigger();

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
            // Either nothing saved, or the run did not belong to the main save
            // (_loadSavedRun warns and clears in that case)
            console.warn('[RunSystem] No resumable saved run');
            return null;
        }

        console.log('[RunSystem] Resuming saved run');
        this._runActive = true;
        this._runStartTime = savedRun.startTime || Date.now();
        this._runStats = savedRun.stats || this._createEmptyStats();
        this._currentZoneId = savedRun.zoneId || 'core';
        this._bossSpawned = savedRun.bossSpawned || false;
        this._bossDefeated = savedRun.bossDefeated || false;
        if (!Array.isArray(this._runStats.unlocksGranted)) this._runStats.unlocksGranted = [];
        // Re-arm the boss trigger for the resumed zone (no-op when already spawned)
        this._armBossTrigger();
        this._zoneKills = Number(savedRun.zoneKills) || 0;

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

        // Deactivate run and disarm any pending boss trigger
        this._runActive = false;
        this._clearBossTrigger();

        // Emit appropriate event — both paths carry the unlocks granted this run
        if (reason === 'victory') {
            this._getVictoryUnlocks();
            this.eventBus.emit(RunEvents.RUN_VICTORY, {
                reason,
                stats: { ...this._runStats },
                unlocks: [...(this._runStats.unlocksGranted || [])]
            });
        } else {
            this.eventBus.emit(RunEvents.RUN_END, {
                reason,
                stats: { ...this._runStats },
                unlocks: [...(this._runStats.unlocksGranted || [])]
            });
        }

        return { ...this._runStats };
    }

    /**
     * Get current run statistics
     */
    getRunStats() {
        const zone = getZone(this._currentZoneId);
        const boss = zone?.bossId ? getBoss(zone.bossId) : null;
        return {
            ...this._runStats,
            runTimeMs: this._runActive ? Date.now() - this._runStartTime : this._runStats.runTimeMs,
            zoneId: this._currentZoneId,
            zoneName: zone?.name || 'Unknown',
            zoneKills: this._zoneKills,
            bossTriggerKills: zone?.bossId ? (zone?.bossTrigger?.kills || 0) : 0,
            // Gate presentation (HUDRenderer)
            bossId: zone?.bossId || null,
            bossName: boss?.name || null,
            bossSpawned: this._bossSpawned,
            bossDefeated: this._bossDefeated,
            requirements: zone?.advanceRequirements || null,
            canAdvance: this._runActive ? this.canAdvance() : false
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

        // Save progress immediately — a zone change is worth losing nothing
        this._flushRun();

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
        this._flushRun();

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
        this._clearBossTrigger();

        const boss = getBoss(bossId);

        // Grant any unlocks from this boss — must happen before the victory
        // early-return, or the final boss's unlock is never granted
        if (boss?.unlocks) {
            const { type, id } = boss.unlocks;
            let granted = false;
            if (type === 'ship') {
                granted = this.metaManager.unlockShip(id);
            } else if (type === 'upgrade') {
                granted = this.metaManager.unlockUpgrade(id);
            }
            const name = this._unlockName(type, id);
            if (granted) this._recordUnlock({ type, id, name });
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Unlocked: ${name}`,
                type: 'success',
                duration: 3000
            });
        }

        this._flushRun();

        this.eventBus.emit(RunEvents.ZONE_BOSS_DEFEAT, {
            bossId,
            boss,
            zoneId: this._currentZoneId
        });

        console.log('[RunSystem] Boss defeated:', boss?.name);

        // Final boss ends the run in victory
        if (boss?.victoryTrigger) {
            this.endRun('victory');
        }
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
            unlocksGranted: [],
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

    _handleZoneChange() {
        // Re-arm the boss trigger for the zone we just entered
        this._armBossTrigger();
    }

    /**
     * Arm (or disarm) the current zone's boss trigger.
     * Resets in-zone kill tracking and starts the max-delay timer.
     */
    _armBossTrigger() {
        this._clearBossTrigger();
        this._zoneKills = 0;
        this._bossWarned = false;

        if (!this._runActive) return;
        const zone = getZone(this._currentZoneId);
        if (!zone?.bossId || this._bossSpawned) return;

        const delay = Number(zone.bossTrigger?.maxDelayMs);
        if (Number.isFinite(delay) && delay > 0) {
            this._bossTimer = setTimeout(() => {
                this._bossTimer = null;
                this._tryTriggerBoss('timer');
            }, delay);
        }
    }

    _clearBossTrigger() {
        if (this._bossTimer) {
            clearTimeout(this._bossTimer);
            this._bossTimer = null;
        }
    }

    _tryTriggerBoss(reason) {
        if (!this._runActive || this._bossSpawned) return;
        const zone = getZone(this._currentZoneId);
        if (!zone?.bossId) return;

        // Don't drop a boss on a paused/landed/dead player — retry shortly
        const state = this.stateManager.state;
        if (state?.paused || state?.ship?.isLanded || state?.ship?.isDestroyed) {
            this._clearBossTrigger();
            this._bossTimer = setTimeout(() => {
                this._bossTimer = null;
                this._tryTriggerBoss(reason);
            }, 5000);
            return;
        }

        this._clearBossTrigger();
        console.log('[RunSystem] Boss trigger fired:', reason);
        this.spawnZoneBoss();
    }

    _handleNPCDeath(data) {
        if (!this._runActive) return;

        // Only the player's kills count toward the run (E8). Patrol-vs-pirate
        // brawls used to advance the zone gate on their own. Boss adds count
        // like any other kill as long as the player made it.
        const killedBy = data?.npc?.killedBy ?? data?.killedBy;
        if (killedBy !== 'player') return;

        this._runStats.kills++;

        // In-zone kill tracking for the boss trigger (boss kills don't count)
        if (data.npc?.type !== 'boss') {
            const zone = getZone(this._currentZoneId);
            const need = zone?.bossId ? Number(zone.bossTrigger?.kills) : 0;
            if (Number.isFinite(need) && need > 0 && !this._bossSpawned) {
                this._zoneKills++;
                if (this._zoneKills >= need - 1 && !this._bossWarned) {
                    this._bossWarned = true;
                    this.eventBus.emit(GameEvents.UI_MESSAGE, {
                        message: 'Something large is approaching...',
                        type: 'warning',
                        duration: 3000
                    });
                }
                if (this._zoneKills >= need) {
                    this._tryTriggerBoss('kills');
                }
            }
        }

        // Track by type
        if (data.npc?.type === 'pirate' || data.npc?.type === 'elite_pirate' || data.npc?.type === 'void_hunter') {
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

        // Emitters send `change` (StateManager, MissionSystem); `delta` kept for safety
        const delta = Number(data?.change ?? data?.delta ?? 0);
        if (!Number.isFinite(delta) || delta === 0) return;

        if (delta > 0) {
            this._runStats.creditsEarned += delta;
        } else {
            this._runStats.creditsSpent += Math.abs(delta);
        }

        this._saveRun();
    }

    /**
     * Identity stamped on both the run blob and the main save (S1)
     */
    _newRunId() {
        const rand = Math.random().toString(36).slice(2, 10);
        return `r${Date.now().toString(36)}-${rand}`;
    }

    /**
     * Request a run save. Throttled to one write per RUN_SAVE_DEBOUNCE_MS with
     * a trailing write, so a kill streak or a burst of credit changes cannot
     * put a JSON.stringify + setItem on every frame (S2). Use _flushRun() for
     * the moments worth writing at once.
     */
    _saveRun() {
        if (!this._runActive) return;
        this._runSaveDirty = true;
        if (this._runSaveTimer) return; // trailing write already scheduled

        const since = Date.now() - this._lastRunWriteAt;
        const delay = Math.max(0, RUN_SAVE_DEBOUNCE_MS - since);
        this._runSaveTimer = setTimeout(() => {
            this._runSaveTimer = null;
            if (this._runSaveDirty) this._writeRun();
        }, delay);
    }

    /**
     * Write the run blob now, cancelling any pending debounced write.
     * Called on zone change, boss spawn/defeat, run end and page hide.
     */
    _flushRun() {
        this._cancelPendingRunSave();
        if (!this._runActive) return false;
        return this._writeRun();
    }

    _cancelPendingRunSave() {
        if (this._runSaveTimer) {
            clearTimeout(this._runSaveTimer);
            this._runSaveTimer = null;
        }
        this._runSaveDirty = false;
    }

    /**
     * Unconditional write (schema stamp and quota reporting live in Persistence)
     */
    _writeRun() {
        this._runSaveDirty = false;
        this._lastRunWriteAt = Date.now();
        const ok = Persistence.write('run', {
            startTime: this._runStartTime,
            stats: this._runStats,
            zoneId: this._currentZoneId,
            bossSpawned: this._bossSpawned,
            bossDefeated: this._bossDefeated,
            zoneKills: this._zoneKills
        });
        if (!ok) console.warn('[RunSystem] Run save did not land:', Persistence.lastWriteError());
        return ok;
    }

    /**
     * Read the saved run (Persistence migrates it to schema
     * RUN_SCHEMA_VERSION) and verify it belongs to the ship in the main save.
     * A mismatched pair is dropped: resuming it would hand the player another
     * run's ship (S1). Runs saved before run ids existed are grandfathered.
     * @returns {object|null}
     */
    _loadSavedRun() {
        const savedRun = Persistence.read('run');
        if (!savedRun) return null;
        if (savedRun.schema !== RUN_SCHEMA_VERSION) {
            // Persistence migrates forward, so this only fires if the two
            // versions drift apart in a future change
            console.warn('[RunSystem] Unexpected run schema', savedRun.schema);
            return null;
        }

        const runId = savedRun.stats?.runId;
        if (runId && !this._runActive) {
            const mainSave = Persistence.read('save');
            const saveRunId = mainSave?.runId || null;
            if (saveRunId !== runId) {
                console.warn('[RunSystem] Saved run does not match the saved ship ' +
                    `(run ${runId} vs save ${saveRunId || 'none'}) — discarding run`);
                Persistence.clearRun();
                return null;
            }
        }
        return savedRun;
    }

    _clearSavedRun() {
        // Cancel first: a pending debounced write must not resurrect the key
        this._cancelPendingRunSave();
        this._lastRunWriteAt = 0;
        Persistence.clearRun();
    }

    _getVictoryUnlocks() {
        // Determine what the player unlocked from this victory
        const unlocks = [];

        // First win unlocks interceptor
        if (this.metaManager.state.stats.totalWins === 1) {
            if (this.metaManager.unlockShip('interceptor')) {
                const unlock = { type: 'ship', id: 'interceptor', name: this._unlockName('ship', 'interceptor') };
                this._recordUnlock(unlock);
                unlocks.push(unlock);
            }
        }

        return unlocks;
    }

    /**
     * Human-readable name for an unlock id (falls back to the raw id)
     */
    _unlockName(type, id) {
        if (!id) return '';
        if (type === 'ship') return shipClasses?.[id]?.name || id;
        if (type === 'upgrade') return shopInventory?.[id]?.name || id;
        return id;
    }

    /**
     * Record an unlock granted during this run (shown on the run-end screen)
     */
    _recordUnlock(unlock) {
        if (!unlock?.id) return;
        if (!Array.isArray(this._runStats.unlocksGranted)) this._runStats.unlocksGranted = [];
        if (this._runStats.unlocksGranted.some(u => u.type === unlock.type && u.id === unlock.id)) return;
        this._runStats.unlocksGranted.push(unlock);
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
        this._clearBossTrigger();
        this._cancelPendingRunSave();
        if (this._unregisterFlush) { this._unregisterFlush(); this._unregisterFlush = null; }
        this.eventBus.off(GameEvents.SHIP_DEATH, this._handleShipDeath);
        this.eventBus.off(GameEvents.NPC_DEATH, this._handleNPCDeath);
        this.eventBus.off(GameEvents.CREDITS_CHANGE, this._handleCreditsChange);
        this.eventBus.off(RunEvents.ZONE_CHANGE, this._handleZoneChange);
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
