#!/bin/bash
# GitHub Pages 404 Troubleshooter

echo "🔧 GitHub Pages 404 Troubleshooter"
echo "==================================="
echo ""

# Check local repo status
echo "1️⃣ LOCAL REPOSITORY CHECK:"
echo "----------------------------"
echo "Current branch:"
git branch --show-current

echo ""
echo "Remote repository:"
git remote -v | head -1

echo ""
echo "docs/ folder contents:"
ls -la docs/ 2>/dev/null | head -3
if [ -f "docs/index.html" ]; then
    echo "✅ docs/index.html exists"
else
    echo "❌ docs/index.html NOT FOUND"
fi

echo ""
echo "2️⃣ GITHUB PAGES SETTINGS TO CHECK:"
echo "-----------------------------------"
echo "Go to: https://github.com/lobabobloblaw/space-simulator-ev/settings/pages"
echo ""
echo "Make sure these are selected:"
echo "✓ Source: Deploy from a branch"
echo "✓ Branch: main"
echo "✓ Folder: /docs"
echo "✓ Click Save"
echo ""

echo "3️⃣ POSSIBLE ISSUES:"
echo "-------------------"

# Check if on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo "⚠️ You're on branch '$BRANCH', not 'main'"
    echo "   Fix: git checkout main"
else
    echo "✅ On main branch"
fi

# Check if docs exists
if [ -d "docs" ]; then
    echo "✅ docs/ folder exists"
else
    echo "❌ docs/ folder missing!"
fi

# Check if pushed
echo ""
echo "4️⃣ CHECKING PUSH STATUS:"
git status --short
if [ $? -eq 0 ]; then
    UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)
    if [ "$UNPUSHED" -gt 0 ]; then
        echo "⚠️ You have $UNPUSHED unpushed commits"
        echo "   Fix: git push"
    else
        echo "✅ All changes pushed"
    fi
fi

echo ""
echo "5️⃣ QUICK FIX COMMANDS:"
echo "----------------------"
echo "# Make sure you're on main and pushed:"
echo "git checkout main"
echo "git push origin main"
echo ""
echo "# Force GitHub Pages rebuild:"
echo "git commit --allow-empty -m 'Trigger GitHub Pages rebuild'"
echo "git push"
echo ""
echo "6️⃣ CHECK GITHUB PAGES STATUS:"
echo "------------------------------"
echo "https://github.com/lobabobloblaw/space-simulator-ev/settings/pages"
echo ""
echo "Look for:"
echo "• Green checkmark ✅"
echo "• 'Your site is published at...'"
echo "• If you see 'Source: None' - SELECT main branch + /docs folder!"
