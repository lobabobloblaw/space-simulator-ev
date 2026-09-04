// Faithful progression pass: buy a weapon through the UI, kill with real
// projectiles, boss -> unlock -> final boss -> victory, ship select, continue-run.
import { chromium } from 'playwright';

const SHOTS = './shots';
const BASE = 'http://localhost:8000/docs/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleMsgs.push('[pageerror] ' + e.message));
const note = (s) => console.log(s);
const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const sleep = (ms) => page.waitForTimeout(ms);
const ev = (code) => page.evaluate(code);
const RS = `(await import('/docs/js/systems/RunSystem.js')).getRunSystem()`;
const bodyHas = (re) => ev(`(document.body.innerText.match(${re}) || [null])[0]`);

await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await sleep(2000);
await page.click('#startRunBtn');
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 });
await sleep(800);

// ---- land, buy mining laser via UI ----
await ev(`(() => { const s = window.stateManager.state; const p = s.planets[0]; s.ship.x = p.x + p.radius + 20; s.ship.y = p.y; s.ship.vx = 0; s.ship.vy = 0; })()`);
await page.keyboard.press('l');
await sleep(800);
await page.keyboard.press('4');
await sleep(500);
const buyBtns = await ev(`[...document.querySelectorAll('#shopList button')].map(b => b.textContent.trim() + (b.disabled ? '(disabled)' : ''))`);
note('outfitter buttons: ' + JSON.stringify(buyBtns));
await page.click('#shopList button:not([disabled])');
await sleep(500);
note('after buy: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; return { credits: s.ship.credits, weapons: s.ship.weapons, hudWeapon: document.getElementById('weapon')?.innerText }; })()`)));
// grab more credits and buy the rapid laser too (to make later kills quick)
await ev(`window.stateManager.state.ship.credits = 5000`);
await page.keyboard.press('4'); await sleep(400);
const rapid = await ev(`(() => { const rows = [...document.querySelectorAll('#shopList > *')]; const r = rows.find(x => /RAPID/i.test(x.textContent)); const b = r && r.querySelector('button'); if (b) { b.click(); return 'clicked'; } return 'no rapid row: ' + rows.map(x => x.textContent.slice(0,20)).join('|'); })()`);
note('rapid buy: ' + rapid);
await sleep(400);
note('weapons now: ' + JSON.stringify(await ev(`window.stateManager.state.ship.weapons`)));
await shot('30_outfitter_after_buy');
// missions: accept FIRST BLOOD
await page.keyboard.press('5'); await sleep(400);
const acc = await ev(`(() => { const b = [...document.querySelectorAll('#missionsList button')].find(x => /ACCEPT/i.test(x.textContent)); if (b) { b.click(); return 'accepted:' + b.closest('[data-mission-id]')?.dataset.missionId; } return 'no accept button'; })()`);
note('mission accept: ' + acc);
await sleep(400);
note('missions state: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; return { shipMissions: s.ship.missions && { active: (s.ship.missions.active||[]).map(m => m.id), completed: (s.ship.missions.completed||[]).length, available: (s.ship.missions.available||[]).length }, legacy: s.missionSystem && { active: s.missionSystem.active?.id, completed: s.missionSystem.completed }, hint: document.getElementById('tutorialHint')?.innerText }; })()`)));
await page.keyboard.press('1');
await sleep(600);

// ---- real kill: put a pirate in front, target, fire ----
await page.keyboard.press('q'); // switch to rapid if 2 weapons
const setupKill = `(() => { const s = window.stateManager.state; let n = s.npcShips.find(x => x.type === 'pirate'); if (!n) return 'no pirate'; n.x = s.ship.x + Math.cos(s.ship.angle) * 140; n.y = s.ship.y + Math.sin(s.ship.angle) * 140; n.vx = 0; n.vy = 0; n.health = 6; return { angle: s.ship.angle, npcHp: n.health, w: s.ship.weapons[s.ship.currentWeapon] }; })()`;
note('kill setup: ' + JSON.stringify(await ev(setupKill)));
await page.keyboard.press('x');
await page.keyboard.down('f'); await sleep(1500); await page.keyboard.up('f');
await sleep(1200);
note('after kill: ' + JSON.stringify(await ev(`(async () => { const s = window.stateManager.state; const rs = ${RS}; return { kills: s.ship.kills, pirateKills: s.ship.pirateKills, credits: s.ship.credits, runStats: rs.getRunStats(), npcs: s.npcShips.map(n => n.type), hint: document.getElementById('tutorialHint')?.innerText, missions: s.ship.missions && { active: (s.ship.missions.active||[]).map(m => m.id + ':' + JSON.stringify(m.progress ?? '')), completed: (s.ship.missions.completed||[]).map(m => m.id || m) } }; })()`)));
await shot('31_after_first_kill');

// ---- zone 2, zone 3 ----
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; })()`);
await page.keyboard.press('z'); await sleep(800);
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 15; window.stateManager.state.ship.credits = 6000; })()`);
await page.keyboard.press('z'); await sleep(800);
note('zone: ' + await ev(`(async () => (${RS}).getCurrentZone().name)()`));
note('planets in state during zone3: ' + JSON.stringify(await ev(`window.stateManager.state.planets.map(p => p.name)`)));

