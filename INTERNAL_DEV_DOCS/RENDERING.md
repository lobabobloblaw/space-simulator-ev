# INTERNAL — Rendering Guide
# For development and AI sessions only (not published)

RenderSystem is the single place that draws to the main canvas. It performs two space‑separated passes and maintains strict context hygiene.

## Spaces

- World space: camera‑relative draw calls; use `withWorld` helper.
- Screen space: identity transform; use `withScreen` for HUD/overlays.

## Hygiene

- At frame start: reset transform and key context fields (`setTransform(1,0,0,1,0,0)`, `globalAlpha=1`, `shadowBlur=0`, etc.).
- Every draw section: wrap in `save()`/`restore()`; do not rely on ambient context state.
- Pixel sprites: do not scale the context; compute `dw/dh` based on target pixel size and draw at identity.

## TargetCam

- Canvas: `#centerViewportCanvas` within the HUD right panel.
- Visuals: Direction ring/wedge + white silhouette of the selected NPC.
- Silhouette colorization: `toWhiteMaskCanvas(src, dw, dh, sx?, sy?, sw?, sh?)` → `#e8f6ff` tint preserving alpha.
- Safe tint fallback: If offscreen mask fails, fallback uses in‑place `source-in` tint.

### Source Resolution (deterministic, upgrade‑only)

The TargetCam selects exactly one source per selected NPC and only upgrades quality; it never downgrades or mixes paths within a selection.

Order:
1) Direct PNG (on‑demand) — world‑matching orientation
2) Preloaded PNG (registry)
3) Standalone PNG (manifest)
4) Atlas frame (placeholder)
5) Baseline (minimal vector/oval)

Warm‑up: after `TARGET_SET`, atlas/baseline fallbacks are suppressed for ~450ms. During this grace period, if no PNG source is ready, the silhouette is omitted rather than drawing a mismatched fallback. Toggle via `window.TC_WARM_MS`.

### Orientation

- Use `SpriteMappings.js`: `typeToSpriteId`, `aliasSpriteForType`, `spriteRotationOffset`, and optional fine‑tuned per‑sprite overrides.
- PNG (up‑authored): outer rotate `npc.angle`, inner rotate `+spriteRotationOffset` (+90°) plus per‑sprite nudge if any.
- Atlas/baseline (nose‑right): outer rotate `npc.angle` only (no inner offset).

### Stability Guards

- Hard reset of TargetCam context each frame (transform, alpha, composite) before clearing.
- Deterministic source resolution per NPC with upgrade‑only logic; no per‑frame path mixing.
- Warm‑up window suppresses mismatched fallbacks during transitions.
- Static/scanline FX are off by default (toggle via `window.TC_FX = true`).

### Strict Buffer‑Blit (Session 55)

- TargetCam maintains a persistent offscreen buffer for the silhouette. The per‑frame render path only blits this buffer (plus ring/wedge/FX) and applies the outer `npc.angle` rotation.
- Silhouette re‑tint/build is scheduled off the render phase (post‑rAF microtask) and never runs on heavy frames (guarded by `window.__lastFrameMs > 24`).
- Rebuilds are strictly event/threshold‑driven: on target change, `|Δangle| ≥ ~0.12rad`, or `≥ ~90ms` elapsed since last build. Warm‑up guard still suppresses atlas/baseline until it expires.
- PNG paths bake the +90° inner rotation into the buffer; atlas/baseline use only the outer rotation.

## Effects

- ExplosionRenderer: Uses flipbook if available, otherwise synthesized puffs.
- ThrusterFXRenderer: Optional flame overlay from effects atlas; controlled by `render.useEffectsSprites`.
- Ore pickups (Session 63/64): visuals are driven by `GameConstants.EFFECTS.PICKUPS` (core/glow radii, glitter size/alpha/line width) and `PICKUP_PULSE_SPEED`. Low‑quality path draws only a tiny core. These are drawn in world space inside `withWorld()` by `renderPickups()`.

## Planets

- Renderer selection is gated via `GameConstants.UI.PLANETS.MODE` (default `'procedural'`).
- Modes:
  - `procedural`: uses `ProceduralPlanetRenderer` (noise‑based with caching).
  - `sprites`: uses `PlanetSpriteRenderer` (draws preloaded images; falls back to a shaded disc if not ready).
- QA override: `window.USE_PLANET_SPRITES = true|false` forces mode at runtime.
- Asset path convention for sprites: `assets/planets/<slug>.png` (slug = lowercased planet name with spaces → `_`).

## HiDPI/Retina Notes

- Current state: canvases are initialized at CSS pixel resolution. On HiDPI (e.g., macOS Retina), this can produce slight blur because the canvas backing store is not scaled by `devicePixelRatio`.
- Planned update (safe, minimal):
  - On init and resize, set canvas.width/height to `clientSize * dpr`; keep CSS size unchanged.
  - Apply a global `ctx.scale(dpr, dpr)` inside `withScreen` and `withWorld` before other transforms, so all world/screen math remains in CSS pixels.
  - Keep the “no scaling for pixel sprites” rule for asset sizing logic; the DPR scale is a physical backing‑store scale, not a per‑sprite transform.
  - Ensure `imageSmoothingEnabled=false` for pixel art layers to preserve crisp edges.
  - Extend to sub‑canvases (minimap, TargetCam) similarly.
  - Verify HUD text sizes still look correct (CSS pixels remain the logical units).

