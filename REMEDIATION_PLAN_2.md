# Remediation Plan 2 — July 2026 Review

Tracking document for fixes from the July 2026 comprehensive review (four-track scan:
architecture / content / assets / process; full write-up in the "Galaxy Trader — Review
& Scaling Roadmap" artifact). Follows the format of `REMEDIATION_PLAN.md` (April 2026,
closed 30/30). Scope is **surgical remediation only** — defects, dead code, verification,
and repo safety. Feature work (factions, achievements, seeded RNG, atelier pipeline)
lives in the roadmap (P1–P4), not here.

**Batch 0 blocks everything.** Do not edit code in a tree holding ~11 months of
uncommitted work.

## Progress

| Batch | Theme | Items | Done |
|-------|-------|-------|------|
| 0 | Secure the working tree | 3 | 0/3 |
| 1 | High-severity defects | 4 | 0/4 |
| 2 | Content correctness | 3 | 0/3 |
| 3 | Dead code & hygiene | 6 | 0/6 |
| 4 | Verification & docs truth | 4 | 0/4 |
| — | **Total** | **20** | **0/20** |

---

## Batch 0: Secure the Working Tree (3 items) — BLOCKING

### [ ] R0.1 — Commit the working tree in three commits
- **File:** repo root (110 porcelain entries: 38 M, 42 D, 30 ??)
- **What:** Last commit is `160d7d2` (2025-08-27). Four epics (Phase-1 content, roguelike
  meta-loop, both audit passes) exist only as unstaged edits. One `git checkout .` erases
  ~11 months of work. The epics touch overlapping files, so clean per-epic history is no
  longer reconstructible without painful `git add -p` archaeology.
- **Fix:** Three honest commits, in order:
  1. **Deletions** — all `D` entries (27 legacy/debug HTML + 15 legacy JS):
     `git add -u -- docs/` after confirming only deletions staged, or stage the D list
     explicitly. Message: `chore: remove legacy mains, debug pages, and dead systems (audit batch 5)`
  2. **Code** — all modified + new files under `docs/js`, `docs/index.html`, `docs/css`,
     `docs/assets/planets.json`. Message:
     `feat: Phase-1 content, roguelike meta-loop, and audit remediation (sessions 67-69, AUDIT 1-5, ROGUELIKE 1-3, Apr-2026 audit)`
  3. **Docs** — session handoffs, `AUDIT_FINDINGS.md`, `REMEDIATION_PLAN.md`,
     `PHASE_1_REMAINING.md`, `INTERNAL_DEV_DOCS/`, `README.md`, this file.
     Message: `docs: session handoffs, audit findings, remediation plans, internal docs`
  - Do **not** commit: `server.log` (ignored), `server.pid` (see R3.4), `SOURCES.md`
    (cross-project — see Decisions below).
- **Test:** `git status --porcelain` is empty (minus intentionally excluded files);
  `git log --oneline -3` shows the three commits.

### [ ] R0.2 — Push and verify Pages deploy
- **File:** remote `origin/main`
- **What:** The public site is frozen at Aug 2025 and still serves the deleted debug pages.
- **Fix:** `git push`, wait for GitHub Pages (~1–10 min).
- **Test:** Live site loads and plays; `https://…/docs/index_old_backup.html` and
  `test-*.html` return 404.

### [ ] R0.3 — Tag the snapshot
- **File:** git tag
- **What:** A recoverable marker for "state as reviewed, before remediation edits."
- **Fix:** `git tag pre-remediation-2026-07 && git push --tags`
- **Test:** `git tag --list` shows the tag.

---

## Batch 1: High-Severity Defects (4 items)

### [ ] R1.1 — Unify `currentWeapon` vs `currentWeaponIndex`
- **File:** `docs/js/systems/ShopSystem.js:89-90, 259-260`; `docs/js/core/StateManager.js:57, 267`; `docs/js/main_eventbus_pure.js:164, 438-440, 1127`
- **What:** Live code (main, weapon switching, saves) uses `ship.currentWeapon`;
  StateManager defaults and ShopSystem's post-purchase clamp use `currentWeaponIndex`.
  ShopSystem writes **both** at :89-90 (evidence of the confusion). The :259-260 clamp
  guards a field nothing reads, so selling/changing weapons can leave the live index out
  of bounds.
