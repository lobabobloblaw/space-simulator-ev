# Session 55 Handoff — TargetCam strict buffer‑blit + stability

## Summary
- Moved TargetCam silhouette generation fully off the render phase and implemented a persistent offscreen buffer. Render loop now blits the buffer only; rebuilds are event/threshold‑driven and never run on heavy frames.

## Changes
- docs/js/systems/TargetCamRenderer.js:
  - Added persistent buffer (`_buf`) and off‑render build scheduler (`_enqueueBuild`, `_tryBuildFromQueue`).
  - Reworked `render()` TargetCam path to be blit‑only: always draws ring/wedge; blits cached buffer rotated by `npc.angle`; draws baseline only on heavy frames when buffer is absent and warm‑up has passed.
  - Builds are triggered only on target change, `|Δangle| ≥ ~0.12rad`, or `≥ ~90ms` since last build, and are performed post‑rAF (microtask). PNG inner rotation (+90°) is baked into the buffer; atlas/baseline use only outer rotation.
  - Kept deterministic source selection (upgrade‑only) and warm‑up guard (`window.TC_WARM_MS`).
- INTERNAL_DEV_DOCS/RENDERING.md: Documented strict buffer‑blit design and scheduling rules.
- INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md: Noted the new TargetCam buffer‑blit behavior and heavy‑frame fallback rule.
- docs/js/systems/RenderSystem.js:
  - Profiling “other” bucket added to account for unprofiled main‑thread work.
  - Auto profiler arming now disabled by default; can be enabled via `window.RENDER_PROF_AUTO_ENABLED = true`.
  - No functional changes to world renders; TargetCam invoked as a cheap blit.
- docs/js/main_eventbus_pure.js:
  - HUD `UI_UPDATE` emissions throttled to ~8–10 Hz to reduce DOM churn.
  - Autosave emits `{ reason: 'auto' }` and remains off the critical path.
- docs/js/systems/UISystem.js:
  - Change‑only text updates to avoid unnecessary DOM writes.
- docs/js/systems/SaveSystemAdapterFixed.js:
  - Autosave coalesced/scheduled on idle; payload capped; autosave toast suppressed (manual saves still show toast). Logs behind `window.DEBUG_SAVE`.
- docs/js/systems/SpawnSystem.js:
  - Spawn/despawn logs gated behind `window.DEBUG_SPAWN` (default OFF).

## Verification Steps
- Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
- Clear toggles in console:
  - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT;`
  - `delete window.RENDER_AUTO_QUALITY; delete window.RENDER_PROF_LOG; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_AUTO_DISABLED; delete window.UPDATE_PROF_LOG; delete window.UPDATE_PROF_OVERLAY;`
- Confirm TargetCam init log shows build and warmMs once (unless silenced): `[TargetCam] init { build: <ISO>, warmMs: <num> }`.
- Fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
  - `window.TC_DEBUG = true; window.TC_SHOW_PATH = true;`
  - Patrol east; force each path:
    - direct/preloaded/standalone: PNG correct; cyan axis down (+90° baked; outer angle only).
    - atlas/baseline: white silhouette horizontal; cyan axis right (outer angle only).
- Main: `http://localhost:8000/docs/`
  - Cycle targets rapidly; silhouettes should not flicker; TargetCam should not be the worst bucket in the profiler.
  - Let the game run a few minutes, then use TargetCam several times; spikes should not appear as `targetcam`. If spikes occur, `worst:other` may briefly appear but should remain low/rare.
  - Try `window.TC_WARM_MS = 300` and `= 500` to assess warm‑up transitions (during warm‑up, no atlas/baseline; PNG shows as soon as ready).
  - Optional (brief diagnosis): `window.RENDER_PROF_OVERLAY = true` to inspect worst bucket (disable after testing).

## Acceptance Criteria
- Auto mode mirrors world heading; no 90° CCW mismatches before/after transitions.
- Warm‑up behavior:
  - During warm‑up, PNG shows as soon as ready; otherwise silhouette omitted (no atlas/baseline).
  - After warm‑up, if PNG unavailable, atlas/baseline may show; orientation correct (nose‑right).
- Forced modes unchanged:
  - direct/preloaded/standalone → PNG with cyan axis down (+90° baked in buffer).
  - atlas/baseline → white silhouette horizontal; cyan axis right.
- Performance: No TargetCam‑dominated rAF violations during heavy cycling; no silhouette flicker; no mask/canvas churn spikes.
  - Verified in practice: spikes previously attributed to TargetCam are gone; remaining long tasks were in `other` and mitigated by throttled HUD and idle autosave.

## Open Issues / Follow‑ups
- Monitor buffer size stability per target; adjust `angleEps` (~0.12rad) and `minIntervalMs` (~90ms) if QA finds missed updates.
- Consider exposing a short‑lived `window.TC_BUF_ONLY` toggle for QA to assert blit‑only behavior (left out of default build to avoid surface area).
- Optional: Add a tiny guard to skip/stride HUD/minimap for 1–2 frames if `worst:other` > ~12ms during diagnosis (keep OFF by default).

## Next Session Plan
1. Validate long‑run play: confirm `worst:other` remains low/rare; capture a couple samples if not.
2. Tune TargetCam thresholds (`angleEps`, `minIntervalMs`) only if QA notices stutter/lag in silhouette updates.
3. Optional diagnostic: temporarily enable `UPDATE_PROF_LOG` to confirm update isn’t contributing to “other”.
4. Optional: add a short‑lived “other‑spike guard” (minimap/HUD stride for 1–2 frames) toggled via a debug flag.

## Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`, `SESSION_CADENCE.md`, `AGENTS.md`.
- Key files: `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/RenderSystem.js`, `docs/js/systems/SpriteMappings.js`.
- Fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used (reset before end)
- `TC_SHOW_PATH`, `TC_WARM_MS`, `DEBUG_SPRITES='errors'`. Keep `TC_FX` OFF by default.
- Profilers (diagnosis only; OFF by default): `RENDER_PROF_LOG`, `RENDER_PROF_OVERLAY`, `UPDATE_PROF_LOG`, `UPDATE_PROF_OVERLAY`.
- Render auto profiler: `RENDER_PROF_AUTO_ENABLED` (disabled by default).
- Spawn/save logs: `DEBUG_SPAWN`, `DEBUG_SAVE` (disabled by default).

## Build / Version Notes
- TargetCam logs a minimal init line: `[TargetCam] init { build: <ISO>, warmMs: <num> }` unless `TC_SILENT` is set.
