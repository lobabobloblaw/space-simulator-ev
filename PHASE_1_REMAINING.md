# Phase 1 MVP — Remaining Tasks

## Status: 12/15 Complete (80%)

### ✅ Completed (12 tasks)

**Mission System (5/5)**:
1. ✅ Add 8-10 delivery/courier missions to gameData.js
2. ✅ Add 6-8 bounty/combat missions to gameData.js
3. ✅ Add 4-5 escort missions to gameData.js
4. ✅ Implement procedural mission generator templates
5. ✅ Create mission board UI at planets

**Ship System (3/3)**:
6. ✅ Add 4-6 ship classes to gameData.js with stats
7. ✅ Add ship purchase logic to ShopSystem.js
8. ✅ Build shipyard UI panel in landing overlay

**Tutorial System (2/2)**:
9. ✅ Un-suppress tutorial messages in UISystem.js
10. ✅ Add progressive overlay with stage tracking

**Game Feel (2/5)**:
11. ✅ Amplify screen shake intensity (PhysicsSystem.js)
12. ✅ Add hit flash overlay on player damage

---

### 🔲 Remaining (3 tasks — Estimated 2-3 hours)

**Game Feel Enhancements (3/5)**:

#### 13. Add muzzle flash particles for weapons
**Location**: `docs/js/systems/WeaponSystem.js`
**Complexity**: Medium
**Estimated Time**: 45-60 minutes

**Implementation**:
- Listen for `WEAPON_FIRE` events
- Create particle burst at weapon fire position
- 3-5 particles per shot, short lifetime (0.1-0.2s)
- Small, bright particles (white/yellow)
- Emit radially from barrel position with slight randomness

**Files to Modify**:
- `WeaponSystem.js`: Add particle emission in `fireWeapon()` method
- May need particle system if not already present

---

#### 14. Add projectile trails and impact sparks
**Location**: `docs/js/systems/WeaponSystem.js`, `docs/js/systems/RenderSystem.js`
**Complexity**: Medium-High
**Estimated Time**: 60-90 minutes

**Implementation**:

**Projectile Trails**:
- Add trail particles behind moving projectiles
- Fade over time (0.2-0.4s lifetime)
- Match projectile color
- 1-2 particles per frame for each projectile

**Impact Sparks**:
- Listen for `PROJECTILE_HIT` events
- Create particle burst at impact position (5-10 particles)
- Radial emission from impact point
- Short lifetime (0.15-0.3s)
- Orange/white particles

**Files to Modify**:
- `WeaponSystem.js`: Emit particles on projectile updates and hits
- `RenderSystem.js`: Ensure particle rendering is active
- May need to check `PhysicsSystem.js` for collision events

---

#### 15. Add UI value change animations (credit flash)
**Location**: `docs/js/systems/UISystem.js`
**Complexity**: Low-Medium
**Estimated Time**: 30-45 minutes

**Implementation**:
- Listen for `CREDITS_CHANGE` event
- Flash credit display when value changes
- Green for increases, red for decreases
- 0.5s animation duration
- Use CSS transitions or manual animation

**Files to Modify**:
- `UISystem.js`: Add event listener and animation logic
- May need to add CSS animation classes

**Bonus** (if time):
- Animate cargo count changes
- Animate health/shield bar changes
- Show "+§X" floating text for credit gains

---

## Quick Start for Next Session

```bash
# Start server
cd /Users/alexvoigt/Documents/GPT-5/space-simulator-ev
python3 -m http.server 8000

# Open browser
# Navigate to http://localhost:8000/docs/
```

**Order of Implementation** (recommended):
1. Muzzle flash (simplest, immediate visual feedback)
2. Impact sparks (builds on muzzle flash pattern)
3. Projectile trails (most complex, requires per-frame particle emission)
4. UI animations (polish, can be done independently)

**Testing**:
- For muzzle flash/trails: Fire weapons (SPACE), watch projectiles
- For impact sparks: Hit asteroids or NPCs, watch collision points
- For UI animations: Buy items, complete missions, watch credit display

**Success Criteria**:
- Combat feels punchy and satisfying
- Projectiles are easy to track visually
- Player gets clear feedback for economic actions
- No performance degradation (maintain 60fps)

---

## After Phase 1 Completion

**Phase 2 Preview** (from strategic roadmap):
- Production hardening (error monitoring, save versioning, memory leak fixes)
- Delivery/escort mission mechanics implementation
- Testing infrastructure (Jest/Vitest setup)
- CI/CD pipeline

**Phase 3 Preview**:
- Dynamic risk/reward systems
- Random events (15-20 unique scenarios)
- Faction storylines
- More locations (6-8 new planets)

See `SESSION_68_HANDOFF.md` for complete 3-phase roadmap (160-180 hours total).

---

## Notes for Next Developer

- All core systems are in place and functional
- Mission/ship data is in `docs/js/data/gameData.js`
- Event system is in `docs/js/core/EventBus.js`
- Most particle effects use existing patterns in codebase
- Check `ExplosionRenderer.js` for particle implementation examples
- UI animations can use existing CSS classes or add new ones to `docs/css/main.css`

**Known Good Patterns**:
- Particle creation: See explosion sparks in ExplosionRenderer.js:126-150
- Event listening: See mission system in MissionSystem.js:15-36
- UI updates: See mission panel in UISystem.js:1296-1386

Good luck! 🚀
