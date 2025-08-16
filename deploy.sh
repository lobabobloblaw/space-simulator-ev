#!/bin/bash
# GitHub Push Script for Galaxy Trader

echo "🚀 Galaxy Trader - GitHub Deployment Script"
echo "==========================================="
echo ""

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
