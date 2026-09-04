# INTERNAL — Events and State
# For development and AI sessions only (not published)

This document outlines commonly used events and the shape of key state objects.

## Key Event Categories

- Input
  - `INPUT_KEY_DOWN/UP`, `INPUT_FIRE`, `INPUT_LAND`, `INPUT_SWITCH_WEAPON`, target cycle/clear.

- Gameplay
  - `SHIP_DAMAGE`, `SHIP_DEATH`, `SHIP_RESPAWN`, `NPC_DEATH`, `EXPLOSION`.
  - `TARGET_SET`, `TARGET_CLEAR` (Targeting).
  - `UI_MESSAGE`, `UI_UPDATE`, `MENU_OPEN/CLOSE`.

- Render
  - `render.useSprites { enabled }`
  - `render.spriteCulling { enabled }`
  - `render.useEffectsSprites { enabled }`
  - `render.quality { quality: 'low'|'medium'|'high' }`
  - `assets.ready { atlases: string[] }` (from AssetSystem)

## State Shape (selected fields)

- `state.ship`
  - Position/velocity: `x, y, vx, vy, angle`
  - Stats: `size, health, maxHealth, shield, maxShield, thrust, maxSpeed`
  - Flags: `isDestroyed, isLanded, landingCooldown`
  - Inventory/credits: `weapons[], currentWeapon, credits`

- `state.npcShips[]`
  - `id, x, y, vx, vy, angle, size, type, faction, behavior, health, maxHealth, weaponCooldown, thrusting, state`
  - Rendering hints: `spriteId?`, color, message/messageTime

- `state.renderSettings`
  - `useSprites: boolean`
  - `spriteCulling: boolean`
  - `useEffectsSprites: boolean`
  - `starDensity: number`

- `state.assets`
  - `ready: boolean`
  - `atlases: { placeholder, effects }`
  - `sprites: { [id]: { image, w, h } }`
  - `effects.explosionFlipbook? { fps, frames[] }`

- `state.targeting`
  - `selectedId: number | null`

- Other: `asteroids[]`, `planets[]`, `projectiles[]`, `explosions[]`, `warpEffects[]`, `pickups[]`, `debug{}`

## Persistence (localStorage)

All three storage keys are owned by `docs/js/core/Persistence.js`. No system may
call `localStorage` directly — `SaveSystemAdapterFixed`, `MetaStateManager` and
`RunSystem` go through this module (grep for `localStorage.` in those files:
there should be no hits).

| logical key | localStorage key | schema | lifetime | written by |
|---|---|---|---|---|
| `save` | `galaxyTraderSave` | 7 | per run, overwritten | `SaveSystemAdapterFixed` |
| `run` | `galaxyTraderRun` | 1 | per run, deleted on run end | `RunSystem` |
| `meta` | `galaxyTraderMeta` | 2 | permanent | `MetaStateManager` |
| `loadPending` | `galaxyTraderLoadPending` | — | one page reload | `SaveSystemAdapterFixed` (bare `'true'` flag, not a blob) |

### Blob format

Every versioned blob is written as `{ schema, savedAt, ...payload }`. `schema`
is an integer (`Persistence.SCHEMA`), `savedAt` is `Date.now()` at write time.
The main save additionally keeps its legacy `version: '6.1'` / `'6.0-critical'`
string, because `main_eventbus_pure.js` and `StateManager` read that blob
without going through `Persistence`; `SaveUtils.validateSaveData()` accepts
either stamp.

### Migration policy

- `Persistence.read(key)` detects the stored schema (integer `schema`, else the
  legacy `version` string, else 0 for run blobs) and walks `migrations[key][n]`
  forward one step at a time to the current version, then persists the migrated
  blob once so storage converges.
- Current chains: `save 6→7` (stamp only, no data change), `meta 1→2` (coerce
  the corrupted `stats.bossesDefeated` string to a count; drop unlock ids that
  are not in `gameData.shipClasses` / `shopInventory`), `run 0→1` (fill missing
  `stats.bossesDefeated`, `stats.zonesVisited`, `stats.unlocksGranted`,
  `zoneKills`).
- An **unknown or unmigratable** blob is logged once and removed (reset).
  A blob whose schema is **newer** than this build is logged once and ignored,
  but never deleted — a downgrade must not destroy a newer save.
- The main save also passes `SaveUtils.validateSaveData()` inside `read('save')`.
- Bumping a schema: add the `n → n+1` step in `Persistence.migrations`, bump
  `SCHEMA`, and update this table.

### Failure reporting

Storage failures are never swallowed. Every failed write is logged, and a quota
failure emits one `UI_MESSAGE { type: 'error' }` per session
("Storage full — progress can't be saved"). The save adapter passes
`{ quiet: true }` for its full → light → critical fallback ladder so an attempt
it is about to retry smaller does not raise that toast; it reports its own
outcome instead.

### Run save cadence (S2)

- `RunSystem._saveRun()` is throttled: at most one write per 1000 ms, with a
  trailing write, so kill streaks and credit changes cannot put a
  `JSON.stringify` + `setItem` on every frame.
- `RunSystem._flushRun()` writes immediately and cancels the pending timer. It
  runs on zone change, boss spawn, boss defeat, run end, and on `pagehide` /
  `visibilitychange → hidden` (one listener, installed by
  `Persistence.onFlush()`).
- `_clearSavedRun()` cancels the pending write *before* removing the key, so a
  trailing write can never resurrect an ended run.

### Run / ship pairing (S1)

`RunSystem.startNewRun()` mints a `runId` into `runStats`; the save adapter
copies `getRunSystem().getRunStats().runId` into the main save. On boot,
`RunSystem._loadSavedRun()` refuses a run whose `runId` does not match the main
save's (or where the save has none), warns, and calls `Persistence.clearRun()` —
so `hasSavedRun()` is false and the menu hides CONTINUE rather than resuming
a run with another run's ship. Runs saved before run ids existed have no
`runId` and are grandfathered. Note that the main save only picks up a new
`runId` at the next autosave (first at 120 s, then every 30 s), so a reload
very early in a run drops that run.
