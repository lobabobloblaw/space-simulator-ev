# Space Simulator - Escape Velocity Style
## Project Documentation for Future Claude Sessions

### Project Overview
This is a browser-based 2D space trading and combat game inspired by the classic Escape Velocity series. Built entirely in vanilla HTML5/JavaScript using Canvas API, it features real-time space combat, trading economics, ship upgrades, and NPC AI systems.

**Current Version:** 1.2.0
**Last Updated:** August 16, 2025 (Session 3 - Enhanced)
**Developer:** Alex Voigt (with Claude assistance)
**File Location:** `/Users/alexvoigt/Documents/Claude/space-simulator-ev/space-simulator.html`
**File Size:** 3,086 lines (single HTML file)

### How to Run
Simply open `space-simulator.html` in any modern web browser. No dependencies or build process required.

### Game Controls
- **Arrow Keys/WAD:** Turn and thrust forward (no reverse)
- **F:** Fire weapon (if armed)
- **Q:** Switch weapons (if multiple owned)
- **Space:** Brake
- **L:** Land at nearby planet/station (clears all NPCs)
- **1-4:** Station interface navigation (when docked)

### Recent Major Changes (v1.2.0 - August 16, 2025, Session 3 Extended)

#### Major Features Added ✨
- **SOUND SYSTEM IMPLEMENTED:** Complete Web Audio API integration
  - Unique weapon sounds for each type (mining, rapid, plasma)
  - Soft acceleration sound when thrusting
  - Shield hit effects and explosions
  - Pickup collection sounds
  - Landing/docking sound
  - Mute toggle with 'M' key
- **SIMPLE MISSION SYSTEM:** 3 starter missions for goals
  - "First Blood" - Destroy first pirate (200 credits)
  - "Merchant Apprentice" - Reach 750 credits (300 reward)
  - "Bounty Hunter" - Kill 3 pirates (500 reward)
- **PIRATE LOOT DROPS:** 60% chance pirates drop 50-150 credits
- **STAR RENDERING FIXED:** Completed wrapping calculation
- **PERFORMANCE OPTIMIZATION:** Added viewport culling for stars

#### Earlier Session 3 Fixes
- **Fixed Missing Tutorial CSS:** Tutorial hints now properly display
- **Fixed Canvas Height Inconsistency:** Standardized to 100px
- **Code Review:** Analyzed all 3,086 lines

#### Code Quality Observations
- **Strengths:** Clean game loop, sophisticated NPC AI, good physics implementation
- **Memory Concerns:** Pickup arrays could grow unbounded if not collected (minor issue)
- **Star Rendering Bug:** Incomplete wrapping calculation in drawStars function (line 2835 appears truncated)
- **Performance:** Game runs smoothly but star rendering could be optimized with viewport culling

### Recent Major Changes (v1.1.1 - August 2025, Session 2)

- **Asteroid System:** Collisions damage ship, mining drops ore pickups
- **Tutorial Hints:** Guide new players through early game progression
- **Major Combat Rebalance:** 
  - Patrol damage reduced 80% (30→6), fire rate 3x slower
  - Pirate health doubled (40→80), damage increased 67%
  - Result: Space battles last 15-30 seconds instead of 2-3 seconds
- **Improved AI:** Pirates evade patrols, patrols give up failed pursuits
- **NPC Movement:** Less repetitive with random patterns and drift

### Recent Major Changes (v1.1.0 - August 2025, Session 1)

- **Ship Visual Diversity:** Each NPC type has unique, recognizable appearance
- **Player Starts Unarmed:** Must trade to buy first weapon (150 credits)
- **Slower Starting Ship:** Reduced speed (0.45), thrust (0.004), and turn rate (0.012)
- **Enhanced Patrol Ships:** 3x player speed (1.4), 150 HP, 30 damage weapons, intimidating visuals
- **Landing Clears NPCs:** All ships removed when docking (tactical reset feature)
- **No Reverse Thrust:** Removed for both player and NPCs
- **Enhanced Patrol AI:** Patrols now protect traders from pirates, creating dynamic law enforcement
- **Fixed Bugs:** Alert dialog issue, fuel system, custom toast notifications

### Completed Features

#### Core Mechanics ✅
- **Physics-based movement:** Newtonian physics with momentum conservation (no reverse thrust)
- **Camera system:** Follows player smoothly
- **HUD display:** Real-time stats (hull, shields, fuel, speed, credits, cargo, weapon, kills, location)
- **Minimap:** Circular radar showing planets, NPCs, and asteroids with color coding
- **Landing system:** Dock at planets with cooldown system, clears all NPCs on landing
- **Game over state:** Death screen with stats
- **Fuel system:** Cannot thrust without fuel (min 0.1 required)

