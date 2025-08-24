# Session 53 Handoff — Rendering (TargetCam) + NPC Overhaul

- Primary focus next session: Finish TargetCam orientation correctness across all paths (standalone / preloaded / direct / atlas / baseline), remove any transform mixing, and smooth out brief rAF spikes.
- Secondary: Validate new NPC behaviors (distress → patrol response, scavengers) and plan convoy/landing-queue work.

## Current Status

- Architecture: EventBus-only; single mutable `StateManager.state`; rendering via `RenderSystem` with helpers `withWorld` / `withScreen`. TargetCam is a screen-space viewport.
- Art orientation:
  - PNG sprites (direct/preloaded/standalone): authored “up” → require `spriteRotationOffset` (+90°) like the world renderer applies.
  - Placeholder atlas frames + VPA baseline shapes: authored nose-right → rotate by `npc.angle` only.
- TargetCam refactor: Extracted as `TargetCamRenderer` to mirror world transforms and prevent leakage. Path selection now uses deterministic, upgrade‑only resolution (one source per target; no mixing).
- Debug: `window.TC_DEBUG = true` draws final-orientation axes per path (cyan +X, magenta +Y) after all transforms. Tiny white-mask cache (cap 3) reduces per-frame allocations.
- Fixtures: `docs/test/targetcam-spec.html` provides Force path toggle and borescope testing for TargetCam.

## Observed Behavior (Fixture)

- preloaded / direct: Correct sprite; cyan axis down (expected for PNG + +90° base). Good.
- atlas / baseline: White silhouette horizontal when facing east; cyan axis right (expected for nose-right art). Good.
- standalone: When PNG not ready, fallback baseline appeared vertical at one point (cyan down) — this indicated transform mixing; early-return has been added to prevent this. If PNG is ready, behaves like preloaded.

## Files Touched

- `docs/js/systems/TargetCamRenderer.js`
  - Outer rotate by `npc.angle` once. PNG paths rotate by base (+ per-sprite); atlas/baseline apply none.
  - Early-return after first success; per-path debug axes (opt-in); tiny white-mask cache.
- `docs/js/systems/AssetSystem.js`
  - Explosion flipbook frames resolved relative to `docs/` root; ship sprites preloaded; crossOrigin fixes.
- `docs/js/systems/RenderSystem.js`
  - Delegation to `TargetCamRenderer`. Suppress one-frame vector fallback flash for player during warmup.
- `docs/js/systems/SpriteMappings.js`
  - Central type→spriteId and orientation overrides.
- `docs/test/targetcam-spec.html`
  - Force path UI; axes debug; simplified loop.
- `docs/js/systems/NPCSystem.js`
  - Added `NPC_DISTRESS`; patrol response to distress; scavenger spawns post-destruction.
- `docs/js/core/EventBus.js`
  - Added `NPC_DISTRESS` event.

## Open Issues

- Standalone path: Ensure that in fixture and game, forced ‘standalone’ either draws PNG (if ready) or early-returns to atlas/baseline (nose-right) — never mixing. If standalone falls back, fallback must be horizontal for east (cyan right).
- Minor performance spikes: Reduced by caching masks; widened cache to 5 if needed.

## Plan Next Session (TargetCam)

1) Standalone readiness guard
   - Only draw if `assets.sprites[spriteId]?.image` is ready; otherwise go to atlas → baseline; return immediately.
   - Re-verify that forced ‘standalone’ never mixes transforms.
2) Confirm final transforms with `TC_DEBUG = true`
   - PNG paths: sprite noses match world; cyan down.
   - Atlas/baseline: white silhouette matches world; cyan right.
   - Standalone fallback: behaves as atlas/baseline; cyan right.
3) Per-art tweak (if needed)
   - If any sprite still needs fine adjustment (e.g., patrol +0.05 rad), add to `spriteOrientationOverrides`.
4) Perf + Warm-up polish
   - Mask cache tuned (cap=5). Add/adjust warm‑up window to suppress atlas/baseline for ~450ms after TARGET_SET so silhouettes do not flip to nose‑right during transitions.

## Acceptance Criteria

- For each ship type, forced paths behave:
  - preloaded/direct: TargetCam sprite matches world orientation exactly.
  - atlas/baseline: White silhouette matches world heading (e.g., east → horizontal); no 90° skew.
  - standalone: PNG when ready; otherwise baseline fallback with correct (nose-right) orientation — no combining within a frame.
- Auto mode: No ‘south-facing’ surprises; consistent orientation through transitions; no path mixing. During warm‑up, omit silhouette rather than show mismatched fallback.
- Perf: No sustained rAF violations; TargetCam transitions feel smooth.

## Verification Steps

- Fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
  - `window.TC_DEBUG = true`
  - Choose patrol; face east; Force each path and confirm axes and sprite noses:
    - PNG: cyan down; correct sprite nose.
    - Atlas/baseline: cyan right; horizontal silhouette.
    - Standalone: PNG path if ready, else baseline horizontal.
- Game: `http://localhost:8000/docs/`
  - Cycle targets; verify no skew. Optionally enable `TC_DEBUG` during play for spot checks.

## NPC Overhaul (Implemented + Next)

- Implemented:
  - Distress system: traders/freighters emit `NPC_DISTRESS` when threatened; nearest patrol responds (state.respondTarget).
  - Scavengers: Opportunistic scavenger spawns on `NPC_DESTROYED`, seeks pickups, departs after inventory/time.
- Next (optional):
  - Convoy + patrol escort (protective orbit; pirates prefer convoys).
  - Planet landing queue (prevent pile-ups; patrol loiter at entry points).
  - Reputation/scan hooks (patrols scan cargo, small fines/events).

## Internal Docs (for future sessions)

- Internal-only: `INTERNAL_DEV_DOCS/` — architecture, systems, events/state, rendering (TargetCam playbook), assets, conventions, developer guide.
- AI playbook: `AGENTS.md` — event/state hygiene, TargetCam rules, toggles (`TC_DEBUG`, `TC_FX`, `DEBUG_SPRITES`), safe-change checklist.

## Initial Setup Example (Next Session)

1) Run server: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
2) Fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
3) In console: `window.TC_DEBUG = true`
4) Patrol east-facing; force paths in order; confirm axes and sprite noses:
   - preloaded/direct → cyan down; sprite nose correct (matches world).
   - atlas/baseline → cyan right; white silhouette horizontal (matches world).
   - standalone → PNG if ready; else baseline horizontal — no vertical oval.
5) If any mismatch: tweak `spriteOrientationOverrides` (PNG paths only) or adjust readiness guard for standalone.

*** End of Session 53 ***
