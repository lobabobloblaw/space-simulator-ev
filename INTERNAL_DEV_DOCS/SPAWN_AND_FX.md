# INTERNAL — Spawn System and FX

This document covers NPC spawn/despawn behavior, post‑death damping, and warp FX wiring.

## Spawn Rules

- Max nearby NPCs: ~5 within 1000px; max total: ~12.
- Despawn radius: ~3000px from player; despawns trigger depart/land FX depending on proximity to planets.
- Spawn weights (baseline, no run active): freighter 0.25, trader 0.3, patrol 0.2, pirate 0.25.
- During a run the weights come from the current zone (`zones.js`): `pirateSpawnWeight`
  drives pirate/elite/void-hunter share, `eliteChance` scales the elite slice, and the
  remainder splits across trader (0.4), freighter (0.3), patrol (0.3) and scavenger (0.12).
- `spawnNPC()` sets `npc.faction` from the `npcTypes` template (`'civilian'` fallback).
  `FactionVisuals` palettes/decals are keyed off it, so a template without a faction
  renders neutral rather than not at all. Bosses spawn as faction `'pirate'`.

## NPC Behaviours

`npc.behavior` is the AI dispatch key in `NPCSystem.makeAIDecision`. Anything in
`PIRATE_BEHAVIORS` (`aggressive`, `elite`, `ambusher`) is what patrols hunt, traders flee
and taunts come from; `boss` is deliberately outside that set.

| behavior | types | shape of the fight |
|---|---|---|
| `aggressive` | pirate | closes to ~110-260, strafes, fires in a narrow arc |
| `elite` | elite_pirate | holds 250-350; 3 shots 6 frames apart, then a 90-frame reload spent backing out of the band. Burst state on `npc.burst = {shots, gap, reload}` |
| `ambusher` | void_hunter | `lurking` (engines cold) until the player is inside 420 → `tell` (40 frames, "…" bubble, `npc.tell`) → `charging` (thrust ×1.8, fires inside 200) → `disengaging` (back out to 600), repeat |
| `lawful` | patrol | unchanged |
| `passive` | trader, freighter | unchanged |
| `scavenger` | scavenger | collects pickups, runs from anything in `PIRATE_BEHAVIORS`, retires after 4 pickups or 2000 frames |
| `boss` | boss | phase table from `zones.js`, plus a signature attack (below) |

Note: `NPCSystem.normalizeAngle` re-wraps the result of `MathUtils.normalizeAngleSafe`,
which does not normalize inputs below `-PI`. Without that wrap ~a quarter of all turn
decisions took the long way round and coasted while doing it.

## Boss Signature Attacks

Data lives on the boss entry in `zones.js` and is copied onto the NPC at spawn;
`NPCSystem.updateBossSignature` drives it and `WeaponSystem` builds the ordnance
(`SIGNATURE_ORDNANCE`). `fromPhase` is the first phase index that may use it, `everyMs`
is wall-clock and the first window opens one interval after the phase is entered.

| kind | tuning | behaviour |
|---|---|---|
| `mines` | speed 0.15, 360-frame life, arms at 60, blast 90, 25 damage, fan 2.2 rad at `size + 60` | Drifts; detonates on player proximity or expiry. Laid ~50-90 units apart so clipping one costs 25, not the whole fan |
| `lance` | speed 6, 72-frame life, 45 damage, 45-frame wind-up | The boss stops dead, bubbles "CHARGING" and fires one `UI_MESSAGE` warning, then fires an aimed bolt |

Both kinds are **player-only**: the NPC and asteroid collision passes skip them, so a boss
cannot mine its own escorts. Regular NPC friendly fire is keyed off `faction` (falling back
to `behavior`) for the same reason.

- Adds: `zone.boss.phase` → `SpawnSystem.spawnBossAdds` (tagged `isBossAdd`).
- `zone.boss.defeat` → `SpawnSystem.handleBossDefeat` warps every surviving `isBossAdd`
  out, so the arena clears when the fight ends.

### Post‑Death Damping

- Global cooldown: After any `NPC_DEATH`, the system pauses new spawns for ~2s to avoid instant backfill.
- Same‑type suppression: Spawns of the just‑destroyed type are suppressed for ~6s (e.g., pirates won’t immediately respawn).
- Pirate suppression: After any death, pirates are suppressed briefly (~4.5s) to break perceived “death → pirate spawn” correlation.
- QA tuning (OFF by default):
  - `window.SPAWN_TYPE_COOLDOWN_MS` — same‑type suppression duration.
  - `window.SPAWN_PIRATE_SUPPRESS_MS` — pirate suppression after any death.

## Warp FX (Arrive/Depart/Land/Takeoff)

- Pooled effects live in `state.warpEffects` and are rendered by `RenderSystem.renderWarpEffects()`.
- EventBus hooks:
  - `warp.effect.created` — generic FX creation; carries `{ x, y, type }`.
  - `PHYSICS_SHIP_TAKEOFF` — emits takeoff plume for player.
  - `SHIP_LANDED` — emits landing dust.
- SpawnSystem subscribes to these events and pushes pooled FX; effects auto‑expire.

## Notes

- Scavengers are spawned through the normal zone weights in Core and Frontier. They used
  to appear on every `NPC_DESTROYED`, which is the part that was confusing; that listener
  is gone for good.
- Debris, muzzle flashes, and explosions are pooled and soft‑capped to prevent GC churn.

## Asteroid Breakup & Ore (Session 63)

- Three tiers: large (radius ≥ 8) → medium (≥ 5) → small (< 5).
- Fragmentation:
  - Large breaks into ~3 mediums; medium breaks into ~2 smalls; smalls do not fragment further.
- Ore drops per destruction:
  - Large → 2 ore slivers; Medium → 1 ore; Small → 1 ore.
- Ore pickups: smaller visuals (~1/3 of old size) with subtle glitter; collected immediately on touch:
  - Adds `ore` to cargo if space; otherwise grants small credits (§+10).
- Helpers in `SpawnSystem`: `_emitOreDrops`, `_emitAsteroidShards`, `_emitAsteroidChunks`, `_emitSliverDebris`, `_getAsteroidTier`, `_spawnChildAsteroids`.
- Optional VFX polish (OFF by default): `window.VFX_DEBRIS_POLISH = true` adds occasional thin molten sliver debris.

## Constants (Session 64 consolidation)

- Tier thresholds and yields are centralized in `GameConstants.WORLD.ASTEROIDS`:
  - `THRESHOLDS.{LARGE_MIN_RADIUS, MEDIUM_MIN_RADIUS}`
  - `CHILD_COUNTS.{large, medium, small}`
  - `FRAGMENT_SHRINK`
  - `ORE_YIELDS.{large, medium, small}`
- Pickup lifetimes and visuals:
  - `GameConstants.EFFECTS.PICKUP_LIFETIME`
  - `GameConstants.EFFECTS.PICKUPS` (sizes, glitter cadence; used by RenderSystem)

### Debris tuning

- `GameConstants.EFFECTS.DEBRIS` centralizes asteroid breakup debris defaults:
  - `SHARDS` — count, speed range, size range, rotation range, lifetime range.
  - `CHUNKS` — count, speed range, size range, rotation range, polygon sides, lifetime range.
  - `SLIVERS` — speed/lifetime ranges for optional molten slivers.
  - `POLISH` — warm color ramp parameters (applied only when `window.VFX_DEBRIS_POLISH===true`).

When `VFX_DEBRIS_POLISH` is enabled, the warm molten fade/color ramp also applies to regular shards (not just slivers). Defaults match prior visuals when the toggle is OFF.
