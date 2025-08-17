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
│       ├── main.js        # Core game loop
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

Changes pushed to the `main` branch are automatically deployed to GitHub Pages (~1 minute delay).

```bash
git add docs/
git commit -m "Your changes"
git push
```

## Controls

- **W/↑**: Thrust forward
- **A/D or ←/→**: Turn left/right  
- **Space**: Brake
- **F**: Fire weapon
- **Q**: Switch weapons
- **L**: Land on nearby planet
- **S**: Save game
- **O**: Load game
- **M**: Toggle sound

## Features

- Dynamic trading economy across 4 planets
- Multiple weapon types and ship upgrades
- NPC behaviors (pirates, traders, patrols, freighters)
- Save/load system
- Mission system
- Cyberpunk UI with particle effects

## Latest Updates (Session 12)

- **Terra Nova Fix**: Oceanic world now shows ~75% water coverage consistently
- **Minimap Update**: All elements now render in monochrome white (cleaner design)
- **UI Improvements**: Landing window aligned with bottom HUD, landscapes fill full width
- **Polish**: No more black bars on planet images, better responsive design

### Recent Sessions
- Session 11: Landing UI redesign with fixed window size
- Session 10: Combat balance and NPC improvements
- Session 9: Multiple bug fixes and gameplay enhancements
- Session 8: AI-generated planet landscapes via Pollinations.ai
- Session 7: Save/load fixes and project structure cleanup