- **Fix:** Standardize on `currentWeapon` (matches saves + majority usage). Change
  StateManager :57/:267 and ShopSystem :259-260 to `currentWeapon`; delete the
  `currentWeaponIndex` write at :90. Grep for any remaining `currentWeaponIndex`.
  Confirm `SaveSystemAdapterFixed` allowlists `currentWeapon`.
- **Test:** Buy a ship with fewer weapon slots than currently selected index; switch
  weapons (Q); fire. No `undefined` weapon, HUD shows correct type after purchase.

### [ ] R1.2 — Deep-clone `DEFAULT_META_STATE`
- **File:** `docs/js/core/MetaStateManager.js:76, 90, 101-102, 104, 293`
- **What:** `{ ...DEFAULT_META_STATE }` shallow-copies; nested `unlocks.ships[]`,
  `unlocks.upgrades[]`, `stats{}` remain shared references to the module constant.
  `unlockShip()` pushes into the shared array for fresh players (cross-run contamination
  within a session); :101-102 can hand the shared arrays to loaded state.
- **Fix:** Add a factory `const makeDefaultMeta = () => structuredClone(DEFAULT_META_STATE);`
  (or hand-rolled deep copy) and use it at :76, :90, :293. At :101-102 copy the arrays:
  `[...(loaded.unlocks?.ships || DEFAULT_META_STATE.unlocks.ships)]`.
- **Test:** In console: reset meta, unlock a ship, `resetMeta()` again — default meta must
  not contain the unlocked ship. Two fresh runs in one session don't share unlock state.

### [ ] R1.3 — Remove dead boss-unlock block from orchestrator
- **File:** `docs/js/main_eventbus_pure.js:564-575`; owner: `docs/js/systems/RunSystem.js:290-311, 368`
- **What:** Two NPC_DEATH paths handle boss unlocks. Main's block reads
  `data.npc.unlocks.ship` — wrong shape (boss data is `{type, id}`), so it never fires;
  it is dead code that would double-grant if shapes ever aligned, and the "Unlocked: …"
  UI toast that lives only there never shows.
- **Fix:** Delete the block at :564-575. In `RunSystem.recordBossDefeat` (after :308/:310)
  emit the UI message: `this.eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Unlocked: <name>', … })`
  so the player actually sees the reward.
- **Test:** Defeat Captain Blackstar; "Unlocked" toast appears once; unlock persists in
  `localStorage.galaxyTraderMeta` after reload.

### [ ] R1.4 — Give the `void` boss weapon real behavior
- **File:** `docs/js/data/zones.js:182`; `docs/js/utils/Constants.js:96-146`; `docs/js/systems/WeaponSystem.js` (type branches ~:140, :185-198, :212, :227, :490, :558)
- **What:** The Devourer fires weapon `type: 'void'`; WeaponSystem has no branch for it,
  so the final boss silently attacks with default-laser stats/visuals.
- **Fix:** Minimal data entry: add `void` to `Constants.WEAPONS` (damage/speed/lifetime
  distinct from plasma) and to the type-keyed maps (`PROJECTILE_LIFETIME_FRAMES`,
  `RECOIL_BLOOM`), plus a projectile color/trail case in WeaponSystem (:227 area) so boss
  shots read as unique. Do **not** refactor the weapon registry here (roadmap P1).
- **Test:** Spawn the void boss (Z-advance to zone 4); projectiles show distinct
  color/speed; damage matches the constant.

---

## Batch 2: Content Correctness (3 items)

### [ ] R2.1 — Define `void_hunter` and give it spawn weight
- **File:** `docs/js/data/zones.js:99`; `docs/js/systems/SpawnSystem.js:22-84 (stat table), 704-720 (weight chain)`
- **What:** Zone 4 lists `enemyTypes: ['elite_pirate', 'void_hunter']` but `void_hunter`
  has no stat entry and the weight if-chain covers only pirate/elite_pirate/trader/
  freighter/patrol — unknown types get weight 0. The Void's signature enemy never spawns.
- **Fix:** Add a `void_hunter` stat block to the SpawnSystem table (elite-pirate tier+,
  distinct sprite alias per `SpriteMappings` — reuse `pirate_0` sprite with scale/tint
  until P2 art lands) and an `else if (enemyType === 'void_hunter')` branch with a real
  weight. Keep it an if-chain edit; the data-driven weight map is roadmap P1.
- **Test:** Advance to zone 4; confirm `void_hunter` NPCs spawn (check
  `state.npcShips.map(n => n.type)` in console) and fight noticeably harder than pirates.

