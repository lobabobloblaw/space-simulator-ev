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
