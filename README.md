# Galaxy Trader

A sophisticated 2D space trading/combat game written in pure JavaScript with ES6 modules.

🎮 **PLAY NOW**: https://lobabobloblaw.github.io/space-simulator-ev/

## Project Structure

```
space-simulator-ev/
├── docs/                   # PRODUCTION & DEVELOPMENT (GitHub Pages serves from here)
│   ├── index.html         # Main game HTML
│   ├── css/main.css       # Cyberpunk UI styles
│   └── js/                # Game code
│       ├── main_eventbus_pure.js  # Active entry point (EventBus architecture)
│       ├── data/          # Game configuration
│       └── systems/       # Game systems
├── archive/               # Development history & backups
├── scripts/               # Deployment scripts
└── README.md             # This file
```

## Key Points

- **All development happens in `/docs`** - This is what GitHub Pages serves
- Old modular code has been archived in `/archive/old-js-backup`
- Game is fully functional and deployed

## Local Development

```bash
cd space-simulator-ev
python3 -m http.server 8000
# Browse to http://localhost:8000/docs/
```

## Deployment

Changes pushed to the `main` branch are automatically deployed to GitHub Pages (~1–10 minutes delay).

```bash
git add docs/
git commit -m "Your changes"
git push
```

## Controls

- **W/↑**: Thrust forward
- **A/D or ←/→**: Turn left/right
- **Space**: Brake
- **F**: Fire
- **Q**: Switch weapon
- **L**: Land (nearby planet)
- **M**: Toggle sound
- **F5**: Save, **F9**: Load, **F12**: Clear save

## Features

- Dynamic trading economy across 4 planets
- Multiple weapon types and ship upgrades
- NPC behaviors (pirates, traders, patrols, freighters)
- Save/load system
- Mission system
- Cyberpunk UI with particle effects
- HiDPI crispness: DPR-aware canvases and transforms
- TargetCam: in-canvas gradient + crosshair; pixel-perfect at UI snap sizes

## Latest Updates (Session 65–66)

- HiDPI: Canvases sized by devicePixelRatio; `withWorld/withScreen` apply DPR transforms.
- TargetCam: moved gradient + crosshair into canvas; pixel-snapped center; backing store resync on UI snaps (80/70/60px); faint static always on.
- Security/A11y: Added CSP meta; ARIA live region; DOM safety (removed innerHTML in landing details + trading lists).
- Assets: LRU cap for atlas frame canvases; player-only sprite override support.
- UI: Top-left logo overlay with version tag.

See `INTERNAL_DEV_DOCS/targetcam_alignment.md` and `INTERNAL_DEV_DOCS/dpr_hidpi_notes.md` for details.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.

## For Maintainers / AI Sessions

- Start with `AGENTS.md` (AI Session Playbook) for coding rules, render hygiene, and TargetCam guidelines.
- Internal developer docs live under `INTERNAL_DEV_DOCS/` (not published via GitHub Pages) for architecture, systems, events/state, rendering, and assets.
