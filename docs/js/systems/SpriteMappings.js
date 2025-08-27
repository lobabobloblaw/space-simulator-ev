// Centralized mapping for sprite ids, aliases, and orientation tweaks

// Primary type -> sprite id mapping
export const typeToSpriteId = {
  pirate: 'ships/pirate_0',
  trader: 'ships/trader_0',
  patrol: 'ships/patrol_1',
  freighter: 'ships/freighter_0',
  interceptor: 'ships/interceptor_0',
  shuttle: 'ships/shuttle_0',
  scavenger: 'ships/trader_0'
};

// Alias mapping for placeholder/atlas coverage before dedicated art
export const aliasSpriteForType = {
  pirate: 'ships/raider_0',
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