### [ ] R2.2 — Single source of truth for NPC stats
- **File:** `docs/js/data/gameData.js:5-58` vs `docs/js/systems/SpawnSystem.js:22-84`
- **What:** NPC types are defined twice with divergent health/speed/credit values;
  spawning reads the SpawnSystem copy, so `gameData.npcTypes` is a decoy that invites
  wrong edits.
- **Fix (recommended):** Make SpawnSystem import stats from `gameData.npcTypes`; merge the
  divergent values deliberately (keep the SpawnSystem numbers — they are what's actually
  balanced/live today) and delete the private table. If any consumer reads
  `gameData.npcTypes` today, reconcile fields first.
- **Test:** Spawned pirate/trader HP and behavior unchanged from pre-fix baseline
  (compare a few `npc.health`/`maxSpeed` values before/after).

### [ ] R2.3 — Align boss upgrade-unlock ids with shop inventory
- **File:** `docs/js/data/zones.js:157`; `docs/js/core/MetaStateManager.js:33-42`; `docs/js/data/gameData.js:69-147`
- **What:** Boss rewards record upgrade ids (`shield_advanced`) that don't exist in
  `shopInventory` (`shield1`, `shield2`, …); `ALL_UPGRADES` uses a third namespace. The
  recorded unlocks are unusable, and the shop never consults them anyway.
- **Fix:** Pick the `shopInventory` keys as the single upgrade namespace. Update
  `zones.js` boss `unlocks.id` values and `MetaStateManager.ALL_UPGRADES` to match.
  **Defer** shop-side gating (showing/locking by unlock state) to roadmap P3 — this item
  only stops writing garbage ids into permanent meta state.
- **Test:** Defeat Blackstar; `galaxyTraderMeta.unlocks.upgrades` contains a key that
  exists in `shopInventory`.

---

## Batch 3: Dead Code & Hygiene (6 items)

### [ ] R3.1 — Remove orphaned `touchControls.js` and its dangling call
- **File:** `docs/js/systems/touchControls.js` (372 lines); `docs/js/systems/RenderSystem.js:1096-1097`
- **What:** Never imported; constructor signature references the removed pre-EventBus
  `game` object; RenderSystem calls `window.touchControls.render()` but nothing ever sets
  that global. Mobile input is non-functional either way.
- **Fix:** Delete the file; delete the `if (window.touchControls) …` block in
  RenderSystem. Note in TECH_DEBT.md that mobile controls need a ground-up EventBus
  implementation if ever wanted.
- **Test:** `node --check` on RenderSystem; desktop play unaffected.

### [ ] R3.2 — Remove orphaned `RenderLint.js`
- **File:** `docs/js/systems/RenderLint.js` (22 lines)
- **What:** Exports `check2DContext`; imported by no one (RenderSystem uses its own inline
  `debugRenderLint()`).
- **Fix:** Delete the file.
- **Test:** Grep for `RenderLint` returns only the inline method in RenderSystem.

### [ ] R3.3 — Remove dead respawn path
- **File:** `docs/js/main_eventbus_pure.js:595-648` (`respawnPlayer`); `docs/js/systems/UISystem.js:163` (SHIP_RESPAWN listener)
- **What:** Permadeath is the design (R respawn disabled at :447); `respawnPlayer()` is
  never called and is the only `SHIP_RESPAWN` emitter, so the UISystem listener is dead.
- **Fix:** Delete `respawnPlayer()` and the UISystem listener/handler (and the
  corresponding `off()` in `destroy()` if present).
- **Test:** Die in-game; death screen flow works; no console errors.

### [ ] R3.4 — Untrack `server.pid`
- **File:** repo root `server.pid` (tracked), `.gitignore`
- **What:** A local dev-server pid file is tracked (pre-dates the ignore rule).
- **Fix:** `git rm --cached server.pid`; ensure `.gitignore` covers `server.pid`.
- **Test:** `git status` clean after a local server restart.

### [ ] R3.5 — Purge stray files from the published folder
- **File:** `docs/assets/misc/` (4 dev screenshots); `docs/SESSION_37_SAVE_LOAD_FIX.md/` (empty dir)
- **What:** GitHub Pages serves everything under `docs/`; dev screenshots and an empty
  `.md`-named directory are publicly reachable cruft.
