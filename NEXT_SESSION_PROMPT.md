# PROMPT FOR NEXT SESSION - Galaxy Trader

Copy and paste this entire prompt to start your next session:

---

I'm working on Galaxy Trader, a 2D space trading/combat game built with a pure EventBus architecture. The project is at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/`.

## Current Status
The game is fully functional and deployed. In the last session (46) we:
- Tightened HUD spacing to keep elements visible on smaller windows.
- Switched the center logo to a two-line mark and made credits/weapon/kills a compact inline subline.
- Redesigned the Radio: removed volume knob, added a scanner readout and a thin scan bar (rectangular backup), plus a new radial “frequency module” (default) with a subtle sweep.
- Decoupled audio: SFX are muted by default (M toggles SFX only); music is louder by default and independent.
- Fixed GitHub Pages black screen by adding missing runtime modules.

## Critical Information
- **ACTIVE FILE:** `docs/js/main_eventbus_pure.js` (NOT `main.js`)
- **ARCHITECTURE:** Pure EventBus - no global variables, all state in StateManager
- **TO RUN:** `cd /Users/alexvoigt/Documents/Claude/space-simulator-ev && python3 -m http.server 8000` then open `http://localhost:8000/docs/`

## Quick Orientation
Read these first:
1. `SESSION_46_HANDOFF.md` - Detailed last session info
2. `SESSION_40_QUICK_START.md` - Quick orientation
3. `SESSION_SUMMARY.md` - Overall project status

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
- Ship Radio (prev/play/next; scanner readout; radial dial; procedural ambient tracks)

## My Preferences
- Be concise and focus on relevant code only
- Don't show full hypothetical implementations
- Build in pauses between OS-level operations
- Ask for permission rather than assuming limitations

## Potential Tasks (choose based on what I ask for)
1. Radio polish: refine radial sweep, add signal-strength bars, tune readout strings.
2. Lower UI polish: adjust radio width/margins; micro-tune center stats spacing.
3. Visual polish: faction decals on minimap and HUD target brackets.
4. Performance: pool/cull explosion particles and trails.
5. Combat tweaks: tracer variance; micro spread/cadence tuning.
6. Or debug any issues I mention

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

Please start by asking what I’d like to do next (lower UI polish, radio polish, visual polish, performance, or combat tweaks), or if I’m experiencing issues.

---

END OF PROMPT - Copy everything above this line
