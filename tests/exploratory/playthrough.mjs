// Live playthrough of Galaxy Trader in headless Chromium: screenshots every
// screen, drives real keyboard input, forces zone/boss progression, records
// console output and frame timings. Read-only with respect to the repo.
import { chromium } from 'playwright';

const SHOTS = './shots';
const BASE = 'http://localhost:8000/docs/index.html';
const BIN = process.env.CHROMIUM_PATH;

const log = [];
const note = (s) => { console.log(s); log.push(s); };

const browser = await chromium.launch({ executablePath: BIN });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const consoleMsgs = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => consoleMsgs.push('[pageerror] ' + e.message));

const shot = async (name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); note(`shot ${name}`); };
const sleep = (ms) => page.waitForTimeout(ms);
const ev = (code) => page.evaluate(code);

// ---------- boot ----------
await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.eventBus && window.stateManager.state.ship, null, { timeout: 20000 });
await sleep(2500);
await shot('01_main_menu');
const menu = await ev(`(() => {
  const cards = [...document.querySelectorAll('#shipCarousel *')].filter(e => e.children.length === 0).map(e => e.textContent.trim()).filter(Boolean);
  return { cards: cards.slice(0, 40), metaStats: document.getElementById('metaStats')?.innerText, continueVisible: getComputedStyle(document.getElementById('continueRunBtn')).display };
})()`);
note('menu: ' + JSON.stringify(menu));

// ---------- start run ----------
await page.click('#startRunBtn');
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 });
await sleep(1500);
await shot('02_run_start');
const s0 = await ev(`(() => { const s = window.stateManager.state; return { ship: { x: s.ship.x, y: s.ship.y, hp: s.ship.health, credits: s.ship.credits, weapons: s.ship.weapons, cargo: s.ship.cargo, class: s.ship.shipClass, fuel: s.ship.fuel, maxSpeed: s.ship.maxSpeed, thrust: s.ship.thrust }, npcs: s.npcShips.map(n => n.type), planets: s.planets.map(p => ({ name: p.name, x: p.x, y: p.y, r: p.radius })), asteroids: s.asteroids.length, quality: s.renderSettings?.quality, useSprites: s.renderSettings?.useSprites, tutorial: document.getElementById('tutorialHint')?.innerText }; })()`);
note('run start state: ' + JSON.stringify(s0));

// ---------- fly around with real keys ----------
await page.keyboard.down('w');
await sleep(1500);
await page.keyboard.down('d');
await sleep(700);
await page.keyboard.up('d');
await sleep(800);
await page.keyboard.up('w');
await shot('03_flying');
// target nearest + fire
await page.keyboard.press('x');
await page.keyboard.down('f');
await sleep(1200);
await shot('04_firing');
await page.keyboard.up('f');
const s1 = await ev(`(() => { const s = window.stateManager.state; return { vx: s.ship.vx, vy: s.ship.vy, speed: Math.hypot(s.ship.vx, s.ship.vy), projectiles: s.projectiles.length, npcs: s.npcShips.map(n => n.type + '@' + Math.round(Math.hypot(n.x - s.ship.x, n.y - s.ship.y))), target: s.targeting?.selectedId ?? s.targeting, weapon: s.ship.weapons[s.ship.currentWeapon] }; })()`);
note('after flying/firing: ' + JSON.stringify(s1));

// frame timing sample (5s) while NPCs are around
const perf = await ev(`new Promise(res => { const ds = []; let last = performance.now(); let n = 0; const f = (t) => { ds.push(t - last); last = t; if (++n < 300) requestAnimationFrame(f); else { ds.sort((a,b)=>a-b); res({ frames: ds.length, p50: ds[Math.floor(ds.length*0.5)].toFixed(2), p95: ds[Math.floor(ds.length*0.95)].toFixed(2), max: ds[ds.length-1].toFixed(2), npcs: window.stateManager.state.npcShips.length, asteroids: window.stateManager.state.asteroids.length, quality: window.stateManager.state.renderSettings?.quality }); } }; requestAnimationFrame(f); })`);
note('frame timing: ' + JSON.stringify(perf));

