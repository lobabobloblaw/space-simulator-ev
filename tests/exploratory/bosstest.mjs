import { chromium } from 'playwright';
const SHOTS = './shots';
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
// jump to outer_rim
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(400);
await ev(`(async () => { const rs = ${RS}; rs._runStats.kills = 15; window.stateManager.state.ship.credits = 6000; })()`);
await page.keyboard.press('z'); await page.waitForTimeout(400);
console.log('zone:', await ev(`(async () => (${RS}).getCurrentZone().name)()`));
const killBoss = async (label) => {
  await ev(`(async () => { (${RS}).spawnZoneBoss(); })()`);
  await page.waitForTimeout(300);
  console.log(label, 'spawned:', JSON.stringify(await ev(`(() => { const s = window.stateManager.state; const b = s.npcShips.find(n => n.type === 'boss'); if (!b) return null; b.x = s.ship.x + 120; b.y = s.ship.y; b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0; b.health = 9; s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0; return { name: b.name, hp: b.health, size: b.size, weapon: b.weapon.type }; })()`)));
  await page.keyboard.down('f');
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(200);
    const r = await ev(`(async () => { const s = window.stateManager.state; const rs = ${RS}; const b = s.npcShips.find(n => n.type === 'boss'); return { t: ${i}, proj: s.projectiles.length, boss: b && { hp: b.health, dx: Math.round(b.x - s.ship.x), dy: Math.round(b.y - s.ship.y), killedBy: b.killedBy, dead: b.deathEventEmitted }, defeated: rs._runStats.bossesDefeated, canAdv: rs.canAdvance(), runActive: rs.isRunActive(), credits: s.ship.credits, hint: document.getElementById('tutorialHint')?.innerText }; })()`);
    console.log(JSON.stringify(r));
    if (!r.boss) break;
  }
  await page.keyboard.up('f');
};
await killBoss('blackstar');
await page.waitForTimeout(1500);
console.log('meta after blackstar:', await ev(`localStorage.getItem('galaxyTraderMeta')`));
console.log('body has Unlocked:', await ev(`(document.body.innerText.match(/Unlock[^\\n]*/i)||[null])[0]`));
await page.screenshot({ path: SHOTS + '/40_after_blackstar.png' });
await page.keyboard.press('z'); await page.waitForTimeout(800);
console.log('zone:', await ev(`(async () => (${RS}).getCurrentZone().name)()`));
await page.screenshot({ path: SHOTS + '/41_void_zone.png' });
await page.waitForTimeout(2500);
console.log('void npcs:', JSON.stringify(await ev(`window.stateManager.state.npcShips.map(n => n.type + ':' + Math.round(n.health))`)));
await ev(`(() => { const s = window.stateManager.state; s.ship.vx = 0; s.ship.vy = 0; })()`);
await killBoss('voidking');
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(700);
  console.log('post-victory', i, JSON.stringify(await ev(`(async () => { const rs = ${RS}; const s = window.stateManager.state; return { runActive: rs.isRunActive(), paused: s.paused, death: getComputedStyle(document.getElementById('deathScreenOverlay')).display, menu: getComputedStyle(document.getElementById('mainMenuOverlay')).display, hint: document.getElementById('tutorialHint')?.innerText, npcs: s.npcShips.length, meta: localStorage.getItem('galaxyTraderMeta') }; })()`)));
}
await page.screenshot({ path: SHOTS + '/42_after_victory.png' });
console.log('errors:', msgs.filter(m => /error|pageerror/.test(m) && !/403/.test(m)).slice(0, 5));
console.log('run logs:', msgs.filter(m => /RunSystem|Roguelike|MetaState|DeathScreen|victory/i.test(m)).slice(-14).join('\n'));
await browser.close();
