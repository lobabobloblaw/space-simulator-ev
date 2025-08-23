# GALAXY TRADER - QUICK REFERENCE

## 🎮 Game URLs
- **Production**: http://localhost:8000/docs/
- **GitHub Pages**: https://lobabobloblaw.github.io/space-simulator-ev/
- **Original Backup**: http://localhost:8000/docs/index_old_backup.html

## 📁 Project Structure
```
/Users/alexvoigt/Documents/Claude/space-simulator-ev/
├── docs/                       # Game files (served via GitHub Pages)
│   ├── index.html             # Main game (Pure EventBus)
│   ├── index_old_backup.html  # Original version backup
│   ├── css/main.css           # Game styles
│   └── js/
│       ├── main_eventbus_pure.js  # Pure EventBus entry point
│       ├── main.js                # Original entry point
│       ├── core/              # EventBus architecture
│       │   ├── EventBus.js
│       │   ├── StateManager.js
│       │   └── GameLoop.js
│       ├── systems/           # Game systems
│       │   ├── NPCSystem.js      # Full NPC AI
│       │   ├── PhysicsSystem.js  # Movement & collision
│       │   ├── RenderSystem.js   # Graphics
│       │   ├── WeaponSystem.js   # Combat
│       │   ├── TradingSystem.js  # Economy
│       │   └── allSystems.js     # Legacy (original code)
│       └── data/
│           └── gameData.js    # Planets, NPCs, items
```

## 🚀 Current Ship Stats
```javascript
// Player ship (balanced for fun gameplay)
thrust: 0.012      // 3x original value
maxSpeed: 0.8      // 78% faster than original
turnSpeed: 0.025   // 2x faster turning
weapons: []        // Starts empty - must buy!
credits: 250       // Starting money
```

## 🎯 Key Commands
```bash
# Start local server
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000

# Deploy to GitHub Pages
git add .
git commit -m "Update message"
git push origin main

# Test locally
open http://localhost:8000/docs/
```

## ⚙️ System Architecture
- **Pure EventBus**: All communication via events
- **StateManager**: Single source of truth
- **No Window Globals**: Clean architecture
- **Module Pattern**: ES6 modules throughout

## 🐛 Common Issues & Fixes

### Ship Too Slow?
Check `thrust` (should be 0.012) and `maxSpeed` (should be 0.8)

### Player Has Weapon at Start?
Check line 64 of `main_eventbus_pure.js` - should be `weapons: []`

### NPCs Not Spawning?
Check `SpawnSystem.js` is initialized in `main_eventbus_pure.js`

### Can't Save/Load?
LocalStorage must be enabled, check browser console for errors

## 📝 Session Handoffs
Latest: SESSION_33_HANDOFF.md
Previous: SESSION_31_HANDOFF.md, SESSION_30_HANDOFF.md

---
*Quick reference for Galaxy Trader development*