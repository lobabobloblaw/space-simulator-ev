# Decisions (Session 57)

- WebGL Spike: Added `WebGLRenderSystem` behind a flag (`?webgl=1` or `localStorage.setItem('RENDER_WEBGL','1')`), OFF by default. Canvas2D remains the default/ship path. Rationale: optional perf exploration only when render-bound.
- Spawn FX: Enforced brief arrival/takeoff FX on all spawns to eliminate blink‑in. Rationale: visual continuity and clarity.
- Autosave Guard: Defer autosave on heavy frames (`window.__lastFrameMs > 24`) with bounded retries to avoid visible hitches. Rationale: smoothness during long sessions.
- TargetCam Policy: Keep deterministic source selection + warm‑up guard; buffer‑blit only; optional thresholds (`TC_ANGLE_EPS`, `TC_MIN_MS`) left OFF unless QA indicates.
- Diagnostics: Keep overlays/logging OFF by default. Use briefly for QA only.

Note: Quick toggles and next-session prompt have been moved to dedicated docs: `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md` and `INTERNAL_DEV_DOCS/NEXT_SESSION_PROMPT.md`.


## Decisions (Session 61)

- Legacy Cleanup: Removed the legacy monolithic `allSystems.js` path and updated demo/backup pages to load the modular entry (`main_eventbus_pure.js`). Rationale: single architecture path reduces tech debt and confusion.
- Initialization Refactor: Split `initializeGameState()` into small helpers (`loadGameData`, `loadSaveOrDefaults`, `initShip`, `seedNPCs`, `initAsteroids`, `initStars`, `initMissions`, `initOtherState`) without changing behavior. Rationale: readability and safer incremental changes.
- TargetCam/Assets: Confirmed use of `getFrameCanvasFromState`; removed unused legacy imports. Rationale: keep `AssetSystem` as the single owner.
- Thruster FX Linger: Suppressed sprite thruster overlays and vector exhaust during `deathSeq` for player and NPCs. Rationale: visual correctness during destruction.
- Explosion Debris: Made sparks 1x1 px with stable per‑explosion angles and slightly warmer color; increased densities by quality tier. Rationale: finer debris feel without perf regressions.
- NPC Constants: Patrol warning and forgiveness timings now read from `GameConstants.NPC` (defaults unchanged). Rationale: reduce magic numbers.
- Diagnostics: Remain OFF by default. Warm‑up and TargetCam FX toggles kept behind explicit QA flags.

## Decisions (Session 62)

- Constants Sweep: Centralized timings/distances across TargetCam, NPC/Spawn, UI, Weapons, and Physics into `GameConstants` (defaults preserved). Rationale: reduce magic numbers, improve clarity.
- Performance Hygiene: Gated weapon fire/switch logs behind `DEBUG_WEAPONS`; `debug.damage` emission + collection occur only when the debug overlay is enabled and showing projectile info (with soft cap). Rationale: avoid console/GC slowdowns during sustained combat.
- Visual Stability at Boot:
  - Ship/NPC sprite sizes no longer scale with quality; sizes are constant across the boot quality ramp. Rationale: prevent 10–20% size “pop”.
  - Starfield mid/near layers render every frame on medium/high; far/mid/near remain off on low. Rationale: prevent brightness jump when ramp ends.
- Stars Blur: Kept small blur on high; consider a gentle fade‑in at the end of boot ramp (tracked as an optional follow‑up).