#### Combat System ✅
- **Player starts UNARMED:** Must buy first weapon for 150 credits
- **Three weapon types:**
  - Mining Laser (weak starter, 2 damage, slow)
  - Rapid Laser (fast, 5 damage)
  - Plasma Cannon (slow, powerful, 20 damage)
- **Shield system:** Regenerating shields that absorb damage
- **Health/hull integrity:** Takes damage after shields depleted
- **Explosion effects:** Visual feedback for hits and destruction
- **Weapon switching:** Q key cycles through owned weapons

#### NPC AI System ✅
- **Four NPC types with distinct behaviors and visuals:**
  - **Freighters (brown):** Huge rectangular bulk carriers, very slow (0.25 speed), 150 HP, worth 800 credits
  - **Traders (gray):** Rounded vessels, passive, flee from combat, no weapons
  - **Pirates (red):** Angular fighters, aggressive, hunt player, 6 damage weapons
  - **Patrols (dark blue):** Large interceptors with weapon pods, 3x player speed (1.4), 150 HP, 30 damage weapons
- **Realistic movement constraints:** NPCs follow same physics as player (no reverse)
- **Adaptive spawning:** Maintains 3-5 NPCs near player
- **Combat AI:** Pirates attack closest target (player or merchants), traders flee threats, patrols enforce law and protect traders
- **Docking behavior:** Traders dock at stations

#### Player Progression ✅
- **Starting stats:**
  - 250 credits (must trade to afford first weapon)
  - Speed: 0.45 (very slow)
  - Turn rate: 0.012 (sluggish)
  - Acceleration: 0.004 (poor)
  - UNARMED (must buy Mining Laser for 150 credits)
- **Upgrade path:** Trade → Buy weapon → Survive → Buy better equipment
- **Patrol threat:** Patrol ships are extremely dangerous early game

#### Trading System ✅
- **Six commodities:** Food, Ore, Tech, Fuel Cells, Weapons, Luxury Goods
- **Dynamic pricing:** Each station has different prices based on supply/demand
- **Price indicators:** 📉 (good buy), 📈 (good sell)
- **Cargo management:** Limited capacity, expandable through upgrades
- **Quick sell:** "Sell All" button for efficiency
- **Economic balance:** Buy low, sell high strategy

#### Upgrade System ✅
- **Shields:**
  - Basic Shield (25 HP, $500)
  - Advanced Shield (50 HP, $1500)
- **Engines:**
  - Enhanced Engine (+50% thrust, +30% speed, $800)
  - Military Engine (+100% thrust, +60% speed, $2000)
- **Weapons:**
  - Mining Laser (starter, 2 damage, $150)
  - Rapid Laser (fast fire rate, 5 damage, $600)
  - Plasma Cannon (high damage, 20 damage, $1200)
- **Cargo:**
  - Cargo Expansion (+5 slots, $400)
  - Large Cargo Bay (+10 slots, $1000)

#### Visual Features ✅
- **Unique ship designs:** Each NPC type has distinct visual appearance
- **Planet landing scenes:** Unique animated visuals for each station
- **Thrust effects:** Engine flames for player and NPCs
- **Shield visuals:** Cyan bubble with flicker effects
- **Weapon variety:** Different projectile visuals per weapon type
- **Damage indicators:** Ship flashes red when critical
- **Patrol intimidation:** Red shield aura, weapon pods, dual engines

### Technical Architecture

#### Code Structure
- **Single file architecture:** All code in one HTML file for simplicity
- **Global game state:** Central `game` object manages pause/camera
- **Entity systems:** Separate arrays for ships, projectiles, explosions
- **Update/Draw pattern:** Classic game loop with 60 FPS target
- **Event-driven input:** Keyboard state tracking

#### Performance Considerations
- **Viewport culling:** Only renders visible objects
- **Minimap optimization:** Different detail levels based on distance
- **Entity limits:** Max 12 NPCs, auto-cleanup for distant objects
- **Particle management:** Explosion cleanup after animation

### Known Issues & Limitations

1. ~~**Star rendering bug:**~~ ✅ FIXED - Wrapping calculation completed
2. **No save system:** Progress lost on refresh (not critical - game is 10-15 min experience)
3. **Single star system:** No hyperjump or multiple systems
4. ~~**No missions:**~~ ✅ FIXED - Added 3 starter missions
5. **Limited NPC interactions:** Can't hail or communicate
6. ~~**No sound:**~~ ✅ FIXED - Full sound system implemented
7. ~~**Performance:**~~ ✅ FIXED - Added viewport culling for stars

### Planned Features (Priority Order)

#### Phase 1: Core Improvements (FOR 10-15 MIN GAMEPLAY)
- [x] **Sound effects:** Engine, weapons, explosions, UI ✅ DONE
- [x] **Simple missions:** 3 quick missions ✅ DONE
- [x] **Performance optimization:** Star viewport culling ✅ DONE
- [x] **NPC cargo drops:** Pirates drop credits ✅ DONE
- [ ] **Quick achievements:** "First Kill", "Trader", "Rich" badges
- [x] **Fix star wrapping bug:** ✅ DONE

