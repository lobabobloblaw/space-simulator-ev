# PROMPT FOR NEXT SESSION - Galaxy Trader

Copy and paste this entire prompt to start your next session:

---

I'm working on Galaxy Trader, a 2D space trading/combat game built with a pure EventBus architecture. The project is at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`.

## Current Status
The game is fully functional and deployed. In the last session (48) we:
- Targeting/Viewport: unified X targeting cycles all ships (Shift+X clears); added a center viewport showing live-rotating silhouette + direction wedge; persistent ring/wedge during switching with a brief silhouette gap + fade-in and a selection blip.
- Radio: integrated tracker playback via local chiptune-3 (CDN/synth fallback); enabled all `/music` CC0 modules; added 660ms tuning static between tracks; removed signal bars and click rings; molded dial backplate, concentric ring alignment, and tightened button bar.
- Stability: fixed UI music-state handler binding; added null-guard fixes in viewport.

## Critical Information
- **ACTIVE FILE:** `docs/js/main_eventbus_pure.js` (NOT `main.js`)
- **ARCHITECTURE:** Pure EventBus - no global variables, all state in StateManager
- **TO RUN:** `cd /Users/alexvoigt/Documents/Claude/space-simulator-ev && python3 -m http.server 8000` then open `http://localhost:8000/docs/`

## Quick Orientation
Read these first:
1. `SESSION_46_HANDOFF.md` - Detailed last session info
2. `SESSION_40_QUICK_START.md` - Quick orientation
3. `SESSION_SUMMARY.md` - Overall project status
4. `SESSION_47_HANDOFF.md` - Detailed last session info

## Architecture Rules (IMPORTANT)
1. NO GLOBAL VARIABLES - Everything must be in StateManager
2. EVENTS ONLY - Systems communicate only via EventBus, never directly
3. Use the existing event system, don't create new patterns
4. The game uses relative imports (`../core/`, `./`) not absolute

## Current Features Working
- Ship movement, combat, shields; asteroid collisions
- NPC AI (pirates, patrol, traders, freighters)
- Trading across 4 planets; shop/upgrades; mission system
- Save/Load (F5/F9/F12); Respawn (R)
- Planet images (Pollinations flux + Unsplash + Lexica fallback) with HQ flow
- Ship Radio (prev/play/next; molded radial dial; tracker modules or synth fallback; tuning static)
- Targeting (X cycles ships; viewport silhouette + wedge; Radar levels gate minimap detail)
- Debug: F3 cycles render quality (high/medium/low)

## My Preferences
- Be concise and focus on relevant code only
- Don't show full hypothetical implementations
- Build in pauses between OS-level operations
- Ask for permission rather than assuming limitations

## Potential Tasks (choose based on what I ask for)
1. Targeting polish: optional hostiles-only cycle via modifier; viewport distance ring/grid; timing tweaks.
2. Radar MK III: ship-type icons or directional pings; minimap LOD by distance.
3. Radio polish: crossfade between tracks; alternate tuning burst; optional local vendor for chiptune2.
4. UI polish: final radio margins; micro-tune center stats spacing; optional viewport styling.
5. Performance: cache gradients for medium/high; distance-based explosion LOD.
6. Combat tweaks: recoil ceiling; muzzle glow variance; aim tuning by range.
7. Or debug any issues I mention

## Testing Commands
```javascript
// Browser console commands:
window.stateManager.state  // View game state
window.eventBus            // Event system
window.systems             // All game systems

// Quick tests:
const state = window.stateManager.state;
// Respawn test: simulate death then press R
state.ship.health = 0; state.ship.isDestroyed = true; window.eventBus.emit('ship.death');
// Radio
window.eventBus.emit('audio.music.play');
// Targeting
window.eventBus.emit('target.next'); // same as pressing X
// Quality
window.eventBus.emit('render.quality', { quality: 'low' });
```

## If I Report Issues

### "No graphics showing"
- Have me clear save data: Press F12 twice, then reload

### "Collisions not working"
- Check `PhysicsSystem.js` for damage calc; screen shake and red flash on impact

### "Which file is running?"
- Confirm `docs/index.html` loads `js/main_eventbus_pure.js` (not `main.js`)

## Key File Locations
```
/docs/js/main_eventbus_pure.js     - Main entry (ACTIVE)
/docs/js/systems/PhysicsSystem.js  - Collision handling
/docs/js/systems/RenderSystem.js   - Graphics & effects
/docs/js/systems/NPCSystem.js      - NPC AI
/docs/js/core/EventBus.js          - Event system
/docs/js/core/StateManager.js      - Central state
/docs/js/systems/UISystem.js       - HUD, landing overlay, planet image pipeline
/docs/js/systems/ShipDesigns.js    - Procedural ship silhouettes
/docs/js/systems/FactionVisuals.js - Faction palettes + decals
/docs/js/systems/AudioSystem.js    - SFX + Radio
```

Please start by asking what I’d like to do next (targeting polish, radar MK III, radio polish, UI polish, performance, combat tweaks), or if I’m experiencing issues.

---

END OF PROMPT - Copy everything above this line
