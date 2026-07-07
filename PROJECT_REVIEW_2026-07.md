# Project Review — Galaxy Trader (July 2026)

Scope: full review of the shipped build (`docs/` as served by GitHub Pages, entry
`docs/js/main_eventbus_pure.js`) plus repo hygiene. Every finding below was verified
against the actual code and the live import graph (what `docs/index.html` really loads).
File:line references are to the current `main`/review branch head (`160d7d2`).

---

## Executive summary

- **The architecture migration was left half-finished, and that is the root cause of most bugs.**
  The "pure EventBus" build still runs legacy per-system logic *alongside* the migrated
  PhysicsSystem paths, so several things execute twice per tick or per event: asteroids and
  pickups are simulated by two systems, weapon cooldowns are decremented twice (~2× fire
  rate), pirate loot rolls twice per kill, one click in the trading UI buys/sells twice,
  and a lethal hit fires the player death sequence 3+ times.
- **Persistence is the most user-hostile area**: mission progress and reputation are lost on
  every normal page reload (save writer and boot loader disagree on schema), engine
  upgrades lose their effect after reload while the shop still shows them as "Owned", and
  every save — including manual F5 — is downgraded to a deferred "light" autosave that
  stores an empty world.
- **Pause does not exist in the shipped build.** `GAME_PAUSE`/`GAME_PAUSE_TOGGLE`/`GAME_RESUME`
  are only consumed by `core/Game.js`, which is never imported. The world keeps simulating
  behind the landing overlay.
- **Roughly a third of the JS is verified dead**: 6 unused `main*.js` entry points, an entire
  abandoned parallel architecture (`Game.js`, `MigrationBridge.js`), two dead planet
  renderers, a ~500-line legacy TargetCam pipeline inside RenderSystem duplicating
  `TargetCamRenderer`, three dead save systems sharing the live localStorage key, and
  ~19 test/debug HTML pages — all published on the public site.
- **Recent hardening claims are only partially real**: the CSP exists and is meaningful, but
  likely breaks tracker-music playback (`wasm-unsafe-eval` missing); `innerHTML` with
  interpolated data still builds the trading/shop panels and the debug overlay; the ARIA
  live region is dead markup nothing ever writes to.
- The good news: `EventBus`, `GameLoop` (true fixed timestep), `HUDRenderer`, and the live
  TargetCam upgrade-only source selection are genuinely well built, and the render code
  shows real performance discipline (adaptive quality, culling, throttled panels).

---

## 1. Critical gameplay bugs (High)

### 1.1 Double-execution family — two systems own the same entities

| What | Where | Effect |
|---|---|---|
| Asteroid integration ×2 | `PhysicsSystem.js:306-337` + `SpawnSystem.js:952-980` | Asteroids move at 2× configured speed; drift chance doubled |
| Pickup integration ×2 | `PhysicsSystem.js:342-369` + `SpawnSystem.js:983-1002` | Friction 0.98 net; `PICKUP_LIFETIME: 600` ("10 s") is actually ~5 s; duplicate expiry events |
| Player weapon cooldown ×2 | `PhysicsSystem.js:224-226` + `WeaponSystem.js:513-515` | All player weapons fire at ~2× their configured/shop-listed rate |
| Pirate loot ×2 | `NPCSystem.js:315-333` + `SpawnSystem.js:213-231` | Identical drop block in both death handlers; expected drops roughly doubled |
| Projectile-hit events ×2 | `PhysicsSystem.js:531-594` + `WeaponSystem.js:266-298` | Hit debris spawns twice; physics re-emits every overlapping frame; any future damage listener would double-damage |
| Trading click handlers ×2 | `TradingSystem.js:145` (direct call) + `UISystem.js:1042` (emits `TRADE_BUY`, which TradingSystem also handles) | One BUY click charges twice / adds two cargo; one SELL sells two units |

**Fix direction:** decide single ownership per entity type (Physics *or* Spawn, not both),
single damage/hit path (WeaponSystem), single UI delegate (UISystem emits, TradingSystem
handles). Most of the high-severity list resolves in one ownership pass.

