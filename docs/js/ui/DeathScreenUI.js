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
    }

    /**
     * Initialize the death screen UI
     */
    init() {
        this._setupEventListeners();

        // Listen for run end events
        this.eventBus.on(RunEvents.RUN_END, (data) => {
            this._lastStats = data.stats;
            this._lastUnlocks = [];
            this.show();
        });

        console.log('[DeathScreenUI] Initialized');
    }

    /**
     * Show the death screen with stats
     */
    show(stats = null, unlocks = []) {
        if (stats) {
            this._lastStats = stats;
        }
        if (unlocks.length) {
            this._lastUnlocks = unlocks;
        }

        this._renderStats();
        this._renderUnlocks();
        this.overlay.classList.add('visible');
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
