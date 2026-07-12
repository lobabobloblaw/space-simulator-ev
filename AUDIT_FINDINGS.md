# Code Audit Findings — April 2026

Full 5-domain audit covering rendering, game logic/AI, state/persistence, UI/input/economy, and bootstrap/cross-cutting concerns. Scope: ~23.7K LOC across 55 JS files.

**Prior audits (Nov 2025):** 5 sessions fixed NPCSystem crash, XSS, planet cache leak, O(n^2) algorithms, HiDPI damage flash, save race conditions. Those are not re-reported here.

**Remediation status:** All 30 active items remediated on 2026-04-05. 9 items deferred (touchControls dead code, edge cases). 15 dead JS files + 27 legacy HTML files deleted (6,129 LOC removed). See `REMEDIATION_PLAN.md` for full tracking.

---

## Summary

| Severity | Count | Key Themes |
|----------|-------|------------|
| CRITICAL | 6 | Dual projectile processing, event listener leaks, rAF leak, touch leak |
| HIGH | 16 | Event string mismatches, save field omissions, economy exploit, stuck keys, dead event handlers, canvas state leaks |
| MEDIUM | 18 | Gradient allocations, dead code, orphaned events, clock mixing, UI field mismatch |
| LOW | 8 | Profiling globals, dead constants, minor GC pressure |
| **Total** | **48** | |

---

## CRITICAL Findings

### C1. Projectile Double-Processing — WeaponSystem + PhysicsSystem Both Handle Collisions
- **Files:** `WeaponSystem.js:599-614`, `PhysicsSystem.js:536-605`
- **Problem:** Both systems iterate `state.projectiles` every frame. WeaponSystem splices hits; PhysicsSystem emits `PHYSICS_PROJECTILE_HIT` but does NOT splice. Result: duplicate debris events, and projectiles that hit asteroids in PhysicsSystem survive to the next frame where WeaponSystem may register a second hit.
- **Impact:** Double damage on asteroids, extra visual debris, wasted CPU.
- **Fix:** Remove projectile collision from PhysicsSystem (WeaponSystem already owns it). The comment at PhysicsSystem:120 acknowledges this intent but `checkCollisions` still runs.

### C2. UISystem: 6 EventBus Listeners Never Cleaned Up
- **File:** `UISystem.js:140-160`
- **Problem:** `PHYSICS_THRUST_CHANGED`, `PHYSICS_BRAKE_CHANGED`, `AUDIO_STATE_CHANGED`, `AUDIO_MUSIC_STATE`, `SHIP_DEATH`, `SHIP_RESPAWN` registered with inline arrows or named methods not included in `destroy()`. Re-initialization stacks duplicate handlers. The two PHYSICS handlers fire every frame during flight.
- **Fix:** Store all handler references; add `eventBus.off()` for all 6 in `destroy()`.

### C3. UISystem: `_overlayKeyHandler` Accumulates on Repeat Landings
- **File:** `UISystem.js:579-618`
- **Problem:** `showLandingOverlay()` attaches a `keydown` listener to `document`. If called twice (rapid landing events), the first handler is orphaned — `this._overlayKeyHandler` is overwritten before the old one is removed.
- **Fix:** Defensively remove existing handler at top of `showLandingOverlay()` before attaching new one.

### C4. UISystem: `requestAnimationFrame` Loop in `fadeInPlanetImage` Never Cancelled
- **File:** `UISystem.js:1860-1943`
- **Problem:** `fadeInPlanetImage()` starts a recursive rAF loop with no stored handle. Repeat landings create concurrent loops drawing to the same canvas. `destroy()` cannot stop them.
- **Fix:** Store rAF handle in `this._fadeRAF`; cancel at start of each new call and in `destroy()`.

### C5. touchControls.js: No `destroy()` — 9 Event Listeners Permanently Leak
- **File:** `touchControls.js:75-90`
- **Problem:** `init()` adds 9 listeners (touch, mouse, resize) using inline `.bind(this)` calls. No cleanup method exists. Currently dead code in production (not imported by active entry point), but if activated, leak is permanent.
- **Fix:** Store bound handler references; add `destroy()` method.

