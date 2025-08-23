# Asteroid Collision Effects Restored

## Changes Made

### 1. Enhanced Damage Calculation (`allSystems.js`)
- **Increased damage multiplier**: From `2x` to `3x` for more impactful collisions
- **Minimum damage threshold**: At least 5 damage even for slow collisions
- **Shield penetration**: Damage that exceeds shields now affects hull
- **Speed-based damage**: Damage scales with relative velocity between ship and asteroid

### 2. Visual Effects
- **Screen shake**: Intensity scales with damage amount
  - Stored in `ship.screenShake` with decay factor
  - Applied to camera transform in render loop
- **Damage flash**: Red overlay that fades over time
  - Stored in `ship.damageFlash`
  - Renders as semi-transparent red overlay
- **Multiple explosions**: Creates main impact explosion plus sparks
  - Number of sparks scales with damage amount
  - Different explosion sizes based on damage severity

### 3. Audio Feedback
- **Shield hits**: Play shield sound effect when shields absorb damage
- **Hull impacts**: Play explosion sound when hull takes damage
  - Small explosion sound for minor damage (<20)
  - Large explosion sound for major damage (≥20)

### 4. UI Notifications
- **Damage warnings**: Shows warning message for heavy damage (>30)
  - Displays damage amount
  - Uses shake animation for emphasis
  - Auto-dismisses after 2 seconds

### 5. Physics Improvements
- **Variable bounce force**: Bounce strength scales with impact speed
- **Realistic momentum transfer**: Both objects affected by collision
  - Ship bounces away from asteroid
  - Asteroid velocity also affected (at 50% of ship's bounce)

## How It Works

When the ship collides with an asteroid:

1. **Collision Detection**: System detects when ship and asteroid boundaries overlap
2. **Damage Calculation**: 
   - Base damage = relative_speed × asteroid_radius × 3
   - Minimum damage = 5
3. **Damage Application**:
   - First depletes shields
   - Remaining damage affects hull
4. **Visual Feedback**:
   - Screen shakes proportionally to damage
   - Red flash overlay appears
   - Explosions spawn at impact point
5. **Audio Feedback**:
   - Appropriate sound plays (shield hit or explosion)
6. **Physics Response**:
   - Both objects bounce apart
   - Force proportional to impact speed
7. **UI Alert** (for major damage):
   - Warning notification with damage amount

## Testing

To test the collision system:

1. Start the game
2. Fly toward an asteroid at various speeds
3. Observe:
   - Health/shield reduction
   - Screen shake effect
   - Red damage flash
   - Explosion particles
   - Bounce physics
   - Audio feedback
   - Damage notifications (for hits >30 damage)

## Files Modified

- `/docs/js/systems/allSystems.js` - Enhanced collision damage and effects
- `/docs/js/main.js` - Added screen shake and damage flash rendering
- `/docs/css/main.css` - Added shake animation for notifications

## Future Enhancements

Potential improvements:
- Different damage types for different asteroid materials
- Collision damage to NPCs
- Ship damage states (visual hull damage)
- Emergency warnings at low health
- Collision avoidance indicators
