# PROMPT FOR NEXT CLAUDE SESSION

## Context
I have a space trading game called "Galaxy Trader" that's deployed and live on GitHub Pages. The game is fully functional with trading, combat, and ship upgrades. It's built with pure JavaScript using ES6 modules, no dependencies.

**Live Game:** https://lobabobloblaw.github.io/space-simulator-ev/
**Repository:** https://github.com/lobabobloblaw/space-simulator-ev
**Local Path:** /Users/alexvoigt/Documents/Claude/space-simulator-ev

## Current State
- Game is DEPLOYED and WORKING on GitHub Pages
- Full modular architecture with ES6 modules
- 5 different ship types with unique visuals (freighter, trader, pirate, patrol, player)
- Trading system across 4 planets
- Combat with projectiles and explosions
- Upgrade shop (weapons, shields, engines, cargo)
- Mission system
- Sound effects via Web Audio API

## Project Structure
```
docs/                  # PRODUCTION - GitHub Pages serves from here
├── index.html        # Main game
├── css/main.css      # Styles
└── js/
    ├── main.js       # Core game loop (imports MUST be at top)
    ├── data/gameData.js  # Game configuration
    └── systems/allSystems.js  # All game systems

js/                   # DEVELOPMENT - test new features here first
```

## Development Workflow
1. Make changes in `docs/` folder for production
2. Test locally: `python3 -m http.server 8000` then browse to http://localhost:8000/docs/
3. Deploy: `git add . && git commit -m "Update" && git push`
4. Changes go live in ~1 minute

## What I Want to Work On
[User should specify what they want next, e.g.:]
- Add mobile touch controls
- Implement save/load system
- Add more planets
- Create faction/reputation system
- Add new weapon types
- Implement procedural generation
- Add multiplayer support
- Optimize performance
- Add tutorial system
- Create level editor

## Important Technical Notes
1. **ES6 imports MUST be at the very top of files** (before any other code)
2. All paths must be relative (use `./js/` not `/js/`)
3. The game uses `window.ship` and `window.game` for global state
4. GitHub Pages builds from the `/docs` folder on the main branch
5. No build process - pure JavaScript modules work directly

## Quick Start Commands
```bash
# Navigate to project
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev

# View current status
git status

# Test locally
python3 -m http.server 8000
# Open http://localhost:8000/docs/

# Deploy updates
git add .
git commit -m "Add: [feature description]"
git push
```

## Known Issues
- NPCs occasionally spawn inside planets (rare)
- Audio might not work until first user interaction (browser requirement)

Please help me [specify what you want to do next with the game].
