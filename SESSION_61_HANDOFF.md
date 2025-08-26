# Session 61 Handoff — QA Acceptance + Next Steps

## Summary
- Performed targeted cleanup/refactors and polish, then ran a quick QA pass on Session 60 items (panel UX/static overlays, TargetCam warm‑up + deterministic path, braking realism). Verified behavior matches handoff and internal docs.

## Changes
- Removed legacy bundle and references:
  - Deleted `docs/js/systems/allSystems.js`.
  - Removed conditional legacy loader from `docs/index-refactored.html`.
  - Updated demo/backup pages to modular entry:
    - `docs/index-backup.html`, `docs/index_old_backup.html`, `docs/render-test.html`,
      `docs/debug-import.html`, `docs/game-debug.html`, `docs/diagnostic.html`, `docs/debug-test.html`.
  - Updated `docs/test-modules.html` to report legacy removal instead of attempting import.
- Internal docs updated:
  - `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md` (legacy section) and `INTERNAL_DEV_DOCS/TECH_DEBT.md`.
- Toggles verified to remain OFF by default; QA helpers used temporarily during verification and reset.
- Initialize state refactor (no behavior changes):
  - Split `initializeGameState()` in `docs/js/main_eventbus_pure.js` into helpers:
    - `loadGameData`, `loadSaveOrDefaults`, `initShip`, `seedNPCs`, `initAsteroids`, `initStars`, `initMissions`, `initOtherState`.
  - Orchestration preserved; ship/world/NPCs/stars/missions and subsystem state identical.
- Small constants sweep:
  - Replaced hardcoded patrol warning/forgiveness durations in `NPCSystem.js` with `GameConstants.NPC.PATROL_WARNING_DURATION` and `PATROL_FORGIVENESS_TIME` (no functional change to defaults).
 - Explosion debris tuning:
   - Debris chunk size halved (2x2 → 1x1) in `ExplosionRenderer.js` sparks; stable per‑explosion angles and slightly warmer debris color for visibility.
   - Increased debris density via `sparkCountFor()` in `RenderQualityPolicy.js` (tiny: 5, low: 8, medium: 16, high: 24).

## Verification Steps
- Serve locally: `python3 -m http.server 8000` then open `http://localhost:8000/docs/`.
- Reset toggles: in console `await import('./js/qaToggles.js'); QA.reset(); QA.canvas2d();` (keep diagnostics OFF).
- Panels
  - Gradient underlays visible immediately in TargetCam/Minimap containers; canvases clear to transparent.
  - Boot ramp (~3s): minimap/HUD throttled; optional: `QA.boot(1500)` to shorten.
  - Static overlays: `QA.panels(false)` disables; `QA.panels(true)` re‑enables. Per‑panel: `TC_STATIC=false`, `MINIMAP_STATIC=false`, `RADIO_STATIC=false`.
- TargetCam
  - Optional: `QA.tcInspect(8)` to show path label/axes briefly.
  - Cycle targets with `X`; clear with `Shift+X`. During warm‑up (~450ms), atlas/baseline suppressed; silhouette appears as soon as PNG source is ready. After warm‑up, fallback allowed when no PNG.
  - Deterministic, upgrade‑only source: `direct → preloaded → standalone → atlas → baseline`. Optional FX: `window.TC_FX = true` (disable afterwards).
- Braking
  - Accelerate (W/↑) then hold Space: speed decreases via retro‑thrust; fuel decreases. At 0 fuel, braking has no effect. Overshoot clamped to zero.
- Perf spot check
  - `QA.profile(10)` briefly; fly/target cycle; expect no regressions (squared‑distance checks in hot paths).

## Acceptance Criteria
- Panel backgrounds and static overlays behave per Session 60 handoff; master/per‑panel toggles function.
- TargetCam warm‑up window suppresses atlas/baseline; source selection is deterministic and single‑path per target; buffer‑blit only in frame path.
- Braking realism: retro‑thrust opposite velocity with fuel cost; no free brake; overshoot clamp prevents direction flip.
- Perf/DRY: squared‑distance checks present in Weapon/Physics paths; no obvious spikes introduced.

## Open Issues / Follow-ups
- Continue constants sweep: NPC timing and HUD label thresholds → `GameConstants`.
- Optional: tune asteroid‑break shard sizes/density to align with new debris feel.
- Optional: occasional 2x1 “sliver” shards or fade‑to‑red for molten debris.
- TargetCam/Asset integration: consider a thin helper around `AssetSystem.getFrameCanvasFromState` for future consumption.

## Next Session Plan
1) Constants sweep: HUD label thresholds and additional NPC timing → `GameConstants` (no behavior changes).
2) Optional VFX: adjust asteroid‑break shard sizes/density to match tuned debris.
3) Optional: add helper around `AssetSystem.getFrameCanvasFromState` for TargetCam consumption later.

## Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/ARCHITECTURE.md`, `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`.
- Playbook: `AGENTS.md`, cadence: `SESSION_CADENCE.md`.
- TargetCam fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used (reset before end)
- Used briefly for QA: `QA.reset()`, `QA.canvas2d()`, `QA.tcInspect(8)`, `QA.panels(false|true)`, `QA.profile(10)`, optional `window.TC_FX = true`.
- Reset complete: diagnostics OFF, panel static ON by default, warm‑up default ~450ms.

## Build / Version Notes (optional)
- If needed during QA, enable a build tag via `window.HUD_SHOW_BUILD_TAG = true` to confirm freshness; keep OFF by default.
