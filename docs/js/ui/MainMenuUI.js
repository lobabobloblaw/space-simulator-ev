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

// Fallback unlock copy if MetaStateManager has no condition table (U6)
const FALLBACK_UNLOCK_CONDITIONS = {
    interceptor: 'Win a run',
    battlecruiser: 'Defeat The Void King'
};

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
        // Card the keyboard ring currently sits on (locked cards are reachable
        // so their unlock condition can be read, but cannot be selected)
        this.focusedShipId = 'shuttle';

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
        // Move focus into the menu so the carousel is reachable without a
        // mouse (U6). Deferred so the overlay is laid out first.
        try {
            requestAnimationFrame(() => {
                if (this.isVisible()) this._focusCard(this.selectedShipId);
            });
        } catch (_) {
            this._focusCard(this.selectedShipId);
        }
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

    /**
     * How a locked ship is earned. MetaStateManager owns the table; this keeps
     * a small fallback so the card never shows an empty hint.
     */
    _unlockCondition(shipId) {
        try {
            const c = this.metaManager.getUnlockCondition?.(shipId);
            if (c) return c;
        } catch (_) { /* fall through to local copy */ }
        return FALLBACK_UNLOCK_CONDITIONS[shipId] || 'Coming in a later build';
    }

    /**
     * Cards are an ARIA radio group (U6): arrow keys move the roving tabindex,
     * Enter/Space selects. Locked cards stay reachable so a keyboard user can
     * read the unlock condition, but they are `aria-disabled` and never select.
     */
    _renderShipCarousel() {
        const unlockedShips = this.metaManager.getUnlockedShips();

        // Keep the keyboard ring on a real card
        if (!SHIP_ORDER.includes(this.focusedShipId)) this.focusedShipId = this.selectedShipId;

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

            // Accessibility: radio semantics + roving tabindex
            shipEl.setAttribute('role', 'radio');
            shipEl.setAttribute('aria-checked', String(!!(isSelected && isUnlocked)));
            shipEl.tabIndex = (shipId === this.focusedShipId) ? 0 : -1;
            if (!isUnlocked) shipEl.setAttribute('aria-disabled', 'true');

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

            // Locked label + how to earn it
            if (!isUnlocked) {
                const lockedEl = document.createElement('div');
                lockedEl.className = 'ship-locked-label';
                lockedEl.textContent = 'LOCKED';
                shipEl.appendChild(lockedEl);

                const condition = this._unlockCondition(shipId);
                const hintEl = document.createElement('div');
                hintEl.className = 'ship-unlock-hint';
                hintEl.textContent = `Unlock: ${condition}`;
                shipEl.appendChild(hintEl);

                shipEl.title = `${shipData.name} — locked. Unlock: ${condition}`;
                shipEl.setAttribute('aria-label', `${shipData.name}, locked. Unlock: ${condition}`);
            } else {
                shipEl.setAttribute('aria-label', `${shipData.name}, HP ${healthStat}, cargo ${cargoStat}`);
            }

            this.carousel.appendChild(shipEl);
        }
    }

    /**
     * Select a ship (no-op for locked cards) and re-render the group.
     * @param {string} shipId
     * @param {boolean} [keepFocus] - Restore DOM focus after the rebuild
     */
    _selectShip(shipId, keepFocus = false) {
        const unlocked = this.metaManager.getUnlockedShips();
        if (!unlocked.includes(shipId)) return false;
        this.selectedShipId = shipId;
        this.focusedShipId = shipId;
        this._renderShipCarousel();
        if (keepFocus) this._focusCard(shipId);
        return true;
    }

    _focusCard(shipId) {
        const el = this.carousel.querySelector(`.ship-option[data-ship-id="${shipId}"]`);
        if (!el) return;
        this.focusedShipId = shipId;
        for (const card of this.carousel.querySelectorAll('.ship-option')) {
            card.tabIndex = (card === el) ? 0 : -1;
        }
        try { el.focus(); } catch (_) { /* focus is best-effort */ }
    }

    /**
     * Move the keyboard ring by `delta` cards (wraps).
     */
    _moveFocus(delta) {
        const ids = SHIP_ORDER.filter(id => shipClasses[id]);
        if (!ids.length) return;
        const current = ids.indexOf(this.focusedShipId);
        const next = ids[((current < 0 ? 0 : current) + delta + ids.length) % ids.length];
        this._focusCard(next);
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
            this._selectShip(shipId);
        });

        // Keyboard navigation (U6): arrows move, Enter/Space selects,
        // Home/End jump to the ends of the group.
        this.carousel.addEventListener('keydown', (e) => {
            const shipEl = e.target.closest && e.target.closest('.ship-option');
            if (!shipEl) return;

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    this._moveFocus(1);
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this._moveFocus(-1);
                    break;
                case 'Home':
                    e.preventDefault();
                    this._focusCard(SHIP_ORDER[0]);
                    break;
                case 'End':
                    e.preventDefault();
                    this._focusCard(SHIP_ORDER[SHIP_ORDER.length - 1]);
                    break;
                case 'Enter':
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    if (!shipEl.classList.contains('locked')) {
                        this._selectShip(shipEl.dataset.shipId, true);
                    }
                    break;
                default:
                    break;
            }
        });

        // Track the ring when focus arrives by Tab or mouse
        this.carousel.addEventListener('focusin', (e) => {
            const shipEl = e.target.closest && e.target.closest('.ship-option');
            if (shipEl && shipEl.dataset.shipId) this.focusedShipId = shipEl.dataset.shipId;
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
