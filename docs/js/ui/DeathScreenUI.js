/**
 * DeathScreenUI - Roguelike death screen with run summary
 *
 * Displays:
 * - Run statistics (time, kills, credits, zone reached)
 * - New unlocks earned this run
 * - TRY AGAIN / MAIN MENU buttons
 */

import { getRunSystem, RunEvents } from '../systems/RunSystem.js';
import { getEventBus } from '../core/EventBus.js';

class DeathScreenUI {
    constructor() {
        this.runSystem = getRunSystem();
        this.eventBus = getEventBus();

        // DOM elements
        this.overlay = document.getElementById('deathScreenOverlay');
        this.titleEl = this.overlay ? this.overlay.querySelector('.death-title') : null;
        this.zoneEl = document.getElementById('deathZone');
        this.runTimeEl = document.getElementById('deathRunTime');
        this.killsEl = document.getElementById('deathKills');
        this.creditsEl = document.getElementById('deathCredits');
        this.zoneReachedEl = document.getElementById('deathZoneReached');
        this.unlocksContainer = document.getElementById('deathUnlocks');
        this.retryBtn = document.getElementById('retryRunBtn');
        this.mainMenuBtn = document.getElementById('mainMenuBtn');

        // Callbacks (set by main_eventbus_pure)
        this.onRetry = null;
        this.onMainMenu = null;

        // Last run stats (populated on show)
        this._lastStats = null;
        this._lastUnlocks = [];
        this._victory = false;
    }

    /**
     * Initialize the death screen UI
     */
    init() {
        this._setupEventListeners();

        // Listen for run end events (death and victory share this screen)
        this.eventBus.on(RunEvents.RUN_END, (data) => {
            this.show(data?.stats || null, data?.unlocks || [], false);
        });
        this.eventBus.on(RunEvents.RUN_VICTORY, (data) => {
            this.show(data?.stats || null, data?.unlocks || [], true);
        });

        console.log('[DeathScreenUI] Initialized');
    }

    /**
     * Show the run-end screen with stats
     * @param {Object|null} stats - Run stats
     * @param {Array} unlocks - Unlocks granted this run ({type, id, name})
     * @param {boolean} victory - Render the victory variant
     */
    show(stats = null, unlocks = [], victory = false) {
        if (stats) {
            this._lastStats = stats;
        }
        this._lastUnlocks = Array.isArray(unlocks) ? unlocks : [];
        this._victory = !!victory;

        this._renderStats();
        this._renderOutcome();
        this._renderUnlocks();
        this.overlay.classList.add('visible');

        // Move focus to the primary action so the overlay is operable by
        // keyboard and screen readers land inside it (U6).
        try {
            requestAnimationFrame(() => {
                if (this.isVisible() && this.retryBtn) {
                    try { this.retryBtn.focus(); } catch (_) { /* focus is best-effort */ }
                }
            });
        } catch (_) {
            try { this.retryBtn?.focus(); } catch (_) { /* focus is best-effort */ }
        }
    }

    /**
     * Hide the death screen
     */
    hide() {
        this.overlay.classList.remove('visible');
    }

    /**
     * Check if death screen is visible
     */
    isVisible() {
        return this.overlay.classList.contains('visible');
    }

    // ==================== PRIVATE METHODS ====================

    /**
     * Swap title/subtitle/button copy between the death and victory variants
     */
    _renderOutcome() {
        if (this._victory) {
            this.overlay.classList.add('victory');
            if (this.titleEl) this.titleEl.textContent = 'VICTORY';
            if (this.zoneEl) this.zoneEl.textContent = 'The Void King is dead';
            if (this.retryBtn) this.retryBtn.textContent = 'NEW RUN';
        } else {
            this.overlay.classList.remove('victory');
            if (this.titleEl) this.titleEl.textContent = 'SHIP DESTROYED';
            if (this.retryBtn) this.retryBtn.textContent = 'TRY AGAIN';
        }
    }

    _renderStats() {
        const stats = this._lastStats;
        if (!stats) return;

        // Format run time
        const totalSeconds = Math.floor((stats.runTimeMs || 0) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Zone name mapping
        const zoneNames = {
            core: 'Core Systems',
            frontier: 'Frontier Space',
            outer_rim: 'Outer Rim',
            void: 'The Void'
        };

        const zoneName = zoneNames[stats.zoneReached] || stats.zoneReached || 'Core Systems';

        // Update DOM
        this.zoneEl.textContent = `Zone: ${zoneName}`;
        this.runTimeEl.textContent = timeStr;
        this.killsEl.textContent = stats.kills || 0;
        this.creditsEl.textContent = stats.creditsEarned || 0;
        this.zoneReachedEl.textContent = zoneName;
    }

    _renderUnlocks() {
        const unlocks = this._lastUnlocks;

        if (!unlocks || unlocks.length === 0) {
            this.unlocksContainer.style.display = 'none';
            return;
        }

        this.unlocksContainer.style.display = 'block';
        this.unlocksContainer.innerHTML = '';

        // Title
        const titleEl = document.createElement('div');
        titleEl.className = 'unlock-title';
        titleEl.textContent = 'NEW UNLOCKS';
        this.unlocksContainer.appendChild(titleEl);

        // Unlock items
        for (const unlock of unlocks) {
            const itemEl = document.createElement('div');
            itemEl.className = 'unlock-item';
            itemEl.textContent = unlock.name || unlock.id;
            this.unlocksContainer.appendChild(itemEl);
        }
    }

    _setupEventListeners() {
        // Try again - start new run with same ship
        this.retryBtn.addEventListener('click', () => {
            this.hide();
            if (this.onRetry) {
                this.onRetry(this._lastStats?.shipId || 'shuttle');
            }
        });

        // Main menu
        this.mainMenuBtn.addEventListener('click', () => {
            this.hide();
            if (this.onMainMenu) {
                this.onMainMenu();
            }
        });
    }
}

// Singleton
let _instance = null;

export function getDeathScreenUI() {
    if (!_instance) {
        _instance = new DeathScreenUI();
    }
    return _instance;
}

export default DeathScreenUI;
