# Next Session Prompt - Galaxy Trader Restoration

## Copy This Prompt for Next Claude Session:

---

I'm working on Galaxy Trader, a space combat/trading game that was modularized from a single HTML file. The modular version works but is MISSING visual features from the original.

**Project location**: `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`

**CRITICAL ISSUE**: All ships currently look the same (V-shaped) but the original had unique designs for each ship type (freighter, pirate, patrol, trader). This needs to be restored.

**Your priorities**:
1. Restore unique ship designs for each type (check original `space-simulator.html` lines 2600-2800)
2. Fix ship sizes (freighters should be 2-3x larger than fighters)
3. Implement `drawPlanetVisual()` function (currently empty)
4. Complete `showPanel()` function for landing interface

**Key files**:
- `space-simulator.html` - Original reference (DO NOT MODIFY)
- `index.html` - Current modular version
- `js/main.js` - Has render() function with ship drawing code
- `js/systems/allSystems.js` - Has stub functions

**Testing**:
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev/
python3 -m http.server 8000
# Open http://localhost:8000
```

**Rules**:
- RESTORE original features only - no new features
- Compare frequently with original `space-simulator.html`
- Ships must look visually distinct
- Test everything against the original

Read `SESSION_5_HANDOFF.md` for complete details. The goal is 100% visual parity with the original game.

What would you like to tackle first?

---

## Additional Context for You:

The previous session successfully restored:
- ✅ NPC Combat AI (pirates hunt, patrols defend)
- ✅ Trading System (buy/sell commodities)
- ✅ Shop System (purchase upgrades)
- ✅ Visual Effects (parallax stars, explosions, thrust flames)
- ✅ Mining & Pickups

But we discovered that while the gameplay works perfectly, the visual diversity is missing. Every ship type uses the same V-shaped design, just with different colors. The original game had distinct ship shapes that made each type immediately recognizable.

The next session should focus on restoration, not innovation. The modular architecture is good, but we need to ensure nothing was lost in translation from the original.