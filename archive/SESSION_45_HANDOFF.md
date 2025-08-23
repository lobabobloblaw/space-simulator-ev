Session 45 Handoff — Galaxy Trader
---------------------------------

Live build: https://lobabobloblaw.github.io/space-simulator-ev/
Local: python3 -m http.server 8000 then open http://localhost:8000/docs/

What changed
- Trader rep price modifiers (+/− up to ~5%), shown in Trade UI
- Patrol rep up and Pirate rep down on pirate kills; patrol hails and pirate taunts
- Outfitter UI mirrors Trade (header + fixed credits, scrollable list)
- Combat: increased/dynamic spread (recoil bloom); longer projectile lifetimes; removed 60‑frame expiry in PhysicsSystem; NPC arrive/strafe/damping; flee jitter; range‑based aim error; tiny cooldown nudges
- DebugSystem: TAB overlay (FPS, counts, ship/weapon, rep); toggles 1–5; buttons (+9999cr, Grant Rapid/Plasma/Mining, Next Weapon); god mode; teleport; spawn; force landing; spread multiplier; debounced clicks
- Fixes: Shop weapon stats now from item.value (prevents one‑shot F); Q weapon switch centralized (no double‑advance)

Verify
- Trade/Outfitter headers and behavior
- Firing with Rapid shows bloom; [ and ] adjust spread; projectiles travel farther (plasma farthest)
- NPCs avoid tight orbits; strafing near 120–250
- TAB overlay buttons respond on first click; Next Weapon cycles; damage numbers visible

Next session focus
- Lower UI polish: tighten HUD bottom band, clarify credits/weapon/kills, separators
- Ship Radio: add progress/scan bar and channel labels; baseline alignment
- Optional: compact minimap frame + faction decals on dots

