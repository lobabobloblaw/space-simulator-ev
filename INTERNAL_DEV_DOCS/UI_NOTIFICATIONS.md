# INTERNAL — UI Notifications

Notifications are surfaced via the `UI_MESSAGE` event and are rendered by `UISystem`.

## Behavior

- Queue: Messages are queued and displayed sequentially to avoid stacking overlaps ("rolodex" feel).
- Timing: Each message displays for its specified duration (default ~2000ms) and then fades out before the next shows (small inter‑message gap ~120ms).
- Types: `info`, `success`, `error` (styled via border‑left accent).

## Usage

- Emit via EventBus:
  - `eventBus.emit(GameEvents.UI_MESSAGE, { message: '...', type: 'info'|'success'|'error', duration: 2000 });`
- Direct `showNotification` still exists but enqueue is preferred; emit the event in new code to benefit from sequencing.

## Styling

- Base class `.game-notification` with slide‑in; fades out via `.fade-out` class.
- Fixed position below tutorial hint; responsive enough for multiple quick messages, but queue prevents overlap.

## Guidance

- Keep messages concise; avoid competing messages in the same second where possible.
- For repeated system status (e.g., auto saves), prefer silent or infrequent messages to reduce noise.

