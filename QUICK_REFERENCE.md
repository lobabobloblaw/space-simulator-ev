# Quick Command Reference for Galaxy Trader

## Opening the Game
```bash
# In Terminal
open /Users/alexvoigt/Documents/Claude/space-simulator-ev/space-simulator.html
```

## Browser Console Commands (F12 → Console)

### Instant Testing Setup
```javascript
// Skip tutorial and get started quickly
ship.credits = 1000;
ship.weapons = [{type: "mining", damage: 2, cooldown: 35}];
ship.tutorialStage = 'done';
```

### God Mode for Testing
```javascript
// Invincible + Rich + Armed
ship.maxHealth = 9999;
ship.health = 9999;
ship.credits = 99999;
ship.weapons = [
    {type: "mining", damage: 2, cooldown: 35},
    {type: "rapid", damage: 5, cooldown: 12},
    {type: "plasma", damage: 20, cooldown: 35}
];
```

### Performance Monitoring
```javascript
// Show FPS counter
let fps = 0, lastTime = performance.now();
function monitorFPS() {
    const now = performance.now();
    fps = Math.round(1000 / (now - lastTime));
    lastTime = now;
    document.getElementById('credits').textContent = `${ship.credits} (${fps} FPS)`;
    requestAnimationFrame(monitorFPS);
}
monitorFPS();
```

### Spawn Specific NPCs
```javascript
// Spawn a pirate nearby
const pirate = {...npcTypes.pirate};
pirate.x = ship.x + 200;
pirate.y = ship.y + 200;
pirate.vx = 0;
pirate.vy = 0;
pirate.angle = 0;
npcShips.push(pirate);

// Spawn a patrol
const patrol = {...npcTypes.patrol};
patrol.x = ship.x - 200;
patrol.y = ship.y - 200;
patrol.vx = 0;
patrol.vy = 0;
patrol.angle = 0;
npcShips.push(patrol);
```

### Jump to Locations
```javascript
// Jump to Terra Nova
ship.x = planets[0].x + 50;
ship.y = planets[0].y + 50;

// Jump to Crimson Moon
ship.x = planets[1].x + 50;
ship.y = planets[1].y + 50;

// Jump to Ice World
ship.x = planets[2].x + 50;
ship.y = planets[2].y + 50;

// Jump to Mining Station
ship.x = planets[3].x + 50;
ship.y = planets[3].y + 50;
```

## Game Controls Reminder
- **W/↑**: Thrust forward
- **A/D or ←/→**: Turn
- **Space**: Brake
- **F**: Fire (if armed)
- **Q**: Switch weapons
- **L**: Land at nearby planet
- **M**: Mute/unmute sound 🔊

## Station Interface (When Landed)
- **1**: Depart
- **2**: Station info
- **3**: Trade commodities
- **4**: Buy upgrades

## Trading Tips
- 📉 = Good buy price (below 70% base)
- 📈 = Good sell price (above 130% base)
- Buy low at producing planets, sell high at consuming planets

## Mission System
- Missions auto-assign when you start
- Complete objectives for bonus credits
- Current mission shows in HUD location field
- Three starter missions:
  1. First Blood (kill 1 pirate) = 200 credits
  2. Merchant Apprentice (reach 750 credits) = 300 credits
  3. Bounty Hunter (kill 3 pirates) = 500 credits

## Combat Tips
- Pirates: 80 HP, 10 damage, worth 150+ credits
- Pirates drop loot! 60% chance for 50-150 bonus credits
- Patrols: 150 HP, 6 damage (weak but fast), avoid early game
- Mining laser: 2 damage (very weak, upgrade ASAP)
- Rapid laser: 5 damage (good all-around)
- Plasma cannon: 20 damage (slow but powerful)

## Sound System
- Press **M** to mute/unmute
- Each weapon has unique sound
- Soft thrust sound when accelerating
- Shield hits sound different from hull hits
