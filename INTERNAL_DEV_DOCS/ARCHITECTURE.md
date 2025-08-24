# INTERNAL — Galaxy Trader Architecture Overview
# For development and AI sessions only (not published)

This project is a docs-first, EventBus‑driven space sim. GitHub Pages serves directly from `docs/`.

- Event model: All systems communicate via `EventBus`; no direct cross‑system calls.
- State model: `StateManager.state` is the single source of truth for all mutable state.
- Rendering model: One `RenderSystem` orchestrates world and screen passes; TargetCam is a screen‑space viewport.
- Assets: `AssetSystem` owns atlases, standalone sprites, and effect flipbooks.

## Core Concepts

- EventBus: Pub/sub hub for inputs, gameplay events, and render settings.
- StateManager: Holds the canonical `state` (ship, NPCs, asteroids, planets, renderSettings, assets, etc.).
- Spaces: World space (camera transform) vs Screen space (identity transform). Keep them separate.
- Hygiene: Every draw is bracketed by `save()` and `restore()`; never rely on ambient context state.

## Key Systems

- InputSystem: Keyboard input → emits input events.
- PhysicsSystem: Movement, collisions, projectiles updates from state.
- RenderSystem: All drawing (world + HUD + TargetCam + effects). Uses helpers `withWorld`/`withScreen`.
- AssetSystem: Builds placeholder/effects atlases, loads standalone sprites, explosion flipbook.
- NPCSystem: Behavior, spawning, aggro; mutates `state.npcShips` through EventBus.
- HUDRenderer: Screen‑space overlays (health bars, brackets, NPC indicators, messages).
- ExplosionRenderer / ThrusterFXRenderer: Effects rendering (screen/world as appropriate).
- SaveSystem* adapters: Persist/restore selected parts of state via events.

## Rendering Passes

World (camera space): stars, planets, asteroids, ship, NPCs, projectiles, effects.
Screen (identity): HUD (player health, NPC overlays), TargetCam viewport, UI labels.

Use `RenderHelpers.withWorld(ctx, camera, screenCenter, fn, shakeX?, shakeY?)` and `withScreen(ctx, fn)` to keep spaces separate and safe.

## TargetCam Summary

- Viewport: `#centerViewportCanvas` in the HUD right panel.
- Silhouettes: White/cool tint via `toWhiteMaskCanvas` or safe source‑in tint fallback.
- Try order (guarded):
  1) Standalone sprite (assets.sprites)
  2) Preloaded direct image (per‑session cache)
  3) On‑demand direct image
  4) Cached per‑frame from placeholder atlas
  5) Atlas sub‑rect (offscreen mask)
  Baseline/vector only if none of the above draws this frame.
- Orientation: Centralized in `SpriteMappings.js` (type→spriteId, per‑sprite offsets, base sprite rotation offset).

## Asset Pipeline

- Placeholder atlas: Generated on startup; exposes `atlas.canvas` for immediate sub‑rect extraction.
- Effects atlas: Procedural thrusters and explosion puffs.
- Explosion flipbook: Tries to load `assets/explosion.json`; falls back to synthesis from effects atlas.
- Standalone sprites: Optional manifest; also preloads known ship PNGs by id.

## Ground Rules (Enforced in Code)

- Events‑only: No direct cross‑system calls.
- Single source of truth: All mutable state under `StateManager.state`.
- Render hygiene: Save/restore on every draw; reset transforms at frame boundaries; avoid composite leaks.
- Pixel sprites: Never scale the context for sprites — compute `dw/dh` and draw at identity; keep world/screen separation.
- Diagnostics: OFF by default (no overlays in prod). TargetCam static FX toggled via `window.TC_FX`.
