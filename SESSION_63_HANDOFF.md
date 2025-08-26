# Session 63 Handoff — Constants Sweep Follow‑ups (Surgical)

## Summary
- Completed a surgical constants sweep follow‑up: replaced the remaining hardcoded pirate panic cooldown in `NPCSystem` with `GameConstants.NPC.PIRATE_PANIC_COOLDOWN_MS`. All other targeted systems already consume centralized constants; behavior unchanged.
- Added an optional, default‑OFF debris VFX polish (guarded by `window.VFX_DEBRIS_POLISH`): occasional 2x1 “sliver” shards on asteroid breaks with a subtle molten fade.
- Refactored asteroid destruction into small helpers and fixed ore pickup handling. Ore pickups are now collectible (go to cargo or grant small credits when full), smaller, and “glitter”. Implemented three asteroid tiers with cascading breakup (large → medium → small) and tier‑based ore drops (small always yields one).

## Changes
- docs/js/systems/NPCSystem.js
  - Replaced `5000` (pirate flee/"panic" message cooldown) with `GameConstants.NPC.PIRATE_PANIC_COOLDOWN_MS` (default 5000ms).
- docs/js/systems/SpawnSystem.js
  - Optional: when `window.VFX_DEBRIS_POLISH` is true, emit up to 0–2 molten sliver shards on asteroid destruction (pooled; respects existing soft caps). Default behavior unchanged when toggle is absent/false.
  - Modular helpers: `_emitOreDrops`, `_emitAsteroidShards`, `_emitAsteroidChunks`, `_emitSliverDebris`, `_getAsteroidTier`, `_spawnChildAsteroids`.
  - Wired `PHYSICS_PICKUP_COLLECTED`: ore adds to cargo (or §+10 if full) and removes the pickup immediately.
  - Three‑tier fragmentation: large (≥8 radius) → 3 mediums; medium (≥5) → 2 smalls; smalls don’t fragment further.
  - Tier‑based ore: large → 2, medium → 1, small → 1 per destruction.
- docs/js/systems/RenderSystem.js
  - Optional: render support for `shape: 'sliver'` with 2x1 aspect and warm fade to red over lifetime (active only when `VFX_DEBRIS_POLISH` is true).
  - Pickups: ore visuals reduced to ~1/3 size and given a subtle “glitter” cross; low‑quality path also uses the smaller core size.
- docs/js/systems/UISystem.js
  - Replaced the old tutorial status line usage with a tiny console readout: notifications now also mirror into `#tutorialHint` (same font/style). The previous WEAPONS OFFLINE/ONLINE and completion banners are suppressed to keep the area free for player messages (e.g., “ORE +1”, credits, etc.).

## Verification Steps
- Serve: `python3 -m http.server 8000` → `http://localhost:8000/docs/`.
- Clear toggles: `await import('./js/qaToggles.js'); QA.reset(); QA.canvas2d();` (keep diagnostics OFF).
- Sanity passes (unchanged by feel):
  - TargetCam: cycle with `X`; warm‑up honored; brief label via `QA.tcInspect(6)`.
  - Spawn: same‑type and pirate suppress windows still prevent instant replacements.
  - UI: radio scan/lock and speed readout cadence (~3 Hz) unchanged; landing image fetch timeout respected.
  - Weapons: projectile lifetimes, recoil bloom, muzzle‑flash lifetimes/soft‑cap unchanged.
  - Physics: heavy collision warning threshold and landing clear distance unchanged.
- Optional VFX QA (only if desired):
  - In console set `window.VFX_DEBRIS_POLISH = true;` then break asteroids — you should occasionally see thin “sliver” shards with a warm glow that cools to red as they fade. Toggle OFF afterwards.
  - Asteroid tiers: destroy a large asteroid (radius ~8–10) → spawns ~3 medium fragments; destroy a medium (radius ~5–8) → spawns ~2 small fragments; destroying a small yields no further fragments. Observe tier‑based ore drops (large ~2, medium 1, small 1).
  - Ore pickups: visibly smaller and glitter; collecting adds cargo item `ore` (or §+10 when cargo is full); pickup disappears immediately.

## Acceptance Criteria
- All selected literals replaced with `GameConstants.*` entries; defaults match current values.
- Game behavior unchanged (TargetCam, spawn damping, UI radio, weapon lifetimes, physics warnings).
- Build runs without warnings; diagnostics remain OFF by default.

## Open Issues / Follow‑ups
- Optional VFX polish: asteroid‑break shards (sizes/density, occasional 2x1 “slivers”, optional fade‑to‑red for molten debris).
- Consider extending molten fade to regular shards when the toggle is enabled (currently applied to slivers only).
- Continue scanning AI/VFX thresholds that are intentionally tuned (e.g., aim/strafe distances) before centralizing; avoid over‑parameterizing.

## Next Session Plan
- Quick QA sweep (TargetCam → NPC → UI → Weapons → Physics) with toggles OFF.
- Centralize asteroid tier thresholds and ore yields into `GameConstants` (WORLD.ASTEROIDS or EFFECTS.Ore) for easy tuning.
- Add a small constants block for ore pickup sizes/glitter cadence (UI/EFFECTS) if desired.
- Optional: gate console mirroring via a toggle if top toasts are re‑enabled for specific pages.

## Context / Links
- Start with this handoff and `SESSION_CADENCE.md`.
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/SPAWN_AND_FX.md`, `INTERNAL_DEV_DOCS/UI_NOTIFICATIONS.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`.
- Fixture: `docs/test/targetcam-spec.html`.

## Debug / Toggles Used
- None by default. Diagnostics left OFF.
- Optional QA toggle: `window.VFX_DEBRIS_POLISH = true` (adds sliver shards + molten fade). Leave OFF by default.
