# Galaxy Trader — Evolution Roadmap (September 2026)

Produced 2026-09-03 against `main` @ `14be27e` (post July-2026 remediation batches 0–3).
Inputs: five parallel code reviews (architecture, gameplay/content, rendering/performance,
assets/audio, UI/process) **plus the first real end-to-end playthrough** — headless Chromium
driven by real keyboard input through every screen, three zones, both bosses, victory, death,
resume, and a 100-NPC load test. Every defect below marked **[live]** was reproduced in that
playthrough, not inferred from reading.

This document supersedes the P0–P4 roadmap of July 2026 for sequencing. `REMEDIATION_PLAN_2.md`
batch 4 (the playthrough) is hereby executed; its anomalies are the Phase 0 list below.

---

## 1. Verdict

**The foundations are better than the earlier reviews implied.** `EventBus`, `GameLoop` (true
fixed timestep), `HUDRenderer` and the TargetCam contract are correct. All 46 non-vendor modules
import under bare Node with no DOM shim, and the six systems that carry the actual rules
(Physics, Weapon, NPC, Spawn, Mission, Shop) construct and `init()` with a plain object as state —
a headless simulation harness is a day's work, not a project. Performance is not a constraint:
the load test held 60 fps at 100 NPCs plus 46 projectiles on a 2× DPR 1080p canvas, and 120 fps
at 40. The smoke suite is 8/8 green.

**But the roguelike layer that was bolted on in Nov 2025 has never actually run end to end, and it
does not work.** In the shipped build:

- No boss ever spawns (`RunSystem.spawnZoneBoss()` has zero callers), so the Outer Rim gate can
  never pass and **the game cannot be won**.
- If you force the final boss and kill it, **nothing happens**: `RUN_VICTORY` has no listener,
  the world keeps simulating, and the player is left flying in a dead session.
- Meta-progression is inert: 4 of 6 ships can never be unlocked, the one boss ship-unlock is
  behind an early `return`, lifetime credits are stuck at 0 (which also hard-blocks every
  shipyard purchase), and the boss counter in `localStorage` is the string `"0pirate_lord"`.
- The four zones are pixel-identical. Zone `theme` and `planets` data have zero readers.
- Every player ship renders as the Scout Shuttle. Three of the most important enemies (elite
  pirate, void hunter, both bosses) share one 64×37 pirate sprite. All sprites are bilinear-blurred
  because a canvas resize resets `imageSmoothingEnabled`.
- The economy has a free lunch (+50 credits, full repair, refuel and a world-wide NPC wipe on
  every landing) and an unwinnable opening (unarmed, 250 credits, a 2-damage laser against a
  36-DPS pirate).
- "Cargo Expansion" halves your hold. Every shop upgrade is written against the shuttle baseline
  and downgrades a better hull.

**What this means for strategy.** The game is a well-engineered Escape-Velocity-style sandbox
wearing a roguelike costume. Content, art and features layered on now would land on a loop that
cannot complete and progression that cannot record. So the order is fixed:

0. **Make it winnable** (one to two sessions, all small fixes, ends with a test that plays to victory).
1. **Foundations that make content cheap** (sim harness, explicit system order, content registries,
   unified persistence, seeded RNG, dead-code sweep).
2. **A run that feels like a journey** (zone identity, enemy differentiation, real boss fights,
   economy with risk, ship art per class, game feel).
3. **Replayability** (node map with choices, relics, zone contracts, unlock ladder, daily seed).
4. **Reach** (PWA and share card, gamepad, mobile decision, voice comms).

---

## 2. Evidence — confirmed defects

Severity: **C** critical (loop-breaking) · **H** high (progression/economy wrong) · **M** medium ·
**L** low. Effort is the fix, not the investigation. **[live]** = reproduced in the playthrough.

### 2.1 Loop-breaking

| # | Defect | Where | Effect | Sev | Fix |
|---|---|---|---|---|---|
| L1 | `spawnZoneBoss()` never called; `ZONE_CHANGE`, `RUN_START`, `ZONE_BOSS_DEFEAT`, `RUN_VICTORY` have zero subscribers | `RunSystem.js:265`, `:113`, `:183`, `:252`, `:321` | No boss ever appears; Outer Rim → Void gate unreachable; run unwinnable **[live]** | C | S |
| L2 | No victory screen | `RunSystem.js:182-186` emits; nothing listens. `DeathScreenUI.js:45` only handles `RUN_END` | After void_king dies: no overlay, sim continues, NPCs respawn **[live]** | C | S |
| L3 | Boss unlock behind early return | `RunSystem.js:299-302` returns on `victoryTrigger` before `boss.unlocks` at `:305` | `battlecruiser` can never unlock; `_saveRun`/`ZONE_BOSS_DEFEAT` skipped **[live]** | H | S |
| L4 | Only unlock path is "first win → interceptor" | `RunSystem.js:426-437`; no other `unlockShip` caller | corvette, freighter, gunship, battlecruiser permanently locked in menu **[live]** | H | M (design) |
| L5 | Boss phase loop breaks on first threshold (1.0) | `NPCSystem.js:947-954` | Phases never change; phase messages never show; `addSpawnCount` has no implementation anywhere | H | S |
| L6 | Redundant delayed `endRun('victory')` | `main_eventbus_pure.js:580-583` | Warns "No active run to end" **[live]** | L | S |
| L7 | Menus/death do not pause; blur/focus un-pauses an open menu | `main:385-413`, `:1124-1127`; `InputSystem.js:122-140` | World simulates behind death screen and main menu **[live]** | M | S |

