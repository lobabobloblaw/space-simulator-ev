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

- **Ship Progression**: 6 purchasable ships with distinct roles (fighter, hauler, balanced, endgame)
- **Mission System**: 26 hand-crafted missions + infinite procedural generation
  - Delivery/courier missions with time limits
  - Bounty/combat contracts (2-25 kill requirements)
  - Escort missions (VIP transport, convoy protection)
- **Dynamic Economy**: Trading across 4 planets with price variations
- **Combat**: Multiple weapon types, ship upgrades, NPC AI (pirates, traders, patrols)
- **Tutorial System**: Progressive 5-stage tutorial for new players
- **Save/Load**: Full game state persistence (F5/F9/F12)
- **Cyberpunk UI**: Particle effects, damage flash, screen shake
- **HiDPI Support**: DPR-aware canvases and crisp rendering
- **TargetCam**: In-canvas gradient + crosshair, pixel-perfect alignment

## Latest Updates (Session 69 — Phase 1 MVP)

**Major Content Expansion**:
- **26 Missions**: Added 10 delivery, 8 bounty, 5 escort missions + procedural generator
- **6 Ships**: Complete ship progression from Scout Shuttle to Phoenix Battlecruiser
- **Mission Board UI**: Accept/complete/abandon missions at any planet ([5] key)
- **Shipyard UI**: Purchase ships with stat comparison and requirements ([6] key)
- **Tutorial System**: Restored 5-stage progressive tutorial with helpful guidance
- **Game Feel**: 3x screen shake intensity, enhanced damage flash overlay

**Technical**:
- New systems: MissionSystem.js, MissionGenerator.js
- Extended ShopSystem.js with ship purchase logic (trade-ins, requirements)
- Enhanced UISystem.js with mission/shipyard panels and event delegation
- Balance: Ships have meaningful trade-offs (speed vs cargo vs combat)

**Previous Sessions (65–68)**:
- Session 68: Strategic roadmap, AAA quality review
- Session 66-67: TargetCam alignment, HiDPI rendering, security fixes
- Session 65: CSP, ARIA, DOM safety improvements

See `SESSION_69_HANDOFF.md` for complete details and `INTERNAL_DEV_DOCS/` for architecture.

Run locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.

## For Maintainers / AI Sessions

- Start with `AGENTS.md` (AI Session Playbook) for coding rules, render hygiene, and TargetCam guidelines.
- Internal developer docs live under `INTERNAL_DEV_DOCS/` (not published via GitHub Pages) for architecture, systems, events/state, rendering, and assets.
