# INTERNAL — Events and State
# For development and AI sessions only (not published)

This document outlines commonly used events and the shape of key state objects.

## Key Event Categories

- Input
  - `INPUT_KEY_DOWN/UP`, `INPUT_FIRE`, `INPUT_LAND`, `INPUT_SWITCH_WEAPON`, target cycle/clear.

- Gameplay
  - `SHIP_DAMAGE`, `SHIP_DEATH`, `SHIP_RESPAWN`, `NPC_DEATH`, `EXPLOSION`.
  - `TARGET_SET`, `TARGET_CLEAR` (Targeting).
  - `UI_MESSAGE`, `UI_UPDATE`, `MENU_OPEN/CLOSE`.

- Render
  - `render.useSprites { enabled }`
  - `render.spriteCulling { enabled }`
  - `render.useEffectsSprites { enabled }`
  - `render.quality { quality: 'low'|'medium'|'high' }`
  - `assets.ready { atlases: string[] }` (from AssetSystem)

## State Shape (selected fields)

- `state.ship`
  - Position/velocity: `x, y, vx, vy, angle`
  - Stats: `size, health, maxHealth, shield, maxShield, thrust, maxSpeed`
  - Flags: `isDestroyed, isLanded, landingCooldown`
  - Inventory/credits: `weapons[], currentWeapon, credits`

- `state.npcShips[]`
  - `id, x, y, vx, vy, angle, size, type, faction, behavior, health, maxHealth, weaponCooldown, thrusting, state`
  - Rendering hints: `spriteId?`, color, message/messageTime

- `state.renderSettings`
  - `useSprites: boolean`
  - `spriteCulling: boolean`
  - `useEffectsSprites: boolean`
  - `starDensity: number`

- `state.assets`
  - `ready: boolean`
  - `atlases: { placeholder, effects }`
  - `sprites: { [id]: { image, w, h } }`
  - `effects.explosionFlipbook? { fps, frames[] }`

- `state.targeting`
  - `selectedId: number | null`

- Other: `asteroids[]`, `planets[]`, `projectiles[]`, `explosions[]`, `warpEffects[]`, `pickups[]`, `debug{}`
