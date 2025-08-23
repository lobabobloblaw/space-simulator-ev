# Session 37 Handoff - Save/Load System Issues

## What Was Accomplished This Session

### 1. Fixed Save/Load State Persistence ✅
- **Problem**: Ship state (credits, health, etc.) would briefly show loaded values then revert to defaults
- **Solution**: Replace entire ship object instead of updating properties individually to break stale references
- **File**: `SaveSystemAdapterFixed.js` v3

### 2. Fixed NPC Restoration ✅
- **Problem**: NPCs were saved but not properly restored when loading
- **Solution**: Fully reconstruct NPCs with all properties including AI state, visual properties, and behavior
- **File**: `SaveSystemAdapterFixed.js` v3

### 3. Fixed NPC Size Preservation ✅
- **Problem**: NPCs were shrinking to ~50% size after save/load (all becoming size 8)
- **Solution**: Save and restore the `size` property, with fallback to correct defaults by type
- **File**: `SaveSystemAdapterFixed.js` v4

## Remaining Issues to Fix

### Issue 1: NPC Colors Not Preserved
**Symptom**: A blue patrol NPC became gray after loading

**Root Cause**: In `SaveSystemAdapterFixed.js` line ~190, the color assignment is wrong:
```javascript
color: npcData.type === 'pirate' ? '#ff4444' : 
       npcData.type === 'trader' ? '#44ff44' : 
       npcData.type === 'police' ? '#4444ff' : '#888888',
```

**Problem**: 
- It checks for `'police'` but the actual type is `'patrol'`
- This causes patrol NPCs to fall through to gray (#888888)

**Correct Color Mapping** (from SpawnSystem.js):
- freighter: "#4488ff" (light blue)
- trader: "#44ff88" (green)
- patrol: "#8888ff" (blue)
- pirate: "#ff4444" (red)

**Fix Needed**:
1. Save the actual `color` property in handleSave()
2. Use correct type-to-color mapping in handleLoad()
3. Consider saving/restoring the color directly rather than deriving it

### Issue 2: NPC Direction/State Not Fully Preserved
**Symptom**: NPCs face different directions after loading

**Root Cause**: While we save basic properties like `angle`, we're not saving AI state variables:
- `patrolAngle` - for patrols doing their patrol pattern
- `wanderAngle` - for pirates wandering
- `desiredAngle` - current AI target angle
- `state` - AI state ('pursuing', 'fleeing', 'patrolling', etc.)
- `target` - current target for AI
- `pursuing` - whether patrol is pursuing
- Other AI decision state

**Fix Needed**:
1. Save more AI state properties in handleSave()
2. Restore these properties in handleLoad()
3. Ensure AI can resume from saved state smoothly

### Issue 3: NPCs Vanishing After Load
**Symptom**: Repeatedly hitting load causes NPCs to appear briefly then vanish

**Possible Causes**:
1. **Dock flag issue**: `readyToDock` might be getting set, causing immediate removal
2. **Distance check**: NPCs might be spawning at wrong coordinates and getting despawned
3. **Lifetime issue**: `lifetime` property might not be reset properly
4. **State conflict**: Multiple rapid loads might create state inconsistencies

**Investigation Needed**:
- Check NPCSystem.shouldRemoveNPC() conditions
- Verify coordinates are correct after load
- Check if any removal flags are being inadvertently set
- Test what happens with rapid successive loads

## Key Files to Review

1. **SaveSystemAdapterFixed.js** - The save/load adapter (main focus)
   - Line ~75: Save NPC data (needs more properties)
   - Line ~165-200: Restore NPC data (needs fixes)

2. **NPCSystem.js** - NPC AI and removal logic
   - Line ~120: shouldRemoveNPC() - conditions for removal
   - Line ~195: makeAIDecision() - AI state management

3. **SpawnSystem.js** - NPC type definitions
   - Line ~20-50: npcTypes configuration with correct colors/sizes

## Testing Steps

### For Color Fix:
```javascript
// In console, check NPC colors before and after save/load
stateManager.state.npcShips.map(n => ({type: n.type, color: n.color}))
```

### For Vanishing NPCs:
```javascript
// Monitor NPC removal
const originalRemove = systems.npc.shouldRemoveNPC;
systems.npc.shouldRemoveNPC = function(npc, ship, state) {
    const result = originalRemove.call(this, npc, ship, state);
    if (result) console.log('Removing NPC:', npc.type, 'because:', {
        readyToDock: npc.readyToDock,
        health: npc.health,
        distance: Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2)
    });
    return result;
}
```

## Quick Fix Attempts

### Fix 1: Color Mapping
```javascript
// In handleLoad(), around line 190
color: npcData.color || (  // Use saved color if available
    npcData.type === 'pirate' ? '#ff4444' : 
    npcData.type === 'trader' ? '#44ff88' :  // Fixed green
    npcData.type === 'patrol' ? '#8888ff' :  // Fixed: patrol not police
    npcData.type === 'freighter' ? '#4488ff' : '#888888'
),
```

### Fix 2: Save More NPC State
```javascript
// In handleSave(), add to NPC mapping:
patrolAngle: npc.patrolAngle,
wanderAngle: npc.wanderAngle,
state: npc.state,
pursuing: npc.pursuing,
target: npc.target ? {x: npc.target.x, y: npc.target.y} : null,
lifetime: 0,  // Always reset to 0
readyToDock: false,  // Never save as ready to dock
```

## Session Summary

**Completed**:
- ✅ Save/load now properly restores ship state
- ✅ NPCs are saved and restored
- ✅ NPC sizes are preserved correctly

**Remaining**:
- ❌ NPC colors revert to gray (patrol type issue)
- ❌ NPC facing/AI state not fully preserved
- ❌ NPCs sometimes vanish after repeated loads

**Next Steps**:
1. Fix the color mapping for patrol NPCs
2. Save/restore complete AI state
3. Debug the vanishing NPC issue with repeated loads
4. Consider adding version migration for save data compatibility