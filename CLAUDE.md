# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Galaxy Trader is a 2D space trading/combat game with roguelike progression, built with pure JavaScript ES6 modules. Production code lives in `/docs` (served by GitHub Pages). The architecture uses an EventBus pattern with centralized state management.

**Live game**: https://lobabobloblaw.github.io/space-simulator-ev/

## Development Commands

### Local Development
```bash
# Start local server (required for ES6 modules)
python3 -m http.server 8000
# Browse to http://localhost:8000/docs/
```

### Version Stamping (Optional)
```bash
bash scripts/stamp_version.sh
```

### Deployment
```bash
# Push to main auto-deploys to GitHub Pages
git add docs/ && git commit -m "Your changes" && git push

# Or use helper script (auto-stamps version)
bash scripts/deploy.sh
```

## Architecture

### Core Principles
- **EventBus-only communication**: All systems communicate via `EventBus`; no direct cross-system calls
- **Single source of truth**: All mutable state lives in `StateManager.state`; permanent progression in `MetaStateManager`
- **Strict rendering hygiene**: Every draw operation bracketed by `save()`/`restore()`; never rely on ambient context
- **World vs Screen spaces**: Keep strictly separated using `withWorld()` and `withScreen()` from `RenderHelpers.js`

### Code Layout
- **Game entry**: `docs/js/main_eventbus_pure.js` — bootstraps all systems, wires EventBus handlers
- **Core**: `docs/js/core/` — EventBus, StateManager, MetaStateManager, GameLoop
- **Systems**: `docs/js/systems/` — Input, Physics, Render, Audio, NPC, Missions, Shop, etc.
- **UI layer**: `docs/js/ui/` — MainMenuUI (ship select), DeathScreenUI (run-end)
- **Data**: `docs/js/data/` — gameData.js (planets, missions, NPCs, commodities), zones.js (roguelike zone definitions)
- **Utilities**: `docs/js/utils/` — Constants.js (GameConstants), MathUtils.js, SpatialHash.js, ErrorUtils.js

### Key Systems
- **RenderSystem** (`RenderSystem.js`): Single rendering orchestrator; world-space and screen-space passes
- **RenderHelpers** (`RenderHelpers.js`): `withWorld()`, `withScreen()`, `toWhiteMaskCanvas()` — all rendering goes through these
- **AssetSystem** (`AssetSystem.js`): Atlases, sprites, and effect flipbooks
- **TargetCamRenderer** (`TargetCamRenderer.js`): In-canvas targeting viewport with deterministic source resolution
- **NPCSystem** (`NPCSystem.js`): AI behaviors (including boss phase AI), spawning, faction logic
- **HUDRenderer** (`HUDRenderer.js`): Screen-space overlays (health, brackets, zone indicator, boss health bar)
- **RunSystem** (`RunSystem.js`): Roguelike run lifecycle — start/end runs, zone progression, boss gates
- **MetaStateManager** (`MetaStateManager.js`): Permanent cross-run progression — ship unlocks, stats, achievements (stored in `localStorage` key `galaxyTraderMeta`)
- **SpawnSystem** (`SpawnSystem.js`): NPC spawning with zone-based weights, elite/boss spawning
- **MissionSystem** / **MissionGenerator**: Mission state + procedural generation
- **ShopSystem** (`ShopSystem.js`): Trading, upgrades, ship purchases with trade-in logic
- **UISystem** (`UISystem.js`): Panel management, mission board, shipyard UI
- **ShipCatalog** (`ShipCatalog.js`): Central type→class, size, sprite scale mapping
- **SpriteMappings** (`SpriteMappings.js`): type→spriteId, rotation offsets — single source for orientation

### Roguelike Meta-Loop

```
Main Menu (ship select) → BEGIN RUN
  ↓
Zone 1: Core Systems (★) → meet kill/credit requirements → Z to advance
  ↓
Zone 2: Frontier Space (★★) → boss gate (Captain Blackstar)
  ↓
Zone 3: Outer Rim (★★★) → boss gate (Warlord Krix)
  ↓
Zone 4: The Void (★★★★) → final boss (The Devourer) → VICTORY
  ↓
Death/Victory → MetaStateManager records stats → unlocks → Main Menu
```