// ---- boss: spawn, drag in front, kill with projectiles ----
await ev(`(async () => { (${RS}).spawnZoneBoss(); })()`);
await sleep(600);
const pull = `(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); if (!b) return 'no boss'; b.x = s.ship.x + Math.cos(s.ship.angle) * 160; b.y = s.ship.y + Math.sin(s.ship.angle) * 160; b.vx = 0; b.vy = 0; b.health = 8; return { name: b.name, hp: b.health, weapon: b.weapon.type }; })()`;
note('boss pulled: ' + JSON.stringify(await ev(pull)));
await page.keyboard.press('x');
await page.keyboard.down('f'); await sleep(1800); await page.keyboard.up('f');
await sleep(1500);
note('after boss kill: ' + JSON.stringify(await ev(`(async () => { const s = window.stateManager.state; const rs = ${RS}; return { bossesDefeated: rs._runStats.bossesDefeated, canAdvance: rs.canAdvance(), credits: s.ship.credits, npcs: s.npcShips.map(n => n.type), unlockedText: (document.body.innerText.match(/Unlocked[^\\n]*/i) || [null])[0], meta: JSON.parse(localStorage.getItem('galaxyTraderMeta') || 'null') }; })()`)));
await shot('32_after_boss');

// ---- zone 4, void king, victory ----
await page.keyboard.press('z'); await sleep(1000);
note('zone: ' + await ev(`(async () => (${RS}).getCurrentZone().name)()`));
await shot('33_void');
await ev(`(async () => { (${RS}).spawnZoneBoss(); })()`);
await sleep(600);
note('void boss pulled: ' + JSON.stringify(await ev(pull)));
// let the boss shoot us so we can see its projectile type
await sleep(1500);
note('projectiles: ' + JSON.stringify(await ev(`window.stateManager.state.projectiles.map(p => ({ type: p.type, isPlayer: p.isPlayer, color: p.color, dmg: p.damage })).slice(0, 8)`)));
await shot('34_void_boss_fight');
await page.keyboard.press('x');
await page.keyboard.down('f'); await sleep(1800); await page.keyboard.up('f');
await sleep(2500);
await shot('35_victory_screen');
note('victory: ' + JSON.stringify(await ev(`(async () => { const rs = ${RS}; return { overlay: getComputedStyle(document.getElementById('deathScreenOverlay')).display, title: document.querySelector('.death-title')?.innerText, sub: document.getElementById('deathZone')?.innerText, summary: document.getElementById('runSummary')?.innerText.replace(/\\s+/g, ' '), unlocks: document.getElementById('deathUnlocks')?.innerText, unlocksDisplay: getComputedStyle(document.getElementById('deathUnlocks')).display, runActive: rs.isRunActive(), meta: JSON.parse(localStorage.getItem('galaxyTraderMeta') || 'null'), runSave: localStorage.getItem('galaxyTraderRun') }; })()`)));

// ---- back to menu, check unlocks, pick interceptor ----
await page.click('#mainMenuBtn'); await sleep(1000);
await shot('36_menu_after_victory');
note('carousel: ' + JSON.stringify(await ev(`[...document.querySelectorAll('#shipCarousel > *')].map(c => c.textContent.replace(/\\s+/g, ' ').trim() + ' | class=' + c.className + ' | data=' + JSON.stringify(c.dataset))`)));
const picked = await ev(`(() => { const c = [...document.querySelectorAll('#shipCarousel > *')].find(x => /Interceptor/i.test(x.textContent)); if (!c) return 'none'; c.click(); return c.className; })()`);
note('picked interceptor card -> ' + picked);
await sleep(300);
await page.click('#startRunBtn'); await sleep(1000);
note('new run ship: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; return { class: s.ship.class, shipClass: s.ship.shipClass, hp: s.ship.maxHealth, shield: s.ship.maxShield, maxSpeed: s.ship.maxSpeed, weapons: s.ship.weapons, credits: s.ship.credits, engineLevel: s.ship.engineLevel, cargoCap: s.ship.cargoCapacity, currentShipName: document.getElementById('currentShipName')?.innerText }; })()`)));
await shot('37_interceptor_run');

// ---- continue-run: reload mid-run ----
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1500; })()`);
await page.keyboard.press('z'); await sleep(800);
await ev(`window.eventBus.emit(window.GameEvents.GAME_SAVE, { reason: 'manual' })`);
await sleep(1500);
await page.goto(BASE);
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await sleep(2000);
await shot('38_menu_with_continue');
note('continue btn: ' + JSON.stringify(await ev(`({ display: getComputedStyle(document.getElementById('continueRunBtn')).display, text: document.getElementById('continueRunBtn')?.innerText, paused: window.stateManager.state.paused })`)));
await page.click('#continueRunBtn').catch(e => note('continue click failed: ' + e.message));
await sleep(1200);
note('resumed: ' + JSON.stringify(await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; return { zone: rs.getCurrentZone().name, kills: rs.getRunStats().kills, shipHp: s.ship.maxHealth, credits: s.ship.credits, weapons: s.ship.weapons?.length, paused: s.paused, class: s.ship.class }; })()`)));
await shot('39_resumed');

const errs = consoleMsgs.filter(m => /^\[(error|pageerror|warning)\]/.test(m) && !/403|404/.test(m));
note(`console warn/err: ${errs.length}`);
for (const e of errs.slice(0, 30)) note('  ' + e.slice(0, 300));
await browser.close();
