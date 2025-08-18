# Starting Prompt for Next Session

Copy and paste this entire prompt to start your next Claude session:

---

I'm working on Galaxy Trader, a space trading/combat game. The game is LIVE at https://lobabobloblaw.github.io/space-simulator-ev/ and the codebase is at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`.

We're doing a major refactor to break up monolithic files into a modular architecture. Currently 50% complete (4 of 8 systems migrated). The game is WORKING and must remain playable during the entire refactor.

**CRITICAL: Read these files first in this order:**
1. `/Users/alexvoigt/Documents/Claude/UNIVERSAL_PRIMER.txt` - Environment setup and tool preferences
2. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/QUICK_REFERENCE.md` - Current state summary
3. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_18_HANDOFF.md` - Last session details

**Current Status:**
- Game is ✅ FULLY PLAYABLE at http://localhost:8000/docs/
- 50% refactored (InputSystem, PhysicsSystem, RenderSystem, SaveSystem done)
- 50% remaining (AudioSystem, UISystem, WeaponSystem, SpawnSystem)
- All initialization bugs were fixed in Session 18

**Your Task: Extract AudioSystem**
The next system to migrate is AudioSystem. It's currently in `/docs/js/systems/allSystems.js` lines 4-150.

1. Extract it to `/docs/js/systems/AudioSystem.js`
2. Follow the same pattern as InputSystem.js and PhysicsSystem.js
3. Update the diagnostic to import and check for AudioSystem
4. Test that the game still works after extraction
5. Progress should reach 62.5% (5 of 8 systems)

**Testing:**
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
open http://localhost:8000/docs/
```

Then click "NEW GAME" and press W to verify ship moves.

**Important Requirements:**
- Game MUST remain playable at all times
- Test after every change
- Use the EventBus/StateManager pattern
- AudioSystem should work alongside old code via MigrationBridge
- The game uses ES6 modules, so exports/imports are required

Check `/docs/diagnostic.html` to verify migration progress.

Current architecture uses:
- EventBus for communication between systems
- StateManager for shared state
- MigrationBridge to coordinate old and new code
- Each system has init(), update(), and destroy() methods

Begin by reading the three documentation files listed above, then proceed with extracting the AudioSystem.