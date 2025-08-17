#!/bin/bash
# Monitor GitHub Pages deployment

echo "🔄 Monitoring GitHub Pages Deployment"
echo "======================================"
echo ""
echo "URL: https://lobabobloblaw.github.io/space-simulator-ev/"
echo ""

for i in {1..10}; do
    echo -n "Attempt $i/10: "
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://lobabobloblaw.github.io/space-simulator-ev/)
    
    if [ "$STATUS" = "200" ]; then
        echo "✅ SUCCESS! Site is live!"
        echo ""
        echo "🎮 Opening your game..."
        open "https://lobabobloblaw.github.io/space-simulator-ev/"
        exit 0
    elif [ "$STATUS" = "404" ]; then
        echo "❌ Still 404"
    else
        echo "⚠️ Status: $STATUS"
    fi
    
    if [ $i -lt 10 ]; then
        echo "   Waiting 30 seconds before retry..."
        sleep 30
    fi
done

echo ""
echo "😞 Still not working after 5 minutes."
echo ""
echo "Please check:"
echo "1. GitHub Actions: https://github.com/lobabobloblaw/space-simulator-ev/actions"
echo "2. Deployments: https://github.com/lobabobloblaw/space-simulator-ev/deployments"
echo "3. Pages Settings: https://github.com/lobabobloblaw/space-simulator-ev/settings/pages"
echo ""
echo "Look for:"
echo "- Green checkmarks in Actions"
echo "- 'github-pages' environment in Deployments"
echo "- 'Your site is published at...' message in Pages settings"
