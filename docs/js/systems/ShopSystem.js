/**
 * Shop System - Handles weapon, upgrade, and ship purchases at stations
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { getMetaStateManager } from '../core/MetaStateManager.js';
import { shopInventory, shipClasses } from '../data/gameData.js';

export default class ShopSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
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
        const item = this.currentShopInventory[itemId] || shopInventory[itemId];
        
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
            
        } else if (item.type === 'shield') {
            // Upgrade shield
            ship.maxShield = item.value;
            ship.shield = item.value; // Fully charge on purchase
            purchaseSuccess = true;
            
        } else if (item.type === 'engine') {
            // Upgrade engine
            ship.engineLevel = item.value;
            ship.maxSpeed = 0.8 + (item.value - 1) * 0.2;
            ship.thrust = 0.012 + (item.value - 1) * 0.003;
            purchaseSuccess = true;
            
        } else if (item.type === 'cargo') {
            // Upgrade cargo capacity
            ship.cargoCapacity = item.value;
            purchaseSuccess = true;
        } else if (item.type === 'radar') {
            // Upgrade radar level (minimap detail)
            const newLevel = Math.max(ship.radarLevel || 0, item.value || 0);
            if (newLevel === (ship.radarLevel || 0)) {
                this.eventBus.emit(GameEvents.UI_MESSAGE, {
                    message: 'Radar already at this level',
                    type: 'warning',
                    duration: 1800
                });
                return;
            }
            ship.radarLevel = newLevel;
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

        // Apply new ship stats
        ship.shipClass = shipId;
        ship.maxSpeed = newShipClass.maxSpeed;
        ship.thrust = newShipClass.thrust;
        ship.turnSpeed = newShipClass.turnSpeed;
        ship.maxHealth = newShipClass.maxHealth;
        ship.health = newShipClass.maxHealth; // Full repair on purchase
        ship.maxShield = newShipClass.maxShield;
        ship.shield = newShipClass.maxShield; // Full shield on purchase
        ship.cargoCapacity = newShipClass.cargoCapacity;
        ship.weaponSlots = newShipClass.weaponSlots;
        ship.size = newShipClass.size;
        ship.width = newShipClass.width;
        ship.color = newShipClass.color;

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
