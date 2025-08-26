# INTERNAL — Profiling Guide

This document summarizes the built‑in render/update profiling hooks, how to interpret them, and the toggles available during QA.

## Render Profiling

- Source: `RenderSystem.render()` computes a per‑frame breakdown and exposes `window.__lastFrameMs`.
- Buckets: `nebula, stars, planets, asteroids, pickups, debris, npcs, projectiles, muzzle, sparks, ship, shield, explosions, warp, debug, targetcam, minimap, hud`.
- Other bucket: Any unaccounted main‑thread time is attributed to `other` to surface DOM/GC/timers.
  - Expect a single early `other/self` ~50ms longtask near first paint on some systems (initial composite). The boot ramp reduces its impact; you can extend `window.BOOT_QUALITY_MS` during QA if needed.

### Toggles

- `window.RENDER_PROF_LOG = true` — log JSON payloads on frames > `RENDER_PROF_T` (default 20ms).
- `window.RENDER_PROF_OVERLAY = true` — overlay worst bucket and summary.
- `window.RENDER_PROF_T = 20` — spike threshold in ms.
- `window.RENDER_PROF_AUTO_ENABLED = true` — arm one‑shot detailed logs on spikes. OFF by default.
 - Quick reference: see `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md` for a consolidated list of QA/debug toggles.

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

## LongTask Observer & Phase Tracing

- `QA.longTasks(s)`: logs `[LongTask]` entries (name='self', duration, startTime; attribution often `unknown/window`).
- `QA.ltTrace(true)` or `?lt=1`: enables phase marks and prints `[LTTrace]` and `[LTTraceStr]` on each longtask with a recent phase tail:
  - `u:<system>`, `u:<system>:done` for EventBus updates
  - `ui:emit` → `ui:emit:done` for UI event emission
  - `r:start` → `r:end` for render
  - `save:tick` for autosave scheduling
- The last items in `[LTTraceStr]` help attribute hitches (e.g., ending with `r:end` suggests composite/paint after canvas render).

## Common Pitfalls & Hygiene (Session 62)

- Console logging is expensive. High‑rate logs (e.g., per projectile fired) will degrade performance, particularly with DevTools open.
  - Gate logs behind explicit flags (e.g., `window.DEBUG_WEAPONS = true`) and keep defaults OFF.
- Debug UI emissions should be opt‑in:
  - Only emit and collect floating damage numbers when the debug overlay is active and showing projectile info (`debug.enabled && debug.showProjInfo`).
  - Soft‑cap any debug arrays to avoid unbounded growth during long runs.
- Boot ramp side effects:
  - Keep sprite pixel sizes independent of quality to avoid size changes when the ramp ends.
  - Ensure star render cadence is consistent across medium/high to avoid brightness jumps.
