// Centralized quality-related decisions for rendering
export function shouldUseFlipbook(quality) {
  return quality !== 'low';
}

export function ringCountFor(quality, isTiny) {
  if (isTiny) return 1;
  if (quality === 'low') return 1;
  if (quality === 'medium') return 2;
  return 3; // high
}

export function sparkCountFor(quality, isTiny) {
  // Higher density for a fuller debris feel
  if (isTiny) return 5;
  if (quality === 'low') return 8;
  if (quality === 'medium') return 16;
  return 24; // high
}
