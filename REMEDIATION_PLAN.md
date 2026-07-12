# Audit Remediation Plan — April 2026

Tracking document for fixes from the full code audit (`AUDIT_FINDINGS.md`).
48 findings across 5 batches. Check off items as they are completed.

---

## Batch 1: Game-Breaking Bugs (5 items)

### [x] C1 — Remove Projectile Collision from PhysicsSystem
- **File:** `docs/js/systems/PhysicsSystem.js:536-605`
- **What:** `checkCollisions()` iterates `state.projectiles` and emits `PHYSICS_PROJECTILE_HIT` but never splices. WeaponSystem already handles projectile collision and splicing. Both run every frame on the same array.
- **Fix:** Remove the projectile-vs-NPC and projectile-vs-asteroid collision blocks from `PhysicsSystem.checkCollisions()`. Keep ship-planet, ship-asteroid, and pickup collision logic. Verify WeaponSystem handles all projectile hit events that other systems (SpawnSystem, AudioSystem) depend on.
- **Test:** Fire at an asteroid cluster. Confirm single debris burst per hit, no double-damage.

### [x] H1 — Fix RunSystem Credit Event String
- **File:** `docs/js/systems/RunSystem.js:66` (and matching `off` at ~line 446)
- **What:** Subscribes to `'credits.change'`; emitters use `GameEvents.CREDITS_CHANGE` = `'economy.credits.change'`.
- **Fix:** `this.eventBus.on(GameEvents.CREDITS_CHANGE, this._handleCreditsChange)` — import `GameEvents` if needed.
- **Test:** Sell cargo, confirm zone credit requirement updates.

### [x] H2 — Clamp Ship Trade-In Price
- **File:** `docs/js/systems/ShopSystem.js:217-226`
- **What:** `finalPrice = newShipClass.price - tradeInValue` goes negative on downgrade, giving free credits.
- **Fix:** `const finalPrice = Math.max(0, newShipClass.price - tradeInValue);`
- **Test:** Buy expensive ship, try to trade down to shuttle. Confirm price is 0, not negative.

### [x] H3 — Add Missing Fields to Save Snapshot
- **File:** `docs/js/systems/SaveSystemAdapterFixed.js:401-427` (`_buildSaveData`) and `:43-54` (`_assignShipSafe`)
- **What:** `_buildSaveData` omits `class`, `maxHealth`, `pirateKills`, `missionKills`. After reload, ship reverts to shuttle with 100 HP.
- **Fix:** Add to `shipSnapshot`: `class: ship.class`, `maxHealth: ship.maxHealth`, `pirateKills: ship.pirateKills || 0`, `missionKills: ship.missionKills || 0`. Add `maxHealth`, `pirateKills`, `missionKills` to `_assignShipSafe` allowlist.
- **Test:** Buy a battlecruiser, save, reload page. Confirm ship class and max health persist.

### [x] H6 — Fix AudioSystem Projectile Hit Event
- **File:** `docs/js/systems/AudioSystem.js:124`
- **What:** Listens for `PROJECTILE_HIT` (`'combat.projectile.hit'`), but active code emits `PHYSICS_PROJECTILE_HIT` (`'physics.projectile.hit'`).
- **Fix:** Change listener to `GameEvents.PHYSICS_PROJECTILE_HIT`.
- **Test:** Shoot an NPC. Confirm shield/collision sound plays.

---

## Batch 2: Resource Leaks (6 items)

### [x] C2 — Clean Up UISystem EventBus Listeners
- **File:** `docs/js/systems/UISystem.js:140-160` (init), `destroy()` method
- **What:** 6 listeners registered without corresponding `off()` in `destroy()`: `PHYSICS_THRUST_CHANGED`, `PHYSICS_BRAKE_CHANGED`, `AUDIO_STATE_CHANGED`, `AUDIO_MUSIC_STATE`, `SHIP_DEATH`, `SHIP_RESPAWN`.
- **Fix:** Store handler references as bound methods in constructor. Add all 6 `eventBus.off()` calls to `destroy()`.
- **Test:** Check `eventBus.getListenerCount()` for those events before/after destroy.

### [x] C3 — Defensive `_overlayKeyHandler` Removal
- **File:** `docs/js/systems/UISystem.js:579-618`
- **What:** `showLandingOverlay()` overwrites `this._overlayKeyHandler` without removing the previous one.
- **Fix:** At top of `showLandingOverlay()`:
  ```js
  if (this._overlayKeyHandler) {
      document.removeEventListener('keydown', this._overlayKeyHandler);
      this._overlayKeyHandler = null;
  }
  ```
  Also add this cleanup to `destroy()`.
- **Test:** Land on a planet rapidly twice. Confirm only one keydown handler active.

