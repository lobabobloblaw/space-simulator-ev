# Galaxy Trader - Project Summary
## 2D Space Trading & Combat Game

## Current Status: ✅ FULLY FUNCTIONAL
All core systems operational. Pure EventBus architecture deployed successfully.

## Quick Start
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# Open: http://localhost:8000/docs/
```

## Architecture Overview
- **Pure EventBus Design**: No global variables, all state in StateManager
- **Event-Driven**: All systems communicate via events only
- **Active Main File**: `main_eventbus_pure.js` (NOT main.js!)
- **State Management**: Centralized in StateManager with Proxy-based change detection

## Core Features (All Working)
### Combat & Movement
- Ship control with WASD/Arrow keys
- Multiple weapon types (laser, rapid, plasma, mining)
- Shield systems and damage model
- Asteroid collisions with visual feedback

### NPC System
- Complex AI with personalities
- Pirates (aggressive hunters)
- Patrols (law enforcement)
- Traders/Freighters (passive, flee from danger)
- Dynamic spawning with natural movement patterns

### Trading & Economy
- Commodity trading between planets
- Dynamic pricing system
- Shop/Outfitter for upgrades
- Credits and cargo management

### Visual Systems
- Procedural planet rendering
- AI-generated planet landscapes (Pollinations.ai)
- Particle effects (explosions, thrust, warp)
- Screen shake and damage flash
- Cyberpunk-themed UI

### Persistence
- Save/Load system (F5/F9)
- Autosave every 30 seconds
- Saves ship state, credits, weapons, cargo

## Recent Sessions
### Session 48 (Latest)
- Targeting/Viewport: Unified X targeting cycles all ships; Shift+X clears. New target cam viewport shows live-rotating silhouette and a direction wedge; persistent ring/wedge during switching with a brief silhouette gap + fade-in and selection blip. Auto-clears on NPC death.
- Radio: Local tracker modules via chiptune-3 (with CDN + synth fallbacks). Playlist wired to `/music` CC0 modules; all tracks enabled. Added 660ms tuning static between tracks. Removed signal bars and click rings; refined molded dial/backplate; fixed concentric ring alignment and button bar spacing.
- Stability: Fixed UI music-state handler binding; added null guards in viewport.

### Session 47
- Radar progression added: `radarLevel` gates minimap detail (L0 featureless; L1 planets/NPC basics; L2+ faction colors + pirate ring). Range rings hidden at L0.
- Targeting: press X to cycle nearest hostile; targeted hostiles get emphasized brackets and a small center dot.
- Radio: enlarged radial dial; moved controls to a right-side dot cluster with glyphs.
- Performance: pooled explosions/warp/hit-sparks/muzzle flashes; frustum culling; quality-aware rendering (F3 cycles high/medium/low).
- Combat feel: per-weapon tracer tuning; slight rapid cadence jitter; shield-hit ring + cyan sparks.
- Architecture: shop/trading UI now uses delegated handlers and EventBus (no globals). `radarLevel` persisted in saves.

### Session 46
- HUD spacing tightened for smaller windows; two-line logo with compact inline key stats.
- Radio redesign: radial “frequency module” with scanning sweep; rectangular backup retained.
- Audio decoupling: SFX muted by default (M toggles SFX only); louder music by default.
- GitHub Pages black screen fixed by adding missing runtime modules.

### Session 44–45
- High-quality planet landscapes via Pollinations (model=flux, enhance optional), with deterministic seeds and tightened prompts (no animals/humans)
- Provider flow with fallback (Unsplash, Pollinations, procedural) and robust timeouts; provider overlay now disabled by default
- Fixed duplicate planet visual code causing forced low-res images; unified draw path
- Landing UI: richer planet descriptions, compact market highlights and outfitter info (one-shot, no scroll)
- Controls HUD: two-column layout; added Mute toggle (M)
- Starfield density increased (2.0x); import paths normalized to relative
- RenderSystem safeguards to rehydrate visuals if missing
- Deployed to GitHub Pages (serving from /docs)

### Session 41
- Fixed NPC visual highlights (removed distracting glows)
- Overhauled NPC spawning (natural movement, no swarming)
- Fixed trading UI (proper header/scroll separation)
- Repaired shop system (created ShopSystem.js)

### Session 40
- Initial handoff preparation
- System documentation

### Session 39
- Restored asteroid collision effects
- Fixed damage calculation
- Added screen shake and visual feedback

## Technical Stack
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Graphics**: HTML5 Canvas
- **Architecture**: Pure EventBus pattern
- **State**: Centralized StateManager
- **Styling**: Custom CSS (Cyberpunk theme)
- **No Dependencies**: Zero external libraries

## File Structure
```
/docs/
├── index.html                    # Main HTML
├── css/main.css                  # Cyberpunk styling
└── js/
    ├── main_eventbus_pure.js     # ACTIVE MAIN FILE
    ├── core/
    │   ├── EventBus.js          # Event system
    │   ├── StateManager.js      # State management
    │   └── GameLoop.js          # Game loop
    ├── systems/
    │   ├── NPCSystem.js         # NPC AI
    │   ├── PhysicsSystem.js     # Collisions
    │   ├── RenderSystem.js      # Graphics
    │   ├── TradingSystem.js     # Trading
    │   ├── ShopSystem.js        # Purchases
    │   └── [other systems...]
    └── data/
        └── gameData.js          # Game configuration
```

## Known Issues
- AI planet images sometimes fail to load (has fallback)
- Performance can degrade with many particles
- Touch controls exist but aren't well tested

## Development Guidelines
1. **Never use globals** - Everything through StateManager
2. **Events only** - No direct system communication
3. **Test collisions** - Ram asteroids to verify damage
4. **Visual feedback** - Every action needs response
5. **Living world** - NPCs should feel autonomous

## Future Enhancements (Not Started)
- Faction/reputation system
- Quest chains
- Space stations
- More weapon types
- Multiplayer support
- Music/enhanced audio
- Performance optimizations

## Controls Reference
- **WASD/Arrows**: Move ship
- **F**: Fire weapon
- **L**: Land on nearby planet
- **Q**: Switch weapon
- **M**: Toggle sound
- **F5**: Save game
- **F9**: Load game
- **F12**: Clear save (press twice)

## Testing Commands
```javascript
// Browser console
window.stateManager.state           // View all state
window.stateManager.state.ship      // Ship status
window.eventBus                     // Event system
window.systems                      // All systems

// Add credits for testing
window.stateManager.state.ship.credits = 5000
```

## Project Philosophy
- Clean event-driven architecture
- Visual polish and feedback
- Living, breathing game world
- Retro cyberpunk aesthetic
- Performance over features

---
**Status**: Production-ready. All core features complete and functional.
**Next Session**: Ready for new features or polish tasks.
