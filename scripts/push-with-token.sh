#!/bin/bash
# GitHub Push with Token

echo "🔐 GitHub Push with Personal Access Token"
echo "=========================================="
echo ""
echo "📝 Enter your GitHub username:"
read GITHUB_USERNAME

echo "🔑 Enter your Personal Access Token (starts with ghp_):"
echo "   (Get one at: https://github.com/settings/tokens/new)"
read -s GITHUB_TOKEN

echo ""
echo "🚀 Pushing to GitHub..."

# Set the remote URL with token embedded (for this session only)
git remote set-url origin https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_USERNAME}/space-simulator-ev.git

# Push
git push -u origin main

echo ""
echo "✅ Success! Your game is pushed to GitHub!"
echo ""
echo "🎮 Now enable GitHub Pages:"
echo "   1. Go to: https://github.com/${GITHUB_USERNAME}/space-simulator-ev/settings/pages"
echo "   2. Source: Deploy from branch"
echo "   3. Branch: main, Folder: /docs"
echo "   4. Click Save"
echo ""
echo "🌐 Your game will be live at:"
echo "   https://${GITHUB_USERNAME}.github.io/space-simulator-ev/"
echo ""
echo "⏰ (First deployment takes 2-10 minutes)"
