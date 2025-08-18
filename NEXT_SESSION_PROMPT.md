# Starting Prompt for Next Session

Copy and paste this entire prompt to start your next Claude session:

---

I'm working on Galaxy Trader, a space trading/combat game that just completed a major architectural migration to EventBus. The game is LIVE at https://lobabobloblaw.github.io/space-simulator-ev/ and the codebase is at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`.

The EventBus architecture is COMPLETE but has a deployment issue. The game currently runs on the old stable architecture while we have a fully functional EventBus system ready to deploy.

**IMPORTANT: Read these files first (in this exact order):**
1. `/Users/alexvoigt/Documents/Claude/UNIVERSAL_PRIMER.txt` - Environment setup
2. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/QUICK_REFERENCE.md` - Current state
3. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_26_HANDOFF.md` - Detailed handoff

**Current Status:**
- ✅ Game is FULLY PLAYABLE at http://localhost:8000/docs/
- ✅ EventBus architecture 100% complete (all 8 systems converted)
- ✅ Pure StateManager implementation done (no window globals)
- ⚠️ Module loading issue prevents deployment of pure EventBus
- ✅ Hybrid approach (EventBus + globals) works perfectly

**The Issue:**
`main_eventbus_pure.js` won't initialize when loaded as ES6 module. Likely cause is SaveSystem import case sensitivity (`saveSystem.js` vs `SaveSystem.js`).

**Your Task - Choose One:**

**Option A: Fix Pure EventBus (Recommended)**
1. Fix SaveSystem import in `/docs/js/main_eventbus_pure.js`
2. Change line 17: `import { SaveSystem } from './systems/SaveSystem.js';`
3. Test that the game loads and works
4. Commit if successful

**Option B: Deploy Hybrid Approach**
1. Edit `/docs/js/main_eventbus.js`
2. Add window global bridging after state initialization
3. This approach is proven to work (see eventbus-working.html)
4. Deploy to production

**Option C: Debug Module Loading**
1. Check why main_eventbus_pure.js doesn't initialize
2. Look for import chain failures
3. Consider inline initialization approach

**Testing:**
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
open http://localhost:8000/docs/
```

Click "NEW GAME" if you see a save dialog, then press W to verify the ship moves.

**Important Notes:**
- The EventBus architecture is COMPLETE - don't re-implement anything
- PhysicsSystem and RenderSystem already use pure StateManager
- The game must remain playable during all changes
- Test after every modification

The goal is to get the pure EventBus architecture deployed, but the hybrid approach is an acceptable fallback if needed.

---