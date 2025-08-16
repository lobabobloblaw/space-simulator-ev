/**
 * NPC Ship Manager
 */
export class NPCManager {
    constructor() {
        this.ships = [];
        this.nextShipSpawn = Date.now() + Math.random() * 3000 + 2000;
        this.npcTypes = {
            freighter: { 
                color: "#8B7355", 
                behavior: "passive",
                maxSpeed: 0.25,
                thrust: 0.002,
                turnSpeed: 0.006,
                size: 22,
                width: 28,
                credits: 800,
                health: 150,
                maxHealth: 150,
                weapon: { type: "laser", damage: 3, cooldown: 40 }
            },
            trader: { 
                color: "#95A5A6", 
                behavior: "passive",
                maxSpeed: 0.45,
                thrust: 0.004,
                turnSpeed: 0.012,
                size: 12,
                width: 14,
                credits: 200,
                health: 50,
                maxHealth: 50,
                weapon: null
            },
            pirate: { 
                color: "#E74C3C", 
                behavior: "aggressive",
                maxSpeed: 0.7,
                thrust: 0.007,
                turnSpeed: 0.02,
                size: 11,
                width: 12,
                credits: 150,
                health: 80,
                maxHealth: 80,
                weapon: { type: "laser", damage: 10, cooldown: 18 }
            },
            patrol: { 
                color: "#1E3A5F",
                behavior: "lawful",
                maxSpeed: 1.2,
                thrust: 0.015,
                turnSpeed: 0.08,
                size: 16,
                width: 18,
                credits: 100,
                health: 150,
                maxHealth: 150,
                weapon: { type: "rapid", damage: 6, cooldown: 20 }
            }
        };
    }
    
    clearAll() {
        this.ships = [];
        this.nextShipSpawn = Date.now() + 5000 + Math.random() * 5000;
    }
    
    update(ship, planets, projectileManager, audioSystem) {
        // Spawn logic would go here
        // NPC AI logic would go here
        // For now, return empty to keep game running
    }
}