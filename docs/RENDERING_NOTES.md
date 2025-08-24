# Rendering Notes

This project renders in clear passes to avoid transform/composite leaks and to keep overlays predictable.

Passes
- Background (world): nebula, stars, planets
- World (camera space): asteroids, debris, NPCs, projectiles, ship, rings/shockwaves
- Overlay (screen space): explosion flipbook, HUD elements like the player health bar, target camera

Helpers
- `RenderHelpers.withWorld(ctx, camera, screenCenter, fn, shakeX, shakeY)`
  Applies camera+shake transform inside a save/restore; only pass code should set world transforms.
- `RenderHelpers.withScreen(ctx, fn)`
  Draws at identity transform in a save/restore; used by overlays.

Extracted Renderers
- `ExplosionRenderer` (world rings/shockwave + screen flipbook)
- `ThrusterFXRenderer` (player/NPC sprite thrusters; accounts for vector vs sprite scaling)

Quality policy
- `RenderQualityPolicy`: centralizes LOD gates for flipbook, ring counts, and spark counts.

Debug lint
- Enable debug overlay (TAB) and toggle "Lint" to log non-default canvas state at pass boundaries.
- Optional "Trace" button includes a stack trace to pinpoint the source of leaks.
## TargetCam Silhouette Playbook (Session 52)

- Objective: White, stable sprite silhouettes in the left viewport with zero drawImage errors and no vector fallback during normal play.
- Pipeline try-order (guarded):
  1. Standalone sprite (assets.sprites)
  2. Preloaded direct image (constructor ensures Image exists; on-demand ensure on miss)
  3. On-demand direct image (getOrLoadSprite)
  4. Cached per-frame canvas from placeholder `atlas.canvas`
  5. Atlas sub-rect masking (using `atlas.canvas` preferred; `atlas.image` allowed if ready)
  6. Tiny baseline frame (triangle/oval) as last resort
  7. Vector silhouette as absolute fallback only

- White-masking: `toWhiteMaskCanvas(src, dw, dh, sx?, sy?, sw?, sh?)` colors silhouettes to `#e8f6ff`, preserving alpha. All successful paths draw the mask with rotation and local save/restore.

- Hygiene:
  - Use `withWorld`/`withScreen`; never rely on ambient transform.
  - Wrap every draw in local `save()`/`restore()`.
  - Keep HUD-only draws (reticles, health bars) in screen-space and consolidated in HUDRenderer.

- Remaining polish (next):
  - Add a final guard `forceFromAvailable()` to ensure silhouettes never drop to baseline if any valid source exists.
  - Centralize type→spriteId + per-type orientation overrides.
  - Consider `AssetSystem.getFrameCanvas(id)` to avoid in-renderer sub-rect handling.

