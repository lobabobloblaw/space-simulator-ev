# Galaxy Trader - Session 41 Handoff Document
## Date: January 2025

## CRITICAL: READ THIS FIRST
The game is **FULLY FUNCTIONAL** and uses **pure EventBus architecture**. The active file is `main_eventbus_pure.js` (NOT main.js!). All systems communicate via events only - no global variables except for debugging.

## How to Run the Game
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# Then open: http://localhost:8000/docs/
```

## Session 41 Changes (What We Just Fixed)

### 1. NPC Visual Improvements
- **Removed colored glow highlights** around NPCs that were too distracting
- Kept status indicator icons below NPCs (exclamation for pursuing, arrows for fleeing, etc.)
- NPCs still show their ship colors and designs

### 2. NPC Spawning Logic Overhaul
- **Fixed "swarming" behavior** - NPCs no longer all converge on player at game start
- NPCs now spawn with varied trajectories:
  - Traders/Freighters: 40% near planets, 60% in transit between planets
  - Pirates: 30% move tangentially, 30% prowl slowly, 40% hunt inward at angles
  - Patrols: 40% orbit areas, 30% patrol trade routes, 30% respond to incidents
- Game starts with 3-5 NPCs already in the system with random velocities
- Most NPCs spawn without warp effects (appear already in-system)

### 3. Trading UI Fix
- **Fixed scrolling issue** in Commodities Market
- Credits and cargo counters now stay fixed at top
- "COMMODITIES MARKET" header stays fixed
- Only the goods list scrolls
- Structure: `trading-header` (fixed) and `trading-content` (scrollable)

### 4. Shop/Outfitter System Complete Fix
- **Created ShopSystem.js** to handle all shop purchases
- Fixed credits showing as 0 (data wasn't being passed)
- Fixed "no items available" (shop inventory wasn't loading)
- Shop now properly shows weapons, shields, and engine upgrades
- Purchase functionality fully working
- Already-owned items show as "Owned" and are disabled

## Current Game Architecture

### Core Systems (Pure EventBus)
```
/docs/js/
├── main_eventbus_pure.js     # ACTIVE MAIN FILE - Entry point
├── core/
│   ├── EventBus.js           # Central event system
│   ├── StateManager.js       # All game state (no globals!)
│   └── GameLoop.js           # Game loop controller
└── systems/
    ├── InputSystem.js        # Keyboard/mouse input
    ├── PhysicsSystem.js      # Collision detection
    ├── RenderSystem.js       # All graphics rendering
    ├── AudioSystem.js        # Sound effects
    ├── UISystem.js           # HUD and menus
    ├── WeaponSystem.js       # Combat mechanics
    ├── NPCSystem.js          # NPC AI with personalities
    ├── SpawnSystem.js        # Entity spawning
    ├── TradingSystem.js      # Commodity trading
    ├── ShopSystem.js         # Weapon/upgrade purchases
    └── SaveSystemAdapterFixed.js # Save/Load (F5/F9)
```

### Important Architecture Rules
1. **NO GLOBAL VARIABLES** - Everything in StateManager
2. **EVENTS ONLY** - Systems communicate via EventBus, never directly
3. **STATE PROXY** - StateManager uses Proxy for automatic change detection
4. **RELATIVE IMPORTS** - Use `../core/`, `./` not absolute paths

## Current Features (All Working)
- ✅ Ship movement (WASD), combat (F), landing (L)
- ✅ Asteroid collisions with damage, screen shake, red flash
- ✅ NPC AI with personalities (pirates hunt, patrols chase pirates, traders flee)
- ✅ Trading system with dynamic prices
- ✅ Shop system with weapons and upgrades
- ✅ Save/Load system (F5/F9 keys)
- ✅ Procedural planet rendering with AI landscapes
- ✅ All visual effects (explosions, warp, thrust, shields)

## Known Issues/Quirks
1. **Save System**: Only saves ship data, not world state (intentional - NPCs respawn fresh)
2. **Performance**: Can slow down with many explosions/particles on screen
3. **AI Landscapes**: Sometimes fail to load (falls back to procedural)
4. **Touch Controls**: Exist but not well tested

## Testing Commands (Browser Console)
```javascript
// View game state
window.stateManager.state

// Check ship status
window.stateManager.state.ship

// Add credits for testing
window.stateManager.state.ship.credits = 5000

// View all NPCs
window.stateManager.state.npcShips

// Force save
window.eventBus.emit('game.save')
```

## Common Troubleshooting

### "No graphics showing"
- Clear save: Press F12 twice, then reload browser
- Check console for errors
- Verify index.html loads `main_eventbus_pure.js`

### "NPCs not behaving correctly"
- NPCs have complex AI states in NPCSystem.js
- Pirates hunt players/traders
- Patrols hunt pirates, warn then attack hostile players
- Traders flee from threats, travel between planets

### "Shop has no items"
- Fixed in Session 41 with ShopSystem.js
- Now shows default items if planet doesn't specify
- Check shopInventory in gameData.js

### "Trading panel layout broken"
- Fixed in Session 41 with separated header/content
- Header stays fixed, content scrolls

## File Locations Quick Reference
```
/docs/
├── index.html                 # Main HTML (includes UI panels)
├── css/main.css              # All styling (cyberpunk theme)
├── js/
│   ├── main_eventbus_pure.js # ACTIVE MAIN
│   ├── data/gameData.js      # Planets, items, NPCs, commodities
│   └── systems/*.js          # All game systems
```

## Recent Session History
- **Session 39**: Restored collision system, damage working
- **Session 40**: Initial handoff, system overview
- **Session 41**: Fixed NPC visuals, spawning, trading UI, shop system

## Next Potential Tasks
1. **Faction/Reputation System** - Track standing with traders/pirates/patrol
2. **Quest/Mission Chains** - More complex multi-step missions
3. **Space Stations** - Non-planet docking locations
4. **More Weapon Types** - Missiles, beam weapons, etc.
5. **Multiplayer Support** - Would need server backend
6. **Performance Optimizations** - Particle pooling, render culling
7. **Sound/Music** - Currently minimal audio
8. **Tutorial Improvements** - Better onboarding for new players

## Development Philosophy
- **Pure EventBus**: Keep everything event-driven, no direct coupling
- **State in One Place**: All state in StateManager, nowhere else
- **Visual Feedback**: Every action should have visual/audio response
- **Living World**: NPCs should feel autonomous, not player-centric
- **Cyberpunk Aesthetic**: Maintain the retro-futuristic terminal look

## Critical Reminders
1. **NEVER** edit `main.js` - it's the old file. Use `main_eventbus_pure.js`
2. **ALWAYS** use EventBus for communication between systems
3. **TEST** collision by ramming asteroids - should see damage + effects
4. When adding features, update StateManager first, then systems
5. Browser console is your friend - use it liberally for debugging

## Contact & Context
- Game: Galaxy Trader (2D space trading game)
- Architecture: Pure EventBus (no globals)
- Style: 90s cyberpunk, terminal aesthetic
- Platform: Browser-based, vanilla JS
- Owner: Alex Voigt
- Location: `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`

---
## Session 41 Summary
We successfully fixed four major issues: removed distracting NPC highlights, fixed NPC spawning to feel more natural, made the trading UI properly scrollable with fixed headers, and completely repaired the shop system with a new ShopSystem.js. The game is now in a polished, fully playable state with all core systems functioning correctly.

**The next Claude should know**: This project values clean event-driven architecture, visual polish, and a living world feel. The owner appreciates concise responses and prefers fixes that maintain the existing architecture rather than rewrites.