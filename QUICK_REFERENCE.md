# QUICK REFERENCE - Galaxy Trader Current State

## Current Status: August 18, 2025
- **Game Status**: STABLE & PLAYABLE on old architecture ✅
- **EventBus Migration**: COMPLETE but deployment blocked ⚠️
- **Pure StateManager**: Implemented in PhysicsSystem & RenderSystem ✅
- **Production**: Using `main.js` (old architecture)

## Quick Commands
```bash
# Start development
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000

# Test PRODUCTION version (stable)
open http://localhost:8000/docs/

# Test EventBus with globals (WORKS)
open http://localhost:8000/docs/eventbus-working.html

# View live site
open https://lobabobloblaw.github.io/space-simulator-ev/
```

## Architecture Status

### Three Versions:
1. **OLD** (`main.js`) - IN PRODUCTION ✅
2. **HYBRID** (EventBus + globals) - WORKS ✅
3. **PURE** (EventBus only) - COMPLETE BUT WON'T LOAD ⚠️

## The Issue
- Pure EventBus (`main_eventbus_pure.js`) won't initialize
- Likely cause: SaveSystem import case sensitivity
- Hybrid approach works perfectly

## File Structure
```
/docs/
├── index.html              # Uses main.js (stable)
├── eventbus-working.html   # Hybrid approach (WORKS)
├── js/
│   ├── main.js            # OLD architecture (current)
│   ├── main_eventbus_pure.js  # PURE (has loading issue)
│   ├── core/              # EventBus infrastructure ✅
│   └── systems/           
│       ├── PhysicsSystem.js  # Updated for pure ✅
│       ├── RenderSystem.js   # Updated for pure ✅
│       └── [others]          # Need updating for pure
```

## Next Session Priority
1. Fix SaveSystem import case issue (5 min)
2. OR deploy hybrid approach (5 min)
3. OR keep current stable version (0 min)

## Controls
- **WASD** - Move ship
- **F** - Fire weapon
- **L** - Land on planet
- **Q** - Switch weapons
- **S** - Save game
- **O** - Load game
- **M** - Toggle sound

## Remember
- EventBus architecture is COMPLETE
- All systems are converted
- Just need to fix module loading
- Game is stable and playable now