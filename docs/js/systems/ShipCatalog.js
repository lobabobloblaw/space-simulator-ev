// ShipCatalog — central mapping of ship types to classes, nominal sizes, and default sprite scales
// This is scaffolding to standardize references without changing feel.
import { GameConstants } from '../utils/Constants.js';

const TYPE_TO_CLASS = (GameConstants?.SHIP?.CLASSES?.TYPE_CLASS) || {
  freighter: 'XL', trader: 'M', patrol: 'L', pirate: 'S', interceptor: 'L'
};

const CLASS_SIZES = (GameConstants?.SHIP?.CLASSES?.SIZES) || {
  XS: 8, S: 10, M: 12, L: 14, XL: 18
};

const TYPE_SPRITE_SCALE = (GameConstants?.SHIP?.TYPE_SPRITE_SCALE) || {
  freighter: 1.6, trader: 1.5, patrol: 1.4, pirate: 1.35, interceptor: 1.4
};

function nominalSizeForType(type) {
  const cls = TYPE_TO_CLASS[type] || 'M';
  return CLASS_SIZES[cls] || 12;
}

export const ShipCatalog = {
  get(type) {
    const cls = TYPE_TO_CLASS[type] || 'M';
    return {
      type,
      class: cls,
      nominalSize: nominalSizeForType(type),
      spriteScale: TYPE_SPRITE_SCALE[type] || 1.4
    };
  }
};

export default ShipCatalog;

