// Central helpers for sprite/atlas readiness to reduce scattered checks

export function isImageReady(img) {
  try { return !!(img && (img.naturalWidth > 0 && img.naturalHeight > 0)); } catch(_) { return false; }
}

export function getStandaloneSpriteIfReady(state, spriteId) {
  try {
    const entry = state?.assets?.sprites?.[spriteId];
    if (entry?.image && isImageReady(entry.image)) return entry.image;
    return null;
  } catch(_) { return null; }
}

export function getAtlasFrameIfReady(state, frameId, atlasName = 'placeholder') {
  try {
    const atlas = state?.assets?.atlases?.[atlasName];
    if (!atlas) return null;
    const src = atlas.canvas || (atlas.image && atlas.image.naturalWidth > 0 ? atlas.image : null);
    const fr = atlas.frames?.[frameId];
    if (!fr || !src) return null;
    return { src, fr };
  } catch(_) { return null; }
}

