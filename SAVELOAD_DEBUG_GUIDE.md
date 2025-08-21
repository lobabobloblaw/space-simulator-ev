# Save/Load System Analysis - Issues and Solutions

## Current SaveSystemAdapterFixed.js v4 Issues

### 1. COLOR BUG - Line 189-191
```javascript
// CURRENT (WRONG):
color: npcData.type === 'pirate' ? '#ff4444' : 
       npcData.type === 'trader' ? '#44ff44' : 
       npcData.type === 'police' ? '#4444ff' : '#888888',

// SHOULD BE:
color: npcData.color || (  // Use saved color first
    npcData.type === 'pirate' ? '#ff4444' : 
    npcData.type === 'trader' ? '#44ff88' :    // Green, not #44ff44
    npcData.type === 'patrol' ? '#8888ff' :    // 'patrol' not 'police'!
    npcData.type === 'freighter' ? '#4488ff' : // Add freighter
    '#888888'  // Default gray
),
```

### 2. MISSING NPC PROPERTIES IN SAVE - Line 74-91
Currently saves:
- Position (x, y, vx, vy, angle)
- Type, size, health
- Behavior, credits, cargo, weapons
- Faction, personality, homeStation

**MISSING** (causes direction/state issues):
- `color` - Visual color
- `patrolAngle` - Patrol pattern angle
- `wanderAngle` - Wander pattern angle  
- `patrolCenter` - Patrol center point
- `patrolRadius` - Patrol radius
- `patrolSpeed` - Patrol speed
- `patrolDirection` - Patrol direction
- `targetPlanet` - For traders
- `state` - AI state (pursuing, fleeing, etc.)
- `pursuing` - Is patrol pursuing?
- `target` - Current AI target
- `isFleeing` - Fleeing state
- `thrusting` - Visual thrust state

### 3. PROPERTIES THAT SHOULD BE RESET ON LOAD
These should always be reset to prevent issues:
- `lifetime: 0` - Reset to prevent age-based removal
- `readyToDock: false` - Prevent instant removal
- `weaponCooldown: 0` - Reset weapon state
- `lastScan: 0` - Reset AI scan timer
- `messageTime: null` - Clear old messages
- `message: null` - Clear old messages

### 4. NPC VANISHING ISSUE
NPCs vanish because `NPCSystem.shouldRemoveNPC()` checks:
1. `readyToDock === true` → Instant removal
2. `health <= 0` → Dead
3. `distance > 3000` → Too far

**Likely cause**: After loading, one of these conditions is met:
- `readyToDock` is being carried over from save
- Position is wrong causing distance check to fail
- State conflict from rapid loads

## Recommended Fix Order

### Quick Fix #1: Color (1 minute)
Change line 189-191 to use correct type mapping

### Quick Fix #2: Reset Flags (2 minutes)
After creating NPC in handleLoad(), add:
```javascript
npc.lifetime = 0;
npc.readyToDock = false;
npc.weaponCooldown = 0;
```

### Medium Fix #3: Save AI State (5 minutes)
Add AI state properties to save/load

### Debug Fix #4: Vanishing NPCs (10 minutes)
Add logging to find why NPCs are removed:
```javascript
if (npc.readyToDock) console.log('NPC ready to dock!');
if (distFromPlayer > 3000) console.log('NPC too far:', distFromPlayer);
```

## Test Commands for Next Session

```javascript
// Test 1: Check NPC colors
const checkColors = () => {
    const npcs = stateManager.state.npcShips;
    console.table(npcs.map(n => ({
        type: n.type,
        color: n.color,
        expectedColor: {
            pirate: '#ff4444',
            trader: '#44ff88', 
            patrol: '#8888ff',
            freighter: '#4488ff'
        }[n.type]
    })));
};

// Test 2: Check removal conditions
const checkRemoval = () => {
    const ship = stateManager.state.ship;
    const npcs = stateManager.state.npcShips;
    console.table(npcs.map(n => ({
        type: n.type,
        readyToDock: n.readyToDock,
        health: n.health,
        distance: Math.sqrt((n.x - ship.x) ** 2 + (n.y - ship.y) ** 2),
        willRemove: n.readyToDock || n.health <= 0 || 
                    Math.sqrt((n.x - ship.x) ** 2 + (n.y - ship.y) ** 2) > 3000
    })));
};

// Test 3: Save/Load cycle
const testSaveLoad = () => {
    console.log('Before:', stateManager.state.npcShips.length, 'NPCs');
    eventBus.emit(GameEvents.GAME_SAVE);
    setTimeout(() => {
        eventBus.emit(GameEvents.GAME_LOAD);
        setTimeout(() => {
            console.log('After:', stateManager.state.npcShips.length, 'NPCs');
            checkColors();
            checkRemoval();
        }, 1000);
    }, 500);
};
```

## File Locations
- Main issue: `/docs/js/systems/SaveSystemAdapterFixed.js`
- NPC removal logic: `/docs/js/systems/NPCSystem.js` line 120
- NPC type definitions: `/docs/js/systems/SpawnSystem.js` line 20-50
- Color definitions: SpawnSystem.js lines 24, 32, 40, 48