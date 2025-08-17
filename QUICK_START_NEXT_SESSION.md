# QUICK START - NEXT CLAUDE SESSION

## 🚨 MOST IMPORTANT THINGS TO KNOW

1. **ALL CODE IS IN `/docs/` FOLDER** - Do NOT use root `/js/` or `/css/` (they're archived)
2. **Game is LIVE**: https://lobabobloblaw.github.io/space-simulator-ev/
3. **User wants BREVITY** - Keep responses concise and focused
4. **Save/Load WORKS** - Don't let old docs confuse you
5. **NO MOBILE CONTROLS YET** - Complete game first

## Latest Updates (Session 8)
- ✅ Terra Nova has realistic unified ocean (smooth gradient, ~50% water)
- ✅ Massive starfield with 4800 stars and subtle twinkling
- ✅ Ships explode dramatically when destroyed (multiple explosions)
- ✅ Pirates drop loot pickups on death

## File Structure (CRITICAL)
```
/docs/              <-- ALL WORK HAPPENS HERE
├── index.html      <-- Main game
├── css/main.css    <-- Styles
└── js/
    ├── main.js     <-- Game loop + starfield
    ├── data/gameData.js
    └── systems/
        ├── allSystems.js  <-- Most game logic + explosions
        └── proceduralPlanetRenderer.js  <-- Planet visuals
```

## Test Locally
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# http://localhost:8000/docs/
```

## Deploy
```bash
git add docs/
git commit -m "changes"
git push
```

## Current Features Working
- Trading system with dynamic economy
- Combat with explosions and loot drops
- 4 NPC types with proper behaviors
- Save/Load system (S/O keys)
- Mission system
- Ship upgrades
- Visual effects (explosions, warp, particles)
- Procedural planets with unified water
- Dense parallax starfield

## User Preferences
- Be concise
- Use same Terminal window (`do script 'command' in front window`)
- Add delays after system operations
- Ask for access rather than assume limitations

---
See `/SESSION_8_HANDOFF.md` for full details
