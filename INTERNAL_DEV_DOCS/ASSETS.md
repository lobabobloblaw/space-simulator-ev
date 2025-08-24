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
  - Loads from `docs/js/assets/explosion.json` → `{ fps, frames[] }`.
  - Fallback: synthesized 6‑frame sequence from effects atlas.

- Standalone sprites (ships)
  - Optional `sprites.json` manifest; additionally preloads known ship PNGs by id.
  - Stored at `state.assets.sprites[id] = { image, w, h }`.

## Sprite Paths & CORS

- Paths are resolved relative to module URLs; direct loads set `crossOrigin = 'anonymous'` to avoid canvas tainting.
- `toWhiteMaskCanvas` creates a temporary canvas to colorize silhouettes; when unavailable, in‑place `source-in` tint is used.

## Future Convenience

- `AssetSystem.getFrameCanvas(id)` (proposed): provide per‑frame canvases to avoid sub‑rect handling in renderers.
