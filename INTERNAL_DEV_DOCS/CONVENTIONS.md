# INTERNAL — Conventions & Ground Rules
# For development and AI sessions only (not published)

These rules keep systems decoupled and rendering stable.

- Events‑only: Systems communicate via `EventBus` events; avoid direct cross‑system calls.
- Single source of truth: All mutable state lives under `StateManager.state`.
- Render safety: Every draw block is `save()`/`restore()`; never rely on ambient context state.
- Pixel sprites: Don’t scale the context for sprites — compute `dw/dh` sizes explicitly.
- Spaces separation: World‑space draws use `withWorld`; HUD/overlays use `withScreen` (identity).
- Diagnostics off: Keep debug/diagnostic overlays OFF in production builds.

## Commit Style (general)

- Keep changes minimal and focused.
- Prefer fixing root causes to surface patches.
- Match existing code style; avoid inline commentary unless requested.
