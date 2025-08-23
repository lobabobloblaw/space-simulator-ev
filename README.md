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

## Latest Updates (Session 50)

- Sprites & Atlas:
  - AssetSystem loads standalone ship PNGs via `docs/js/assets/sprites.json` and a procedural placeholder atlas.
  - RenderSystem sprite path is stable (no transform leaks); fallbacks to vector silhouettes when sprites are unavailable.
  - Global knobs in `RenderSystem`: `sizeMultiplier` (default 1.25), `spriteRotationOffset` (+90°).
- Effects & Explosions:
  - Procedural effects atlas (thruster/explosion) generated at runtime.
  - Flipbook explosion loader: `docs/js/assets/explosion.json` manifest points to frames under `docs/assets/explosions/` (98 frames supported). Flipbook overlays on big ship explosions only.
  - Explosion visuals upgraded: core flash, shockwave ring, embers, layered fireball, screen shake.
  - Ship–asteroid impacts now appear as tiny pops (no shockwave/flipbook), clearly distinct from ship deaths.
- Debris:
  - On projectile hits: small triangular shards fly off, with spin and fade.
  - On final explosions: irregular polygon chunks (asteroid-like) eject with momentum and longer lifetimes.
- Destruct Sequences:
  - NPCs and player enter a brief pre-explosion flicker/glow phase; ships fade out earlier (~60% of the sequence) before the blast.
- Debug & Toggles:
  - Sprite logging only when `window.DEBUG_SPRITES === 'verbose'` (throttled). Debug overlay shows `Sprites: ON/OFF • Loaded: N`.
  - Optional (opt-in) toggles in `state.renderSettings`: `spriteCulling`, `useEffectsSprites` (both default off for stability).

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