### 2.2 Progression and economy

| # | Defect | Where | Effect | Sev | Fix |
|---|---|---|---|---|---|
| E1 | `_handleCreditsChange` reads `data.delta`; emitters send `change` | `RunSystem.js:379-389` vs `StateManager.js:187-191`, `MissionSystem.js:186` | `creditsEarned` always 0, `creditsSpent` NaN, `totalCreditsEarned` 0 → every shipyard purchase blocked by `requiredCredits` (`ShopSystem.js:199-208`); death screen shows 0 **[live]** | H | S |
| E2 | `bossesDefeated += array` | `MetaStateManager.js:246` | Persisted stat becomes `"0pirate_lord,void_king"` **[live]** | M | S |
| E3 | Boss bounty pays half | `main:539-541` full pay only for `behavior === 'aggressive'`; boss has `'boss'` | 2,000 declared → 1,025 paid **[live: 7025−6000]** | L | S |
| E4 | Pickup splice-then-emit | `PhysicsSystem.js:509-523` emits `index` after splice; `SpawnSystem.js:361-376` reads that index | Loot awards the wrong pickup or nothing, and deletes an innocent one | H | S |
| E5 | Shop upgrades assign absolutely | `ShopSystem.js:96, 102-104, 109`; `gameData` `cargo1.value=5` | Cargo Expansion halves hold (10→5); shield/engine downgrade better hulls; no `alreadyOwned` guard for cargo (`UISystem.js:1099-1108`) | H | S |
| E6 | Landing free lunch | `main:416-452`: `credits += 50`, full repair/refuel, `npcShips = []` | ~600 cr/min zero-risk; trivialises both credit gates; wipes every hostile | H | S |
| E7 | Unarmed opening; `startingWeapons`/`startingCredits` absent from `shipClasses` | `main:1080-1081` reads fields `gameData.js:625-751` never define | Every hull starts with 250 cr and no weapon; Mining Laser 3.4 DPS vs pirate 36 DPS | H | S |
| E8 | Zone gate counts every NPC death | `RunSystem.js:357-378` no `killedBy` check; `ship.kills` (player-only) is a second counter | Patrol-vs-pirate fights advance the gate; trader kills count **[live]** | M | S |
| E9 | HUD shows only the kills half of a two-part gate | `HUDRenderer.js:255-264` else-if chain | Player at 15/15 kills, 4,000/5,000 cr sees no reason for the missing ADVANCE | M | S |
| E10 | `ship.class` vs `ship.shipClass` | `main:1066` writes `class`; `ShopSystem.js:170,219,233`, `UISystem.js:1396,1413` read `shipClass` | Trade-in valued as shuttle; shipyard shows "Scout Shuttle" as current in any hull **[live]** | M | S |
| E11 | Escort missions can never complete | `MissionSystem.js:119` sets `escortArrived=false`; never set true; no escort NPC spawns | 5 static + ~25% procedural missions permanently "in progress" | M | M |
| E12 | Bounty missions count any kill; "Merchant Apprentice" checks total credits | `gameData.js:217, 230-232, 243` (`pirateKills` unused) | Mission text lies | L | S |
| E13 | Two mission stores | `state.missionSystem` (`main:300`) vs `state.ship.missions` (`MissionSystem.js:59`) | Boot toast announces a mission the board doesn't consider active **[live]** | M | M |
| E14 | Live mission progress never saved | Save persists `state.missionSystem` (`SaveSystemAdapterFixed.js:415-418`); live store is `ship.missions` (not in allowlist `:51-59`) | The July "fix" repaired the dead store; progress still lost on reload | H | S |
| E15 | New run inherits old run | `initShipForRun` (`main:1061-1096`) never resets `engineLevel`, `weaponLevel`, `radarLevel`, `missions`, `missionStates`, `tutorialStage`, `reputation`, `pickups`, `asteroids` | Stale upgrades/missions leak across runs | M | S |
| E16 | Elite chance dead in Frontier | `zones.js:56` `eliteChance: 0.1` but `elite_pirate` not in `enemyTypes`; weight chain `SpawnSystem.js:651-665` | No elites in zone 2 despite data | L | S |
| E17 | Bosses not scaled by zone; boss `projectileSpeed` ignored; NPC aim has no spread | `SpawnSystem.js:937-938`; `NPCSystem.js:1090-1114` hardcodes speed 2; `WeaponSystem.fireNPCProjectile` (`:531-575`) unused | Boss shots indistinguishable from pirate shots; `GameConstants.NPC.ACCURACY` has no effect | M | S |

### 2.3 Presentation

