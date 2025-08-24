# Session 56 Handoff — FX hooks, HUD polish, spawn fixes, and TargetCam validation

## Summary
- Added a small, debug‑flagged guard that temporarily skips/strides soft UI (minimap + HUD) for 1–2 frames when render spikes are attributed to the "other" bucket. Kept default OFF. TargetCam buffer‑blit path and warm‑up/deterministic selection verified by code inspection; no orientation changes needed.

## Changes
- TargetCam & Rendering
  - docs/js/systems/RenderSystem.js
    - Introduced `this._otherGuard` and a guarded path that skips `renderMinimap` and HUD draws for N frames when `other` exceeds a threshold, controlled by debug flags (OFF by default).
    - Hooked guard arming into the existing render profiler breakdown where the `other` bucket is computed.
  - INTERNAL_DEV_DOCS/RENDERING.md
    - Documented the optional other‑spike guard and its toggles (`RENDER_OTHER_GUARD*`).
    - Added TargetCam QA tuning toggles for thresholds (`TC_ANGLE_EPS`, `TC_MIN_MS`).
- Spawn & NPCs
  - docs/js/systems/SpawnSystem.js: Added post‑death spawn damping window and same‑type suppression; wired `warp.effect.created`, `PHYSICS_SHIP_TAKEOFF`, and `SHIP_LANDED` to pooled warp FX so ships don’t blink on enter/exit.
  - docs/js/systems/NPCSystem.js: Removed scavenger spawns (feature disabled to reduce confusion).
  - docs/js/systems/WeaponSystem.js: Clamp NPC health to 0 and ignore damage during deathSeq; emit death once.
- Save safety & caches
  - docs/js/systems/SaveSystemAdapterFixed.js: Whitelist ship fields; prevent prototype pollution; record save size for optional HUD tag; filter out legacy `scavenger` entries on load.
  - docs/js/systems/RenderSystem.js, docs/js/systems/TargetCamRenderer.js: Soft caps on ad‑hoc sprite caches.
- HUD/UI polish
  - docs/css/main.css: Packed HUD left/radio by switching `.hud-container` to `justify-content: flex-start`; removed large gap.
  - docs/index.html + css: Added image logo (`docs/assets/logo.png`) with ASCII fallback; increased size and nudged up ~5px.
  - docs/js/systems/UISystem.js + css: Sequential notification queue (“rolodex” fade) replaces stacked toasts.
  - docs/js/systems/TradingSystem.js: Fixed `repEff` usage in `updateTradingUI()` (landing error).
  - docs/js/systems/UISystem.js: Default landing landscape provider to `'unsplash'`; added `window.UI_LANDSCAPE_PROVIDER` override; respect `'none'` to suppress external fetches.
  - INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md: Documented UI provider override and new spawn QA toggles.

## Verification Steps
- Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
- Clear toggles in console:
  - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT;`
  - `delete window.RENDER_AUTO_QUALITY; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.RENDER_PROF_AUTO_ENABLED;`
  - `delete window.UPDATE_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.DEBUG_SPAWN; delete window.DEBUG_SAVE;`
- Confirm TargetCam init log (once): `[TargetCam] init { build: <ISO>, warmMs: <num> }`.
- Fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
  - `window.TC_DEBUG = true; window.TC_SHOW_PATH = true;` (disable after quick checks)
  - Force each path while patrolling east:
    - direct/preloaded/standalone → PNG correct; cyan axis down; no flicker.
    - atlas/baseline → white silhouette horizontal; cyan axis right.
- Main: `http://localhost:8000/docs/`
  - Let it run 2–5 minutes without TargetCam; then use TargetCam repeatedly. Inspect `[RenderProfileStr]` occasionally (briefly enable `window.RENDER_PROF_OVERLAY = true`). TargetCam should not be the worst bucket; `other` should be low/rare.
  - Warm‑up checks: try `window.TC_WARM_MS = 300` and `= 500`. During warm‑up, PNG shows as soon as ready; otherwise silhouette omitted (no atlas/baseline). After warm‑up, fallbacks allowed and oriented nose‑right.
  - Optional guard check (diagnosis only; disable after):
    - `window.RENDER_PROF_OVERLAY = true; window.RENDER_OTHER_GUARD = true;`
    - Optionally tune: `window.RENDER_OTHER_GUARD_MS = 12; window.RENDER_OTHER_GUARD_N = 1;`
    - On frames where worst:other spikes, the next 1 frame should skip minimap + HUD draws (TargetCam/world unaffected).
  - Threshold tuning (QA only): briefly adjust and observe (then revert):
    - `window.TC_ANGLE_EPS = 0.10`
    - `window.TC_MIN_MS = 80`
    - Expect responsive silhouette updates without excessive rebuilds; restore defaults by deleting the vars.
  - Spawn/FX behavior:
    - Destroy several ships near player; no instant pirate replacement; depart/land/arrive effects appear rather than hard blink.
  - HUD/UI:
    - Left stats sit closer to radio; logo displays (image) and sits slightly higher; notifications appear one‑by‑one with a short fade.
  - Trading:
    - Land at Terra Nova; trading panel opens without console errors; rep modifiers apply.
  - Landing image provider:
    - Default Unsplash: should load quietly. To silence external fetches completely: `window.UI_LANDSCAPE_PROVIDER = 'none'` before landing.

