export class HUD {
    update(ship) {
        document.getElementById('health').textContent = Math.round(ship.health) + '%';
        document.getElementById('shield').textContent = ship.shield > 0 ? Math.round(ship.shield) : 'None';
        document.getElementById('fuel').textContent = Math.round(ship.fuel) + '%';
        document.getElementById('speed').textContent = (Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy) * 100).toFixed(1);
        document.getElementById('cargo').textContent = ship.cargo.reduce((sum, item) => sum + item.quantity, 0) + '/' + ship.cargoCapacity;
        document.getElementById('location').textContent = ship.isLanded ? ship.landedPlanet?.name : 'Deep Space';
        document.getElementById('credits').textContent = ship.credits;
        document.getElementById('weapon').textContent = ship.weapons.length > 0 ? ship.weapons[ship.currentWeapon].type.toUpperCase() : 'NONE';
        document.getElementById('kills').textContent = ship.kills;
    }
}

export class LandingInterface {
    constructor(ship, tradingSystem, audioSystem) {
        this.ship = ship;
        this.tradingSystem = tradingSystem;
        this.audioSystem = audioSystem;
    }
    
    show(planet) {
        document.getElementById('planetName').textContent = planet.name;
        document.getElementById('landingMessage').textContent = 'Landing successful!';
        document.getElementById('planetDescription').textContent = planet.description;
        document.getElementById('landingOverlay').style.display = 'block';
        this.ship.currentPlanet = planet;
    }
    
    close() {
        document.getElementById('landingOverlay').style.display = 'none';
        window.game.paused = false;
    }
    
    showPanel(panelType) {
        document.getElementById('landingContent').style.display = panelType === 'landing' ? 'flex' : 'none';
        document.getElementById('tradingPanel').style.display = panelType === 'trading' ? 'block' : 'none';
        document.getElementById('shopPanel').style.display = panelType === 'shop' ? 'block' : 'none';
    }
}

export class TutorialSystem {
    constructor(ship) {
        this.ship = ship;
    }
    
    update() {
        const hintElement = document.getElementById('tutorialHint');
        if (!hintElement) return;
        
        let message = null;
        
        if (this.ship.tutorialStage === 'start' && this.ship.weapons.length === 0) {
            message = "⚠️ UNARMED - Find a planet (L key near planet) and trade to earn credits for weapons";
        }
        
        if (message) {
            hintElement.textContent = message;
            hintElement.classList.add('visible');
        } else {
            hintElement.classList.remove('visible');
        }
    }
}