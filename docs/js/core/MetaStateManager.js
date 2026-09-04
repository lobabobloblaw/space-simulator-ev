/**
 * MetaStateManager - Manages permanent progression across runs
 * Handles ship unlocks, upgrade pool unlocks, and persistent statistics
 *
 * Persisted through core/Persistence.js under the 'meta' key
 * ('galaxyTraderMeta', schema 2). This module never touches localStorage
 * directly: reads are migrated by Persistence, writes surface quota failures.
 */

import * as Persistence from './Persistence.js';
import { bosses } from '../data/zones.js';

// Shared with the meta 1→2 migration in Persistence
const coerceBossCount = Persistence.coerceBossCount;

// Default meta state for new players
const DEFAULT_META_STATE = {
    unlocks: {
        ships: ['shuttle'],           // Starting ships available
        upgrades: ['weapon1']         // shopInventory keys (weapon1 = Mining Laser)
    },
    stats: {
        totalRuns: 0,
        totalDeaths: 0,
        totalWins: 0,
        totalKills: 0,
        totalPirateKills: 0,
        totalCreditsEarned: 0,
        bestRunTimeMs: 0,
        bossesDefeated: 0,
        zonesReached: { core: 0, frontier: 0, outer_rim: 0, void: 0 }
    },
    achievements: []  // Completed achievement IDs
};

// Deep copy so callers never share the nested unlocks/stats objects with the
// module constant (a shallow spread let unlockShip() mutate DEFAULT_META_STATE)
const makeDefaultMeta = () => (typeof structuredClone === 'function'
    ? structuredClone(DEFAULT_META_STATE)
    : JSON.parse(JSON.stringify(DEFAULT_META_STATE)));

// All possible ship unlocks (for reference)
export const ALL_SHIPS = ['shuttle', 'interceptor', 'corvette', 'freighter', 'gunship', 'battlecruiser'];

// How each locked ship is earned, for the main-menu carousel. Boss-granted
// ships are resolved from zones.js first (see getUnlockCondition); this table
// covers the ships no boss grants, and is the fallback if the data goes away.
const SHIP_UNLOCK_CONDITIONS = {
    shuttle: 'Available from the start',
    interceptor: 'Win a run',
    corvette: 'Defeat Warlord Krix',
    battlecruiser: 'Defeat The Void King',
    freighter: 'Coming in a later build',
    gunship: 'Coming in a later build'
};

// All possible upgrade unlocks — ids are shopInventory keys (gameData.js)
export const ALL_UPGRADES = [
    'weapon1', 'weapon2', 'weapon3',
    'shield1', 'shield2',
    'engine2', 'engine3',
    'cargo1', 'cargo2',
    'radar1', 'radar2'
];

class MetaStateManager {
    constructor() {
        this._meta = null;
    }

    /**
     * Initialize meta state from storage or defaults
     */
    init() {
        this._meta = this._loadFromStorage();
        console.log('[MetaStateManager] Initialized with',
            this._meta.unlocks.ships.length, 'ships,',
            this._meta.unlocks.upgrades.length, 'upgrades,',
            this._meta.stats.totalRuns, 'total runs');
        return this._meta;
    }

    /**
     * Get current meta state (read-only reference)
     */
    get state() {
        if (!this._meta) this.init();
        return this._meta;
    }

    /**
     * Load meta state through Persistence (schema detection + migrations live
     * there; an unreadable or refused blob falls back to defaults).
     */
    _loadFromStorage() {
        try {
            const parsed = Persistence.read('meta');
            if (!parsed) return makeDefaultMeta();
            return this._mergeWithDefaults(parsed);
        } catch (e) {
            console.warn('[MetaStateManager] Failed to load, using defaults:', e);
            return makeDefaultMeta();
        }
    }

    /**
     * Merge loaded state with defaults (handles missing fields)
     */
    _mergeWithDefaults(loaded) {
        const merged = {
            unlocks: {
                ships: [...(loaded.unlocks?.ships || DEFAULT_META_STATE.unlocks.ships)],
                upgrades: [...(loaded.unlocks?.upgrades || DEFAULT_META_STATE.unlocks.upgrades)]
            },
            stats: {
                ...DEFAULT_META_STATE.stats,
                ...(loaded.stats || {}),
                zonesReached: { ...DEFAULT_META_STATE.stats.zonesReached, ...(loaded.stats?.zonesReached || {}) }
            },
            achievements: loaded.achievements || []
        };

        // Belt and braces: the meta 1→2 migration already coerces this, but a
        // blob written by a build in between could still carry the string form.
        merged.stats.bossesDefeated = coerceBossCount(merged.stats.bossesDefeated);

        return merged;
    }

    /**
     * Save current meta state (schema stamp + quota reporting via Persistence)
     * @returns {boolean} True when the write landed
     */
    save() {
        const ok = Persistence.write('meta', this._meta);
        if (!ok) {
            console.error('[MetaStateManager] Save failed:', Persistence.lastWriteError());
            return false;
        }
        console.log('[MetaStateManager] Saved');
        return true;
    }

    // ==================== UNLOCK METHODS ====================

