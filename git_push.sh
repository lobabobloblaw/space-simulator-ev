#!/bin/bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev

echo "=== Adding all changes ==="
git add .

echo ""
echo "=== Git Status ==="
git status

echo ""
echo "=== Committing ==="
git commit -m "Fix NPC fleeing behavior and asteroid rendering (Session 13)

- NPCs now turn to face escape direction before thrusting
- Added 2.5x turn speed multiplier when fleeing  
- Implemented partial thrust (50%) when partially aligned
- Removed zigzag evasion pattern for realistic movement
- Fixed asteroid rendering to show irregular rocky chunks
- Each asteroid has unique randomized shape points
- Asteroid fragments also get irregular shapes when split
- Added SESSION_13_HANDOFF.md documentation"

echo ""
echo "=== Pushing to GitHub ==="
git push

echo ""
echo "=== Final Status ==="
git status
echo "Push complete! Changes should be live on GitHub Pages in ~1 minute."
