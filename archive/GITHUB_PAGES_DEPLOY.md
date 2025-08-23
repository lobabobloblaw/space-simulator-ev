# GitHub Pages Deployment Guide for Galaxy Trader

## Quick Deploy (5 minutes)

### Step 1: Push to GitHub
```bash
# If not already a git repo
git init
git add .
git commit -m "Initial commit - Galaxy Trader"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/space-simulator-ev.git
git branch -M main
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll down to **Pages** (left sidebar)
4. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/docs`
5. Click **Save**

### Step 3: Access Your Game
- Your game will be available at:
  ```
  https://YOUR_USERNAME.github.io/space-simulator-ev/
  ```
- It may take 2-10 minutes for the first deployment

## File Structure
```
space-simulator-ev/
├── docs/                    # GitHub Pages serves from here
│   ├── index.html          # Main game file
│   ├── .nojekyll          # Prevents Jekyll processing
│   ├── README.md          # Game description
│   ├── css/
│   │   └── main.css       # Game styles
│   └── js/
│       ├── main.js        # Main game logic
│       ├── data/
│       │   └── gameData.js # Game configuration
│       └── systems/
│           └── allSystems.js # Game systems
├── README.md              # Project documentation
└── [other development files]
```

## Why This Structure?

### GitHub Pages from `/docs`
- Keeps deployment files separate from development
- Easy to maintain and update
- Clear separation of concerns
- No need for separate gh-pages branch

### Benefits
- ✅ **Instant Updates**: Push to main = deploy
- ✅ **Free Hosting**: No server costs
- ✅ **HTTPS**: Automatic SSL certificate
- ✅ **Custom Domain**: Can add your own domain
- ✅ **No Build Process**: Pure JavaScript modules work directly

## Troubleshooting

### Game not loading?
1. Check browser console for errors
2. Ensure all paths are relative (`./js/` not `/js/`)
3. Wait 5-10 minutes after enabling Pages
4. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### 404 Error?
- Check repository name matches URL
- Ensure `/docs` folder exists
- Verify `index.html` is in `/docs`

### Module errors?
- The `.nojekyll` file is crucial - it must exist
- Check all import paths are correct
- Use relative paths starting with `./`

## Custom Domain (Optional)
1. Buy domain from registrar
2. In repo Settings > Pages > Custom domain
3. Add your domain
4. Configure DNS:
   - A records: 185.199.108-111.153
   - CNAME: YOUR_USERNAME.github.io

## Mobile Support (Future)
The game structure is ready for mobile support. To add:
1. Touch controls overlay
2. Responsive canvas sizing
3. Virtual joystick implementation

## Sharing Your Game

### Direct Link
```
https://YOUR_USERNAME.github.io/space-simulator-ev/
```

### Embed in README
```markdown
[🎮 Play Galaxy Trader](https://YOUR_USERNAME.github.io/space-simulator-ev/)
```

### Social Media
Perfect for sharing on:
- Twitter/X
- Discord
- Reddit (r/webgames, r/incremental_games)
- itch.io (can embed the URL)

## Performance Tips
- GitHub Pages uses CDN (fast worldwide)
- Assets are cached automatically
- No server-side processing needed
- Scales to thousands of players

## Updates
To update the game:
```bash
# Make changes to docs/ files
git add docs/
git commit -m "Update: [description]"
git push
# Changes live in ~1-2 minutes
```

---
Ready to deploy! Your friends can play Galaxy Trader with just a link! 🚀
