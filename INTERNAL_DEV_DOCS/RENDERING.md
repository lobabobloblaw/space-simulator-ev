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

## Starfield (tiles)

- Each layer (`far`, `mid`, `near`) is a small pre-rendered offscreen tile, blitted
  across the viewport **in screen space** at a modulo offset. ~33 `drawImage` calls a
  frame, replacing ~9,600 per-star `fillRect` calls, and the field is genuinely
  infinite (the old wrap band was anchored at the world origin, so the near layers
  thinned out past ~2,100 units — roadmap P5).
- Parallax comes from `GameConstants.WORLD.STAR_PARALLAX` and is read as *the fraction
  of camera motion the layer travels*: far 0.05 barely drifts, near 0.4 moves fastest
  but still slower than the world. (The old world-space code subtracted the parallax
  term, which made the layers travel at `1 + f` — faster than the planets behind them.)
- Layer tile sizes are deliberately different (640 / 512 / 448) so the three periodic
  grids never line up into a visible lattice.
- Blit offsets are floored to whole pixels: a fractional blit of a nearest-neighbour
  tile shimmers.
- Twinkle: the `mid` layer has three baked variants; each tile picks one from
  `state.effects.starPhase` (advanced by `VisualEffectsSystem`) plus a per-tile offset,
  so neighbouring tiles are never in step.
- Cache: `_starTiles`, keyed on quality + zone id + `starDensity` + star-array lengths.
  `_syncZoneTheme()` drops it on a zone change alongside the nebula and clear gradient.
- Star counts per tile are derived from the live `state.stars` arrays, so colour, size
  and brightness distribution stay exactly as authored; only the layout is re-tiled.
- Camera shake is applied to the tile offsets, so the backdrop shakes with the world.

## Screen-space overlay pass

- Per-NPC decorations (target bracket, AI state icon, chatter bubble, health bar) are
  drawn by `RenderSystem.renderNPCOverlays()` in **one** `withScreen` pass that runs
  *after* the whole world pass. They used to be drawn inside `renderNPCs`, i.e. before
  projectiles, explosions and warp FX painted over them (roadmap P10).
- Shake and screen space: `withWorld` translates by `screenCenter - camera + shake`,
  while screen-space overlays compute `p - camera + screenCenter`. `RenderSystem` keeps
  a second camera object, `_hudCamera = camera - shake`, and hands *that* to
  `HUDRenderer` and to `ExplosionRenderer`'s flipbook pass — so overlays land on exactly
  the same pixels as the shaken world instead of detaching during a shake.

## Who owns time-varying visual state

`RenderSystem` reads; it does not write simulation state (roadmap P11). Screen-shake
decay, damage-flash decay, asteroid spin and `shapePoints`, pickup sparkle seeds,
explosion spark angles and the star twinkle clock all advance in
`systems/VisualEffectsSystem.js`, on the 60 Hz fixed tick. Consequences worth knowing:

- These no longer run at display rate (they used to run twice as fast on a 120 Hz panel).
- They freeze while the game is paused, because the update loop skips paused frames.
- Asteroid `shapePoints` are seeded by every producer (world init, SpawnSystem
  fragments, save restore); the effects tick only backfills. `renderAsteroids` skips an
  asteroid with no silhouette rather than inventing one.

## Effects

- ExplosionRenderer: Uses flipbook if available, otherwise synthesized puffs.
- ThrusterFXRenderer: Optional flame overlay from effects atlas; controlled by `render.useEffectsSprites`.
  - Per-sprite anchors: twin/offset exhaust can be authored via `spriteThrusterAnchors` in `SpriteMappings.js`.
    - Anchors are normalized to `ship.size` in local ship space (after outer rotate).
    - When present, both vector wedges and FX overlays use the same anchors for perfect alignment.
    - Example: freighter (`ships/freighter_1`) uses two anchors at roughly ±1.16·size on Y for nacelle plumes.
- Ore pickups (Session 63/64): visuals are driven by `GameConstants.EFFECTS.PICKUPS` (core/glow radii, glitter size/alpha/line width) and `PICKUP_PULSE_SPEED`. Low‑quality path draws only a tiny core. These are drawn in world space inside `withWorld()` by `renderPickups()`.

## Planets

- Renderer selection is gated via `GameConstants.UI.PLANETS.MODE` (default `'procedural'`).
- Modes:
  - `procedural`: uses `ProceduralPlanetRenderer` (noise‑based with caching).
- `sprites`: uses `PlanetSpriteRenderer` (draws preloaded images; falls back to a shaded disc if not ready).
- QA override: `window.USE_PLANET_SPRITES = true|false` forces mode at runtime.
- Asset path convention for sprites: `assets/planets/<slug>.png` (slug = lowercased planet name with spaces → `_`).
- Per‑planet QA sprite swaps: Terra/Crimson have guarded static/animated sprite paths OFF by default. Enable via localStorage or query flags (see `planet_sprites.md`).
- Stability: planet sprite prep occurs off‑screen (decode + pre‑scale) and swaps only when ready; procedural draws until the cache is available.

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

- Auto quality: Enabled by default (unless `window.RENDER_AUTO_QUALITY === false`). Degrades quickly on repeated over‑budget frames (streak of 4; a >26ms frame counts double). Recovery needs 45 frames under 17ms and tolerates up to 2 slower frames inside that window (each costs 10 frames of progress; a third resets it).
- Stars: see **Starfield (tiles)** below. Quality still controls density (`low` thins each layer) and glow (`high` only); the zone theme's `starDensity` still scales count and alpha.
- Nebula: one 512×512 offscreen tile built per zone theme from `theme.nebulaColor` and blitted with a 5% parallax offset; drawn on `medium` and `high` (skipped on `low`). The cached clear‑gradient's bottom stop carries the same zone tint; both caches are dropped on zone change.
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

### Renderer Selection

- Canvas2D `RenderSystem` is the only renderer. The WebGL spike and its `?webgl=1` /
  `RENDER_WEBGL` flags were removed in Phase 1; see `TICKET_WEBGL_SPIKE.md` for why.

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
