# Next Session Prompt - Enhanced Planet Graphics Strategy

## Copy and paste this to start your next Claude session:

---

**I need help continuing development on my space trading game Galaxy Trader.**

## Project Info
* **Local path**: `/Users/alexvoigt/Documents/Claude/space-simulator-ev`
* **Live game**: https://lobabobloblaw.github.io/space-simulator-ev/
* **GitHub**: https://github.com/lobabobloblaw/space-simulator-ev
* **Deployment**: GitHub Pages from `/docs` folder

## Current State
The game is fully functional with all core systems working. Last session added planet landing visuals, warp effects, and fixed the Terra Nova rendering bug (fillRect in clouds causing box artifact).

## My Preferences
- **Be concise** - I prefer brevity
- **Use `do script 'command' in front window`** for existing terminals
- **Spawn new Terminal windows** for git commands (separate from Python server)
- **Add pauses** between OS operations
- **Ask me** about operations that could help

## Today's Focus: Enhanced Planet Graphics Strategy

I want to create much better planet graphics. Currently planets are just gradient-filled circles with basic atmospheric effects. Let's plan and implement a strategy for truly impressive planets.

### Requirements Analysis First:
1. Review current planet rendering in `/docs/js/main.js` (lines ~315-500)
2. Identify performance bottlenecks (gradients recreated each frame?)
3. Check current planet data structure in `/docs/js/data/gameData.js`

### Graphics Enhancement Strategy:
Please develop a plan for:

1. **Procedural Planet Textures**
   - Cloud layers with proper movement/rotation
   - Surface features (continents, craters, ice caps)
   - Atmospheric scattering effects
   - Day/night terminator line
   - City lights on night side

2. **Performance Optimization**
   - Pre-render planet textures to offscreen canvases?
   - Cache gradients and reuse them?
   - LOD system (less detail when zoomed out)?

3. **Planet Types to Enhance**
   - Terra Nova: Animated ocean shimmer, moving cloud shadows, visible cities
   - Crimson Moon: Lava flows, volcanic eruptions, smoke plumes
   - Ice World: Aurora effects, ice crystal sparkles, blizzards
   - Mining Station: Rotating asteroid, mining laser beams, ship traffic

4. **Advanced Techniques to Consider**
   - Normal mapping simulation for 3D appearance?
   - Perlin noise for cloud generation?
   - Shader-like effects using canvas filters?
   - Parallax layers for depth?

5. **Animation System**
   - Rotation (planets should slowly spin)
   - Weather patterns
   - Day/night cycle
   - Orbital stations/moons

### Implementation Priority:
1. Start with Terra Nova as our showcase planet
2. Create reusable planet rendering system
3. Ensure mobile performance remains good
4. Keep cyberpunk aesthetic (cyan accents, clean lines)

### Technical Constraints:
- Must work in canvas 2D context (no WebGL)
- Should maintain 60fps on average hardware
- File size considerations for web deployment
- Compatible with existing game systems

Please start by analyzing the current implementation, then propose a specific approach for dramatically improving planet visuals while maintaining performance. Focus on making planets that would make players say "wow" when they first see them.

Check `/Users/alexvoigt/Documents/Claude/space-simulator-ev/SESSION_HANDOFF_VISUALS_COMPLETE.md` for complete details about what was accomplished last session.

---

## End of prompt

This prompt will help the next session focus specifically on taking the planet graphics to the next level with proper planning before implementation.
