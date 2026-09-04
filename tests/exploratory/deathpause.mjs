// Phase 0 batch A verification: death screen path, timer-based boss trigger, blur/focus pause discipline.
// Usage: CHROMIUM_PATH=... node tests/exploratory/deathpause.mjs   (needs a server on :8000)
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
await page.waitForTimeout(400);

// --- blur/focus while running: InputSystem owns the pause and releases it
await ev(`window.dispatchEvent(new Event('blur'))`); await page.waitForTimeout(150);
const blurRunning = await ev(`(() => ({ paused: window.stateManager.state.paused, blurPaused: window.systems.input._blurPaused }))()`);
await ev(`window.dispatchEvent(new Event('focus'))`); await page.waitForTimeout(150);
const focusRunning = await ev(`(() => ({ paused: window.stateManager.state.paused }))()`);
console.log('blur/focus while running:', JSON.stringify({ blurRunning, focusRunning }));

// --- blur/focus while paused for another reason: focus must NOT resume
await ev(`window.stateManager.state.paused = true`); await page.waitForTimeout(100);
await ev(`window.dispatchEvent(new Event('blur'))`); await page.waitForTimeout(150);
const blurPausedState = await ev(`(() => ({ paused: window.stateManager.state.paused, blurPaused: window.systems.input._blurPaused }))()`);
await ev(`window.dispatchEvent(new Event('focus'))`); await page.waitForTimeout(150);
const focusPausedState = await ev(`(() => ({ paused: window.stateManager.state.paused }))()`);
console.log('blur/focus while already paused:', JSON.stringify({ blurPausedState, focusPausedState }));
await ev(`window.stateManager.state.paused = false`); await page.waitForTimeout(100);

// --- timer-based boss trigger (maxDelayMs shortened to 2.5s, zero kills in zone)
await ev(`(async () => { const z = await import('/docs/js/data/zones.js'); z.zones.find(x => x.id === 'outer_rim').bossTrigger.maxDelayMs = 2500; })()`);
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(300);
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 15; window.stateManager.state.ship.credits = 6000; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(300);
console.log('zone:', await ev(`(async () => (${RS}).getCurrentZone().name)()`), 'boss now:', await ev(`window.stateManager.state.npcShips.some(n => n.type === 'boss')`));
await page.waitForTimeout(3000);
console.log('TIMER TRIGGER after 3s, 0 kills:', JSON.stringify(await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); return { zoneKills: rs.getRunStats().zoneKills, bossSpawned: rs._bossSpawned, bossName: b?.name }; })()`)));

// --- death path: overlay shows, no victory styling, unlocks from this run listed, world paused
await ev(`(() => { const s = window.stateManager.state; s.npcShips = []; s.projectiles = []; s.ship.health = 0; })()`);
await page.waitForTimeout(1400);
const death = await ev(`(() => { const o = document.getElementById('deathScreenOverlay'); return { display: getComputedStyle(o).display, classes: o.className, title: o.querySelector('.death-title')?.textContent, zoneLine: document.getElementById('deathZone')?.textContent, retryBtn: document.getElementById('retryRunBtn')?.textContent, unlocksVisible: getComputedStyle(document.getElementById('deathUnlocks')).display, unlocks: document.getElementById('deathUnlocks')?.innerText, credits: document.getElementById('deathCredits')?.textContent, paused: window.stateManager.state.paused, meta: JSON.parse(localStorage.getItem('galaxyTraderMeta')).stats }; })()`);
console.log('DEATH SCREEN:', JSON.stringify(death, null, 1));

// --- retry unpauses
await page.click('#retryRunBtn'); await page.waitForTimeout(500);
console.log('after TRY AGAIN:', JSON.stringify(await ev(`(() => ({ paused: window.stateManager.state.paused, death: getComputedStyle(document.getElementById('deathScreenOverlay')).display, hp: window.stateManager.state.ship.health }))()`)));

console.log('errors:', msgs.filter(m => /\[error\]|pageerror/.test(m) && !/403|404|Failed to load resource/.test(m)).slice(0, 5));
await browser.close();
