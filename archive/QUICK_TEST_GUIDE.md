# Quick Verification Script for Session 34

## Start Here
```bash
# 1. Navigate to project
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev

# 2. Start local server
python3 -m http.server 8000

# 3. Open both versions in Chrome
open http://localhost:8000/docs/                      # Refactored (test this)
open http://localhost:8000/docs/index_old_backup.html # Original (reference)
```

## Key Files to Examine if Issues Found

### Core Game Files
- `docs/js/main_eventbus_pure.js` - Line 64: weapons should be empty array []
- `docs/js/main.js` - Original version (for comparison)
- `docs/js/EventBus.js` - Event system (should be clean, no memory leaks)

### Critical Values to Verify
```javascript
// In main_eventbus_pure.js (around line 64)
player: {
    weapons: [],        // MUST be empty array
    thrust: 0.012,      // Fast acceleration
    maxSpeed: 0.8,      // Good top speed
    turnSpeed: 0.025    // Responsive turning
}
```

### Console Commands for Testing
```javascript
// Paste these in browser console to check state:

// Check player weapons (should be 0 at start)
gameState.player.weapons.length

// Check player speed values
console.log('Thrust:', gameState.player.thrust, 'Max:', gameState.player.maxSpeed)

// Check EventBus listeners (shouldn't grow infinitely)
EventBus._events

// Force spawn enemies for combat testing
EventBus.emit('npc:spawn', {type: 'pirate'})

// Give yourself credits for testing upgrades
gameState.player.credits = 5000
EventBus.emit('ui:update')
```

## Most Important Tests
1. **Start without weapons** - Must buy first weapon at planet
2. **NPC AI works** - Pirates attack, traders flee, patrols patrol
3. **Trading profits** - Buy low, sell high actually works
4. **Upgrades apply** - Engines make you faster, shields protect
5. **Save/Load works** - Game state persists correctly

## If Something Is Broken
1. Compare behavior with original at `/docs/index_old_backup.html`
2. Check browser console for errors
3. Review the specific system file in `/docs/js/systems/`
4. Verify EventBus events are firing (add console.logs to debug)

Remember: The refactored version should feel IDENTICAL to play, just with cleaner code architecture.
