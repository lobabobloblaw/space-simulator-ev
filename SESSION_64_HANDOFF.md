# Session 64 Handoff — Constants Consolidation (Asteroids + Pickups)

## Summary
- Centralized asteroid tier thresholds, child counts, shrink factor, and per-tier ore yields under `GameConstants.WORLD.ASTEROIDS` (defaults match current behavior).
- Centralized ore pickup visual sizes and glitter cadence under `GameConstants.EFFECTS.PICKUPS`; aligned `PICKUP_PULSE_SPEED` with current render path.
- Wired `SpawnSystem` and `RenderSystem` to consume the new constants. Game feel and visuals unchanged.
- VFX polish: When `window.VFX_DEBRIS_POLISH` is true, extended the molten warm fade to regular asteroid shards (not just 2x1 slivers). Defaults remain unchanged when the toggle is OFF.
- Fixed early-session exhaust plume pop: unified plume sizing across sprite/vector paths to avoid double-scaling during warm-up. Visual feel unchanged after assets warm; no initial size snap.
- Planet sprites scaffolding: added `PlanetSpriteRenderer` and a mode switch in `GameConstants.UI.PLANETS.MODE` (default `'procedural'`). QA override via `window.USE_PLANET_SPRITES`. Assets resolved under `assets/planets/<slug>.png`.
- Ship sizing centralization: added `SHIP.TYPE_SPRITE_SCALE` (per-type scale) and scaffolding for `SHIP.CLASSES` (nominal sizes, type→class). RenderSystem reads `TYPE_SPRITE_SCALE`; behavior unchanged.
- Refined tiny console messages for pickups to concise one-liners (e.g., “ORE +1”, “CARGO FULL — §+10”), and gated durations via `GameConstants.UI.CONSOLE_MESSAGE_MS`.
- Updated internal docs to reflect new constants and where they are used.

## Changes
- docs/js/utils/Constants.js
  - Added `WORLD.ASTEROIDS` with `THRESHOLDS`, `CHILD_COUNTS`, `FRAGMENT_SHRINK`, `ORE_YIELDS`.
  - Added `EFFECTS.PICKUPS` with sizes and glitter cadence; set `PICKUP_PULSE_SPEED` to `0.008` to match current visuals.
  - Added `UI.CONSOLE_MESSAGE_MS` (default 1200ms).
- docs/js/systems/SpawnSystem.js
  - Ore yields and tier thresholds now use `WORLD.ASTEROIDS.*`.
  - Child fragment count and shrink factor use `WORLD.ASTEROIDS.*`.
  - Pickup lifetime uses `EFFECTS.PICKUP_LIFETIME`.
  - Console messages for pickups simplified; durations use `UI.CONSOLE_MESSAGE_MS`.
- docs/js/systems/RenderSystem.js
  - `renderPickups()` now consumes `EFFECTS.PICKUPS` sizes, twinkle cadence, and `PICKUP_PULSE_SPEED`.
  - `renderDebris()` applies molten fade to shard triangles when `VFX_DEBRIS_POLISH` is ON; sliver behavior unchanged.
- INTERNAL_DEV_DOCS/
  - SPAWN_AND_FX.md: Documented new `WORLD.ASTEROIDS` and `EFFECTS.PICKUPS` constants.
  - SPAWN_AND_FX.md: Added `EFFECTS.DEBRIS` block and shard polish toggle behavior.
  - RENDERING.md: Noted pickup visuals now driven by `EFFECTS.PICKUPS` and pulse speed.
  - UI_NOTIFICATIONS.md: Mentioned `UI.CONSOLE_MESSAGE_MS` for console readout timing.

## Verification Steps
1) Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
2) Clear QA toggles: `await import('./js/qaToggles.js'); QA.reset(); QA.canvas2d();`.
3) Sanity passes (expect parity):
   - Asteroids: large (≥8) → 3 mediums; medium (≥5) → 2 smalls; smalls stop. Yields: large=2, medium=1, small=1. Adjust `GameConstants.WORLD.ASTEROIDS` to verify wiring, then revert.
   - Ore pickups: small/glitter visuals unchanged by feel; collecting shows concise console messages; cargo/credits update correctly. Pulse/twinkle cadence unchanged.
   - UI: Console line fades in/out; toasts remain OFF unless `UI_TOASTS=true`.
   - TargetCam: Warm-up and path selection unaffected.
4) Grep for literals follow-up: asteroid visuals and debris tuning still use inline ranges; candidates for later centralization if desired.
5) HiDPI sanity (known issue): On Retina/HiDPI, expect slight blur because the canvas backing store isn’t DPR‑scaled yet. See “Next Session Plan” for the planned fix.

## Acceptance Criteria
- New `GameConstants` keys exist for asteroid tiers/yields and ore pickup visuals; defaults match current behavior.
- Game behavior unchanged by feel (breakup pattern, ore yields, console timing/visuals).
- Toasts remain OFF by default; console readout remains primary.
- Internal docs updated accordingly.

## Next Session Plan
- Optional VFX polish: extend the molten fade/color ramp to regular shards when `VFX_DEBRIS_POLISH` is ON; consider constants for shard lifetimes/speeds.
- Optional: thin wrapper/helper for TargetCam to consume `AssetSystem.getFrameCanvasFromState` (no behavior change).
- Continue scanning for remaining tuned literals (NPC/FX distances) and stage safe centralization candidates.
- Implement HiDPI/DPR scaling for all canvases (main, minimap, TargetCam) with a global DPR transform integrated into `withWorld`/`withScreen` (no per‑sprite scaling). Re‑test crispness and HUD font sizes.
- Solidify planet sprite pipeline: optional manifest preload; confirm draw hygiene and fallback; finalize doc for asset naming/size guidance.

## Context / Links
- Start with this handoff and `SESSION_CADENCE.md`.
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/SPAWN_AND_FX.md`, `INTERNAL_DEV_DOCS/UI_NOTIFICATIONS.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`.
- Fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used
- None. Diagnostics remain OFF by default.