| # | Defect | Where | Effect | Sev | Fix |
|---|---|---|---|---|---|
| P1 | Zone `theme`/`planets` have zero readers; `STAR_DENSITY` hard-coded | `zones.js:34-38…`; `main:248`; `renderNebula` hard-coded | All four zones identical **[live: screenshots]**; all planets available in The Void | H | S |
| P2 | Player `spriteId` pinned to `shuttle_1`; `classMap` lacks corvette/gunship/battlecruiser | `main:178`; `RenderSystem.js:2803, 2844, 2983` | Every class renders as the shuttle | H | S |
| P3 | No sprite for `boss`; elite/void alias to `pirate_0` | `SpriteMappings.js:4-27` | Three signature enemies look like a pirate | H | art |
| P4 | `imageSmoothingEnabled` reset by `canvas.width=` in `resizeCanvas()` | `RenderSystem.js:154-156` vs `:3441-3442` | All main-canvas pixel art bilinear-blurred, always | H | S (1 line) |
| P5 | Starfield wrap confined to origin band | `RenderSystem.js:1866-1867, 1887-1888, 1904-1905` | Near stars vanish past ~2,140 world units; Ice World trips are in the thinning zone | M | M (tile) |
| P6 | Auto-quality recovery effectively one-way | `RenderSystem.js:827-834` (2 bad frames demote; 90 clean frames to recover) | Players sit on `medium`; the nebula and star glow are high-only and effectively never seen | M | S |
| P7 | `npc.faction` never set by `SpawnSystem` | only `main:214` (seed NPCs) | Six finished faction palettes/decals (`FactionVisuals.js`) never render in play | M | S (1 line) |
| P8 | `EXPLOSION_CREATED` has zero listeners | `NPCSystem.js:305, 315` | 1 large + 4 small death explosions never render | L | S |
| P9 | Explosion flipbook loads ~12 s after boot and is off on `low` | `AssetSystem.js:373` | The best asset in the repo is usually invisible | L | S |
| P10 | Screen-space HUD ignores shake; NPC HUD drawn under projectiles/explosions | `HUDRenderer.js:57-58…`; `RenderSystem.js:2407-2427` before `:922-927` | Brackets detach during shake; health bars hidden in combat | L | S |
| P11 | Renderer mutates sim (shake, flash, asteroid spin, twinkle) per rAF | `RenderSystem.js:902-903, 945-946, 2155, 1891` | 2× speed on 120 Hz displays; blocks determinism | M | M |
| P12 | Asteroid + pickup double integration STILL live | `PhysicsSystem.js:123, 126` and `SpawnSystem.js:1056-1099` both move them | Asteroids 2× speed; pickup life 5 s not 10 s. July review's "fixed" is inaccurate | M | S |
| P13 | `void` weapon has no audio or colour branch | `AudioSystem.js:268-283`; `RenderSystem.js:2718-2726` | Final boss sounds and looks like a laser | L | S |
| P14 | Landing art defaults to dead `source.unsplash.com`, then 4×12 s Pollinations retries | `UISystem.js:46-50, 962-971` | Up to ~48 s of doomed fetches per landing; landing canvas shows a blank gradient **[live]** | M | S |

### 2.4 UX and onboarding

| # | Defect | Where | Effect | Sev | Fix |
|---|---|---|---|---|---|
| U1 | `Z` (zone advance) named nowhere | `index.html:88-113`, tutorial, HUD prompt | The core loop action is undiscoverable | H | S |
| U2 | Tutorial says "Fire with SPACE"; pre-roguelike copy | `UISystem.js:490, 495` | Wrong key (F fires, Space brakes); never mentions zones/bosses/permadeath | M | S |
| U3 | All feedback on one 9 px white line; colour toasts disabled | `#tutorialHint`; `UISystem.js:66` | Boss warning = pickup = unlock; unlock toast overwritten within 1 s by boss death line **[live]** | M | S |
| U4 | "NEW UNLOCKS" block permanently empty | `DeathScreenUI.js:47` hardcodes `[]`; `RUN_END` payload has no `unlocks` | Player never sees what they earned | M | S |
| U5 | No PAUSED indicator | — | Pause reads as a hang | L | S |
| U6 | Menu ship carousel mouse-only; no gamepad; blind touch zones still bound | `MainMenuUI.js:155-167`; `InputSystem.js:50-55, 340-467` | Keyboard users can't pick a ship; phones fire invisible controls | M | M |
| U7 | ARIA live region never written; no `prefers-reduced-motion`; no OG/share meta; no PWA manifest | `index.html:26`; `main.css` | — | L | S |

### 2.5 Persistence and process

