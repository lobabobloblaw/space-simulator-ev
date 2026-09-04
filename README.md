# Galaxy Trader

A 2D space trading/combat roguelike written in pure JavaScript with ES6 modules.

🎮 **PLAY NOW**: https://lobabobloblaw.github.io/space-simulator-ev/

## The Run

Pick a ship at the main menu, then fly through four increasingly dangerous zones —
Core Systems → Frontier Space → Outer Rim → The Void — trading, taking missions, and
fighting pirates along the way. Core Systems and Frontier Space open the next zone once
you hit that zone's kill/credit targets; Outer Rim and The Void are gated by boss fights
(Captain Blackstar, then The Void King). Win by defeating The Void King, or die trying —
either way the run ends, `MetaStateManager` records the run's stats, and any unlocks
carry forward into your next run from the main menu.

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

### Version Stamping (optional)

Stamp the on-screen version (`GameConstants.META.VERSION`) from your current git tag/commit and date:

```bash
bash scripts/stamp_version.sh
```

This prefers `git describe --tags` and appends `+YYYY-MM-DD`. If there are no tags, it falls back to `g<shortsha>+YYYY-MM-DD`. If git is unavailable, it uses the UTC date only. The value appears in the top-left logo overlay.

## Deployment

Changes pushed to the `main` branch are automatically deployed to GitHub Pages (~1–10 minutes delay).

```bash
git add docs/
git commit -m "Your changes"
git push
```

Or use the helper script (auto-stamps version before pushing):

```bash
bash scripts/deploy.sh
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

- **Roguelike Runs**: 4 zones of rising difficulty, 2 boss fights (Captain Blackstar,
  The Void King), permanent cross-run unlocks tracked by `MetaStateManager`
- **Ship Progression**: 6 purchasable ships with distinct roles (fighter, hauler, balanced, endgame)
- **Mission System**: 26 hand-crafted missions + infinite procedural generation
  - Delivery/courier missions with time limits
  - Bounty/combat contracts (2-25 kill requirements)
  - Escort missions (VIP transport, convoy protection)
- **Dynamic Economy**: Trading across 4 planets with price variations
- **Combat**: Multiple weapon types, ship upgrades, NPC AI (pirates, traders, patrols)
- **Tutorial System**: Progressive 5-stage tutorial for new players
- **Save/Load**: Ship/run state persistence (F5/F9/F12)
- **Cyberpunk UI**: Particle effects, damage flash, screen shake
- **HiDPI Support**: DPR-aware canvases and crisp rendering
- **TargetCam**: In-canvas gradient + crosshair, pixel-perfect alignment

## History

Older per-session changelogs (Session 65–69 and earlier) are archived as
`SESSION_*_HANDOFF.md` files in the repo root and under `archive/`. For a current,
evidence-based account of what's implemented vs. broken vs. planned, see
`EVOLUTION_ROADMAP_2026-09.md`.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.

## For Maintainers / AI Sessions

- Start with `AGENTS.md` (AI Session Playbook) for coding rules, render hygiene, and TargetCam guidelines.
- Internal developer docs live under `INTERNAL_DEV_DOCS/` (not published via GitHub Pages) for architecture, systems, events/state, rendering, and assets.
