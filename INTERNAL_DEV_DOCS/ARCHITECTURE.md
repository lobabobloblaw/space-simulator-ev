# INTERNAL — Galaxy Trader Architecture Overview
# For development and AI sessions only (not published)

This project is a docs-first, EventBus‑driven space sim. GitHub Pages serves directly from `docs/`.

- Event model: All systems communicate via `EventBus`; no direct cross‑system calls.
- State model: `StateManager.state` is the single source of truth for all mutable state.
- Update model: `core/SystemRegistry.js` declares the update order; the loop iterates the
  registry, not object insertion order.
- Rendering model: One `RenderSystem` orchestrates world and screen passes; TargetCam is a screen‑space viewport.
- Assets: `AssetSystem` owns atlases, standalone sprites, and effect flipbooks.

## Core Concepts

- EventBus: Pub/sub hub for inputs, gameplay events, and render settings.
- StateManager: Holds the canonical `state` (ship, NPCs, asteroids, planets, renderSettings, assets, etc.).
- Spaces: World space (camera transform) vs Screen space (identity transform). Keep them separate.
- Hygiene: Every draw is bracketed by `save()` and `restore()`; never rely on ambient context state.

## System Registry (update order)

`core/SystemRegistry.js` holds `SYSTEM_ORDER`, an explicit ordered declaration of every
system and whether it takes part in the fixed-timestep update. `initializeSystems()`
resolves it against the constructed instances with `buildSystemRegistry(systems)`; the
game loop iterates that array. Before it, the loop walked `Object.entries(systems)`, so
the order was whatever `initializeSystems()` happened to construct first — Physics ran
before NPC and Weapon (collisions resolved against the previous frame), and four systems
with empty `update()` bodies were called 60 times a second for nothing.

Current sequence: `input → npc → weapon → physics → vfx → gamefeel → spawn → mission →
ui → debug`. Rendering is deliberately outside it and runs from `onRender`.

**To add a system:** construct it as `systems.<key>` in `initializeSystems()` and add one
line to `SYSTEM_ORDER` at the position it must run in. Nothing else changes.
`update: false` means "event-driven only" — declare it anyway so the registry knows the
system exists. The registry warns on a declared-but-missing system, an undeclared one
(it would never run), and on a leftover empty `update()` stub.

## Key Systems

- InputSystem: Keyboard input → emits input events.
- PhysicsSystem: Movement, collisions, projectiles updates from state.
- VisualEffectsSystem: Owns time-varying *visual* state the renderer used to mutate itself
  — screen-shake and damage-flash decay, asteroid spin and silhouette seeding, pickup
  sparkle seeds, explosion spark angles, the starfield twinkle clock. Runs on the fixed
  tick so those are frame-rate independent and freeze correctly on pause.
- RenderSystem: All drawing (world + HUD + TargetCam + effects). Uses helpers `withWorld`/`withScreen`.
  **Reads state, never writes it.**
- AssetSystem: Builds placeholder/effects atlases, loads standalone sprites, explosion flipbook.
- NPCSystem: Behavior, spawning, aggro; mutates `state.npcShips` through EventBus.
- HUDRenderer: Screen‑space overlays (health bars, brackets, NPC indicators, messages).
- ExplosionRenderer / ThrusterFXRenderer: Effects rendering (screen/world as appropriate).
- SaveSystem* adapters: Persist/restore selected parts of state via events.

## Rendering Passes

World (camera space): nebula, planets, asteroids, ship, NPCs, projectiles, effects.
Screen (identity): starfield tiles (drawn inside the world pass but at identity — the
layers are a screen-space parallax backdrop), per-NPC overlays in one pass after the
world, player HUD, TargetCam viewport, UI labels.

Screen-space overlays use `RenderSystem._hudCamera` (`camera - shake`) so they stay
locked to the shaken world; see RENDERING.md.

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
- Single source of truth: All mutable state under `StateManager.state`. The Proxy plus
  `emitSpecificEvents` is the whole StateManager API; the old `get/set/update/addEntity/
  removeEntity/reset/saveToStorage/loadFromStorage` surface had zero callers and is gone.
- Explicit update order: new systems go in `SYSTEM_ORDER`, never in construction order.
- Renderer purity: `RenderSystem` reads state; anything that changes over time belongs in
  a system that runs on the fixed tick.
- Render hygiene: Save/restore on every draw; reset transforms at frame boundaries; avoid composite leaks.
- Pixel sprites: Never scale the context for sprites — compute `dw/dh` and draw at identity; keep world/screen separation.
- Diagnostics: OFF by default (no overlays in prod). TargetCam static FX toggled via `window.TC_FX`.