| # | Defect | Where | Effect | Sev | Fix |
|---|---|---|---|---|---|
| S1 | Three localStorage keys, one version check, no migrations; run blob has no schema; F12 clears 1 of 3 | `SaveSystemAdapterFixed.js:427`, `RunSystem.js:409-416`, `MetaStateManager.js:122-125`, `:718-719` | Corrupt or mismatched saves throw in HUD/RunSystem | M | M |
| S2 | Run save written synchronously on every kill and credit change | `RunSystem.js:376, 388` | Mid-combat `JSON.stringify` + `setItem` | L | S |
| S3 | Meta and run saves fail silently on quota | `MetaStateManager.js:135-138`, `RunSystem.js:404-406` | Unlocks silently lost in private browsing | L | S |
| S4 | Update order = object insertion order; Physics runs before NPC and Weapon | `main:866`, `initializeSystems` | Collisions resolve against last frame; 4 empty `update()` stubs at 60 Hz | M | S |
| S5 | Version stamp 13 months stale | `Constants.js:8` `c1e2bfd-dirty+2025-08-27` shown in-game **[live]** | Live site misreports its build | L | S |
| S6 | Docs wrong: 3 bosses / Warlord Krix / The Devourer | `CLAUDE.md`; both READMEs pre-roguelike | Misleads every session | L | S |
| S7 | 7 of 13 `scripts/` dead or dangerous (`push-with-token.sh` embeds a PAT; two hardcode a moved path) | `scripts/` | — | L | S |
| S8 | CSP allows `'unsafe-eval'` in addition to `'wasm-unsafe-eval'` | `index.html:8` | Wider than needed | L | S |
| S9 | ~450 lines zero-caller code inside live modules; ~1,000 lines dead render code (`renderTargetCam`, five vector ship painters, `buildTargetCamCache` still runs at init); WebGL spike | `StateManager` non-Proxy API, `PhysicsSystem` (2 unqueried `SpatialHash` rebuilt per frame), `WeaponSystem`, `GameLoop`, `ErrorUtils`, `RenderSystem.js:1238-1636, 2541-2690` | — | L | S |
| S10 | Published cruft: `explosion.gif` 5.9 MB orphan (31% of docs/), `logo.png` 1.3 MB at 108 px, 10 orphan planet PNGs, 43-byte `chiptune2.*` stubs, unlicensed tracker music, 4 `.DS_Store` | `docs/assets`, `docs/js/vendor`, `docs/music` | 2.4 MB eager first load | L | S |

---

## 3. Enhancement fronts

### 3.1 Run structure and game design

**Today:** one linear corridor of four zones; two gates are "hold N credits and N kills", one is a
boss that never appears. Nothing is randomised except spawns and asteroid layout; there is no
seed, no map, no build choice; the correct upgrade order is identical every run (Mining → Rapid →
Plasma → Shield → Engine). Trading dominates (Ice World ⟷ Crimson Moon is +350/unit/circuit,
~1,200 cr/min, zero risk); combat pays 60–600 cr/min. `pirate`, `elite_pirate` and `void_hunter`
share one AI routine and one sprite. Six faction palettes, reputation, achievements and a
scavenger AI all exist and are dormant.

**Enhancements, ranked:**

1. **Node map, 2–3 choices per jump (FTL-style).** Replace the linear `zones[]` walk with a
   small seeded graph per zone: `{ id, zoneId, kind: combat|derelict|market|elite|boss,
   modifier: nebula|minefield|patrolled|null, reward, connects[] }`. Present successors on
   `INPUT_ZONE_ADVANCE`. `market` nodes carry a randomised price table (trading becomes a per-run
   decision); `elite` nodes trade danger for a guaranteed relic. Owner: `RunSystem`; generator in
   `data/zones.js`; one node-select overlay; HUD shows the current node's modifier. **L.**
2. **Relics — 3-choose-1 passive modifiers** at boss kills, elite kills and derelicts. A
   `data/relics.js` table of ~25 entries with hook fields (`weaponCooldownMult`, `bountyMult`,
   `shieldRegen`, `patrolHostile`, …) applied at the four multiplier sites that already exist
   (projectile damage/cooldown, bounty line, shop price). Stored on the run. This single
   interaction is what makes runs differ. **M.**
3. **Make risk real.** Remove the +50 grant; charge repair (~2 cr/HP) and fuel; landing no longer
   wipes NPCs; credit gates become *spend* targets. Give every hull `startingWeapons` (the field
   `initShipForRun` already reads). Retune the opening so a pirate is killable in ~8 s with the
   starter weapon and lethal in ~6 s of sustained hits. **S.**
4. **Enemies that fight differently.** New `makeAIDecision` cases: `elite` (holds 250–350,
   three-shot bursts, retreats to reload) and `ambusher` (drifts unpowered until 400, then a
   high-thrust charge with a shimmer tell). Route NPC fire through the unused
   `WeaponSystem.fireNPCProjectile` so `ACCURACY` and per-weapon speed apply. Re-enable the
   scavenger. Set `npc.faction` in `spawnNPC` (one line; lights up `FactionVisuals`). **M.**
5. **Boss fights worth remembering.** Fix the phase loop (keep the *last* matching threshold);
   implement `addSpawnCount` (spawn N adds on phase entry, bypassing the boss-time spawn block at
   `SpawnSystem.js:992`); scale boss HP by zone; one telegraphed signature attack each (Blackstar:
   mine spread; Void King: charged beam with a wind-up tell and safe arc); clear the arena, tint
   the nebula, cut the music on spawn; a third boss for Frontier (the docs already promise one)
   so every zone exit is a fight. **M.**
