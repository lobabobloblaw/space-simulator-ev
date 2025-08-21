# QUICK START - SESSION 40

## Immediate Context
You're working on **Galaxy Trader**, a 2D space trading game with EventBus architecture.

## Critical Info
- **USE:** `main_eventbus_pure.js` (NOT main.js)
- **ARCHITECTURE:** Pure EventBus - no globals, all state in StateManager
- **LOCATION:** `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`
- **RUN:** `python3 -m http.server 8000` then open `http://localhost:8000/docs/`

## What Just Happened (Session 39)
- Fixed asteroid collision damage system
- Added screen shake and damage flash effects
- Maintained pure EventBus architecture
- Everything is working properly now

## Current State
✅ Game fully functional  
✅ Graphics rendering correctly  
✅ Collision damage working  
✅ Save/Load working (F5/F9)  
✅ Pure EventBus architecture intact  

## If User Mentions Issues

### "No graphics/planets/stars showing"
- Check if save data is corrupted
- Have them press F12 to clear save, then reload

### "Collisions not working"
- They are now! Test by ramming asteroids
- Slow = light damage, Fast = heavy damage + warning

### "Which file is the game using?"
- `main_eventbus_pure.js` is ACTIVE
- `main.js` is OLD/UNUSED
- Set in index.html

## Key Files to Know
```
/docs/js/main_eventbus_pure.js     - Main game loop
/docs/js/systems/PhysicsSystem.js  - Collision handling
/docs/js/systems/RenderSystem.js   - Graphics rendering
/docs/js/systems/NPCSystem.js      - NPC AI
/docs/js/core/EventBus.js          - Event system
/docs/js/core/StateManager.js      - Game state
```

## Debug Commands
```javascript
// Browser console:
window.stateManager.state          // View state
window.ship                        // undefined (it's in state!)
window.stateManager.state.ship     // Player ship
window.stateManager.state.planets  // Planet list
window.eventBus                    // Event system
```

## Architecture Rules
1. **NO GLOBALS** - Everything in StateManager
2. **EVENTS ONLY** - Systems communicate via EventBus
3. **SYSTEM ISOLATION** - Each system independent
4. **STATE DRIVEN** - All data in central state

## User Preferences
- Likes brevity and conciseness
- Wants relevant code only (not full hypotheticals)
- Needs pauses between OS operations
- Wants you to ask for access rather than assume limitations

## Common Tasks

### Test Collision System
```javascript
// Force collision test in console:
const state = window.stateManager.state;
if (state.asteroids[0]) {
    state.ship.x = state.asteroids[0].x - 20;
    state.ship.vx = 1; // Ram it!
}
```

### Check Event Flow
```javascript
// Monitor events in console:
window.eventBus.on('*', (data) => console.log('Event:', data));
```

### View System Status
```javascript
window.systems  // Lists all active systems
```

## Next Likely Tasks
- Add more weapon types
- Enhance trading system
- Add space stations
- Implement quest system
- Add faction reputation
- Performance optimizations

## Remember
The game is WORKING. EventBus architecture is PURE. Don't mix old code (main.js) with new (main_eventbus_pure.js).

Good luck! 🚀