### [x] C4 — Cancel `fadeInPlanetImage` rAF Loop
- **File:** `docs/js/systems/UISystem.js:1860-1943`
- **What:** Recursive `requestAnimationFrame` loop with no stored handle. Concurrent loops on repeat landing.
- **Fix:** Store handle: `this._fadeRAF = requestAnimationFrame(fadeTransition)`. Cancel at start of `drawPlanetVisual()` and in `destroy()`: `if (this._fadeRAF) cancelAnimationFrame(this._fadeRAF)`.
- **Test:** Land on two different planets quickly. Confirm no jittering planet image.

### [x] H4 — Add Window Blur Handler to InputSystem
- **File:** `docs/js/systems/InputSystem.js`
- **What:** No blur handler. Keys stuck in `this.keys` on alt-tab/focus loss.
- **Fix:** Add blur handler:
  ```js
  this._handleBlur = () => {
      this.keys.clear();
      this.eventBus.emit(GameEvents.INPUT_THRUST, { active: false });
      this.eventBus.emit(GameEvents.INPUT_BRAKE, { active: false });
      this.eventBus.emit(GameEvents.INPUT_TURN, { direction: 0 });
      this.eventBus.emit(GameEvents.INPUT_FIRE, { active: false });
  };
  window.addEventListener('blur', this._handleBlur);
  ```
  Add `window.removeEventListener('blur', this._handleBlur)` to `destroy()`.
- **Test:** Hold W (thrust), alt-tab away and back. Confirm ship stops thrusting.

### [x] H15 — Track Notification Timer in UISystem
- **File:** `docs/js/systems/UISystem.js:2001-2013`
- **What:** Anonymous `setTimeout` for notification drain not tracked. `_notifActive` not reset in `destroy()`.
- **Fix:** Store timer ID in `this._drainTimerId`. Clear in `destroy()`. Reset `_notifActive = false` in `destroy()`.
- **Test:** Trigger notifications, destroy UISystem, re-init. Confirm drain still works.

### [x] H16 — Store/Remove muteKey Click Handler
- **File:** `docs/js/systems/UISystem.js:114-120`
- **What:** Inline arrow on `#muteKey` element. Accumulates on re-init.
- **Fix:** Store handler: `this._muteKeyHandler = () => this.eventBus.emit(...)`. Use in `addEventListener`. Remove in `destroy()`.
- **Test:** Init UISystem twice. Click mute. Confirm AUDIO_TOGGLE fires once.

---

## Batch 3: Correctness & Polish (7 items)

### [x] H5 — Wire or Remove Dead `ENTITY_DESTROYED` Listeners
- **Files:** `AudioSystem.js:123`, `WeaponSystem.js:59`
- **What:** Both listen for `ENTITY_DESTROYED` which is never emitted. Explosion audio via this path never plays.
- **Fix:** Option A: Emit `ENTITY_DESTROYED` from NPCSystem `handleNPCDeath` after the NPC is removed. Option B: Remove dead listeners and ensure explosion audio triggers via `EXPLOSION` event instead (verify it already does).
- **Test:** Kill an NPC. Confirm explosion sound plays.

### [x] H7 — Wire Pause Event Listeners
- **Files:** `main_eventbus_pure.js` (setupEventHandlers), `AudioSystem.js`
- **What:** `GAME_PAUSE`/`GAME_RESUME`/`GAME_PAUSE_TOGGLE` emitted but no active listener.
- **Fix:** Add handler in `setupEventHandlers()` or in AudioSystem to pause/resume music on game pause. Add handler for `GAME_PAUSE_TOGGLE` that toggles `state.paused`.
- **Test:** Press Escape (pause). Confirm music pauses. Press again, confirm resumes.

### [x] H8 — Deduplicate Pirate Loot Drop
- **Files:** `NPCSystem.js:322-341`, `SpawnSystem.js:226-244`
- **What:** Both systems drop loot independently. Pirates give double loot.
- **Fix:** Remove loot drop from NPCSystem (SpawnSystem is the canonical spawn/cleanup system). Keep the visual/explosion code in NPCSystem.
- **Test:** Kill a pirate. Count pickup drops. Should be 2-4 (not 4-8).

### [x] H9 — Block Weapon Fire While Landed
- **File:** `docs/js/systems/WeaponSystem.js:477`
- **What:** No `ship.isLanded` guard in `processWeaponInput()`.
- **Fix:** Add `if (ship.isLanded) return;` at top of method.
- **Test:** Land on planet. Press F. Confirm no projectiles created.

### [x] M4 — Fix Boss spawnMessage Display
- **File:** `docs/js/systems/SpawnSystem.js:1005`
- **What:** `_lastPhase: 0` prevents phase 0 transition message from showing.
- **Fix:** Change to `_lastPhase: -1`.
- **Test:** Advance to zone 2, trigger boss. Confirm spawn message appears.

