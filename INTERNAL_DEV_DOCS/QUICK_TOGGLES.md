# Quick Toggles (QA only; keep OFF by default)

TargetCam
- `window.TC_SHOW_PATH = true` — show active source label (turn OFF after quick check)
- `window.TC_DEBUG = true` — draw axes overlay in TargetCam
- `window.TC_WARM_MS = 450` — adjust warm-up window (~450ms default)
- `window.TC_ANGLE_EPS`, `window.TC_MIN_MS` — threshold overrides; sensible ranges: eps 0.02–0.6 rad; min 30–300 ms
- `window.TC_STATIC = false` — disable TargetCam transitional static/scanlines

Profiling
- `window.RENDER_PROF_OVERLAY = true` — overlay worst bucket
- `window.RENDER_PROF_LOG = true` — log spike payloads (threshold `RENDER_PROF_T`)
- `window.UPDATE_PROF_OVERLAY = true`, `window.UPDATE_PROF_LOG = true` — update profiler
- Optional guard: `window.RENDER_OTHER_GUARD = true; window.RENDER_OTHER_GUARD_MS = 12; window.RENDER_OTHER_GUARD_N = 1`

Spawn QA
- `window.SPAWN_TYPE_COOLDOWN_MS` — same-type suppression duration (ms)
- `window.SPAWN_PIRATE_SUPPRESS_MS` — pirate suppression after any death (ms)

VFX (Asteroids)
- `window.VFX_DEBRIS_POLISH = true` — enable molten warm fade on slivers and regular shards (OFF by default)

UI/Images
- `window.LANDING_ART_PROVIDER = 'none'|'lexica'|'pollinations'|'auto'` — default 'none' (procedural planet art, no network). Legacy alias: `window.UI_LANDSCAPE_PROVIDER`
- `window.UI_TOASTS = true|false` — force floating toasts on/off. Default: on for `warning`/`success`/`error`, off for `info` (console readout only)
- `window.RADIO_STATIC = false` — disable faint static inside the radio dial

Game feel (W2)
- `window.HITSTOP_OFF = true` — suppress hit-stop time-scale requests (player hit, boss death, boss phase). `GameLoop.timeScale` stays 1
- `window.DAMAGE_NUMBERS_OFF = true` — stop feeding `state.fx.damageNumbers` (nothing new is drawn; live entries expire in ≤700 ms)
- Hit-stop can also be driven by hand: `eventBus.emit('game.timescale.set', { value: 0.15, ms: 200 })`; `eventBus.on('game.timescale', d => …)` reports every change, and `stateManager.state.fx.timeScale` mirrors it
- OS reduced-motion is honoured automatically (`state.fx.reducedMotion`): hit-stop still fires, shake amplification does not

Planets (QA)
- Terra static sprite: `localStorage.setItem('gt.useTerraSprite','true')` (persist) or `?use_terra_sprite=1` (`?terra=1`)
- Crimson static sprite: `localStorage.setItem('gt.useCrimsonSprite','true')` or `?use_crimson_sprite=1` (`?crimson=1`)
- Ice World static sprite: `localStorage.setItem('gt.useIceSprite','true')` or `?use_ice_sprite=1` (`?ice=1`)
- Mining Station static sprite: `localStorage.setItem('gt.useMiningSprite','true')` or `?use_mining_sprite=1` (`?mining=1` / `?station=1`)
- Terra anim: `localStorage.setItem('gt.useTerraAnim','true')` or `?use_terra_anim=1`
- Crimson anim: `localStorage.setItem('gt.useCrimsonAnim','true')` or `?use_crimson_anim=1`
- Sprite badge: `window.SHOW_PLANET_SPRITE_BADGE = true` — draws a tiny `SP` above sprite planets

Renderer Spike (optional)
- WebGL spike: removed 2026-09 (see `TICKET_WEBGL_SPIKE.md`); Canvas2D is the only renderer.

Reset All (examples)
- `delete window.TC_SHOW_PATH; delete window.TC_DEBUG; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.UPDATE_PROF_LOG; delete window.TC_STATIC; delete window.RADIO_STATIC; delete window.MINIMAP_STATIC`
 - `delete window.USE_PLANET_SPRITES; delete window.VFX_DEBRIS_POLISH; delete window.UI_TOASTS`

Minimap
- `window.MINIMAP_STATIC = false` — disable minimap ramp static overlay

Weapons/Debug
- `window.DEBUG_WEAPONS = true` — enable WeaponSystem logs (fired/switch). Keep OFF; logging is expensive.
