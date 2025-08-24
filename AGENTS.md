AI Session Playbook (Internal)

Use these rules and pointers to work safely and effectively in this repo.

- Architecture: EventBus‑only communications; all mutable state in `StateManager.state`.
- Rendering: Use `withWorld` for world space; `withScreen` for HUD/screen space. Never rely on ambient context — save()/restore() every draw block. Reset transforms at frame boundaries.
- Sprites: Do not scale the context for pixel sprites; compute destination `dw/dh` explicitly and draw at identity.
- TargetCam: Deterministic, upgrade‑only path selection — direct → preloaded → standalone → atlas → baseline. One source per target (no mixing). PNGs add `+90°` inner rotation; atlas/baseline use only `npc.angle`. Warm‑up window (~450ms) suppresses atlas/baseline to avoid mismatches; adjust via `window.TC_WARM_MS`.
- Assets: Let `AssetSystem` own atlases and sprite preloading; avoid poking atlas internals from systems (or add a helper like `getFrameCanvas`).
- Diagnostics: Keep OFF by default. For TargetCam, enable FX with `window.TC_FX = true`. Minimal logs with `window.DEBUG_SPRITES = 'errors'`.
- Scope: Make surgical changes; don’t reformat wide swaths or refactor unrelated parts. Fix root causes.

Entry points:
- Game entry: `docs/js/main_eventbus_pure.js`
- Render core: `docs/js/systems/RenderSystem.js`
- Helpers: `docs/js/systems/RenderHelpers.js`
- Assets: `docs/js/systems/AssetSystem.js`
- HUD: `docs/js/systems/HUDRenderer.js`
- Sprite mappings: `docs/js/systems/SpriteMappings.js`

Internal docs (not published): `INTERNAL_DEV_DOCS/`

Session cadence:
- Start: Read latest `SESSION_*_HANDOFF.md`, confirm local server, clear toggles, quick TargetCam fixture check, set a short plan (use the plan tool).
- End: Verify acceptance, disable all toggles, update handoff + internal docs, summarize changes (files/behavior/toggles), list next session plan.
- See `SESSION_CADENCE.md` for detailed checklists and toggles.
- Handoff template: Use `SESSION_HANDOFF_TEMPLATE.md` when drafting the next `SESSION_XX_HANDOFF.md`. Note in your wrapup that the next agent should begin with the new handoff and cadence doc.
