/**
 * MetaStateManager - Manages permanent progression across runs
 * Handles ship unlocks, upgrade pool unlocks, and persistent statistics
 *
 * Stored separately from run state in localStorage key: 'galaxyTraderMeta'
 */

const META_STORAGE_KEY = 'galaxyTraderMeta';
const META_VERSION = '1.0';

// Default meta state for new players
const DEFAULT_META_STATE = {
    version: META_VERSION,
    unlocks: {
        ships: ['shuttle'],           // Starting ships available
        upgrades: ['mining_laser']    // Upgrades that can appear in shops
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

// All possible upgrade unlocks (for reference)
export const ALL_UPGRADES = [
    'mining_laser', 'rapid_laser', 'plasma_cannon',
    'shield_basic', 'shield_advanced',
    'engine_1', 'engine_2', 'engine_3',
    'cargo_expansion_1', 'cargo_expansion_2',
    'radar_mk1', 'radar_mk2'
];

class MetaStateManager {
    constructor() {
        this._meta = null;
        this._listeners = new Map();
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
     * Load meta state from localStorage
     */
    _loadFromStorage() {
        try {
            const stored = localStorage.getItem(META_STORAGE_KEY);
            if (!stored) return makeDefaultMeta();

            const parsed = JSON.parse(stored);

            // Version migration if needed
            if (parsed.version !== META_VERSION) {
                console.log('[MetaStateManager] Migrating from version', parsed.version);
                return this._migrate(parsed);
            }

            // Merge with defaults to ensure all fields exist
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
        return {
            version: META_VERSION,
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
    }

    /**
     * Migrate old meta state versions
     */
    _migrate(old) {
        // Future migrations go here
        return this._mergeWithDefaults(old);
    }

    /**
     * Save current meta state to localStorage
     */
    save() {
        try {
            localStorage.setItem(META_STORAGE_KEY, JSON.stringify(this._meta));
            console.log('[MetaStateManager] Saved');
            return true;
        } catch (e) {
            console.error('[MetaStateManager] Save failed:', e);
            return false;
        }
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
        this._emit('ship_unlock', { shipId });
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
        this._emit('upgrade_unlock', { upgradeId });
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
        this._emit('achievement_complete', { achievementId });
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

        // Track bosses defeated
        this._meta.stats.bossesDefeated += runStats.bossesDefeated || 0;

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

    // ==================== EVENT SYSTEM ====================

    /**
     * Subscribe to meta events
     */
    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
    }

    /**
     * Unsubscribe from meta events
     */
    off(event, callback) {
        if (!this._listeners.has(event)) return;
        const list = this._listeners.get(event);
        const idx = list.indexOf(callback);
        if (idx !== -1) list.splice(idx, 1);
    }

    /**
     * Emit a meta event
     */
    _emit(event, data) {
        if (!this._listeners.has(event)) return;
        for (const cb of this._listeners.get(event)) {
            try { cb(data); } catch (e) { console.error('[MetaStateManager] Event handler error:', e); }
        }
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

    /**
     * Unlock everything (for testing)
     */
    unlockAll() {
        this._meta.unlocks.ships = [...ALL_SHIPS];
        this._meta.unlocks.upgrades = [...ALL_UPGRADES];
        this.save();
        console.log('[MetaStateManager] All unlocks granted');
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
