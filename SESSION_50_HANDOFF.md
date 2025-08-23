# Session 50 Handoff — Sprites, Explosions, Debris (Pure EventBus)

Overview
- Architecture: Pure EventBus; state is centralized in `StateManager`; systems communicate via events only; no window globals.
- Entry: `docs/js/main_eventbus_pure.js`.
- Goal this session: stabilize sprite rendering, add cinematic explosions, and introduce debris for hits and destructions — while keeping silhouettes as fallback.

Key Outcomes
- Sprites
  - Stable PNG sprite drawing for player/NPC with vector fallback when sprites are unavailable.
  - Transform safety: all sprite draws use `ctx.save()/finally{restore()}`; no leaked transforms.
  - Orientation: global `spriteRotationOffset = +90°` (art faces up → nose right).
  - Size: global `sizeMultiplier = 1.25`; NPC type scales retained for vectors; sprites size by pixels with matching target sizing.
  - Debug logs only when `window.DEBUG_SPRITES === 'verbose'` (throttled).

- Assets
  - Procedural placeholder atlas (ships) and effects atlas (thruster/explosion) generated in `AssetSystem`.
  - Standalone ship PNGs load via `docs/js/assets/sprites.json`.
  - Flipbook explosion loader via `docs/js/assets/explosion.json` — supports 98× PNG frames at 277×199; auto-scales to explosion size; FPS boosted for snappier playback.

- Explosions & Impacts
  - Ship/NPC destruction: pre-destruction flicker/glow with early ship fade-out (≈60%), then layered explosion: core flash, shockwave, embers, gradient rings, flipbook overlay, screen shake.
  - Ship–asteroid impacts: explicitly tagged and rendered as small pops (tiny radius/lifetime, no shockwave, no flipbook), clearly smaller than ship deaths.
  - Flipbook overlay is skipped for `exp.isImpact` and tiny blasts.

- Debris
  - Projectile hits: spawn 2–4 small triangular shards (spin, fade) at impact; color derives from target when available.
  - Final explosions: eject 4–10 irregular polygon chunks (asteroid-like) with angular momentum and longer lifetimes.
  - Debris is pooled under `state.pools.debris` and rendered via `RenderSystem.renderDebris` with culling and alpha fade.

- Stability
  - Removed magenta placeholders; fallbacks are purely vector silhouettes.
  - Culling and effects overlay are opt-in (disabled by default) and can be toggled later without regressions.

Important Files
- `docs/js/systems/RenderSystem.js`
  - Sprite rendering, flipbook overlay, explosion visuals, debris render, destruct sequences.
  - Knobs: `sizeMultiplier`, `spriteRotationOffset`.
- `docs/js/systems/AssetSystem.js`
  - Procedural placeholder/effects atlases; standalone PNG sprites; explosion flipbook loader (`docs/js/assets/explosion.json`).
- `docs/js/systems/SpawnSystem.js`
  - Explosion creation (sizes, lifetimes, impact flag, layered blasts), debris spawn (hits and deaths), screen shake.
- `docs/js/systems/PhysicsSystem.js`
  - Ship–asteroid impact emits `EXPLOSION` with `impactKind: 'ship-asteroid'` for small-pop rendering.
- `docs/js/systems/NPCSystem.js`
  - Deferred NPC death (destruct sequence) before removal.
- `docs/js/systems/UISystem.js` & `docs/css/main.css`
  - Tutorial hint simplified to `WEAPONS OFFLINE/ONLINE` in white; removed control text.

Toggles & Debug
- `render.useSprites` (overlay button) — enable/disable sprites.
- `state.renderSettings.spriteCulling` (default OFF) — gentle margin culling (opt-in).
- `state.renderSettings.useEffectsSprites` (default OFF) — opt-in thrust flame atlas overlay.
- Logging only when `window.DEBUG_SPRITES === 'verbose'`.

How to integrate a custom explosion flipbook
1) Place frames under `docs/assets/explosions/` (e.g., `explosion_000.png` … `explosion_097.png`).
2) Create/adjust `docs/js/assets/explosion.json` with `{ "fps": 24, "frames": [ "./assets/explosions/explosion_000.png", ... ] }`.
3) AssetSystem auto-loads and uses it for ship/NPC deaths; impacts (ship–asteroid) skip flipbook.

Open Items / Next Steps
1) Debug overlay toggles for `spriteCulling` and `useEffectsSprites` with persisted state.
2) Apply thruster effects atlas to the player (opt-in) with quality-aware stepping.
3) Asteroid destruction variant: dusty debris burst & rock shards on `asteroid.destroyed`.
4) Per-ship orientation overrides (map of type → offset) atop global `spriteRotationOffset`.
5) LOD & perf: skip flipbook on Low, reduce debris counts on mobile.
6) Audio polish: destruct crackle; larger boom for large explosions.

Testing Cheatsheet
- Toggle sprites in overlay; verify no transform jitter, correct orientation, and vector fallback.
- Kill NPC/player: observe destruct flicker → early ship fade → big explosion with flipbook and debris.
- Collide with asteroid: observe small pop (no shockwave/flipbook) vs ship death.
- Confirm `Sprites: ON/OFF • Loaded: N` shows expected count after asset load.

Handy knobs (in code)
- `RenderSystem.sizeMultiplier` — 1.25 (global ship size).
- `RenderSystem.spriteRotationOffset` — `Math.PI/2` (+90°).
- Flipbook speed/scale — see `SpawnSystem.handleExplosion` (fps multiplier and scale factor).