## Quality & Boot Ramp (Session 59/62)

- Auto quality: Enabled by default (unless `window.RENDER_AUTO_QUALITY === false`). Degrades quickly on repeated over‑budget frames and recovers slowly.
- Stars: On `medium` and `high`, far/mid/near now render every frame for consistent brightness; blur remains enabled only on `high`. On `low`, far layer only (no blur). Nebula draws only on `high`.
- Boot ramp: For ~3s after boot (`window.BOOT_QUALITY_MS`, default 3000):
  - Force `quality='medium'`.
  - Skip minimap draw and screen‑space HUD overlays.
  - Skip planet labels/distance text.
  This avoids initial composite/raster spikes; the ramp expires automatically.
  - Optional first‑paint star stride: skip first N star passes with `window.STAR_BOOT_SKIP = N` (or `QA.starBootSkip(N)`), default 0.

### Pixel Sprite Sizing (Session 62)

- Do not vary pixel sprite dimensions by quality (low/medium/high). Keep `dw/dh` independent of the quality tier to avoid size “pops” when the boot ramp ends.
- A global `sizeMultiplier` may be used for game‑wide tuning, but it must be constant across quality levels.

## Minimap & HUD (Soft UI)

- Minimap is throttled to ~30Hz internally and can be skipped by the “other‑spike guard”.
- During boot ramp, minimap/HUD are skipped for a short window to minimize early paints.

## Debugging

- Minimal diagnostics: `window.DEBUG_SPRITES = 'errors'` logs only TargetCam failures; `'verbose'` adds informational reasons.
- Render Lint toggles live under `state.debug.*` (where present). Keep OFF in production.
 - Quick reference: see `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md` for a consolidated list of QA/debug toggles.

### Renderer Selection (Spike Only)

- Default renderer: Canvas2D `RenderSystem`.
- Optional WebGL spike (OFF by default): enable via `?webgl=1` in the URL, or `localStorage.setItem('RENDER_WEBGL','1')` before load. Disable via removing the query and `localStorage.removeItem('RENDER_WEBGL')`.
- Scope: current WebGL spike draws simple GPU primitives for player/NPC/projectiles; HUD/TargetCam/minimap remain on existing paths.

### Optional Guards (QA only)

- Other-spike guard (off by default): set `window.RENDER_OTHER_GUARD = true` to temporarily stride/skip soft UI (minimap + HUD) for 1–2 frames when the render profiler attributes a spike to the `other` bucket.
  - Threshold: `window.RENDER_OTHER_GUARD_MS = 12` (ms) — frames with `other > threshold` will arm the guard for the next frame(s).
  - Duration: `window.RENDER_OTHER_GUARD_N = 1` — number of subsequent frames to skip. Keep small (1–2).
- Scope: only affects minimap and HUD draws; world and TargetCam remain unaffected.

### LongTask Tracing (QA only)

- `QA.longTasks(s)`: start a `PerformanceObserver('longtask')` and warn on each entry.
- `QA.ltTrace(true)` (or `?lt=1` in URL): arms a lightweight phase marker ring buffer; longtasks log an `[LTTrace]` payload and `[LTTraceStr]` tail showing recent phases: `u:<system>`, `ui:emit`, `r:start/end`, `save:tick`.
- UI long‑task guard (opt‑in): `QA.uiGuard(true)` skips a UI emission briefly after a longtask to break bursty patterns.

## CSS & HUD Effects

- Default HUD uses “light” mode (`body.ui-light`): backdrop blur and sweep animations are disabled to avoid compositor cost.
- Opt‑in heavy mode (`body.ui-heavy` or `QA.uiHeavy(true)`): enables blur/animations; use sparingly during QA.
- Containment: prefer `contain: layout` (not `layout paint`) on HUD containers to allow children (e.g., radio dial) to paint beyond bounds.
- Panel underlays: TargetCam/Minimap canvases use alpha:true contexts and clear to transparent so the CSS radial gradient remains visible. Transitional static overlays are lightweight and can be disabled via `UI_PANEL_STATIC=false` (or `QA.panels(false)`).
- Tiny console readout: `#tutorialHint` now serves as a one‑line console. It fades in/out and mirrors `UI_MESSAGE`. Old tutorial “WEAPONS OFFLINE/ONLINE” banners are suppressed to keep this area dedicated to player messages.

### TargetCam QA Tuning

- Threshold overrides (OFF by default; set in console for QA):
  - `window.TC_ANGLE_EPS` — radians threshold to rebuild the silhouette buffer on angle change (default ~0.12). Sensible range: 0.02–0.6.
  - `window.TC_MIN_MS` — minimum milliseconds between buffer rebuilds (default ~90ms). Sensible range: 30–300.
- Warm‑up window: `window.TC_WARM_MS` (default ~450ms) continues to gate atlas/baseline before it expires.
