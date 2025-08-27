# Next Session Prompt — HiDPI + Planet Sprites + Ship Standardization (Session 65)

Use this prompt verbatim (or trim) to kick off the next session. It’s aligned with our internal playbook and cadence.

---

Context
- Architecture: EventBus-only comms; state in `StateManager.state`. Render hygiene: world via `withWorld`, HUD via `withScreen`, strict save/restore.
- TargetCam: deterministic, upgrade-only path (direct → preloaded → standalone → atlas → baseline); warm-up gate (~450ms; `TC_WARM_MS`); strict buffer‑blit.
- Assets: `AssetSystem` owns atlases and sprite preloads. Helpers: `getFrameCanvasFromState`, `getPlanetSpriteFromState`.
- Diagnostics: OFF by default; keep QA toggles opt-in.

What’s Landed (Session 64)
- Constants: Added `WORLD.ASTEROIDS`, `EFFECTS.PICKUPS`, `EFFECTS.DEBRIS`, `UI.CONSOLE_MESSAGE_MS`.
- Debris: molten fade extended to shards when `VFX_DEBRIS_POLISH` is ON.
- Spawn fix: create NPC before warp effect; added guards.
- Exhaust FX: removed early-session plume pop (gradient on medium/high).
- Planet sprites scaffolding: `PlanetSpriteRenderer` with mode switch in `UI.PLANETS.MODE` (default procedural), QA override `window.USE_PLANET_SPRITES`.
- Ship scales: centralized `SHIP.TYPE_SPRITE_SCALE`; scaffolding for `SHIP.CLASSES`.

Primary Goals (This Session)
1) HiDPI crispness:
   - Implement DPR-aware canvases (main/minimap/TargetCam): size backing store by `devicePixelRatio`; integrate a global scale into `withWorld`/`withScreen`.
   - Verify no change to gameplay units; maintain “no per-sprite context scale”.
   - Keep pixel sprites unsmoothed; allow smoothing where appropriate (planets).
2) Planet sprite pipeline:
   - Optional manifest preloading for planets; robust fallback handling; doc asset naming/radius guidance.
3) Ship standardization:
   - Introduce `ShipCatalog` (optional) mapping type→class→nominal sizes + default scales.
   - Wire `SpawnSystem` templates to read from catalog (behind defaults; no feel change).
4) QA + docs:
   - Verify crispness on Retina; document asset sizing guidelines; update handoff and internal docs.

Constraints
- Keep changes surgical; no feel changes.
- Diagnostics OFF by default.
- Follow existing rendering hygiene; only adapt where necessary (DPR).

Acceptance Criteria
- Retina displays render crisp: no soft blur from DPR mismatch; HUD sizes remain correct.
- Planet sprites draw via mode switch with graceful fallback; procedural unchanged by default.
- Ship size/scale references centralized; existing maps and values preserved.

Toggles
- `window.USE_PLANET_SPRITES = true|false` — force planet mode (default procedural).
- `window.VFX_DEBRIS_POLISH = true` — shard/sliver molten fade (default OFF).
- `window.UI_TOASTS = true` — enable floating toasts (default OFF).

Asset Authoring Guidance
- Ships: provide ~2x target draw sizes for crispness after DPR fix.
  - Freighter ~140–160 px, Patrol ~100 px, Trader ~90 px, Pirate ~70 px (target draw sizes; PNG nose-up; TargetCam applies +90°).
- Planets: 1024–2048 px square, centered; sprite slug matches planet name (e.g., `terra_nova.png`).

Key Files
- `docs/js/utils/Constants.js`
- `docs/js/systems/RenderSystem.js`, `RenderHelpers.js`
- `docs/js/systems/AssetSystem.js`, `PlanetSpriteRenderer.js`
- `docs/js/systems/SpawnSystem.js`, `TargetCamRenderer.js`
- Internal docs: `INTERNAL_DEV_DOCS/*`, latest `SESSION_*_HANDOFF.md`

---
