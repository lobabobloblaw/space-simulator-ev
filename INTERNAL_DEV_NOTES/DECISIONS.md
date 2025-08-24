# Decisions (Session 57)

- WebGL Spike: Added `WebGLRenderSystem` behind a flag (`?webgl=1` or `localStorage.setItem('RENDER_WEBGL','1')`), OFF by default. Canvas2D remains the default/ship path. Rationale: optional perf exploration only when render-bound.
- Spawn FX: Enforced brief arrival/takeoff FX on all spawns to eliminate blink‑in. Rationale: visual continuity and clarity.
- Autosave Guard: Defer autosave on heavy frames (`window.__lastFrameMs > 24`) with bounded retries to avoid visible hitches. Rationale: smoothness during long sessions.
- TargetCam Policy: Keep deterministic source selection + warm‑up guard; buffer‑blit only; optional thresholds (`TC_ANGLE_EPS`, `TC_MIN_MS`) left OFF unless QA indicates.
- Diagnostics: Keep overlays/logging OFF by default. Use briefly for QA only.