    /**
     * Check if a ship is unlocked
     */
    isShipUnlocked(shipId) {
        return this._meta.unlocks.ships.includes(shipId);
    }

    /**
     * Check if an upgrade is unlocked
     */
    isUpgradeUnlocked(upgradeId) {
        return this._meta.unlocks.upgrades.includes(upgradeId);
    }

    /**
     * Unlock a ship (for meta-progression)
     * @returns {boolean} True if newly unlocked
     */
    unlockShip(shipId) {
        if (this._meta.unlocks.ships.includes(shipId)) return false;
        this._meta.unlocks.ships.push(shipId);
        this.save();
        console.log('[MetaStateManager] Ship unlocked:', shipId);
        return true;
    }

    /**
     * Unlock an upgrade (adds to shop pool)
     * @returns {boolean} True if newly unlocked
     */
    unlockUpgrade(upgradeId) {
        if (this._meta.unlocks.upgrades.includes(upgradeId)) return false;
        this._meta.unlocks.upgrades.push(upgradeId);
        this.save();
        console.log('[MetaStateManager] Upgrade unlocked:', upgradeId);
        return true;
    }

    /**
     * Get all unlocked ships
     */
    getUnlockedShips() {
        return [...this._meta.unlocks.ships];
    }

    /**
     * Get all unlocked upgrades
     */
    getUnlockedUpgrades() {
        return [...this._meta.unlocks.upgrades];
    }

    /**
     * Short "how do I get this?" line for a locked ship, for the menu.
     * Boss-granted ships are derived from the zone data so the string tracks
     * whatever boss actually carries the unlock; the rest fall back to the
     * SHIP_UNLOCK_CONDITIONS table above.
     * @param {string} shipId
     * @returns {string} One short line (never empty)
     */
    getUnlockCondition(shipId) {
        if (this.isShipUnlocked(shipId)) return 'Unlocked';

        // Derived: a boss whose `unlocks` grants this ship
        try {
            for (const boss of Object.values(bosses || {})) {
                if (boss?.unlocks?.type === 'ship' && boss.unlocks.id === shipId) {
                    return `Defeat ${boss.name || boss.id}`;
                }
            }
        } catch (e) {
            console.warn('[MetaStateManager] Unlock condition lookup failed:', e);
        }

        return SHIP_UNLOCK_CONDITIONS[shipId] || 'Coming in a later build';
    }

    /**
     * Check if an achievement is completed
     */
    hasAchievement(achievementId) {
        return this._meta.achievements.includes(achievementId);
    }

    /**
     * Mark an achievement as completed
     * @returns {boolean} True if newly completed
     */
    completeAchievement(achievementId) {
        if (this._meta.achievements.includes(achievementId)) return false;
        this._meta.achievements.push(achievementId);
        this.save();
        console.log('[MetaStateManager] Achievement completed:', achievementId);
        return true;
    }

    // ==================== STAT METHODS ====================

    /**
     * Record a run ending (death or victory)
     */
    recordRunEnd(runStats) {
        this._meta.stats.totalRuns++;

        if (runStats.outcome === 'death') {
            this._meta.stats.totalDeaths++;
        } else if (runStats.outcome === 'victory') {
            this._meta.stats.totalWins++;
        }

        // Accumulate kills
        this._meta.stats.totalKills += runStats.kills || 0;
        this._meta.stats.totalPirateKills += runStats.pirateKills || 0;

        // Accumulate credits
        this._meta.stats.totalCreditsEarned += runStats.creditsEarned || 0;

        // Track best run time (only for victories)
        if (runStats.outcome === 'victory' && runStats.runTimeMs) {
            if (!this._meta.stats.bestRunTimeMs || runStats.runTimeMs < this._meta.stats.bestRunTimeMs) {
                this._meta.stats.bestRunTimeMs = runStats.runTimeMs;
            }
        }

        // Track bosses defeated (runStats.bossesDefeated is an array of ids)
        const bossCount = Array.isArray(runStats.bossesDefeated)
            ? runStats.bossesDefeated.length
            : (Number(runStats.bossesDefeated) || 0);
        this._meta.stats.bossesDefeated = coerceBossCount(this._meta.stats.bossesDefeated) + bossCount;

        // Track zones reached
        if (runStats.zoneReached) {
            this._meta.stats.zonesReached[runStats.zoneReached] =
                (this._meta.stats.zonesReached[runStats.zoneReached] || 0) + 1;
        }

        this.save();
        console.log('[MetaStateManager] Run recorded - Total runs:', this._meta.stats.totalRuns);
    }

    /**
     * Get current stats
     */
    getStats() {
        return { ...this._meta.stats };
    }

    // ==================== DEBUG / RESET ====================

    /**
     * Reset all meta progression (for testing)
     */
    reset() {
        this._meta = makeDefaultMeta();
        this.save();
        console.log('[MetaStateManager] Reset to defaults');
    }
}

// Singleton instance
let _instance = null;

export function getMetaStateManager() {
    if (!_instance) {
        _instance = new MetaStateManager();
        _instance.init();
    }
    return _instance;
}

export default MetaStateManager;
