Session 65 Handoff

Summary
- Implemented HiDPI (Retina) crispness with DPR-aware canvases for main, minimap, and TargetCam.
- Integrated global DPR transform into `withWorld`/`withScreen` to preserve gameplay units (CSS px) and avoid per-sprite context scaling.
- Kept pixel sprites unsmoothed; planets enable smoothing via `PlanetSpriteRenderer`.
- Added optional planet sprite manifest preloading in `AssetSystem` (graceful fallback to procedural/soft-disc).
- Introduced `ShipCatalog` scaffolding (type → class → nominal size + default spriteScale) and annotated `SpawnSystem` templates without changing feel.
- Updated internal docs with DPR notes and asset authoring guidance.

What Changed
- Rendering
  - `RenderHelpers`: `withWorld`/`withScreen` apply `canvas.__dpr` using `setTransform(dpr,0,0,dpr,0,0)`.
  - `RenderSystem`: `resizeCanvas()` sets CSS size and backing stores by DPR; resizes minimap/TargetCam canvases to their CSS sizes. `handleCanvasResize()` now defers to `resizeCanvas()`.
  - `RenderSystem` minimap: clears in device pixels, draws in CSS units; static overlays unchanged. No gameplay-unit changes.
  - `TargetCamRenderer`: clears in device pixels, draws silhouette/rings in CSS units; static overlays use device pixels to fully cover.
  - `HUDRenderer`: build tag width computed in CSS pixels.
  - `InputSystem`: touch zone normalization uses CSS pixel size (DPR-aware) to preserve zones.
- Assets
  - `AssetSystem`: new `loadPlanetSpritesManifest()` reads `UI.PLANETS.SPRITES.MANIFEST_URL` (default `./assets/planets.json`), preloads images via `getPlanetSpriteFromState` pathing; no-op if missing.
- Ships
  - `ShipCatalog`: central map of type→class, nominal sizes, sprite scales (reads from `GameConstants`).
  - `SpawnSystem`: templates annotated with `class`, `nominalSize`, `spriteScale` (metadata only; no runtime size/feel changes).
- Entry
  - `main_eventbus_pure`: window resize handler emits CSS pixel dims; `RenderSystem` handles DPR sizing.
- Docs
  - Added `INTERNAL_DEV_DOCS/dpr_hidpi_notes.md`.

Acceptance Check
- Retina crispness: main canvas, minimap, and TargetCam now render sharply (no soft blur from DPR mismatch). HUD/text alignments preserved.
- Planet sprites: sprite mode still optional; manifest preload is graceful; procedural remains default.
- Ship sizes/scales: references centralized; runtime behavior unchanged.

Toggles (default OFF)
- `window.USE_PLANET_SPRITES = true|false` (default procedural).
- `window.VFX_DEBRIS_POLISH = true` (OFF).
- `window.UI_TOASTS = true` (OFF).
- `window.TC_FX = true` to enable TargetCam FX.

Next Session Plan
1) QA pass on Retina/low-DPR displays; verify HUD element placements and input zones.
2) Add a lightweight `getFrameCanvas` DPR cache key to avoid re-extracts if needed (likely unnecessary).
3) Expand planet sprite manifest format doc and sample `assets/planets.json` (authoring guidance, radius mapping hints).
4) Consider ShipCatalog usage in TargetCam sizing and NPC render hints (no feel change).

Note
- Next agent should begin with this handoff and `SESSION_CADENCE.md`.