## Acceptance Criteria
- Orientation: auto mode mirrors world heading; no 90° CCW mismatches across transitions.
- Warm‑up behavior:
  - During warm‑up: PNG appears as soon as ready; otherwise silhouette omitted (no atlas/baseline).
  - After warm‑up: fallbacks allowed if PNG missing; atlas/baseline oriented nose‑right.
- Forced modes unchanged:
  - direct/preloaded/standalone → PNG with cyan axis down (+90° inner baked in buffer).
  - atlas/baseline → white silhouette horizontal; cyan axis right.
- Performance:
  - No TargetCam‑dominated rAF frames; silhouettes do not flicker; no mask/canvas churn spikes.
  - Worst bucket is never TargetCam; worst:other remains low/rare during extended play and after TargetCam use.
  - HUD remains responsive (UI_UPDATE ~8–10 Hz); autosave has no visible hitches.

## Open Issues / Follow‑ups
- Continue real‑world validation for long sessions; if silhouette updates feel laggy, consider nudging `angleEps (~0.12)` or `minIntervalMs (~90)` slightly.
- If buffer size churn is observed per target, cap size growth more conservatively or clamp to initial square per target id.
- Optional: expose a minimal QA stat showing current save payload size (OFF by default) if requested.

## Next Session Plan
1. Run the fixture + main loop with `TC_WARM_MS` at 300 and 500 for transitions.
2. Capture a couple of `[RenderProfileStr]` samples during long‑run play; confirm TargetCam not worst and `other` low/rare.
3. Adjust TargetCam thresholds only if QA indicates (angleEps/minIntervalMs/warm).
4. Briefly validate the other‑spike guard works under `other` spikes; leave it OFF afterwards.
5. Ensure all toggles cleared; update docs if any thresholds change.

## Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`, `SESSION_CADENCE.md`, `AGENTS.md`.
- Key files: `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/RenderSystem.js`, `docs/js/systems/SpriteMappings.js`.
- Fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used (reset before end)
- TargetCam: `TC_SHOW_PATH`, `TC_WARM_MS`, `DEBUG_SPRITES='errors'` (kept OFF by default), `TC_FX` OFF.
- Profilers (diagnosis only; OFF by default): `RENDER_PROF_LOG`, `RENDER_PROF_OVERLAY`, `RENDER_PROF_T`, `RENDER_PROF_AUTO_ENABLED`.
- Update profiler (diagnosis only; OFF by default): `UPDATE_PROF_LOG`, `UPDATE_PROF_OVERLAY`.
- Optional guard (diagnosis only; OFF by default): `RENDER_OTHER_GUARD`, `RENDER_OTHER_GUARD_MS`, `RENDER_OTHER_GUARD_N`.
- TargetCam QA tuning (OFF by default): `TC_ANGLE_EPS`, `TC_MIN_MS`.
- Spawn QA (OFF by default): `SPAWN_TYPE_COOLDOWN_MS`, `SPAWN_PIRATE_SUPPRESS_MS`.
- UI Provider: `UI_LANDSCAPE_PROVIDER = 'unsplash'|'lexica'|'auto'|'none'` (default `'unsplash'`).
- Noise logs: `DEBUG_SPAWN`, `DEBUG_SAVE` (keep OFF).

## Build / Version Notes
- TargetCam logs a minimal init line: `[TargetCam] init { build: <ISO>, warmMs: <num> }` unless `TC_SILENT` is set.
