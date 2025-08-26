# INTERNAL — Assets Guide
# For development and AI sessions only (not published)

## AssetSystem

Responsible for preparing atlases and loading sprites/effects into `state.assets`.

- Placeholder atlas
  - Generated on startup; exposes `atlas.canvas` and `frames` for immediate sub‑rect extraction.
  - Mitigates cold starts in TargetCam before standalone PNGs are ready.

- Effects atlas
  - Procedurally builds thruster/explosion puff frames.

- Explosion flipbook
  - Heavy sequence loads from `docs/js/assets/explosion.json` → `{ fps, frames[] }` (PNG frames). Deferred at idle (~12s by default) to avoid boot hitches.
  - Fallback: synthesized 6‑frame sequence from effects atlas; built lazily at idle (~1.5s) to keep the main boot path light.
  - QA toggles (set before reload):
    - `window.EXPLO_FALLBACK_DELAY_MS` (default 1500)
    - `window.EXPLO_FLIPBOOK_DELAY_MS` (default 12000)
    - `window.DISABLE_EXPLOSION_FLIPBOOK = true` to skip heavy flipbook load entirely.

- Standalone sprites (ships)
  - Optional `sprites.json` manifest; additionally preloads known ship PNGs by id.
  - Stored at `state.assets.sprites[id] = { image, w, h }`.

## Sprite Paths & CORS

- Paths are resolved relative to module URLs; direct loads set `crossOrigin = 'anonymous'` to avoid canvas tainting.
- `toWhiteMaskCanvas` creates a temporary canvas to colorize silhouettes; when unavailable, in‑place `source-in` tint is used.

## Future Convenience

- `AssetSystem.getFrameCanvas(id)` (proposed): provide per‑frame canvases to avoid sub‑rect handling in renderers.
