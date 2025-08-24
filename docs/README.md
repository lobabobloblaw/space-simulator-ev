# Galaxy Trader

A retro-style space trading and combat game built with HTML5 Canvas and JavaScript.

## Play Now
[Launch Galaxy Trader](https://lobabobloblaw.github.io/space-simulator-ev/)

## Features
- 🚀 **Space Trading**: Buy low, sell high across multiple planets
- ⚔️ **Combat**: Fight pirates, earn bounties
- 🛸 **Ship Upgrades**: Weapons, shields, engines, cargo expansions
- 🌍 **Multiple Planets**: Each with unique economies
- 🎮 **Retro Graphics**: Classic arcade-style visuals with modern effects

## Controls
- **W/↑** - Thrust forward
- **A/D or ←/→** - Turn ship
- **Space** - Brake
- **F** - Fire weapon
- **Q** - Switch weapons
- **L** - Land on planet (when close)
- **M** - Toggle sound
 - **F5** - Save
 - **F9** - Load
 - **F12** - Clear save

## Getting Started
1. Start unarmed - trade commodities to earn credits
2. Buy your first weapon from a planet's outfitter
3. Hunt pirates for bounties
4. Upgrade your ship with better equipment
5. Become the ultimate space trader!

## Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/space-simulator-ev.git

# Navigate to the project
cd space-simulator-ev

# Run a local server (Python)
python3 -m http.server 8000

# Or with Node.js
npx http-server

# Open in browser
http://localhost:8000/docs/
```

## TargetCam Quickstart (Maintainers)
- Deterministic source: direct → preloaded → standalone → atlas → baseline. One source per target; upgrades only.
- Orientation: PNG adds `+90°` inner rotation; atlas/baseline use only `npc.angle`.
- Warm-up: Auto suppresses atlas/baseline for ~450ms after target change; silhouette may briefly omit rather than mismatch. Tweak `window.TC_WARM_MS`.
- Debug:
  - `window.TC_SHOW_PATH = true` shows the active source tag in the viewport.
  - `window.DEBUG_SPRITES = 'errors'` logs only failures.
  - `window.TC_FX = true` enables transient static/scanlines.

## Technologies
- Pure JavaScript (ES6 modules)
- HTML5 Canvas
- Web Audio API
- No external dependencies

## Credits
Created with Claude (Anthropic)

## For Maintainers / AI Sessions
- See `AGENTS.md` at the repo root for the AI Session Playbook (coding rules, render hygiene, TargetCam playbook).
- Internal developer docs are in `INTERNAL_DEV_DOCS/` (in the repo root, not served by GitHub Pages).