#### Phase 2: Content Expansion
- [ ] **Mission system:** 
  - Delivery missions
  - Bounty hunting
  - Escort missions
  - Trade runs
- [ ] **Faction system:** Reputation affects NPC behavior
- [ ] **Multiple star systems:** Hyperjump between systems
- [ ] **More ship classes:** Player can buy new ships
- [ ] **Station services:** Repair, refuel, ammo
- [ ] **Pirates drop cargo:** Loot system

#### Phase 3: Advanced Features
- [ ] **Fleet management:** Hire escort ships
- [ ] **Base building:** Own stations/planets
- [ ] **Multiplayer:** WebRTC peer-to-peer
- [ ] **Mod support:** JSON-based content files
- [ ] **Story campaign:** Narrative missions
- [ ] **Procedural generation:** Infinite universe

### Development Notes for Next Claude

#### Current State
The game is fully playable with a well-balanced difficulty curve. The v1.1.1 update significantly improved combat balance and NPC interactions.

**Core Gameplay Loop:**
1. Start unarmed → trade commodities between stations
2. Buy mining laser (150 credits) → mine asteroids for ore or hunt pirates
3. Upgrade weapons and ship systems with profits
4. Navigate dynamic NPC ecosystem (patrols vs pirates vs traders)

**Current Balance (v1.1.1):**
- **Patrols:** Fast but inaccurate, 6 damage, 20 cooldown, 20-80% accuracy
- **Pirates:** Tanky and evasive, 80 HP, 10 damage, smart AI
- **Combat:** Extended battles (15-30 seconds), pirates can escape/win
- **Economy:** Balanced around 250 starting credits, weapons 150-1200

**What Works Well:**
- Tutorial hints guide new players
- Asteroid mining provides alternative income
- NPC battles create emergent gameplay
- Trading system encourages exploration

**What Needs Work:**
- Save system for longer sessions
- Sound effects for immersion
- Mission system for goals
- More varied content

#### Architecture Decisions
- **Vanilla JS:** No frameworks to keep it simple and portable
- **Canvas 2D:** Chose over WebGL for simplicity
- **Single file:** Everything in one HTML file for easy sharing
- **No build process:** Direct browser execution

#### Where to Focus Next (Session 3 Analysis)
1. **Sound effects** - Would transform the experience (Web Audio API)
2. **2-3 Quick missions** - Simple goals for 10-15 min session
3. **Fix star rendering** - Complete wrapping calculation, add culling
4. **Pirate loot drops** - Immediate reward feedback
5. **Achievement popups** - Quick dopamine hits for milestones

**Note:** Save system deprioritized since game is designed for short sessions

#### Code Conventions
- Functions use camelCase
- Global constants in UPPER_CASE (should refactor current code)
- Comments explain why, not what
- Draw functions separated from update logic

#### Testing Checklist
- [ ] All weapons fire correctly
- [ ] NPCs spawn and behave appropriately  
- [ ] Trading profits are balanced
- [ ] Upgrades apply correctly
- [ ] Landing/docking works at all stations
- [ ] Landing clears all NPCs properly
- [ ] Fuel system prevents thrust at 0
- [ ] Game over triggers properly
- [ ] Performance stays above 30 FPS

### Session 3 Code Analysis Summary

#### File Structure
- **Lines:** 3,086 total
- **Main sections:**
  - Lines 1-385: HTML/CSS (includes HUD, landing overlay)
  - Lines 386-840: Initial game setup (objects, NPCs, commodities)
  - Lines 841-2835: Core game logic (update functions, AI)
  - Lines 2836-3066: Rendering functions (draw, HUD updates)
  - Lines 3067-3086: Game loop and initialization

#### Key Functions Location
- `updateShip()`: Line ~900
- `updateNPCs()`: Line ~1200 (most complex function, handles all AI)
- `fireProjectile()`: Line ~1900
- `checkLanding()`: Line ~2200
- `drawShip()`: Line ~2850
- `gameLoop()`: Line ~3050

#### Performance Hotspots Identified
1. **drawStars()**: Draws 500+ stars every frame without culling
2. **updateNPCs()**: Complex AI calculations for each NPC
3. **Collision detection**: O(n²) checks between projectiles and entities

### Quick Start for Development

1. Open the HTML file in browser
2. Open browser DevTools console
3. Key objects to inspect:
   - `ship` - player state
   - `npcShips` - array of NPCs
   - `planets` - station data
   - `commodities` - trade goods
   - `npcTypes` - NPC configurations

### Debug Commands (paste in console)

