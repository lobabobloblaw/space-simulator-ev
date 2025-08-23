# Next Session Prompt — Sprite Integration (Session 50)

Context
- Project: Galaxy Trader (docs/js/main_eventbus_pure.js) — Pure EventBus architecture.
- Rules: No globals; all state in StateManager; systems communicate only via EventBus; relative imports only.
- Current: Vector rendering + procedural silhouettes; radio, targeting, UI dimming on death are in place.

Goal
- Introduce sprite-based rendering for ships and selected effects while preserving silhouettes as a fallback/option.

Requirements
- Add a small sprite asset pipeline:
  - A JSON manifest in `docs/js/assets/atlas.json` mapping frame names to UVs or use fixed-tile atlas.
  - A loader system that fetches the atlas image + JSON and exposes events when ready (e.g., `assets.ready`).
- Extend RenderSystem:
  - Sprite batch rendering path for ships when `state.renderSettings.useSprites === true`.
  - Keep silhouettes for center viewport and as fallback when sprites unavailable.
  - Basic culling and scale by quality preset (hook existing F3 quality cycle).
- State/Systems:
  - Ship types can declare `spriteId` (e.g., `"ships/raider_0"`).
  - Optional animated thruster/flame frames on thrust events.
- Events only:
  - No direct cross-system calls; RenderSystem consumes state and events.

Acceptance Criteria
- When `useSprites` enabled, ships render from sprite atlas; when disabled or missing, silhouettes render as today.
- Performance remains acceptable in medium/high quality; culling applied.
- Save/load remains compatible; no new global variables.

Nice-to-haves (time permits)
- Simple explosion sprite sheet with distance-based LOD.
- Vendor-neutral loader to support multiple atlases.

Testing
- Provide a tiny 2–3 frame placeholder atlas (can be data URLs) to prove loading + drawing flow.
- Verify toggling between silhouettes and sprites at runtime via EventBus (e.g., `render.useSprites`, boolean payload).

Notes
- Keep changes tightly scoped; do not rework unrelated systems.
- Keep CSS/DOM untouched except for optional debug overlay.

