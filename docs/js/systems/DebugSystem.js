import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * DebugSystem - Lightweight debug overlay and toggles via EventBus
 * Toggle with TAB (handled by InputSystem -> GameEvents.DEBUG_TOGGLE)
 */
export default class DebugSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.enabled = false;
        this.panel = null;
        this.lastUpdate = 0;
        this.updateIntervalMs = 500; // overlay refresh cadence
        this.interacting = false;
        this.suppressUntil = 0;
        
        // Bindings
        this.toggle = this.toggle.bind(this);
        this.handleKey = this.handleKey.bind(this);
        this.handleFPS = this.handleFPS.bind(this);
        this.cycleQuality = this.cycleQuality.bind(this);
    }

    async init() {
        // Ensure debug state exists
        const state = this.stateManager.state;
        state.debug = state.debug || {
            enabled: false,
            drawHitboxes: false,
            drawVectors: false,
            drawNPCInfo: false,
            showParticles: true,
            fps: { current: 0, average: 0, update: 0, render: 0 },
            renderLint: false,
            renderLintTrace: false
        };

        // Subscribe to toggle and keys
        this.eventBus.on('debug.fps', this.handleFPS);
        this.eventBus.on('debug.toggle', this.toggle);
        this.eventBus.on('input.keyDown', this.handleKey);
        this.eventBus.on('debug.damage', (d) => {
            // Only collect when debug overlay is enabled and proj info display is on
            const s = this.stateManager.state;
            const dbg = s.debug || {};
            if (!dbg.enabled || !dbg.showProjInfo) return;
            dbg.damageNumbers = dbg.damageNumbers || [];
            // Soft cap to avoid growth if display is toggled on for long periods
            if (dbg.damageNumbers.length > 300) dbg.damageNumbers.shift();
            dbg.damageNumbers.push({ x: d.x, y: d.y, amount: d.amount, life: 0, max: 40 });
        });

        // Create overlay DOM
        this.createOverlay();
        this.renderOverlay();
    }

    createOverlay() {
        this.panel = document.createElement('div');
        this.panel.id = 'debugOverlay';
        Object.assign(this.panel.style, {
            position: 'fixed', top: '12px', left: '12px', zIndex: 2000,
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(0,255,255,0.3)',
            color: '#ccc', font: "10px 'JetBrains Mono', monospace",
            padding: '8px 10px', minWidth: '220px', display: 'none'
        });
        document.body.appendChild(this.panel);
        // Pause auto-refresh while interacting to avoid click race with re-render
        this.panel.addEventListener('mouseenter', () => { this.interacting = true; });
        this.panel.addEventListener('mouseleave', () => { this.interacting = false; });
    }

    toggle() {
        this.enabled = !this.enabled;
        this.stateManager.state.debug.enabled = this.enabled;
        if (this.panel) this.panel.style.display = this.enabled ? 'block' : 'none';
    }

    handleKey(data) {
        if (!this.enabled) return;
        const key = (data?.key || '').toLowerCase();
        const dbg = this.stateManager.state.debug;
        if (key === '1') dbg.drawHitboxes = !dbg.drawHitboxes;
        else if (key === '2') dbg.drawVectors = !dbg.drawVectors;
        else if (key === '3') dbg.drawNPCInfo = !dbg.drawNPCInfo;
        else if (key === '4') {
            // Toggle particles through render system flag
            dbg.showParticles = !dbg.showParticles;
            this.eventBus.emit('render.toggleParticles');
        } else if (key === '5') {
            dbg.showProjInfo = !dbg.showProjInfo;
        } else if (key === '[') {
            dbg.spreadMult = Math.max(0.2, ((dbg.spreadMult ?? 1) - 0.2));
        } else if (key === ']') {
            dbg.spreadMult = Math.min(3.0, ((dbg.spreadMult ?? 1) + 0.2));
        } else if (key === 'f6') {
            const ship = this.stateManager.state.ship;
            ship.credits = (ship.credits || 0) + 9999;
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship });
            this.eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Credits +9999 (debug)', type: 'info', duration: 1200 });
        } else if (key === 'f7') {
            this.grantWeapon('weapon2'); // Rapid
        } else if (key === 'f8') {
            this.grantWeapon('weapon3'); // Plasma
        } else if (key === 'g') {
            dbg.godMode = !dbg.godMode;
        } else if (key === 't') {
            this.teleportToPlanet(data?.shiftKey);
        } else if (key === 'n') {
            this.spawnNPC('pirate');
        } else if (key === 'p') {
            this.spawnNPC('patrol');
        } else if (key === 'l' && data?.shiftKey) {
            this.forceLandingOverlay();
        } else if (key === 'f3') {
            this.cycleQuality();
        }
        this.renderOverlay();
    }

    cycleQuality() {
        const dbg = this.stateManager.state.debug;
        const order = ['high', 'medium', 'low'];
        const current = (dbg.renderQuality && order.includes(dbg.renderQuality)) ? dbg.renderQuality : 'high';
        const next = order[(order.indexOf(current) + 1) % order.length];
        dbg.renderQuality = next;
        this.eventBus.emit('render.quality', { quality: next });
        this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Render quality: ${next}`, type: 'info', duration: 1000 });
    }

    handleFPS(stats) {
        const dbg = this.stateManager.state.debug;
        dbg.fps = {
            current: stats.current,
            average: stats.average,
            update: Math.round(stats.updateTime),
            render: Math.round(stats.renderTime)
        };
        if (this.enabled) this.renderOverlay();
    }

    update(state, dt) {
        if (!this.enabled) return;
        const now = performance.now();
        if (now < this.suppressUntil) return;
        if (this.interacting) return;
        if (now - this.lastUpdate < this.updateIntervalMs) return;
        this.lastUpdate = now;
        // Update floating damage numbers
        const dbg = state.debug;
        if (dbg && Array.isArray(dbg.damageNumbers)) {
            for (let i = dbg.damageNumbers.length - 1; i >= 0; i--) {
                const dn = dbg.damageNumbers[i];
                dn.life++;
                dn.y -= 0.6; // float up
                if (dn.life >= dn.max) dbg.damageNumbers.splice(i, 1);
            }
        }
        this.renderOverlay();
    }

    renderOverlay() {
        if (!this.panel) return;
        const s = this.stateManager.state;
        const dbg = s.debug || {};
        const fps = dbg.fps || {};
        const ship = s.ship || {};
        const speed = Math.hypot(ship.vx || 0, ship.vy || 0).toFixed(2);
        const counts = {
            npcs: (s.npcShips || []).length,
            proj: (s.projectiles || []).length,
            ast: (s.asteroids || []).length,
            exp: (s.explosions || []).length
        };
        const rep = s.reputation || { trader: 0, patrol: 0, pirate: 0 };
        const weapon = (ship.weapons && ship.weapons[ship.currentWeapon]) || null;
        // weapon.type is restored verbatim from localStorage saves — escape it
        // before interpolating into innerHTML (tampered saves could inject markup)
        const esc = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const wepStr = weapon ? `${esc(weapon.type)} (cd:${ship.weaponCooldown||0})` : 'none';

        const useSprites = !!(s.renderSettings && s.renderSettings.useSprites);
        const spriteCulling = !!(s.renderSettings && s.renderSettings.spriteCulling);
        const useEffectsSprites = !!(s.renderSettings && s.renderSettings.useEffectsSprites);
        const spriteCount = (s.assets && s.assets.sprites) ? Object.keys(s.assets.sprites).length : 0;

        // Build debug panel using DOM API (XSS-safe)
        this.panel.textContent = ''; // Clear existing content

        const makeDiv = (text, style = '') => {
            const div = document.createElement('div');
            if (style) div.style.cssText = style;
            div.textContent = text;
            return div;
        };

        const makeButton = (label, dbgAction) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.setAttribute('data-dbg', dbgAction);
            btn.style.cssText = 'font-size:10px; padding:2px 6px;';
            return btn;
        };

        // Header
        this.panel.appendChild(makeDiv('Debug', 'color:#0ff; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;'));

        // Stats rows
        this.panel.appendChild(makeDiv(`FPS: ${fps.current||0} (avg ${fps.average||0}) • U:${fps.update||0}ms R:${fps.render||0}ms`));
        this.panel.appendChild(makeDiv(`NPCs: ${counts.npcs} • Proj: ${counts.proj} • Ast: ${counts.ast} • Exp: ${counts.exp}`));
        this.panel.appendChild(makeDiv(`Ship: (${ship.x|0}, ${ship.y|0}) v=${speed} hp=${ship.health||0}/${ship.maxHealth||0} sh=${ship.shield||0}`));
        this.panel.appendChild(makeDiv(`Weapon: ${wepStr}`));
        this.panel.appendChild(makeDiv(`Rep: T${rep.trader||0} / PTRL${rep.patrol||0} / PIR${rep.pirate||0}`));
        this.panel.appendChild(makeDiv(`Spread: x${(dbg.spreadMult??1).toFixed(1)} ( [ / ] )`));
        this.panel.appendChild(makeDiv(`Quality: ${dbg.renderQuality||'high'} (F3 to cycle)`));
        this.panel.appendChild(makeDiv(`Sprites: ${useSprites ? 'ON' : 'OFF'} • Loaded: ${spriteCount}`));
        this.panel.appendChild(makeDiv(`Overlay: Culling ${spriteCulling?'ON':'OFF'} • FX Thrusters ${useEffectsSprites?'ON':'OFF'}`));
        this.panel.appendChild(makeDiv(`Render Lint: ${dbg.renderLint?'ON':'OFF'} • Trace ${dbg.renderLintTrace?'ON':'OFF'} • Reset ${dbg.renderLintReset?'ON':'OFF'} • Warns ${dbg.renderLintCount||0}${dbg.renderLintLastStage?(' ['+dbg.renderLintLastStage+']'):''}`));

        // Key hints
        this.panel.appendChild(makeDiv('1:Hitboxes 2:Vectors 3:NPC Info 4:Particles 5:ProjInfo', 'margin-top:6px; color:#aaa;'));
        this.panel.appendChild(makeDiv(`[${dbg.drawHitboxes?'x':' '}] Hitboxes • [${dbg.drawVectors?'x':' '}] Vectors • [${dbg.drawNPCInfo?'x':' '}] NPC Info • [${dbg.showProjInfo?'x':' '}] Proj`, 'color:#8ac;'));

        // Button row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'margin-top:6px; display:flex; gap:6px; flex-wrap:wrap; align-items:center;';
        btnRow.appendChild(makeButton('+9999cr', 'credits'));
        btnRow.appendChild(makeButton('Grant Rapid', 'rapid'));
        btnRow.appendChild(makeButton('Grant Plasma', 'plasma'));
        btnRow.appendChild(makeButton('Grant Mining', 'mining'));
        btnRow.appendChild(makeButton('Next Weapon', 'switch'));
        btnRow.appendChild(makeButton('Toggle Sprites', 'sprites'));
        btnRow.appendChild(makeButton('Toggle Culling', 'culling'));
        btnRow.appendChild(makeButton('Toggle FX', 'fx'));
        btnRow.appendChild(makeButton('Lint', 'lint'));
        btnRow.appendChild(makeButton('Trace', 'linttrace'));

        const godSpan = document.createElement('span');
        godSpan.style.cssText = 'color:#faa; margin-left:auto;';
        godSpan.textContent = `G:God ${dbg.godMode?'ON':'OFF'}`;
        btnRow.appendChild(godSpan);

        this.panel.appendChild(btnRow);
        // Bind quick action buttons (debounced + suppress auto-refresh briefly)
        try {
            const btnC = this.panel.querySelector('button[data-dbg="credits"]');
            const btnR = this.panel.querySelector('button[data-dbg="rapid"]');
            const btnP = this.panel.querySelector('button[data-dbg="plasma"]');
            const btnM = this.panel.querySelector('button[data-dbg="mining"]');
            const btnS = this.panel.querySelector('button[data-dbg="switch"]');
            const btnSpr = this.panel.querySelector('button[data-dbg="sprites"]');
            const btnCull = this.panel.querySelector('button[data-dbg="culling"]');
            const btnFx = this.panel.querySelector('button[data-dbg="fx"]');
            const btnLint = this.panel.querySelector('button[data-dbg="lint"]');
            const btnTrace = this.panel.querySelector('button[data-dbg="linttrace"]');
            let btnReset = this.panel.querySelector('button[data-dbg="lintreset"]');
            if (!btnReset) {
                // Inject Reset button if missing (resilient to minor overlay rebuilds)
                const row = this.panel.querySelector('div[style*="display:flex"]');
                if (row) {
                    const b = document.createElement('button');
                    b.textContent = 'Reset';
                    b.setAttribute('data-dbg', 'lintreset');
                    Object.assign(b.style, { fontSize: '10px', padding: '2px 6px' });
                    row.insertBefore(b, row.querySelector('span') /* before right-side span */);
                    btnReset = b;
                }
            }
            const arm = (btn, fn) => {
                if (!btn) return;
                btn.onclick = async () => {
                    if (btn.disabled) return;
                    btn.disabled = true;
                    this.suppressUntil = performance.now() + 350;
                    try { await fn(); } finally { setTimeout(() => { btn.disabled = false; }, 200); }
                };
            };
            arm(btnC, async () => {
                const ship = this.stateManager.state.ship; ship.credits = (ship.credits||0)+9999;
                this.eventBus.emit(GameEvents.UI_UPDATE, { ship });
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: 'Credits +9999 (debug)', type: 'info', duration: 1200 });
                this.renderOverlay();
            });
            arm(btnR, async () => this.grantWeapon('weapon2'));
            arm(btnP, async () => this.grantWeapon('weapon3'));
            arm(btnM, async () => this.grantWeapon('mining'));
            arm(btnS, async () => { this.eventBus.emit(GameEvents.INPUT_SWITCH_WEAPON); });
            arm(btnSpr, async () => {
                const st = this.stateManager.state;
                st.renderSettings = st.renderSettings || {};
                const next = !st.renderSettings.useSprites;
                st.renderSettings.useSprites = next;
                this.eventBus.emit(GameEvents.RENDER_USE_SPRITES, { enabled: next });
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Sprites ${next ? "ON" : "OFF"}`, type: "info", duration: 1000 });
                this.renderOverlay();
            });
            arm(btnCull, async () => {
                const st = this.stateManager.state;
                st.renderSettings = st.renderSettings || {};
                const next = !st.renderSettings.spriteCulling;
                st.renderSettings.spriteCulling = next;
                try { localStorage.setItem('gt.render.spriteCulling', String(next)); } catch(_) {}
                this.eventBus.emit('render.spriteCulling', { enabled: next });
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Sprite culling ${next ? 'ON' : 'OFF'}`, type: 'info', duration: 900 });
                this.renderOverlay();
            });
            arm(btnFx, async () => {
                const st = this.stateManager.state;
                st.renderSettings = st.renderSettings || {};
                const next = !st.renderSettings.useEffectsSprites;
                st.renderSettings.useEffectsSprites = next;
                try { localStorage.setItem('gt.render.useEffectsSprites', String(next)); } catch(_) {}
                this.eventBus.emit('render.useEffectsSprites', { enabled: next });
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `FX thrusters ${next ? 'ON' : 'OFF'}`, type: 'info', duration: 900 });
                this.renderOverlay();
            });
            arm(btnLint, async () => {
                const st = this.stateManager.state;
                st.debug.renderLint = !st.debug.renderLint;
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Render Lint ${st.debug.renderLint ? 'ON' : 'OFF'}`, type: 'info', duration: 900 });
                this.renderOverlay();
            });
            arm(btnTrace, async () => {
                const st = this.stateManager.state;
                st.debug.renderLintTrace = !st.debug.renderLintTrace;
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Lint Trace ${st.debug.renderLintTrace ? 'ON' : 'OFF'}`, type: 'info', duration: 900 });
                this.renderOverlay();
            });
            arm(btnReset, async () => {
                const st = this.stateManager.state;
                st.debug.renderLintReset = !st.debug.renderLintReset;
                this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Lint Auto-Reset ${st.debug.renderLintReset ? 'ON' : 'OFF'}`, type: 'info', duration: 900 });
                this.renderOverlay();
            });
            
        } catch (_) {}
    }

    async spawnNPC(kind) {
        try {
            const mod = await import('../data/gameData.js');
            const ship = this.stateManager.state.ship;
            const types = mod.npcTypes || {};
            const base = types[kind];
            if (!base) return;
            const angle = Math.random() * Math.PI * 2;
            const dist = 220 + Math.random() * 80;
            const npc = {
                x: ship.x + Math.cos(angle) * dist,
                y: ship.y + Math.sin(angle) * dist,
                vx: Math.cos(angle + Math.PI) * (base.maxSpeed * 0.2),
                vy: Math.sin(angle + Math.PI) * (base.maxSpeed * 0.2),
                angle: angle,
                type: kind,
                faction: kind === 'patrol' ? 'patrol' : 'pirate',
                behavior: base.behavior,
                size: base.size,
                maxSpeed: base.maxSpeed,
                thrust: base.thrust,
                turnSpeed: base.turnSpeed,
                health: base.health,
                maxHealth: base.maxHealth,
                credits: base.credits,
                weapon: base.weapon,
                weaponCooldown: Math.random() * 25,
                lifetime: 0,
                thrusting: false,
                state: kind === 'patrol' ? 'patrolling' : null
            };
            const s = this.stateManager.state;
            s.npcShips.push(npc);
        } catch (e) {}
    }

    forceLandingOverlay() {
        const s = this.stateManager.state;
        const planets = s.planets || [];
        if (!planets.length) return;
        // Choose nearest planet
        let best = null, bestD = Infinity;
        for (const p of planets) {
            const dx = (s.ship.x - p.x), dy = (s.ship.y - p.y);
            const d = dx*dx + dy*dy;
            if (d < bestD) { bestD = d; best = p; }
        }
        if (best) {
            this.eventBus.emit(GameEvents.SHIP_LANDED, { ship: s.ship, planet: best });
            this.eventBus.emit(GameEvents.GAME_PAUSE);
        }
    }

    teleportToPlanet(cycle = false) {
        const s = this.stateManager.state;
        const planets = s.planets || [];
        if (!planets.length) return;
        if (cycle) {
            s.debug.tpIndex = ((s.debug.tpIndex || 0) + 1) % planets.length;
            const p = planets[s.debug.tpIndex];
            const a = Math.random() * Math.PI * 2;
            const r = (p.radius || 60) + 80;
            s.ship.x = p.x + Math.cos(a) * r;
            s.ship.y = p.y + Math.sin(a) * r;
            s.ship.vx = 0; s.ship.vy = 0;
            s.ship.currentPlanet = p;
        } else {
            // nearest
            let best = null, bestD = Infinity;
            for (const p of planets) {
                const dx = (s.ship.x - p.x), dy = (s.ship.y - p.y);
                const d = dx*dx + dy*dy;
                if (d < bestD) { bestD = d; best = p; }
            }
            if (best) {
                const a = Math.random() * Math.PI * 2;
                const r = (best.radius || 60) + 80;
                s.ship.x = best.x + Math.cos(a) * r;
                s.ship.y = best.y + Math.sin(a) * r;
                s.ship.vx = 0; s.ship.vy = 0;
                s.ship.currentPlanet = best;
            }
        }
    }

    async grantWeapon(itemId) {
        try {
            const mod = await import('../data/gameData.js');
            const inv = mod.shopInventory || {};
            let item = inv[itemId];
            const ship = this.stateManager.state.ship;
            ship.weapons = ship.weapons || [];
            let wType, damage, cooldown, speed;
            if (item && item.type === 'weapon' && item.value) {
                wType = item.value.type; damage = item.value.damage; cooldown = item.value.cooldown; speed = item.value.speed || 2;
            } else {
                const map = {
                    laser: { damage: 10, cooldown: 15, speed: 2 },
                    rapid: { damage: 5, cooldown: 12, speed: 3 },
                    plasma: { damage: 20, cooldown: 28, speed: 1.9 },
                    mining: { damage: 2, cooldown: 35, speed: 2 }
                };
                const cfg = map[itemId] || null;
                if (!cfg) return;
                wType = itemId; damage = cfg.damage; cooldown = cfg.cooldown; speed = cfg.speed;
            }
            const already = ship.weapons.some(w => w.type === wType);
            if (!already) {
                ship.weapons.push({ type: wType, damage, cooldown, speed });
            }
            ship.currentWeapon = ship.weapons.findIndex(w => w.type === wType);
            ship.weaponCooldown = 0;
            this.eventBus.emit(GameEvents.UI_UPDATE, { ship });
            this.eventBus.emit(GameEvents.UI_MESSAGE, { message: `Granted ${wType.toUpperCase()} (debug)`, type: 'info', duration: 1200 });
            this.renderOverlay();
        } catch (e) {}
    }
}
