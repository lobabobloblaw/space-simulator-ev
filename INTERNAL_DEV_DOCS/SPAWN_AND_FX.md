# INTERNAL — Spawn System and FX

This document covers NPC spawn/despawn behavior, post‑death damping, and warp FX wiring.

## Spawn Rules

- Max nearby NPCs: ~5 within 1000px; max total: ~12.
- Despawn radius: ~3000px from player; despawns trigger depart/land FX depending on proximity to planets.
- Spawn weights (baseline): freighter 0.25, trader 0.3, patrol 0.2, pirate 0.25.

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

- Scavenger ships were removed (previously spawned on `NPC_DESTROYED`) to reduce confusion.
- Debris, muzzle flashes, and explosions are pooled and soft‑capped to prevent GC churn.

