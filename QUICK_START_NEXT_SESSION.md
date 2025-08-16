# Quick Start - Next Session

## 🚀 One-Line Summary
**The game works perfectly but all ships look the same (V-shaped) instead of having unique designs like the original.**

## 📋 Copy-Paste This to Start Next Session:

```
I need to restore ship visual diversity in Galaxy Trader. Location: /Users/alexvoigt/Documents/Claude/space-simulator-ev/

Problem: All ships are V-shaped but should have unique designs (freighters=rectangular, pirates=angular, patrol=winged, traders=rounded).

Fix needed in js/main.js render() function. Reference the original space-simulator.html for correct ship designs.

Read SHIP_VISUAL_RESTORATION.md for visual examples of what's wrong.
```

## 🎮 What's Working:
- Game is fully playable
- Combat AI is intelligent  
- Trading/economy works
- Shop/upgrades work
- Graphics effects work (thrust, explosions, parallax)

## 🚢 What's Missing:
- Ship visual variety (ALL SHIPS SAME SHAPE)
- Different ship sizes
- Some UI functions (drawPlanetVisual, showPanel)
- Various polish features from original

## 📁 Files You'll Edit:
1. `js/main.js` - render() function needs ship variety
2. `js/systems/allSystems.js` - has empty stub functions

## ✅ Success = When:
- Freighters look like cargo ships
- Pirates look aggressive
- Patrols look military
- Traders look like transports
- Each type is immediately recognizable

## 🔧 Test With:
```bash
python3 -m http.server 8000
# Open http://localhost:8000
# Compare with original at space-simulator.html
```

Remember: RESTORE features, don't add new ones!