### 1.2 Player death fires 3+ times per kill
`main_eventbus_pure.js:297-330`, `StateManager.js:159-170`, `WeaponSystem.js:318-319`.
The StateManager proxy emits `SHIP_DAMAGE` + `SHIP_DEATH` on the health write; the
`SHIP_DAMAGE` handler re-emits `SHIP_DEATH`; WeaponSystem emits its own `SHIP_DAMAGE`
→ third death. The `SHIP_DEATH` handler has no re-entry guard, so each emission runs the
full destruct sequence (explosion, message, audio), and further hits at 0 HP keep adding more.

### 1.3 Pause is a no-op in the shipped build
`InputSystem.js:174` and `main_eventbus_pure.js:365` emit pause events whose only
subscribers live in dead `core/Game.js:98-112`. Nothing ever sets `state.paused`, so the
`if (!state.paused)` gate in the update loop never engages — NPCs, combat, spawning, and
autosave all continue while the landing overlay is open.

### 1.4 TargetCam silhouette can be starved forever on ordinary 60 Hz displays
`TargetCamRenderer.js:420-427` with `IDLE_LIGHT_MS: 16`: a vsync'd frame is ~16.7 ms, so
the "6 consecutive light frames" streak almost never completes, `_resolveSource` is never
reached, and the silhouette never builds. Threshold needs to be ≥ ~17-18 ms.

---

## 2. Persistence (High)

Active save system (verified): `SaveSystemAdapterFixed` only. `saveSystem.js`,
`SaveSystemEventBus.js`, `SaveSystemAdapter.js` are dead — but all write the same
`galaxyTraderSave` key with incompatible schemas and no version check on load, so opening
any legacy/test page can corrupt the live save.

1. **Mission progress + reputation lost on every normal reload.** Writer saves
   `mission: { activeId, completed }` (`SaveSystemAdapterFixed.js:227-229`); boot reads
   `save.missionSystem` (`main_eventbus_pure.js:86`) — never written. Reputation is only
   restored via the F9 path, not on boot.
2. **Saved active mission clobbered anyway**: `main_eventbus_pure.js:899-906`
   unconditionally sets `missionSystem.active = available[0]` after init, re-announcing
   "New Mission" every load.
3. **Engine upgrades don't survive reload.** `ShopSystem.js:95-97` mutates
   `maxSpeed`/`thrust`, which are neither persisted nor re-derived from the persisted
   `engineLevel` (`main_eventbus_pure.js:105-106` resets defaults). Shop then shows
   "Owned" (`UISystem.js:1096`), so the player can't re-buy the lost effect.
4. **Every save is a deferred "light" autosave — including manual F5.**
   `InputSystem.js:189-191` emits `GAME_SAVE` with no payload; every gate in
   `SaveSystemAdapterFixed` treats missing payload as `auto` (lines 121-160), and the F5
   keypress itself bumps the 12 s input-quiet window. NPCs/asteroids/pickups are always
   saved empty (line 201), making the entire world-restore path (lines 308-349) dead code.
5. **HUD crash vector**: `UISystem.js:459-460` / `SaveSystemAdapterFixed.js:437-438` index
   `ship.weapons[ship.currentWeapon]` guarded only by `length > 0`; a drifted save with
   `currentWeapon >= weapons.length` throws on every HUD update.

---

## 3. StateManager — the weak core piece (Medium)

The live game uses `stateManager.state` as a plain shared mutable blob and ignores every
StateManager affordance (`get/set/update/addEntity/removeEntity` have zero live callers).
Meanwhile the Proxy layer costs real overhead:

- `get` trap mints a **new Proxy per property read** (`StateManager.js:134-148`) —
  `state.ship !== state.ship`, plus constant GC pressure in 60 Hz hot loops.
- Every write allocates and emits a `state.change` event **with zero subscribers**
  (`:122-131`); specific events fire even on no-op writes (`:180-182`) — this unchecked
  re-emit is what makes dead `Game.js`'s pause/save loops infinitely recursive.
