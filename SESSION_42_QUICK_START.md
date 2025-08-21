# QUICK START - Galaxy Trader Session 42

## ⚠️ CRITICAL - READ FIRST
1. **ACTIVE FILE**: `main_eventbus_pure.js` (NOT main.js!)
2. **ARCHITECTURE**: Pure EventBus - NO globals, all state in StateManager
3. **GAME STATUS**: FULLY FUNCTIONAL - All systems working

## 🚀 Run the Game
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# Open: http://localhost:8000/docs/
```

## 📂 Key Files
- `/docs/js/main_eventbus_pure.js` - Main entry point (ACTIVE)
- `/docs/js/core/StateManager.js` - All game state
- `/docs/js/core/EventBus.js` - Event system
- `/docs/js/systems/*.js` - All game systems

## 🎮 Controls
- **WASD/Arrows** - Move ship
- **F** - Fire weapon
- **L** - Land on planet
- **Q** - Switch weapon
- **F5** - Save game
- **F9** - Load game
- **M** - Toggle sound

## ✅ What's Working
- Ship movement & combat
- NPC AI (pirates, patrols, traders)
- Trading system (commodities)
- Shop system (weapons/upgrades)
- Asteroid collisions & damage
- Save/Load system
- All visual effects

## 🔧 Recent Fixes (Session 41)
1. Removed distracting NPC glow highlights
2. Fixed NPC spawning (no more swarming)
3. Fixed trading UI scrolling
4. Fixed shop system (credits & items now work)

## 📝 Testing in Console
```javascript
window.stateManager.state.ship.credits = 5000  // Add credits
window.stateManager.state                      // View all state
window.eventBus                                // Event system
```

## 📖 Full Documentation
- `SESSION_41_HANDOFF.md` - Detailed session notes
- `SESSION_SUMMARY.md` - Overall project status

## 🎯 Owner Preferences
- Be concise, focus on relevant code only
- Maintain existing EventBus architecture
- Test thoroughly before claiming fixes work
- The game should feel like a living world

---
**Remember**: Everything works! If something seems broken, check:
1. Are you editing the right file? (main_eventbus_pure.js)
2. Did you reload the browser?
3. Is there saved data interfering? (F12 twice to clear)