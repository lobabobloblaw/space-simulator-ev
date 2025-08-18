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
        
        console.log('[UISystem] Created');
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
        
        // Tutorial
        this.eventBus.on(GameEvents.TUTORIAL_UPDATE, this.handleTutorialUpdate);
    }
    
    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Make sure HUD elements exist
        const hudElements = [
            'health', 'shield', 'fuel', 'speed', 
            'cargo', 'location', 'credits', 'weapon', 'kills'
        ];
        
        for (let id of hudElements) {
            if (!document.getElementById(id)) {
                console.warn(`[UISystem] HUD element '${id}' not found`);
            }
        }
    }
    
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
        updateElement('shield', ship.shield > 0 ? Math.round(ship.shield) : 'None');
        updateElement('fuel', Math.round(ship.fuel) + '%');
        updateElement('speed', (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1));
        
        const cargoUsed = ship.cargo ? ship.cargo.reduce((sum, item) => sum + item.quantity, 0) : 0;
        updateElement('cargo', cargoUsed + '/' + (ship.cargoCapacity || 10));
        updateElement('location', ship.isLanded && ship.landedPlanet ? ship.landedPlanet.name : 'SPACE');
        updateElement('credits', ship.credits || 0);
        updateElement('weapon', ship.weapons && ship.weapons.length > 0 ? 
            ship.weapons[ship.currentWeapon].type.toUpperCase() : 'NONE');
        updateElement('kills', ship.kills || 0);
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
                    message = "WARNING: UNARMED // LOCATE PLANET AND TRADE FOR WEAPONS";
                } else {
                    this.tutorialStage = 'armed';
                }
                break;
                
            case 'armed':
                message = "WEAPONS ONLINE // F: FIRE / Q: SWITCH / ENGAGE HOSTILES";
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
        if (descElement) descElement.textContent = planet.description;
        
        // Draw planet visual
        if (this.planetCanvas) {
            this.drawPlanetVisual(planet, this.planetCanvas, true);
        }
        
        // Show landing info panel by default
        this.showPanel('landing', ship);
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
            }
        } else if (panel === 'shop') {
            if (shopPanel) {
                shopPanel.style.display = 'flex';
                if (ship && shopInventory) {
                    this.updateShopPanel(ship, shopInventory);
                }
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
        
        const cargoUsed = ship.cargo ? ship.cargo.reduce((sum, item) => sum + item.quantity, 0) : 0;
        if (cargoElement) cargoElement.textContent = `${cargoUsed}/${ship.cargoCapacity}`;
        
        // Calculate total cargo value
        let totalValue = 0;
        if (ship.cargo) {
            for (let item of ship.cargo) {
                totalValue += item.quantity * ship.currentPlanet.commodityPrices[item.type];
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
                    <button onclick="window.gameInstance.sellAllCargo()">Sell All</button>
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
                        <button onclick="window.gameInstance.buyCommodity('${key}', ${price})">Buy</button>
                        <button onclick="window.gameInstance.sellCommodity('${key}', ${price})" ${ownedQty === 0 ? 'disabled' : ''}>Sell</button>
                    </div>
                `;
                list.appendChild(row);
            }
        }
    }
    
    /**
     * Update shop panel
     */
    updateShopPanel(ship, shopInventory) {
        if (!ship || !ship.currentPlanet) return;
        
        // Update credits display
        const creditsElement = document.getElementById('shopCredits');
        if (creditsElement) creditsElement.textContent = ship.credits;
        
        // Build shop list
        const list = document.getElementById('shopList');
        if (!list) return;
        
        list.innerHTML = '';
        
        // Only show items available at this planet
        const availableItems = ship.currentPlanet.shopItems || [];
        
        if (shopInventory) {
            for (let itemId of availableItems) {
                const item = shopInventory[itemId];
                if (!item) continue;
                
                // Check if already purchased (for certain upgrades)
                let alreadyOwned = false;
                if (item.type === 'shield' && ship.maxShield >= item.value) {
                    alreadyOwned = true;
                } else if (item.type === 'engine' && ship.engineLevel >= item.value) {
                    alreadyOwned = true;
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
                            onclick="window.gameInstance.buyUpgrade('${itemId}')" 
                            ${alreadyOwned || ship.credits < item.price ? 'disabled' : ''}>
                        ${alreadyOwned ? 'Owned' : 'Buy'}
                    </button>
                `;
                list.appendChild(shopItem);
            }
        }
        
        if (availableItems.length === 0) {
            list.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No items available at this station</div>';
        }
    }
    
    /**
     * Draw planet visual
     */
    drawPlanetVisual(planet, planetCanvas, forceReload = false) {
        if (!planet || !planetCanvas) return;
        
        // Check if we've already loaded this planet's image
        if (!forceReload && planetCanvas.dataset.planetLoaded === planet.name) {
            return; // Already loaded, don't reload
        }
        
        const ctx = planetCanvas.getContext('2d');
        const width = planetCanvas.width;
        const height = planetCanvas.height;
        
        // Clear canvas with loading message
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        
        // Mark as loading this planet
        planetCanvas.dataset.planetLoaded = planet.name;
        
        // Try to load AI-generated landscape
        this.loadPlanetLandscape(planet, planetCanvas);
    }
    
    /**
     * Load AI-generated planet landscape
     */
    loadPlanetLandscape(planet, planetCanvas) {
        console.log('[UISystem] Starting AI landscape generation for', planet.name);
        
        // Add film grain overlay if needed
        this.addFilmGrainOverlay(planetCanvas);
        
        // Show loading message
        const ctx = planetCanvas.getContext('2d');
        const width = planetCanvas.width;
        const height = planetCanvas.height;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SCANNING SURFACE...', width / 2, height / 2);
        
        // Generate prompt based on planet
        let prompt = this.generatePlanetPrompt(planet);
        
        // Create image element
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Encode prompt for URL
        const encodedPrompt = encodeURIComponent(prompt);
        const randomSeed = Math.floor(Math.random() * 1000000);
        
        // Pollinations.ai URL
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=420&height=472&nologo=true&seed=${randomSeed}`;
        console.log('[UISystem] Loading AI image from:', imageUrl);
        img.src = imageUrl;
        
        // Handle successful load
        img.onload = () => {
            this.fadeInPlanetImage(img, planetCanvas, planet.name);
        };
        
        // Handle error - draw fallback
        img.onerror = () => {
            console.log('[UISystem] Failed to load AI landscape, using procedural fallback');
            this.drawCanvasFallback(planet, planetCanvas);
        };
    }
    
    /**
     * Generate planet-specific prompt
     */
    generatePlanetPrompt(planet) {
        let prompt = '';
        
        if (planet.name === "Terra Nova") {
            prompt = 'oceanic planet landscape, floating futuristic cities on ocean, elevated platforms above water, sci-fi ocean colony, blue ocean with white architecture, quantum bridges connecting floating structures, advanced technology floating cities, chrome and glass buildings rising from sea, orbital market platforms, ocean world civilization, archipelago of artificial islands, spaceport on water, 75% ocean coverage with floating metropolis';
        } else if (planet.name === "Crimson Moon") {
            prompt = 'volcanic planet surface, rivers of lava, molten rock, volcanic eruption, red hot magma, volcanic landscape, industrial mining equipment on lava planet, glowing red atmosphere, lava flows, pyroclastic clouds';
        } else if (planet.name === "Ice World") {
            prompt = 'frozen planet surface, ice crystals, snow covered landscape, arctic tundra, frozen wasteland, ice caves, research domes in snow, aurora in sky, frozen alien world, glaciers, ice formations';
        } else if (planet.name === "Mining Station") {
            prompt = 'asteroid mining operation, space mining equipment, industrial machinery in space, metal structures, ore extractors, space station mining facility, starfield background, mining robots, conveyor belts';
        } else {
            prompt = 'alien planet surface, extraterrestrial landscape, sci-fi planet environment, otherworldly terrain, alien colony structures, futuristic buildings';
        }
        
        prompt += ', digital art, concept art, matte painting, scenic view, landscape only, no text at all, no words anywhere, no writing, no letters, no typography, no labels, no signatures, no watermarks, textless image, wordless artwork, visual only, 8:9 aspect ratio, portrait orientation';
        
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
     * Fade in planet image
     */
    fadeInPlanetImage(img, planetCanvas, planetName) {
        const ctx = planetCanvas.getContext('2d');
        const width = planetCanvas.width;
        const height = planetCanvas.height;
        
        const grainOverlay = planetCanvas.parentElement.querySelector('.film-grain-overlay');
        
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
            
            // Draw image with increasing opacity
            ctx.globalAlpha = eased;
            ctx.drawImage(img, 0, 0, width, height);
            ctx.globalAlpha = 1;
            
            // Fade grain overlay
            if (grainOverlay) {
                grainOverlay.style.opacity = (1 - eased * 0.85).toString();
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