- `reset()` always throws (`this.constructor.call(this)`, `:244`).
- Its default ship schema (`credits: 1000`, `currentWeaponIndex`, …) and its own
  `saveToStorage` format (`:291-305`, same localStorage key, drops missions) are both dead
  and contradict the real ones — misleading documentation of "the" state shape.
- `GAME_SAVE`/`GAME_LOAD` are used both as commands (adapter listens) and completion
  notifications (StateManager emits after saving) — same event, opposite semantics.

**Recommendation:** strip StateManager to a plain state container (drop the Proxy layer or
make it dev-only), delete its save/schema code, and keep event emission explicit at call
sites — which is how the live code already behaves.

---

## 4. Rendering (Medium)

Live paths work and perform well; the issues are duplication, dead weight, and
sim-mutation in the renderer.

- **~2,000 lines of verified dead render code**: legacy `renderTargetCam()` + support
  (`RenderSystem.js:910-1308`, includes an `if (false && …)` block); five dead vector-ship
  functions (`:2028-2177`); `planetRenderer.js` and `planetRenderer2.js` (zero imports);
  `SpriteResolver.js`, `RenderLint.js`; `AssetSystem.getFrameCanvas` (50-line duplicate of
  the exported function, zero callers). `buildTargetCamCache()` still runs at init to feed
  a cache only the dead path reads.
- **Renderer mutates simulation state**: `asteroid.rotation += rotationSpeed`
  (`RenderSystem.js:1669`), `star.twinkle`, screen-shake/damage-flash decay, pickup
  twinkle — all frame-rate-dependent, all belong in update.
- **Star wrap broken for negative coords** (`:1523-1524` etc.): JS `%` is sign-preserving,
  so `screenX < -6000` never wraps — starfield thins asymmetrically far from origin.
  Needs `((x % L) + L) % L`.
- **Perf hot spots**: up to 4,800 per-star rect draws with per-star `globalAlpha`/
  `fillStyle`/`shadowBlur` churn (prerender a tile per layer); per-frame gradient
  allocations in projectile trails, thruster plumes, pickup glows, nebula (two 4000×4000
  fills/frame on high); `getBoundingClientRect()` inside TargetCam `render()` every ~33 ms
  (forced layout, redundant with the ResizeObserver path); no frustum culling in
  `renderAsteroids` (every other pass culls).
- Inline atlas alias maps in RenderSystem (`:1964-1970`, `:2344-2350`) duplicate and drift
  from `SpriteMappings.aliasSpriteForType` — the "centralized mapping" is half-true.
- `TargetCamRenderer` `consider('preloaded', …)` skips the `isImageReady` check the other
  paths use (`:548-549`) — safe today only by an undocumented AssetSystem invariant.
- Auto-quality comment says default OFF; code defaults it ON (`RenderSystem.js:547-551`).

---

## 5. Security / accessibility — claims vs. reality (Medium)

- **CSP**: present and meaningful (no inline scripts, `script-src 'self'`), but:
  - Missing `wasm-unsafe-eval` — the tracker radio (`libopenmpt` worklet, all shipped
    playlist entries are `type: 'tracker'`) needs WASM; Chromium blocks compilation under
    this policy, so radio likely falls back to synth or fails.
  - `img-src … https:` and `connect-src 'self' https:` permit beaconing to any HTTPS host;
    `base-uri`/`object-src` unset.
- **"innerHTML removed" only holds for landing details.** Trading and shop panels are
  still template-interpolated `innerHTML` (`UISystem.js:988-996, 1019-1029, 1105-1116`) —
  latent (data is static today). The debug overlay interpolates **save-derived**
  `weapon.type` into `innerHTML` (`DebugSystem.js:178-212`) — a localStorage-tamper
  self-XSS, the one place attacker-influenceable data meets `innerHTML`.
- **ARIA live region (`#gameAnnouncements`) is dead markup** — zero JS references ever
  write to it.
