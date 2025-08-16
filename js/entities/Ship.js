/**
 * Player ship entity
 */
export class Ship {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.thrust = 0.004;
        this.maxSpeed = 0.45;
        this.fuel = 100;
        this.maxFuel = 100;
        this.credits = 250;
        this.tutorialStage = 'start';
        this.size = 8;
        this.isLanded = false;
        this.landedPlanet = null;
        this.landingCooldown = 0;
        this.class = "shuttle";
        this.health = 100;
        this.maxHealth = 100;
        this.weaponCooldown = 0;
        this.weaponSwitchPressed = false;
        this.kills = 0;
        this.cargo = [];
        this.cargoCapacity = 10;
        this.weapons = [];
        this.currentWeapon = 0;
        this.shield = 0;
        this.maxShield = 0;
        this.engineLevel = 1;
        this.weaponLevel = 1;
        this.currentPlanet = null;
    }
    
    update(keys, audioSystem) {
        // Rotation
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.angle -= 0.012;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            this.angle += 0.012;
        }
        
        // Thrust
        if ((keys['ArrowUp'] || keys['KeyW']) && this.fuel > 0.1) {
            const thrustX = Math.cos(this.angle) * this.thrust;
            const thrustY = Math.sin(this.angle) * this.thrust;
            this.vx += thrustX;
            this.vy += thrustY;
            this.fuel = Math.max(0, this.fuel - 0.1);
            
            if (audioSystem) audioSystem.playThrust();
        }
        
        // Brake
        if (keys['Space']) {
            this.vx *= 0.95;
            this.vy *= 0.95;
        }
        
        // Apply velocity limits
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Update weapon cooldown
        if (this.weaponCooldown > 0) {
            this.weaponCooldown--;
        }
        
        // Manage landing cooldown
        if (this.landingCooldown > 0) {
            this.landingCooldown--;
        }
        
        // Check if ship has moved away from landed planet
        if (this.isLanded && this.landedPlanet) {
            const dx = this.x - this.landedPlanet.x;
            const dy = this.y - this.landedPlanet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.landedPlanet.radius + 80) {
                this.isLanded = false;
                this.landedPlanet = null;
            }
        }
        
        // Slowly regenerate fuel
        if (this.fuel < this.maxFuel) {
            this.fuel = Math.min(this.maxFuel, this.fuel + 0.01);
        }
        
        // Slowly regenerate shields
        if (this.shield < this.maxShield) {
            this.shield = Math.min(this.maxShield, this.shield + 0.02);
        }
        
        // Slowly regenerate health when landed
        if (this.isLanded && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 0.1);
        }
    }
}