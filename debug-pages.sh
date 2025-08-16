#!/bin/bash
# GitHub Pages Debug Helper

echo "🔍 GitHub Pages Debug Check"
echo "=========================="
echo ""

# Check if the site responds
URL="https://lobabobloblaw.github.io/space-simulator-ev/"
echo "Checking: $URL"
echo ""

# Get HTTP status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
echo "HTTP Status: $STATUS"

if [ "$STATUS" = "200" ]; then
    echo "✅ Site is responding!"
    echo ""
    echo "If the game isn't loading, check:"
    echo "1. Browser console for JavaScript errors (F12)"
    echo "2. Hard refresh: Cmd+Shift+R"
    echo "3. Try incognito/private mode"
    echo ""
    echo "Common fixes:"
    echo "- Module imports must be at top of file ✅ FIXED"
    echo "- All paths must be relative (./js not /js)"
    echo "- .nojekyll file must exist ✅ EXISTS"
elif [ "$STATUS" = "404" ]; then
    echo "❌ 404 - Page not found"
    echo ""
    echo "Check:"
    echo "1. Is GitHub Pages enabled in Settings?"
    echo "2. Branch: main, Folder: /docs?"
    echo "3. Wait 2-10 minutes for first deploy"
else
    echo "⚠️ Unexpected status: $STATUS"
    echo ""
    echo "This might mean:"
    echo "- Site is still deploying"
    echo "- GitHub Pages not enabled yet"
    echo "- Network issue"
fi

echo ""
echo "📊 GitHub Actions Status:"
echo "https://github.com/lobabobloblaw/space-simulator-ev/actions"
echo ""
echo "🎮 Game URL:"
echo "$URL"
