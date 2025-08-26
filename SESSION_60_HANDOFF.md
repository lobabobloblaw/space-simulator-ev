# Session 60 Handoff — Panel UX, Braking Realism, Perf + Constants, Legacy Gating

Goal
- Improve small-but-visible UX for Minimap/TargetCam panels, make braking use retro-thrust with fuel cost, do a safe perf/DRY pass (distanceSquared), consolidate more magic numbers, and gate the legacy bundle so the modular path is default.

What changed (high‑impact)
- Panel backgrounds + static
  - Restored CSS radial underlays for TargetCam/Minimap (alpha:true canvases + transparent clears).
  - Added faint static during transitional states; added a faint center ring on the Minimap during boot ramp/guard.
  - New master QA toggle to disable all panel static at once (`QA.panels(false)`), plus individual toggles.
- Braking realism
  - Braking now applies retro‑thrust opposite the velocity vector and consumes fuel (no more free brake). Overshoot is clamped to zero.
  - Constants: `SHIP.BRAKE_THRUST_MULT`, `SHIP.BRAKE_FUEL_COST`.
- Perf/DRY
  - Replaced many sqrt checks with `distanceSquared` in PhysicsSystem, WeaponSystem, and proceduralPlanetRenderer hot paths.
- Constants sweep
  - Physics: turn speed, impact damage multipliers, bounce impulses, screen shake decay, damage flash initial/decay/alpha.
  - Ship: landing offsets/cooldowns; destruct sequence duration.
  - UI: notification durations (ship destroyed/weapon switch/reputation); planet label offsets + blur.
  - All wired without changing gameplay.
- Legacy bundle gating
  - `index-refactored.html` loads `allSystems.js` only when `?legacy=1` is present (default path: modular systems).
  - `test-modules.html` also gates the legacy import behind `?legacy=1`.
- Internal docs & helpers
  - Internal notes consolidated earlier into `INTERNAL_DEV_DOCS/`.
  - `QUICK_TOGGLES.md` includes new toggles; added `QA.panels(bool)` helper.

Defaults and toggles
- Panel static (OFF only if toggled):
  - Master: `window.UI_PANEL_STATIC = false` or `QA.panels(false)` to disable TargetCam/Minimap/Radio static.
  - Per‑panel: `window.TC_STATIC=false`, `window.MINIMAP_STATIC=false`, `window.RADIO_STATIC=false`.
- Boot ramp: `QA.boot(ms)` to adjust; minimap shows faint ring during ramp; activity appears after ramp.
- TargetCam QA: `TC_WARM_MS`, `TC_ANGLE_EPS`, `TC_MIN_MS`, `TC_SHOW_PATH`.
- Profilers/guards remain opt‑in and OFF by default.

Verification map
- TargetCam
  - Orientation/upgrade‑only path selection unchanged; buffer‑blit strict; warm‑up guard intact.
  - Transitional static shows when offline/hold/warm‑up; disable via `TC_STATIC=false` or `UI_PANEL_STATIC=false`.
- Minimap
  - Gradient background visible immediately; during boot ramp: faint ring + optional static; after ramp: activity populates.
  - Disable ramp static via `MINIMAP_STATIC=false` or master.
- Braking realism
  - Hold brake at speed: ship slows using retro‑thrust; fuel decreases; no free brake. Release: no further braking.
  - At zero fuel, braking has no effect (as expected); fuel HUD blinks red at 0% while thrust/brake held.
- Perf/DRY
  - Long runs: no regressions expected; squared‑distance checks reduce per‑frame math in hot loops.

How to QA quickly
1) Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
2) Reset toggles: `QA.reset()` (then `QA.canvas2d()` if needed).
3) Panels
   - Confirm TargetCam and Minimap show gradient immediately; ramp ends ~3s (adjust `QA.boot(1500)` for quicker test).
   - Disable all static quickly: `QA.panels(false)`; re‑enable: `QA.panels(true)`.
4) Braking
   - Accelerate, then hold brake: speed drops; fuel decreases. Release: no further braking.
   - At zero fuel, braking has no effect (as expected); fuel HUD blinks red at 0% while thrust/brake held.
5) Perf spot check
   - Enable profiler briefly: `QA.profile(10)`; cycle targets, fly around. Expect no regressions.

Known follow‑ups
- Legacy cleanup: Remove remaining references to `allSystems.js` from backup/demo pages, then delete the file.
- `initializeGameState()` split: Extract helpers (`loadSaveOrDefaults`, `initShip`, `initWorld`, `seedNPCs`, `wireSystems`) with no behavior changes.
- Continue constants sweep for small thresholds in NPCSystem (warning/stand‑down ms), Render label thresholds, etc.

Key files modified
- Render/UX: `docs/js/systems/RenderSystem.js`, `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/UISystem.js`, `docs/css/main.css`
- Physics/Gameplay: `docs/js/systems/PhysicsSystem.js`, `docs/js/systems/WeaponSystem.js`
- Procedural planets: `docs/js/systems/proceduralPlanetRenderer.js`
- Core/Entry: `docs/js/main_eventbus_pure.js`, `docs/index-refactored.html`, `docs/test-modules.html`
- Utils/Docs: `docs/js/utils/Constants.js`, `docs/js/qaToggles.js`, `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md`

Notes for next agent
- Start from this handoff and `SESSION_CADENCE.md`.
- Keep diagnostics OFF by default; use QA helpers sparingly and reset.
- If touching rendering, preserve space hygiene (withWorld/withScreen), strict save/restore, and TargetCam buffer‑blit rules.
- Prefer central constants for any new thresholds. If you must introduce a literal, add it to `GameConstants`.

