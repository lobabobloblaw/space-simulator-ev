Local vendor for tracker playback
=================================

Tracker (`.xm`/`.mod`/`.it`/`.s3m`) playback is handled locally via `chiptune-3`
(libopenmpt), vendored in `./chiptune-3/`. See `chiptune-3/LICENSE` and
`chiptune-3/licenses/` for that library's provenance and licensing.

`AudioSystem.js` loads `./js/vendor/chiptune-3/chiptune3.min.js` at runtime
(no network required); there is no CDN fallback.
