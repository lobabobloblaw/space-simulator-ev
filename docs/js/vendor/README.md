Local vendor for tracker playback
=================================

Place the following files here to enable offline/local tracker playback via Chiptune2 (libopenmpt):

- chiptune2.js
- chiptune2.wasm

You can obtain these from the official distribution (same version used by the CDN reference):
https://cdn.jsdelivr.net/npm/chiptune2@2.4.1/dist/

When present, the game will load `./js/vendor/chiptune2.js` at runtime (no network required).
If absent, it will fall back to the CDN URL.

