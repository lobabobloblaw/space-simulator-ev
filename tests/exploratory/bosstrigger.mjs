// Phase 0 batch A verification: natural boss trigger, boss phases/adds, victory screen.
// Usage: CHROMIUM_PATH=... node tests/exploratory/bosstrigger.mjs   (needs a server on :8000)
import { chromium } from 'playwright';
const BASE = 'http://localhost:8000/docs/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const msgs = []; page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror', e => msgs.push('[pageerror] ' + e.message));
const ev = (c) => page.evaluate(c);
const RS = `(await import('/docs/js/systems/RunSystem.js')).getRunSystem()`;

await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.click('#startRunBtn');
await page.waitForFunction(() => window.stateManager.state.paused === false);
await page.waitForTimeout(500);
await ev(`(() => { const s = window.stateManager.state; s.ship.weapons = [{ type: 'rapid', damage: 5, cooldown: 12, speed: 2 }]; s.ship.currentWeapon = 0; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; })()`);

// Jump core -> frontier -> outer_rim (the first boss zone)
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(400);
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 15; window.stateManager.state.ship.credits = 6000; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(500);
console.log('zone:', await ev(`(async () => (${RS}).getCurrentZone().name)()`));
console.log('trigger armed:', JSON.stringify(await ev(`(async () => { const rs = ${RS}; const st = rs.getRunStats(); return { zoneKills: st.zoneKills, bossTriggerKills: st.bossTriggerKills, timer: !!rs._bossTimer, bossSpawned: rs._bossSpawned }; })()`)));

// Kill three NPCs with real projectiles — no spawnZoneBoss() call anywhere below
const killOne = async (n) => {
  await ev(`(() => { const s = window.stateManager.state; s.npcShips = []; s.projectiles = []; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; window.systems.spawn.spawnNPC(); const p = s.npcShips[s.npcShips.length - 1]; p.x = s.ship.x + 120; p.y = s.ship.y; p.vx = 0; p.vy = 0; p.health = 9; p.maxSpeed = 0; p.thrust = 0; })()`);
  await page.keyboard.down('f');
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(150);
    const r = await ev(`(async () => { const s = window.stateManager.state; const rs = ${RS}; const st = rs.getRunStats(); return { boss: !!s.npcShips.find(x => x.type === 'boss'), alive: s.npcShips.filter(x => x.type !== 'boss' && x.health > 0).length, zoneKills: st.zoneKills, hint: document.getElementById('tutorialHint')?.innerText }; })()`);
    if (r.alive === 0) { console.log(`kill ${n}:`, JSON.stringify(r)); break; }
  }
  await page.keyboard.up('f');
  await page.waitForTimeout(250);
};
await killOne(1);
await killOne(2);
console.log('after 2 kills:', JSON.stringify(await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; return { zoneKills: rs.getRunStats().zoneKills, warned: rs._bossWarned, boss: !!s.npcShips.find(x => x.type === 'boss'), hint: document.getElementById('tutorialHint')?.innerText }; })()`)));
await killOne(3);
await page.waitForTimeout(600);
const trig = await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; const b = s.npcShips.find(x => x.type === 'boss'); return { zoneKills: rs.getRunStats().zoneKills, bossSpawned: rs._bossSpawned, bossPresent: !!b, bossName: b?.name, bossType: b?.type, hint: document.getElementById('tutorialHint')?.innerText }; })()`);
console.log('NATURAL TRIGGER:', JSON.stringify(trig));
console.log('spawnZoneBoss called from test:', false);

// Boss phase: drop Blackstar to 40% health -> phase 1 (berserk) + 2 adds
const before = await ev(`(() => window.stateManager.state.npcShips.length)()`);
await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); b.x = s.ship.x + 300; b.y = s.ship.y; b.health = Math.round(b.maxHealth * 0.4); })()`);
await page.waitForTimeout(600);
const phase = await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); return { lastPhase: b._lastPhase, behavior: b.phases[b._lastPhase]?.behavior, hp: b.health, npcsBefore: ${before}, npcsAfter: s.npcShips.length, adds: s.npcShips.filter(n => n.isBossAdd).map(n => n.type) }; })()`);
console.log('PHASE:', JSON.stringify(phase));

// Finish the run: kill this boss, jump to the void, kill the Void King -> victory screen
await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); s.npcShips = [b]; b.x = s.ship.x + 120; b.y = s.ship.y; b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0; b.health = 9; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; s.ship.health = s.ship.maxHealth; })()`);
await page.keyboard.down('f'); await page.waitForTimeout(1600); await page.keyboard.up('f');
console.log('blackstar dead:', JSON.stringify(await ev(`(async () => (${RS})._runStats.bossesDefeated)()`)));
await page.keyboard.press('z'); await page.waitForTimeout(700);
await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; s.npcShips = []; s.ship.vx = 0; s.ship.vy = 0; s.ship.health = s.ship.maxHealth; rs.spawnZoneBoss(); })()`);
await page.waitForTimeout(400);
await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); b.x = s.ship.x + 120; b.y = s.ship.y; b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0; b.health = 9; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; })()`);
await page.keyboard.down('f'); await page.waitForTimeout(1800); await page.keyboard.up('f');
await page.waitForTimeout(800);
const victory = await ev(`(() => { const o = document.getElementById('deathScreenOverlay'); return { display: getComputedStyle(o).display, classes: o.className, title: o.querySelector('.death-title')?.textContent, zoneLine: document.getElementById('deathZone')?.textContent, retryBtn: document.getElementById('retryRunBtn')?.textContent, unlocksVisible: getComputedStyle(document.getElementById('deathUnlocks')).display, unlocks: document.getElementById('deathUnlocks')?.innerText, credits: document.getElementById('deathCredits')?.textContent, kills: document.getElementById('deathKills')?.textContent, paused: window.stateManager.state.paused, meta: localStorage.getItem('galaxyTraderMeta') }; })()`);
console.log('VICTORY SCREEN:', JSON.stringify(victory, null, 1));

// Main menu returns to a paused world
await page.click('#mainMenuBtn'); await page.waitForTimeout(400);
console.log('after MAIN MENU:', JSON.stringify(await ev(`(() => ({ paused: window.stateManager.state.paused, menu: getComputedStyle(document.getElementById('mainMenuOverlay')).display, death: getComputedStyle(document.getElementById('deathScreenOverlay')).display }))()`)));

console.log('errors:', msgs.filter(m => /\[error\]|pageerror/.test(m) && !/403|404|Failed to load resource/.test(m)).slice(0, 5));
await browser.close();