### [x] M3 — Add Faction Check to NPC Friendly Fire
- **File:** `docs/js/systems/WeaponSystem.js:276-298`
- **What:** NPC projectiles skip only shooter, not faction allies. Patrol shots kill traders.
- **Fix:** In the NPC collision loop, also skip NPCs sharing the shooter's faction/behavior:
  ```js
  if (proj.shooter === npc || (!proj.isPlayer && proj.shooter?.behavior === npc.behavior)) continue;
  ```
- **Test:** Observe patrol-pirate combat near traders. Confirm traders not damaged by patrol fire.

### [x] M2 — Block Regular Spawns During Boss Fight
- **File:** `docs/js/systems/SpawnSystem.js:1039-1058`
- **What:** No flag prevents regular NPC spawning when boss is alive.
- **Fix:** At top of spawn logic, check: `if (state.npcShips.some(n => n.type === 'boss')) return;` (or use a flag set on `zone.boss.spawn` event).
- **Test:** Trigger boss fight. Confirm no new traders/pirates/freighters spawn until boss is dead.

---

## Batch 4: Rendering & Performance (4 items)

### [x] H10 — save/restore in `renderWarpEffects`
- **File:** `docs/js/systems/RenderSystem.js:3260-3378`
- **What:** `lineWidth`, `strokeStyle`, `fillStyle` set without save/restore, leak within world pass.
- **Fix:** Add `this.ctx.save()` at top of for-loop body, `this.ctx.restore()` at bottom.
- **Test:** Trigger warp effects near other entities. Confirm no visual artifacts on subsequent draws.

### [x] H11 — WebGL Context Loss Handling
- **File:** `docs/js/systems/WebGLRenderSystem.js`
- **What:** No `webglcontextlost`/`webglcontextrestored` handlers. Production uses Canvas2D by default, so this is low-blast-radius.
- **Fix:**
  ```js
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.gl = null; }, false);
  canvas.addEventListener('webglcontextrestored', () => {
      this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (this.gl) this._setupGL();
  }, false);
  ```
- **Test:** Enable WebGL mode (`window.RENDER_WEBGL = true`), verify rendering works.

### [x] H12 — save/restore Minimap shadowBlur
- **File:** `docs/js/systems/RenderSystem.js:3457-3469`
- **What:** `shadowBlur` set for planet dots without save/restore wrapping.
- **Fix:** Either wrap in `minimapCtx.save()`/`minimapCtx.restore()`, or add `minimapCtx.shadowBlur = 0` unconditionally at top of `renderMinimap`.
- **Test:** Check minimap rendering after planet dots. No shadow bleed.

### [x] M17+M18 — Cache Gradients in ThrusterFX and ShipDesigns
- **Files:** `ThrusterFXRenderer.js:77-81`, `ShipDesigns.js:14`
- **What:** `createRadialGradient` per thrusting NPC per frame (ThrusterFX). `createLinearGradient` per NPC per frame in vector mode (ShipDesigns).
- **Fix:** Cache gradients in a `Map` keyed by `glowR` (ThrusterFX) and `size` (ShipDesigns). Clear cache on quality change if needed.
- **Test:** 10+ NPCs on screen. Check frame times before/after with profiler overlay.

---

## Batch 5: Architecture Cleanup (8 items)

### [x] H14 — Remove Duplicate PICKUP_COLLECTED Constant
- **File:** `docs/js/core/EventBus.js:237,246`
- **What:** `PICKUP_COLLECTED` and `PHYSICS_PICKUP_COLLECTED` both = `'physics.pickup.collected'`.
- **Fix:** Remove `PICKUP_COLLECTED`. Update all references (SpawnSystem emits it, AudioSystem listens to it) to use `PHYSICS_PICKUP_COLLECTED`.
- **Test:** Collect a pickup. Confirm audio plays and pickup is removed.

### [x] M16 — DebugSystem: Use GameEvents Constants
- **File:** `docs/js/systems/DebugSystem.js` (multiple lines)
- **What:** Emits `'render.quality'`, `'ship.landed'`, `'game.pause'` etc. as raw strings.
- **Fix:** Import `GameEvents` and replace all raw string emits with constants. For events not yet in GameEvents (render.quality, etc.), add them to the registry first.
- **Test:** Open debug panel. Toggle rendering options. Confirm they still work.