- **MetaStateManager** persists unlocks/stats across runs (`galaxyTraderMeta` localStorage key)
- **RunSystem** manages ephemeral per-run state (`galaxyTraderRun` localStorage key)
- Boss AI uses phase-based behavior (tactical → aggressive → berserk → desperate)
- Zone definitions live in `docs/js/data/zones.js`

### Rendering Details

**Coordinate Spaces**:
- World space: Camera-relative; use `RenderHelpers.withWorld(ctx, camera, screenCenter, fn)`
- Screen space: Identity transform; use `RenderHelpers.withScreen(ctx, fn)`

**Sprite Rules**:
- Never scale context for pixel sprites; compute `dw/dh` explicitly
- Always use `imageSmoothingEnabled = false` for pixel art
- HiDPI: Canvases sized by `devicePixelRatio`; helpers apply DPR transforms
- Damage flash in screen space must divide by DPR (canvas.width/dpr)

**TargetCam**:
- Deterministic, upgrade-only path: direct PNG → preloaded → standalone → atlas → baseline
- Warm-up window (~450ms via `window.TC_WARM_MS`) suppresses atlas/baseline during transitions
- PNG sprites use +90° inner rotation; atlas/baseline use only `npc.angle`

**Quality & Performance**:
- Auto quality management degrades on over-budget frames, recovers slowly
- Boot ramp (~3s): Forces medium quality, skips minimap/HUD overlays
- SpatialHash used for collision broadphase (see `SpatialHash.js`)
- Gradient caching for pickups to reduce GC pressure

### Event Categories

**Input**: `INPUT_KEY_DOWN`, `INPUT_FIRE`, `INPUT_LAND`, `INPUT_SWITCH_WEAPON`, `INPUT_ZONE_ADVANCE`

**Gameplay**: `SHIP_DAMAGE`, `SHIP_DEATH`, `NPC_DEATH`, `EXPLOSION`, `TARGET_SET`, `TARGET_CLEAR`

**Missions**: `MISSION_ACCEPT`, `MISSION_COMPLETE`, `MISSION_ABANDON`, `MISSION_FAILED`, `SHIP_BUY`

**Run/Zone**: `run.start`, `run.end`, `run.victory`, `zone.change`, `zone.boss.spawn`, `zone.boss.defeat`

**UI**: `UI_MESSAGE`, `UI_UPDATE`, `MENU_OPEN`, `MENU_CLOSE`

**Render**: `render.useSprites`, `render.quality`, `assets.ready`

### State Structure

**`StateManager.state`** (per-run, ephemeral):
- `ship`: Position, velocity, health, weapons, cargo, credits, shipClass, missions, missionStates
- `npcShips[]`: NPC entities with AI state, behavior, faction
- `planets[]`, `asteroids[]`, `projectiles[]`, `explosions[]`
- `renderSettings`: useSprites, spriteCulling, starDensity, quality
- `assets`: Atlases, sprites, flipbooks
- `targeting`: Selected target ID

**`MetaStateManager`** (permanent, cross-run):
- `unlocks.ships[]`, `unlocks.upgrades[]`: What's available in future runs
- `stats`: totalRuns, totalDeaths, totalKills, bestRunTimeMs, zonesReached, etc.
- `achievements[]`: Completed achievement IDs

### Current Content
- **Zones**: 4 (Core Systems → Frontier Space → Outer Rim → The Void) with scaling difficulty
- **Bosses**: 3 (Captain Blackstar, Warlord Krix, The Devourer) with phase-based AI
- **Missions**: 26 static + infinite procedural (delivery, bounty, escort types)
- **Ships**: 6 classes (Scout Shuttle → Viper Interceptor → Falcon Corvette → Mammoth Freighter → Tempest Gunship → Phoenix Battlecruiser)
- **Planets**: 4 (Terra Nova, Crimson Moon, Ice World, Mining Station)
- **Upgrades**: 10 types (weapons, shields, engines, cargo, radar)

