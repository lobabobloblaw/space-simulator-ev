# Session 54 Handoff — TargetCam warm-up + HUD build tag

## Summary
- Reduced TargetCam-induced spikes and flicker during cycling by caching silhouettes and gating re-tinting to light frames and meaningful changes. Added an optional HUD build tag (QA-only).

## Changes
- docs/js/systems/HUDRenderer.js: Added `drawBuildTag()` behind `window.HUD_SHOW_BUILD_TAG`.
- docs/js/systems/RenderSystem.js:
  - Added optional render profiler (auto-armed, throttled) and minimap throttle (~30Hz).
  - Heavy-frame dampers for trails/sparks/flashes/shield rings (only on heavy frames).
  - Deferred planet generation off render to prevent one-frame hitches.
  - Hooked build tag draw in HUD pass.
- docs/js/systems/TargetCamRenderer.js:
  - Cached tinted silhouettes per target; stabilized per-target dims to avoid churn.
  - Gated re-tinting by time (~90ms), angle (~0.12rad), and target change; only on non-heavy frames.
  - Always draws cached silhouette if present; draws baseline on heavy frames without cache (prevent flicker), then upgrades later.
  - Kept warm-up guard and deterministic source order/rotation rules unchanged.
- docs/js/main_eventbus_pure.js: Added optional update profiler (auto-armed, throttled).
- INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md: Documented performance toggles and HUD QA toggle.

## Verification Steps
- Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
- Clear toggles in console:
  - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT;`
- Confirm TargetCam init log (once): `[TargetCam] init { build: <ISO>, warmMs: 450 }` (unless `TC_SILENT`).
- Fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
  - `window.TC_DEBUG = true; window.TC_SHOW_PATH = true;`
  - Patrol east; Force each path:
    - direct/preloaded/standalone: PNG correct; cyan axis down.
    - atlas/baseline: white silhouette horizontal; cyan axis right.
- Main: `http://localhost:8000/docs/`
  - Cycle targets; auto mirrors world; no 90° CCW surprises during transitions.
  - Try `window.TC_WARM_MS = 300` and `= 500` to assess transitions.
  - Optional: `window.TC_SHOW_PATH = true` to see tag (DIRECT/PRELOADED/...).
- HUD build tag (QA-only):
  - `window.HUD_SHOW_BUILD_TAG = true; window.HUD_BUILD_TAG = 'build:' + new Date().toISOString().slice(0,16);`
  - Expect small text in top-right; disable by deleting the toggle.

## Acceptance Criteria
- Auto mode mirrors world heading; no 90° CCW mismatches during or after transitions.
- Warm-up (~450ms by default):
  - During warm-up, PNG shows as soon as ready; otherwise silhouette is omitted (no atlas/baseline) until warm-up passes.
  - After warm-up, if PNG unavailable, atlas/baseline may show; orientation correct (nose-right).
- Forced modes unchanged:
  - direct/preloaded/standalone → PNG with cyan axis down (+90° inner rotation).
  - atlas/baseline → horizontal oval with cyan axis right.
- Performance: No sustained rAF violations; TargetCam does not dominate frame time during cycling; no flicker; no mask allocation spikes.

## Open Issues / Follow-ups
- Visual tuning: If any PNG noses are slightly off, add nudges in `SpriteMappings.spriteOrientationOverrides` (PNG paths only).
- Empirical warm-up tuning: Set `TC_WARM_MS` between 300–500ms based on QA feel; default remains 450ms.
- Consider moving TargetCam re-tint fully off the render phase and/or switch to strict buffer-blit (redraw only on change; per-frame blit).
- Consider moving autosave JSON/localStorage to idle to avoid sync stalls.

## Next Session Plan
1) TargetCam finalization: strict event/threshold-driven redraw with persistent buffer; RenderSystem blits buffer each frame.
2) Shift re-tinting off render (post-rAF) and validate spike immunity during rapid cycling.
3) Verify fixture + main; adjust `angleEps`/`minIntervalMs` as needed.
4) Optional: move autosave off critical path (idle callback); cap payload sizes.
5) Acceptance pass; disable toggles; prune profiler logs if not needed.

## Context / Links
- TargetCam rules + hygiene: `INTERNAL_DEV_DOCS/RENDERING.md`
- Developer toggles reference: `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`
- Session cadence: `SESSION_CADENCE.md`
- Sprite mappings: `docs/js/systems/SpriteMappings.js`
- Fixture: `docs/test/targetcam-spec.html`

## Debug / Toggles Used (reset before end)
- Recommended during verification only: `TC_DEBUG`, `TC_SHOW_PATH`, `TC_WARM_MS`.
- HUD QA toggle: `HUD_SHOW_BUILD_TAG` (and optional `HUD_BUILD_TAG`).
- Profilers (diagnosis only; keep OFF normally): `RENDER_PROF_LOG/OVERLAY`, `UPDATE_PROF_LOG/OVERLAY`, `RENDER_PROF_T`.

## Build / Version Notes
- TargetCam logs a minimal init line: `[TargetCam] init { build: <ISO>, warmMs: <num> }` unless `TC_SILENT` is true.
