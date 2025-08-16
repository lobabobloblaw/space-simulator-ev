#!/bin/bash
# Check if Galaxy Trader is live

echo "🔍 Checking if Galaxy Trader is live..."
echo ""

URL="https://lobabobloblaw.github.io/space-simulator-ev/"

# Try to fetch the page
if curl -s --head "$URL" | head -n 1 | grep "200\|301\|302" > /dev/null; then
    echo "✅ YOUR GAME IS LIVE!"
    echo ""
    echo "🎮 Play at: $URL"
    echo ""
    echo "Share with friends:"
    echo "- Direct link: $URL"
    echo "- QR code generator: https://qr-code-generator.com"
    echo ""
    open "$URL"
else
    echo "⏰ Not ready yet. This is normal!"
    echo ""
    echo "First deployment can take up to 10 minutes."
    echo "Check:"
    echo "1. Did you enable Pages in Settings?"
    echo "2. Did you select 'main' branch and '/docs' folder?"
    echo ""
    echo "Try again in a minute with: ./check-live.sh"
fi
