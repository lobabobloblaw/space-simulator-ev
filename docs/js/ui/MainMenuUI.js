/**
 * MainMenuUI - Roguelike main menu with ship selection
 *
 * Displays:
 * - Ship carousel (unlocked ships selectable, locked ships grayed out)
 * - BEGIN RUN / CONTINUE RUN buttons
 * - Meta progression stats
 */

import { getMetaStateManager } from '../core/MetaStateManager.js';
import { getRunSystem } from '../systems/RunSystem.js';
import { shipClasses } from '../data/gameData.js';

// Ship display order (matches unlock progression)
const SHIP_ORDER = ['shuttle', 'interceptor', 'corvette', 'freighter', 'gunship', 'battlecruiser'];

class MainMenuUI {
    constructor() {
        this.metaManager = getMetaStateManager();
        this.runSystem = getRunSystem();

        // DOM elements
        this.overlay = document.getElementById('mainMenuOverlay');
        this.carousel = document.getElementById('shipCarousel');
        this.startBtn = document.getElementById('startRunBtn');
        this.continueBtn = document.getElementById('continueRunBtn');
        this.statsContainer = document.getElementById('metaStats');

        // State
        this.selectedShipId = 'shuttle';

        // Callbacks (set by main_eventbus_pure)
        this.onStartRun = null;
        this.onContinueRun = null;
    }

    /**
     * Initialize the menu UI
     */
    init() {
        this._renderShipCarousel();
        this._renderMetaStats();
        this._setupEventListeners();
        this._updateContinueButton();
        console.log('[MainMenuUI] Initialized');
    }

    /**
     * Show the main menu
     */
    show() {
        this._renderShipCarousel();
        this._renderMetaStats();
        this._updateContinueButton();
        this.overlay.classList.remove('hidden');
    }

    /**
     * Hide the main menu
     */
    hide() {
        this.overlay.classList.add('hidden');
    }

    /**
     * Check if menu is visible
     */
    isVisible() {
        return !this.overlay.classList.contains('hidden');
    }

    // ==================== PRIVATE METHODS ====================

    _renderShipCarousel() {
        const unlockedShips = this.metaManager.getUnlockedShips();

        // Clear existing
        this.carousel.innerHTML = '';

        for (const shipId of SHIP_ORDER) {
            const shipData = shipClasses[shipId];
            if (!shipData) continue;

            const isUnlocked = unlockedShips.includes(shipId);
            const isSelected = shipId === this.selectedShipId;

            const shipEl = document.createElement('div');
            shipEl.className = 'ship-option';
            if (isSelected && isUnlocked) shipEl.classList.add('selected');
            if (!isUnlocked) shipEl.classList.add('locked');
            shipEl.dataset.shipId = shipId;

            // Ship name
            const nameEl = document.createElement('div');
            nameEl.className = 'ship-name';
            nameEl.textContent = shipData.name;
            shipEl.appendChild(nameEl);

            // Ship stats summary
            const statsEl = document.createElement('div');
            statsEl.className = 'ship-stats';
            const healthStat = shipData.maxHealth || 100;
            const cargoStat = shipData.cargoCapacity || 10;
            statsEl.textContent = `HP: ${healthStat} | Cargo: ${cargoStat}`;
            shipEl.appendChild(statsEl);

            // Locked label
            if (!isUnlocked) {
                const lockedEl = document.createElement('div');
                lockedEl.className = 'ship-locked-label';
                lockedEl.textContent = 'LOCKED';
                shipEl.appendChild(lockedEl);
            }

            this.carousel.appendChild(shipEl);
        }
    }

    _renderMetaStats() {
        const stats = this.metaManager.getStats();

        this.statsContainer.innerHTML = '';

        const statItems = [
            { label: 'RUNS', value: stats.totalRuns },
            { label: 'WINS', value: stats.totalWins },
            { label: 'KILLS', value: stats.totalKills }
        ];

        for (const item of statItems) {
            const statEl = document.createElement('div');
            statEl.className = 'meta-stat';

            const valueEl = document.createElement('div');
            valueEl.className = 'meta-stat-value';
            valueEl.textContent = item.value;

            const labelEl = document.createElement('div');
            labelEl.className = 'meta-stat-label';
            labelEl.textContent = item.label;

            statEl.appendChild(valueEl);
            statEl.appendChild(labelEl);
            this.statsContainer.appendChild(statEl);
        }
    }

    _updateContinueButton() {
        const hasSaved = this.runSystem.hasSavedRun();
        this.continueBtn.style.display = hasSaved ? 'block' : 'none';
    }

    _setupEventListeners() {
        // Ship selection
        this.carousel.addEventListener('click', (e) => {
            const shipEl = e.target.closest('.ship-option');
            if (!shipEl) return;

            const shipId = shipEl.dataset.shipId;

            // Can't select locked ships
            if (shipEl.classList.contains('locked')) return;

            // Update selection
            this.selectedShipId = shipId;
            this._renderShipCarousel();
        });

        // Start new run
        this.startBtn.addEventListener('click', () => {
            if (this.onStartRun) {
                this.onStartRun(this.selectedShipId);
            }
        });

        // Continue saved run
        this.continueBtn.addEventListener('click', () => {
            if (this.onContinueRun) {
                this.onContinueRun();
            }
        });
    }
}

// Singleton
let _instance = null;

export function getMainMenuUI() {
    if (!_instance) {
        _instance = new MainMenuUI();
    }
    return _instance;
}

export default MainMenuUI;
