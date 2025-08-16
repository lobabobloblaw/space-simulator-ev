# Galaxy Trader 🚀

A retro space trading and combat game with ship diversity, dynamic economy, and arcade action!

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Platform](https://img.shields.io/badge/platform-web-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🎮 Play Now!
### **[PLAY GALAXY TRADER](https://lobabobloblaw.github.io/space-simulator-ev/)**

## 🌟 Features

### Core Gameplay
- **Trading System**: Dynamic economy across 4 unique planets
- **Combat**: Fight pirates, earn bounties, avoid patrol ships
- **Ship Diversity**: Each ship type has unique visual design
  - Freighters: Massive rectangular cargo haulers
  - Pirates: Angular aggressive fighters
  - Patrols: Military ships with wide wings
  - Traders: Rounded merchant vessels
- **Upgrades**: Weapons, shields, engines, cargo expansions
- **Mission System**: Progressive objectives with rewards

### Visual Features
- **Unique Ship Designs**: Each NPC type has distinct appearance
- **Parallax Stars**: Multi-layer star field
- **Particle Effects**: Explosions, thrust, projectiles
- **Atmospheric Glow**: Planets with visual atmosphere
- **Damage Indicators**: Health bars for ships

## 🕹️ Controls

| Key | Action |
|-----|--------|
| W/↑ | Thrust |
| A/D | Turn |
| Space | Brake |
| F | Fire |
| Q | Switch Weapon |
| L | Land (near planet) |
| M | Mute/Unmute |

## 🚀 Development

### Local Testing
```bash
# Clone
git clone https://github.com/lobabobloblaw/space-simulator-ev.git
cd space-simulator-ev

# Run local server
python3 -m http.server 8000

# Open browser
http://localhost:8000/docs/
```

### Deploy Updates
```bash
# Make changes in docs/ folder
git add .
git commit -m "Update: description"
git push

# Changes live in ~1 minute!
```

## 📁 Project Structure
```
space-simulator-ev/
├── docs/                       # 🌐 GitHub Pages (PRODUCTION)
│   ├── index.html             # Game entry point
│   ├── css/main.css          # Styles
│   └── js/
│       ├── main.js           # Core game loop
│       ├── data/gameData.js  # Configuration
│       └── systems/          # Game systems
└── js/                        # Development testing
```

## 🎯 Gameplay Tips

### Starting Strategy
1. **Unarmed Start**: Trade commodities to earn first 150 credits
2. **First Weapon**: Buy Mining Laser at any planet
3. **Hunt Pirates**: Each kill = 175+ credits
4. **Upgrade Path**: Better weapons → shields → engines

### Trading Tips
- 📉 Buy when price indicator shows (cheap)
- 📈 Sell when price indicator shows (expensive)
- Each planet has different supply/demand
- Ore is cheap at Crimson Moon, expensive at Ice World

### Combat Tips
- Pirates are aggressive but weak
- Patrols are VERY dangerous but attack pirates
- Freighters are slow, valuable targets
- Use asteroids as cover

## 🛠️ Technical Details

### Built With
- **Pure JavaScript** (ES6 modules)
- **HTML5 Canvas** for rendering
- **Web Audio API** for sound effects
- **No dependencies** or build process
- **GitHub Pages** for hosting

### Browser Compatibility
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (controls need touch overlay)

## 📈 Roadmap

### Next Features
- [ ] Mobile touch controls
- [ ] Save/load system
- [ ] More planets and systems
- [ ] Faction reputation
- [ ] Procedural generation
- [ ] Multiplayer support
- [ ] Ship customization
- [ ] Quest chains

## 🐛 Known Issues
- NPCs occasionally spawn inside planets (rare)
- Audio requires first click (browser security)

## 📜 Version History
- **v1.3.0** (Dec 20, 2024) - GitHub Pages deployment
- **v1.2.0** - Ship visual diversity restored
- **v1.1.0** - Modular architecture 
- **v1.0.0** - Initial release

## 🤝 Contributing
Feel free to fork and submit PRs! Areas for contribution:
- Mobile touch controls
- New planet types
- Additional ship classes
- Performance optimization
- Visual effects

## 📄 License
MIT License - use freely for any purpose!

## 🙏 Credits
- Created with Claude (Anthropic)
- Inspired by Elite, Escape Velocity
- No external assets (all procedural)

---

**[🎮 PLAY NOW](https://lobabobloblaw.github.io/space-simulator-ev/)** | **[📂 View Source](https://github.com/lobabobloblaw/space-simulator-ev)** | **[🐛 Report Issue](https://github.com/lobabobloblaw/space-simulator-ev/issues)**
