# NEXT CLAUDE SESSION - GALAXY TRADER

Copy this entire prompt to start your next session:

---

**I need help continuing development on my space trading game Galaxy Trader.**

## Project Info
* **Local path**: `/Users/alexvoigt/Documents/Claude/space-simulator-ev`
* **Live game**: https://lobabobloblaw.github.io/space-simulator-ev/ ✅ (Cyberpunk UI is live!)
* **GitHub**: https://github.com/lobabobloblaw/space-simulator-ev
* **Deployment**: GitHub Pages from `/docs` folder

## Current State - FULLY WORKING
The game has a **newly deployed cyberpunk minimalist UI** with:
* ✅ Monochrome design with cyan (#00ffff) accent
* ✅ JetBrains Mono + Orbitron fonts
* ✅ All UI spacing issues fixed (HUD: 110px)
* ✅ Unified notification system
* ✅ Save/Load system (S/O keys)
* ✅ Combat, trading, missions all functional

## Technical Stack
* Pure JavaScript with ES6 modules (no frameworks)
* Canvas-based rendering
* Modular architecture in `js/systems/`
* localStorage for saves
* GitHub Pages deployment

## Critical Technical Info
1. **ES6 imports** MUST be at top of files
2. **Use relative paths** (./js/ not /js/)
3. **Canvas height** = `window.innerHeight - 150`
4. **HUD height** = 110px with 20px bottom margin
5. **Test locally**: `cd docs && python3 -m http.server 8000`
6. **Deploy**: `git add -A && git commit -m "message" && git push origin main`
7. **IMPORTANT**: Use separate Terminal tabs for Python server and git commands!

## My Preferences
- **Be concise** - I prefer brevity
- **Terminal usage** - Use `do script 'command' in front window` for existing terminals
- **Add pauses** between OS operations
- **Ask me** about operations that could help

## Session Handoff
Check `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_HANDOFF_FINAL.md` for complete technical details.

## What Needs Work

### 🔴 High Priority - Incomplete Feature
**Mobile Touch Controls** - File exists at `/docs/js/systems/touchControls.js` but only has empty class structure. Needs:
- Virtual joystick for movement
- Touch buttons for actions (fire, land, etc.)
- Mobile detection and UI adjustments

### 🟡 Medium Priority - Natural Expansions
1. **Multiple Save Slots** - Expand single save to slot system
2. **Faction Reputation** - Make NPC reactions dynamic
3. **More Star Systems** - Add jump gates between systems
4. **New Weapons** - Missiles, beams, mines

### 🟢 Low Priority - Big Features
1. **Procedural Universe** - Infinite exploration
2. **Quest Chains** - Branching storylines
3. **Ship Customization** - Visual upgrades
4. **Multiplayer** - Network play

## What would you like to work on?
[I recommend completing **mobile touch controls** since the file is started, or pick something else]

---

*Game is live and working with cyberpunk UI! Ready to add new features.*