import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { GameConstants } from '../utils/Constants.js';

/**
 * UISystem - Handles all UI elements (HUD, panels, overlays, notifications)
 * Manages trading interface, shop interface, landing overlays, and visual feedback
 */
export class UISystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // UI state
        this.currentPanel = null;
        this.planetCanvas = null;
        this.planetCtx = null;
        this.tutorialStage = 'start';
        this._thrustActive = false;
        this._brakeActive = false;

        // Focus management for landing overlay
        this._previouslyFocusedElement = null;
        this._overlayKeyHandler = null;
        
        // Bind event handlers
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleShipLanded = this.handleShipLanded.bind(this);
        this.handleShowPanel = this.handleShowPanel.bind(this);
        this.handleCloseOverlay = this.handleCloseOverlay.bind(this);
        this.handlePurchase = this.handlePurchase.bind(this);
        this.handleUIMessage = this.handleUIMessage.bind(this);
        this.handleTutorialUpdate = this.handleTutorialUpdate.bind(this);
        this.handleAudioStateChanged = this.handleAudioStateChanged.bind(this);
        // Bind music state handler to keep "this" context when called via EventBus
        this.handleMusicState = this.handleMusicState.bind(this);
        this.handleShipDestroyed = this.handleShipDestroyed.bind(this);
        this.handleShipRespawn = this.handleShipRespawn.bind(this);
        this._handleThrustChanged = (e) => { try { this._thrustActive = !!(e && e.active); this._updateFuelAlert(); } catch(_) {} };
        this._handleBrakeChanged = (e) => { try { this._brakeActive = !!(e && e.active); this._updateFuelAlert(); } catch(_) {} };
        
        console.log('[UISystem] Created');

        // Image provider preference for planet landscapes
        // Options: 'lexica' (search existing high-res), 'unsplash' (photo keywords), 'auto' (lexica→unsplash), 'none' (disable)
        // Default to 'unsplash' to avoid CORS warnings during local runs
        this.landscapeImageProvider = 'unsplash';
        // If true, when using Pollinations, prefer a single HQ attempt and wait longer
        this.pollinationsHQOnly = false;
        // Max wait per attempt (ms)
        this.pollinationsTimeoutMs = (GameConstants?.UI?.POLLINATIONS_TIMEOUT_MS ?? 12000);
        // Control whether Pollinations enhances prompts (can drift undesirably)
        this.usePollinationsEnhance = false;
        // Show provider/resolution debug overlay (off by default)
        this.showProviderInfo = false;

        // Radio scanning animation timers
        this.radioScanInterval = null;
        this.radioScanTimeout = null;

        // Notification queue (sequential, no stack overlap)
        this._notifQueue = [];
        this._notifActive = false;
        // Tiny console readout (reuse #tutorialHint area)
        this._consoleTimer = null;
        // Disable floating toast notifications by default (console line only)
        this._toastsEnabled = false;

        // HUD cache to minimize DOM churn
        this._hudCache = {
            values: {},
            lastSpeedTs: 0,
            speedMs: (GameConstants?.UI?.SPEED_READOUT_MS ?? 333) // update speed readout at ~3 Hz
        };

        // Cached DOM references for frequently-updated HUD elements (populated in init)
        this._domCache = {};
    }
    
    /**
     * Initialize the UI system
     */
    init() {
        // Get planet canvas reference
        this.planetCanvas = document.getElementById('planetCanvas');
        if (this.planetCanvas) {
            this.planetCtx = this.planetCanvas.getContext('2d');
        }

        // Cache frequently-accessed HUD elements to avoid per-frame getElementById calls
        const hudIds = ['health', 'shield', 'fuel', 'speed', 'cargo', 'location', 'credits', 'weapon', 'tutorialHint'];
        for (const id of hudIds) {
            this._domCache[id] = document.getElementById(id);
        }

        // Subscribe to UI events
        this.subscribeToEvents();
        
        // Initialize UI elements
        this.initializeUI();
        // Cache console element (tiny readout area)
        this._consoleEl = document.getElementById('tutorialHint');
        // Optional override to re-enable toasts for QA
        try { const g = (typeof window !== 'undefined') ? window : globalThis; if (typeof g.UI_TOASTS === 'boolean') this._toastsEnabled = !!g.UI_TOASTS; } catch(_) {}
        
        // Allow runtime override for landscape provider to avoid CORS noise during QA
        try {
            const prov = (typeof window !== 'undefined') ? window.UI_LANDSCAPE_PROVIDER : null;
            if (prov && typeof prov === 'string') {
                const v = prov.toLowerCase();
                if (v === 'lexica' || v === 'unsplash' || v === 'auto' || v === 'none') {
                    this.landscapeImageProvider = v;
                }
            }
        } catch(_) {}

        // Wire mute toggle click if present (H16: store ref for cleanup)
        const muteKey = document.getElementById('muteKey');
        if (muteKey) {
            muteKey.style.cursor = 'pointer';
            muteKey.title = 'Toggle sound (M)';
            this._muteKeyHandler = () => this.eventBus.emit(GameEvents.AUDIO_TOGGLE);
            muteKey.addEventListener('click', this._muteKeyHandler);
        }

        // Initialize mute label based on current state
        const audio = this.stateManager.state.audio;
        this.updateMuteLabel(audio && audio.enabled !== false);
        // Initialize radio controls
        this.initializeRadioControls();

        console.log('[UISystem] Initialized');
    }
    
    /**
     * Subscribe to game events
     */
    subscribeToEvents() {
        // State changes
        this.eventBus.on(GameEvents.UI_UPDATE, this.handleStateChange);
        // Physics input state (for fuel alert)
        this.eventBus.on(GameEvents.PHYSICS_THRUST_CHANGED, this._handleThrustChanged);
        this.eventBus.on(GameEvents.PHYSICS_BRAKE_CHANGED, this._handleBrakeChanged);
        
        // Landing/overlay events
        this.eventBus.on(GameEvents.SHIP_LANDED, this.handleShipLanded);
        this.eventBus.on(GameEvents.MENU_OPEN, this.handleShowPanel);
        this.eventBus.on(GameEvents.MENU_CLOSE, this.handleCloseOverlay);
        
        // Trading events
        this.eventBus.on(GameEvents.SHIP_UPGRADE, this.handlePurchase);
        
        // UI messages
        this.eventBus.on(GameEvents.UI_MESSAGE, this.handleUIMessage);
        // Audio state
        this.eventBus.on(GameEvents.AUDIO_STATE_CHANGED, this.handleAudioStateChanged);
        this.eventBus.on(GameEvents.AUDIO_MUSIC_STATE, this.handleMusicState);
        
        // Ship lifecycle
        this.eventBus.on(GameEvents.SHIP_DEATH, this.handleShipDestroyed);
        this.eventBus.on(GameEvents.SHIP_RESPAWN, this.handleShipRespawn);
        
        // Tutorial
        this.eventBus.on(GameEvents.TUTORIAL_UPDATE, this.handleTutorialUpdate);

        // No UI image toggles; provider behavior managed via debug toggles
    }
    
    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Make sure HUD elements exist
        const hudElements = [
            'health', 'shield', 'fuel', 'speed', 
            'cargo', 'location', 'credits', 'weapon'
        ];
        
        for (let id of hudElements) {
            if (!document.getElementById(id)) {
                console.warn(`[UISystem] HUD element '${id}' not found`);
            }
        }
    }

    // No initializeLandingControls; UI remains clean and non-interactive
    
    /**
     * Handle state change event
     */
    handleStateChange(data) {
        // Update HUD based on state changes
        this.updateHUD(data.ship);
    }
    
    /**
     * Handle ship landed event
     */
    handleShipLanded(data) {
        if (!data || !data.planet) return;
        
        this.showLandingOverlay(data.planet, data.ship);
    }
    
    /**
     * Handle show panel event
     */
    handleShowPanel(data) {
        if (!data || !data.panel) return;
        
        this.showPanel(data.panel, data.ship, data.commodities, data.shopInventory);
    }
    
    /**
     * Handle close overlay event
     */
    handleCloseOverlay() {
        this.closeLandingOverlay();
    }
    
    /**
     * Handle purchase event
     */
    handlePurchase(data) {
        if (this.currentPanel === 'shop' && data.ship) {
            this.updateShopPanel(data.ship, data.shopInventory);
        }
    }
    
    /**
     * Handle UI message event
     */
    handleUIMessage(data) {
        if (!data || !data.message) return;
        // Enqueue and play sequentially to avoid stacked overlap
        this.enqueueNotification(data.message, data.type || 'info', data.duration || 2000);
    }
    
    /**
     * Handle tutorial update event
     */
    handleTutorialUpdate(data) {
        if (data && data.stage) {
            this.tutorialStage = data.stage;
            this.updateTutorialHint(data.ship);
        }
    }

    // Removed UI-driven image source/enhance handlers per requirements

    handleAudioStateChanged(data) {
        const enabled = data && data.enabled !== false;
        this.updateMuteLabel(enabled);
    }

    handleShipDestroyed() {
        try {
            document.body.classList.add('ship-destroyed');
            // Pause music/radio
            this.eventBus.emit(GameEvents.AUDIO_MUSIC_PAUSE);
            // Mark radio UI as offline
            const rb = document.getElementById('shipRadio');
            const title = document.getElementById('radioTitle');
            if (rb) { rb.classList.remove('scanning', 'tuned'); rb.classList.add('offline'); }
            if (title) title.textContent = 'SIGNAL LOST';
        } catch(_) {}
    }
    
    handleShipRespawn() {
        try {
            document.body.classList.remove('ship-destroyed');
            const rb = document.getElementById('shipRadio');
            const title = document.getElementById('radioTitle');
            if (rb) rb.classList.remove('offline');
            if (title) title.textContent = 'SCANNING… 118.7 MHz CH-12';
        } catch(_) {}
    }

    updateMuteLabel(enabled) {
        const label = document.getElementById('muteActionLabel');
        if (label) {
            label.textContent = enabled ? 'MUTE' : 'UNMUTE';
        }
    }
    
    initializeRadioControls() {
        const radioBox = document.getElementById('shipRadio');
        const prev = document.getElementById('radioPrev');
        const play = document.getElementById('radioPlay');
        const next = document.getElementById('radioNext');
        const title = document.getElementById('radioTitle');
        const dial = document.getElementById('radioDial');
        if (!(prev && play && next && title)) return;

        // Install a lightweight static overlay inside the dial to avoid solid black
        try {
            const g = (typeof window !== 'undefined') ? window : globalThis;
            if (dial && !document.getElementById('radioStatic') && !(g.RADIO_STATIC === false || g.UI_PANEL_STATIC === false)) {
                const c = document.createElement('canvas');
                c.id = 'radioStatic';
                // Size canvas to the dial's pixel size
                const rect = dial.getBoundingClientRect();
                const sz = Math.max(1, Math.round(rect.width || 128));
                c.width = sz; c.height = sz;
                dial.appendChild(c);
                this._radioStaticCanvas = c;
                this._radioStaticCtx = c.getContext('2d', { alpha: true, desynchronized: true }) || c.getContext('2d');
                // Offscreen noise tile
                const tile = document.createElement('canvas'); tile.width = 64; tile.height = 64;
                this._radioNoiseTile = tile; this._radioNoiseCtx = tile.getContext('2d');
                this._radioNoiseLast = 0;
                // Draw once immediately
                this._drawRadioStatic();
                // Update on interval (lightweight)
                if (this._radioStaticTimer) clearInterval(this._radioStaticTimer);
                this._radioStaticTimer = setInterval(() => this._drawRadioStatic(), (GameConstants?.UI?.RADIO?.DIAL_STATIC_INTERVAL_MS ?? 120));
                // Handle resize: keep canvas backing store sized to visual size
                const ro = new ResizeObserver(() => {
                    try {
                        const r = dial.getBoundingClientRect();
                        const s = Math.max(1, Math.round(r.width || sz));
                        if (c.width !== s || c.height !== s) { c.width = s; c.height = s; }
                        this._drawRadioStatic();
                    } catch(_) {}
                });
                ro.observe(dial);
                this._radioResizeObs = ro;
            }
        } catch (_) {}
        const startScan = (lockAfterMs = (GameConstants?.UI?.RADIO?.LOCK_MS ?? 1200)) => {
            if (!title) return;
            if (radioBox) { radioBox.classList.add('scanning'); radioBox.classList.remove('tuned'); }
            // Clear any existing scan
            if (this.radioScanInterval) { clearInterval(this.radioScanInterval); this.radioScanInterval = null; }
            if (this.radioScanTimeout) { clearTimeout(this.radioScanTimeout); this.radioScanTimeout = null; }

            const roll = () => {
                const freq = (87 + Math.random() * 53).toFixed(1); // 87.0–140.0
                const band = Math.random() > 0.3 ? 'MHz' : 'kHz';
                const channel = 'CH-' + String(Math.floor(Math.random() * 90) + 10).padStart(2, '0');
                const dots = '.'.repeat((Math.floor(Date.now() / 200) % 4));
                title.textContent = `SCANNING${dots} ${freq} ${band} ${channel}`;
            };
            roll();
            this.radioScanInterval = setInterval(roll, (GameConstants?.UI?.RADIO?.SCAN_ROLL_MS ?? 140));
            this.radioScanTimeout = setTimeout(() => {
                if (this.radioScanInterval) { clearInterval(this.radioScanInterval); this.radioScanInterval = null; }
                // Lock to a tuned readout
                const freq = (87 + Math.random() * 53).toFixed(1);
                const band = Math.random() > 0.3 ? 'MHz' : 'kHz';
                const channel = 'CH-' + String(Math.floor(Math.random() * 90) + 10).padStart(2, '0');
                title.textContent = `${freq} ${band} ${channel}`;
                if (radioBox) { radioBox.classList.add('tuned'); radioBox.classList.remove('scanning'); }
            }, lockAfterMs);
        };

        play.onclick = () => this.eventBus.emit(GameEvents.AUDIO_MUSIC_TOGGLE);
        prev.onclick = () => { startScan((GameConstants?.UI?.RADIO?.BUTTON_LOCK_MS ?? 1000)); this.eventBus.emit(GameEvents.AUDIO_MUSIC_PREV); };
        next.onclick = () => { startScan((GameConstants?.UI?.RADIO?.BUTTON_LOCK_MS ?? 1000)); this.eventBus.emit(GameEvents.AUDIO_MUSIC_NEXT); };
        title.textContent = 'SCANNING… 118.7 MHz CH-12';
    }

    _drawRadioStatic() {
        try {
            const ctx = this._radioStaticCtx; const c = this._radioStaticCanvas; const tctx = this._radioNoiseCtx; const t = this._radioNoiseTile;
            if (!(ctx && c && tctx && t)) return;
            const now = Date.now();
            if (now - (this._radioNoiseLast || 0) > (GameConstants?.UI?.RADIO?.DIAL_NOISE_ROLL_MS ?? 80)) {
                const img = tctx.createImageData(t.width, t.height);
                for (let i = 0; i < img.data.length; i += 4) {
                    const v = (Math.random() * 255) | 0;
                    img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 255;
                }
                tctx.putImageData(img, 0, 0);
                this._radioNoiseLast = now;
            }
            ctx.save();
            ctx.setTransform(1,0,0,1,0,0);
            // Clear only alpha to keep CSS dial visuals underneath
            ctx.clearRect(0,0,c.width,c.height);
            // Noise
            ctx.globalAlpha = 0.06;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(t, 0, 0, c.width, c.height);
            // Scanlines
            ctx.globalAlpha = 0.05;
            ctx.fillStyle = '#000';
            for (let y = 0; y < c.height; y += 2) ctx.fillRect(0, y, c.width, 1);
            ctx.restore();
        } catch (_) {}
    }

    handleMusicState(data) {
        const title = document.getElementById('radioTitle');
        const play = document.getElementById('radioPlay');
        if (title && data) {
            if (data.playing) {
                // Stop scanning and show tuned
                if (this.radioScanInterval) { clearInterval(this.radioScanInterval); this.radioScanInterval = null; }
                if (this.radioScanTimeout) { clearTimeout(this.radioScanTimeout); this.radioScanTimeout = null; }
                const freq = (87 + Math.random() * 53).toFixed(1);
                const band = Math.random() > 0.3 ? 'MHz' : 'kHz';
                const channel = 'CH-' + String(Math.floor(Math.random() * 90) + 10).padStart(2, '0');
                title.textContent = `${freq} ${band} ${channel}`;
                const rb = document.getElementById('shipRadio'); if (rb) { rb.classList.add('tuned'); rb.classList.remove('scanning'); }
            } else {
                title.textContent = 'SCANNING…';
                const rb = document.getElementById('shipRadio'); if (rb) { rb.classList.add('scanning'); rb.classList.remove('tuned'); }
            }
        }
        if (play && data) {
            play.textContent = data.playing ? '⏸' : '▶';
        }
    }

    // signal bars removed per design preference
    
    /**
     * Update HUD elements
     */
    updateHUD(ship) {
        if (!ship) return;
        const now = performance.now ? performance.now() : Date.now();
        const cache = this._domCache;

        // Helper using cached DOM reference (avoids getElementById per frame)
        const updateElement = (id, value) => {
            const element = cache[id];
            if (!element) return;
            // Avoid unnecessary DOM writes to reduce layout/reflow
            const strVal = String(value);
            if (element.textContent !== strVal) {
                element.textContent = strVal;
            }
        };

        // Health/Shield/Fuel: rounded values minimize updates
        updateElement('health', Math.max(0, Math.round(ship.health)) + '%');
        updateElement('shield', ship.shield > 0 ? Math.round(ship.shield) : 'EQUIP');
        updateElement('fuel', Math.round(ship.fuel) + '%');
        // Update fuel alert based on latest values
        this._updateFuelAlert();

        // Speed: gate to reduce frequent layout thrash
        try {
            const ms = (typeof window !== 'undefined' && Number(window.UI_SPEED_MS)) || this._hudCache.speedMs;
            if (now - (this._hudCache.lastSpeedTs || 0) >= Math.max(120, ms)) {
                this._hudCache.lastSpeedTs = now;
                const sp = (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1);
                // Cache string to avoid DOM reads
                if (this._hudCache.values.speed !== sp) {
                    this._hudCache.values.speed = sp;
                    updateElement('speed', sp);
                }
            }
        } catch(_) {}

        const cargoUsed = Array.isArray(ship.cargo)
            ? ship.cargo.reduce((sum, item) => sum + (item?.quantity ?? 1), 0)
            : 0;
        const cargoStr = cargoUsed + '/' + (ship.cargoCapacity || 10);
        if (this._hudCache.values.cargo !== cargoStr) { this._hudCache.values.cargo = cargoStr; updateElement('cargo', cargoStr); }
        const locStr = ship.isLanded && ship.landedPlanet ? ship.landedPlanet.name : 'SPACE';
        if (this._hudCache.values.location !== locStr) { this._hudCache.values.location = locStr; updateElement('location', locStr); }
        const credStr = String(ship.credits || 0);
        if (this._hudCache.values.credits !== credStr) { this._hudCache.values.credits = credStr; updateElement('credits', credStr); }
        updateElement('weapon', ship.weapons && ship.weapons.length > 0 ?
            ship.weapons[ship.currentWeapon].type.toUpperCase() : 'EQUIP');
        // Kills and target readouts removed from HUD by design
    }

    _updateFuelAlert() {
        try {
            const el = this._domCache.fuel;
            if (!el) return;
            const ship = this.stateManager.state?.ship;
            // Use displayed value semantics: blink when the shown percent is 0%
            const zero = !!(ship && Math.round(ship.fuel || 0) <= 0);
            const active = this._thrustActive || this._brakeActive;
            if (zero && active) el.classList.add('fuel-alert');
            else el.classList.remove('fuel-alert');
        } catch(_) {}
    }
    
    /**
     * Update tutorial hint
     */
    updateTutorialHint(ship) {
        const hintElement = this._domCache.tutorialHint;
        if (!hintElement) return;
        // If console is showing a readout, do not override it
        if (hintElement.dataset && hintElement.dataset.console === '1') return;
        
        let message = null;
        
        switch(this.tutorialStage) {
            case 'start':
                message = 'Welcome pilot! Land at a planet (L key when close) to purchase weapons and start trading.';
                if (ship.weapons && ship.weapons.length > 0) {
                    this.tutorialStage = 'armed';
                    message = 'WEAPONS ONLINE. Fire with SPACE. Check missions at planets for rewards!';
                }
                break;

            case 'armed':
                message = 'ARMED: Fire with SPACE. Hunt pirates or accept missions for credits.';
                if (ship.kills >= 1) {
                    this.tutorialStage = 'combat';
                    message = 'First kill confirmed! You can now access all ship systems.';
                }
                break;

            case 'combat':
                if (ship.kills >= 5 || ship.credits >= 2000) {
                    message = 'Good work! Explore the shipyard to upgrade your vessel.';
                    this.tutorialStage = 'complete';
                } else {
                    message = 'Complete missions and trade goods to earn credits. Press M to toggle minimap.';
                }
                break;

            case 'complete':
                message = 'Tutorial complete! Explore the galaxy, upgrade ships, and build your fortune.';
                this.tutorialStage = 'done';
                break;
        }
        
        if (message) {
            hintElement.textContent = message;
            hintElement.classList.add('visible');
        } else {
            hintElement.classList.remove('visible');
        }
    }
    
    /**
     * Show landing overlay
     */
    showLandingOverlay(planet, ship) {
        const overlay = document.getElementById('landingOverlay');
        if (!overlay) return;

        // Focus management: Save currently focused element
        this._previouslyFocusedElement = document.activeElement;

        // Show overlay
        overlay.style.display = 'flex';

        // Update planet info
        const nameElement = document.getElementById('planetName');
        const descElement = document.getElementById('planetDescription');

        if (nameElement) nameElement.textContent = planet.name;
        if (descElement) {
            const text = planet.longDescription || planet.description || '';
            descElement.textContent = text;
        }
        // Populate contextual details panel
        this.populateLandingDetails(planet);

        // Draw planet visual
        if (this.planetCanvas) {
            const useAI = this.landscapeImageProvider !== 'none';
            this.drawPlanetVisual(planet, this.planetCanvas, useAI);
        }

        // Show landing info panel by default
        this.showPanel('landing', ship);

        // Focus management: Set focus to first button and add keyboard shortcuts
        // Defensively remove any existing overlay key handler before attaching new one (C3)
        if (this._overlayKeyHandler) {
            document.removeEventListener('keydown', this._overlayKeyHandler);
            this._overlayKeyHandler = null;
        }
        setTimeout(() => {
            const firstButton = document.getElementById('departBtn');
            if (firstButton) {
                firstButton.focus();
            }

            // Add keyboard shortcuts for overlay buttons (1-6 keys)
            this._overlayKeyHandler = (e) => {
                if (overlay.style.display === 'none') return;

                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        document.getElementById('departBtn')?.click();
                        break;
                    case '2':
                        e.preventDefault();
                        document.getElementById('stationBtn')?.click();
                        break;
                    case '3':
                        e.preventDefault();
                        document.getElementById('tradeBtn')?.click();
                        break;
                    case '4':
                        e.preventDefault();
                        document.getElementById('outfitterBtn')?.click();
                        break;
                    case '5':
                        e.preventDefault();
                        document.getElementById('missionsBtn')?.click();
                        break;
                    case '6':
                        e.preventDefault();
                        document.getElementById('shipyardBtn')?.click();
                        break;
                }
            };

            document.addEventListener('keydown', this._overlayKeyHandler);
        }, 0);
    }

    /**
     * Populate landing details (market snapshot, outfitter inventory)
     */
    async populateLandingDetails(planet) {
        const details = document.getElementById('landingDetails');
        if (!details) return;
        try {
            const mod = await import('../data/gameData.js');
            const commodities = mod.commodities || {};
            const shopInventory = mod.shopInventory || {};

            // Market snapshot: compute relative prices
            const entries = Object.entries(planet.commodityPrices || {});
            const analyzed = entries.map(([key, price]) => {
                const base = commodities[key]?.basePrice || price;
                const delta = price - base;
                const ratio = base ? price / base : 1;
                return { key, price, base, delta, ratio };
            });
            const bestBuys = analyzed.slice().sort((a,b)=>a.ratio-b.ratio).slice(0,2);
            const bestSells = analyzed.slice().sort((a,b)=>b.ratio-a.ratio).slice(0,2);

            // Build safe DOM in place
            details.textContent = '';
            const mkDiv = (style) => { const d = document.createElement('div'); if (style) d.style.cssText = style; return d; };
            const headerStyle = 'color:#888; text-transform:uppercase; letter-spacing:1px; font-size:10px; margin-bottom:4px;';
            const market = mkDiv('margin-top:8px;');
            const mh = mkDiv(headerStyle); mh.textContent = 'Market Highlights'; market.appendChild(mh);
            const row = mkDiv('display:flex; gap:12px;');
            const buys = mkDiv('flex:1');
            const buysLbl = mkDiv('color:#aaa; font-size:10px; display:inline;'); buysLbl.textContent = 'Best Buys: ';
            buys.appendChild(buysLbl);
            const buysSpan = document.createElement('span');
            if (bestBuys.length) {
                buysSpan.textContent = bestBuys.map(x => {
                    const c = commodities[x.key];
                    const name = c?.name || x.key;
                    return `${c?.icon || ''} ${name} — §${x.price}`;
                }).join(' • ');
            } else { buysSpan.textContent = '—'; }
            buys.appendChild(buysSpan);
            const sells = mkDiv('flex:1');
            const sellsLbl = mkDiv('color:#aaa; font-size:10px; display:inline;'); sellsLbl.textContent = 'Best Sells: ';
            sells.appendChild(sellsLbl);
            const sellsSpan = document.createElement('span');
            if (bestSells.length) {
                sellsSpan.textContent = bestSells.map(x => {
                    const c = commodities[x.key];
                    const name = c?.name || x.key;
                    return `${c?.icon || ''} ${name} — §${x.price} (base §${x.base})`;
                }).join(' • ');
            } else { sellsSpan.textContent = '—'; }
            sells.appendChild(sellsSpan);
            row.appendChild(buys); row.appendChild(sells);
            market.appendChild(row);
            details.appendChild(market);

            const outf = mkDiv('margin-top:12px;');
            const oh = mkDiv(headerStyle); oh.textContent = 'Outfitter Inventory'; outf.appendChild(oh);
            const oBody = mkDiv('font-size:12px; line-height:1.4;');
            const items = (planet.shopItems || []).map(id => shopInventory[id]).filter(Boolean).slice(0,3);
            oBody.textContent = items.length ? items.map(i => `${i.name} — §${i.price}`).join(' • ') : 'Standard services only';
            outf.appendChild(oBody);
            details.appendChild(outf);
        } catch (e) {
            // Fallback: clear details if module load fails
            details.textContent = '';
        }
    }

    /**
     * Draw high-quality planet visual using Pollinations API with higher resolution
     */
    async drawPlanetVisual(planet, planetCanvas, useAI = true) {
        const ctx = planetCanvas.getContext('2d');
        const cssWidth = planetCanvas.clientWidth || 420;
        const cssHeight = planetCanvas.clientHeight || 472;
        // Increase canvas backing resolution for sharper rendering on HiDPI
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        planetCanvas.width = Math.floor(cssWidth * dpr);
        planetCanvas.height = Math.floor(cssHeight * dpr);
        const width = planetCanvas.width;
        const height = planetCanvas.height;

        // Clear canvas first and ensure overlays exist
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        this.addFilmGrainOverlay(planetCanvas);
        this.addSignalProcessingOverlay(planetCanvas);

        if (!useAI) {
            this.drawCanvasFallback(planet, planetCanvas);
            return;
        }

        // Attempt provider 1: Lexica (search-based, often higher-res, free)
        if (useAI && (this.landscapeImageProvider === 'lexica' || this.landscapeImageProvider === 'auto')) {
            try {
                const url = await this.fetchLexicaImageUrl(this.generatePlanetPrompt(planet), Math.floor(cssWidth * dpr));
                if (url) {
                    await this.loadPlanetImage(url, planet, planetCanvas, ctx, 'LEX');
                    return;
                }
            } catch (e) {
                // Continue to pollinations attempts
            }
        }

        // Attempt provider 2: Unsplash Source (free, high-res photos by keywords)
        if (useAI && (this.landscapeImageProvider === 'unsplash' || this.landscapeImageProvider === 'auto')) {
            try {
                const url = this.buildUnsplashUrl(Math.floor(cssWidth * dpr), Math.floor(cssHeight * dpr), planet);
                const ok = await this.loadPlanetImage(url, planet, planetCanvas, ctx, 'UNS', { crossorigin: false });
                if (ok) return;
            } catch (e) {
                // Continue to pollinations attempts
            }
        }

        // Build high-quality image request with multiple attempts (Pollinations)
        const baseW = Math.round(cssWidth);
        const baseH = Math.round(cssHeight); // keep 8:9 aspect
        const prompt = this.generatePlanetPrompt(planet);
        const encodedPrompt = encodeURIComponent(prompt);
        // Use deterministic seed per planet for consistent imagery
        const randomSeed = this.getDeterministicSeed(planet);

        // Candidate sizes (w,h) in priority order: max cap, DPR oversample, DPR, baseline
        const candidates = [];
        const pushUnique = (w,h) => {
            const key = `${w}x${h}`;
            if (!candidates.find(c => c.key === key)) candidates.push({w,h,key});
        };
        // Build candidate sizes
        if (this.pollinationsHQOnly) {
            // Single HQ candidate only
            pushUnique(1024, Math.floor(1024 * baseH / baseW));
        } else {
            // Prefer one solid HQ attempt to avoid long multi-fallbacks
            pushUnique(1024, Math.floor(1024 * baseH / baseW)); // 1k wide
            const oversample = 1.25; // modest oversample
            pushUnique(Math.floor(baseW * dpr * oversample), Math.floor(baseH * dpr * oversample));
            pushUnique(Math.floor(baseW * dpr), Math.floor(baseH * dpr));
            // Baseline CSS size
            pushUnique(baseW, baseH);
        }

        const buildPollinationsUrl = (w, h) => {
            const params = new URLSearchParams();
            params.set('model', 'flux');
            params.set('width', String(w));
            params.set('height', String(h));
            params.set('seed', String(randomSeed));
            params.set('enhance', this.usePollinationsEnhance ? 'true' : 'false');
            params.set('safe', 'true');
            params.set('private', 'true');
            // nologo requires registered referrer; harmless to pass
            params.set('nologo', 'true');
            try {
                params.set('referrer', window.location.origin);
            } catch (_) {}
            return `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`;
        };

        const urls = candidates.map(c => ({
            url: buildPollinationsUrl(c.w, c.h),
            w: c.w,
            h: c.h
        }));

        const img = new Image();
        let attempt = 0;
        let timeoutId = null;

        const tryLoad = () => {
            if (attempt >= urls.length) {
                // All attempts failed; fallback to procedural
                this.drawCanvasFallback(planet, planetCanvas);
                return;
            }
            const target = urls[attempt++];
            img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            // Start timeout to fallback if server is slow or rejects large size silently
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                // Move to next candidate
                tryLoad();
            }, this.pollinationsTimeoutMs); // allow extended time for HQ generation
            img.src = target.url;
        };

        img.onload = () => {
            if (timeoutId) clearTimeout(timeoutId);
            // Prefer high smoothing for downscale quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Show actual resolution info for diagnostics (optional)
            if (this.showProviderInfo) {
                this.showImageInfo(planetCanvas, img.naturalWidth, img.naturalHeight, attempt, urls.length, 'POL');
            } else {
                // Ensure any previous debug overlay is removed
                const old = planetCanvas.parentElement?.querySelector('.ai-image-info');
                if (old) old.remove();
            }
            this.fadeInPlanetImage(img, planetCanvas, planet.name);
        };

        img.onerror = () => {
            if (timeoutId) clearTimeout(timeoutId);
            // Try next resolution or fallback
            tryLoad();
        };

        tryLoad();
    }

    /**
     * Derive a deterministic numeric seed from planet identity
     */
    getDeterministicSeed(planet) {
        const s = `${planet?.name || ''}|${Math.round(planet?.x||0)},${Math.round(planet?.y||0)}|${Math.round(planet?.radius||0)}`;
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0; // 32-bit
        }
        // Keep seed positive and within a reasonable range
        return Math.abs(hash % 1000000);
    }

    /**
     * Validate Lexica API response structure
     * @param {any} data - Parsed JSON response
     * @returns {boolean} True if response has expected structure
     */
    _validateLexicaResponse(data) {
        if (!data || typeof data !== 'object') return false;
        if (!Array.isArray(data.images)) return false;
        // Validate each image has expected string URL properties
        for (const img of data.images) {
            if (!img || typeof img !== 'object') continue;
            // At least one URL source should be a string
            const hasValidUrl = (typeof img.src === 'string' && img.src.startsWith('http')) ||
                               (typeof img.srcSmall === 'string' && img.srcSmall.startsWith('http'));
            if (!hasValidUrl) continue; // Skip invalid entries, don't fail entire response
        }
        return true;
    }

    /**
     * Fetch a high-res image URL from Lexica search by prompt.
     * Chooses the first image meeting minWidth, otherwise best available.
     */
    async fetchLexicaImageUrl(prompt, minWidth = 800) {
        const q = encodeURIComponent(prompt);
        const endpoint = `https://lexica.art/api/v1/search?q=${q}`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), (GameConstants?.UI?.LANDSCAPE_FETCH_TIMEOUT_MS ?? 3500));
        try {
            const res = await fetch(endpoint, { signal: ctrl.signal });
            clearTimeout(t);
            if (!res.ok) throw new Error(`Lexica HTTP ${res.status}`);
            const data = await res.json();

            // Validate API response structure
            if (!this._validateLexicaResponse(data)) {
                console.warn('[UISystem] Invalid Lexica API response structure');
                return null;
            }

            const imgs = data.images;
            if (imgs.length === 0) return null;
            // Prefer portrait-ish or square images with width >= minWidth
            const candidates = imgs
                .filter(i => i && typeof i === 'object')
                .map(i => ({
                    url: (typeof i.src === 'string' && i.src.startsWith('http')) ? i.src :
                         (typeof i.srcSmall === 'string' && i.srcSmall.startsWith('http')) ? i.srcSmall : null,
                    w: typeof i.width === 'number' ? i.width : 0,
                    h: typeof i.height === 'number' ? i.height : 0,
                }))
                .filter(i => !!i.url);
            const good = candidates.filter(i => i.w >= minWidth);
            const chosen = (good[0] || candidates[0]);
            return chosen ? chosen.url : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Load an image URL to the planet canvas using high-quality smoothing
     */
    async loadPlanetImage(url, planet, planetCanvas, ctx, providerTag = 'AI', opts = {}) {
        return new Promise((resolve) => {
            const img = new Image();
            if (opts.crossorigin === false) {
                // Leave crossOrigin unset to avoid CORS issues with canvas draw
            } else {
                img.crossOrigin = 'anonymous';
            }
            img.decoding = 'async';
            img.onload = () => {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                if (this.showProviderInfo) {
                    this.showImageInfo(planetCanvas, img.naturalWidth, img.naturalHeight, 1, 1, providerTag);
                } else {
                    const old = planetCanvas.parentElement?.querySelector('.ai-image-info');
                    if (old) old.remove();
                }
                this.fadeInPlanetImage(img, planetCanvas, planet.name);
                resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    /**
     * Display small overlay with image resolution/debug info in planet visual area
     */
    showImageInfo(planetCanvas, w, h, attempt, total, provider = 'AI') {
        const container = planetCanvas.parentElement;
        if (!container) return;
        if (!this.showProviderInfo) {
            const old = container.querySelector('.ai-image-info');
            if (old) old.remove();
            return;
        }
        let info = container.querySelector('.ai-image-info');
        if (!info) {
            info = document.createElement('div');
            info.className = 'ai-image-info';
            container.appendChild(info);
            info.style.cssText = `
                position: absolute;
                bottom: 6px;
                left: 8px;
                font-size: 10px;
                color: #aaa;
                background: rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.1);
                padding: 2px 6px;
                pointer-events: none;
                z-index: 20;
            `;
        }
        info.textContent = `${provider} ${w}x${h} (try ${attempt}/${total})`;
    }

    /**
     * Build an Unsplash Source URL for planet landscapes
     */
    buildUnsplashUrl(w, h, planet) {
        const terms = [
            'space', 'planet', 'atmosphere', 'landscape',
            planet?.name?.toLowerCase().replace(/\s+/g, '-') || ''
        ].filter(Boolean).join(',');
        // Unsplash Source returns a random matching image at requested size
        return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(terms)}`;
    }
    
    /**
     * Close landing overlay
     */
    closeLandingOverlay() {
        const overlay = document.getElementById('landingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Focus management: Remove keyboard handler
        if (this._overlayKeyHandler) {
            document.removeEventListener('keydown', this._overlayKeyHandler);
            this._overlayKeyHandler = null;
        }

        // Focus management: Restore previously focused element
        if (this._previouslyFocusedElement && typeof this._previouslyFocusedElement.focus === 'function') {
            try {
                this._previouslyFocusedElement.focus();
            } catch(e) {
                // Element might no longer be in DOM
            }
        }
        this._previouslyFocusedElement = null;

        // Clear planet canvas data
        if (this.planetCanvas) {
            delete this.planetCanvas.dataset.planetLoaded;
        }

        // Emit resume event
        this.eventBus.emit(GameEvents.GAME_RESUME);
    }
    
    /**
     * Show a specific panel
     */
    showPanel(panel, ship, commodities, shopInventory) {
        // Get all panels
        const tradingPanel = document.getElementById('tradingPanel');
        const shopPanel = document.getElementById('shopPanel');
        const missionsPanel = document.getElementById('missionsPanel');
        const shipyardPanel = document.getElementById('shipyardPanel');
        const landingInfo = document.getElementById('landingInfo');

        // Hide all panels first
        if (tradingPanel) tradingPanel.style.display = 'none';
        if (shopPanel) shopPanel.style.display = 'none';
        if (missionsPanel) missionsPanel.style.display = 'none';
        if (shipyardPanel) shipyardPanel.style.display = 'none';
        if (landingInfo) landingInfo.style.display = 'none';

        // Update current panel
        this.currentPanel = panel;

        // Show the requested panel
        if (panel === 'landing') {
            if (landingInfo) {
                landingInfo.style.display = 'flex';
            }
        } else if (panel === 'trading') {
            if (tradingPanel) {
                tradingPanel.style.display = 'flex';
                // TradingSystem owns the trading panel render + click delegation
            }
        } else if (panel === 'shop') {
            if (shopPanel) {
                shopPanel.style.display = 'flex';
                if (ship && shopInventory) {
                    this.updateShopPanel(ship, shopInventory);
                }
                // Ensure delegated handlers are attached once
                this.attachShopDelegates();
            }
        } else if (panel === 'missions') {
            if (missionsPanel) {
                missionsPanel.style.display = 'flex';
                if (ship) {
                    this.updateMissionsPanel(ship);
                }
                // Ensure delegated handlers are attached once
                this.attachMissionDelegates();
            }
        } else if (panel === 'shipyard') {
            if (shipyardPanel) {
                shipyardPanel.style.display = 'flex';
                if (ship) {
                    this.updateShipyardPanel(ship);
                }
                // Ensure delegated handlers are attached once
                this.attachShipyardDelegates();
            }
        }
    }
    
    /**
     * Update shop panel
     */
    updateShopPanel(ship, shopInventory) {
        if (!ship) return;
        
        // Use landedPlanet if currentPlanet is not set
        const planet = ship.currentPlanet || ship.landedPlanet;
        if (!planet) return;
        
        // Update credits display
        const creditsElement = document.getElementById('shopCredits');
        if (creditsElement) creditsElement.textContent = ship.credits;
        
        // Build shop list
        const list = document.getElementById('shopList');
        if (!list) return;
        
        try { list.setAttribute('role', 'list'); } catch(_) {}
        list.innerHTML = '';
        
        // Only show items available at this planet
        const availableItems = planet.shopItems || [];
        
        // If no specific items, show all basic items for now
        const defaultItems = ['laser', 'rapid', 'plasma', 'mining', 'shield_basic', 'engine_upgrade'];
        const itemsToShow = availableItems.length > 0 ? availableItems : defaultItems;
        
        if (shopInventory) {
            for (let itemId of itemsToShow) {
                const item = shopInventory[itemId];
                if (!item) continue;
                
                // Check if already purchased (for certain upgrades)
                let alreadyOwned = false;
                if (item.type === 'shield' && ship.maxShield >= item.value) {
                    alreadyOwned = true;
                } else if (item.type === 'engine' && ship.engineLevel >= item.value) {
                    alreadyOwned = true;
                } else if (item.type === 'weapon' && ship.weapons) {
                    // Check if weapon already owned
                    alreadyOwned = ship.weapons.some(w => w.type === itemId);
                }
                
                const shopItem = document.createElement('div');
                shopItem.className = 'shop-item';
                try { shopItem.setAttribute('role', 'listitem'); } catch(_) {}

                // Build item info section
                const itemInfo = document.createElement('div');
                itemInfo.className = 'item-info';

                const itemName = document.createElement('div');
                itemName.className = 'item-name';
                itemName.textContent = item.name;
                itemInfo.appendChild(itemName);

                const itemDesc = document.createElement('div');
                itemDesc.style.fontSize = '10px';
                itemDesc.style.color = '#999';
                itemDesc.textContent = item.description;
                itemInfo.appendChild(itemDesc);

                // Build price section
                const priceDiv = document.createElement('div');
                priceDiv.className = 'price';
                priceDiv.textContent = String(item.price);

                // Build buy button
                const buyBtn = document.createElement('button');
                buyBtn.className = 'shop-buy-button';
                buyBtn.setAttribute('data-item-id', itemId);
                if (alreadyOwned || ship.credits < item.price) buyBtn.disabled = true;
                buyBtn.setAttribute('aria-label', alreadyOwned ? `Owned: ${item.name}` : `Buy ${item.name} for ${item.price} credits`);
                buyBtn.textContent = alreadyOwned ? 'Owned' : 'Buy';

                // Assemble shop item
                shopItem.appendChild(itemInfo);
                shopItem.appendChild(priceDiv);
                shopItem.appendChild(buyBtn);
                list.appendChild(shopItem);
            }
        }
        
        if (itemsToShow.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.padding = '20px';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#999';
            emptyMsg.textContent = 'No items available at this station';
            list.appendChild(emptyMsg);
        }
    }

    /**
     * Delegate click handling for shop buy buttons (no global functions)
     */
    attachShopDelegates() {
        const list = document.getElementById('shopList');
        if (!list || this._shopDelegatesAttached) return;
        this._shopDelegatesAttached = true;
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-buy-button');
            if (!btn || btn.disabled) return;
            const itemId = btn.getAttribute('data-item-id');
            if (!itemId) return;
            this.eventBus.emit(GameEvents.SHOP_BUY, { itemId });
        });
    }

    /**
     * Update missions panel
     */
    async updateMissionsPanel(ship) {
        if (!ship) return;

        // Import missions data and generator
        let missionsData = [];
        let MissionGenerator = null;
        try {
            const gameDataModule = await import('../data/gameData.js');
            missionsData = gameDataModule.missions || [];
            const genModule = await import('./MissionGenerator.js');
            MissionGenerator = genModule.MissionGenerator || genModule.default;
        } catch (e) {
            console.error('Failed to load missions:', e);
            return;
        }

        // Initialize mission tracking if not exists
        if (!ship.missions) {
            ship.missions = {
                active: [],
                completed: [],
                available: []
            };
        }

        // Generate procedural missions if needed (keep 5-8 available at all times)
        if (ship.missions.available.length < 5 && MissionGenerator) {
            const generator = new MissionGenerator();
            const difficultyMod = generator.calculateDifficultyMod(ship);
            const newMissions = generator.generateMissionBatch(8 - ship.missions.available.length, { difficultyMod });
            ship.missions.available.push(...newMissions);
        }

        // Combine static and procedural missions for display
        const allAvailableMissions = [
            ...missionsData.filter(m => !ship.missions.completed.find(c => c.id === m.id)),
            ...ship.missions.available
        ].slice(0, 15); // Limit display to 15 missions

        // Update counters
        const activeCount = document.getElementById('activeMissionCount');
        const completedCount = document.getElementById('completedMissionCount');
        if (activeCount) activeCount.textContent = ship.missions.active.length;
        if (completedCount) completedCount.textContent = ship.missions.completed.length;

        // Build missions list
        const list = document.getElementById('missionsList');
        if (!list) return;

        try { list.setAttribute('role', 'list'); } catch(_) {}
        list.innerHTML = '';

        // Display active missions first
        if (ship.missions.active.length > 0) {
            const activeHeader = document.createElement('div');
            activeHeader.className = 'mission-section-header';
            activeHeader.textContent = 'ACTIVE MISSIONS';
            activeHeader.style.cssText = 'padding: 10px; background: #1a1a2e; color: #4ADE80; font-weight: bold; margin-bottom: 5px;';
            list.appendChild(activeHeader);

            for (const mission of ship.missions.active) {
                const missionRow = this._createMissionRow(mission, ship, 'active');
                list.appendChild(missionRow);
            }
        }

        // Display available missions
        if (allAvailableMissions.length > 0) {
            const availableHeader = document.createElement('div');
            availableHeader.className = 'mission-section-header';
            availableHeader.textContent = 'AVAILABLE MISSIONS';
            availableHeader.style.cssText = 'padding: 10px; background: #1a1a2e; color: #94A3B8; font-weight: bold; margin: 10px 0 5px 0;';
            list.appendChild(availableHeader);

            for (const mission of allAvailableMissions) {
                const missionRow = this._createMissionRow(mission, ship, 'available');
                list.appendChild(missionRow);
            }
        }

        // Show message if no missions
        if (allAvailableMissions.length === 0 && ship.missions.active.length === 0) {
            const noMissions = document.createElement('div');
            noMissions.style.cssText = 'padding: 20px; text-align: center; color: #777;';
            noMissions.textContent = 'No missions available at this location. Check back later.';
            list.appendChild(noMissions);
        }
    }

    /**
     * Create a mission row element
     */
    _createMissionRow(mission, ship, status) {
        const row = document.createElement('div');
        row.className = 'commodity-row';
        try { row.setAttribute('role', 'listitem'); } catch(_) {}
        row.style.cssText = 'border-bottom: 1px solid #333; padding: 10px;';

        const missionInfo = document.createElement('div');
        missionInfo.className = 'commodity-info';
        missionInfo.style.flex = '1';

        const missionTitle = document.createElement('div');
        missionTitle.className = 'commodity-name';
        missionTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px;';

        // Add mission type icon
        let typeIcon = '';
        if (mission.type === 'delivery') typeIcon = '📦';
        else if (mission.type === 'bounty') typeIcon = '⚔️';
        else if (mission.type === 'escort') typeIcon = '🛡️';
        else if (mission.type === 'trade') typeIcon = '💰';

        const urgentBadge = mission.urgent ? ' [URGENT]' : '';
        missionTitle.textContent = `${typeIcon} ${mission.title}${urgentBadge}`;
        missionInfo.appendChild(missionTitle);

        const missionDesc = document.createElement('div');
        missionDesc.style.cssText = 'font-size: 0.9em; color: #94A3B8; margin-bottom: 5px;';
        missionDesc.textContent = mission.description;
        missionInfo.appendChild(missionDesc);

        const missionReward = document.createElement('div');
        missionReward.style.cssText = 'font-size: 0.85em; color: #4ADE80;';
        missionReward.textContent = `Reward: ${mission.reward} credits`;
        missionInfo.appendChild(missionReward);

        row.appendChild(missionInfo);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'buy-sell-buttons';
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';

        if (status === 'available') {
            const acceptBtn = document.createElement('button');
            acceptBtn.textContent = 'ACCEPT';
            acceptBtn.className = 'mission-accept-button';
            acceptBtn.setAttribute('data-mission-id', mission.id);
            acceptBtn.style.cssText = 'background: #4ADE80; color: #000; padding: 5px 15px; cursor: pointer;';
            buttonContainer.appendChild(acceptBtn);
        } else if (status === 'active') {
            const completeBtn = document.createElement('button');
            const isComplete = mission.isComplete ? mission.isComplete(ship, ship.missionStates?.[mission.id]) : false;
            completeBtn.textContent = isComplete ? 'COMPLETE' : 'IN PROGRESS';
            completeBtn.className = 'mission-complete-button';
            completeBtn.setAttribute('data-mission-id', mission.id);
            completeBtn.disabled = !isComplete;
            completeBtn.style.cssText = isComplete
                ? 'background: #4ADE80; color: #000; padding: 5px 15px; cursor: pointer;'
                : 'background: #555; color: #999; padding: 5px 15px; cursor: not-allowed;';
            buttonContainer.appendChild(completeBtn);

            const abandonBtn = document.createElement('button');
            abandonBtn.textContent = 'ABANDON';
            abandonBtn.className = 'mission-abandon-button';
            abandonBtn.setAttribute('data-mission-id', mission.id);
            abandonBtn.style.cssText = 'background: #E74C3C; color: #fff; padding: 5px 15px; cursor: pointer; font-size: 0.85em;';
            buttonContainer.appendChild(abandonBtn);
        }

        row.appendChild(buttonContainer);
        return row;
    }

    /**
     * Attach mission delegates for event handling
     */
    attachMissionDelegates() {
        const list = document.getElementById('missionsList');
        if (!list || this._missionDelegatesAttached) return;
        this._missionDelegatesAttached = true;

        list.addEventListener('click', (e) => {
            const acceptBtn = e.target.closest('.mission-accept-button');
            const completeBtn = e.target.closest('.mission-complete-button');
            const abandonBtn = e.target.closest('.mission-abandon-button');

            if (acceptBtn && !acceptBtn.disabled) {
                const missionId = acceptBtn.getAttribute('data-mission-id');
                if (missionId) {
                    this.eventBus.emit(GameEvents.MISSION_ACCEPT, { missionId });
                }
            } else if (completeBtn && !completeBtn.disabled) {
                const missionId = completeBtn.getAttribute('data-mission-id');
                if (missionId) {
                    this.eventBus.emit(GameEvents.MISSION_COMPLETE, { missionId });
                }
            } else if (abandonBtn && !abandonBtn.disabled) {
                const missionId = abandonBtn.getAttribute('data-mission-id');
                if (missionId) {
                    this.eventBus.emit(GameEvents.MISSION_ABANDON, { missionId });
                }
            }
        });
    }

    /**
     * Update shipyard panel
     */
    async updateShipyardPanel(ship) {
        if (!ship) return;

        // Import ship classes
        let shipClasses = {};
        try {
            const gameDataModule = await import('../data/gameData.js');
            shipClasses = gameDataModule.shipClasses || {};
        } catch (e) {
            console.error('Failed to load ship classes:', e);
            return;
        }

        // Update counters
        const creditsEl = document.getElementById('shipyardCredits');
        const currentShipEl = document.getElementById('currentShipName');
        if (creditsEl) creditsEl.textContent = ship.credits;

        const currentShipClass = shipClasses[ship.shipClass || 'shuttle'];
        if (currentShipEl && currentShipClass) {
            currentShipEl.textContent = currentShipClass.name;
        }

        // Build ships list
        const list = document.getElementById('shipsList');
        if (!list) return;

        try { list.setAttribute('role', 'list'); } catch(_) {}
        list.innerHTML = '';

        // Display all ships sorted by price
        const shipArray = Object.values(shipClasses).sort((a, b) => a.price - b.price);

        for (const shipClass of shipArray) {
            // Skip starter ship if already owned
            if (shipClass.id === 'shuttle' && (ship.shipClass !== 'shuttle')) continue;

            const shipRow = this._createShipRow(shipClass, ship);
            list.appendChild(shipRow);
        }
    }

    /**
     * Create a ship row element
     */
    _createShipRow(shipClass, ship) {
        const row = document.createElement('div');
        row.className = 'commodity-row';
        try { row.setAttribute('role', 'listitem'); } catch(_) {}
        row.style.cssText = 'border-bottom: 1px solid #333; padding: 12px;';

        // Check if this is the current ship
        const isCurrent = ship.shipClass === shipClass.id;

        // Check requirements
        const meetsKillReq = ship.kills >= shipClass.requiredKills;
        const meetsCreditsReq = ship.credits >= shipClass.requiredCredits;
        const canAfford = ship.credits >= shipClass.price;

        const shipInfo = document.createElement('div');
        shipInfo.className = 'commodity-info';
        shipInfo.style.flex = '1';

        const shipTitle = document.createElement('div');
        shipTitle.className = 'commodity-name';
        shipTitle.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: ' + shipClass.color;
        shipTitle.textContent = `${shipClass.name}${isCurrent ? ' [CURRENT]' : ''}`;
        shipInfo.appendChild(shipTitle);

        const shipDesc = document.createElement('div');
        shipDesc.style.cssText = 'font-size: 0.9em; color: #94A3B8; margin-bottom: 8px;';
        shipDesc.textContent = shipClass.description;
        shipInfo.appendChild(shipDesc);

        // Stats
        const statsDiv = document.createElement('div');
        statsDiv.style.cssText = 'font-size: 0.85em; color: #CBD5E1; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;';
        const statItems = [
            ['Speed', shipClass.maxSpeed.toFixed(1)],
            ['Cargo', shipClass.cargoCapacity],
            ['Health', shipClass.maxHealth],
            ['Shield', shipClass.maxShield],
            ['Weapons', shipClass.weaponSlots],
            ['Turn', shipClass.turnSpeed.toFixed(3)]
        ];
        for (const [label, value] of statItems) {
            const span = document.createElement('span');
            span.textContent = `${label}: ${value}`;
            statsDiv.appendChild(span);
        }
        shipInfo.appendChild(statsDiv);

        // Price & requirements
        const priceDiv = document.createElement('div');
        priceDiv.style.cssText = 'font-size: 0.85em; margin-top: 8px;';
        const priceColor = canAfford ? '#4ADE80' : '#E74C3C';
        const priceSpan = document.createElement('span');
        priceSpan.style.color = priceColor;
        priceSpan.textContent = `Price: §${shipClass.price}`;
        priceDiv.appendChild(priceSpan);

        if (shipClass.requiredKills > 0 || shipClass.requiredCredits > 0) {
            const reqColor = (meetsKillReq && meetsCreditsReq) ? '#94A3B8' : '#E74C3C';
            const reqSpan = document.createElement('span');
            reqSpan.style.color = reqColor;
            reqSpan.textContent = ` | Req: ${shipClass.requiredKills} kills, §${shipClass.requiredCredits}`;
            priceDiv.appendChild(reqSpan);
        }
        shipInfo.appendChild(priceDiv);

        row.appendChild(shipInfo);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'buy-sell-buttons';
        buttonContainer.style.cssText = 'display: flex; flex-direction: column; gap: 5px;';

        const buyBtn = document.createElement('button');
        buyBtn.textContent = isCurrent ? 'OWNED' : 'BUY';
        buyBtn.className = 'ship-buy-button';
        buyBtn.setAttribute('data-ship-id', shipClass.id);

        const canBuy = !isCurrent && canAfford && meetsKillReq && meetsCreditsReq;
        buyBtn.disabled = !canBuy;

        buyBtn.style.cssText = canBuy
            ? 'background: #4ADE80; color: #000; padding: 8px 20px; cursor: pointer; font-weight: bold;'
            : 'background: #555; color: #999; padding: 8px 20px; cursor: not-allowed;';

        buttonContainer.appendChild(buyBtn);
        row.appendChild(buttonContainer);
        return row;
    }

    /**
     * Attach shipyard delegates for event handling
     */
    attachShipyardDelegates() {
        const list = document.getElementById('shipsList');
        if (!list || this._shipyardDelegatesAttached) return;
        this._shipyardDelegatesAttached = true;

        list.addEventListener('click', (e) => {
            const buyBtn = e.target.closest('.ship-buy-button');

            if (buyBtn && !buyBtn.disabled) {
                const shipId = buyBtn.getAttribute('data-ship-id');
                if (shipId) {
                    this.eventBus.emit(GameEvents.SHIP_BUY, { shipId });
                }
            }
        });
    }

    /**
     * Generate planet-specific prompt
     */
    generatePlanetPrompt(planet) {
        let prompt = '';

        if (planet.name === "Terra Nova") {
            prompt = 'alien ocean planet landscape, floating futuristic cities anchored by quantum pylons, elevated platforms above water, chrome and glass architecture, orbital elevators on horizon, sci-fi spaceport docks over a blue ocean, archipelago of artificial islands under a starry sky, atmospheric haze and volumetric light, otherworldly clouds and nebulae in the sky';
        } else if (planet.name === "Crimson Moon") {
            prompt = 'alien volcanic planet surface, rivers of lava and molten rock, glowing refineries and mining spires, incandescent atmosphere, lava flows and ash plumes, industrial machinery silhouettes, sci-fi mining colony lights, planetary horizon with stars, dramatic cinematic lighting, otherworldly geology';
        } else if (planet.name === "Ice World") {
            prompt = 'alien frozen planet surface, crystalline ice formations and glaciers, research domes and antenna arrays embedded in snow, aurora borealis in a dark sky, starlight glittering on ice, sci-fi outpost lights, distant mountains, atmospheric perspective, serene and cold color palette';
        } else if (planet.name === "Mining Station") {
            prompt = 'asteroid mining station in orbit, articulated mechanical arms sorting rubble from ore, ring corridors lit with neon, cargo barges docking, starfield and nebulae backdrop, sci-fi industrial space facility, cinematic rim lighting, volumetric dust motes in zero-g';
        } else {
            prompt = 'alien planet landscape, extraterrestrial terrain, sci-fi colony structures, otherworldly geology, planetary horizon with stars and nebulae, cinematic composition and lighting';
        }
        // Strengthen constraints to avoid animals/humans and irrelevant content
        prompt += ', science fiction concept art, matte painting, cinematic high detail, atmospheric perspective, planetary horizon, stars visible, no humans, no people, no animals, no wildlife, no creatures, no fox, no earthly forest, alien flora only, landscape only, no text, no watermark, portrait 8:9';

        return prompt;
    }
    
    /**
     * Add film grain overlay effect
     */
    addFilmGrainOverlay(planetCanvas) {
        let grainOverlay = planetCanvas.parentElement.querySelector('.film-grain-overlay');
        if (!grainOverlay) {
            grainOverlay = document.createElement('div');
            grainOverlay.className = 'film-grain-overlay';
            planetCanvas.parentElement.appendChild(grainOverlay);
            
            grainOverlay.style.cssText = `
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                pointer-events: none;
                z-index: 10;
                opacity: 1;
                transition: opacity 1s ease-in-out;
            `;
            
            grainOverlay.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;
            grainOverlay.style.backgroundRepeat = 'repeat';
            grainOverlay.style.animation = 'filmGrain 8s steps(10) infinite';
            
            // Add CSS animation if not present
            if (!document.querySelector('#filmGrainKeyframes')) {
                const style = document.createElement('style');
                style.id = 'filmGrainKeyframes';
                style.textContent = `
                    @keyframes filmGrain {
                        0%, 100% { transform: translate(0, 0); }
                        10% { transform: translate(-2%, -5%); }
                        20% { transform: translate(-4%, 3%); }
                        30% { transform: translate(3%, -8%); }
                        40% { transform: translate(-2%, 6%); }
                        50% { transform: translate(-5%, 4%); }
                        60% { transform: translate(4%, 0%); }
                        70% { transform: translate(0%, 5%); }
                        80% { transform: translate(2%, 8%); }
                        90% { transform: translate(-3%, 3%); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
        return grainOverlay;
    }

    /**
     * Add a "signal processing" overlay (scanlines + rolling luminance bar)
     * that gives a static/decoder feel before the image fades in.
     */
    addSignalProcessingOverlay(planetCanvas) {
        const container = planetCanvas.parentElement;
        if (!container) return null;
        let overlay = container.querySelector('.signal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'signal-overlay';
            container.appendChild(overlay);
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 12;
                opacity: 1;
                mix-blend-mode: screen;
                transition: opacity 0.6s ease-in-out;
                background-image:
                    repeating-linear-gradient(180deg, rgba(255,255,255,0.055) 0 1px, rgba(0,0,0,0) 1px 3px),
                    linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.09) 45%, rgba(0,0,0,0) 60%);
                background-size: auto, 100% 30%;
                background-repeat: repeat, no-repeat;
                background-position: 0 0, 0 -30%;
                box-shadow: inset 0 0 40px rgba(0,0,0,0.6);
                filter: saturate(0.9) contrast(1.05);
                animation: signalScan 2.2s linear infinite;
            `;
            // Inject keyframes once
            if (!document.querySelector('#signalOverlayKeyframes')) {
                const style = document.createElement('style');
                style.id = 'signalOverlayKeyframes';
                style.textContent = `
                    @keyframes signalScan {
                        0% { transform: translateY(-6%); }
                        50% { transform: translateY(6%); }
                        100% { transform: translateY(-6%); }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            // Reset visibility if it existed from a previous landing
            overlay.style.opacity = '1';
            overlay.style.display = 'block';
        }
        return overlay;
    }
    
    /**
     * Fade in planet image
     */
    fadeInPlanetImage(img, planetCanvas, planetName) {
        const ctx = planetCanvas.getContext('2d');
        const width = planetCanvas.width;
        const height = planetCanvas.height;
        
        const grainOverlay = planetCanvas.parentElement.querySelector('.film-grain-overlay');
        const signalOverlay = planetCanvas.parentElement.querySelector('.signal-overlay');

        // Offscreen canvas for pixelation band (reused each frame)
        const pixelCanvas = document.createElement('canvas');
        const pixelCtx = pixelCanvas.getContext('2d');
        
        let fadeProgress = 0;
        const fadeDuration = 60;
        
        const fadeTransition = () => {
            fadeProgress++;
            const fadeRatio = Math.min(fadeProgress / fadeDuration, 1);
            
            // Ease-in-out curve
            const eased = fadeRatio < 0.5 
                ? 2 * fadeRatio * fadeRatio 
                : 1 - Math.pow(-2 * fadeRatio + 2, 2) / 2;
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            
            // Subtle chromatic aberration pass (fades out as image resolves)
            const dprLocal = Math.min(window.devicePixelRatio || 1, 2);
            const dx = Math.max(1, Math.ceil(2 * dprLocal * (1 - eased)));
            const chromaAlpha = 0.4 * (1 - eased);
            if (chromaAlpha > 0.01) {
                ctx.save();
                ctx.globalAlpha = chromaAlpha;
                ctx.filter = `drop-shadow(${dx}px 0 0 rgba(255,0,0,0.8)) drop-shadow(${-dx}px 0 0 rgba(0,255,255,0.8))`;
                ctx.drawImage(img, 0, 0, width, height);
                ctx.restore();
            }

            // Draw main image with increasing opacity, no filter
            ctx.save();
            ctx.filter = 'none';
            ctx.globalAlpha = eased;
            ctx.drawImage(img, 0, 0, width, height);
            ctx.restore();

            // Central pixelated processing line (visible early, fades out)
            const bandStrength = 1 - eased;
            if (bandStrength > 0.03) {
                const bandHeight = Math.max(18, Math.floor(height * 0.16));
                const bandY = Math.floor(height * 0.5 - bandHeight * 0.5);
                // Low-res sample size for pixel look
                const sampleW = 96; // horizontal resolution of pixelation
                const sampleH = Math.max(16, Math.floor(bandHeight * 0.25));
                if (pixelCanvas.width !== sampleW || pixelCanvas.height !== sampleH) {
                    pixelCanvas.width = sampleW;
                    pixelCanvas.height = sampleH;
                }
                pixelCtx.imageSmoothingEnabled = false;
                // Animate slight vertical drift to simulate processing sweep
                const drift = Math.sin(fadeProgress * 0.2) * (height * 0.02);
                // Draw the full image squeezed into the tiny pixel canvas
                pixelCtx.clearRect(0, 0, sampleW, sampleH);
                pixelCtx.drawImage(img, 0, (height * 0.5 - sampleH * 0.5) + drift, width, sampleH, 0, 0, sampleW, sampleH);
                // Composite to main at band area with nearest-neighbor scaling
                ctx.save();
                ctx.imageSmoothingEnabled = false;
                ctx.globalAlpha = Math.min(0.85, 0.25 + bandStrength * 0.7);
                // Slight horizontal jitter
                const jitter = Math.floor(Math.sin(fadeProgress * 0.6) * 3);
                ctx.drawImage(pixelCanvas, 0, bandY + jitter, width, bandHeight);
                // Add a bright scanning core line
                const midY = bandY + Math.floor(bandHeight / 2);
                const glowAlpha = 0.12 + bandStrength * 0.2;
                const grad = ctx.createLinearGradient(0, midY - 1, 0, midY + 1);
                grad.addColorStop(0, `rgba(255,255,255,0)`);
                grad.addColorStop(0.5, `rgba(255,255,255,${glowAlpha.toFixed(3)})`);
                grad.addColorStop(1, `rgba(255,255,255,0)`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, midY - 2, width, 4);
                ctx.restore();
            }
            
            // Fade overlays (grain + signal)
            if (grainOverlay) {
                grainOverlay.style.opacity = (1 - eased * 0.85).toString();
            }
            if (signalOverlay) {
                signalOverlay.style.opacity = (1 - eased).toString();
                if (fadeProgress >= fadeDuration) {
                    // After fade completes, hide to save cycles
                    setTimeout(() => { signalOverlay.style.display = 'none'; }, 250);
                }
            }
            
            if (fadeProgress < fadeDuration) {
                this._fadeRAF = requestAnimationFrame(fadeTransition);
            } else {
                this._fadeRAF = null;
            }
        };

        // Cancel any existing fade loop before starting a new one (C4)
        if (this._fadeRAF) {
            cancelAnimationFrame(this._fadeRAF);
            this._fadeRAF = null;
        }
        fadeTransition();
        console.log('[UISystem] AI landscape loaded successfully for', planetName);
    }
    
    /**
     * Draw canvas fallback for planet visual
     */
    drawCanvasFallback(planet, planetCanvas) {
        // This is a simplified version - the full implementation is in allSystems.js
        const ctx = planetCanvas.getContext('2d');
        const width = planetCanvas.width;
        const height = planetCanvas.height;
        
        // Clear with black
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Add some basic visual based on planet type
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        
        if (planet.name === "Terra Nova") {
            gradient.addColorStop(0, '#001133');
            gradient.addColorStop(0.5, '#003366');
            gradient.addColorStop(1, '#4A90E2');
        } else if (planet.name === "Crimson Moon") {
            gradient.addColorStop(0, '#1A0000');
            gradient.addColorStop(0.5, '#3A0F0A');
            gradient.addColorStop(1, '#7B241C');
        } else if (planet.name === "Ice World") {
            gradient.addColorStop(0, '#000033');
            gradient.addColorStop(0.5, '#003366');
            gradient.addColorStop(1, '#154360');
        } else {
            gradient.addColorStop(0, '#000011');
            gradient.addColorStop(1, '#1A1A1A');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Fade grain overlay
        const grainOverlay = planetCanvas.parentElement.querySelector('.film-grain-overlay');
        if (grainOverlay) {
            grainOverlay.style.opacity = '0.15';
        }
        const signalOverlay = planetCanvas.parentElement.querySelector('.signal-overlay');
        if (signalOverlay) {
            signalOverlay.style.display = 'block';
            signalOverlay.style.opacity = '0.35';
        }
    }
    
    /**
     * Show notification message
     */
    showNotification(message, type = 'info', duration = 2000) {
        // If toasts are disabled, use console-only readout
        if (!this._toastsEnabled) { this._setConsoleReadout(message, duration); return; }
        const msg = document.createElement('div');
        msg.className = `game-notification ${type}`;
        msg.textContent = message;
        document.body.appendChild(msg);
        setTimeout(() => {
            try {
                msg.classList.add('fade-out');
                msg.addEventListener('transitionend', () => msg.remove(), { once: true });
            } catch(_) { msg.remove(); }
        }, duration);
    }

    enqueueNotification(message, type = 'info', duration = 2000) {
        // Always mirror into tiny console readout
        this._setConsoleReadout(message, duration);
        if (!this._toastsEnabled) return;
        this._notifQueue.push({ message, type, duration });
        if (!this._notifActive) this._drainNotifications();
    }

    _drainNotifications() {
        if (this._notifActive) return;
        const next = this._notifQueue.shift();
        if (!next) return;
        this._notifActive = true;
        const el = document.createElement('div');
        el.className = `game-notification ${next.type}`;
        el.textContent = next.message;
        document.body.appendChild(el);
        // schedule fade-out then play next
        const totalMs = Math.max(800, Number(next.duration) || 2000);
        this._drainTimerId = setTimeout(() => {
            try {
                el.classList.add('fade-out');
                el.addEventListener('transitionend', () => {
                    el.remove();
                    this._notifActive = false;
                    // slight gap to mimic "rolodex" paging
                    setTimeout(() => this._drainNotifications(), 120);
                }, { once: true });
            } catch (_) {
                el.remove();
                this._notifActive = false;
                setTimeout(() => this._drainNotifications(), 120);
            }
        }, totalMs);
    }

    _setConsoleReadout(message, duration = 2000) {
        try {
            const el = this._consoleEl || document.getElementById('tutorialHint');
            if (!el) return;
            // Mark as console-driven so tutorial hint logic won’t override
            el.dataset.console = '1';
            el.textContent = String(message || '').toUpperCase();
            el.classList.add('visible');
            // Reset timer
            if (this._consoleTimer) clearTimeout(this._consoleTimer);
            const ms = Math.max(800, Number(duration) || 2000);
            this._consoleTimer = setTimeout(() => {
                try {
                    el.classList.remove('visible');
                    delete el.dataset.console;
                } catch(_) {}
            }, ms);
        } catch(_) {}
    }
    
    /**
     * Update UI (called each frame)
     * Avoid per-frame DOM churn; HUD updates are driven by throttled UI_UPDATE events.
     */
    update(state, deltaTime) {
        // Only react to tutorial stage drift here (rare), HUD uses UI_UPDATE
        if (state && state.ship && state.ship.tutorialStage !== this.tutorialStage) {
            this.tutorialStage = state.ship.tutorialStage;
            this.updateTutorialHint(state.ship);
        }
    }
    
    /**
     * Clean up UI system
     */
    destroy() {
        // Unsubscribe from events
        this.eventBus.off(GameEvents.UI_UPDATE, this.handleStateChange);
        this.eventBus.off(GameEvents.SHIP_LANDED, this.handleShipLanded);
        this.eventBus.off(GameEvents.MENU_OPEN, this.handleShowPanel);
        this.eventBus.off(GameEvents.MENU_CLOSE, this.handleCloseOverlay);
        this.eventBus.off(GameEvents.SHIP_UPGRADE, this.handlePurchase);
        this.eventBus.off(GameEvents.UI_MESSAGE, this.handleUIMessage);
        this.eventBus.off(GameEvents.TUTORIAL_UPDATE, this.handleTutorialUpdate);
        this.eventBus.off(GameEvents.PHYSICS_THRUST_CHANGED, this._handleThrustChanged);
        this.eventBus.off(GameEvents.PHYSICS_BRAKE_CHANGED, this._handleBrakeChanged);
        this.eventBus.off(GameEvents.AUDIO_STATE_CHANGED, this.handleAudioStateChanged);
        this.eventBus.off(GameEvents.AUDIO_MUSIC_STATE, this.handleMusicState);
        this.eventBus.off(GameEvents.SHIP_DEATH, this.handleShipDestroyed);
        this.eventBus.off(GameEvents.SHIP_RESPAWN, this.handleShipRespawn);

        // Clear all timers to prevent memory leaks
        if (this._radioStaticTimer) {
            clearInterval(this._radioStaticTimer);
            this._radioStaticTimer = null;
        }
        if (this.radioScanInterval) {
            clearInterval(this.radioScanInterval);
            this.radioScanInterval = null;
        }
        if (this.radioScanTimeout) {
            clearTimeout(this.radioScanTimeout);
            this.radioScanTimeout = null;
        }
        if (this._consoleTimer) {
            clearTimeout(this._consoleTimer);
            this._consoleTimer = null;
        }

        // Disconnect ResizeObserver
        if (this._radioResizeObs) {
            this._radioResizeObs.disconnect();
            this._radioResizeObs = null;
        }

        // Clean up overlay key handler (C3)
        if (this._overlayKeyHandler) {
            document.removeEventListener('keydown', this._overlayKeyHandler);
            this._overlayKeyHandler = null;
        }

        // Cancel planet fade animation (C4)
        if (this._fadeRAF) {
            cancelAnimationFrame(this._fadeRAF);
            this._fadeRAF = null;
        }

        // Clean up notification drain timer (H15)
        if (this._drainTimerId) {
            clearTimeout(this._drainTimerId);
            this._drainTimerId = null;
        }
        this._notifActive = false;

        // Clean up mute key handler (H16)
        if (this._muteKeyHandler) {
            const muteKey = document.getElementById('muteKey');
            if (muteKey) muteKey.removeEventListener('click', this._muteKeyHandler);
            this._muteKeyHandler = null;
        }

        // Clear any active notifications
        const notifications = document.querySelectorAll('.game-notification');
        notifications.forEach(n => n.remove());

        console.log('[UISystem] Destroyed');
    }
}

export default UISystem;
