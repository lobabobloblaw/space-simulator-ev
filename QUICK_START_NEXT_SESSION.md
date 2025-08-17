# QUICK START - NEXT CLAUDE SESSION

## 🚨 MOST IMPORTANT THINGS TO KNOW

1. **ALL CODE IS IN `/docs/` FOLDER** - Do NOT use root `/js/` or `/css/` (they're archived)
2. **Game is LIVE**: https://lobabobloblaw.github.io/space-simulator-ev/
3. **User wants BREVITY** - Keep responses concise and focused
4. **Save/Load WORKS** - Don't let old docs confuse you
5. **AI LANDSCAPES ARE WORKING** - But UI needs fixing to display them properly

## Latest Updates (Session 9)
- ✅ Fixed Terra Nova regeneration bug (planets now use deterministic seeds)
- ✅ Added AI-generated landscapes using Pollinations.ai (FREE, no API key)
- ⚠️ Landing UI needs CSS fixes to accommodate 400x300 images (was 150x150)
- ✅ Each planet has custom AI prompts for unique landscapes

## IMMEDIATE TASK: Fix Landing UI
The AI landscapes generate correctly but the landing overlay UI is broken with the larger images. Need to:
1. Fix CSS layout in `/docs/css/main.css`
2. Adjust landing overlay structure if needed
3. Make panels work with 400x300 planetCanvas

## File Structure (CRITICAL)
```
/docs/              <-- ALL WORK HAPPENS HERE
├── index.html      <-- Main game (planetCanvas now 400x300)
├── css/main.css    <-- NEEDS LANDING UI STYLES ADDED
└── js/
    ├── main.js     <-- Game loop + starfield
    ├── data/gameData.js
    └── systems/
        ├── allSystems.js  <-- Has AI landscape code
        └── proceduralPlanetRenderer.js  <-- Fixed deterministic generation
```

## Test Locally
```bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
python3 -m http.server 8000
# http://localhost:8000/docs/
```

## Quick Test AI Landscapes
```javascript
// In browser console
const planet = window.planets[0]; // Terra Nova
window.ship.x = planet.x + planet.radius + 40;
window.ship.y = planet.y;
// Press L to land - image will generate but UI needs fixing
```

## Current Features Working
- Trading system with dynamic economy
- Combat with explosions and loot drops
- 4 NPC types with proper behaviors
- Save/Load system (S/O keys)
- Mission system
- Ship upgrades
- Visual effects (explosions, warp, particles)
- Procedural planets (deterministic generation)
- Dense parallax starfield
- AI-generated planet landscapes (Pollinations.ai)

## User Preferences
- Be concise
- Use same Terminal window (`do script 'command' in front window`)
- Add delays after system operations
- Ask for access rather than assume limitations

---
See `/SESSION_9_HANDOFF.md` for full details
