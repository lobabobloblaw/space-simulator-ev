# INTERNAL — Systems Overview
# For development and AI sessions only (not published)

This is a practical map of systems, responsibilities, and important events.

## Core

- EventBus (`docs/js/core/EventBus.js`)
  - Provides `getEventBus()`, `on(event, fn)`, `emit(event, data)`.
  - Event constants under `GameEvents` (inputs, UI, gameplay, rendering).

- StateManager (`docs/js/core/StateManager.js`)
  - Holds `state`: ship, npcShips, asteroids, planets, renderSettings, assets, debug, etc.
  - Acts as the single source of truth; systems read/write via events.

## Gameplay

- InputSystem: Captures keyboard; emits events (e.g., fire, land, switch weapon, target cycle).
- PhysicsSystem: Integrates velocities, applies thrust/drag, handles collisions and projectile lifetimes.
- NPCSystem: Spawns, AI behaviors (aggressive/lawful/passive), state transitions, hostility brackets via HUD.
- TargetingSystem: Maintains `state.targeting.selectedId`. Emits `TARGET_SET`/`TARGET_CLEAR`.
- SaveSystemAdapterFixed: Saves/loads selected fields from `state` via events.

## Rendering

- RenderSystem: Frame orchestration; world and screen passes. Sub‑renderers:
  - HUDRenderer: Screen‑space overlays (health bars, faction brackets for selected NPC, messages).
  - ExplosionRenderer: Explosion visuals (flipbook when available; fallback puffs).
  - ThrusterFXRenderer: Thruster flames (optional effects atlas).
  - TargetCam: Silhouette viewport; responds to `TARGET_SET/CLEAR` and render toggles.

Helpers: `RenderHelpers.withWorld`, `RenderHelpers.withScreen`, `toWhiteMaskCanvas`.

## Assets

- AssetSystem
  - Builds placeholder atlas; exposes `atlas.canvas` and frame map.
  - Builds effects atlas (thrusters/explosion puffs).
  - Loads explosion flipbook (`assets/explosion.json`) or synthesizes fallback.
  - Loads standalone ship sprites; also preloads known ship PNGs for immediate TargetCam use.

## Visual Configuration

- Sprite mappings: `SpriteMappings.js` centralizes:
  - `typeToSpriteId`, `aliasSpriteForType`, `spriteRotationOffset`, `spriteOrientationOverrides`.
- Render toggles (via EventBus):
  - `render.useSprites`, `render.spriteCulling`, `render.useEffectsSprites`, `render.quality`.
