Session 52 Handoff — TargetCam Silhouettes + Render Hygiene

Overview
- Goal: Make the TargetCam (left HUD viewport) show stable, white sprite silhouettes (no full-color, no vector fallback), while preserving render hygiene (helpers; save/restore).
- Result: White-masked silhouettes are in place with a guarded multi-source pipeline. Reticles now render only for the selected NPC. Diagnostics removed. A small final guard is proposed to completely eliminate rare baseline fallback.

Key Changes
- White silhouette mask: Added `toWhiteMaskCanvas(src, dw, dh, sx?, sy?, sw?, sh?)` in `docs/js/systems/RenderHelpers.js` to colorize any sprite or frame (whole image or sub-rect) to a white/cool tint (`#e8f6ff`).
- TargetCam (RenderSystem.renderTargetCam):
  - Try order: standalone → preloaded direct → on-demand direct → cached per-frame canvas (from `atlas.canvas`) → atlas sub-rect (masked) → tiny baseline → vector fallback.
  - Atlas safety: Prefer `placeholder.atlas.canvas` for immediate availability; sub-rects are masked offscreen before drawing.
  - Defensive guards: Validate image readiness and source/dest dimensions; clamp sub-rects; avoid drawImage errors.
- Reticles: Four-corner brackets now draw only for the selected NPC (`state.targeting.selectedId`).
- Render hygiene: Continued `withWorld`/`withScreen`, with per-draw `save()/restore()`. Damage flash moved to screen-space. HUD-only draws consolidated in `HUDRenderer`.

What Was Tricky
- Readiness timing: Standalone and direct images often load after the placeholder atlas. Early frames needed an atlas-first path or they fell through to baseline.
- drawImage brittleness: Any invalid source or rectangle triggers a fatal draw; all paths needed strict checks.
- Rare fallback: A small window remained where baseline could appear if a masked draw no-oped on that frame.

Proposed Final Guard (Next Session)
- Add a small `forceFromAvailable()` guard at the end of the silhouette attempts (just before baseline/vector).
- If any valid source is ready (standalone, preloaded, direct, atlas sub-rect), immediately draw a white-masked silhouette and `return` success. This removes rare baseline regressions without changing the visible style.

Refactor Suggestions
- Central alias + orientation: One module exporting type→`spriteId` and `spriteOrientationOverrides` used by both TargetCam and world sprites.
- AssetSystem helper: Provide `getFrameCanvas(id)` to return lazily cached per-frame canvases from any atlas; renderers no longer manage sub-rect extraction.
- Optional extraction: `TargetCamRenderer` class for viewport-only logic (white-mask silhouettes, scanlines/static overlays, wedge).
- SpriteResolver: A single resolver utility to standardize try-order across TargetCam and world sprite draws.

Testing Checklist
- Cycle all types (pirate, patrol, trader, freighter, interceptor): silhouettes are white; no baseline/vector under normal play.
- Immediately after load: silhouettes appear via atlas-first; later swap to standalone/direct when PNGs are ready.
- Console: no drawImage errors or warnings.
- Reticles: only on selected NPC.

Known Risks (Low)
- First-frame race: `forceFromAvailable()` guard will remove the last-mile baseline fallback.
- Orientation nuance: Add small per-type overrides if any ship feels slightly misaligned.

Touchpoints (for future edits)
- TargetCam silhouette logic lives in `docs/js/systems/RenderSystem.js` (renderTargetCam).
- White-mask helper: `docs/js/systems/RenderHelpers.js`.
- HUD-only drawings: `docs/js/systems/HUDRenderer.js`.
- Placeholder atlas generation/availability: `docs/js/systems/AssetSystem.js` (exposes `atlas.canvas`).

Recommended Order (Next Session)
1) Implement `forceFromAvailable()` guard in TargetCam and early-return on success.
2) Centralize alias/orientation mapping and refactor TargetCam to import it.
3) (Optional) Add `AssetSystem.getFrameCanvas(id)` and refactor TargetCam to rely on it.
4) (Optional) Extract `TargetCamRenderer`.

