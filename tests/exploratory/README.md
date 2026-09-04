# Exploratory playthrough scripts (2026-09-03)

Not part of `npm test`. These drive the live game headlessly with real keyboard input and were
used for the September 2026 evolution review (`EVOLUTION_ROADMAP_2026-09.md`).

```bash
python3 -m http.server 8000            # serve the repo root
mkdir -p shots
CHROMIUM_PATH=~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell \
  node tests/exploratory/playthrough.mjs   # every screen, screenshots into ./shots
node tests/exploratory/playthrough2.mjs    # buy weapon via UI, missions, resume-run
node tests/exploratory/bosstest.mjs        # boss kill → unlock → void king → (no) victory screen
node tests/exploratory/firetest.mjs        # projectile hit registration, frame by frame
node tests/exploratory/perftest.mjs        # frame timing at 40/100 NPCs, 2x DPR 1080p
```

Scripts poke `window.stateManager` / `window.systems` to teleport, set health, and force zone
gates; the boss/victory checks are the seed of the Phase 0 run-to-victory test.