### C6. touchControls.js Writes KeyCode Format; InputSystem Reads Lowercase — Touch Controls Non-Functional
- **File:** `touchControls.js:31-34,153-154`
- **Problem:** Touch buttons use `'KeyF'`, `'Space'`, etc. but InputSystem reads `'f'`, `' '`. Every touch input is silently ignored. Touch controls have never worked in any build that uses InputSystem.
- **Fix:** Change all key strings to lowercase logical format: `'KeyF'` -> `'f'`, `'Space'` -> `' '`, etc.

---

## HIGH Findings

### H1. RunSystem Listens on Wrong Credit Event String
- **File:** `RunSystem.js:66`
- **Problem:** Subscribes to `'credits.change'` but emitters use `GameEvents.CREDITS_CHANGE` = `'economy.credits.change'`. Handler never fires. Zone progression credit tracking is silently broken.
- **Fix:** Replace `'credits.change'` with `GameEvents.CREDITS_CHANGE`.

### H2. Ship Downgrade Produces Negative `finalPrice` — Free Credits Exploit
- **File:** `ShopSystem.js:217-226`
- **Problem:** `finalPrice = newShipClass.price - tradeInValue`. Downgrading from expensive to cheap ship makes `finalPrice` negative. Check `credits < finalPrice` always passes for negative values. Player gains credits on downgrade.
- **Fix:** `const finalPrice = Math.max(0, newShipClass.price - tradeInValue);`

### H3. Save System Omits `maxHealth`, `pirateKills`, `missionKills`, Ship `class`
- **Files:** `SaveSystemAdapterFixed.js:43-54,401-427`
- **Problem:** `_assignShipSafe` allowlist includes `'class'` but `_buildSaveData` never saves `ship.class`. `maxHealth` is not in either. After reload: ship class reverts to `'shuttle'`, max health resets to 100 regardless of purchased ship.
- **Fix:** Add `class: ship.class`, `maxHealth: ship.maxHealth`, `pirateKills: ship.pirateKills`, `missionKills: ship.missionKills` to `_buildSaveData`'s `shipSnapshot`.

### H4. No `window.blur` Handler — Keys Get Stuck on Alt-Tab
- **File:** `InputSystem.js`
- **Problem:** `this.keys` is a Set of pressed keys. No `blur`/`visibilitychange` handler clears it. Alt-tabbing while holding thrust/fire/turn leaves those keys permanently active.
- **Fix:** Add `blur` handler that calls `this.keys.clear()` and emits stop events for thrust/brake/turn/fire.

### H5. `ENTITY_DESTROYED` Never Emitted — AudioSystem/WeaponSystem Handlers Dead
- **File:** `EventBus.js`, `AudioSystem.js:123`, `WeaponSystem.js:59`
- **Problem:** Both systems listen for `ENTITY_DESTROYED` (`'combat.entity.destroyed'`). Nothing emits it. Explosion audio and weapon cleanup on entity death never trigger via this path.
- **Fix:** Either emit `ENTITY_DESTROYED` from NPCSystem on NPC death, or remove the dead listeners and ensure those behaviors are handled elsewhere.

### H6. `PROJECTILE_HIT` Never Emitted — Shield Audio Never Plays
- **File:** `AudioSystem.js:124`
- **Problem:** Listens for `PROJECTILE_HIT` = `'combat.projectile.hit'`. Active code emits `PHYSICS_PROJECTILE_HIT` = `'physics.projectile.hit'`. Different strings. Shield/collision sounds never fire.
- **Fix:** Change AudioSystem to listen to `PHYSICS_PROJECTILE_HIT`.