## Development Guidelines

### Session Start
1. Read latest `SESSION_*_HANDOFF.md` (in repo root; older ones archived in `archive/`) and `AGENTS.md`
   - Sessions may be numbered sequentially (69), or prefixed (AUDIT_5, ROGUELIKE_3)
2. Start local server and clear stale toggles (see `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md`)
3. Verify TargetCam with `docs/test/targetcam-spec.html`
4. Use plan tool for 3-6 concrete steps

### Testing
- **TargetCam spec**: `docs/test/targetcam-spec.html` — Verify TargetCam rendering paths
- **NPC test**: `docs/test/npc-test.html` — Test NPC behaviors and spawning
- **Manual QA**: Start a run, advance zones, trigger bosses, verify HUD elements

### Making Changes
- **Surgical changes only**: Fix root causes; don't reformat unrelated code
- **Preserve hygiene**: Always save/restore context; reset transforms at frame boundaries
- **No diagnostics by default**: Keep debug overlays OFF; use toggles only for QA
- **Update docs**: Sync `INTERNAL_DEV_DOCS/` if behavior changes

### Session End
1. Verify acceptance criteria; turn off all toggles
2. Update `SESSION_*_HANDOFF.md` with changes, verification steps, next plan
3. Use `SESSION_HANDOFF_TEMPLATE.md` for new handoff structure
4. Ensure no debug overlays remain enabled

## Quick Toggles (QA Only)

Common toggles (full reference in `INTERNAL_DEV_DOCS/QUICK_TOGGLES.md`):

| Toggle | Effect |
|--------|--------|
| `window.TC_SHOW_PATH = true` | Show TargetCam active source label |
| `window.TC_DEBUG = true` | Draw axes overlay in TargetCam |
| `window.TC_FX = true` | Enable static/scanline effects |
| `window.RENDER_PROF_OVERLAY = true` | Show render profiler |
| `window.DEBUG_SPRITES = 'errors'` | Minimal sprite diagnostics |

**Reset All**:
```javascript
delete window.TC_SHOW_PATH; delete window.TC_DEBUG; delete window.TC_FX; delete window.RENDER_PROF_OVERLAY; delete window.UPDATE_PROF_OVERLAY; delete window.VFX_DEBRIS_POLISH; delete window.UI_TOASTS; delete window.DEBUG_WEAPONS;
```

## Internal Documentation

Detailed docs live in `INTERNAL_DEV_DOCS/` (not published). Key files:
- `ARCHITECTURE.md` — EventBus, StateManager, system overview
- `RENDERING.md` — Rendering passes, TargetCam, HiDPI, quality management
- `EVENTS_AND_STATE.md` — Event categories, state shape
- `QUICK_TOGGLES.md` — Comprehensive QA toggle reference
- `ASSETS.md` — Asset loading pipeline, atlases, sprites
- `SPAWN_AND_FX.md` — NPC spawning, explosion/debris effects
- `CONVENTIONS.md` — Coding rules, commit style
- `DEVELOPER_GUIDE.md` — System architecture deep dive
- `PROFILING.md` — Performance profiling and optimization
- `DECISIONS.md`, `TECH_DEBT.md` — Architectural decisions and known debt
- `AGENTS.md` (repo root) — AI session playbook with coding rules

## Important Constraints

- **All development in `/docs`** — This is what GitHub Pages serves
- **No window globals for game state** — Use StateManager only (window toggles are QA-only diagnostics)
- **Asset System owns sprites/atlases** — Don't access atlas internals directly; use helpers like `getFrameCanvas`
- **One source per TargetCam selection** — No mixing paths during transitions
- **Sprite orientation centralized** — See `SpriteMappings.js` for type→spriteId, rotation offsets
- **Adding new ship types** — Update `SpriteMappings.js`, `ShipCatalog.js`, and `gameData.js` together
- **Two persistence layers** — `StateManager` for ephemeral run state; `MetaStateManager` for permanent progression. Don't mix them.
