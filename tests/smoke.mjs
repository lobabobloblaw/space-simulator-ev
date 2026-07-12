// End-to-end smoke test: boots the real game in headless Chromium and
// exercises the paths that have regressed before (pause, cooldowns, trading,
// death sequence, save/load round-trip).
//
// Usage:
//   npm install && npx playwright install chromium   (once)
//   npm test
// The test starts its own static server for the repo root.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.gif': 'image/gif' };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/docs/index.html`;

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const url = (m.location() && m.location().url) || '';
  const text = m.text();
  // External resources (Google Fonts, planet imagery) may be unreachable in CI
  if (/Failed to load resource|net::/.test(text) && !url.includes('127.0.0.1')) return;
  consoleErrors.push(text + ' @ ' + url);
});
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.eventBus && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1500);
check('boot: no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

// Roguelike: the game boots paused at the main menu — start a run first
await page.evaluate(() => document.getElementById('startRunBtn')?.click());
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 });
await page.waitForTimeout(300);

// Pause freezes the world
const pauseRes = await page.evaluate(async () => {
  const { eventBus, stateManager, GameEvents } = window;
  const s = stateManager.state;
  eventBus.emit(GameEvents.GAME_PAUSE_TOGGLE);
  const paused = !!s.paused;
  s.ship.vx = 0.5; s.ship.vy = 0;
  const x0 = s.ship.x;
  await new Promise(r => setTimeout(r, 400));
  const moved = Math.abs(s.ship.x - x0) > 0.01;
  eventBus.emit(GameEvents.GAME_PAUSE_TOGGLE);
  const resumed = !s.paused;
  s.ship.vx = 0;
  return { paused, moved, resumed };
});
check('pause: toggle pauses and resumes', pauseRes.paused && !pauseRes.moved && pauseRes.resumed, JSON.stringify(pauseRes));

// Weapon cooldown decrements once per tick (double-decrement regression)
const cdRes = await page.evaluate(async () => {
  const s = window.stateManager.state;
  s.ship.weaponCooldown = 300;
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 1000));
  const elapsedTicks = (performance.now() - t0) / (1000 / 60);
  return { remaining: s.ship.weaponCooldown, expected: 300 - elapsedTicks };
});
check('weapon cooldown: single decrement per tick', Math.abs(cdRes.remaining - cdRes.expected) < 15, JSON.stringify(cdRes));

// One trading click = one purchase (double-delegate regression)
const tradeRes = await page.evaluate(async () => {
  const { eventBus, stateManager, GameEvents } = window;
  const s = stateManager.state;
  const planet = s.planets[0];
  s.ship.x = planet.x + planet.radius + 20;
  s.ship.y = planet.y;
  s.ship.vx = 0; s.ship.vy = 0;
  s.ship.isLanded = true;
  s.ship.landedPlanet = planet;
  s.ship.credits = 1000;
  s.ship.cargo = [];
  const gameData = await import('/docs/js/data/gameData.js');
  eventBus.emit(GameEvents.MENU_OPEN, { panel: 'trading', ship: s.ship, commodities: gameData.commodities });
  await new Promise(r => setTimeout(r, 300));
  const btn = document.querySelector('#commodityList button[data-action="buy"]:not([disabled])');
  if (!btn) return { error: 'no buy button found' };
  btn.click();
  await new Promise(r => setTimeout(r, 300));
  return { creditsAfter: s.ship.credits, cargoCount: s.ship.cargo.length };
});
check('trading: one click = one purchase', tradeRes.cargoCount === 1, JSON.stringify(tradeRes));

// Death sequence runs exactly once despite multiple SHIP_DEATH emitters
const deathRes = await page.evaluate(async () => {
  const { eventBus, stateManager, GameEvents } = window;
  const s = stateManager.state;
  s.ship.isLanded = false; s.ship.landedPlanet = null;
  s.npcShips = []; s.projectiles = [];
  s.explosions = [];
  s.ship.health = 5;
  s.ship.health = 0;                                    // StateManager emits SHIP_DAMAGE + SHIP_DEATH
  eventBus.emit(GameEvents.SHIP_DAMAGE, { damage: 5 }); // WeaponSystem-style follow-up
  eventBus.emit(GameEvents.SHIP_DEATH);                 // extra direct emit
  await new Promise(r => setTimeout(r, 900));
  const large = (s.explosions || []).filter(e => e.maxRadius >= 80).length;
  return { isDestroyed: s.ship.isDestroyed, largeExplosions: large };
});
check('death: destruct sequence runs exactly once', deathRes.isDestroyed === true && deathRes.largeExplosions === 1, JSON.stringify(deathRes));

// Manual save is immediate/full; engine, reputation, mission survive reload
const saveRes = await page.evaluate(async () => {
  const { eventBus, stateManager, GameEvents } = window;
  const s = stateManager.state;
  s.ship.isDestroyed = false; s.ship.health = 100;
  s.ship.engineLevel = 2;
  s.ship.maxSpeed = 1.0; s.ship.thrust = 0.015;
  s.reputation.trader = 7;
  s.missionSystem.active = s.missionSystem.available[1] || s.missionSystem.available[0];
  const activeId = s.missionSystem.active.id;
  localStorage.removeItem('galaxyTraderSave');
  const t0 = Date.now();
  eventBus.emit(GameEvents.GAME_SAVE, { reason: 'manual' });
  let saved = null;
  while (Date.now() - t0 < 4000) {
    const raw = localStorage.getItem('galaxyTraderSave');
    if (raw) { saved = JSON.parse(raw); break; }
    await new Promise(r => setTimeout(r, 100));
  }
  if (!saved) return { error: 'save never written within 4s' };
  return { activeId, savedActiveId: saved.mission?.activeId, savedRep: saved.reputation?.trader, savedEngine: saved.ship?.engineLevel };
});
check('save: manual save prompt and complete', !saveRes.error && saveRes.savedActiveId === saveRes.activeId && saveRes.savedRep === 7 && saveRes.savedEngine === 2, JSON.stringify(saveRes));

const errsBeforeReload = consoleErrors.length;
await page.goto(BASE);
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1200);
const reloadRes = await page.evaluate(() => {
  const s = window.stateManager.state;
  return { engineLevel: s.ship.engineLevel, maxSpeed: s.ship.maxSpeed, repTrader: s.reputation?.trader, activeMission: s.missionSystem?.active?.id || null };
});
check('reload: engine effect + reputation + mission restored',
  reloadRes.engineLevel === 2 && Math.abs(reloadRes.maxSpeed - 1.0) < 1e-9 && reloadRes.repTrader === 7 && reloadRes.activeMission === saveRes.activeId,
  JSON.stringify(reloadRes));
check('reload: no console errors', consoleErrors.length === errsBeforeReload, consoleErrors.slice(errsBeforeReload).slice(0, 3).join(' | '));

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
