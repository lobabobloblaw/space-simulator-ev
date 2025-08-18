/**
 * Trading System - Handles commodity trading between planets
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { commodities } from '../data/gameData.js';

export default class TradingSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.tradingPanel = document.getElementById('tradingPanel');
        this.commodityList = document.getElementById('commodityList');
    }

    async init() {
        // Listen for trading events
        this.eventBus.on(GameEvents.MENU_OPEN, (data) => {
            if (data.panel === 'trading') {
                this.showTradingPanel();
            }
        });

        this.eventBus.on(GameEvents.SHIP_LANDED, () => {
            this.updateTradingUI();
        });

        // Initialize cargo if not already done
        const state = this.stateManager.state;
        if (!state.ship.cargo) {
            state.ship.cargo = [];
        }

        console.log('TradingSystem initialized');
    }

    showTradingPanel() {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        if (!planet || !planet.commodityPrices) return;

        // Hide other panels
        document.getElementById('landingInfo').style.display = 'none';
        document.getElementById('shopPanel').style.display = 'none';
        
        // Show trading panel
        this.tradingPanel.style.display = 'block';
        
        this.updateTradingUI();
    }

    updateTradingUI() {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        if (!planet || !planet.commodityPrices) return;

        // Update credits and cargo display
        document.getElementById('tradeCredits').textContent = state.ship.credits;
        document.getElementById('tradeCargo').textContent = 
            `${state.ship.cargo.length}/${state.ship.cargoCapacity}`;

        // Build commodity list
        let html = '<div class="commodity-header">COMMODITIES MARKET</div>';
        
        // Show items in cargo (sell section)
        if (state.ship.cargo.length > 0) {
            html += '<div class="commodity-section">YOUR CARGO</div>';
            
            // Group cargo by type
            const cargoGroups = {};
            state.ship.cargo.forEach(item => {
                if (!cargoGroups[item.type]) {
                    cargoGroups[item.type] = [];
                }
                cargoGroups[item.type].push(item);
            });

            for (const [type, items] of Object.entries(cargoGroups)) {
                const commodity = commodities[type];
                const sellPrice = planet.commodityPrices[type];
                const profit = sellPrice - items[0].buyPrice;
                const profitClass = profit > 0 ? 'profit' : profit < 0 ? 'loss' : '';
                
                html += `
                    <div class="commodity-item">
                        <span class="commodity-icon">${commodity.icon}</span>
                        <span class="commodity-name">${commodity.name} (${items.length})</span>
                        <span class="commodity-price ${profitClass}">
                            §${sellPrice} (${profit > 0 ? '+' : ''}${profit})
                        </span>
                        <button class="trade-btn sell-btn" onclick="window.tradingSystem.sellCommodity('${type}')">
                            SELL
                        </button>
                    </div>
                `;
            }
        }

        // Show available items to buy
        html += '<div class="commodity-section">AVAILABLE TO BUY</div>';
        
        for (const [type, price] of Object.entries(planet.commodityPrices)) {
            const commodity = commodities[type];
            const canAfford = state.ship.credits >= price;
            const hasSpace = state.ship.cargo.length < state.ship.cargoCapacity;
            const canBuy = canAfford && hasSpace;
            
            html += `
                <div class="commodity-item">
                    <span class="commodity-icon">${commodity.icon}</span>
                    <span class="commodity-name">${commodity.name}</span>
                    <span class="commodity-price">§${price}</span>
                    <button class="trade-btn buy-btn" 
                            ${!canBuy ? 'disabled' : ''} 
                            onclick="window.tradingSystem.buyCommodity('${type}', ${price})">
                        ${!hasSpace ? 'NO SPACE' : !canAfford ? 'NO FUNDS' : 'BUY'}
                    </button>
                </div>
            `;
        }

        this.commodityList.innerHTML = html;
    }

    buyCommodity(type, price) {
        const state = this.stateManager.state;
        
        // Check conditions
        if (state.ship.credits < price) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Insufficient credits!',
                type: 'error',
                duration: 2000
            });
            return;
        }

        if (state.ship.cargo.length >= state.ship.cargoCapacity) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Cargo hold full!',
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Make purchase
        state.ship.credits -= price;
        state.ship.cargo.push({
            type: type,
            buyPrice: price,
            buyLocation: state.ship.landedPlanet.name
        });

        // Play sound
        this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'buy' });

        // Update UI
        this.updateTradingUI();
        this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });

        // Show message
        const commodity = commodities[type];
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Bought ${commodity.name} for §${price}`,
            type: 'success',
            duration: 2000
        });
    }

    sellCommodity(type) {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        // Find item in cargo
        const itemIndex = state.ship.cargo.findIndex(item => item.type === type);
        if (itemIndex === -1) return;

        const item = state.ship.cargo[itemIndex];
        const sellPrice = planet.commodityPrices[type];
        const profit = sellPrice - item.buyPrice;

        // Remove from cargo and add credits
        state.ship.cargo.splice(itemIndex, 1);
        state.ship.credits += sellPrice;

        // Track trading profit
        if (!state.ship.totalProfit) state.ship.totalProfit = 0;
        state.ship.totalProfit += profit;

        // Play sound
        this.eventBus.emit(GameEvents.AUDIO_PLAY, { 
            sound: profit > 0 ? 'profit' : 'sell' 
        });

        // Update UI
        this.updateTradingUI();
        this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });

        // Show message
        const commodity = commodities[type];
        const profitMsg = profit > 0 ? ` (Profit: §${profit})` : 
                          profit < 0 ? ` (Loss: §${Math.abs(profit)})` : '';
        
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Sold ${commodity.name} for §${sellPrice}${profitMsg}`,
            type: profit > 0 ? 'success' : profit < 0 ? 'warning' : 'info',
            duration: 2000
        });

        // Check for trading mission completion
        if (state.ship.credits >= 750 && state.missionSystem) {
            const tradeMission = state.missionSystem.available.find(m => m.id === 'trader');
            if (tradeMission && state.missionSystem.active?.id === 'trader') {
                this.eventBus.emit(GameEvents.MISSION_COMPLETE, { mission: tradeMission });
            }
        }
    }

    update(state, deltaTime) {
        // Nothing to update each frame for trading
    }
}

// Make it accessible for onclick handlers
window.tradingSystem = null;