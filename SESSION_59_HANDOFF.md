# Session 59 Handoff — Boot + Runtime Hitches, HUD/Render Optimizations, QA Tools

Goal
- Eliminate periodic runtime longtasks and early boot hitches without harming TargetCam rules or render hygiene. Keep diagnostics OFF by default; maintain EventBus + StateManager purity.

What changed (high‑impact)
- UI update hardening (docs/js/main_eventbus_pure.js, docs/js/systems/UISystem.js)
  - Throttled UI_UPDATE now gates on light frames; adaptive backoff when a tick is costly; per‑frame HUD DOM updates removed (UI only via UI_UPDATE).
  - UI long‑task guard (opt‑in): skips UI emissions briefly after LongTask.
  - Exposes last UI tick cost: `window.LAST_UI_UPDATE_COST_MS`.
- QA helpers (docs/js/qaToggles.js)
  - New: `QA.uiLight()`, `QA.uiHeavy()`, `QA.uiGuard()`, `QA.ltTrace()`; existing `QA.longTasks()` observer.
  - UI_LIGHT defaults ON; heavy effects (blur/animations) behind `ui-heavy` class.
- RenderSystem tuning (docs/js/systems/RenderSystem.js)
  - Opaque, low‑latency 2D contexts; turn off image smoothing.
  - Cached background gradient (1×H → drawImage scale) to avoid per‑frame gradient construction.
  - Auto‑quality ON by default; stars stride + reduced blurs on medium; far‑only on low; nebula high‑only.
  - Boot ramp: force `quality='medium'` for ~3s (configurable via `window.BOOT_QUALITY_MS`); during ramp, skip minimap/HUD/planet text to avoid early paint spikes.
  - Thrusters/pickups: cheaper fallback on heavy frames.
  - Planets: world‑frustum cull; planet label/distance text gated (skip on ramp/heavy).
- Asset deferrals (docs/js/systems/AssetSystem.js)
  - Explosion flipbook: immediate tiny fallback moved off init; builds at idle after ~1.5s. Heavy 98‑frame flipbook loads lazily (~12s). QA toggles:
    - `window.EXPLO_FALLBACK_DELAY_MS` (default 1500)
    - `window.EXPLO_FLIPBOOK_DELAY_MS` (default 12000)
    - `window.DISABLE_EXPLOSION_FLIPBOOK = true` to skip heavy load entirely.
- Early LongTask trace (docs/js/main_eventbus_pure.js)
  - `?lt=1` enables an early PerformanceObserver to catch hitches pre‑loop; LT trace logs compact string `[LTTraceStr]` and stores payload in `window.LAST_LTTRACE`.
- Save parse at init (docs/js/main_eventbus_pure.js)
  - Removed duplicate JSON.parse for save‑loaded toast; uses a flag set during initial parse.
- CSS containment fixes (docs/css/main.css)
  - Containment changed to `contain: layout` on HUD and radio container to allow dial overflow. Radio dial layered above HUD chrome.

Defaults and toggles
- UI/HUD
  - Light HUD default: body carries `ui-light`; heavy blur/sweep animations opt‑in: `QA.uiHeavy(true)`.
  - UI throttle/backoff: override cadence via `window.UI_UPDATE_MS`; disable via `window.UI_DISABLE_UPDATE = true`.
  - UI guard: `QA.uiGuard(true)` enables brief UI skip after a longtask.
- Profiling
  - `QA.longTasks(s)` → `PerformanceObserver('longtask')` with attribution.
  - `QA.ltTrace(true)` or `?lt=1` arms phase marks: `u:<sys>`, `ui:emit`, `r:start/end`, `save:tick`.
  - Render/update prof overlays remain opt‑in (`RENDER_PROF_*`, `UPDATE_PROF_*`).
- Render
  - Auto‑quality default: ON (unless `window.RENDER_AUTO_QUALITY === false`).
  - Boot ramp window: `window.BOOT_QUALITY_MS` (default 3000). During ramp, minimap/HUD/planet labels temporarily skipped.
- Assets
  - Flipbook fallback/hvy deferral toggles listed above.
- Save/Autosave
  - UI update throttle in eventbus; autosave remains idle/light‑gated in adapter (`SAVE_*` knobs from prior sessions remain).

Verification map
- TargetCam correctness
  - Orientation: PNG sources with +90° inner rotation; atlas/baseline use outer angle only. Warm‑up (~450ms) suppresses atlas/baseline.
  - Deterministic source order; one source per target; strict buffer‑blit.
- Performance acceptance
  - Runtime: longtasks anchored after `r:end` are now rare; UI cost near 0ms; minimap/HUD not worst.
  - Early boot: a single ~50ms composite may still occur on first paint; mitigated by boot ramp and can be extended via `BOOT_QUALITY_MS`.
  - Heavy HUD effects do not clip and are OFF by default.

How to QA quickly
- Clear toggles, prefer Canvas2D: `QA.reset()`
- Optional: early tracing: load `?lt=1` → `QA.longTasks(30)`; confirm no bursty longtasks; any early single hit is post `r:end` and should be rare.
- Runtime trace (60–90s): `QA.ltTrace(true); QA.longTasks(60)`; verify that repeated `[LongTask]` bursts do not occur. If a burst appears, the last marks should not consistently end with `r:end`.
- HUD heavy effects regression: `QA.uiHeavy(true)` then `QA.longTasks(30)` — expect compositor cost to rise; switch off via `QA.uiHeavy(false)`.

Known follow‑ups
- Optional: Add a first‑paint “stars stride” ramp (skip 1–2 star passes) if an absolutely clean early boot is required.
- Optional: expose `BOOT_QUALITY_MS` in QA helpers.

Key files
- Render: `docs/js/systems/RenderSystem.js`, `docs/js/systems/TargetCamRenderer.js`.
- UI: `docs/js/main_eventbus_pure.js`, `docs/js/systems/UISystem.js`, `docs/js/qaToggles.js`.
- Assets: `docs/js/systems/AssetSystem.js`. 
- CSS: `docs/css/main.css` (containment and ui‑light/ui‑heavy classes).
- Internals: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/ASSETS.md` updated.

Notes for next agent
- Start with this handoff and `SESSION_CADENCE.md`. Keep diagnostics OFF by default; use QA toggles sparingly and revert. If you touch rendering, preserve space hygiene (withWorld/withScreen) and buffer‑blit discipline for TargetCam.

