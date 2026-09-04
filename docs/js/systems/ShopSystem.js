/**
 * Shop System - Handles weapon, upgrade, and ship purchases at stations
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { getMetaStateManager } from '../core/MetaStateManager.js';
import { shopInventory, shipClasses } from '../data/gameData.js';
import { applyShipClass, deriveShipStats, UPGRADE_LEVEL_RANGE } from './ShipStats.js';

// Upgrade item type -> the ship field that stores its level
const LEVEL_FIELD_BY_TYPE = {
    shield: 'shieldLevel',
    engine: 'engineLevel',
    cargo: 'cargoLevel',
    radar: 'radarLevel'
};

export default class ShopSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        // Default catalogue; MENU_OPEN('shop') narrows it to the planet's stock
        this.currentShopInventory = shopInventory;
    }

    async init() {
        // Listen for shop-related events
        this.eventBus.on(GameEvents.MENU_OPEN, (data) => {
            if (data.panel === 'shop') {
                this.currentShopInventory = data.shopInventory || shopInventory;
            }
        });
        // Handle delegated shop buy events (no globals)
        this.eventBus.on(GameEvents.SHOP_BUY, (data) => {
            if (!data || !data.itemId) return;
            this.buyUpgrade(data.itemId);
        });

        // Handle ship purchase events
        this.eventBus.on(GameEvents.SHIP_BUY, (data) => {
            if (!data || !data.shipId) return;
            this.buyShip(data.shipId);
        });

        // No globals; UI emits events for actions

        console.log('[ShopSystem] Initialized');
    }

    buyUpgrade(itemId) {
        const state = this.stateManager.state;
        const ship = state.ship;
        if (ship.isDestroyed) return;
        const item = (this.currentShopInventory && this.currentShopInventory[itemId]) || shopInventory[itemId];
        
        if (!item) {
            console.error('[ShopSystem] Item not found:', itemId);
            return;
        }

        // Check if player can afford it
        if (ship.credits < item.price) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Insufficient credits!',
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Handle different item types
        let purchaseSuccess = false;
        
        if (item.type === 'weapon') {
            // Check if already owned
            if (!ship.weapons) ship.weapons = [];
            
            const wType = item.value?.type || itemId;
            const alreadyOwned = ship.weapons.some(w => w.type === wType);
            if (alreadyOwned) {
                this.eventBus.emit(GameEvents.UI_MESSAGE, {
                    message: 'You already own this weapon!',
                    type: 'warning',
                    duration: 2000
                });
                return;
            }
            
            // Add weapon to ship
            ship.weapons.push({
                type: wType,
                damage: item.value?.damage ?? item.damage,
                cooldown: item.value?.cooldown ?? item.cooldown,
                speed: item.value?.speed ?? item.speed ?? 2
            });
            
            // Auto-equip if first weapon
            if (ship.weapons.length === 1) {
                ship.currentWeapon = 0;
            }
            
            purchaseSuccess = true;

        } else if (LEVEL_FIELD_BY_TYPE[item.type]) {
            // Levelled upgrades (shield/engine/cargo/radar): the item sets a
            // LEVEL, never an absolute stat. ShipStats derives the stat from
            // hull + level, so an upgrade can no longer downgrade a better hull
            // (E5) and a reload can no longer lose it.
            if (!this._applyLevelUpgrade(ship, item)) return;
            purchaseSuccess = true;
        }

        if (purchaseSuccess) {
            // Deduct credits
            ship.credits -= item.price;
            
            // Play purchase sound
            this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'buy' });
            
            // Show success message
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Purchased ${item.name} for §${item.price}`,
                type: 'success',
                duration: 2000
            });
            
            // Update UI
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship: ship });
            this.eventBus.emit(GameEvents.SHIP_UPGRADE, { 
                ship: ship, 
                shopInventory: this.currentShopInventory 
            });
            
            // Check for tutorial progression
            if (ship.weapons && ship.weapons.length > 0 && ship.tutorialStage === 'start') {
                ship.tutorialStage = 'armed';
                this.eventBus.emit(GameEvents.TUTORIAL_UPDATE, {
                    stage: 'armed',
                    ship: ship
                });
            }
        }
    }

    /**
     * Apply a levelled upgrade. Only the next level up is sellable; anything
     * already owned or out of order is refused with a message.
     * @returns {boolean} true when the level was applied
     */
    _applyLevelUpgrade(ship, item) {
        const field = LEVEL_FIELD_BY_TYPE[item.type];
        const range = UPGRADE_LEVEL_RANGE[field];
        const current = Number.isFinite(Number(ship[field])) ? Number(ship[field]) : range.min;
        const target = Number(item.level);

        if (!Number.isFinite(target)) {
            console.error('[ShopSystem] Upgrade item has no level:', item.name);
            return false;
        }
        if (target <= current) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `${item.name} already installed`,
                type: 'warning',
                duration: 1800
            });
            return false;
        }
        if (target !== current + 1) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Install the previous ${item.type} upgrade first`,
                type: 'warning',
                duration: 2000
            });
            return false;
        }

        ship[field] = target;
        deriveShipStats(ship, shipClasses);
        // A new shield generator comes charged
        if (item.type === 'shield') ship.shield = ship.maxShield;
        return true;
    }

    buyShip(shipId) {
        const state = this.stateManager.state;
        const ship = state.ship;
        if (ship.isDestroyed) return;
        const newShipClass = shipClasses[shipId];

        if (!newShipClass) {
            console.error('[ShopSystem] Ship class not found:', shipId);
            return;
        }

        // Check if player is already flying this ship
        if (ship.shipClass === shipId) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'You are already flying this ship!',
                type: 'warning',
                duration: 2000
            });
            return;
        }

        // Check if player can afford it
        if (ship.credits < newShipClass.price) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Insufficient credits! Need §${newShipClass.price}`,
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Check requirements
        if (ship.kills < newShipClass.requiredKills) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Requires ${newShipClass.requiredKills} kills to purchase`,
                type: 'error',
                duration: 2000
            });
            return;
        }

        const meta = getMetaStateManager();
        const lifetimeCredits = meta?.getStats?.()?.totalCreditsEarned || 0;
        if (lifetimeCredits < newShipClass.requiredCredits) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Must have earned §${newShipClass.requiredCredits} total (earned: §${lifetimeCredits})`,
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Save current cargo (will be transferred to new ship)
        const currentCargo = ship.cargo || [];
        const currentWeapons = ship.weapons || [];
        const currentCredits = ship.credits;
        const currentKills = ship.kills;
        const currentMissions = ship.missions || { active: [], completed: [], available: [] };
        const currentMissionStates = ship.missionStates || {};

        // Calculate trade-in value of old ship (50% of purchase price)
        const oldShipClass = shipClasses[ship.shipClass || 'shuttle'];
        const tradeInValue = oldShipClass ? Math.floor(oldShipClass.price * 0.5) : 0;
        const finalPrice = Math.max(0, newShipClass.price - tradeInValue);

        if (currentCredits < finalPrice) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Insufficient credits after trade-in! Need §${finalPrice}`,
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Installed upgrades move to the new hull with the pilot
        const levels = {
            engineLevel: ship.engineLevel,
            shieldLevel: ship.shieldLevel,
            cargoLevel: ship.cargoLevel,
            radarLevel: ship.radarLevel
        };

        // Apply new ship stats (single derivation — ShipStats owns the formula)
        applyShipClass(ship, shipId, shipClasses);
        Object.assign(ship, levels);
        deriveShipStats(ship, shipClasses);
        ship.health = ship.maxHealth;   // Full repair on purchase
        ship.shield = ship.maxShield;   // Full shield on purchase

        // Deduct final price
        ship.credits = currentCredits - finalPrice;

        // Restore persistent data
        ship.cargo = currentCargo.slice(0, ship.cargoCapacity); // Trim if new ship has less cargo
        ship.weapons = currentWeapons.slice(0, ship.weaponSlots); // Trim if new ship has fewer weapon slots
        ship.kills = currentKills;
        ship.missions = currentMissions;
        ship.missionStates = currentMissionStates;

        // Restore current weapon index if valid
        if (ship.currentWeapon >= ship.weapons.length) {
            ship.currentWeapon = Math.max(0, ship.weapons.length - 1);
        }

        // Play purchase sound
        this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'buy' });

        // Show success message
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Purchased ${newShipClass.name}! ${tradeInValue > 0 ? `(Trade-in: §${tradeInValue})` : ''}`,
            type: 'success',
            duration: 3000
        });

        // Update UI
        this.eventBus.emit(GameEvents.UI_UPDATE, { ship: ship });
        this.eventBus.emit(GameEvents.SHIP_UPGRADE, { ship: ship });
    }

    update(state, deltaTime) {
        // No per-frame updates needed for shop
    }
}

// No globals
