# INTERNAL — UI Notifications

Notifications are surfaced via the `UI_MESSAGE` event and are rendered by `UISystem`.

## Behavior

- Console line (default): Messages mirror into the tiny readout at `#tutorialHint` (bottom‑left). This area fades in/out and is used instead of the old “WEAPONS OFFLINE/ONLINE” banners, which are now suppressed.
- Toasts (disabled by default): The floating top notifications are disabled to reduce noise. Re‑enable temporarily via `window.UI_TOASTS = true` for QA.
- Queue (when toasts enabled): Messages are queued and displayed sequentially to avoid stacking overlaps ("rolodex" feel).
- Timing: Each message displays for its specified duration (default ~2000ms) and then fades out before the next shows (small inter‑message gap ~120ms).
- Types: `info`, `success`, `error` (styled via border‑left accent).

## Usage

- Emit via EventBus:
  - `eventBus.emit(GameEvents.UI_MESSAGE, { message: '...', type: 'info'|'success'|'error', duration: 2000 });`
- Direct `showNotification` still exists but enqueue is preferred; emit the event in new code to benefit from sequencing.

## Styling

- Console line: `#tutorialHint.visible` uses an opacity transition for smooth fade.
- Toasts: `.game-notification` slides/fades in via `@keyframes notificationSlide` and fades out via `.fade-out`.

## Guidance

- Keep console messages concise; prefer one‑liners like “ORE +1” or “CARGO FULL — §+10”.
- For repeated system status (e.g., auto saves), keep toasts OFF and use console line sparingly.

## Toggles (QA)

- `window.UI_TOASTS = true` — re‑enable floating toasts (default OFF).
