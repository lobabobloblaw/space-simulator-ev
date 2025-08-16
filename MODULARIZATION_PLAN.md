# Modularization Plan for Galaxy Trader

## Current State
- Single 3,366-line HTML file containing everything
- Mix of HTML, CSS, and JavaScript
- All game logic, rendering, and data in one place

## Proposed Structure

```
space-simulator-ev/
├── index.html              # Main HTML file (minimal)
├── css/
│   └── main.css           # All styles
├── js/
│   ├── main.js            # Entry point & game loop
│   ├── config.js          # Game constants & settings
│   ├── entities/
│   │   ├── ship.js        # Player ship logic
│   │   ├── npc.js         # NPC ship types & behaviors
│   │   ├── projectile.js  # Projectile system
│   │   ├── asteroid.js    # Asteroid logic
│   │   └── pickup.js      # Pickup items
│   ├── systems/
│   │   ├── physics.js     # Movement & collision
│   │   ├── combat.js      # Weapon & damage systems
│   │   ├── trading.js     # Economy & commodities
│   │   ├── missions.js    # Mission system
│   │   └── audio.js       # Sound system
│   ├── ui/
│   │   ├── hud.js         # HUD rendering
│   │   ├── minimap.js     # Minimap rendering
│   │   ├── landing.js     # Landing/station interface
│   │   └── tutorial.js    # Tutorial hints
│   ├── rendering/
│   │   ├── renderer.js    # Main render loop
│   │   ├── stars.js       # Background stars
│   │   ├── effects.js     # Explosions & particles
│   │   └── draw.js        # Entity drawing functions
│   └── data/
│       ├── planets.js     # Planet/station data
│       ├── commodities.js # Trade goods data
│       ├── upgrades.js    # Shop inventory
│       └── npctypes.js    # NPC configurations
└── assets/              # (Future: sprites, sounds)
```

## Modularization Phases

### Phase 1: Quick Wins First (Current Branch)
Before modularizing, implement the quick wins in the single file:
1. Achievement system
2. Better visual effects
3. More mission variety

### Phase 2: Basic Separation (New Branch)
1. Extract CSS to separate file
2. Create basic HTML skeleton
3. Move JavaScript to main.js

### Phase 3: Data Extraction
1. Move all game data to data/ files
2. Create config.js for constants
3. Set up ES6 modules

### Phase 4: System Separation
1. Extract game systems (physics, combat, etc.)
2. Separate UI components
3. Isolate rendering logic

### Phase 5: Entity Refactor
1. Create proper classes for entities
2. Implement entity component system
3. Standardize entity interfaces

## Benefits
- Easier to maintain and debug
- Can work on systems independently
- Better code organization
- Enables future features like:
  - Save/load system
  - Mod support
  - Multiplayer
  - Multiple developers

## Considerations
- Keep it playable at each step
- Maintain single-file fallback option
- No build process initially (use ES6 modules)
- Performance should not degrade

## Quick Wins TODO (Before Modularization)
1. **Achievement System**
   - "First Blood" - First kill
   - "Trader" - First profitable trade
   - "Rich" - Reach 5000 credits
   - "Survivor" - Survive 10 minutes
   - "Hunter" - Kill 10 pirates
   - "Miner" - Collect 20 ore

2. **Visual Polish**
   - Ship thrust trails
   - Better explosion particles
   - Shield bubble effects
   - Weapon impact sparks
   - Speed lines when boosting

3. **Mission Variety**
   - Delivery missions
   - Escort missions
   - Mining contracts
   - Pirate bounties
   - Time-limited trades
