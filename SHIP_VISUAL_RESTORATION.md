# Ship Visual Comparison - What Needs Restoration

## Current Problem (All Ships Same Shape):
```
All ships currently:
     ▲
    ███
   ██ ██
  ██   ██
 ██     ██
(Just different colors/sizes)
```

## Original Game Ship Designs (Need Restoration):

### Player Shuttle (Current: ✅ Acceptable)
```
    ▲
   ███
  ██ ██
```

### Freighter (Should be HUGE rectangular):
```
Current:          Original Should Be:
    ▲             ████████████████
   ███            ██ □ □ □ □ □ ██  <- Cargo pods
  ██ ██           ██ □ □ □ □ □ ██
                  ████████████████
                  ██            ██  <- Engines
```

### Pirate Fighter (Should be angular/aggressive):
```
Current:          Original Should Be:
    ▲                  ▲▲▲
   ███                ██ ██
  ██ ██              ███████
                    ██  █  ██  <- Weapon pods
```

### Patrol Ship (Should be military with wings):
```
Current:          Original Should Be:
    ▲             ═══█████═══
   ███            ███████████  <- Wide wings
  ██ ██           ███████████
                   ████ ████   <- Twin engines
```

### Trader (Should be rounded/bulbous):
```
Current:          Original Should Be:
    ▲               ███████
   ███             █████████
  ██ ██           ███████████
                  ████   ████
```

## Size Comparison (Current vs Should Be):

```
Current (all similar):
Fighter: ▲    Trader: ▲    Freighter: ▲
        ███          ███             ███
       ██ ██        ██ ██           ██ ██

Should Be (varied sizes):
Fighter: ▲     Trader:  ████      Freighter: ██████████████
        ███            ██████                 ████████████████
                      ████████                ██████████████████
                                              ████████████████
```

## Code Location to Fix:

File: `js/main.js`
Function: `render()`
Lines: ~450-550 (NPC rendering) and ~550-630 (player rendering)

Current code draws all ships the same:
```javascript
// All ships use this same shape:
ctx.moveTo(npc.size, 0);
ctx.lineTo(-npc.size * 0.7, -npc.size * 0.6);
ctx.lineTo(-npc.size * 0.4, -npc.size * 0.3);
ctx.lineTo(-npc.size * 0.6, 0);
ctx.lineTo(-npc.size * 0.4, npc.size * 0.3);
ctx.lineTo(-npc.size * 0.7, npc.size * 0.6);
```

Need to add conditional rendering based on ship type!