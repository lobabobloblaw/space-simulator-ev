# PROMPT FOR NEXT CLAUDE SESSION

Copy and paste this entire section to your next Claude:

---

**I need help continuing development on my space trading game Galaxy Trader.**

## Project Info
* **Local path**: `/Users/alexvoigt/Documents/Claude/space-simulator-ev`
* **Live game**: https://lobabobloblaw.github.io/space-simulator-ev/
* **GitHub**: https://github.com/lobabobloblaw/space-simulator-ev
* **Deployment**: GitHub Pages from `/docs` folder

## Current State - FULLY WORKING
* ✅ Just fixed ship destruction (health clamps to 0, respawn with R key)
* ✅ Cyberpunk UI with cyan accents
* ✅ Combat, trading, missions all functional
* ✅ Save/Load system (S/O keys)
* ✅ Touch controls for mobile

## My Preferences
- **Be concise** - I prefer brevity
- **Spawn new Terminal windows** for git commands (separate from Python server)
- **Use `do script 'command' in front window`** for existing terminals
- **Add pauses** between OS operations
- **Ask me** about operations that could help

## What Needs Work - CORE IMPROVEMENTS ONLY
I said: **"save slots, like mobile controls, are things for a future version"**
I want: **"planet sizes need to increase, and there needs to be some manner of atmospheric visual effects"**

### Priority: Make Planets More Impressive
1. **Increase planet sizes** - Currently 40-80 radius, should be 100-200+
2. **Add atmospheric effects** - Better glows, heat shimmer, clouds
3. **Visual polish** - Engine trails, better explosions, particle effects

Files to modify:
- Planet data: `/docs/js/data/gameData.js`
- Planet rendering: `/docs/js/main.js` (lines ~350-500)

## Testing
```bash
# Terminal 1: Python server
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev/docs && python3 -m http.server 8000

# Terminal 2: Git (spawn new!)
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev
git add -A && git commit -m "message" && git push origin main
```

## Session Handoff
Check `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_HANDOFF_DESTRUCTION_FIX.md` for complete details about what was just fixed.