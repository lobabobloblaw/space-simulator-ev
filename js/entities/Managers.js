export class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }
    
    clearAll() {
        this.projectiles = [];
    }
    
    add(projectile) {
        this.projectiles.push(projectile);
    }
}

export class AsteroidManager {
    constructor() {
        this.asteroids = [];
    }
    
    init() {
        for (let i = 0; i < 50; i++) {
            this.asteroids.push({
                x: (Math.random() - 0.5) * 4000,
                y: (Math.random() - 0.5) * 4000,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 8 + 2,
                color: "#666",
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                health: 20,
                maxHealth: 20,
                oreContent: Math.floor(Math.random() * 3) + 1
            });
        }
    }
}

export class PickupManager {
    constructor() {
        this.pickups = [];
    }
    
    add(pickup) {
        this.pickups.push(pickup);
    }
}