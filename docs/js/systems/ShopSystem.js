/**
 * Shop System - Handles weapon and upgrade purchases at stations
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { shopInventory } from '../data/gameData.js';

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

        // Make shop methods available globally for onclick handlers
        window.shopSystem = this;

        console.log('[ShopSystem] Initialized');
    }

    buyUpgrade(itemId) {
        const state = this.stateManager.state;
        const ship = state.ship;
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
                ship.currentWeaponIndex = 0;
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

    update(state, deltaTime) {
        // No per-frame updates needed for shop
    }
}

// Make it accessible for onclick handlers
window.shopSystem = null;
