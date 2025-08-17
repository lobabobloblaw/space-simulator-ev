#!/bin/bash
cd /Users/alexvoigt/Documents/Claude/space-simulator-ev

echo "=== Git Status ==="
git status

echo ""
echo "=== Last 3 Commits ==="
git log --oneline -3

echo ""
echo "=== Remote Status ==="
git remote -v
git branch -vv