### H7. `GAME_PAUSE`/`GAME_RESUME`/`GAME_PAUSE_TOGGLE` Have No Active Listeners
- **File:** `EventBus.js:179-181`
- **Problem:** Emitted by `main_eventbus_pure.js`, `StateManager`, `InputSystem`. Only listener was in dead `Game.js`. Pause state works (via `state.paused` mutation), but no system can react to the pause *event* (e.g., AudioSystem doesn't pause music on pause).
- **Fix:** Add listeners in relevant systems or in `setupEventHandlers()`.

### H8. Duplicate Loot Drop on Pirate Death
- **Files:** `NPCSystem.js:322-341`, `SpawnSystem.js:226-244`
- **Problem:** Both systems independently drop 2-4 loot pickups (60% chance each) when a pirate dies. Pirates yield ~double the intended loot.
- **Fix:** Remove loot drop from one system (NPCSystem comment says "keep visuals/loot here only" but SpawnSystem also handles it).

### H9. Player Can Fire Weapons While Landed
- **File:** `WeaponSystem.js:477`
- **Problem:** `processWeaponInput()` has no `ship.isLanded` guard. Player can fire projectiles while the landing overlay is open.
- **Fix:** Add `if (ship.isLanded) return;` at top of `processWeaponInput()`.

### H10. Canvas State Leak in `renderWarpEffects`
- **File:** `RenderSystem.js:3260-3378`
- **Problem:** Sets `lineWidth`, `strokeStyle`, `fillStyle` with no `save()`/`restore()`. Leaks into subsequent `renderDebug` within the world pass.
- **Fix:** Wrap loop body in `ctx.save()`/`ctx.restore()`.

### H11. WebGL Context Loss Not Handled
- **File:** `WebGLRenderSystem.js:1-185`
- **Problem:** No `webglcontextlost`/`webglcontextrestored` handlers. Context loss (memory pressure, GPU driver events) permanently breaks rendering with silent no-ops.
- **Fix:** Add event listeners to handle loss (null out gl) and restoration (re-acquire context, re-init).

### H12. Minimap `shadowBlur` Not in save/restore Block
- **File:** `RenderSystem.js:3457-3469`
- **Problem:** `minimapCtx.shadowBlur = 3` set for planet dots outside save/restore. Exception between set and clear leaks shadow into subsequent minimap draws.
- **Fix:** Wrap in save/restore or reset unconditionally at top of `renderMinimap`.

### H13. `npc.weapon.cooldown` Accessed Without Null Guard
- **File:** `NPCSystem.js:720-721`
- **Problem:** Line 721 accesses `npc.weapon.cooldown` in patrol miss-fire path. Patrol NPCs always have weapons, but the pattern is fragile — any NPC type with `weapon: null` entering this path would crash.
- **Fix:** Guard: `if (npc.weapon) npc.weaponCooldown = npc.weapon.cooldown * 0.5;`

### H14. `PICKUP_COLLECTED`/`PHYSICS_PICKUP_COLLECTED` Are Duplicate Constants
- **File:** `EventBus.js:237,246`
- **Problem:** Both map to `'physics.pickup.collected'`. Works by accident but impossible to differentiate semantics. Any future listener on one fires for both.
- **Fix:** Remove one; use the surviving constant everywhere.

### H15. Anonymous `setTimeout` in `showNotification()` Untracked
- **File:** `UISystem.js:2001-2013`
- **Problem:** Timer not stored; `destroy()` can't cancel it. `_notifActive` flag not reset in `destroy()`, so new instances may have a corrupted drain state.
- **Fix:** Track timer ID in `this._drainTimerId`; clear in `destroy()`; reset `_notifActive = false`.

### H16. `muteKey` Click Listener Accumulates on Re-init
- **File:** `UISystem.js:114-120`
- **Problem:** Inline arrow function added in `init()` with no cleanup. Re-init stacks duplicate `AUDIO_TOGGLE` emits per click.
- **Fix:** Store handler reference; remove in `destroy()`.

---

## MEDIUM Findings

### M1. Mixed Clock Sources in SpawnSystem (Date.now vs performance.now)
- **File:** `SpawnSystem.js:1047-1053`
- Spawn timer uses `Date.now()`, cooldown uses `performance.now()`. Consistent within each, but mixed usage is a maintenance trap.

### M2. Regular NPCs Spawn During Boss Fight
- **File:** `SpawnSystem.js:1039-1058`
- No flag blocks regular spawning when a boss is alive. Pirates/traders appear during boss encounters.

### M3. NPC Projectiles Cause Friendly Fire Between NPCs
- **File:** `WeaponSystem.js:276-298`
- NPC shots skip only the shooter, not faction allies. Patrol shots can kill traders.

### M4. Boss `spawnMessage` Never Displayed
- **File:** `SpawnSystem.js:1005`, `NPCSystem.js:975-985`
- `_lastPhase` initialized to 0, same as first `currentPhase`. Phase 0 transition message never triggers.
- **Fix:** Initialize `_lastPhase: -1`.

### M5. `loadFromStorage()` Would Trigger Reload Loop If Called
- **File:** `StateManager.js:468`
- Emits `GAME_LOAD` which `SaveSystemAdapterFixed` handles with `window.location.reload()`. Currently safe (only called from dead code).

### M6. Pending Save Re-invocation Passes Null Data
- **File:** `SaveSystemAdapterFixed.js:339`
- Coalesced pending save runs as light save regardless of original intent.

### M7. Double Notification on Every Save/Load Message
- **File:** `SaveSystemAdapterFixed.js:619-662`
- `showMessage()` emits `UI_MESSAGE` AND injects DOM element. Every notification appears twice.

### M8. Backup HTML Files Load Legacy Save Systems in Production
- **File:** `index_hybrid_backup.html:136`
- Served by GitHub Pages. Players navigating to backup URL could corrupt saves.

### M9. `gameData.js` Mission `isComplete` References `window.ship` Fallback
- **File:** `gameData.js:217-511`
- `window.ship` is always `undefined` in pure EventBus build. Bounty missions fail silently if caller doesn't pass `state.ship`.

### M10. UISystem `updateTradingPanel()` Uses Wrong Field Name
- **File:** `UISystem.js:1088`
- Checks `ship.currentPlanet` but correct field is `ship.landedPlanet`. Panel never populates via this code path (TradingSystem handles it separately).

### M11. Notification Queue Unbounded (QA Mode)
- **File:** `UISystem.js:2020`
- When `UI_TOASTS` enabled, queue grows without limit during message bursts.

### M12. AudioContext Not Resumed on Keyboard/Touch Gestures
- **File:** `AudioSystem.js:67-71`
- Only `click` resumes AudioContext. Keyboard-first players get no audio.

### M13. `MathUtils.normalizeAngle` Infinite Loop on Infinity Input
- **File:** `MathUtils.js:58-62`
- `while` loop never terminates on `±Infinity`. Safe variant `normalizeAngleSafe` exists but isn't used everywhere.

### M14. `window.__profFrameCount` Written in Hot Update Loop
- **File:** `main_eventbus_pure.js:898`
- Pointless window global write every frame. Should be a closure variable.

### M15. Double Import of `gameData.js`
- **File:** `main_eventbus_pure.js:843` and `:96-106`
- Two separate `import()` calls. Module dedup prevents double fetch, but two result references is a maintenance hazard.

### M16. DebugSystem Emits Core Events as Raw Strings
- **File:** `DebugSystem.js` (multiple lines)
- Uses `'render.quality'`, `'ship.landed'`, `'game.pause'` etc. instead of `GameEvents.*` constants.

### M17. `ThrusterFXRenderer` Creates Gradient Per Frame
- **File:** `ThrusterFXRenderer.js:77-81`
- `createRadialGradient` on every thrusting NPC per frame. Cacheable by `glowR`.

### M18. `ShipDesigns.draw()` Creates Gradient Per Call
- **File:** `ShipDesigns.js:14`
- `createLinearGradient` per NPC per frame in vector fallback mode. Cacheable by `size`.

---

## Dead Code Inventory

### Legacy JS Files (confirmed unreachable from `index.html`)
| File | LOC | Status |
|------|-----|--------|
| `main.js` | 1,318 | Dead — no active HTML |
| `main_eventbus.js` | 634 | Dead — only `index_hybrid_backup.html` |
| `main_eventbus_inline.js` | 581 | Dead |
| `main-refactored.js` | 168 | Dead — only `index-refactored.html` |
| `main_eventbus_minimal.js` | 41 | Dead — only `minimal-test.html` |
| `main_old_backup.js` | 1 | Dead |
| `core/Game.js` | 425 | Dead — only imported by `main-refactored.js` |
| `core/MigrationBridge.js` | 285 | Dead — only imported by `main-refactored.js` |
| `systems/saveSystem.js` | 226 | Dead |
| `systems/SaveSystemAdapter.js` | 157 | Dead |
| `systems/SaveSystemEventBus.js` | 194 | Dead |
| `systems/planetRenderer.js` | 793 | Dead |
| `systems/planetRenderer2.js` | 599 | Dead |
| `utils/CollisionUtils.js` | 385 | Dead — only imports Vector2D |
| `utils/Vector2D.js` | 322 | Dead — only imported by CollisionUtils |
| **Total** | **6,129** | **26% of non-vendor LOC is dead code** |

### Legacy HTML Files (27 files in `/docs/` beyond `index.html`)
All backup/test HTML files are served by GitHub Pages. See M8 for the risk.

---

## Event Naming Audit Summary

### Never Emitted (dead handlers listening)
`PROJECTILE_HIT`, `ENTITY_DESTROYED`, `SHIP_THRUST`, `NPC_HOSTILE`, `TRADE_COMPLETE`, `PROJECTILE_FIRED`

### Never Listened To (dead signals)
`PATROL_WARNING`, `PATROL_STAND_DOWN`, `PATROL_ASSIST`, `CREDITS_CHANGE`, `MISSION_UPDATED`, `PHYSICS_IMPULSE_APPLIED`, `GAME_PAUSE`, `GAME_RESUME`, `GAME_PAUSE_TOGGLE`, `EXPLOSION_CREATED`

### Raw Strings Not in GameEvents (13 total)
`debug.fps`, `debug.damage`, `render.quality`, `render.spriteCulling`, `render.useEffectsSprites`, `render.toggleParticles`, `assets.ready`, `canvas.resize`, `asteroid.destroyed`, `pickup.expired`, `state.loaded`, `state.change`, `state.reset`

### Duplicate Constants
`PICKUP_COLLECTED` and `PHYSICS_PICKUP_COLLECTED` both = `'physics.pickup.collected'`

### String Mismatch (BUG)
`RunSystem` listens on `'credits.change'`; emitters use `'economy.credits.change'`

---

## Recommended Fix Order

### Batch 1: Game-Breaking Bugs (fix first)
1. **C1** — Remove projectile collision from PhysicsSystem
2. **H1** — Fix RunSystem credit event string
3. **H2** — Clamp ship trade-in `finalPrice` to >= 0
4. **H3** — Add missing fields to save snapshot
5. **H6** — Fix AudioSystem to listen to `PHYSICS_PROJECTILE_HIT`

### Batch 2: Resource Leaks (fix before next release)
6. **C2** — Clean up UISystem EventBus listeners in `destroy()`
7. **C3** — Defensive `_overlayKeyHandler` removal
8. **C4** — Store/cancel `fadeInPlanetImage` rAF handle
9. **H4** — Add window blur handler to InputSystem
10. **H15** — Track notification timer; reset in `destroy()`
11. **H16** — Store/remove muteKey click handler

### Batch 3: Correctness & Polish
12. **H5** — Wire `ENTITY_DESTROYED` emitter or remove dead handlers
13. **H7** — Wire pause event listeners in active systems
14. **H8** — Deduplicate pirate loot drop
15. **H9** — Block weapon fire while landed
16. **M4** — Initialize boss `_lastPhase: -1`
17. **M3** — Add faction check to NPC friendly fire
18. **M2** — Block regular spawns during boss fight

### Batch 4: Rendering & Performance
19. **H10** — save/restore in `renderWarpEffects`
20. **H11** — WebGL context loss handling
21. **H12** — save/restore minimap shadowBlur
22. **M17-M18** — Cache gradients in ThrusterFX and ShipDesigns

### Batch 5: Architecture Cleanup
23. **H14** — Remove duplicate `PICKUP_COLLECTED` constant
24. **M16** — DebugSystem: use GameEvents constants
25. **Dead code** — Delete 6,129 LOC of confirmed dead JS + 27 legacy HTML files
26. **M12** — Resume AudioContext on keyboard/touch gestures

---

## Verified Clean (Confirmed No Issues)

- LRU cap in proceduralPlanetRenderer (AUDIT_5 fix verified)
- `withWorld()`/`withScreen()` DPR handling correct
- FactionVisuals faction key fallback works (defaults to civilian)
- SpriteMappings type fallback works (defaults to pirate sprite)
- TargetCam `window.*` flags are read-only diagnostic gates
- Gradient caching for pickups (AUDIT_5 fix verified)
- Frame reset at render() top covers all required properties
- WebGL activation gated behind opt-in flags (production always Canvas2D)
- NPC state machines have no stuck states
- Boss phase algorithm is correct (iterative last-wins)
- Patrol pursuit has proper timeout/breakoff
- Fleeing NPCs caught by despawn distance
- Projectile-player collision correctly splices
- No division by zero in physics normalization
- localStorage write is atomic (browser guarantee)
- Save validation covers malformed JSON and missing fields
- Older save versions handled via `??` defaults
