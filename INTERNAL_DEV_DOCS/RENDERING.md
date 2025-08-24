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

## Debugging

- Minimal diagnostics: `window.DEBUG_SPRITES = 'errors'` logs only TargetCam failures; `'verbose'` adds informational reasons.
- Render Lint toggles live under `state.debug.*` (where present). Keep OFF in production.

### Optional Guards (QA only)

- Other-spike guard (off by default): set `window.RENDER_OTHER_GUARD = true` to temporarily stride/skip soft UI (minimap + HUD) for 1–2 frames when the render profiler attributes a spike to the `other` bucket.
  - Threshold: `window.RENDER_OTHER_GUARD_MS = 12` (ms) — frames with `other > threshold` will arm the guard for the next frame(s).
  - Duration: `window.RENDER_OTHER_GUARD_N = 1` — number of subsequent frames to skip. Keep small (1–2).
- Scope: only affects minimap and HUD draws; world and TargetCam remain unaffected.

### TargetCam QA Tuning

- Threshold overrides (OFF by default; set in console for QA):
  - `window.TC_ANGLE_EPS` — radians threshold to rebuild the silhouette buffer on angle change (default ~0.12). Sensible range: 0.02–0.6.
  - `window.TC_MIN_MS` — minimum milliseconds between buffer rebuilds (default ~90ms). Sensible range: 30–300.
- Warm‑up window: `window.TC_WARM_MS` (default ~450ms) continues to gate atlas/baseline before it expires.