6. **Missions as zone contracts.** Board offers 3–5 contracts scoped to the current zone
   (bounty on `pirateKills`, delivery to a zone planet, "survive N spawns", "kill the elite");
   escort either implemented (spawn a trader NPC that follows a route; `escortArrived` set on its
   landing) or cut. Merge the two mission stores; reset on new run; persist `ship.missions`.
   `missionsCompleted` feeds the run summary. **M.**
7. **Meta unlock ladder + achievements.** Define unlock conditions for all six hulls (e.g.
   corvette: clear Frontier; freighter: 20,000 lifetime trade profit; gunship: kill 100 pirates;
   battlecruiser: win). `data/achievements.js` (~20) on `RUN_END`/`ZONE_CHANGE`/`NPC_DEATH`.
   Shop gating consults `MetaStateManager` (recorded unlocks currently gate nothing). Menu shows
   the condition on locked cards. **M.**
8. **Seeded and daily runs; endless mode.** Depends on the RNG service (3.4). Seed shown on the
   death/victory screen; "Daily" button uses the date; endless loops zones with rising multipliers
   after victory. **M** after foundations.

### 3.2 World identity and presentation

**Today:** four zones, one look. The nebula is high-quality-only and effectively never shown
(P6). Ship art: 10 PNGs, nose-up, 27–98 px; no boss, elite or void-hunter art; player always the
shuttle; all blurred (P4). Planets render procedurally; four adopted planet PNGs are dormant behind
a QA flag. Explosion flipbook (98 frames, 2.1 MB) is the only bitmap FX and is rarely seen.
Muzzle flash, trails and impact sparks from Session 69 **did** land; "UI value animations" did not.

**Enhancements, ranked:**

1. **Wire `zone.theme` (S, ~40 lines).** On `zone.change`: nebula colour from `theme.nebulaColor`,
   star stride/alpha from `theme.starDensity`, tint the cached clear gradient, filter
   `state.planets` by `zone.planets`, emit `ambientTrack` to audio. Then per-zone asteroid
   palette and star colour bias (M).
2. **Fix the sprite pipeline before commissioning art.** `imageSmoothingEnabled` after resize
   (1 line); set `ship.spriteId` from class in `initShipForRun`/`buyShip`; make `sprites.json`
   authoritative (delete the hard-coded 10-id list in `AssetSystem.loadKnownShipSprites`, drive
   TargetCam prewarm from it); per-entry `{id, src, w, h, rotationOffset?, thrusterAnchors?}`;
   delete the two inline alias maps in `RenderSystem` in favour of `aliasSpriteForType`. **S–M.**
3. **Art batch 1 (atelier, `retro-diffusion/rd-plus`):** six player hulls, boss ×3, elite pirate,
   void hunter, scavenger. Spec: nose-up, transparent, centred pivot, 96–192 px long edge (draw
   target is 32–90 px at DPR 1, so author at 2×), sizes per `ShipCatalog` class. Provenance log
   in a new `SOURCES.md` per `ATELIER_TEMPLATE.md`.
4. **Zone backdrops ×4** (`rd-tile` / `nano-banana-pro`): a new backdrop layer does not exist —
   `BackdropPass` (below) must land first. Pre-rendered star tiles per layer (fixes P5 and the
   9,600-rect star cost) plus a parallax nebula tile.
5. **Game feel, cheap in Canvas2D:** hit-stop via `GameLoop.timeScale` (0.15 for 60–90 ms on
   player hit and boss phase change); shake applied to the camera so HUD follows (fixes P10);
   vignette that deepens with damage; chromatic hit flash; bloom-lite via a half-res offscreen
   with `filter: blur()` composited `lighter` (replaces every `shadowBlur`, likely net faster);
   ribbon trails (removes the per-projectile gradient); load the flipbook during the boot ramp;
   `VFX_DEBRIS_POLISH` on by default; UI value flash on credits/cargo/health change (`@keyframes
   shake` already exists with no consumer).
6. **HUD that explains the run:** colour-coded toasts by severity (re-enable `.game-notification`
   and route `warning`/`success` there); boss telegraph banner; both halves of a gate on the zone
   indicator with the `Z` key named; PAUSED state; player damage numbers (the `debug.damage`
   pipeline already collects them); a flight-time contract tracker; minimap legend.
7. **Planets:** switch `PLANETS.MODE` to sprite once 512–1024 px art exists for all four (plus
   one per new zone planet); retire the Unsplash/Lexica/Pollinations landing fetch in favour of a
   curated still per planet (`nano-banana-pro`), procedural fallback kept.

### 3.3 Audio

**Today:** every SFX is synthesised from oscillators; music is seven tracker modules via
libopenmpt WASM (lazy, licence-free — attribution missing). `AudioSystem.playStream()` is fully
implemented for `type: 'stream'` playlist entries and unused. `void` has no sound.

1. Zone beds ×4 and boss themes ×3 via `stability-ai/stable-audio-2.5` (30 s seamless loops,
   −18 LUFS, m4a), landed through `playStream()` with new `radioPlaylist.js` entries; `theme.ambientTrack`
   selects the bed. Music ducks and switches on boss spawn.
2. Sampled SFX layer: per-cue `sampleUrl` + `decodeAudioData` cache; branch to a `BufferSource`
   through the existing gain chain, else the current synth (satisfies the 404 doctrine per cue).
   6–8 cues first (fire ×4, hit, explosion, pickup, land) via `stable-audio-open-1.0`/`audiogen`.
