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
  if (isTiny) return 2;
  if (quality === 'low') return 3;
  return 8; // medium/high
}

