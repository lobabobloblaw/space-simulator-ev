# Session 62 Handoff — Constants Sweep + Early QA Fixes

## Summary
- Centralized timings/distances into `GameConstants` across TargetCam, NPC/Spawn, UI, Weapons, and Physics (defaults unchanged).
- Fixed two early-session pop issues (no visual jumps):
  - Ship sprites: removed quality-based size multiplier to avoid size jump when boot ramp ends.
  - Stars: aligned mid/near render cadence across medium/high to prevent brightness “double”.
- Removed a performance leak: debug damage numbers are now collected only when the overlay requests them; weapon fire/switch logs are gated.

## Changes
- Constants
  - Added `TARGET_CAM` group: warm-up, render throttle, transition/blip, build gating (angle/time), heavy-frame thresholds.
  - Added `SPAWN` group: per-type cooldown, pirate suppress, post-death pauses.
  - Extended `NPC`: engage distances (warn/fire/engage/breakoff), message cooldowns, distress ranges/throttles, scavenger scan distance, stand-down reset.
  - Extended `UI`: radio scan/lock/button timings, dial static/noise cadence, speed readout cadence, landscape fetch timeouts.
  - Extended `WEAPONS`: per-type projectile lifetimes; recoil bloom (max/decay/add); moved muzzle flash caps under `EFFECTS`.
  - Extended `PHYSICS`: heavy collision warning threshold; landing clear distance; world-bounds alias via `WORLD.ASTEROID_WORLD_SIZE`.
- Systems updated to consume constants (behavior unchanged):
  - `TargetCamRenderer.js`: uses `GameConstants.TARGET_CAM.*` for warm-up, throttle, transitions, build gating.
  - `NPCSystem.js`: replaced literals for engage distances, message cooldowns, despawn distance, distress windows, stand-down reset, scavenger scan.
  - `SpawnSystem.js`: spawn caps/radii, despawn, spawn scheduling, same-type and pirate suppress windows, post-death pauses, world wrap via `WORLD.ASTEROID_WORLD_SIZE`.
  - `UISystem.js`: radio timings, speed readout cadence, Lexica/Pollinations timeouts.
  - `WeaponSystem.js`: projectile lifetimes by type, recoil bloom clamp/add/decay, muzzle-flash lifetime/soft-cap.
  - `PhysicsSystem.js`: heavy collision warning threshold, landing clear distance, world bounds from `WORLD.ASTEROID_WORLD_SIZE`.
- Rendering tweaks (user-visible fixes, default visuals preserved):
  - `RenderSystem.js`: decoupled sprite size from quality (no boot-ramp size pop); starfield mid/near layers now render every frame on medium/high (no brightness pop). High-quality star blur remains, but density is consistent.
- Performance hygiene:
  - `WeaponSystem.js`: weapon logs behind `window.DEBUG_WEAPONS`; emits `debug.damage` only when the overlay is enabled and showing projectile info.
  - `DebugSystem.js`: collects floating damage numbers only when `debug.enabled && debug.showProjInfo`, with a soft cap.
- Docs
  - Updated `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md` (Constants section: new keys and guidance).

## Verification Steps
1) Serve: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
2) Reset QA toggles: `await import('./js/qaToggles.js'); QA.reset(); QA.canvas2d();` (keep diagnostics OFF).
3) Sanity passes (behavior should feel identical):
   - TargetCam: cycle with `X`; warm-up honored; brief label via `QA.tcInspect(6)` OK.
   - Spawn: kill varied NPCs; same-type and pirate suppress windows still prevent instant replacements.
   - UI: radio scan/lock feels unchanged; speed readout ~3 Hz; planet image fetch timeouts unchanged.
   - Weapons: projectile lifetimes, recoil feel, muzzle flash duration unchanged by feel; no console spam unless `DEBUG_WEAPONS` is true.
   - Physics: leaving planet requires ~+100px clear; heavy collision warning threshold unchanged.
4) Visual stability: within first ~3–4s of a new session, ship sprite sizes stay constant; starfield brightness remains steady.
5) Grep for remaining literals to shortlist future candidates: durations/distances still in AI tuning paths or VFX-only.

## Acceptance Criteria
- All touched literals replaced with `GameConstants.*`; defaults match existing values.
- Game behavior unchanged (TargetCam, spawn damping, UI radio, weapon lifetimes, physics warnings).
- Build runs without warnings; docs updated.

## Open Items / Next Session
- Optional VFX polish: asteroid-break shard sizes/density; sliver shards or fade-to-red for molten debris.
- Optional: thin wrapper for TargetCam to consume `AssetSystem.getFrameCanvasFromState` (no behavior change).
- Continue constants sweep for any remaining AI/VFX thresholds where appropriate.
 - Consider a gentle fade-in for star blur at the end of the boot ramp to remove any subtle glow transition.

## Toggles
- Diagnostics OFF by default. Briefly used for QA only; all reset.
- TargetCam FX via `window.TC_FX = true` is optional for QA; keep OFF when done.

## Files Touched
- `docs/js/utils/Constants.js`
- `docs/js/systems/TargetCamRenderer.js`
- `docs/js/systems/NPCSystem.js`
- `docs/js/systems/SpawnSystem.js`
- `docs/js/systems/UISystem.js`
- `docs/js/systems/WeaponSystem.js`
- `docs/js/systems/PhysicsSystem.js`
- `docs/js/systems/RenderSystem.js`
- `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`
 - `INTERNAL_DEV_DOCS/RENDERING.md`
 - `INTERNAL_DEV_DOCS/PROFILING.md`

## Notes
- Next agent should begin with this handoff and the cadence doc. Follow `SESSION_CADENCE.md` for start/end checklists and QA toggles.
