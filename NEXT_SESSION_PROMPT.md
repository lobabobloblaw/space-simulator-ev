# PROMPT FOR NEXT CLAUDE SESSION

Copy and paste this entire prompt to start your next session:

---

**PROMPT FOR NEXT CLAUDE SESSION:**

I'm developing a space trading/combat game called Galaxy Trader. The game is LIVE at https://lobabobloblaw.github.io/space-simulator-ev/ and the codebase is at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`.

**CRITICAL: Read these files first:**
1. `/QUICK_START_NEXT_SESSION.md` - Essential info
2. `/SESSION_8_HANDOFF.md` - Latest session details

**Key things to know:**
* ALL code lives in `/docs/` folder (GitHub Pages deployment)
* Do NOT use root `/js/` or `/css/` folders - they're outdated/archived
* The save/load system IS working (despite what old docs might say)
* Mobile controls should NOT be added until core game is complete
* I prefer BRIEF, concise responses - don't be verbose

**Project status:**
* Pure JavaScript ES6 modules, no dependencies
* ~3600 lines of working code
* Features: trading, combat, NPCs, missions, save/load, upgrades
* Recent improvements: Terra Nova water rendering, massive starfield (4800 stars), ship explosion effects

**Latest changes (Session 8):**
* Terra Nova has realistic unified ocean with smooth gradients
* Expansive parallax starfield with subtle twinkling
* Ships explode dramatically when destroyed (multiple explosions)
* Pirates drop loot on death

**My preferences (from userPreferences):**
* Keep responses concise and focused
* When using Terminal, continue using the same window (`do script 'command' in front window`)
* Add pauses after OS-level operations
* Ask for access/permissions rather than assuming limitations

**To test locally:**
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# Browse to http://localhost:8000/docs/
```

Please review the handoff documents, confirm you understand the project structure (especially that everything is in `/docs/`), and ask me what I'd like to work on today.

---

END OF PROMPT