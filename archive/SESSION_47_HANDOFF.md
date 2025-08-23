Session 47 Handoff — Radar upgrades, Targeting, Perf + UI cleanup

Scope
- Radar progression: Added `ship.radarLevel` with upgrade items (Radar MK I/II). Minimap detail is gated by radar level.
  - Level 0: featureless white specks; range rings hidden.
  - Level 1: planets as white dots; NPCs as white squares; rings shown.
  - Level 2+: NPC dots colored by faction accent; pirates get an outline ring.
- Targeting: Minimal hostile targeting and emphasized brackets.
  - Press X to cycle nearest hostile (pirate). Stores `state.targeting.selectedId`.
  - Targeted hostiles render thicker, gently pulsing corner brackets and a small center dot.
- Radio UI: Enlarged radial dial; controls moved to a right-side dot cluster with tiny glyphs; tuned spacing.
- Performance: Pooled explosions, warp effects, hit sparks, and muzzle flashes (soft caps); frustum culling for projectiles, explosions, pickups, micro‑effects.
- Combat feel: Per‑weapon tracer trail tuning; slight cadence jitter for rapid fire.
- Shield feedback: On shield hits, add a cyan expanding ring and smaller cyan sparks.
- Debug: F3 cycles render quality (high/medium/low). Lower quality reduces gradients/rings/sparks for perf.
- Architecture: Removed window globals from Shop/Trading; delegated UI emits EventBus events (`SHOP_BUY`, `TRADE_BUY/SELL/SELL_ALL`).

Architecture Guardrails
- Pure EventBus maintained. No new globals.
- New events: `TARGET_NEXT/SET/CLEAR`, `SHOP_BUY`, `TRADE_BUY/SELL/SELL_ALL`.
- NPCs now carry unique `id` for targeting.

Key Changes by File

docs/js/data/gameData.js
- Added `radar1`/`radar2` shop items and slotted them into planet shops.

docs/js/main_eventbus_pure.js
- Added `ship.radarLevel` default + persistence (via SaveSystemAdapterFixed).
- Assigned incremental `id` to initial NPCs.
- Initialized `TargetingSystem`.

docs/js/systems/RenderSystem.js
- Minimap now branches on `ship.radarLevel` and hides range rings at level 0.
- Colored NPC dots + pirate ring at level 2+.
- Hostile brackets; emphasized style for targeted NPCs.
- Perf: cull projectiles/explosions/pickups; quality-aware branches for explosions, pickups, trails.
- New renders for hitsparks and muzzle flashes (pooled).
- New `renderShieldHits()` draws the cyan ring on shield impact.

docs/js/systems/SpawnSystem.js
- Pooled explosions, warp effects, hitsparks, and muzzle flashes; lifecycle recycle.
- Assigned incremental `id` to spawned NPCs.

docs/js/systems/WeaponSystem.js
- Trail hints per projectile type.
- Rapid-fire cooldown jitter (+/–1 tick, clamped).
- Shield-aware sparks (smaller, cyan) and pooled muzzle flashes.

docs/js/systems/ShopSystem.js / UISystem.js / TradingSystem.js
- Removed inline `onclick` and window globals; added delegated handlers.
- New EventBus routes: `SHOP_BUY`, `TRADE_BUY/SELL/SELL_ALL`.

docs/js/systems/TargetingSystem.js (new)
- Cycles nearest pirate on `TARGET_NEXT`; emits `TARGET_SET` or clears on `NPC_DEATH`.

docs/js/systems/DebugSystem.js
- Added F3 to cycle render quality; overlay shows current quality.

Controls (additions)
- X: Cycle target (hostile)
- F3 (debug): Cycle render quality (high/medium/low)

Testing Hints
- Radar: Buy Radar MK I/II at Terra Nova / Ice World, then observe minimap detail.
- Targeting: Spawn a pirate (Debug panel button N) then press X to cycle; watch brackets.
- Perf: Toggle quality with F3; explosions/pickups/trails simplify in ‘low’.

Notes for Future Agents
- Keep EventBus-only communication; no globals.
- Targeting is intentionally minimal; next steps may include a HUD label or line-of-sight indicator.
- Quality levels are lightweight switches; consider exposing in an options menu later.

Potential Next Steps
- Targeting polish: HUD “TARGET” label and distance; optional clear-target key (Shift+X).
- Radar MK III: ship-type shapes or directional pings; minimap LOD by distance.
- Perf: cache a couple of gradients for medium/high; consider distance-based LOD for explosions.
- Combat: small recoil ceiling; muzzle glow variance; NPC aim/movement tuning by range.
- UI: tiny version/commit hash stamp for easier deploy verification.

End of Session 47.

