# NPC Size Preservation Fix

## Problem
When saving and loading a game, NPCs were shrinking to approximately 50% of their original size. This was because:

1. Different NPC types have different sizes:
   - Freighter: 18 pixels
   - Trader: 12 pixels  
   - Patrol: 14 pixels
   - Pirate: 10 pixels

2. The save/load system was not preserving these sizes:
   - The `size` property was not being saved
   - When loading, all NPCs were hard-coded to size 8

## Solution
Modified `SaveSystemAdapterFixed.js` (Version 4):

1. **Save NPC sizes**: Added `size: npc.size` to the saved NPC data
2. **Restore correct sizes**: When loading, use the saved size or fall back to the correct default based on NPC type
3. **Added helper method**: `getNPCDefaultSize(type)` returns the correct default size for each NPC type

## Technical Details

### Changes Made:
```javascript
// In handleSave() - now saves the size property
npcs: state.npcShips.map(npc => ({
    // ... other properties ...
    size: npc.size,  // Added this line
    // ... rest of properties ...
}))

// In handleLoad() - restores the correct size
size: npcData.size || this.getNPCDefaultSize(npcData.type),

// New helper method
getNPCDefaultSize(type) {
    const sizes = {
        freighter: 18,
        trader: 12,
        patrol: 14,
        pirate: 10
    };
    return sizes[type] || 12;
}
```

## Backwards Compatibility
The fix is backwards compatible with older saves:
- If a save has the `size` property, it will be used
- If not (older saves), the correct default size is determined from the NPC type
- Unknown NPC types default to size 12

## Testing
1. Start the game with NPCs visible
2. Note the different sizes (freighters are large, pirates are small)
3. Press 'S' to save
4. Press 'O' to load
5. NPCs should maintain their correct sizes

## Version
SaveSystemAdapterFixed v4 - NPC size preservation