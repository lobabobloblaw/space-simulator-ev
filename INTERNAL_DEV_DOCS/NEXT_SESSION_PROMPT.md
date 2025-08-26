# Next Session Prompt — Constants Sweep + VFX Polish (Session 62)

Use this prompt verbatim (or trim) to kick off the next session. It’s aligned with our internal playbook and cadence.

---

Architecture
- EventBus‑only communication; all mutable state in `StateManager.state`.
- Rendering hygiene: world via `withWorld`; HUD/overlays via `withScreen`; strict save/restore; reset transforms; no context scaling for pixel sprites.
- TargetCam: `TargetCamRenderer.js` is the single owner. Deterministic, upgrade‑only path (direct → preloaded → standalone → atlas → baseline). Warm‑up (~450ms; `TC_WARM_MS`) suppresses atlas/baseline; strict buffer‑blit.
- Assets: `AssetSystem` owns atlases and standalone sprite preloads. Systems consume via helpers.
- Diagnostics: OFF by default. Use briefly for QA only.

What’s Landed (Latest)
- Legacy: Removed monolithic `allSystems.js` path; demo/backup pages load modular entry.
- Initialization: `initializeGameState()` split into helpers; behavior unchanged.
- TargetCam: Warm‑up + deterministic source; consumes `getFrameCanvasFromState`; buffer‑blit maintained.
- Thrusters: Suppressed FX during `deathSeq` (player/NPC) to remove linger.
- Explosions: Smaller 1x1 sparks with stable angles; warmer color; density via `sparkCountFor()` (tiny 5, low 8, med 16, high 24).
- NPC: Patrol warning/forgiveness durations pulled from `GameConstants.NPC`.
- Constants Sweep: Centralized TargetCam/NPC/Spawn/UI/Weapons/Physics tunables (defaults unchanged).
- Rendering stability: Removed quality-based sprite size scaling; starfield cadence consistent across medium/high (no boot pop).
- Perf hygiene: Weapon logs gated; debug damage numbers only when overlay wants them.

Primary Goals (This Session)
- Constants sweep (no behavior changes):
  - TargetCam timings (warm‑up, frame throttle, build gating, transitions).
  - NPC engage distances + message cooldowns; replace literals with `GameConstants.NPC`.
  - Spawn cooldowns (same‑type, pirate suppress) and small death pauses.
  - UI radio timings and speed readout cadence; landscape fetch timeout.
  - Weapon recoil bloom and projectile lifetimes; muzzle‑flash lifetimes/soft‑cap.
  - Physics: world bounds alias + heavy collision warning threshold; landing clear distance.
- Optional VFX polish:
  - Tune asteroid‑break shard sizes/density to align with new debris feel.
  - Consider occasional 2x1 “sliver” shards or fade‑to‑red for molten debris.
- Optional helper:
  - Thin wrapper for TargetCam to consume `AssetSystem.getFrameCanvasFromState` (future use), keeping behavior identical.

Constraints / Guidelines
- Keep changes surgical; no behavior changes when centralizing constants.
- Keep diagnostics OFF by default; do not alter default toggles.
- Do not refactor unrelated systems; only replace literals with constants where clearly intended.

Acceptance Criteria
- All selected literals replaced with `GameConstants.*` entries; defaults match current values.
- Game behavior unchanged (QA spot check: TargetCam, spawn damping, UI radio, weapon lifetimes). No ship size or star brightness pop at boot.
- Build runs without warnings; docs updated to reflect new constants.

Verification Steps
1) Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
2) Clear QA toggles: `await import('./js/qaToggles.js'); QA.reset(); QA.canvas2d();`.
3) Sanity passes:
   - TargetCam: cycle with `X` (warm‑up honored; label via `QA.tcInspect(6)` briefly).
   - Spawn: kill varied NPCs; observe damping; pirates not replacing instantly.
   - UI: radio scan/lock feels unchanged; speed readout cadence ~3 Hz.
   - Weapons: projectile lifetimes unchanged by feel (rapid/plasma/mining); muzzle flash still brief.
4) Grep for remaining literals (durations/distances) after sweep and log follow‑ups.

Plan (Suggested)
1) Add constants keys (no usage yet) in `Constants.js`.
2) Replace in small batches: TargetCam → NPC → Spawn → UI → Weapons → Physics.
3) QA spot checks after each batch; leave toggles OFF.
4) Update handoff and decisions; list any remaining candidates for next time.

Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/SPAWN_AND_FX.md`, `INTERNAL_DEV_DOCS/UI_NOTIFICATIONS.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`, `SESSION_CADENCE.md`
- Latest handoff: `SESSION_62_HANDOFF.md`
- Key files: `docs/js/utils/Constants.js`, `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/NPCSystem.js`, `docs/js/systems/SpawnSystem.js`, `docs/js/systems/UISystem.js`, `docs/js/systems/WeaponSystem.js`, `docs/js/systems/PhysicsSystem.js`
- Fixture: `docs/test/targetcam-spec.html`

---
