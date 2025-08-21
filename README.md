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

## Latest Updates (Session 44)

- Planet visuals: added signal-processing intro (scanlines + chromatic offset) and a pixelated “processing” band that fades into the final image; preserves HQ Pollinations/Unsplash/lexica logic without UI provider switches.
- Ships: new procedural silhouettes via `ShipDesigns.js`, larger sprite-like rendering, unified NPC designs by type, and per-faction palettes/decals via `FactionVisuals.js`.
- Factions + reputation: generic `civilian/trader/patrol/pirate/merc/miner` palettes; basic `state.reputation.{trader, patrol, pirate}` with events. Trader rep increases on buy/sell; patrol rep increases on pirate kills.
- Respawn: press R after death to respawn near the nearest planet; small credit penalty applied; projectiles cleared.
- Trading fixes: cannot sell goods at planets that don’t buy them (“No buyers” shown). Cargo display hardened to avoid NaN.
- Ship Radio: compact in-HUD music widget (prev/play/next + volume). Procedural ambient tracks; volume persists across tracks and sessions; muted by M.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
