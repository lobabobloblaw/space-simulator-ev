# Ticket — WebGL Spike — NOT PURSUED (closed 2026-09-03)

**Status: closed, will not be implemented. Code removed.**

`docs/js/systems/WebGLRenderSystem.js` and its `?webgl=1` / `window.RENDER_WEBGL` /
`localStorage['RENDER_WEBGL']` wiring in `docs/js/main_eventbus_pure.js` were deleted in
Phase 1 (roadmap 3.4 item 10). Canvas2D is the only renderer.

## Why it was dropped

1. **The frame was never batch-bound.** Profiling put the cost in a handful of Canvas2D hot
   spots, not in draw-call submission: ~9,600 per-star `fillRect` calls per frame (of which
   ~115 were on screen — the wrap band was broken, see roadmap P5), per-frame radial-gradient
   allocation for pickups, explosions and nebula, and full-viewport gradient fills. All of
   those are fixable *in Canvas2D* — the star layers are now pre-rendered tiles (~30 blits),
   and the gradients are cached. A GL port would have carried the same waste to a new API.

2. **Entity counts are two orders of magnitude below the batching threshold.** A busy frame is
   ~40 NPCs, <100 projectiles, a few dozen FX. Sprite batching starts to pay somewhere in the
   thousands. There is no scene here that a 2D context cannot draw in budget.

3. **Cost was structural, not incremental.** Parity would have meant a second implementation of
   the sprite-orientation chain, TargetCam source resolution, quality policy, HiDPI handling and
   every screen-space overlay — i.e. a permanent second renderer to keep in sync, for a
   workload that does not need one.

4. **The post-processing argument does not require it.** Bloom-lite, vignette and chromatic
   flash can be done with a small offscreen Canvas2D pass; if a real shader stage is ever
   wanted, it should be a compositing step over the 2D canvas, not a rewrite of scene drawing.

## If this is ever reopened

Reopen only on evidence, not on principle: a profile that shows draw-call submission (not
gradient/allocation/GC) dominating a frame at a scene density we actually ship. The right move
then is a GL *compositor* for a Canvas2D-rendered scene texture plus shader post-FX, not a
second scene renderer.

## Original ticket

Kept in git history: see the pre-2026-09 revision of this file and
`docs/js/systems/WebGLRenderSystem.js` (deleted in the Phase 1 batch W1 commit).
