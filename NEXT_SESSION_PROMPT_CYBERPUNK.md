# NEXT SESSION PROMPT FOR CLAUDE

Copy and paste this entire prompt to start your next session:

---

**I need help continuing development on my space trading game Galaxy Trader.**

## Project Info
* **Local path**: `/Users/alexvoigt/Documents/Claude/space-simulator-ev`
* **Live game**: https://lobabobloblaw.github.io/space-simulator-ev/
* **GitHub**: https://github.com/lobabobloblaw/space-simulator-ev
* **Deployment**: GitHub Pages from `/docs` folder

## Current State
The game is fully functional with a **newly redesigned cyberpunk minimalist UI** (just completed):
* Clean monochrome design with cyan (#00ffff) accent color
* JetBrains Mono + Orbitron fonts
* Unified notification system
* All UI elements properly spaced (HUD: 110px height)
* Save/Load system working
* Combat, trading, missions all functional

## Technical Requirements
1. **ES6 imports MUST be at top of files**
2. **Use relative paths (./js/ not /js/)**
3. **Canvas height = window.innerHeight - 150**
4. **Test locally**: `cd docs && python3 -m http.server 8000`
5. **Deploy**: `git add . && git commit -m "message" && git push`

## Session Handoff
Check `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_HANDOFF_CYBERPUNK.md` for complete details about the UI redesign and current state.

## My Preferences
- Be concise and brief
- Use existing Terminal windows (`do script 'command' in front window`)
- Add pauses between OS operations
- Ask me about operations that could help

## What I Want to Work On Next
[Choose one or I'll pick]:
* Complete mobile touch controls (partially started in touchControls.js)
* Add multiple save slots
* Implement faction reputation system
* Add more planets and star systems
* Create new weapon types
* Add procedural universe generation
* Implement quest chains
* Add ship customization
* Improve trading system
* [Your suggestion]

Please help me implement [YOUR CHOICE].

---

*Note: The game just had a complete UI overhaul to cyberpunk style. All features work but the UI is the newest change.*