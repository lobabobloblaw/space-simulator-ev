#!/bin/bash
# GitHub Push Script for Galaxy Trader
set -euo pipefail

echo "🚀 Galaxy Trader - GitHub Deployment Script"
echo "==========================================="
echo ""

# Pre-step: stamp version from git tag/SHA + date for on-screen overlay
if [ -x "scripts/stamp_version.sh" ]; then
  echo "🧩 Stamping version…"
  STAMP_OUTPUT=$(bash scripts/stamp_version.sh || true)
  echo "$STAMP_OUTPUT"
  STAMP_VER=$(echo "$STAMP_OUTPUT" | sed -n "s/^Stamped VERSION to: \(.*\)$/\1/p")
  # Stage potential changes (idempotent if none)
  git add docs/js/utils/Constants.js || true
  if ! git diff --cached --quiet; then
    msg="chore: stamp version ${STAMP_VER:-update version}"
    echo "✍️  Committing version change: $msg"
    git commit -m "$msg"
  else
    echo "ℹ️  No version changes to commit."
  fi
else
  echo "⚠️  scripts/stamp_version.sh not executable or missing; skipping version stamp"
fi

# Check if remote exists
if git remote | grep -q 'origin'; then
    echo "✅ Remote 'origin' already configured"
    git remote -v
else
    echo "📝 Enter your GitHub username:"
    read GITHUB_USERNAME
    
    echo ""
    echo "Adding remote repository..."
    git remote add origin https://github.com/$GITHUB_USERNAME/space-simulator-ev.git
    echo "✅ Remote added!"
fi

echo ""
echo "🔄 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Code pushed successfully!"
echo ""
echo "📋 Now enable GitHub Pages:"
echo "1. Go to: https://github.com/YOUR_USERNAME/space-simulator-ev/settings/pages"
echo "2. Source: Deploy from branch"
echo "3. Branch: main"
echo "4. Folder: /docs"
echo "5. Click Save"
echo ""
echo "🎮 Your game will be live at:"
echo "   https://YOUR_USERNAME.github.io/space-simulator-ev/"
echo ""
echo "⏰ (Takes 2-10 minutes for first deployment)"
