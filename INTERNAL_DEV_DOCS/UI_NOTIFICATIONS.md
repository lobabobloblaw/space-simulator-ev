# INTERNAL — UI Notifications

Notifications are surfaced via the `UI_MESSAGE` event and are rendered by `UISystem`.

## Behavior

- Console line: Every message mirrors into the tiny readout at `#tutorialHint` (bottom‑left). This area fades in/out and is used instead of the old “WEAPONS OFFLINE/ONLINE” banners, which are now suppressed. When the readout expires it restores the standing tutorial hint instead of leaving the line blank.
- Toasts (by severity): `warning`, `success` and `error` also get a floating coloured toast; `info` stays on the console line only. Force all on/off with `window.UI_TOASTS = true|false`.
- Stacking: up to 3 toasts are visible at once, each persisting for its own `duration`; further messages queue for the next free slot. Slot offsets are applied inline because the `:nth-of-type` rules in `main.css` count every `<div>` in `<body>`.
- Timing: Each toast displays for its specified duration (default ~2000ms) then fades out and frees its slot. The tiny console readout duration is governed by `GameConstants.UI.CONSOLE_MESSAGE_MS` (default ~1200ms) and is used for concise player feedback like pickups.
- Types: `info`, `success`, `error` (border‑left accent in `main.css`) and `warning` (accent applied inline; `main.css` has no `.warning` rule).

## Usage

- Emit via EventBus:
  - `eventBus.emit(GameEvents.UI_MESSAGE, { message: '...', type: 'info'|'success'|'error', duration: 2000 });`
- Direct `showNotification` still exists but enqueue is preferred; emit the event in new code to benefit from sequencing.

## Styling

- Console line: `#tutorialHint.visible` uses an opacity transition for smooth fade.
- Toasts: `.game-notification` slides/fades in via `@keyframes notificationSlide` and fades out via `.fade-out`.

## Guidance

- Keep console messages concise; prefer one‑liners like “ORE +1” or “CARGO FULL — §+10”.
- For repeated system status (e.g., auto saves), use `type: 'info'` so it stays on the console line.

## Toggles (QA)

- `window.UI_TOASTS = true|false` — force floating toasts on for every type, or off entirely. Default: severity‑based (see Behavior).

---

## Zone / boss banner (W2.4)

A third feedback channel, above toasts and the console line: `#zoneBanner`
(`index.html`), styled in `main.css`, driven by `UISystem`.

- **What uses it**: `zone.change` → zone name + difficulty stars
  (`FRONTIER SPACE` / `★★`); `zone.boss.spawn` → boss name + title
  (`CAPTAIN BLACKSTAR` / `PIRATE LORD`, red `boss` variant). Death and victory
  keep their full-screen overlays and do **not** use the banner.
- **Behaviour**: one banner at a time, centred at 20% viewport height, 2.5 s,
  never queued — a newer event replaces the current one (`UISystem.showBanner`).
  It sits below the boss health bar (canvas, y≈20) and below toasts.
- **API**: `uiSystem.showBanner(title, subtitle, ms, variant)` —
  `variant: 'boss'` switches the palette to danger red.

## ARIA announcements (U7)

`UISystem.announce(text)` writes `#gameAnnouncements` (`aria-live="assertive"`).
Written on zone change, boss spawn, run end, victory, and unlocks
(`announceUnlocks`, from the `unlocks` array on `run.end` / `run.victory`).
A trailing NBSP is toggled so an identical message still registers as a change.

## Contract tracker (W2.5)

`#contractTracker` (top-right, hidden when empty) lists `ship.missions.active`
with one-line progress: `Bounty 2/3 pirates`, `Deliver 5 Food → Crimson Moon`,
`Escort Freighter → Ice World`, `Trade 750/1000 credits`. Rebuilt on
`MISSION_ACCEPT` / `MISSION_UPDATED` / `MISSION_COMPLETE` (forced) and on the
throttled `UI_UPDATE` (≥500 ms apart, and only when the rendered text changed).
It is deliberately clear of the zone panel (top-left) and the boss health bar
(top-centre).

## HUD value flashes (W2.3)

`UISystem.updateHUD` diffs credits, cargo count and hull % against the last
rendered numbers and adds `.value-up` (green) or `.value-down` (red) to the
`.status-value` element for 350 ms. Flashes are debounced to one per element
per 300 ms so the ~8 Hz `UI_UPDATE` cannot strobe a value that ticks every
frame. Keyframes: `valueFlashUp` / `valueFlashDown` in `main.css`.

## Damage numbers (W2.2)

Not DOM: `HUDRenderer.drawDamageNumbers` draws `state.fx.damageNumbers`
(filled by `GameFeelSystem`) in screen space — 11 px monospace, outlined,
700 ms life with an upward drift, white for hits, yellow for crits/kills, red
for damage to the player. Capped at 24 live entries.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` in `main.css` disables the CRT/scan
sweeps, pulses, the `shake` keyframes and the value-flash animations. Hit-stop
and the damage-number fade stay: they carry information, not decoration.
