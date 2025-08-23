# PROMPT FOR SESSION 34

Copy and paste this entire message to start the next Claude session:

---

**I'm continuing work on Galaxy Trader, a space trading/combat game that has been refactored to Pure EventBus architecture.**

**First, read these files in order:**
1. `/Users/alexvoigt/Documents/Claude/UNIVERSAL_PRIMER.txt` - Environment setup
2. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_34_START_HERE.md` - Quick mission briefing
3. `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_34_HANDOFF.md` - Detailed verification checklist

**Your Mission:**
The game has been completely refactored from mixed architecture to Pure EventBus pattern. I need you to verify that EVERY feature from the original game (`/docs/index_old_backup.html`) works identically in the refactored version (`/docs/index.html`).

**Current Status:**
- The refactoring is supposedly complete
- Game is deployed at https://lobabobloblaw.github.io/space-simulator-ev/
- Basic gameplay works, but needs comprehensive verification
- Players correctly start without weapons (this was fixed in Session 33)

**Testing Setup:**
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
```
Then open both versions:
- http://localhost:8000/docs/ (Refactored - test this)
- http://localhost:8000/docs/index_old_backup.html (Original - reference)

**Priority:**
1. First, confirm basic gameplay works in both versions
2. Then systematically verify each system using the checklist in SESSION_34_HANDOFF.md
3. Document any discrepancies you find
4. Fix any missing functionality to achieve 100% feature parity

**Key Verification Points:**
- Player starts with 0 weapons (must buy at planet)
- All NPC types behave correctly (pirates attack, traders flee, patrols patrol)
- Trading system generates profit
- All upgrades work (engines, shields, cargo)
- Save/Load preserves complete state
- No functionality is missing from the original

Please begin by confirming you understand the mission and then start with a quick smoke test of both versions to ensure they're running.

---

End of prompt. This will get the next session started with clear objectives and context.