### [x] M12 — Resume AudioContext on Keyboard/Touch Gestures
- **File:** `docs/js/systems/AudioSystem.js:67-71`
- **What:** Only `click` resumes AudioContext. Keyboard-first players get no audio.
- **Fix:** Add resume on first `keydown` and `touchstart`:
  ```js
  const resumeCtx = () => { if (this.context?.state === 'suspended') this.context.resume(); };
  document.addEventListener('keydown', resumeCtx, { once: true });
  document.addEventListener('touchstart', resumeCtx, { once: true });
  ```
- **Test:** Start game with keyboard only (no clicks). Confirm SFX play.

### [x] M13 — Guard `normalizeAngle` Against Infinity
- **File:** `docs/js/utils/MathUtils.js:58-62`
- **What:** `while` loop infinite-loops on `±Infinity`.
- **Fix:** Add `if (!isFinite(angle)) return 0;` at top. Or replace all callers with `normalizeAngleSafe`.
- **Test:** `MathUtils.normalizeAngle(Infinity)` returns 0 (not hang).

### [x] M7 — Fix Double Notification in SaveSystem
- **File:** `docs/js/systems/SaveSystemAdapterFixed.js:619-662`
- **What:** `showMessage()` emits `UI_MESSAGE` AND injects DOM. Double notification.
- **Fix:** Make DOM fallback conditional:
  ```js
  const hasUI = this.eventBus.getListenerCount(GameEvents.UI_MESSAGE) > 0;
  this.eventBus.emit(GameEvents.UI_MESSAGE, { message: text, type, duration: 2500 });
  if (!hasUI) { /* DOM fallback */ }
  ```
- **Test:** Save game. Confirm one notification appears, not two.

### [x] M14 — Move `__profFrameCount` to Closure Variable
- **File:** `docs/js/main_eventbus_pure.js:898`
- **What:** Pointless `window.__profFrameCount` write every frame.
- **Fix:** Replace with `let __profFrameCount = 0;` at module scope. Remove `window.` prefix from reads/writes.
- **Test:** Profiler overlay still works. No `window.__profFrameCount` visible in console.

### [x] M9 — Remove `window.ship` Fallback in gameData.js
- **File:** `docs/js/data/gameData.js:217-511`
- **What:** `const s = ship || window.ship` in mission `isComplete` functions. `window.ship` always undefined.
- **Fix:** Remove `|| window.ship`. Just use `ship` parameter. Return `false` if `!ship`.
- **Test:** Accept a bounty mission. Kill NPCs. Confirm mission completes.

### [x] Dead Code Removal — 6,129 LOC + 27 HTML Files
- **What:** 15 JS files and 27 HTML files confirmed dead. 26% of non-vendor LOC.
- **Files to delete:**
  - JS: `main.js`, `main_eventbus.js`, `main_eventbus_inline.js`, `main-refactored.js`, `main_eventbus_minimal.js`, `main_old_backup.js`, `core/Game.js`, `core/MigrationBridge.js`, `systems/saveSystem.js`, `systems/SaveSystemAdapter.js`, `systems/SaveSystemEventBus.js`, `systems/planetRenderer.js`, `systems/planetRenderer2.js`, `utils/CollisionUtils.js`, `utils/Vector2D.js`
  - HTML: All 27 backup/test HTML files in `/docs/` (list in AUDIT_FINDINGS.md)
- **Pre-check:** `git status` to confirm no uncommitted work in these files. Archive to a `legacy/` branch if desired.
- **Test:** `python3 -m http.server 8000`, load `http://localhost:8000/docs/`. Full gameplay pass.

---

## Deferred / Won't Fix

| ID | Reason |
|----|--------|
| C5 | touchControls.js not imported by active entry point. Fix only if mobile support is added. |
| C6 | Same as C5 — touch controls are dead code in production. |
| M1 | Mixed clock sources are consistent within each usage. Low risk. |
| M5 | `loadFromStorage()` only called from dead code. Will be deleted with dead code removal. |
| M6 | Pending save coalescion is edge-case. Light save covers critical data. |
| M8 | Addressed by dead code removal (deleting legacy HTML files). |
| M10 | Dead code path in UISystem. TradingSystem handles it correctly. Fix or remove. |
| M11 | QA-mode only (behind `window.UI_TOASTS`). Cap queue if toasts are promoted to production. |
| M15 | Double import is harmless (browser dedup). Fix opportunistically. |

---

## Progress

| Batch | Total | Done | Status |
|-------|-------|------|--------|
| 1. Game-Breaking | 5 | 5 | **Complete** |
| 2. Resource Leaks | 6 | 6 | **Complete** |
| 3. Correctness | 7 | 7 | **Complete** |
| 4. Rendering | 4 | 4 | **Complete** |
| 5. Architecture | 8 | 8 | **Complete** |
| **Total** | **30** | **30** | **All complete** |

*Deferred: 9 items (C5, C6, M1, M5, M6, M8, M10, M11, M15)*