- `scripts/push-with-token.sh` leaves the PAT embedded in the git remote URL
  (`.git/config`) after use — footgun; prefer credential helper or `gh auth`.

---

## 6. Balance / data integrity (Low–Medium)

- **Free money exploit**: every landing grants `credits += 50` plus free full repair and
  refuel (`main_eventbus_pure.js:353`) — land/depart grinding is unbounded.
- **Mission checks don't match descriptions** (`gameData.js:217, 230-232, 243`):
  "Earn 500 credits from trading" completes at total `credits >= 750` (starting credits
  count; buying delays it); "destroy pirate vessels" missions check total `kills` of *any*
  NPC — killing 3 traders completes "Bounty Hunter" (`pirateKills` exists, unused).
- **Three drifted stat tables**: `WeaponSystem.weaponTypes` vs `GameConstants.WEAPONS` vs
  `gameData.js` disagree on rapid/plasma/mining cooldowns, damage, speed; the fallback
  weapon behaves differently from the purchased one. Same for NPC stats:
  `SpawnSystem.npcTypes` vs `gameData.npcTypes` (patrol maxSpeed 0.45 vs 1.2, pirate
  weapon plasma-15 vs laser-10, …). The active build spawns from SpawnSystem's copy.
- NPC projectile speed hardcoded to 2 for every weapon type in the *actually used* firing
  path (`NPCSystem.js:1014-1038`); the accuracy/spread implementation
  (`WeaponSystem.fireNPCProjectile`) is never called.
- Hostility angle check lacks wrap-around normalization (`NPCSystem.js:178`) — shooting
  across the atan2 seam is never flagged hostile; patrols lock onto any firing pirate at
  unlimited range (`NPCSystem.js:584, 602`).
- `NPCSystem.js:297,307` emit `EXPLOSION_CREATED`, which has **zero listeners** — the
  1 large + 4 small NPC death explosions never render; only the single one from the entry
  file shows.
- Every planet prices all 6 commodities, so the "Not accepted here / NO BUYERS" path is
  currently unreachable. `TradingSystem.buyCommodity` can throw (`landedPlanet.name`
  unguarded, `:223`) and can poison credits with NaN via `data-price` (`:197`).
- Duplicate key `PURSUIT_TIMEOUT` twice in the same `NPC` constants literal
  (`Constants.js:177, 226`) — silent-override trap.

---

## 7. Lifecycle / leaks (Low)

A recurring pattern: subscribing with `fn.bind(this)` or inline arrows, then calling
`off()` with a different reference — removal silently fails.

- `WeaponSystem.js:58` vs `:650`; `SpawnSystem.js:125,132` vs `:1130-1131` (offs a
  brand-new `() => {}`); `AudioSystem.js:130` vs `:835`.
- `UISystem.destroy()` leaks ~6 anonymous handlers, radio timers, a ResizeObserver;
  `NPCSystem`, `TradingSystem`, `DebugSystem` have no `destroy()` at all.
- `EventBus.once()` returns no unsubscribe and can't be `off()`'d (wrapper stored).
- `TargetCamRenderer._silDims` map never pruned (unbounded over long sessions).
- Audio nits: mute→unmute permanently stops music (`AudioSystem.js:147-158` reads
  `wasPlaying` after `pauseMusic` already cleared it); small-explosion volume ignores
  `masterVolume` (`:315` — ternary precedence).
- Impact is limited in a one-shot page, but these bite any hot-reload/test harness.

---

## 8. Repo hygiene (Medium)

- **Dead entry points shipped to production**: `main.js`, `main-refactored.js`,
  `main_eventbus.js`, `main_eventbus_inline.js`, `main_eventbus_minimal.js`,
  `main_old_backup.js` — only `main_eventbus_pure.js` + `qaToggles.js` load.
  `core/Game.js` + `core/MigrationBridge.js` are an abandoned parallel architecture with
  *provably-never-ran* infinite-recursion bugs (save/load/pause event loops) — delete,
  don't revive.
