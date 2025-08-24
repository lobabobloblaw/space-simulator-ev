# Ticket — WebGL Spike (Flagged, OFF by default)

## Summary
Explore a low‑risk WebGL renderer path behind a feature flag to assess performance headroom and parity with current Canvas2D rendering. No change to defaults; Canvas2D remains the shipping path.

## Context
- Current renderer: Canvas2D with strict hygiene, deterministic TargetCam, and profiling hooks.
- Goal: Determine feasibility and benefit of WebGL batching for sprites/effects while preserving EventBus + StateManager and existing asset ownership (AssetSystem).

## Scope (Phase 1 — Proof of Life)
- Add `WebGLRenderSystem` (new module) that mirrors `RenderSystem` responsibilities for:
  - Player ship, NPCs, projectiles (sprite paths only)
  - Camera transforms (world vs screen containers)
- HUD/UI remain DOM/Canvas2D.
- Planets/stars/nebula/warp FX remain Canvas2D for this phase.
- AssetSystem: add a non-breaking helper `getTexture(id)` or `getGLTexture(id)` wrapper (optional; keep internal, do not expose toggles by default).

## Non‑Goals (Phase 1)
- No shader post‑FX, no overhaul of planets/nebula.
- No removal of Canvas2D; it remains the default fallback.
- No default toggles enabled, no build system changes.

## Toggle
- `window.RENDER_WEBGL = true` (OFF by default). When true, instantiate `WebGLRenderSystem` instead of `RenderSystem` in the entry point.

## Success Criteria
- With `RENDER_WEBGL = true`:
  - Player/NPC/projectile sprites render with correct orientation, depth order, and camera tracking.
  - Frame times comparable or better than Canvas2D on a mid‑tier device; no new spikes in `targetcam`/`other` buckets.
  - No functional regressions in input, physics, UI, or save/load.
- With flag OFF: identical behavior/perf to current master.

## Acceptance Checks
- Run main (`/docs/`) for 2–5 minutes; sample `[RenderProfileStr]` with both Canvas2D and WebGL flag.
- Cycle targets; verify TargetCam behavior unchanged (TargetCam remains Canvas2D in Phase 1).
- Destroy ships; ensure FX and gameplay responsiveness unaffected.

## Risks & Mitigations
- Texture upload stalls → preload textures early; keep Canvas2D fallback.
- Blend/tint parity differences → restrict Phase 1 to simple sprite draw + alpha blend; defer complex FX.
- Device compatibility variance → gate via flag; do not enable by default.

## Rollback
- Remove the flag usage or keep code path dormant; no changes to default path.

## Estimation
- Phase 1: 1–2 days engineer time for a credible spike (no default behavior change).

## Notes
- Only pursue beyond Phase 1 if profiling shows render‑bound spikes or if we need higher scene density/post‑FX.

