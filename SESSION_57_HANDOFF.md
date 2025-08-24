# Session 57 Handoff — Validation Prep, Code Audit, and QA Plan

## Summary
- Performed required doc review and audited TargetCam, Spawn/FX, and UI systems. Code matches architecture: deterministic TargetCam (upgrade‑only, warm‑up guard, strict buffer‑blit), spawn damping with pirate/type suppression, sequential UI notifications, and optional other‑spike guard (OFF by default). Implemented a small fix so all NPC spawns show a brief warp arrival/takeoff FX rather than “blinking” in. Prepared focused QA verification and tuning plan.

## Changes
- docs/js/systems/SpawnSystem.js: Ensured all spawn branches set a non‑null `spawnEffect` (usually `'arrive'`, `'takeoff'` near planet departures) so ships do not “blink” in. Keeps pooling and soft‑caps intact.
- Added this handoff to guide QA/next steps.

## Verification Steps
- Serve locally: `python3 -m http.server 8000` → open `http://localhost:8000/docs/`.
- Clear toggles in console:
  - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT;`
  - `delete window.RENDER_AUTO_QUALITY; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.RENDER_PROF_AUTO_ENABLED;`
  - `delete window.UPDATE_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.DEBUG_SPAWN; delete window.DEBUG_SAVE;`
  - `delete window.TC_ANGLE_EPS; delete window.TC_MIN_MS; delete window.SPAWN_TYPE_COOLDOWN_MS; delete window.SPAWN_PIRATE_SUPPRESS_MS`
- TargetCam fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
  - Temporarily: `window.TC_DEBUG = true; window.TC_SHOW_PATH = true` to confirm path/orientation; then disable.
  - Force each path (auto/direct/preloaded/standalone/atlas/baseline). Patrol east; confirm orientation and no flicker.
  - Try `window.TC_WARM_MS = 300` then `= 500`; confirm during warm‑up PNG shows as soon as ready; otherwise silhouette omitted (no fallback). After warm‑up, atlas/baseline allowed.
- Main: `http://localhost:8000/docs/`
  - Let run 2–5 minutes; cycle targets frequently; intermittently enable overlay to sample `[RenderProfileStr]`. TargetCam not worst; `other` low/rare.
  - Spawn/FX: destroy ships in varied contexts (near planets, mixed factions). No instant same‑type replacement; pirates do not appear from death events; arrive/depart/land/takeoff FX visible (no blink).
  - UI: notifications appear one at a time with fade; trading opens cleanly after landing; HUD left stats and radio close together; logo large and slightly elevated. To silence external image fetches, set `window.UI_LANDSCAPE_PROVIDER = 'none'` before landing.
- Optional profiling (brief only):
  - `window.RENDER_PROF_OVERLAY = true` to see worst bucket; disable afterwards.
  - `window.RENDER_PROF_LOG = true` to capture spike payloads; disable afterwards.
  - Other‑spike guard (diagnosis only): `window.RENDER_OTHER_GUARD = true; window.RENDER_OTHER_GUARD_MS = 12; window.RENDER_OTHER_GUARD_N = 1` — expect next 1 frame to skip minimap + HUD after an `other` spike; then turn OFF.

## Acceptance Criteria
- TargetCam orientation: auto mirrors world heading; no 90° CCW mismatches across transitions.
- Warm‑up: During warm‑up, PNG appears as soon as ready; otherwise silhouette omitted; after warm‑up, atlas/baseline allowed and oriented nose‑right.
- Spawn/FX: No immediate same‑type replacement after NPC kills; pirates do not appear out of destruction events; arrive/depart/land/takeoff FX visible (no blink).
- UI/HUD: Notifications are sequential with fade; left stats and radio sit close; logo shows large and slightly elevated; trading/landing clean with no console errors.
- Performance: TargetCam never worst render bucket; `other` stays low/rare; autosave/HUD remain responsive; no visible hitches.

## Open Issues / Follow‑ups
- Long‑run QA: If silhouette updates feel laggy under rapid turns, consider small nudge to `TC_ANGLE_EPS (~0.12)` or `TC_MIN_MS (~90)` within documented ranges and re‑verify.
- Monitor `other` spikes; the guard should remain OFF by default and used only for diagnosis.
- If any PNG loads are unusually slow on specific machines, keep warm‑up at 450–500ms; avoid allowing atlas/baseline early.

## Next Session Plan
1. Run TargetCam fixture and main loop; test `TC_WARM_MS` at 300 and 500.
2. Capture a few `[RenderProfileStr]` samples; verify TargetCam not worst; `other` low/rare.
3. Tune `TC_ANGLE_EPS`/`TC_MIN_MS` only if QA indicates; then revert/deactivate overrides.
4. Stress spawn/FX near planets and with mixed factions; confirm suppression and FX behavior.
5. Confirm UI notification sequencing and clean trading/landing; ensure all toggles are OFF afterwards.

## Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/SPAWN_AND_FX.md`, `INTERNAL_DEV_DOCS/UI_NOTIFICATIONS.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`, `SESSION_CADENCE.md`.
- Key files: `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/RenderSystem.js`, `docs/js/systems/SpawnSystem.js`, `docs/js/systems/UISystem.js`, `docs/js/systems/AssetSystem.js`, `docs/js/systems/SpriteMappings.js`.
- Fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used (reset before end)
- TargetCam: `TC_WARM_MS`, `TC_ANGLE_EPS`, `TC_MIN_MS`, `TC_SHOW_PATH`, `TC_FX`, `TC_DEBUG`, `TC_FORCE`, `TC_SILENT`.
- Profilers: `RENDER_PROF_LOG`, `RENDER_PROF_OVERLAY`, `RENDER_PROF_T`, `RENDER_PROF_AUTO_ENABLED`; `UPDATE_PROF_LOG`, `UPDATE_PROF_OVERLAY`, `UPDATE_PROF_T`.
- Spawn QA: `SPAWN_TYPE_COOLDOWN_MS`, `SPAWN_PIRATE_SUPPRESS_MS`.
- UI provider: `UI_LANDSCAPE_PROVIDER = 'unsplash'|'lexica'|'auto'|'none'`.
- Noise logs: `DEBUG_SPAWN`, `DEBUG_SAVE` (keep OFF).

## Build / Version Notes
- TargetCam logs on init: `[TargetCam] init { build: <ISO>, warmMs: <num> }` (unless `TC_SILENT`). Use this to confirm latest bundle loaded.
- Next agent should begin with this handoff plus `SESSION_CADENCE.md`, then run the fixture + main verification steps.
