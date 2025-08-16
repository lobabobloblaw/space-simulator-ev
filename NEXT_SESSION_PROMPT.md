# Prompt for Next Claude Session

## Quick Context
You're working on Galaxy Trader, a space trading/combat game that was successfully modularized from a single 3800-line HTML file into ES6 modules. The game is FULLY FUNCTIONAL with combat, trading, and shop systems all working.

## Project Location
```
/Users/alexvoigt/Documents/Claude/space-simulator-ev/
```

## Current State
- ✅ Game runs perfectly at http://localhost:8000
- ✅ NPCs have full AI (pirates attack, patrols defend, traders flee)
- ✅ Trading system works (buy low, sell high between planets)
- ✅ Shop system works (buy weapons, shields, engines, cargo)
- ✅ Combat is engaging with smart enemies
- ✅ Graphics fully restored (parallax stars, thrust effects, glowing planets, etc.)
- ✅ Asteroids can be mined for ore
- ✅ Pickups system working (ore and credits)
- 📄 See `SESSION_4_HANDOFF.md` for complete details

## Key Files
- `index.html` - The modular version (what we're working on)
- `space-simulator.html` - Original reference (DO NOT MODIFY)
- `js/systems/allSystems.js` - Contains most game logic

## How to Run
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# Open http://localhost:8000
```

## Potential Tasks (Choose One)

### Option A: Polish & UX
- Implement remaining UI stubs (`showPanel()`, `drawPlanetVisual()`)
- Add visual effects (better explosions, engine trails)
- Improve HUD with more information
- Add keyboard shortcuts for trading

### Option B: Content Expansion
- Add more weapons (missiles, mines, beams)
- Create new planet types with unique characteristics
- Expand mission system with story missions
- Add random events during travel

### Option C: Core Features
- Implement save/load system using localStorage
- Add faction reputation system
- Create ship upgrade tree
- Add hyperspace jump between sectors

### Option D: Game Balance
- Tune NPC difficulty and spawn rates
- Balance economy (prices, rewards)
- Adjust weapon damage and ship health
- Create difficulty settings

## Testing Checklist
When testing changes:
1. Can player still trade commodities?
2. Do NPCs behave intelligently?
3. Can player purchase upgrades?
4. Does combat feel balanced?
5. No console errors?

The game is stable and playable. Pick any direction you'd like to take it!