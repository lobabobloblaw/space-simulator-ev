# Session 51 Handoff — Renderer Stabilization + FX + Lint

## Project Essentials
- Docs-first repo; site served from `docs/` (GitHub Pages: branch `main`, folder `/docs`).
- Pure EventBus architecture; all mutable state under `StateManager.state`.
- No window globals for system-to-system calls; use events.

## Rendering Principles (codified this session)
- Separate spaces:
  - World (camera space): stars/planets/asteroids/NPCs/ship, rings, shockwaves, sparks.
  - Screen (identity transform): explosion flipbook, HUD (player health), targetcam.
- Never rely on implicit canvas state. Always wrap draw in `ctx.save()`/`finally { ctx.restore(); }`.
- For pixel sprites, avoid context scaling; compute `dw/dh` explicitly.
- Use helpers to enforce boundaries:
  - `withWorld(ctx, camera, screenCenter, fn, shakeX, shakeY)`
  - `withScreen(ctx, fn)`

## Key Structural Changes
- `RenderSystem.js` now delegates:
  - `ExplosionRenderer` — world rings/shockwave, screen-space flipbook.
  - `ThrusterFXRenderer` — player/NPC FX plume (compensates for vector scaling; has procedural fallback).
  - `HUDRenderer` — screen-space HUD (player health bar moved here).
  - `RenderHelpers` — world/screen helpers.
  - `RenderQualityPolicy` — LOD decisions (flipbook on medium/high; ring/spark counts).
- Flipbook explosions are screen-space (fixes drift/jump).
- Player FX thruster clearly visible when ON; vector thrust remains.
- NPC thrust visuals always visible (idle glow when coasting; brighter when thrusting), independent of sprite scaling.

## Debug Lint (dev guardrails)
- Open Debug overlay (TAB). Buttons:
  - **Lint** — logs non-default canvas state at `post-world` and `end-frame`.
  - **Trace** — includes a stack trace with each lint line to pinpoint source.
  - **Reset** — auto-reset transform/composite/alpha/shadow/lineWidth to defaults on findings (dev-only convenience).
- Typical lint messages:
  - `non-identity transform a:…` • `composite=lighter` • `globalAlpha=…` • `shadowBlur=…`

## Lessons Learned (sprite issues root causes)
- Transform leaks: any missing restore or transform after errors leads to orbit/jitter and layers vanishing.
- Mixed spaces: drawing screen overlays in world space (or vice versa) caused drift when transforms changed mid-frame.
- Double-scaling sprites: combining context scale with pixel sprite scaling made thrusters/explosions appear tiny or huge.
- Fixes:
  - Screen flipbook; world rings/shockwave.
  - Pixel sprites: compute target `dw/dh`; do not scale the context.
  - Strict save/restore; helper-enforced world/screen boundaries.

## Toggles & Defaults
- `state.renderSettings.useSprites` — sprites ON by default.
- `state.renderSettings.spriteCulling` — culling (Debug → Toggle Culling).
- `state.renderSettings.useEffectsSprites` — player FX thrusters (Debug → Toggle FX).
- `state.renderSettings.useEffectsSpritesNPC` — NPC FX thrusters (default OFF; not exposed in overlay).
- Quality (F3) — `high`/`medium` (flipbook ON), `low` (flipbook skipped).

## Testing Checklist (quick)
- FX ON/OFF: player cyan plume (and short beam) shows only when ON; vector thrust always visible.
- NPC thrust: pirates show bright orange when thrusting; patrol/freighters show faint idle glow while coasting; brighter when thrusting.
- Explosions: flipbook overlays for ship/NPC deaths on medium/high; impacts skip flipbook.
- Lint: with Lint ON, no recurring warnings during typical play; Reset corrects accidental dev leaks.

## Files to Know
- `docs/js/systems/RenderSystem.js` — orchestrates passes; uses helpers and renderers.
- `docs/js/systems/ExplosionRenderer.js` — explosion visuals.
- `docs/js/systems/ThrusterFXRenderer.js` — FX thrusters; procedural fallback.
- `docs/js/systems/HUDRenderer.js` — screen-space player HUD.
- `docs/js/systems/RenderHelpers.js` — `withWorld`/`withScreen`.
- `docs/js/systems/RenderQualityPolicy.js` — LOD decisions.
- `docs/js/systems/DebugSystem.js` — overlay buttons, lint toggles.
- `docs/RENDERING_NOTES.md` — concise render architecture notes.

## Next Session Objectives (proposed)
- Convert any remaining identity-transform draws to `withScreen` and world draws to `withWorld`.
- Migrate any other HUD-like overlays into `HUDRenderer` (keep screen-space variants).
- (Optional) Lint enhancements: one-frame offender capture; lint counter in overlay.

## Acceptance Criteria
- No transform/composite leaks detected by lint during typical play.
- Stable FX/HUD/explosions with sprites ON/OFF and quality medium/high.

## Quick Commands
- Run locally: `python3 -m http.server 8000` → http://localhost:8000/docs/
- Debug overlay: TAB → toggles for Sprites/Culling/FX + Lint/Trace/Reset.