// let NPCs accumulate and shoot at us for a bit, then screenshot combat
await sleep(6000);
await shot('05_combat_ambient');
const s2 = await ev(`(() => { const s = window.stateManager.state; return { hp: s.ship.health, npcs: s.npcShips.map(n => n.type), kills: s.ship.kills, credits: s.ship.credits, explosions: s.explosions.length }; })()`);
note('ambient: ' + JSON.stringify(s2));

// ---------- land ----------
await ev(`(() => { const s = window.stateManager.state; const p = s.planets[0]; s.ship.x = p.x + p.radius + 20; s.ship.y = p.y; s.ship.vx = 0; s.ship.vy = 0; })()`);
await page.keyboard.press('l');
await sleep(1200);
await shot('06_landing');
const land = await ev(`(() => ({ planet: document.getElementById('planetName')?.innerText, msg: document.getElementById('landingMessage')?.innerText, desc: document.getElementById('planetDescription')?.innerText, details: document.getElementById('landingDetails')?.innerText, paused: window.stateManager.state.paused }))()`);
note('landing: ' + JSON.stringify(land));
for (const [key, name] of [['3', '07_trade'], ['4', '08_outfitter'], ['5', '09_missions'], ['6', '10_shipyard'], ['2', '11_station']]) {
  await page.keyboard.press(key);
  await sleep(600);
  await shot(name);
  const txt = await ev(`document.getElementById('landingContent')?.innerText.slice(0, 1500)`);
  note(`${name}: ${JSON.stringify(txt)}`);
}
await page.keyboard.press('1');
await sleep(800);
await shot('12_departed');
note('after depart paused=' + await ev(`window.stateManager.state.paused`));

// ---------- zone advance (gate not met) ----------
await page.keyboard.press('z');
await sleep(500);
await shot('13_zone_gate_refused');

// ---------- meet gate, advance to zone 2 ----------
const RS = `(await import('/docs/js/systems/RunSystem.js')).getRunSystem()`;
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; })()`);
await page.keyboard.press('z');
await sleep(1500);
await shot('14_zone2');
note('zone2: ' + JSON.stringify(await ev(`(async () => { const rs = ${RS}; return { zone: rs.getCurrentZone().name, npcs: window.stateManager.state.npcShips.map(n => n.type) }; })()`)));
await sleep(5000);
await shot('15_zone2_ambient');
note('zone2 ambient npcs: ' + JSON.stringify(await ev(`window.stateManager.state.npcShips.map(n => n.type + ':' + Math.round(n.health))`)));

// ---------- zone 3 + boss ----------
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 15; window.stateManager.state.ship.credits = 6000; })()`);
await page.keyboard.press('z');
await sleep(1500);
await shot('16_zone3');
await sleep(4000);
note('zone3 npcs: ' + JSON.stringify(await ev(`window.stateManager.state.npcShips.map(n => n.type + ':' + Math.round(n.health))`)));
// does the boss spawn naturally? record stats first
note('zone3 canAdvance before boss: ' + await ev(`(async () => (${RS}).canAdvance())()`));
await ev(`(async () => { const rs = ${RS}; rs.spawnZoneBoss(); })()`);
await sleep(1500);
await shot('17_boss_spawned');
const boss = await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); return b ? { name: b.name, hp: b.health, max: b.maxHealth, size: b.size, weapon: b.weapon, dist: Math.round(Math.hypot(b.x - s.ship.x, b.y - s.ship.y)), phase: b.bossPhase ?? b.phase, keys: Object.keys(b).slice(0, 40) } : null; })()`);
note('boss: ' + JSON.stringify(boss));
// fight it a bit with real fire
await page.keyboard.press('x');
await page.keyboard.down('f');
await sleep(2500);
await page.keyboard.up('f');
await shot('18_boss_fight');
note('boss mid-fight: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); return { bossHp: b?.health, playerHp: s.ship.health, npcs: s.npcShips.length }; })()`)));
// force boss to low HP then let the sim kill it
await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); if (b) { b.health = 1; } })()`);
await page.keyboard.down('f');
await sleep(2500);
await page.keyboard.up('f');
let bossDead = await ev(`(async () => { const rs = ${RS}; return { bossesDefeated: rs._runStats.bossesDefeated, bossAlive: !!window.stateManager.state.npcShips.find(n => n.type === 'boss'), canAdvance: rs.canAdvance() }; })()`);
note('after boss kill attempt: ' + JSON.stringify(bossDead));
if (!bossDead.bossesDefeated.length) {
  await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); if (b) { b.health = 0; b.killedBy = 'player'; } })()`);
  await sleep(1500);
  bossDead = await ev(`(async () => { const rs = ${RS}; return { bossesDefeated: rs._runStats.bossesDefeated, bossAlive: !!window.stateManager.state.npcShips.find(n => n.type === 'boss'), canAdvance: rs.canAdvance() }; })()`);
  note('after forcing health=0: ' + JSON.stringify(bossDead));
}
await shot('19_boss_defeated');
note('meta after boss: ' + await ev(`localStorage.getItem('galaxyTraderMeta')`));

