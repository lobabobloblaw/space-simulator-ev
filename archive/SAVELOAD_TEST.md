# Save/Load System Test Instructions

## Quick Test Script
After starting the game, paste this in the browser console:

```javascript
// Test Save/Load System
console.log('Testing Save/Load...');

// 1. Set test values
stateManager.state.ship.credits = 9999;
stateManager.state.ship.kills = 77;
console.log('Set credits to 9999, kills to 77');

// 2. Save the game (press S key)
console.log('Press S to save...');

// 3. After saving, change the values
// Then press O to load and check if 9999 returns

// Alternative: Use events directly
eventBus.emit(GameEvents.GAME_SAVE);
setTimeout(() => {
    // Change values
    stateManager.state.ship.credits = 100;
    // Load saved game
    eventBus.emit(GameEvents.GAME_LOAD);
    // Check results
    setTimeout(() => {
        console.log('Credits after load:', stateManager.state.ship.credits);
        console.log('Should be 9999');
    }, 1000);
}, 1000);
```

## What Was Fixed

1. **NPCs now properly save and restore** - The save system now captures all NPC properties and restores them correctly when loading.

2. **State persistence** - The ship object is now completely replaced when loading to ensure the game loop picks up the new reference.

3. **Multiple UI updates** - The system now schedules multiple UI updates after loading to ensure the values persist through the game loop cycles.

## Success Criteria
- After loading, credits should show the saved value (not default 250)
- NPCs should be restored to their saved positions
- All ship stats (health, fuel, kills) should restore correctly
- The UI should display the correct values and not revert

## Files Modified
- `/docs/js/systems/SaveSystemAdapterFixed.js` - Version 3 with NPC restoration and state replacement