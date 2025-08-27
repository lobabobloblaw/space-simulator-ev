HiDPI (DPR) Integration Notes

Overview
- All on-screen canvases now size backing stores by `devicePixelRatio` (clamped 1..3) while preserving gameplay units in CSS pixels.
- World and HUD draws run through `withWorld`/`withScreen`, which apply a top-level DPR scale only (no per-sprite scaling).
- Pixel sprites remain unsmoothed; planets explicitly enable smoothing.

Canvases
- Main `#gameCanvas`: CSS size = window inner size minus `--hud-reserve`; backing store = CSS * DPR.
- `#minimapCanvas` and `#centerViewportCanvas` (TargetCam): backing stores resized to element CSS size * DPR.
- Each canvas stores `canvas.__dpr` used by render helpers to set transforms.

Transforms
- `withScreen(ctx, fn)`: sets `ctx.setTransform(dpr,0,0,dpr,0,0)` then runs `fn()`.
- `withWorld(ctx, camera, screenCenter, ...)`: same DPR setTransform, then translates by `(screenCenter - camera + shake)` (CSS px).
- Frame boundaries still reset transforms (`setTransform(1,0,0,1,0,0)`), and every draw block save/restores.

Minimap / TargetCam
- Both clear in device pixels, then switch to CSS pixel transforms for drawing. Overlay static effects draw in device pixels.
- TargetCam uses strict buffer-blit as before; DPR only affects the outer draw space.

Input/UI Considerations
- Touch zones normalize with CSS pixel width/height (`canvas.width / canvas.__dpr`).
- HUD `drawBuildTag` computes width in CSS pixels.

Asset Authoring Guidance (recap)
- Ships (PNG nose-up; TargetCam adds +90° inner): author ~2× target draw sizes post-DPR.
  - Freighter ~140–160 px, Patrol ~100 px, Trader ~90 px, Pirate ~70 px target draw sizes.
- Planets: 1024–2048 px square, centered; file slug matches planet name (e.g., `terra_nova.png`).

Toggles
- Diagnostics remain OFF by default; TargetCam FX opt-in via `window.TC_FX = true`.
- Adjust TargetCam warm-up gate via `window.TC_WARM_MS`.

