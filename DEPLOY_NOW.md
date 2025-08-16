# 🚀 QUICK DEPLOY GUIDE

## First Time Setup (Do This Now!)

### 1️⃣ Create GitHub Repository
✅ Already opened: https://github.com/new
- Name: `space-simulator-ev`
- Keep it PUBLIC
- DON'T add README/license

### 2️⃣ Push Your Code
```bash
# Option A: Use the deploy script
./deploy.sh

# Option B: Manual commands
git remote add origin https://github.com/YOUR_USERNAME/space-simulator-ev.git
git branch -M main
git push -u origin main
```

### 3️⃣ Enable GitHub Pages
After pushing, go to:
`https://github.com/YOUR_USERNAME/space-simulator-ev/settings/pages`

Settings:
- Source: **Deploy from branch**
- Branch: **main**
- Folder: **/docs**
- Click **Save**

### 4️⃣ Share Your Game! 🎮
Your game URL:
```
https://YOUR_USERNAME.github.io/space-simulator-ev/
```

---

## Future Updates (After Setup)

Super simple - just 3 commands:
```bash
git add .
git commit -m "Update: Added new feature"
git push
```

Changes go live in ~1 minute!

---

## Test Locally First
```bash
# Start local server
python3 -m http.server 8000

# Open browser
http://localhost:8000/docs/
```

---

## 🎯 Status Checklist

- [ ] Created GitHub repository
- [ ] Ran ./deploy.sh or manual commands
- [ ] Enabled GitHub Pages in Settings
- [ ] Waited 2-10 minutes
- [ ] Game is LIVE! 🎉

---

## Troubleshooting

**404 Error?**
- Wait 5-10 minutes (first deploy takes time)
- Check: Settings → Pages → Is it enabled?
- Verify: /docs folder exists

**Game not loading?**
- Hard refresh: Cmd+Shift+R
- Check browser console for errors
- Ensure you selected `/docs` folder

**Can't push?**
- Make sure repo name matches
- Check GitHub username is correct
- Try: `git remote -v` to verify

---

## Share Your Success! 🎉

Once it's live, you have:
- ✅ Free hosting forever
- ✅ Automatic updates on push
- ✅ No server costs
- ✅ Works on all devices
- ✅ Share with just a link!

Game link to share:
`https://YOUR_USERNAME.github.io/space-simulator-ev/`
