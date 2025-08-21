Session 46 Handoff — UI polish, Radio redesign, Audio defaults

Scope
- Tightened HUD spacing to keep elements visible on smaller windows.
- Reworked center logo and key stats presentation to reduce elongation.
- Major Radio UI iterations: compact/vertical, then compact rectangular with scan bar, and a new radial “frequency module”.
- Audio: SFX muted by default; music (“frequencies”) decoupled and louder by default.

Architecture Guardrails
- Pure EventBus architecture maintained. No new global variables.
- State changes routed via StateManager; UI uses UISystem and EventBus events only.
- All module paths use the existing relative import scheme.

Key Changes by File

docs/index.html
- HUD center: Two-line logo (GALAXY / TRADER). Removed the old “/// SYSTEM ONLINE” subtitle.
- Key stats (credits/weapon/kills) moved under the logo; now a compact inline subline.
- Radio markup:
  - Removed volume slider (replaced with a scanner readout concept).
  - Rectangular radio kept (readout + scan bar + buttons), then extended to a radial variant.
  - Current default has `class="radio-radial"` and includes an extra `#radioDial` element.

docs/css/main.css
- HUD spacing tightened:
  - `.hud-container` gap/padding reduced; additional reductions at ≤1280px.
  - Controls shrink fonts at ≤1024px; minimap scales as before.
  - Left panel narrows earlier on small widths to avoid wrap.
- Center logo:
  - Two-line wordmark; centered.
  - Key stats under the logo: compact line, labels hidden, dot separators; credits prefixed with §.
  - Reduced subline font size and spacing.
- Radio UI:
  - Rectangular backup: readout (dot-matrix), thin animated scan bar, buttons in a single row.
  - Radial mode (current): round dial (#radioDial) with subtle tick marks and a sweeping arc; digital readout centered; buttons positioned around the dial.
  - Radial container made transparent to avoid a boxy look; dial/readout layered (z-index) to keep text visible.

docs/js/systems/UISystem.js
- Radio behavior:
  - Removed volume control wiring.
  - Added scanning animation (interval + timeout) to roll fake frequencies during SCANNING…; locks to a tuned readout.
  - Applies/removes `scanning`/`tuned` classes on `#shipRadio` to control radial sweep animation.
- HUD defaults for context:
  - Shield: OFFLINE when 0 (was “None”).
  - Weapon: UNARMED when none (was “NONE”).
  - Kills: NO KILLS until first kill (was “0”).

docs/js/systems/AudioSystem.js
- SFX master (`this.enabled`) defaults to false — SFX muted by default.
- Music decoupled from SFX master:
  - `playMusic()` ignores SFX enabled state; only needs AudioContext.
  - Sequencer loop checks `this.music.enabled` only.
  - Toggling SFX no longer pauses music; affects SFX only.
- Music loudness:
  - Added `musicMaster = 0.9` and increased default music volume to 0.6.
  - Raised pad/lead gains to make music audibly present vs SFX.

docs/js/main_eventbus_pure.js
- Default audio state:
  - `enabled: false` (SFX muted at start), `musicVolume: 0.6`.

How to Toggle Radio Variants
- Radial (current): `#shipRadio` element has `class="radio-radial"`.
- Rectangular backup: Remove that class (or replace with `radio-rect` if you prefer a semantic flag) to fall back to the grid layout with scan bar.

Testing Hints
- Radio
  - Prev/Next triggers a short SCANNING… animation and then locks to a tuned fake frequency.
  - Play toggles ambient “frequencies” regardless of SFX mute.
- Audio
  - SFX start muted (label shows UNMUTE). Toggle with M.
  - Music volume defaults to 0.6 and uses a separate master (`musicMaster`).

Potential Next Steps
- Radio
  - Toggle scan sweep only while scanning; dim/stop during playback (partial: classes are wired; visuals can be tuned further).
  - Optional: small signal meter (3‑5 bars) inside the dial; increase on tuned.
- HUD
  - Slightly expand radio width to 128–132px if “SCANNING…” ellipsizes; or shorten readout strings.
  - Consider optional HUD height var re‑adoption if you want flexible HUD heights across breakpoints.
- Audio
  - Expose a music volume control (slider or +/- cycles) in the radio UI without adding clutter.

EventBus Contracts Touched
- Emits: `audio.music.toggle`, `audio.music.prev`, `audio.music.next`, `audio.music.state`, `audio.music.volume`.
- UI listens for: `AUDIO_MUSIC_STATE` and updates the readout + radio classes.

Notes for Future Agents
- Keep everything through EventBus/StateManager; avoid direct cross‑system calls.
- The radio UI is purely DOM/CSS and UI logic; audio generation remains in AudioSystem (Web Audio API).
- The minimap is still square for consistency; expanding it can be done without touching systems.

End of Session 46.

