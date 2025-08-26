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

UI/Images
- `window.UI_LANDSCAPE_PROVIDER = 'unsplash'|'lexica'|'auto'|'none'` — 'none' to suppress external fetches
- `window.RADIO_STATIC = false` — disable faint static inside the radio dial

Renderer Spike (optional)
- Enable WebGL spike: `?webgl=1` (URL) or `localStorage.setItem('RENDER_WEBGL','1')`
- Disable: remove `?webgl=1` and `localStorage.removeItem('RENDER_WEBGL')`

Reset All (examples)
- `delete window.TC_SHOW_PATH; delete window.TC_DEBUG; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.UPDATE_PROF_LOG; delete window.TC_STATIC; delete window.RADIO_STATIC; delete window.MINIMAP_STATIC`

Minimap
- `window.MINIMAP_STATIC = false` — disable minimap ramp static overlay

Weapons/Debug
- `window.DEBUG_WEAPONS = true` — enable WeaponSystem logs (fired/switch). Keep OFF; logging is expensive.
