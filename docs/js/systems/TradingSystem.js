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

        // Event-driven buy/sell requests
        this.eventBus.on(GameEvents.TRADE_BUY, (data) => {
            if (!data || !data.type) return;
            this.buyCommodity(data.type, data.price);
        });
        this.eventBus.on(GameEvents.TRADE_SELL, (data) => {
            if (!data || !data.type) return;
            this.sellCommodity(data.type);
        });
        this.eventBus.on(GameEvents.TRADE_SELL_ALL, () => {
            this.sellAllCargo();
        });

        // Initialize cargo if not already done
        const state = this.stateManager.state;
        if (!state.ship.cargo) {
            state.ship.cargo = [];
        }

        console.log('TradingSystem initialized');
    }

    // Compute trader reputation effect (±5% at ±50 rep)
    // Returns { buyMult, sellMult, effect }
    getTraderRepEffect() {
        const rep = (this.stateManager?.state?.reputation?.trader) || 0;
        const clamped = Math.max(-50, Math.min(50, rep));
        const effect = clamped * 0.001; // ±0.05
        return {
            buyMult: 1 - effect,
            sellMult: 1 + effect,
            effect
        };
    }

    showTradingPanel() {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        if (!planet || !planet.commodityPrices) return;
        const repEff = this.getTraderRepEffect();

        // Hide other panels
        document.getElementById('landingInfo').style.display = 'none';
        document.getElementById('shopPanel').style.display = 'none';
        
        // Show trading panel with flex display
        this.tradingPanel.style.display = 'flex';
        
        this.updateTradingUI();
    }

    updateTradingUI() {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        if (!planet || !planet.commodityPrices) return;
        // Reputation effect used for adjusted pricing
        const repEff = this.getTraderRepEffect();

        // Update credits and cargo display
        document.getElementById('tradeCredits').textContent = state.ship.credits;
        document.getElementById('tradeCargo').textContent = 
            `${state.ship.cargo.length}/${state.ship.cargoCapacity}`;

        // Build commodity list (header is now in HTML) using safe DOM
        const container = this.commodityList;
        if (!container) return;
        while (container.firstChild) container.removeChild(container.firstChild);
        
        // Show items in cargo (sell section)
        if (state.ship.cargo.length > 0) {
            const sec = document.createElement('div'); sec.className = 'commodity-section'; sec.textContent = 'YOUR CARGO'; container.appendChild(sec);
            const cargoGroups = {};
            state.ship.cargo.forEach(item => { (cargoGroups[item.type] ||= []).push(item); });
            for (const [type, items] of Object.entries(cargoGroups)) {
                const commodity = commodities[type] || { name: type, icon: '📦' };
                const sellPrice = planet.commodityPrices[type];
                const canSellHere = Number.isFinite(sellPrice);
                const adjustedSell = canSellHere ? Math.max(1, Math.round(sellPrice * repEff.sellMult)) : 0;
                const profit = canSellHere ? (adjustedSell - items[0].buyPrice) : 0;
                const row = document.createElement('div'); row.className = 'commodity-item';
                const icon = document.createElement('span'); icon.className = 'commodity-icon'; icon.textContent = commodity.icon || '';
                const name = document.createElement('span'); name.className = 'commodity-name'; name.textContent = `${commodity.name} (${items.length})`;
                const price = document.createElement('span'); price.className = 'commodity-price'; if (canSellHere) { if (profit>0) price.classList.add('profit'); else if (profit<0) price.classList.add('loss'); }
                price.textContent = canSellHere ? `§${adjustedSell} (${profit>0?'+':''}${profit})` : 'Not accepted here';
                const btn = document.createElement('button'); btn.className = 'trade-btn sell-btn'; btn.textContent = canSellHere ? 'SELL' : 'NO BUYERS'; if (!canSellHere) btn.disabled = true; btn.setAttribute('data-action','sell'); btn.setAttribute('data-type', type);
                row.appendChild(icon); row.appendChild(name); row.appendChild(price); row.appendChild(btn);
                container.appendChild(row);
            }
        }

        // Show available items to buy
        { const sec = document.createElement('div'); sec.className = 'commodity-section'; sec.textContent = 'AVAILABLE TO BUY'; container.appendChild(sec); }
        
        for (const [type, price] of Object.entries(planet.commodityPrices)) {
            const commodity = commodities[type];
            const adjustedBuy = Math.max(1, Math.round(price * repEff.buyMult));
            const canAfford = state.ship.credits >= adjustedBuy;
            const hasSpace = state.ship.cargo.length < state.ship.cargoCapacity;
            const canBuy = canAfford && hasSpace;
            const row = document.createElement('div'); row.className = 'commodity-item';
            const icon = document.createElement('span'); icon.className = 'commodity-icon'; icon.textContent = commodity.icon || '';
            const name = document.createElement('span'); name.className = 'commodity-name'; name.textContent = commodity.name;
            const priceEl = document.createElement('span'); priceEl.className = 'commodity-price'; priceEl.textContent = `§${adjustedBuy}`;
            const btn = document.createElement('button'); btn.className = 'trade-btn buy-btn'; btn.textContent = !hasSpace ? 'NO SPACE' : !canAfford ? 'NO FUNDS' : 'BUY'; if (!canBuy) btn.disabled = true; btn.setAttribute('data-action','buy'); btn.setAttribute('data-type', type); btn.setAttribute('data-price', String(price));
            row.appendChild(icon); row.appendChild(name); row.appendChild(priceEl); row.appendChild(btn);
            container.appendChild(row);
        }

        this.attachDelegates();
    }

    attachDelegates() {
        if (this._delegatesAttached || !this.commodityList) return;
        this._delegatesAttached = true;
        this.commodityList.addEventListener('click', (e) => {
            const btn = e.target.closest('button.trade-btn');
            if (!btn || btn.disabled) return;
            const action = btn.getAttribute('data-action');
            const type = btn.getAttribute('data-type');
            if (action === 'buy' && type) {
                const price = Number(btn.getAttribute('data-price'));
                this.buyCommodity(type, price);
            } else if (action === 'sell' && type) {
                this.sellCommodity(type);
            } else if (action === 'sellAll') {
                this.sellAllCargo();
            }
        });
    }

    /**
     * Sell all cargo accepted at current planet
     */
    sellAllCargo() {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        if (!planet || !planet.commodityPrices) return;
        if (!Array.isArray(state.ship.cargo) || state.ship.cargo.length === 0) return;
        const repEff = this.getTraderRepEffect();
        let total = 0;
        for (let i = state.ship.cargo.length - 1; i >= 0; i--) {
            const item = state.ship.cargo[i];
            const sellPrice = planet.commodityPrices[item.type];
            if (!Number.isFinite(sellPrice)) continue;
            const adjusted = Math.max(1, Math.round(sellPrice * repEff.sellMult));
            total += adjusted;
            state.ship.cargo.splice(i, 1);
        }
        if (total > 0) {
            state.ship.credits += total;
            this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'sell' });
            this.updateTradingUI();
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: state.ship });
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Sold all cargo for §${total}`,
                type: 'success',
                duration: 2000
            });
        }
    }

    buyCommodity(type, price) {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        const repEff = this.getTraderRepEffect();
        const base = planet?.commodityPrices?.[type];
        const effectivePrice = Number.isFinite(base) ? Math.max(1, Math.round(base * repEff.buyMult)) : price;
        
        // Check conditions
        if (state.ship.credits < effectivePrice) {
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
        state.ship.credits -= effectivePrice;
        state.ship.cargo.push({
            type: type,
            buyPrice: effectivePrice,
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
            message: `Bought ${commodity.name} for §${effectivePrice}`,
            type: 'success',
            duration: 2000
        });

        // Reputation: small gain for commerce activity (optional, minor)
        state.reputation = state.reputation || { trader: 0, patrol: 0, pirate: 0 };
        state.reputation.trader = (state.reputation.trader || 0) + 1;
        this.eventBus.emit(GameEvents.REPUTATION_CHANGED, { faction: 'trader', delta: +1, total: state.reputation.trader });
    }

    sellCommodity(type) {
        const state = this.stateManager.state;
        const planet = state.ship.landedPlanet;
        
        // Find item in cargo
        const itemIndex = state.ship.cargo.findIndex(item => item.type === type);
        if (itemIndex === -1) return;

        const item = state.ship.cargo[itemIndex];
        const sellPrice = planet.commodityPrices[type];
        if (!Number.isFinite(sellPrice)) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'No buyers for this cargo here',
                type: 'warning',
                duration: 1800
            });
            return;
        }
        const repEff = this.getTraderRepEffect();
        const adjustedSell = Math.max(1, Math.round(sellPrice * repEff.sellMult));
        const profit = adjustedSell - item.buyPrice;

        // Remove from cargo and add credits
        state.ship.cargo.splice(itemIndex, 1);
        state.ship.credits += adjustedSell;

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
            message: `Sold ${commodity.name} for §${adjustedSell}${profitMsg}`,
            type: profit > 0 ? 'success' : profit < 0 ? 'warning' : 'info',
            duration: 2000
        });

        // Reputation: commerce increases trader standing (sell weighted a bit more)
        state.reputation = state.reputation || { trader: 0, patrol: 0, pirate: 0 };
        const delta = profit > 0 ? 2 : 1;
        state.reputation.trader = (state.reputation.trader || 0) + delta;
        this.eventBus.emit(GameEvents.REPUTATION_CHANGED, { faction: 'trader', delta, total: state.reputation.trader });

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

// No globals
