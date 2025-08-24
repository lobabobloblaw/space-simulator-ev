# INTERNAL — Profiling Guide

This document summarizes the built‑in render/update profiling hooks, how to interpret them, and the toggles available during QA.

## Render Profiling

- Source: `RenderSystem.render()` computes a per‑frame breakdown and exposes `window.__lastFrameMs`.
- Buckets: `nebula, stars, planets, asteroids, pickups, debris, npcs, projectiles, muzzle, sparks, ship, shield, explosions, warp, debug, targetcam, minimap, hud`.
- Other bucket: Any unaccounted main‑thread time is attributed to `other` to surface DOM/GC/timers.

### Toggles

- `window.RENDER_PROF_LOG = true` — log JSON payloads on frames > `RENDER_PROF_T` (default 20ms).
- `window.RENDER_PROF_OVERLAY = true` — overlay worst bucket and summary.
- `window.RENDER_PROF_T = 20` — spike threshold in ms.
- `window.RENDER_PROF_AUTO_ENABLED = true` — arm one‑shot detailed logs on spikes. OFF by default.

### Spike Triage

- If worst is `targetcam`: investigate TargetCam warm‑up/selection; ensure buffer‑blit path is active; verify no rebuilds on heavy frames.
- If worst is `other`: consider temporarily enabling the “other‑spike guard” (below) and look for DOM/layout/GC or fetches.

### Other‑Spike Guard (OFF by default)

- `window.RENDER_OTHER_GUARD = true` — stride/skip minimap + HUD for 1–2 frames when `other` exceeds a threshold.
- `window.RENDER_OTHER_GUARD_MS = 12` — threshold in ms.
- `window.RENDER_OTHER_GUARD_N = 1` — number of guard frames.

## Update Profiling

- Source: `main_eventbus_pure.js` measures per‑system update time and logs `[UpdateProfile]` with a breakdown.
- Toggles: `window.UPDATE_PROF_LOG`, `window.UPDATE_PROF_OVERLAY`, `window.UPDATE_PROF_T`.

## Heuristics & Thresholds

- Heavy frame sentinel: `window.__lastFrameMs > 24` is treated as heavy; off‑render work (TargetCam buffer builds) is postponed.
- Target frame budget: ~16.7ms (60Hz). Spikes above ~24ms are user‑perceivable; use guard/toggles only for diagnosis.