// ---------- zone 4 + final boss ----------
await page.keyboard.press('z');
await sleep(1500);
await shot('20_zone4');
await sleep(3000);
note('zone4 npcs: ' + JSON.stringify(await ev(`window.stateManager.state.npcShips.map(n => n.type + ':' + Math.round(n.health))`)));
await ev(`(async () => { const rs = ${RS}; rs.spawnZoneBoss(); })()`);
await sleep(1500);
await shot('21_final_boss');
note('final boss: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); return b ? { name: b.name, hp: b.health, weapon: b.weapon } : null; })()`)));
await page.keyboard.down('f');
await sleep(2000);
await page.keyboard.up('f');
await shot('22_final_boss_fight');
await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); if (b) { b.health = 0; b.killedBy = 'player'; } })()`);
await sleep(2500);
await shot('23_victory');
const victory = await ev(`(() => ({ deathVisible: getComputedStyle(document.getElementById('deathScreenOverlay')).display, title: document.querySelector('.death-title')?.innerText, summary: document.getElementById('runSummary')?.innerText, unlocks: document.getElementById('deathUnlocks')?.innerText, meta: localStorage.getItem('galaxyTraderMeta') }))()`);
note('victory screen: ' + JSON.stringify(victory));

// ---------- new run, die ----------
await page.click('#retryRunBtn').catch(() => {});
await sleep(1500);
await shot('24_after_retry');
note('after retry: ' + JSON.stringify(await ev(`(() => { const s = window.stateManager.state; return { paused: s.paused, menuVisible: getComputedStyle(document.getElementById('mainMenuOverlay')).display, deathVisible: getComputedStyle(document.getElementById('deathScreenOverlay')).display, hp: s.ship.health, credits: s.ship.credits, engineLevel: s.ship.engineLevel, weapons: s.ship.weapons, shipClass: s.ship.shipClass, kills: s.ship.kills }; })()`)));
// if menu shown, start a run
const menuShown = await ev(`getComputedStyle(document.getElementById('mainMenuOverlay')).display !== 'none'`);
if (menuShown) { await shot('25_menu_after_victory'); await page.click('#startRunBtn'); await sleep(1500); }
await ev(`(() => { const s = window.stateManager.state; s.ship.health = 0; })()`);
await sleep(2500);
await shot('26_death_screen');
note('death: ' + JSON.stringify(await ev(`(() => ({ title: document.querySelector('.death-title')?.innerText, zone: document.getElementById('deathZone')?.innerText, summary: document.getElementById('runSummary')?.innerText, meta: localStorage.getItem('galaxyTraderMeta') }))()`)));
await page.click('#mainMenuBtn').catch(() => {});
await sleep(1200);
await shot('27_menu_after_death');
note('menu after death: ' + JSON.stringify(await ev(`({ metaStats: document.getElementById('metaStats')?.innerText, carousel: document.getElementById('shipCarousel')?.innerText.slice(0, 600) })`)));

// ---------- console summary ----------
const errs = consoleMsgs.filter(m => /^\[(error|pageerror|warning)\]/.test(m));
note(`console: ${consoleMsgs.length} messages, ${errs.length} warn/err`);
for (const e of errs.slice(0, 40)) note('  ' + e.slice(0, 300));
const tags = {};
for (const m of consoleMsgs) { const t = (m.match(/\[[A-Za-z]+\]/g) || ['none'])[1] || 'none'; tags[t] = (tags[t] || 0) + 1; }
note('console tags: ' + JSON.stringify(tags));

await browser.close();
