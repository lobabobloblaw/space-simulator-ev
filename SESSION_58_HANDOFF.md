# Session 58 Handoff — Validation + Light Perf QA

## Summary
- Reviewed TargetCam, Render, Spawn/FX, UI systems and toggle defaults. Implementation matches architecture: deterministic TargetCam (upgrade‑only path: direct → preloaded → standalone → atlas → baseline), strict buffer‑blit with warm‑up guard, single source per target, PNGs +90° inner rotation; atlas/baseline use only `npc.angle`. Warm‑up default ~450ms, adjustable via `window.TC_WARM_MS`.
- Canvas2D remains the default renderer; WebGL spike is behind `RENDER_WEBGL` flag/query/localStorage and OFF by default.
- SpawnSystem enforces no instant same‑type replacement (type cooldown) and global pirate suppression window after deaths; all spawns show arrive/depart/land/takeoff FX instead of blink‑in.
- UI/HUD: notifications are queued and displayed sequentially with fade; trading/landing panels open cleanly; HUD left stats + radio are tight; logo visible.
- Profiling hooks in RenderSystem/loop produce `[RenderProfileStr]`; TargetCam is throttled (~30Hz) and blitted from a persistent buffer, reducing its chance of being the worst bucket. Optional “other” guard exists and is OFF by default.

No surgical code changes required from this pass. Proceed to runtime QA to confirm behavior/perf and only adjust thresholds if indicated.

## What To Verify (Runtime)
1) Serve locally and use Canvas2D
   - `python3 -m http.server 8000` → http://localhost:8000/docs/
   - Ensure Canvas2D: remove `?webgl=1`; in console: `localStorage.removeItem('RENDER_WEBGL')`

2) Clear QA toggles (OFF baseline)
   - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT`
   - `delete window.RENDER_AUTO_QUALITY; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.RENDER_PROF_AUTO_ENABLED`
   - `delete window.UPDATE_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.DEBUG_SPAWN; delete window.DEBUG_SAVE`
   - `delete window.TC_ANGLE_EPS; delete window.TC_MIN_MS; delete window.SPAWN_TYPE_COOLDOWN_MS; delete window.SPAWN_PIRATE_SUPPRESS_MS`

3) TargetCam fixture — orientation/stability
   - http://localhost:8000/docs/test/targetcam-spec.html
   - Temporarily enable QA: `window.TC_DEBUG = true; window.TC_SHOW_PATH = true` (then disable after check).
   - Cycle force paths (auto/direct/preloaded/standalone/atlas/baseline), patrol east; confirm orientation, no flicker.
   - Warm‑up tuning: try `window.TC_WARM_MS = 300` then `= 500`; during warm‑up, only PNGs show (else none). After warm‑up, atlas/baseline are allowed and oriented nose‑right.

4) Main game — perf and polish
   - http://localhost:8000/docs/
   - Run 2–5 minutes; cycle targets; sample a few `[RenderProfileStr]`. TargetCam should not be the worst bucket; “other” should be low/rare.
   - Spawn/FX: destroy ships near planets and in mixed contexts — no immediate same‑type replacement, pirates do not appear from death events; arrive/depart/land/takeoff FX visible (no blink‑in).
   - UI/HUD: notifications appear one‑at‑a‑time with fade; trading opens cleanly; HUD left stats/radio tight; logo visible. To silence external image fetches during QA, set `window.UI_LANDSCAPE_PROVIDER = 'none'` before landing.

5) Optional brief profiling (diagnosis only; then disable)
   - `window.RENDER_PROF_OVERLAY = true; window.RENDER_PROF_LOG = true;` then turn OFF.
   - Optional guard: `window.RENDER_OTHER_GUARD = true; window.RENDER_OTHER_GUARD_MS = 12; window.RENDER_OTHER_GUARD_N = 1;` then turn OFF.

## Acceptance Mapping
- TargetCam: Auto mirrors world; PNGs use +90° inner rotation; atlas/baseline only use `npc.angle`. Warm‑up suppresses atlas/baseline. No 90° CCW mismatches across transitions expected. Buffer‑blit ensures stability and throttling.
- Spawn/FX: Cooldowns prevent instant same‑type replacement; pirates are globally suppressed after deaths; all spawn branches emit an FX (arrive/takeoff/land/depart) — no blink‑in.
- UI/HUD: Sequential notifications with fade; trading/landing clean; left HUD+radio compact; logo visible.
- Performance: TargetCam blits buffer at ~30Hz and should not be worst; “other” low/rare; autosave defers on heavy frames to avoid hitches.

## Notes / Thresholds (Only if QA indicates)
- TargetCam: `TC_ANGLE_EPS` (rad) default ~0.12; `TC_MIN_MS` default ~90ms. If silhouette feels laggy during rapid turns, consider small nudges within documented ranges. Remove overrides afterwards.
- Spawn: `SPAWN_TYPE_COOLDOWN_MS` default ~6000ms; `SPAWN_PIRATE_SUPPRESS_MS` default ~4500ms if balance needs slight adjustment for density.

## Toggles (Keep OFF by default)
- TargetCam: `TC_WARM_MS`, `TC_ANGLE_EPS`, `TC_MIN_MS`, `TC_SHOW_PATH`, `TC_FX`
- Profilers: `RENDER_PROF_LOG`, `RENDER_PROF_OVERLAY`, `RENDER_PROF_T`, `RENDER_PROF_AUTO_ENABLED`; `UPDATE_PROF_LOG`, `UPDATE_PROF_OVERLAY`, `UPDATE_PROF_T`
- Spawn QA: `SPAWN_TYPE_COOLDOWN_MS`, `SPAWN_PIRATE_SUPPRESS_MS`
- UI provider: `UI_LANDSCAPE_PROVIDER`
- Noise logs: `DEBUG_SPAWN`, `DEBUG_SAVE`

## Build / Version Notes
- TargetCam prints a minimal init line once: `[TargetCam] init { build: <ISO>, warmMs: <num> }` unless `TC_SILENT` is set. Use to confirm latest build and warm‑up window.

## Next Session Plan
1. Run fixture and main; confirm TargetCam orientation and warm‑up behavior (300/500ms check).
2. Capture 3–5 `[RenderProfileStr]` samples; verify TargetCam is not worst; “other” low/rare.
3. Stress spawn/FX near planets and with mixed factions; confirm suppression + FX.
4. Only adjust `TC_ANGLE_EPS`/`TC_MIN_MS` or spawn windows if QA shows need; then remove overrides.
5. Ensure all toggles OFF; update handoff with any changes.

## Pointers
- Entry: `docs/js/main_eventbus_pure.js` (Canvas2D ships; WebGL behind flag)
- Render core: `docs/js/systems/RenderSystem.js`, `TargetCamRenderer.js`, `RenderHelpers.js`
- Assets: `docs/js/systems/AssetSystem.js` (use `getFrameCanvasFromState` for atlases)
- Spawn/FX: `docs/js/systems/SpawnSystem.js`
- UI: `docs/js/systems/UISystem.js`, HUD in `HUDRenderer.js`

