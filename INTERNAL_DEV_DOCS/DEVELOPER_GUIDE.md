# INTERNAL — Developer Guide
# For development and AI sessions only (not published)

This guide orients new contributors to the project’s architecture and day‑to‑day workflows.

## Start Here

- Read `ARCHITECTURE.md` for the big picture (EventBus + StateManager + RenderSystem).
- Skim `SYSTEMS_OVERVIEW.md` for responsibilities and key events.
- Use `RENDERING.md` and `ASSETS.md` for TargetCam and asset pipeline details.
- Follow `CONVENTIONS.md` to keep changes safe and predictable.

## Running Locally

- Serve `docs/` (e.g., `python3 -m http.server 8000`) and open `http://localhost:8000/docs/`.

## Useful Shortcuts

- X: Cycle target; Shift+X: Clear target.
- F3: Cycle render quality (high/medium/low).
- Debug toggles via events: `render.useSprites`, `render.spriteCulling`, `render.useEffectsSprites`.

## Debugging TargetCam

- Minimal diagnostics: `window.DEBUG_SPRITES = 'errors'` (warns only on failures).
- Optional FX: `window.TC_FX = true` to enable transient static/scanlines during transitions.
- On‑canvas path label: `window.TC_SHOW_PATH = true` (DIRECT/PRELOADED/STANDALONE/ATLAS/BASELINE).
- Warm‑up before fallbacks: set `window.TC_WARM_MS` (default 450ms) to suppress atlas/baseline during transitions.
- Deterministic source selection (upgrade‑only): direct → preloaded → standalone → atlas → baseline; one source per target.
 - Strict buffer‑blit: silhouettes are built off‑render into a persistent buffer (post‑rAF) and only blitted each frame. Heavy frames skip builds; baseline only shows during heavy frames when no buffer is ready and warm‑up has passed.

## HUD QA Toggles

- `window.HUD_SHOW_BUILD_TAG = true` — draw a small build tag in the top-right HUD.
- `window.HUD_BUILD_TAG = 'build:YYYY-MM-DDTHH:MM'` — optional override string for the tag.
- `window.HUD_SHOW_SAVE_SIZE = true` — append latest save payload size (KB) to the build tag. Off by default; populated after a save.

## UI Notifications

- The tiny console readout (bottom‑left, `#tutorialHint`) mirrors notifications and fades in/out. Top toasts are disabled by default to reduce noise.
- Toggle toasts for QA: `window.UI_TOASTS = true`.
- Suppressed legacy tutorial banners (“WEAPONS OFFLINE/ONLINE”) to keep the console area dedicated to notifications.

## UI/Images (Landing Overlay)

- `window.UI_LANDSCAPE_PROVIDER` — select image provider for planet landscapes in landing overlay:
  - `'unsplash'` (default): keyword photo source; typically fewer CORS issues.
  - `'lexica'`: prompt-based image search; may log CORS warnings when served from localhost.
  - `'auto'`: try lexica, then unsplash.
  - `'none'`: disable external image loads (uses canvas fallback).

## Spawn QA Toggles

- `window.SPAWN_TYPE_COOLDOWN_MS` — milliseconds to suppress spawning the same NPC type after that type dies (default ~6000).
- `window.SPAWN_PIRATE_SUPPRESS_MS` — milliseconds to suppress pirate spawns after any death event (default ~4500). Helps avoid perceived “pirate spawns from death” correlation during QA.

## Performance Toggles

- `window.RENDER_AUTO_QUALITY = true` — enable simple auto quality scaling based on frame time.
  - Degrades quickly on spikes (high → medium → low), recovers slowly when stable.
  - Affects explosion rings/flipbooks, projectile trails, shadows, and various effect densities.
- `window.RENDER_PROF_AUTO_ENABLED = true` — auto‑arm render profiler logging on spikes (OFF by default).
- Render profiler adds an `other` bucket that captures unprofiled main‑thread work (DOM, GC, timers) to help locate non‑render stalls.

