Planet Sprites — Sample Manifest + Overrides

Quick start
- Manifest path: `docs/assets/planets.json` (referenced by `GameConstants.UI.PLANETS.SPRITES.MANIFEST_URL`).
- Each entry can be a string name or an object with `{ name, src }`.
- Default convention: name → slug → `assets/planets/<slug>.png` (lowercase, spaces → underscores).

Sample manifest (updated)
- `docs/assets/planets.json` (current mappings):
  - Terra Nova → `./assets/planets/terra_nova.png`
  - Crimson Moon → `./assets/planets/crimson_moon.png`
  - Ice World → `./assets/planets/planet_neptuneish_unused.png`
  - Mining Station → `./assets/planets/station_3.png`

Enable sprites (QA)
- Default remains procedural. To force sprites in runtime:
  - In console: `window.USE_PLANET_SPRITES = true;`
  - Reload or toggle the mode; `PlanetSpriteRenderer` will draw sprites when images are ready.
- Individual QA toggles (static sprites only; OFF by default):
  - Terra Nova: `localStorage.setItem('gt.useTerraSprite','true')` or `?use_terra_sprite=1`
  - Crimson Moon: `localStorage.setItem('gt.useCrimsonSprite','true')` or `?use_crimson_sprite=1`
  - Ice World: `localStorage.setItem('gt.useIceSprite','true')` or `?use_ice_sprite=1`
  - Mining Station: `localStorage.setItem('gt.useMiningSprite','true')` or `?use_mining_sprite=1`
  - Runtime flag variants: `window.USE_*_SPRITE = true` can be set for temporary sessions (Terra/Crimson/Ice/Mining).

Per-planet override (variant swap)
- At runtime, set: `window.PLANET_SPRITE_OVERRIDES = { terra_nova: 'terra_nova_1' }`.
- The renderer will then load `assets/planets/terra_nova_1.png` for Terra Nova.
- No restart required; lazy loader uses the override slug immediately.

URL parameter overrides (QA convenience)
- Enable sprites: append `?use_planet_sprites=1` to the URL (default stays procedural).
- Per-planet swap in URL: `?planet.terra_nova=terra_nova_alt` (builds slug; `.png` is optional).
  - Example: `http://localhost:8000/docs/?use_planet_sprites=1&planet.terra_nova=terra_nova_alt`

Authoring guidance
- 1024–2048 px square PNGs, centered object, transparent background.
- Names: match `gameData.planets[].name`, slugged to lowercase/underscored.
- Ice/cloud edges benefit from slight feathering; keep rim shading subtle.

Notes
- Missing images gracefully fall back to procedural discs.
- `AssetSystem.loadPlanetSpritesManifest()` is optional and won’t throw if the file is missing.

Animated planet sprites (QA stubs)
- Enable per-planet animation via toggles (OFF by default):
  - Terra Nova: `localStorage.setItem('gt.useTerraAnim','true'); location.reload()` or `?use_terra_anim=1`
  - Crimson Moon: `localStorage.setItem('gt.useCrimsonAnim','true'); location.reload()` or `?use_crimson_anim=1`
- Manifest format (JSON), relative to `docs/`:
  - `assets/planets/terra_nova_anim.json` (and `crimson_moon_anim.json`)
  - Example:
    `{ "fps": 12, "frames": ["./assets/planets/terra_nova_000.png", "./assets/planets/terra_nova_001.png", "./assets/planets/terra_nova_002.png"] }`
- Behavior:
  - Frames load sequentially at idle, are pre‑scaled to the planet draw size once, and then blitted per frame.
  - While loading, procedural or static sprite (if enabled) continues to draw; swap is seamless when ready.
  - Optional badge: `window.SHOW_PLANET_SPRITE_BADGE = true` draws a tiny `SP` above the planet when sprite is active.
- Safety:
  - Missing manifests or frames fail silently; renderers fall back to procedural/static sprites.
