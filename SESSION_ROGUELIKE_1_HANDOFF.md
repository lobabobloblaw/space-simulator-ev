# Session Handoff — Roguelike Transformation Session 1 (Foundation)

## Summary
Created the foundational systems for transforming Galaxy Trader into a roguelike with meta-progression. Built MetaStateManager for permanent unlocks, zones.js for zone progression data, and RunSystem for run lifecycle management.

## Vision Recap
Transform Galaxy Trader from an Escape Velocity clone into a unique roguelike:
- **Full Permadeath**: Death ends run, lose all in-run progress
- **Meta-Progression**: Ship unlocks + upgrade pool unlocks persist across runs
- **Boss Victory**: Defeat "The Void King" to win a run
- **4 Zone Progression**: Core → Frontier → Outer Rim → The Void
- **EV Tribute**: "Inspired by Escape Velocity" in credits

## Files Created

| File | Purpose |
|------|---------|
| `docs/js/core/MetaStateManager.js` | Permanent progression storage (ships, upgrades, stats) |
| `docs/js/data/zones.js` | Zone definitions + boss data |
| `docs/js/systems/RunSystem.js` | Run lifecycle (start, end, zone advancement) |

## Architecture Overview

### MetaStateManager
- Stores permanent unlocks in `localStorage['galaxyTraderMeta']`
- Tracks: unlocked ships, unlocked upgrades, achievements, lifetime stats
- Singleton pattern via `getMetaStateManager()`

### RunSystem
- Manages current run in `localStorage['galaxyTraderRun']`
- Handles: `startNewRun(shipId)`, `endRun(reason)`, `advanceZone()`
- Tracks: kills, credits earned, zones visited, bosses defeated
- Emits events: `RUN_START`, `RUN_END`, `RUN_VICTORY`, `ZONE_CHANGE`

### Zone Data
4 zones with escalating difficulty:
1. **Core Systems** (difficulty 1.0) - Pirates + Traders + Patrols
2. **Frontier Space** (difficulty 1.5) - More pirates, some elites
3. **Outer Rim** (difficulty 2.0) - Boss: Captain Blackstar
4. **The Void** (difficulty 3.0) - Final Boss: The Void King

## Next Session Tasks

### Priority 1: UI Layer
1. Add main menu HTML overlay to `docs/index.html`
2. Create `docs/js/ui/MainMenuUI.js` (ship selection, start button)
3. Create `docs/js/ui/DeathScreenUI.js` (run summary, retry button)

### Priority 2: Integration
4. Modify `docs/js/main_eventbus_pure.js`:
   - Initialize RunSystem and MetaStateManager
   - Show main menu before game starts
   - Replace SHIP_DEATH respawn with `runSystem.endRun('death')`
   - Wire up death screen display

### Priority 3: Boss System
5. Add boss NPC type to `docs/js/systems/NPCSystem.js`
6. Add boss spawning logic to `docs/js/systems/SpawnSystem.js`
7. Add boss health bar to HUD

## Integration Points

When integrating with main_eventbus_pure.js, add these imports:
```javascript
import { getMetaStateManager } from './core/MetaStateManager.js';
import { getRunSystem, RunEvents } from './systems/RunSystem.js';
```

Initialize early in the boot sequence:
```javascript
const metaManager = getMetaStateManager();
const runSystem = getRunSystem();
runSystem.init();
```

Replace the SHIP_DEATH handler (currently around line 357):
```javascript
// OLD: Respawn with penalty
// NEW: End run (permadeath)
eventBus.on(GameEvents.SHIP_DEATH, () => {
    runSystem.endRun('death');
    // Show death screen (next session implements this)
});
```

## Testing (Next Session)

After integration, test this flow:
1. Game loads → Main menu shows
2. Select ship → Click "BEGIN RUN"
3. Game starts in Core Systems zone
4. Get killed → Death screen shows
5. Click "TRY AGAIN" → New run starts
6. Refresh page → Can resume run OR start new
7. Kill enough enemies → Can advance to Frontier

## Plan Reference
Full plan: `~/.claude/plans/snazzy-floating-feather.md`

## Verification
All new files pass syntax check:
```bash
node --check docs/js/core/MetaStateManager.js  # OK
node --check docs/js/data/zones.js             # OK
node --check docs/js/systems/RunSystem.js      # OK
```
