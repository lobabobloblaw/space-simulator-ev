import { chromium } from 'playwright';
const BASE = 'http://localhost:8000/docs/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const ev = (c) => page.evaluate(c);
await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.click('#startRunBtn');
await page.waitForFunction(() => window.stateManager.state.paused === false);
await page.waitForTimeout(4000); // past boot ramp
const sample = (label) => ev(`new Promise(res => { const ds = []; let last = performance.now(); let n = 0; const f = (t) => { ds.push(t - last); last = t; if (++n < 240) requestAnimationFrame(f); else { ds.sort((a,b)=>a-b); const s = window.stateManager.state; res({ label: '${label}', p50: +ds[Math.floor(ds.length*0.5)].toFixed(1), p95: +ds[Math.floor(ds.length*0.95)].toFixed(1), max: +ds[ds.length-1].toFixed(1), npcs: s.npcShips.length, proj: s.projectiles.length, ast: s.asteroids.length, quality: s.renderSettings?.quality, lastFrameMs: +(window.__lastFrameMs||0).toFixed(1) }); } }; requestAnimationFrame(f); })`);
console.log(JSON.stringify(await sample('baseline 1080p@2x')));
// force high quality, disable auto quality if possible
await ev(`(() => { const s = window.stateManager.state; s.renderSettings.quality = 'high'; if (window.systems?.render) { window.systems.render.autoQuality = false; window.systems.render._autoQuality = false; } })()`);
// stress: 40 NPCs around the player, all hostile
await ev(`(() => { const s = window.stateManager.state; for (let i = 0; i < 40; i++) { window.systems.spawn.spawnNPC(); } for (const n of s.npcShips) { const a = Math.random()*Math.PI*2, r = 200 + Math.random()*500; n.x = s.ship.x + Math.cos(a)*r; n.y = s.ship.y + Math.sin(a)*r; } s.ship.weapons = [{ type: 'rapid', damage: 5, cooldown: 2, speed: 2 }]; s.ship.currentWeapon = 0; })()`);
await page.keyboard.down('f');
await page.keyboard.down('w');
await page.keyboard.down('a');
await page.waitForTimeout(1500);
console.log(JSON.stringify(await sample('40 NPCs + firing, high')));
await ev(`(() => { const s = window.stateManager.state; for (let i = 0; i < 60; i++) { window.systems.spawn.spawnNPC(); } for (const n of s.npcShips) { const a = Math.random()*Math.PI*2, r = 200 + Math.random()*600; n.x = s.ship.x + Math.cos(a)*r; n.y = s.ship.y + Math.sin(a)*r; } })()`);
await page.waitForTimeout(1000);
console.log(JSON.stringify(await sample('100 NPCs + firing, high')));
await ev(`window.stateManager.state.renderSettings.quality = 'low'`);
await page.waitForTimeout(500);
console.log(JSON.stringify(await sample('100 NPCs + firing, low')));
await page.keyboard.up('f'); await page.keyboard.up('w'); await page.keyboard.up('a');
// profile breakdown if available
console.log('profile:', JSON.stringify(await ev(`window.LAST_UPDATE_PROFILE || null`)).slice(0, 600));
await page.screenshot({ path: './shots/50_stress.png' });
await browser.close();