### Boot Ramp

- `window.BOOT_QUALITY_MS` (default 3000): For this duration from boot, render quality is clamped to `medium`, and soft UI (minimap/HUD overlays) and planet labels are skipped to avoid first‑paint spikes.
- Optional star stride: `window.STAR_BOOT_SKIP = N` (or `QA.starBootSkip(N)`) skips the first N star passes to eliminate the very first composite cost on some platforms.

### HUD Effects (CSS)

- Default: `body.ui-light` (no blur/animations). Opt‑in heavy mode:
  - `QA.uiHeavy(true)` or add `ui-heavy` to body → enables blur/sweep animations.
  - `QA.uiLight(true)` ensures heavy effects are off.

### QA Helpers

- In console: `await import('./js/qaToggles.js')` (auto‑loaded on docs index) then use:
  - `QA.reset()` — clear toggles, prefer Canvas2D.
  - `QA.profile(s)` — brief render/update profiler overlay/logs.
  - `QA.longTasks(s)` — observe main‑thread longtasks.
  - `QA.ltTrace(true)` — enable phase tracing; `[LTTraceStr]` prints recent phases.
  - `QA.uiGuard(true)` — skip UI update briefly after a longtask.
  - `QA.uiLight(true)` / `QA.uiHeavy(true)` — toggle HUD effects.
  - `QA.boot(ms)` — set boot quality ramp window in ms.
  - `QA.starBootSkip(n)` — skip first n star passes after boot.
  - Autosave overrides: `QA.autosave(intervalMs, firstDelayMs, quietMs)` and `QA.autosaveOff()`.

## HUD + UI

- `UI_UPDATE` is throttled (~8–10 Hz) and HUD uses change‑only text updates to minimize DOM churn.
- Keep HUD diagnostics OFF in shipping builds. Enable briefly for QA only.
 - UI emission gates on light frames and backs off briefly if a tick is costly; UI long‑task guard is available via `QA.uiGuard(true)`.

## Making Changes Safely

- Never draw in the wrong space: world content via `withWorld`, screen overlays via `withScreen`.
- Guard all `drawImage` calls; clamp sub-rects and verify readiness of sources (image/atlas/canvas).
- If you add renderers, ensure save/restore scopes and transform resets match existing patterns.

## Constants

- Centralize tunables in `docs/js/utils/Constants.js` — avoid hardcoded durations/distances.
- Recent additions:
  - `TARGET_CAM`: warm-up, throttle, transition timings, build gating.
  - `NPC`: engage distances and message cooldowns; distress ranges; stand-down/reset.
  - `SPAWN`: same-type cooldowns, pirate suppression, brief post-death pauses.
  - `UI`: radio scan/lock timings, speed readout cadence, landscape fetch timeouts.
  - `WEAPONS`: per-type projectile lifetimes; recoil bloom max/decay/add; muzzle-flash caps (under `EFFECTS`).
  - `PHYSICS`: heavy collision warning threshold; landing clear distance; world bounds alias via `WORLD.ASTEROID_WORLD_SIZE`.

Defaults match current behavior; diagnostics stay OFF by default.

## Future Improvements (Backlog)

- AssetSystem.getFrameCanvas(id) helper and TargetCam refactor to consume it.
- Extract a dedicated `TargetCamRenderer` for isolation and testing.
- Consolidate remaining alias maps in world/player sprite path to `SpriteMappings.js`.
- Consider a first‑paint star stride to remove the last 50ms composite on certain platforms.
 - Centralize asteroid tier thresholds and ore yields in `GameConstants` for easy tuning.

## Legacy Systems

The legacy monolithic bundle has been removed:

- Removed file: `docs/js/systems/allSystems.js` (historical, non‑modular).
- Demo/backup pages were updated to load the modular entry (`js/main_eventbus_pure.js`).

Guidance:
- New work must use modular systems under `docs/js/systems/`.
- If you find stale references in experimental pages or scripts, replace with the modular entry or remove entirely.
