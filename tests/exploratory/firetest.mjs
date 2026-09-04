import { chromium } from 'playwright';
const BASE = 'http://localhost:8000/docs/index.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const msgs = []; page.on('console', m => msgs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror', e => msgs.push('[pageerror] ' + e.message));
const ev = (c) => page.evaluate(c);
await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1500);
await page.click('#startRunBtn');
await page.waitForFunction(() => window.stateManager.state.paused === false);
await page.waitForTimeout(500);
await ev(`(() => { const s = window.stateManager.state; s.ship.weapons = [{ type: 'rapid', damage: 5, cooldown: 12, speed: 2 }]; s.ship.currentWeapon = 0; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; })()`);
// spawn a pirate via the spawn system and place it ahead
const sp = await ev(`(() => { const s = window.stateManager.state; const n = window.systems.spawn.spawnNPC(); const list = s.npcShips; const p = list[list.length - 1]; return { returned: typeof n, type: p?.type, keys: p && Object.keys(p).slice(0, 12) }; })()`);
console.log('spawnNPC ->', JSON.stringify(sp));
await ev(`(() => { const s = window.stateManager.state; const p = s.npcShips[s.npcShips.length - 1]; p.x = s.ship.x + 120; p.y = s.ship.y; p.vx = 0; p.vy = 0; p.health = 9; p.maxSpeed = 0; p.thrust = 0; })()`);
await page.keyboard.down('f');
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(150);
  console.log(JSON.stringify(await ev(`(() => { const s = window.stateManager.state; const p = s.npcShips[s.npcShips.length - 1]; return { t: ${i}, keysF: s.input?.keys?.has ? s.input.keys.has('f') : [...(s.input?.keys||[])], cd: Math.round(s.ship.weaponCooldown), proj: s.projectiles.length, projPos: s.projectiles.slice(0,2).map(q => [Math.round(q.x - s.ship.x), Math.round(q.y - s.ship.y), q.isPlayer]), npc: p && { type: p.type, hp: p.health, dx: Math.round(p.x - s.ship.x), dy: Math.round(p.y - s.ship.y), killedBy: p.killedBy }, kills: s.ship.kills, angle: +s.ship.angle.toFixed(2) }; })()`)));
}
await page.keyboard.up('f');
console.log('errors:', msgs.filter(m => /error|pageerror/.test(m)).slice(0, 5));
await browser.close();
