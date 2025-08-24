// Minimal sprite resolver for the target viewport (or similar small overlays)
// Returns a ready-to-draw source (Image/Canvas) and dimensions with a reason tag.

export function resolveViewportSprite(state, spriteId, aliasId, caches) {
  try {
    const assets = state?.assets || {};
    const pre = caches?.preloaded && caches.preloaded[spriteId];
    if (pre && pre.naturalWidth > 0 && pre.naturalHeight > 0) {
      return { src: pre, sw: pre.naturalWidth, sh: pre.naturalHeight, reason: 'direct-preloaded' };
    }
    const sprite = assets.sprites && assets.sprites[spriteId];
    if (sprite && sprite.image && (sprite.image.naturalWidth > 0 && sprite.image.naturalHeight > 0)) {
      const sw = sprite.w || sprite.image.naturalWidth || sprite.image.width;
      const sh = sprite.h || sprite.image.naturalHeight || sprite.image.height;
      return { src: sprite.image, sw, sh, reason: 'standalone-drawn' };
    }
    if (typeof caches?.getDirect === 'function') {
      const direct = caches.getDirect(spriteId);
      if (direct && direct.naturalWidth > 0 && direct.naturalHeight > 0) {
        return { src: direct, sw: direct.naturalWidth || direct.width, sh: direct.naturalHeight || direct.height, reason: 'direct-drawn' };
      }
    }
    const frameCache = caches?.frameCache || {};
    const cf = frameCache[aliasId] || frameCache[spriteId];
    if (cf && cf.width > 0 && cf.height > 0) {
      return { src: cf, sw: cf.width, sh: cf.height, reason: 'atlas-drawn' };
    }
    const baseline = caches?.baselineFrames || {};
    const bf = baseline[aliasId] || baseline['ships/trader_0'] || baseline[spriteId];
    if (bf && bf.img && bf.w > 0 && bf.h > 0) {
      return { src: bf.img, sw: bf.w, sh: bf.h, reason: 'vpa-drawn' };
    }
  } catch (_) {}
  return null;
}

