# QUICK START - NEXT CLAUDE SESSION

## 🚨 MOST IMPORTANT THINGS TO KNOW

1. **ALL CODE IS IN `/docs/` FOLDER** - Do NOT use root `/js/` or `/css/` (they're archived)
2. **Game is LIVE**: https://lobabobloblaw.github.io/space-simulator-ev/
3. **User wants BREVITY** - Keep responses concise and focused
4. **Save/Load WORKS** - Don't let old docs confuse you
5. **NO MOBILE CONTROLS YET** - Complete game first

## What We Just Fixed (Session 7)
- ✅ NPCs no longer freeze when loading saves
- ✅ Traders/freighters now properly dock at planets
- ✅ Cleaned up duplicate code (everything consolidated to `/docs/`)

## File Structure (CRITICAL)
```
/docs/              <-- ALL WORK HAPPENS HERE
├── index.html      <-- Main game
├── css/main.css    <-- Styles
└── js/
    ├── main.js     <-- Game loop
    ├── data/gameData.js
    └── systems/allSystems.js  <-- Most game logic
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

## User Preferences
- Be concise
- Use same Terminal window (`do script 'command' in front window`)
- Add delays after system operations
- Ask for access rather than assume limitations

---
See `/archive/SESSION_7_HANDOFF.md` for full details