- **28 HTML files under `docs/`**, ~19 of them test/debug/backup pages, all published on
  the public GitHub Pages site (`index_old_backup.html`, `test-*.html`, `debug-*.html`, …).
- **Committed junk**: `server.pid` (tracked despite being in `.gitignore` — needs
  `git rm --cached`), personal screenshots (`screenshots/Screenshot 2025-08-21 …`),
  11 MB of raw `explosions/` PNGs at repo root *plus* processed copies under
  `docs/assets/`, and a full duplicate `chiptune-3/` at root alongside
  `docs/js/vendor/chiptune-3/`.
- **Heavy published assets**: `docs/assets/explosion.gif` is 5.9 MB and `logo.png` 1.3 MB
  on a page with a <512 KB bundle target.
- **Docs sprawl**: 15 `SESSION_*_HANDOFF.md` at root (older ones already archived —
  continue that), and root `README.md` vs `docs/README.md` drift.
- **No tests, no CI, no lint.** For a 29k-line game this is the biggest process gap — even
  a smoke test that boots the page headless (Playwright is available) plus an import-graph
  dead-code check would have caught several of the High findings above.

---

## 9. What's good

- `EventBus.js` and `GameLoop.js` are small, correct, and well designed (true fixed
  timestep with accumulator; per-listener error isolation).
- The live TargetCam honors its documented contract exactly (deterministic upgrade-only
  rank order, PNG-only +90° inner rotation).
- Real performance engineering: frame-time-adaptive quality scaling, entity culling,
  throttled side panels, LRU-capped atlas frame cache, DPR-aware canvases.
- `HUDRenderer` is clean; `RenderHelpers.withWorld/withScreen` is a good convention,
  mostly followed.
- Internal docs (`INTERNAL_DEV_DOCS/`, `AGENTS.md`) are unusually thorough and mostly
  accurate about intent — the code just hasn't finished catching up to them.

---

## 10. Prioritized action plan

1. **Ownership pass (1 day, fixes ~6 High bugs):** one system per concern — remove
   asteroid/pickup integration and weapon-cooldown decrement from PhysicsSystem's
   duplicated paths, loot drop from one of the two death handlers, the direct
   `buyCommodity` call from TradingSystem's click delegate, and gate `SHIP_DEATH` with a
   re-entry guard while collapsing the damage→death emit chain to a single emitter.
2. **Persistence fix:** align writer/loader keys (`mission` vs `missionSystem`), restore
   reputation on boot, re-derive `maxSpeed`/`thrust` from `engineLevel` at load, treat
   payload-less `GAME_SAVE` as a manual full save, and stop clobbering the restored
   active mission at init.
3. **Implement pause for real:** subscribe the pause events in the live entry (or a small
   PauseSystem) and set `state.paused`.
4. **Delete dead code** (mechanical, zero risk after verification): 6 entry points,
   Game/MigrationBridge, 2 planet renderers, legacy TargetCam pipeline + its cache build,
   3 dead save systems, dead ship-draw functions, test/backup HTML pages (or move them
   out of the published `docs/` root), duplicate root `chiptune-3/`, `server.pid`,
   screenshots, raw `explosions/`.
5. **Single source of truth for stats:** collapse WeaponSystem/SpawnSystem literals and
   `gameData` tables into `Constants.js` (this is already the stated TECH_DEBT plan —
   the drift has since become behavioral).
6. **CSP/a11y follow-through:** add `wasm-unsafe-eval` (verify radio), tighten
   `connect-src`/`img-src`, convert trading/shop/debug panels off `innerHTML`, actually
   write to the ARIA live region.
7. **Add a minimal safety net:** headless boot smoke test + console-error assertion in CI;
   an unused-module check would keep the dead-code problem from regrowing.
8. **TargetCam idle-gate threshold** `IDLE_LIGHT_MS` 16 → 18 so silhouettes build on
   60 Hz displays; fix the star-wrap modulo.

Longer term (unchanged from TECH_DEBT.md, still valid): spatial partitioning for the
O(n²) collision checks, object pooling for projectiles/effects, and either finishing or
removing the WebGL spike.
