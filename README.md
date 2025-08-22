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

## Latest Updates (Session 47)

- Radar progression: `radarLevel` gates minimap detail.
  - L0: featureless white specks; range rings hidden.
  - L1: planets as dots; NPCs as white squares; rings shown.
  - L2+: faction-colored NPC dots; pirates outlined.
- Targeting: press X to cycle nearest hostile (pirate). Targeted hostiles get thicker, gently pulsing brackets and a small center dot.
- Radio UI: enlarged radial dial; right-side dot buttons with tiny glyphs; tuned spacing.
- Performance: pooled explosions/warp/hit-sparks/muzzle flashes; frustum culling; quality-aware explosions/pickups/trails.
- Combat feel: per-weapon tracer tuning; slight rapid cadence jitter; shield-hit ring + cyan sparks.
- Debug: press F3 to cycle render quality (high/medium/low).
- Architecture: Shop/Trading UI uses delegated handlers and EventBus; no window globals. `radarLevel` persisted.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
