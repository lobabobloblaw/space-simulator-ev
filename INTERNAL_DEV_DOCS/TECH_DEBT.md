# INTERNAL — Technical Debt & Cleanup Plan

Scope: Track targeted, low-risk refactors aligned with our architecture. Keep changes surgical and avoid enabling diagnostics by default.

## 2026-09 evolution review

See `EVOLUTION_ROADMAP_2026-09.md` (repo root) for the full defect/enhancement audit
(evidence with file:line references, severity, sequenced plan). This tech-debt file
still tracks the smaller items below; the roadmap is the source of truth for the
larger findings (E1–E17, P1–P14, S1–S10, U1–U7) and the enhancement fronts in §3.

Phase 0 batch D (persistence & repo hygiene) acted on the roadmap's §2.5 findings and
removed:
- `docs/assets/explosion.gif` (5.9 MB, orphaned)
- 9 orphan planet PNGs + `terra_nova.svg` under `docs/assets/planets/` (unreferenced by
  `planets.json` or any `.js`)
- `docs/js/vendor/chiptune2.js` / `chiptune2.wasm` (43-byte error stubs; tracker
  playback is actually served by `docs/js/vendor/chiptune-3/`)
- `docs/music/which_brand_of_mustard_shall_i_buy.xm` (unreferenced by `radioPlaylist.js`)
- 7 dead/dangerous `scripts/*` (two hardcoded a path under a Users dir that no longer
  exists; one embedded a PAT into `.git/config`); `debug-pages.sh` and `fix-404.sh`
  moved to `archive/scripts/`
- untracked root-level `chiptune-3/`, `explosions/`, `screenshots/` cruft

And resized `docs/assets/logo.png` from 1024×1024/1.3 MB to 256×256/~56 KB (displayed
at 108 px tall). Added `docs/music/LICENSES.md` flagging the tracker modules' unknown
provenance/licence — still open, see roadmap §3.3.

Also fixed: live mission progress (`ship.missions`/`ship.missionStates`) was never
included in the save snapshot or load allowlist (roadmap E14) — now round-trips through
`SaveSystemAdapterFixed.js`. Save load now rejects a save with a missing/pre-'6.x'
`version` instead of trusting it. F12 clear-save now also clears `galaxyTraderRun` (not
just `galaxyTraderSave`); `galaxyTraderMeta` (permanent progression) is untouched.

## High-Value, Low-Risk Items

- Distance calculations
  - Replace repeated `Math.sqrt(dx*dx + dy*dy)` with `MathUtils.distance(x1,y1,x2,y2)` or `distanceSquared()` for comparisons.
  - Priority areas: `PhysicsSystem`, `WeaponSystem`, `proceduralPlanetRenderer`, and `RenderSystem` hotspots.

- Magic numbers → `GameConstants`
  - Route remaining hardcoded values to `docs/js/utils/Constants.js` (sizes, speeds, cooldowns, thresholds).
  - Avoid changing behavior; just centralize definitions.

  Shortlist (Session 62 sweep):
  - TargetCam: warm-up, frame throttle, build gating, blip/transition MS.
  - NPC: engage distances (near/medium/player), patrol assist range, message cooldowns (hail/taunt/flee), despawn checks.
  - Spawn/FX: same-type cooldown, pirate suppress window, death pauses; warp lifetimes/soft-caps; explosion/hitspark soft-caps.
  - UI: radio lock/scan/static intervals; speed readout cadence; landscape fetch timeout; notification min/delay steps.
  - Weapons: recoil bloom max/decay/add per type; per-type projectile lifetimes; muzzle-flash lifetime/soft-cap.
  - Physics/Ship: world bounds alias; heavy collision warning threshold; landing clear distance.

- Large functions
  - Split `initializeGameState()` (in `main_eventbus_pure.js`) into: `loadSaveOrDefaults()`, `initShip()`, `initWorld()`, `seedNPCs()`, `wireSystems()`.
  - Keep public API and events identical.

- Legacy systems
  - The legacy monolithic `docs/js/systems/allSystems.js` has been removed. Demo/backup pages now use the modular entry.

- Error handling
  - Standardize: prefer try/catch with minimal console noise; guard with feature flags when needed.
  - Maintain `DEBUG_*` defaults OFF; add concise messages only where actionable.

## Medium-Term

- Broad-phase collision (spatial partitioning) to reduce O(n²) checks.
- Object pooling for projectiles/effects to reduce GC churn.
- Star field polishing:
  - Keep density consistent across medium/high (done in Session 62); consider gentle blur fade‑in at boot end.
  - Revisit any remaining quality‑dependent size multipliers and remove them to avoid visual pops.

## Notes

- Keep EventBus-only comms and `StateManager.state` as the single source of truth.
- Preserve render hygiene: world/screen separation, save/restore brackets, no context scaling for pixel sprites.
 - Keep debug/console output behind explicit flags; default to silent. Avoid accumulating debug arrays when overlay is disabled.

### References (for constants sweep)
- TargetCam: `docs/js/systems/TargetCamRenderer.js`
- NPC: `docs/js/systems/NPCSystem.js`
- Spawn/FX: `docs/js/systems/SpawnSystem.js`, `docs/js/systems/ExplosionRenderer.js`, `docs/js/systems/RenderQualityPolicy.js`
- UI: `docs/js/systems/UISystem.js`
- Weapons: `docs/js/systems/WeaponSystem.js`
- Physics: `docs/js/systems/PhysicsSystem.js`