#### Session 3 Additions
```javascript
// Give credits
ship.credits = 10000;

// Full health/shields
ship.health = ship.maxHealth;
ship.shield = ship.maxShield;

// Give first weapon
ship.weapons = [{type: "mining", damage: 2, cooldown: 35}];

// Teleport to coordinates
ship.x = 0; ship.y = 0;

// Teleport to first planet
ship.x = planets[0].x + 50;
ship.y = planets[0].y + 50;

// Spawn specific NPC
spawnNPC(); // Random type

// Clear all NPCs
npcShips.length = 0;

// God mode
ship.maxHealth = 9999;
ship.health = 9999;

// Instant rich (for testing purchases)
ship.credits = 99999;

// Give all weapons
ship.weapons = [
    {type: "mining", damage: 2, cooldown: 35},
    {type: "rapid", damage: 5, cooldown: 12},
    {type: "plasma", damage: 20, cooldown: 35}
];

// Max out ship
ship.maxShield = 50;
ship.shield = 50;
ship.engineLevel = 3;
ship.thrust = 0.008;
ship.maxSpeed = 0.72;
ship.cargoCapacity = 30;

// Skip tutorial
ship.tutorialStage = 'done';

// Performance monitoring
let fps = 0;
let lastTime = performance.now();
function monitorFPS() {
    const now = performance.now();
    fps = Math.round(1000 / (now - lastTime));
    lastTime = now;
    console.log('FPS:', fps);
    requestAnimationFrame(monitorFPS);
}
monitorFPS();

// Max speed
ship.maxSpeed = 2.0;
ship.thrust = 0.02;
```

### Credits & Inspiration
- Inspired by Escape Velocity (Ambrosia Software)
- Space trading mechanics from Elite/Freelancer
- Physics system influenced by Asteroids
- UI design inspired by retro terminals

### Contact & Repository
- Developer: Alex Voigt
- Built with: Claude (Anthropic)
- Location: /Users/alexvoigt/Documents/Claude/space-simulator-ev/
- License: Open source (no specific license chosen yet)

---

## Message for Next Claude Instance

Hello! You're working on a space trading/combat game inspired by Escape Velocity. The game is functional and playable, designed for 10-15 minute sessions.

### Current State (v1.1.2)
- **File:** Single 3,086-line HTML file at `/Users/alexvoigt/Documents/Claude/space-simulator-ev/space-simulator.html`
- **Architecture:** Intentionally single-file, no build process, vanilla JS + Canvas
- **Gameplay:** Complete trading, combat, and upgrade systems working well
- **Session Length:** Designed for 10-15 minute play sessions (save system not critical)

### What I Fixed in Session 3
1. **Tutorial CSS:** Was completely missing, now properly styled
2. **Canvas Height:** Fixed inconsistency (was 140px/120px, now 100px everywhere)
3. **Documentation:** Thoroughly analyzed all code, documented structure

### Critical Issues Still Present
1. **Star Rendering Bug:** Line ~2835 has incomplete wrapping calculation
2. **Performance:** Drawing 500+ stars without viewport culling
3. **No Sound:** Completely silent (biggest impact opportunity)

### Alex's Preferences (Important!)
- **Single file approach:** Keep everything in one HTML file
- **Simplicity:** No frameworks, no build process
- **Quick sessions:** Game is meant for 10-15 minutes, not hours
- **Brevity:** Don't be verbose, focus on essentials

### Immediate Priorities for Next Session
1. **Sound Effects:** Use Web Audio API for immediate impact
   - Engine hum (scales with speed)
   - Weapon sounds (different per type)
   - Shield hits, explosions
   - UI sounds (landing, purchasing)

2. **2-3 Simple Missions:** Add goals to the sandbox
   - Delivery: Take X commodity from A to B
   - Bounty: Kill 3 pirates
   - Trader: Earn 500 credits from trading

3. **Fix Star Bug:** Complete the wrapping calculation
   ```javascript
   // Line ~2835 needs completion
   const wrappedY = ((y % canvas.height) + canvas.height) % canvas.height;
   ```

4. **Pirate Loot:** Make pirates drop cargo/credits

### Code Structure Quick Reference
- **Game Loop:** Line 3050-3066
- **Player Update:** Line 900-1100
- **NPC AI:** Line 1200-1900 (complex, handles all behaviors)
- **Combat:** Line 1900-2100
- **Landing/Trading:** Line 2200-2500
- **Rendering:** Line 2850-3050

### Performance Notes
- Game runs at steady 60 FPS on modern hardware
- Main bottleneck: star rendering (500+ stars)
- NPC AI is complex but handles 12 ships fine
- Collision detection could use spatial partitioning if expanded

### What NOT to Do
- Don't add a save system (game is too short)
- Don't break into multiple files (Alex prefers single file)
- Don't add frameworks or dependencies
- Don't make the game longer/grindier

Good luck! The game is in great shape - just needs polish for those 10-15 minute sessions.