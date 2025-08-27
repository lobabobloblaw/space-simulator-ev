Planet Sprites — Sample Manifest + Overrides

Quick start
- Manifest path: `docs/assets/planets.json` (referenced by `GameConstants.UI.PLANETS.SPRITES.MANIFEST_URL`).
- Each entry can be a string name or an object with `{ name, src }`.
- Default convention: name → slug → `assets/planets/<slug>.png` (lowercase, spaces → underscores).

Sample manifest (added)
- `docs/assets/planets.json`:
  - Terra Nova → `./assets/planets/terra_nova.png`
  - Crimson Moon → `./assets/planets/crimson_moon.png`
  - Ice World → `./assets/planets/ice_world.png`
  - Mining Station → `./assets/planets/mining_station.png`

Enable sprites (QA)
- Default remains procedural. To force sprites in runtime:
  - In console: `window.USE_PLANET_SPRITES = true;`
  - Reload or toggle the mode; `PlanetSpriteRenderer` will draw sprites when images are ready.

Per-planet override (variant swap)
- At runtime, set: `window.PLANET_SPRITE_OVERRIDES = { terra_nova: 'terra_nova_1' }`.
- The renderer will then load `assets/planets/terra_nova_1.png` for Terra Nova.
- No restart required; lazy loader uses the override slug immediately.

Authoring guidance
- 1024–2048 px square PNGs, centered object, transparent background.
- Names: match `gameData.planets[].name`, slugged to lowercase/underscored.
- Ice/cloud edges benefit from slight feathering; keep rim shading subtle.

Notes
- Missing images gracefully fall back to procedural discs.
- `AssetSystem.loadPlanetSpritesManifest()` is optional and won’t throw if the file is missing.