3. Add the `void` branch to `playLaser`; attribution file for the tracker modules or replace them.
4. Later: comms barks via TTS (`minimax/speech-2.8-turbo`) for boss lines and patrol warnings.

### 3.4 Architecture

**Today:** `EventBus`/`GameLoop` are right. The orchestrator (1,232 lines) holds ~60% game logic.
Update order is accidental. The `StateManager` Proxy costs ~0.8 ms/s (benchmarked) but breaks
object identity, double-emits `SHIP_DAMAGE`/`GAME_PAUSE`, and forces re-entrancy guards; its
entire non-Proxy API is dead. 258 `Math.random` sites, no seed; spawn timing uses wall clock.
Weapons are defined in five places and dispatched on `type` in ten. 27 events emitted with no
subscriber, 8 subscribed with no emitter. Three persistence keys, one version check, no
migrations. `RenderSystem` 3,494 lines, `UISystem` 1,983 (39% is the landing-art fetcher).

**Enhancements, ranked (sequence matters):**

1. **`core/SystemRegistry.js`** — declared systems with an explicit update order
   (`input → npc → weapon → physics → spawn → mission → …`), a dependency check, no empty stubs.
   **S.** Precondition for the harness and RNG.
2. **Headless sim harness + `node:test`** on the six pure systems: boot `StateManager` + systems,
   run N ticks, assert. A whole run to victory in ~2 s. Move the four DOM-touching constructor
   lookups (`TradingSystem`, `MainMenuUI`, `DeathScreenUI`, `RenderSystem`) into `init()`. **M.**
3. **Retire the Proxy** → plain container + three explicit mutators `applyDamage`, `addCredits`,
   `setPaused` (~20 call sites); keep the Proxy behind `?dev=1` as a write auditor. **M.**
4. **`core/Rng.js`** — counter-based PRNG with named streams (`world`, `spawn`, `combat`,
   `missions`); seed in `RunSystem` stats and the run save; convert ~170 sim sites, leave ~55 FX
   sites on `Math.random`; replace `Date.now()`/`performance.now()` spawn scheduling with the
   tick counter; determinism test (hash `npcShips` after N ticks, twice). **L.**
