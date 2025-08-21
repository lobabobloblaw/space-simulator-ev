# PROMPT FOR NEXT SESSION - Galaxy Trader

Copy and paste this entire prompt to start your next session:

---

I'm working on Galaxy Trader, a 2D space trading game built with pure EventBus architecture. The project is located at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/` on my Mac.

## Current Status
The game is FULLY FUNCTIONAL. In the last session (39), we restored asteroid collision effects including damage, screen shake, and visual feedback. Everything works correctly.

## Critical Information
- **ACTIVE FILE:** The game uses `main_eventbus_pure.js` (NOT main.js!)
- **ARCHITECTURE:** Pure EventBus - no global variables, all state in StateManager
- **TO RUN:** `cd /Users/alexvoigt/Documents/Claude/space-simulator-ev && python3 -m http.server 8000` then open `http://localhost:8000/docs/`

## Quick Orientation
Read these files first:
1. `SESSION_40_QUICK_START.md` - Immediate context
2. `SESSION_39_HANDOFF.md` - Detailed last session info
3. `SESSION_SUMMARY.md` - Overall project status

## Architecture Rules (IMPORTANT)
1. NO GLOBAL VARIABLES - Everything must be in StateManager
2. EVENTS ONLY - Systems communicate only via EventBus, never directly
3. Use the existing event system, don't create new patterns
4. The game uses relative imports (`../core/`, `./`) not absolute

## Current Features Working
- Ship movement, combat, shields
- Asteroid collisions with damage/effects
- NPC AI with different personalities
- Trading system with multiple planets
- Save/Load (F5/F9 keys)
- All graphics rendering correctly

## My Preferences
- Be concise and focus on relevant code only
- Don't show full hypothetical implementations
- Build in pauses between OS-level operations
- Ask for permission rather than assuming limitations

## Potential Tasks (choose based on what I ask for)
1. Add new weapon types
2. Implement space stations
3. Add faction/reputation system
4. Create quest chains
5. Performance optimizations
6. Add multiplayer support
7. Or debug any issues I mention

## Testing Commands
```javascript
// Browser console commands:
window.stateManager.state  // View game state
window.eventBus            // Event system
window.systems             // All game systems

// Test collision effects:
const state = window.stateManager.state;
state.ship.x = state.asteroids[0].x - 20;
state.ship.vx = 1; // Ram asteroid
```

## If I Report Issues

### "No graphics showing"
- Have me clear save data: Press F12 twice, then reload

### "Collisions not working"  
- They should be! Check PhysicsSystem.js for damage calculation
- Look for screen shake and red flash on impact

### "Which file is running?"
- Confirm index.html loads `main_eventbus_pure.js`
- Old `main.js` should NOT be used

## Key File Locations
```
/docs/js/main_eventbus_pure.js     - Main entry (ACTIVE)
/docs/js/systems/PhysicsSystem.js  - Collision handling
/docs/js/systems/RenderSystem.js   - Graphics & effects
/docs/js/systems/NPCSystem.js      - NPC AI
/docs/js/core/EventBus.js          - Event system
/docs/js/core/StateManager.js      - Central state
```

Please start by asking me what I'd like to work on today, or if I'm experiencing any issues with the game.

---

END OF PROMPT - Copy everything above this line