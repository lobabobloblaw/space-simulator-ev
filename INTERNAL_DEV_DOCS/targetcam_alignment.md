TargetCam Alignment Notes (Snap-Safe, DPR-Safe)

Summary
- Issue: At UI snap sizes (80→70→60px), TargetCam elements (ring, crosshair, gradient) drifted relative to the container center, depending on window size at game start.
- Root causes: CSS-vs-canvas centering mismatches, border-box vs content-box differences, and stale canvas backing store sizes on snap.

Key Changes
- Draw TargetCam backdrop (radial gradient) and crosshair lines in-canvas using the exact measured CSS center per frame.
- Force canvas to fill the container: `position:absolute; inset:0; display:block` to avoid baseline spacing and subpixel shifts.
- Switch panel chrome from `border` to `outline` to avoid center drift from border-box sizing.
- Round CSS sizes for backing stores and add per-frame resync when the panel’s CSS size doesn’t match `canvas.width/height` (DPR-aware).
- Pixel-center translation in CSS space via `ctx.setTransform(dpr,0,0,dpr,0,0)`; draw everything at `width/2, height/2` (CSS px).
- Static overlay: always-on faint static for subtle persistence; FX adds heavier static/rolling band.

Files
- CSS: `docs/css/main.css`
  - `#centerViewport` (TargetCam): outline used; no CSS crosshair/gradient (now in-canvas).
  - `#minimap` retains CSS crosshair/gradient.
  - `#centerViewportCanvas` absolute fill; no baseline spacing.
- TargetCam: `docs/js/systems/TargetCamRenderer.js`
  - Measures parent panel CSS `getBoundingClientRect()` each frame.
  - Resizes DPR backing store if mismatch.
  - Draws radial gradient + crosshair lines in-canvas before ring/wedge.
  - Renders static both baseline (low) and FX (higher) levels.
- RenderSystem: `docs/js/systems/RenderSystem.js`
  - Rounds panel CSS sizes for backing stores; added ResizeObserver to re-sync on snaps.

QA Tips
- Test at 80/70/60px by resizing and by starting the app at different window sizes.
- If any remaining nudge appears on a specific display/DPR, log `host.getBoundingClientRect()` and `canvas.width/height` to verify perfect parity.