5. **Content registries** `content/weapons.js`, `npcs.js`, `upgrades.js`, `ships.js` — frozen,
   validated at import (CI's `node --check` pass already imports every module); every `type ===`
   branch becomes a field (`WEAPONS[t].trail.width`, `sfx`, `color`); `upgrades[].apply(ship)`
   replaces the `ShopSystem` if-chain and makes upgrades additive; one ship-id list. **L.**
6. **Unified persistence** — one module owning all three keys, one `SCHEMA_VERSION`, a real
   migration chain, refuse-and-reset on unknown versions, `ship.missions` in the payload,
   debounced run saves, one clear. **M.**
7. **Decompose the orchestrator** into `BootSequence`, `WorldFactory`, `ShipFactory` (one ship
   schema for boot / new run / purchase), `LifecycleSystem` (pause, damage, death, run end),
   `LandingSystem`, `EconomySystem`, `dev/Profiler`. Target `main.js` ≈ 120 lines. **L.**
8. **`RenderSystem` split** — first delete ~1,000 dead lines (S), then `BackdropPass`,
   `WorldEntityPass`, `ShipPass` (collapse the sprite chain that exists three times),
   `EffectsPass`, `ScreenOverlayPass` (one `withScreen` for all HUD, fixes P10),
   `MinimapRenderer`, `CanvasSurfaces` (sole owner of every `canvas.width` write; fixes P4 and the
   resize thrash), `QualityPolicy`. Move renderer sim mutations into a
   `VisualEffectsSystem.update(dt)`. ≈ 1.5 weeks with a screenshot-diff harness.
9. **`UISystem` split** — `LandingArtService` (or delete the network art), `RadioUI`,
   `TradingPanels`, `NotificationQueue`. **M.**
10. **Delete the WebGL spike** and archive the ticket with the reasoning: the frame is dominated
    by star rects and gradient allocations, both fixable in Canvas2D; entity counts are far below
    the batching threshold; bloom-lite gets the post-processing win.

### 3.5 Tooling and process

1. Extend `tests/smoke.mjs` into a **run-to-victory** test (menu → buy weapon → kill → Z → boss →
   unlock toast → Z → void_king → victory overlay → meta stats; then death → death overlay →
   unlocks list). The exploratory scripts from this review are in `tests/exploratory/` as a
   starting point. This is the Phase 0 acceptance test.
2. `node:test` unit layer (3.4-2); ESLint flat config with `no-unused-vars` and an import-graph
   dead-export check (would have flagged `RUN_VICTORY` and `spawnZoneBoss`); Playwright visual
   snapshots of the five screens; `npm run dev`; pre-commit `node --check`.
3. Docs truth: fix CLAUDE.md boss/zone facts (R4.2), rewrite both READMEs for the roguelike,
   archive the 26 root handoffs, re-run `stamp_version.sh` in `deploy.sh`.
4. Purge `scripts/`: delete `check_git.sh`, `git_push.sh`, `push-with-token.sh`,
   `create_favicon.py`, `fix_imports.py`, `debug_npcs.js`, `fix_npc_flee.js`; archive
   `debug-pages.sh`, `fix-404.sh`.
5. Asset hygiene: delete `explosion.gif`, the 10 orphan planet PNGs, `chiptune2.*` stubs, root
   `chiptune-3/`, `.DS_Store`; re-export `logo.png` at 216 px; add a share card + OG meta;
   drop `'unsafe-eval'` from CSP; licence file for music.

### 3.6 UX and accessibility

1. Keyboard-navigable ship carousel with unlock conditions on locked cards; focus into overlays.
2. Gamepad (standard mapping: left stick turn/thrust, RT fire, A land, Y zone, Start pause).
3. Decide mobile: either delete the blind touch zones or build on-screen controls on the
   EventBus (never resurrect `touchControls.js`).
4. `prefers-reduced-motion` gate on shake/flash/CRT; write `#gameAnnouncements` on zone, boss,
   unlock, death; Page Visibility API for tab pause; PWA manifest + icons.

---

## 4. Sequenced plan

### Phase 0 — Make it winnable (1–2 sessions)

**Status 2026-09-04: executed** in four batches (run loop / persistence+hygiene / presentation+UX /
economy+ship stats) plus an 11-check run-to-victory scenario appended to `tests/smoke.mjs`
(19/19 green). Landed: L1–L7, E1–E10, E14–E17, P1, P2 (placeholder art per class), P4, P6–P9,
P12–P14, U1–U5, S5–S8, S10, and the `ship.missions` half of S1. Also: one ship-stat derivation
(`docs/js/systems/ShipStats.js`) replaces every absolute stat write; boss HP/damage scale by
zone at quarter strength; NPC fire goes through `WeaponSystem.fireNPCProjectile` (spread around
the NPC's heading); boss adds spawn on phase entry; `SpawnSystem.update` no longer freezes the
asteroid field and effect lifetimes during boss fights.

**Still open from this list:** E11 (escort missions), E12 trade-profit mission (needs a
`TRADE_COMPLETED { profit }` event from TradingSystem), E13 (merge the two mission stores),
P3 (real boss/elite art), P5 (star tiles), P10, P11, S1 (versioned profile + migrations), S2,
S3, S4 (explicit system order), S9 (dead render code, WebGL spike), U6, U7. These move to
Phase 1/2 where they belong.

Original checklist (kept for traceability): all items are S. Done = the run-to-victory test
passes and a human playthrough matches.

1. Call `spawnZoneBoss()` from a `ZONE_CHANGE` subscriber when the new zone has a `bossId`
   (delay ~20 s or after N kills so the player has arrived). (L1)
2. Victory overlay: subscribe `DeathScreenUI` to `RUN_VICTORY` with a win variant (title, seed,
   time, kills, credits, unlocks) and pass `unlocks` through `RUN_END` too. Remove the delayed
   duplicate `endRun`. (L2, L6, U4)
3. `recordBossDefeat`: grant unlocks *before* the victory return; save; emit `ZONE_BOSS_DEFEAT`. (L3)
4. Phase loop keeps the last matching threshold; implement `addSpawnCount`. (L5)
5. `_handleCreditsChange` reads `change`; `recordRunEnd` uses `bossesDefeated.length`; boss bounty
   pays full. (E1, E2, E3)
6. Pickup: emit `{pickup}` and award by identity, not index. (E4)
7. Upgrades additive and hull-relative; `alreadyOwned` for cargo/radar. (E5)
8. Landing: no credit grant, repair costs credits, no NPC wipe. `startingWeapons: [laser]`,
   `startingCredits` per hull. Retune Mining Laser or drop it from the starter shop. (E6, E7)
9. Zone gate counts `killedBy === 'player'`; HUD shows both gate halves and "Z". (E8, E9, U1)
10. One field: `ship.shipClass` everywhere; `spriteId` set from class; `classMap` complete. (E10, P2)
11. `initShipForRun` resets upgrade levels, missions, reputation, pickups, asteroids. (E15)
12. Pause on death/victory/menu; blur-pause remembers menu state. (L7)
13. `imageSmoothingEnabled = false` after resize; `npc.faction` in `spawnNPC`; `zone.theme`
    minimal wiring; `void` sound/colour; remove one of the two asteroid/pickup integrators. (P4, P7, P1, P13, P12)
14. Landing art provider default `'none'`; tutorial copy for the roguelike with the right keys;
    colour toasts on. (P14, U2, U3)
15. Persist `ship.missions`/`missionStates`; F12 clears all three keys. (E14, S1 partial)
16. Re-run `stamp_version.sh`; fix CLAUDE.md content facts; delete the seven dead scripts and the
    published cruft. (S5, S6, S7, S10)

### Phase 1 — Foundations (2–3 sessions)

SystemRegistry → sim harness + `node:test` → Proxy retirement → content registries (weapons, NPCs,
upgrades, ships) → unified persistence → seeded RNG + determinism test → dead-code sweep
(~1,450 lines incl. render) → delete WebGL spike → ESLint + dead-export check in CI.

### Phase 2 — A run that feels like a journey (3–4 sessions)

Zone identity (theme wiring → `BackdropPass` with star tiles → backdrop art → zone beds via
`playStream`) → enemy differentiation (elite/ambusher AI, accurate NPC fire, scavenger) → boss
fights (adds, signature attacks, arena, third boss) → economy with risk and a fair opening → HUD
feedback (toasts, telegraphs, damage numbers, tracker, PAUSED) → game feel (hit-stop, camera
shake, vignette, chromatic flash, bloom-lite, ribbon trails, flipbook on boot) → art batch 1
(hulls, bosses, elites) through the sprite pipeline fixes → sampled SFX layer → planets to sprite
mode with curated stills → `RenderSystem` and `UISystem` splits landed alongside.

### Phase 3 — Replayability (3–4 sessions)

Node map with choices → relics (3-choose-1) → missions as zone contracts (escort implemented or
cut) → meta unlock ladder for all six hulls + achievements + shop gating → seed on the end
screen, daily run, endless mode → run history / best times on the menu.

### Phase 4 — Reach

PWA manifest + share card + OG meta → gamepad → mobile decision → TTS comms → localisation pass
of the string table if the registries made one.

---

## 5. Asset production list (atelier)

Sequenced; items marked *(code)* need an engineering companion first.

| # | Asset | Count | Spec | Model | Plug-in point |
|---|---|---|---|---|---|
| 1 | Player hulls | 6 | nose-up, transparent, centred pivot, 96–192 px long edge | `retro-diffusion/rd-plus` | `sprites.json` + `classMap` *(code: P2, pipeline)* |
| 2 | Bosses | 3 | as above, 160–256 px | `rd-plus` | `SpriteMappings` `boss` entry per `bossId` *(code)* |
| 3 | Elite pirate, void hunter, scavenger | 3 | as above | `rd-plus` | `typeToSpriteId` |
| 4 | Zone backdrops / nebulae | 4 | 1024² tileable or 2048×1024 parallax plate | `rd-tile` / `nano-banana-pro` | `BackdropPass` *(code)* |
| 5 | Planet stills (landing) + sprites | 5–6 | 512–1024 px, transparent, feathered | `nano-banana-pro` → `background-remover` | `planets.json`; landing canvas *(code: replace fetcher)* |
| 6 | Zone music beds | 4 | 30 s seamless, −18 LUFS, m4a | `stability-ai/stable-audio-2.5` | `radioPlaylist.js` `type: 'stream'` |
| 7 | Boss themes | 3 | 45–60 s loop, m4a | `stable-audio-2.5` | as above, triggered on boss spawn *(code)* |
| 8 | SFX samples | 8 | ≤1 s, m4a | `stable-audio-open-1.0` / `audiogen` | `AudioSystem` sample layer *(code)* |
| 9 | Explosion flipbook refresh / tiers | 2 | 24 fps, 277×199 convention | `rd-animation` | `explosion.json` |
| 10 | Thruster flipbook | 1 | 8–12 frames | `rd-animation` | effects atlas (frames exist, unused) *(code)* |
| 11 | UI icons (weapons, upgrades, hulls, relics) | ~40 | 32 px, transparent | `rd-plus` | shop/menu rows *(code: icon system)* |
| 12 | Share card | 1 | 1200×630 | screenshot of title | `og:image` meta *(code)* |
| 13 | Logo re-export | 1 | 216 px tall | local | `logo.png` |
| 14 | Comms voice lines | ~20 | m4a | `minimax/speech-2.8-turbo` | new *(code)* |

Rules from `ATELIER_TEMPLATE.md` apply: user auditions everything; provenance logged in a fresh
`SOURCES.md`; audio ships m4a/mp3; no baked text; the game stays playable if every asset 404s.

---

## 6. Corrections to earlier documents

- `PROJECT_REVIEW_2026-07.md` header claims the double-execution family is fixed; asteroid and
  pickup double integration are still live (P12). It claims mission persistence was fixed; the
  live store was never persisted (E14). It claims `gameData.npcTypes` is the single NPC table;
  `seedNPCs` in the orchestrator still carries a divergent copy.
- `CLAUDE.md` "Current Content": 2 bosses (Captain Blackstar, The Void King), not 3; boss gates on
  Outer Rim and The Void only; Warlord Krix and The Devourer do not exist.
- `SESSION_69_HANDOFF.md` open items: muzzle flash, trails and sparks landed; UI value animations
  did not.
- The July roadmap's P0 ("commit and push") is done; its P1 list stands but must come *after*
  Phase 0 here — foundations under a loop that cannot complete would be verified against the
  wrong behaviour.

---

## 7. Method note

Playthrough scripts (Playwright, headless Chromium, real `keyboard.down/up`, screenshots per
screen, state dumps, frame-time sampling) are in `tests/exploratory/`. They drive the live game at
`http://localhost:8000/docs/`; run with `CHROMIUM_PATH` pointing at a Playwright Chromium. They are
exploration tools, not tests; the run-to-victory test in Phase 0 should be derived from them.
