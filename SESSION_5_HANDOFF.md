# Session 5 Handoff - Galaxy Trader Restoration Focus
**Date**: Current Session  
**Previous Session**: Restored NPC AI, Trading, Shop, and Visual Effects
**Critical Focus**: RESTORE original game features before adding anything new

## ⚠️ IMPORTANT: Restoration Priority
The game was modularized from a single 3800-line HTML file (`space-simulator.html`). While the core gameplay works, several visual and functional features from the original are still missing or simplified. **Priority is RESTORATION, not innovation.**

## 🚢 CRITICAL ISSUE: Ship Visual Diversity

### Current Problem:
ALL ships currently use the same V-shaped design, just with different colors. This is NOT how the original worked.

### Original Ship Designs (need restoration):
Looking at the original `space-simulator.html`, each ship class should have UNIQUE shapes:

1. **Player Shuttle** - Sleek arrow design
2. **Freighter** - Large rectangular cargo vessel with visible cargo pods
3. **Trader** - Medium rounded transport ship  
4. **Pirate Fighter** - Sharp angular attack craft
5. **Patrol Interceptor** - Military-style with wing extensions

### Where to Fix:
- **File**: `js/main.js` 
- **Function**: `render()` function (lines ~250-650)
- **Current Code**: All ships use same shape with `ctx.moveTo()` and `ctx.lineTo()`
- **Reference**: Check `space-simulator.html` lines 2600-2800 for original ship rendering

## 📋 Complete Restoration Checklist

### Visual Features Still Missing:
- [ ] **Different ship shapes** for each NPC type (HIGHEST PRIORITY)
- [ ] **Ship size variations** - freighters should be 2-3x larger than fighters
- [ ] **Planet visual in landing overlay** - `drawPlanetVisual()` is empty
- [ ] **Nebula/dust clouds** - original had background nebula effects
- [ ] **Warp/hyperspace effects** - when traveling between distant areas
- [ ] **Damage smoke trails** - damaged ships should trail smoke
- [ ] **Laser beam weapons** - some weapons were beams, not projectiles
- [ ] **Formation flying** - patrol ships flew in formation

### Functional Features Still Missing:
- [ ] **showPanel()** function - panel switching logic incomplete
- [ ] **Faction reputation** - original tracked reputation with different groups
- [ ] **Black market** - certain planets had illegal goods
- [ ] **Distress signals** - random events with traders under attack
- [ ] **Escort missions** - hire out as protection
- [ ] **Bounty board** - specific pirate targets with rewards
- [ ] **News system** - galactic news affected prices/events
- [ ] **Ship scanning** - scan other ships to see cargo/weapons

### UI/UX Features Missing:
- [ ] **Radar range indicator** - circle showing detection range
- [ ] **Target lock indicator** - shows locked enemy
- [ ] **Speed indicator lines** - motion blur when at high speed
- [ ] **Damage direction indicator** - shows where damage came from
- [ ] **Trade route overlay** - shows profitable routes on map
- [ ] **Weapon charge bar** - for plasma weapons
- [ ] **Jump drive charge** - for hyperspace

## 🎯 Session 5 Priority Tasks

### Task 1: Restore Ship Visual Diversity (CRITICAL)
Each ship type needs its unique visual design restored:

```javascript
// Example structure needed in render():
if (npc.type === 'freighter') {
    // Large rectangular cargo vessel
    // Should be 2-3x size of fighters
    // Visible cargo containers
} else if (npc.type === 'pirate') {
    // Sharp, angular design
    // Red accents
    // Weapon pods visible
} else if (npc.type === 'patrol') {
    // Military design with wings
    // Blue/white color scheme
    // Larger than pirates
} else if (npc.type === 'trader') {
    // Rounded merchant vessel
    // Medium size
    // Cargo bay doors
}
```

### Task 2: Implement drawPlanetVisual()
The planet rendering in landing overlay needs implementation:
- File: `js/systems/allSystems.js`
- Should render rotating 3D-looking planet in landing screen
- Use the planetCanvas context
- Reference original for shading/atmosphere effects

### Task 3: Complete showPanel() 
Panel switching logic for landing interface:
- File: `js/systems/allSystems.js`
- Handle transitions between landing/trading/shop panels
- Manage panel state properly

### Task 4: Add Ship Size Variations
Ships should have proper size relationships:
- Freighters: size 20-25
- Patrol ships: size 15-18  
- Pirates: size 10-12
- Traders: size 12-14
- Player: size 8-10

## 📁 Key Files Reference

```
/Users/alexvoigt/Documents/Claude/space-simulator-ev/
├── space-simulator.html    # ORIGINAL - Use as reference (DO NOT MODIFY)
├── index.html              # Current modular version
├── js/
│   ├── main.js            # Rendering code - NEEDS SHIP VARIETY
│   └── systems/
│       └── allSystems.js  # Game logic - has empty stubs
```

## 🔍 How to Verify Original Features

1. Open `space-simulator.html` in browser
2. Play for 5 minutes
3. Note ALL visual differences:
   - Ship shapes and sizes
   - Visual effects
   - UI elements
   - Planet details
4. Cross-reference with modular version
5. Restore missing features

## ⚙️ Testing Commands

```bash
# Compare both versions side-by-side
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev

# Terminal 1 - Original
python3 -m http.server 8001
# Open http://localhost:8001/space-simulator.html

# Terminal 2 - Modular  
python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

## 📊 Current State Summary

### ✅ Working:
- NPC AI (complex behaviors)
- Trading system  
- Shop/upgrades
- Combat mechanics
- Visual effects (particles, parallax)
- Audio system
- Mining/pickups

### ❌ Missing/Simplified:
- Ship visual variety (ALL SHIPS LOOK SAME)
- Ship size differences
- Planet visual in landing
- Many UI polish features
- Advanced gameplay features

## 🎮 Success Criteria for Session 5

1. **Ships look different** - Each type has unique shape
2. **Sizes are correct** - Freighters are huge, fighters are small
3. **Planet visual works** - Shows in landing overlay
4. **All panels work** - Can switch between trading/shop/landing
5. **NO NEW FEATURES** - Only restore what existed

## 💡 Important Notes

- The original `space-simulator.html` is the TRUTH SOURCE
- If something exists in original but not in modular, it needs restoration
- Don't add "cool new features" until ALL original features are restored
- Test frequently against the original
- Visual fidelity matters - the game should LOOK like the original

## 🚨 Common Pitfalls to Avoid

1. **Don't assume** the modular version has everything
2. **Don't skip** "small" visual details - they matter
3. **Don't refactor** working code while restoring features
4. **Don't add** new features until restoration is complete
5. **Don't modify** space-simulator.html - it's the reference

---

Remember: The goal is to achieve 100% feature parity with the original game before any improvements or new features are added. The modular version should be indistinguishable from the original in terms of gameplay and visuals.