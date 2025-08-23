# Next Session Prompt — Effects polish and performance (after Session 50)

Context
- Project: Galaxy Trader (`docs/js/main_eventbus_pure.js`) — Pure EventBus architecture.
- Rules: No globals; all state in `StateManager`; systems communicate only via EventBus; relative imports only.
- Rendering: Ships support sprite-based rendering with vector-silhouette fallback; explosion flipbook overlay; debris system; destruct sequences; audio, radio, targeting, viewport.

What’s in now (Session 50)
- Sprites: Stable draw path for player/NPC with `render.useSprites` toggle; per-frame transforms are leak-free; fallback to vector silhouettes when needed.
- Scaling/orientation: `sizeMultiplier` (1.25) and `spriteRotationOffset` (+90°) in `RenderSystem`.
- Assets: Procedural placeholder atlas; procedural effects atlas; standalone PNG sprites via `docs/js/assets/sprites.json`; flipbook loader via `docs/js/assets/explosion.json`.
- Explosions: Core flash, shockwave, embers, layered gradient; flipbook overlay for ship deaths; small pops for ship–asteroid impacts (flagged, no flipbook/shockwave); proximity screen shake.
- Debris: Small shards on projectile hits; irregular polygon chunks on final explosions; pooled + culled; rendered in `renderDebris`.
- Destruct sequences: Brief pre-explosion flicker/glow; ships fade out earlier in sequence (≈60%).
- Debug: Sprite logs only when `window.DEBUG_SPRITES === 'verbose'` (throttled). Overlay shows `Sprites: ON/OFF • Loaded: N`.

Knobs & toggles
- `state.renderSettings.useSprites` — ON/OFF (overlay button).
- `state.renderSettings.spriteCulling` — OFF by default (opt-in; gentle margin culling).
- `state.renderSettings.useEffectsSprites` — OFF by default (opt-in thrust flame atlas overlay).
- `RenderSystem.sizeMultiplier` — global ship size (1.25).
- `RenderSystem.spriteRotationOffset` — global sprite angle offset (+90°).
- Flipbook: `docs/js/assets/explosion.json` with `fps` and `frames` (PNG sequence under `docs/assets/explosions/`).

Open polish items (suggested next)
1) Add Debug overlay toggles for `spriteCulling` and `useEffectsSprites` with persisted state.
2) Apply effects thruster overlay to the player (currently NPC-only and opt‑in), plus quality-aware frame stepping.
3) Asteroid destruction variant: dusty gray debris burst and breakup shards on `asteroid.destroyed` (distinct from ships).
4) Per-ship orientation overrides (e.g., `typeOrientationMap`) for fine alignment beyond global `spriteRotationOffset`.
5) Performance profiling: measure flipbook cost on mobile/low‑end; add LOD (e.g., skip flipbook when off-center or low quality).
6) Save compatibility: ensure new state fields (`debris`, `explosionAnims`, pools) are ignored/cleared on load.
7) Audio hooks: add crackle/sizzle SFX during destruct sequence; stronger explosion SFX on large blasts.

Acceptance checks for next session
- Toggling culling/effects via overlay updates runtime behavior without glitches.
- Destruction feel: player/NPC destruct → timed glow, clean fade, then impactful blast (flipbook + debris).
- Asteroid impacts remain small pops; asteroid destruction looks dusty/rocky (not fiery like ships).
- FPS stable on Medium quality; Low quality steps flipbook frames and reduces particles.

Notes
- Maintain event-only interactions between systems; no cross-system calls.
- Keep CSS/DOM untouched except Debug overlay.
- Preserve silhouette rendering for center viewport regardless of sprite toggle.
