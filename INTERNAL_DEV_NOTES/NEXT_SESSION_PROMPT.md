# Next Session Prompt — Validation + Light Perf QA (Session 58)

Use this prompt verbatim (or trim) to kick off the next session. It’s aligned with our internal docs and cadence.

---

Architecture
- EventBus-only communication; all mutable state in `StateManager.state`.
- Rendering hygiene: world via `withWorld`; HUD/overlays via `withScreen`; reset transforms at frame start; save()/restore() every block; never rely on ambient context.
- Pixel sprites: never scale the context; compute `dw/dh` explicitly and draw at identity.
- TargetCam: Single owner `TargetCamRenderer.js`. Deterministic, upgrade-only path selection (direct → preloaded → standalone → atlas → baseline). One source per target (no mixing). PNGs add `+90°` inner rotation; atlas/baseline use only `npc.angle`. Warm‑up window (~450ms; `window.TC_WARM_MS`) suppresses atlas/baseline.
- Assets: `AssetSystem` owns atlases + sprite preloading; don’t poke atlas internals from systems.
- Diagnostics: OFF by default. TargetCam FX enabled via `window.TC_FX = true` (QA only). Minimal logs via `window.DEBUG_SPRITES = 'errors'`.

What’s Landed (Latest)
- TargetCam: Strict buffer‑blit retained; deterministic selection; warm‑up guard preserved. QA tuning toggles: `TC_ANGLE_EPS`, `TC_MIN_MS` (OFF by default).
- Profiling/guard: Optional “other-spike guard” (OFF by default). Briefly stride/skip minimap + HUD when worst:other exceeds threshold.
- Spawn/FX: No instant replacement spawns; pirate suppression after deaths; arrive/depart/land/takeoff FX wired (no blink‑in). Scavengers removed.
- Save/UI: Save hardened (whitelist + pollution prevention). Optional save-size HUD stat (OFF). Trading bug fix (repEff). Notifications queued sequentially with fade; HUD spacing tightened; logo image + fallback ASCII.
- WebGL spike: A minimal `WebGLRenderSystem` exists behind a flag; OFF by default (Canvas2D remains shipping path).

Primary Goals (This Session)
- Validation + polish (Canvas2D path):
  - Confirm TargetCam stability and correct orientation; not worst render bucket; “other” low/rare over long runs.
  - Verify spawn damping + FX under stress (rapid kills, mixed factions, near planets).
  - Confirm UI notification sequencing; trading/landing flows clean.
- Threshold tuning (only if QA indicates):
  - TargetCam: `TC_ANGLE_EPS`, `TC_MIN_MS`.
  - Spawn: `SPAWN_TYPE_COOLDOWN_MS`, `SPAWN_PIRATE_SUPPRESS_MS`.
- Optional diagnostics: brief profiling samples only.

Constraints / Guidelines
- Keep changes surgical and scoped; don’t refactor unrelated systems.
- Do not enable debug overlays/FX by default.
- Maintain deterministic TargetCam selection + warm‑up guard as source of truth.
- Use `AssetSystem` helpers for atlases.

Acceptance Criteria
- TargetCam: Auto mirrors world heading; no 90° CCW mismatches across transitions. During warm‑up: PNG appears as soon as ready; otherwise no silhouette; after warm‑up, atlas/baseline allowed and nose‑right.
- Spawn/FX: No immediate same‑type replacements; pirates don’t appear from death; arrive/depart/land/takeoff FX visible (no blink‑in).
- UI/HUD: Notifications sequential with fade; trading opens cleanly after landing; HUD left stats + radio close; logo displayed.
- Performance: TargetCam never worst bucket; “other” low/rare; autosave/HUD responsive; no visible hitches.

Verification Steps
1) Serve locally: `python3 -m http.server 8000` → `http://localhost:8000/docs/`
2) Ensure Canvas2D (reset any spike flags):
   - Remove `?webgl=1` in URL; console: `localStorage.removeItem('RENDER_WEBGL')`
3) Clear toggles in console:
   - `delete window.TC_FORCE; delete window.TC_FORCE_ENABLED; delete window.TC_DEBUG; delete window.TC_SHOW_PATH; delete window.TC_SILENT`
   - `delete window.RENDER_AUTO_QUALITY; delete window.RENDER_PROF_OVERLAY; delete window.RENDER_PROF_LOG; delete window.RENDER_PROF_AUTO_ENABLED`
   - `delete window.UPDATE_PROF_LOG; delete window.UPDATE_PROF_OVERLAY; delete window.DEBUG_SPAWN; delete window.DEBUG_SAVE`
   - `delete window.TC_ANGLE_EPS; delete window.TC_MIN_MS; delete window.SPAWN_TYPE_COOLDOWN_MS; delete window.SPAWN_PIRATE_SUPPRESS_MS`
