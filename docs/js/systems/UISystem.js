import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

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
        
        // Bind event handlers
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleShipLanded = this.handleShipLanded.bind(this);
        this.handleShowPanel = this.handleShowPanel.bind(this);
        this.handleCloseOverlay = this.handleCloseOverlay.bind(this);
        this.handleTrade = this.handleTrade.bind(this);
        this.handlePurchase = this.handlePurchase.bind(this);
        this.handleUIMessage = this.handleUIMessage.bind(this);
        this.handleTutorialUpdate = this.handleTutorialUpdate.bind(this);
        this.handleAudioStateChanged = this.handleAudioStateChanged.bind(this);
        // Bind music state handler to keep "this" context when called via EventBus
        this.handleMusicState = this.handleMusicState.bind(this);
        
        console.log('[UISystem] Created');

        // Image provider preference for planet landscapes
        // Options: 'lexica' (search existing high-res), 'pollinations' (generate), 'auto' (try lexica then pollinations)
        this.landscapeImageProvider = 'auto';
        // If true, when using Pollinations, prefer a single HQ attempt and wait longer
        this.pollinationsHQOnly = false;
        // Max wait per attempt (ms)
        this.pollinationsTimeoutMs = 12000;
        // Control whether Pollinations enhances prompts (can drift undesirably)
        this.usePollinationsEnhance = false;
        // Show provider/resolution debug overlay (off by default)
        this.showProviderInfo = false;

        // Radio scanning animation timers
        this.radioScanInterval = null;
        this.radioScanTimeout = null;
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
        
        // Subscribe to UI events
        this.subscribeToEvents();
        
        // Initialize UI elements
        this.initializeUI();
        
        // Wire mute toggle click if present
        const muteKey = document.getElementById('muteKey');
        if (muteKey) {
            muteKey.style.cursor = 'pointer';
            muteKey.title = 'Toggle sound (M)';
            muteKey.addEventListener('click', () => {
                this.eventBus.emit(GameEvents.AUDIO_TOGGLE);
            });
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
        
        // Landing/overlay events
        this.eventBus.on(GameEvents.SHIP_LANDED, this.handleShipLanded);
        this.eventBus.on(GameEvents.MENU_OPEN, this.handleShowPanel);
        this.eventBus.on(GameEvents.MENU_CLOSE, this.handleCloseOverlay);
        
        // Trading events
        this.eventBus.on(GameEvents.TRADE_COMPLETE, this.handleTrade);
        this.eventBus.on(GameEvents.SHIP_UPGRADE, this.handlePurchase);
        
        // UI messages
        this.eventBus.on(GameEvents.UI_MESSAGE, this.handleUIMessage);
        // Audio state
        this.eventBus.on(GameEvents.AUDIO_STATE_CHANGED, this.handleAudioStateChanged);
        this.eventBus.on(GameEvents.AUDIO_MUSIC_STATE, this.handleMusicState);
        
        // Ship lifecycle
        this.eventBus.on(GameEvents.SHIP_DEATH, () => this.handleShipDestroyed());
        this.eventBus.on(GameEvents.SHIP_RESPAWN, () => this.handleShipRespawn());
        
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
     * Handle trade event
     */
    handleTrade(data) {
        if (this.currentPanel === 'trading' && data.ship) {
            this.updateTradingPanel(data.ship, data.commodities);
        }
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
        
        this.showNotification(data.message, data.type || 'info', data.duration || 2000);
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
        if (!(prev && play && next && title)) return;
        const startScan = (lockAfterMs = 1200) => {
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
            this.radioScanInterval = setInterval(roll, 140);
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
        prev.onclick = () => { startScan(1000); this.eventBus.emit(GameEvents.AUDIO_MUSIC_PREV); };
        next.onclick = () => { startScan(1000); this.eventBus.emit(GameEvents.AUDIO_MUSIC_NEXT); };
        title.textContent = 'SCANNING… 118.7 MHz CH-12';
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
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        
        updateElement('health', Math.max(0, Math.round(ship.health)) + '%');
        updateElement('shield', ship.shield > 0 ? Math.round(ship.shield) : 'EQUIP');
        updateElement('fuel', Math.round(ship.fuel) + '%');
        updateElement('speed', (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1));
        
        const cargoUsed = Array.isArray(ship.cargo)
            ? ship.cargo.reduce((sum, item) => sum + (item?.quantity ?? 1), 0)
            : 0;
        updateElement('cargo', cargoUsed + '/' + (ship.cargoCapacity || 10));
        updateElement('location', ship.isLanded && ship.landedPlanet ? ship.landedPlanet.name : 'SPACE');
        updateElement('credits', ship.credits || 0);
        updateElement('weapon', ship.weapons && ship.weapons.length > 0 ? 
            ship.weapons[ship.currentWeapon].type.toUpperCase() : 'UNARMED');
        // Kills and target readouts removed from HUD by design
    }
    
    /**
     * Update tutorial hint
     */
    updateTutorialHint(ship) {
        const hintElement = document.getElementById('tutorialHint');
        if (!hintElement) return;
        
        let message = null;
        
        switch(this.tutorialStage) {
            case 'start':
                if (!ship.weapons || ship.weapons.length === 0) {
                    message = "WEAPONS OFFLINE";
                } else {
                    this.tutorialStage = 'armed';
                }
                break;
                
            case 'armed':
                message = "WEAPONS ONLINE";
                setTimeout(() => {
                    this.tutorialStage = 'combat';
                    this.updateTutorialHint(ship);
                }, 5000);
                break;
                
            case 'combat':
                // No message during combat
                break;
                
            case 'complete':
                message = "TARGET ELIMINATED // CONTINUE TRADING FOR UPGRADES";
                setTimeout(() => {
                    this.tutorialStage = 'done';
                    this.updateTutorialHint(ship);
                }, 5000);
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
            this.drawPlanetVisual(planet, this.planetCanvas, true);
        }
        
        // Show landing info panel by default
        this.showPanel('landing', ship);
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

            const buyList = bestBuys.map(x => {
                const c = commodities[x.key];
                return `${c?.icon || ''} ${c?.name || x.key} — §${x.price}`;
            }).join(' • ');
            const sellList = bestSells.map(x => {
                const c = commodities[x.key];
                return `${c?.icon || ''} ${c?.name || x.key} — §${x.price} (base §${x.base})`;
            }).join('<br>');

            // Outfitter list
            const items = (planet.shopItems || []).map(id => shopInventory[id]).filter(Boolean);
            const itemList = items.slice(0,3).map(i => `${i.name} — §${i.price}`).join(' • ');

            details.innerHTML = `
                <div style="margin-top: 8px;">
                    <div style="color:#888; text-transform:uppercase; letter-spacing:1px; font-size:10px; margin-bottom:4px;">Market Highlights</div>
                    <div style="display:flex; gap:12px;">
                        <div style="flex:1"><span style="color:#aaa; font-size:10px;">Best Buys:</span> <span>${buyList || '—'}</span></div>
                        <div style="flex:1"><span style="color:#aaa; font-size:10px;">Best Sells:</span> <span>${sellList || '—'}</span></div>
                    </div>
                </div>
                <div style="margin-top: 12px;">
                    <div style="color:#888; text-transform:uppercase; letter-spacing:1px; font-size:10px; margin-bottom:4px;">Outfitter Inventory</div>
                    <div style="font-size:12px; line-height:1.4;">${itemList || 'Standard services only'}</div>
                </div>
            `;
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
     * Fetch a high-res image URL from Lexica search by prompt.
     * Chooses the first image meeting minWidth, otherwise best available.
     */
    async fetchLexicaImageUrl(prompt, minWidth = 800) {
        const q = encodeURIComponent(prompt);
        const endpoint = `https://lexica.art/api/v1/search?q=${q}`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3500);
        try {
            const res = await fetch(endpoint, { signal: ctrl.signal });
            clearTimeout(t);
            if (!res.ok) throw new Error(`Lexica HTTP ${res.status}`);
            const data = await res.json();
            const imgs = Array.isArray(data.images) ? data.images : [];
            if (imgs.length === 0) return null;
            // Prefer portrait-ish or square images with width >= minWidth
            const candidates = imgs
                .map(i => ({
                    url: i.src || i.srcSmall,
                    w: i.width || 0,
                    h: i.height || 0,
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
        const landingInfo = document.getElementById('landingInfo');
        
        // Hide all panels first
        if (tradingPanel) tradingPanel.style.display = 'none';
        if (shopPanel) shopPanel.style.display = 'none';
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
                if (ship && commodities) {
                    this.updateTradingPanel(ship, commodities);
                }
                // Ensure delegated trading handlers are attached once
                this.attachTradingDelegates();
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
        }
    }
    
    /**
     * Update trading panel
     */
    updateTradingPanel(ship, commodities) {
        if (!ship || !ship.currentPlanet) return;
        
        // Update status
        const creditsElement = document.getElementById('tradeCredits');
        const cargoElement = document.getElementById('tradeCargo');
        
        if (creditsElement) creditsElement.textContent = ship.credits;
        
        const cargoUsed = Array.isArray(ship.cargo)
            ? ship.cargo.reduce((sum, item) => sum + (item?.quantity ?? 1), 0)
            : 0;
        if (cargoElement) cargoElement.textContent = `${cargoUsed}/${ship.cargoCapacity}`;
        
        // Calculate total cargo value
        let totalValue = 0;
        if (Array.isArray(ship.cargo)) {
            for (let item of ship.cargo) {
                const qty = (item?.quantity ?? 1);
                const price = ship.currentPlanet?.commodityPrices?.[item?.type];
                if (Number.isFinite(price)) {
                    totalValue += qty * price;
                }
            }
        }
        
        // Build commodity list
        const list = document.getElementById('commodityList');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Add sell all button if carrying cargo
        if (cargoUsed > 0) {
            const sellAllRow = document.createElement('div');
            sellAllRow.className = 'commodity-row';
            sellAllRow.style.borderBottom = '2px solid #333';
            sellAllRow.innerHTML = `
                <div class="commodity-info">
                    <div class="commodity-name">💰 Sell All Cargo</div>
                    <div>Total value: ${totalValue}</div>
                </div>
                <div class="buy-sell-buttons">
                    <button class="trade-btn" data-action="sellAll">Sell All</button>
                </div>
            `;
            list.appendChild(sellAllRow);
        }
        
        // Add commodity rows
        if (commodities) {
            for (let key in commodities) {
                const commodity = commodities[key];
                const price = ship.currentPlanet.commodityPrices[key];
                const basePrice = commodity.basePrice;
                const owned = ship.cargo ? ship.cargo.find(c => c.type === key) : null;
                const ownedQty = owned ? owned.quantity : 0;
                
                // Show price indicator
                let priceIndicator = '';
                if (price < basePrice * 0.7) {
                    priceIndicator = ' 📉'; // Good buy price
                } else if (price > basePrice * 1.3) {
                    priceIndicator = ' 📈'; // Good sell price
                }
                
                const row = document.createElement('div');
                row.className = 'commodity-row';
                row.innerHTML = `
                    <div class="commodity-info">
                        <div class="commodity-name">${commodity.icon} ${commodity.name}</div>
                        <div>Owned: ${ownedQty}</div>
                    </div>
                    <div class="price">${price}${priceIndicator}</div>
                    <div class="buy-sell-buttons">
                        <button class="trade-btn" data-action="buy" data-type="${key}" data-price="${price}">Buy</button>
                        <button class="trade-btn" data-action="sell" data-type="${key}" ${ownedQty === 0 ? 'disabled' : ''}>Sell</button>
                    </div>
                `;
                list.appendChild(row);
            }
        }
    }

    /**
     * Delegate trading actions to EventBus (no globals)
     */
    attachTradingDelegates() {
        const list = document.getElementById('commodityList');
        if (!list || this._tradeDelegatesAttached) return;
        this._tradeDelegatesAttached = true;
        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.trade-btn');
            if (!btn || btn.disabled) return;
            const action = btn.getAttribute('data-action');
            if (!action) return;
            if (action === 'buy') {
                const type = btn.getAttribute('data-type');
                const price = Number(btn.getAttribute('data-price'));
                this.eventBus.emit(GameEvents.TRADE_BUY, { type, price });
            } else if (action === 'sell') {
                const type = btn.getAttribute('data-type');
                this.eventBus.emit(GameEvents.TRADE_SELL, { type });
            } else if (action === 'sellAll') {
                this.eventBus.emit(GameEvents.TRADE_SELL_ALL, {});
            }
        });
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
                shopItem.innerHTML = `
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div style="font-size: 10px; color: #999;">${item.description}</div>
                    </div>
                    <div class="price">${item.price}</div>
                    <button class="shop-buy-button" 
                            data-item-id="${itemId}" 
                            ${alreadyOwned || ship.credits < item.price ? 'disabled' : ''}>
                        ${alreadyOwned ? 'Owned' : 'Buy'}
                    </button>
                `;
                list.appendChild(shopItem);
            }
        }
        
        if (itemsToShow.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items available at this station</div>';
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
        
        function fadeTransition() {
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
                requestAnimationFrame(fadeTransition);
            }
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
        const msg = document.createElement('div');
        msg.className = `game-notification ${type}`;
        msg.textContent = message;
        document.body.appendChild(msg);
        
        setTimeout(() => {
            msg.remove();
        }, duration);
    }
    
    /**
     * Update UI (called each frame)
     */
    update(state, deltaTime) {
        // Update HUD if ship state changed
        if (state && state.ship) {
            this.updateHUD(state.ship);
        }
        
        // Update tutorial if needed
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
        this.eventBus.off(GameEvents.TRADE_COMPLETE, this.handleTrade);
        this.eventBus.off(GameEvents.SHIP_UPGRADE, this.handlePurchase);
        this.eventBus.off(GameEvents.UI_MESSAGE, this.handleUIMessage);
        this.eventBus.off(GameEvents.TUTORIAL_UPDATE, this.handleTutorialUpdate);
        
        // Clear any active notifications
        const notifications = document.querySelectorAll('.game-notification');
        notifications.forEach(n => n.remove());
        
        console.log('[UISystem] Destroyed');
    }
}

export default UISystem;
