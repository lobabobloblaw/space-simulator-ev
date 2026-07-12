// Centralized mapping for sprite ids, aliases, and orientation tweaks

// Primary type -> sprite id mapping
export const typeToSpriteId = {
  pirate: 'ships/pirate_0',
  elite_pirate: 'ships/pirate_0',
  void_hunter: 'ships/pirate_0',
  trader: 'ships/trader_1',
  patrol: 'ships/patrol_1',
  freighter: 'ships/freighter_1',
  interceptor: 'ships/interceptor_0',
  shuttle: 'ships/shuttle_0',
  scavenger: 'ships/trader_0'
};

// Alias mapping for placeholder/atlas coverage before dedicated art
export const aliasSpriteForType = {
  pirate: 'ships/raider_0',
  elite_pirate: 'ships/raider_0',
  void_hunter: 'ships/raider_0',
  interceptor: 'ships/raider_0',
  patrol: 'ships/trader_0',
  freighter: 'ships/trader_0',
  trader: 'ships/trader_0',
  shuttle: 'ships/trader_0',
  scavenger: 'ships/trader_0'
};

// Base rotation offset for sprites (align art that faces up to nose-right)
export const spriteRotationOffset = Math.PI / 2; // +90° clockwise for sprites

// Fine-tuned per-sprite orientation nudges (radians)
// Add entries like 'ships/freighter_0': 0.04 as needed
export const spriteOrientationOverrides = {
  // Fine-tuning only; keep empty unless a small per-art nudge is required
};

// Per-sprite thruster anchor positions (normalized to ship.size)
// Each anchor: { x: number, y: number } where final offsets are (x*ship.size, y*ship.size)
// Default path uses a single center plume at { x: -1, y: 0 } when no entry provided.
export const spriteThrusterAnchors = {
  // Freighter with twin nacelles — widened vertical spacing to better match art
  // About ~2x previous spacing
  'ships/freighter_1': [ { x: -1.0, y: -1.16 }, { x: -1.0, y: 1.16 } ],
  // Backward compatible if older freighter art is used
  'ships/freighter_0': [ { x: -1.0, y: -0.50 }, { x: -1.0, y: 0.50 } ]
};