4) TargetCam fixture: `http://localhost:8000/docs/test/targetcam-spec.html`
   - Temporarily: `window.TC_DEBUG = true; window.TC_SHOW_PATH = true` to confirm path/orientation; then disable.
   - Force each path; patrol east; confirm orientation; no flicker.
   - Try `window.TC_WARM_MS = 300` and `= 500`; during warm‑up: PNG only (else none). After warm‑up: atlas/baseline allowed + nose‑right.
5) Main: `http://localhost:8000/docs/`
   - Let it run 2–5 minutes; cycle targets frequently; intermittently enable overlay to sample `[RenderProfileStr]`. TargetCam not worst; “other” low/rare.
   - Spawn/FX: destroy ships in varied contexts; no instant replacement; FX visible.
   - UI: notifications one‑by‑one; trading opens cleanly after landing; logo visible. To suppress external fetches entirely: `window.UI_LANDSCAPE_PROVIDER = 'none'` before landing.
6) Optional brief profiling:
   - `window.RENDER_PROF_OVERLAY = true` (identify worst bucket); disable afterwards.
   - `window.RENDER_PROF_LOG = true` (capture spike payloads); disable afterwards.
   - Optional guard (diagnosis only): `window.RENDER_OTHER_GUARD = true; window.RENDER_OTHER_GUARD_MS = 12; window.RENDER_OTHER_GUARD_N = 1`; disable afterwards.

Toggles (OFF by default)
- TargetCam: `TC_WARM_MS`, `TC_ANGLE_EPS`, `TC_MIN_MS`, `TC_SHOW_PATH`, `TC_FX`
- Profilers: `RENDER_PROF_LOG`, `RENDER_PROF_OVERLAY`, `RENDER_PROF_T`, `RENDER_PROF_AUTO_ENABLED`; `UPDATE_PROF_LOG`, `UPDATE_PROF_OVERLAY`, `UPDATE_PROF_T`
- Spawn QA: `SPAWN_TYPE_COOLDOWN_MS`, `SPAWN_PIRATE_SUPPRESS_MS`
- UI provider: `UI_LANDSCAPE_PROVIDER = 'unsplash'|'lexica'|'auto'|'none'`
- Noise logs: `DEBUG_SPAWN`, `DEBUG_SAVE`

Notes / Decisions
- WebGL spike present behind a flag — keep OFF unless explicitly testing: `?webgl=1` or `localStorage.setItem('RENDER_WEBGL','1')`; remove with `localStorage.removeItem('RENDER_WEBGL')`. Spike draws simple GPU triangles only; Canvas2D remains shipping path.
- Autosave: small guard defers autosave on heavy frames to avoid visible hitches.
- SpawnSystem: arrival/takeoff FX enforced to eliminate blink‑in.

Plan (Suggested)
1) Run fixture + main; confirm TargetCam orientation/warm‑up; TargetCam not worst.
2) Stress spawn/FX (near planets, mixed factions); confirm suppression + FX.
3) UI polish check: notification sequencing; trading/landing clean.
4) Only tune thresholds if QA indicates; then delete overrides.
5) Leave all toggles OFF; update handoff/notes if anything changes.

Context / Links
- Internal docs: `INTERNAL_DEV_DOCS/RENDERING.md`, `INTERNAL_DEV_DOCS/PROFILING.md`, `INTERNAL_DEV_DOCS/SPAWN_AND_FX.md`, `INTERNAL_DEV_DOCS/UI_NOTIFICATIONS.md`, `INTERNAL_DEV_DOCS/DEVELOPER_GUIDE.md`, `SESSION_CADENCE.md`
- Handoff: `SESSION_57_HANDOFF.md`
- Key files: `docs/js/systems/TargetCamRenderer.js`, `docs/js/systems/RenderSystem.js`, `docs/js/systems/SpawnSystem.js`, `docs/js/systems/UISystem.js`, `docs/js/systems/AssetSystem.js`, `docs/js/systems/SpriteMappings.js`
- Fixture: `docs/test/targetcam-spec.html`

---