- **Fix:** Delete both. (Optional, same spirit: move `docs/README.md` and
  `docs/RENDERING_NOTES.md` content into `INTERNAL_DEV_DOCS/` — decide, don't drift.)
- **Test:** `ls docs/assets/misc` fails; live URLs 404 after deploy.

### [ ] R3.6 — Fix StateManager's dead/misleading default ship
- **File:** `docs/js/core/StateManager.js:44-63, 254-273`; `docs/js/main_eventbus_pure.js:138-172`
- **What:** StateManager's constructor default ship (`credits: 1000`,
  `currentWeaponIndex`, …) is overwritten wholesale by `initShip()` (`credits: 250`) at
  boot — two dead shapes that mislead readers and drifted from reality.
- **Fix:** Reduce StateManager defaults to a minimal skeleton with a comment pointing at
  `initShip()` as the authoritative shape, or export one shared factory both use.
  Behavior-preserving only.
- **Test:** Fresh boot: starting credits 250, weapons/cargo as before.

---

## Batch 4: Verification & Docs Truth (4 items)

### [ ] R4.1 — Full playthrough (the one every handoff deferred)
- **File:** n/a (manual QA; local server)
- **What:** Both newest handoffs verify by `node --check` only. Boss timing, victory
  screen, and unlock persistence are explicitly flagged "not yet tested."
- **Fix:** Play zone 1 → victory: meet kill/credit gates, Z-advance ×3, defeat Blackstar
  (unlock toast + persistence), defeat void_king (victory screen), die once on a second
  run (death screen + meta stats increment), save/load mid-run (F5/F9), reload page
  (meta + run resume). Log every anomaly as a new checklist item in this file.
- **Test:** This checklist, executed, with anomalies filed.

### [ ] R4.2 — Sync docs to actual content
- **File:** `CLAUDE.md` (Current Content section), `README.md`
- **What:** Docs claim 3 bosses ("Warlord Krix") and 4 boss-gated zones; data defines 2
  bosses and boss gates only on frontier/void. Misleads every future session.
- **Fix:** Correct counts (or explicitly mark Krix "planned — roadmap P3"). Also note the
  2-of-4 boss-gate reality in the meta-loop diagram.
- **Test:** Grep CLAUDE.md for "Krix" — either absent or marked planned.

### [ ] R4.3 — Spot-verify the April 2026 audit fixes in-browser
- **File:** `REMEDIATION_PLAN.md` Batch 1 items (C1, H1, H2, H3, H6)
- **What:** All 30 items are checked off, but verification was largely static. The five
  game-breaking fixes deserve live confirmation.
- **Fix:** Run each Batch-1 "Test" line from the April plan during the R4.1 playthrough.
- **Test:** Note pass/fail per item in this file.

### [ ] R4.4 — Session handoff
- **File:** `SESSION_REMEDIATION_1_HANDOFF.md` (new, from `SESSION_HANDOFF_TEMPLATE.md`)
- **What:** House convention: every session ends with a handoff.
- **Fix:** Record what landed, verification results, and pointer to this plan + roadmap
  artifact for the next session.
- **Test:** File exists, follows template.

---

## Decisions needed (blocking specific items)

1. **`SOURCES.md` placement** (blocks R0.1 scope): it is the dog-park project's provenance
   log, dropped here as a methodology template. Options: (a) commit as-is with a header
   note "reference from sibling project," (b) rename to `ATELIER_TEMPLATE.md`, (c) leave
   untracked. Recommendation: (b).
2. **NPC stat canonical source** (R2.2): recommendation is gameData imports with
   SpawnSystem's live numbers; confirm before merging values.
3. **Mobile support intent** (R3.1): deleting touchControls.js is safe today; if mobile is
   wanted eventually it returns as a P4 roadmap item, not a resurrection of this file.

## Explicitly deferred to the roadmap (not remediation)

Seeded RNG service (P1) · data-driven weapon/spawn/sprite registries (P1) · Playwright
smoke test + CI (P1) · sampled-SFX path (P1) · RenderSystem split (P1) · atelier pipeline
and all generated assets (P2) · faction activation, achievements definitions, boss ladder
completion incl. Warlord Krix, shop unlock gating (P3) · endless/daily modes, PWA (P4) ·
`_getVictoryUnlocks` hardcoded interceptor (fold into P3 unlock design).

## Suggested execution order

R0.1 → R0.2 → R0.3 (one sitting, ~30 min) → Batch 1 (~1-2 h) → Batch 2 (~1-2 h) →
Batch 3 (~1 h) → commit per batch (`fix: remediation batch N — <summary>`) → Batch 4
playthrough last, filing anomalies → final push + handoff.
