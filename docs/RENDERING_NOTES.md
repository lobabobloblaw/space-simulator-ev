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

