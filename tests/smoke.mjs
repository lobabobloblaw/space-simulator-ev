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

// ============================================================================
// Scenario 2: run-to-victory — boots fresh, plays a full roguelike run start
// to finish (Core -> Frontier -> Outer Rim -> The Void), killing NPCs and all
// three zone bosses with real projectiles (never calling spawnZoneBoss()
// directly, so the boss-trigger regression stays covered), reaches the victory screen,
// unlocks the battlecruiser, starts a run with it, then dies and retries.
// ============================================================================

// Spawn an NPC via the real spawn system, place it `distance` units ahead of
// the ship along the ship's current heading, freeze it, and set its health.
// Tags the entity with a unique id so callers can track it across polls.
async function spawnAhead(page, { health = 6, distance = 120 } = {}) {
  return page.evaluate(({ health, distance }) => {
    try {
      const s = window.stateManager.state;
      s.ship.vx = 0; s.ship.vy = 0;
      window.systems.spawn.spawnNPC();
      const npc = s.npcShips[s.npcShips.length - 1];
      if (!npc) return { error: 'spawnNPC produced no npcShips entry' };
      const testId = 'smoke_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      npc.__testId = testId;
      npc.x = s.ship.x + Math.cos(s.ship.angle) * distance;
      npc.y = s.ship.y + Math.sin(s.ship.angle) * distance;
      npc.vx = 0; npc.vy = 0; npc.thrust = 0; npc.maxSpeed = 0;
      npc.health = health;
      return { testId, type: npc.type };
    } catch (e) { return { error: String((e && e.message) || e) }; }
  }, { health, distance });
}

// Hold 'f' (real keyboard input) until the tagged NPC is fully gone from
// npcShips (dead + destruct sequence finished), or maxMs elapses.
async function killTaggedNPC(page, testId, maxMs = 4000) {
  await page.keyboard.down('f');
  let ok = true;
  try {
    await page.waitForFunction((id) => {
      const s = window.stateManager && window.stateManager.state;
      return !!s && !s.npcShips.some((n) => n.__testId === id);
    }, testId, { timeout: maxMs, polling: 100 });
  } catch {
    ok = false;
  }
  await page.keyboard.up('f');
  return ok;
}

// Hold 'f' until an in-page predicate (no Node closures — only window
// globals) becomes true, or maxMs elapses. Used for boss kills, where we
// wait on RunSystem's recorded defeat rather than array removal.
async function fireUntil(page, predicateFn, maxMs = 5000) {
  await page.keyboard.down('f');
  let ok = true;
  try {
    await page.waitForFunction(predicateFn, null, { timeout: maxMs, polling: 100 });
  } catch {
    ok = false;
  }
  await page.keyboard.up('f');
  return ok;
}

// Kill `count` real NPCs one at a time via spawnAhead/killTaggedNPC, sweeping
// dead leftovers between kills. Used for the natural (kills-based) boss
// trigger in Frontier, Outer Rim and The Void — spawnZoneBoss() is never called.
async function killNRealNPCs(page, count, health = 6) {
  for (let i = 0; i < count; i++) {
    const sp = await spawnAhead(page, { health });
    if (sp.error) return { ok: false, detail: 'spawn: ' + sp.error };
    const dead = await killTaggedNPC(page, sp.testId, 4000);
    if (!dead) return { ok: false, detail: `kill ${i + 1}/${count} timed out` };
    await page.evaluate(() => {
      const s = window.stateManager.state;
      s.npcShips = s.npcShips.filter((n) => n.health > 0 || n.type === 'boss');
    });
  }
  return { ok: true };
}

const errsBeforeVictoryRun = consoleErrors.length;

// --- 1. Fresh boot, start a run ---
await page.goto(BASE + '?fresh=1');
await page.waitForFunction(() => window.stateManager && window.stateManager.state.ship, null, { timeout: 20000 });
await page.waitForTimeout(1000);
await page.evaluate(async () => {
  // Cache the RunSystem singleton on window so later waitForFunction/evaluate
  // calls can use it synchronously instead of re-importing every poll.
  window.__rs = (await import('/docs/js/systems/RunSystem.js')).getRunSystem();
});
await page.evaluate(() => document.getElementById('startRunBtn')?.click());
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);

// --- 2. Ensure the ship is armed; record starting credits ---
const armRes = await page.evaluate(() => {
  try {
    const s = window.stateManager.state;
    if (!s.ship.weapons || s.ship.weapons.length === 0) {
      s.ship.weapons = [{ type: 'rapid', damage: 5, cooldown: 12, speed: 2 }];
      s.ship.currentWeapon = 0;
    }
    s.ship.vx = 0; s.ship.vy = 0; s.ship.angle = 0;
    return { armed: s.ship.weapons.length > 0, startCredits: s.ship.credits };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: run started and ship armed', !armRes.error && armRes.armed === true, JSON.stringify(armRes));
const startCredits = armRes.startCredits || 0;

// --- 3. Real kill: spawn, fire, verify kill count + bounty paid ---
const sp1 = await spawnAhead(page, { health: 6 });
const kill1Ok = sp1.error ? false : await killTaggedNPC(page, sp1.testId, 4000);
const kill1Res = await page.evaluate(() => {
  try {
    const s = window.stateManager.state;
    return { kills: s.ship.kills, statKills: window.__rs.getRunStats().kills, credits: s.ship.credits };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: first real kill registers and pays bounty',
  !sp1.error && kill1Ok && !kill1Res.error && kill1Res.kills === 1 && kill1Res.statKills === 1 && kill1Res.credits > startCredits,
  JSON.stringify({ sp1, kill1Ok, kill1Res, startCredits }));

// --- 4. Advance Core -> Frontier (Core keeps its kill/credit gate) ---
await page.evaluate(() => { window.__rs._runStats.kills = 5; window.stateManager.state.ship.credits = 1200; });
await page.keyboard.press('z');
await page.waitForFunction(() => window.__rs.getCurrentZone().name === 'Frontier Space', null, { timeout: 3000 }).catch(() => {});
const frontierRes = await page.evaluate(() => {
  try {
    return { zoneName: window.__rs.getCurrentZone().name, bossTriggerKills: window.__rs.getRunStats().bossTriggerKills };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: advanced Core -> Frontier',
  !frontierRes.error && frontierRes.zoneName === 'Frontier Space' && frontierRes.bossTriggerKills === 3,
  JSON.stringify(frontierRes));

// --- 4b. Frontier is a boss gate now: 3 real kills summon Warlord Krix ---
await page.evaluate(() => {
  const s = window.stateManager.state;
  s.npcShips = [];
  s.ship.vx = 0; s.ship.vy = 0;
  s.ship.health = s.ship.maxHealth;
});
const trigK = await killNRealNPCs(page, 3, 6);
let krixAppeared = false;
if (trigK.ok) {
  try {
    await page.waitForFunction(() => window.stateManager.state.npcShips.some((n) => n.type === 'boss'), null, { timeout: 3000, polling: 100 });
    krixAppeared = true;
  } catch { krixAppeared = false; }
}
await page.evaluate(() => {
  const s = window.stateManager.state;
  const b = s.npcShips.find((n) => n.type === 'boss');
  if (b) {
    b.x = s.ship.x + Math.cos(s.ship.angle) * 120;
    b.y = s.ship.y + Math.sin(s.ship.angle) * 120;
    b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0;
    b.health = 9;
    s.ship.vx = 0; s.ship.vy = 0;
  }
});
const krixDead = await fireUntil(page, () => window.__rs._runStats.bossesDefeated.includes('warlord_krix'), 5000);
await page.waitForTimeout(300);
const krixRes = await page.evaluate(() => {
  try {
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem('galaxyTraderMeta') || 'null'); } catch {}
    return { unlockShips: meta?.unlocks?.ships || [], canAdvance: window.__rs.canAdvance() };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: Warlord Krix defeated, corvette unlocked, zone advance available',
  trigK.ok && krixAppeared && krixDead && !krixRes.error &&
  krixRes.unlockShips.includes('corvette') && krixRes.canAdvance === true,
  JSON.stringify({ trigK, krixAppeared, krixDead, krixRes }));

// --- 4c. Advance Frontier -> Outer Rim ---
await page.keyboard.press('z');
await page.waitForFunction(() => window.__rs.getCurrentZone().name === 'Outer Rim', null, { timeout: 3000 }).catch(() => {});
await page.evaluate(() => {
  const s = window.stateManager.state;
  s.npcShips = [];
  s.ship.vx = 0; s.ship.vy = 0;
  s.ship.health = s.ship.maxHealth;
});
const zoneRes = await page.evaluate(() => {
  try {
    return { zoneName: window.__rs.getCurrentZone().name, bossTriggerKills: window.__rs.getRunStats().bossTriggerKills };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: advanced Frontier -> Outer Rim',
  !zoneRes.error && zoneRes.zoneName === 'Outer Rim' && zoneRes.bossTriggerKills === 3,
  JSON.stringify(zoneRes));

// --- 5. Natural boss trigger: 3 real kills, spawnZoneBoss() is never called ---
const trig1 = await killNRealNPCs(page, 3, 6);
let bossAppeared1 = false;
if (trig1.ok) {
  try {
    await page.waitForFunction(() => window.stateManager.state.npcShips.some((n) => n.type === 'boss'), null, { timeout: 3000, polling: 100 });
    bossAppeared1 = true;
  } catch { bossAppeared1 = false; }
}
const bossTrigRes = await page.evaluate(() => {
  try {
    const s = window.stateManager.state;
    const boss = s.npcShips.find((n) => n.type === 'boss');
    return { bossPresent: !!boss, bossId: boss?.bossId, bossSpawnedFlag: window.__rs._bossSpawned };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: 3 real kills naturally trigger the Outer Rim boss (no spawnZoneBoss call)',
  trig1.ok && bossAppeared1 && !bossTrigRes.error && bossTrigRes.bossPresent === true && bossTrigRes.bossSpawnedFlag !== false,
  JSON.stringify({ trig1, bossAppeared1, bossTrigRes }));

// --- 6. Kill the zone boss (Captain Blackstar / pirate_lord) with real projectiles ---
await page.evaluate(() => {
  const s = window.stateManager.state;
  const b = s.npcShips.find((n) => n.type === 'boss');
  if (b) {
    b.x = s.ship.x + Math.cos(s.ship.angle) * 120;
    b.y = s.ship.y + Math.sin(s.ship.angle) * 120;
    b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0;
    b.health = 9;
    s.ship.vx = 0; s.ship.vy = 0;
  }
});
const blackstarDead = await fireUntil(page, () => window.__rs._runStats.bossesDefeated.includes('pirate_lord'), 5000);
await page.waitForTimeout(300);
const blackstarRes = await page.evaluate(() => {
  try {
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem('galaxyTraderMeta') || 'null'); } catch {}
    return { unlockUpgrades: meta?.unlocks?.upgrades || [], canAdvance: window.__rs.canAdvance() };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: Pirate Lord defeated, shield2 unlocked, zone advance available',
  blackstarDead && !blackstarRes.error && blackstarRes.unlockUpgrades.includes('shield2') && blackstarRes.canAdvance === true,
  JSON.stringify({ blackstarDead, blackstarRes }));

// --- 7. Advance to The Void; repeat the natural boss trigger; defeat the Void King -> victory ---
await page.keyboard.press('z');
await page.waitForFunction(() => window.__rs.getCurrentZone().name === 'The Void', null, { timeout: 3000 }).catch(() => {});
await page.evaluate(() => {
  const s = window.stateManager.state;
  s.npcShips = [];
  s.ship.vx = 0; s.ship.vy = 0;
  s.ship.health = s.ship.maxHealth;
});

const trig2 = await killNRealNPCs(page, 3, 6);
let bossAppeared2 = false;
if (trig2.ok) {
  try {
    await page.waitForFunction(() => window.stateManager.state.npcShips.some((n) => n.type === 'boss'), null, { timeout: 3000, polling: 100 });
    bossAppeared2 = true;
  } catch { bossAppeared2 = false; }
}

await page.evaluate(() => {
  const s = window.stateManager.state;
  const b = s.npcShips.find((n) => n.type === 'boss');
  if (b) {
    b.x = s.ship.x + Math.cos(s.ship.angle) * 120;
    b.y = s.ship.y + Math.sin(s.ship.angle) * 120;
    b.vx = 0; b.vy = 0; b.maxSpeed = 0; b.thrust = 0;
    b.health = 9;
    s.ship.vx = 0; s.ship.vy = 0;
  }
});
const voidKingDead = await fireUntil(page, () => window.__rs._runStats.bossesDefeated.includes('void_king'), 5000);
await page.waitForTimeout(500);

const victoryRes = await page.evaluate(() => {
  try {
    const o = document.getElementById('deathScreenOverlay');
    const cs = getComputedStyle(o);
    let meta = null;
    try { meta = JSON.parse(localStorage.getItem('galaxyTraderMeta') || 'null'); } catch {}
    return {
      display: cs.display,
      classes: o.className,
      title: o.querySelector('.death-title')?.textContent,
      unlocksText: (document.getElementById('deathUnlocks')?.innerText || '').trim(),
      paused: window.stateManager.state.paused,
      totalWins: meta?.stats?.totalWins,
      bossesDefeated: meta?.stats?.bossesDefeated,
      unlockShips: meta?.unlocks?.ships || []
    };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: Void King defeated -> victory screen, unlocks, meta stats',
  trig2.ok && bossAppeared2 && voidKingDead && !victoryRes.error &&
  victoryRes.display !== 'none' &&
  /(^|\s)victory(\s|$)/.test(victoryRes.classes) &&
  victoryRes.title === 'VICTORY' &&
  victoryRes.unlocksText.length > 0 &&
  victoryRes.paused === true &&
  victoryRes.totalWins === 1 &&
  typeof victoryRes.bossesDefeated === 'number' && victoryRes.bossesDefeated === 3 &&
  victoryRes.unlockShips.includes('battlecruiser'),
  JSON.stringify({ trig2, bossAppeared2, voidKingDead, victoryRes }));

// --- 8. Main menu: battlecruiser is now unlocked ---
await page.evaluate(() => document.getElementById('mainMenuBtn')?.click());
await page.waitForTimeout(400);
const menuRes = await page.evaluate(() => {
  try {
    const o = document.getElementById('mainMenuOverlay');
    const card = document.querySelector('#shipCarousel [data-ship-id="battlecruiser"]');
    return {
      display: getComputedStyle(o).display,
      paused: window.stateManager.state.paused,
      cardFound: !!card,
      cardLocked: card ? card.classList.contains('locked') : null
    };
  } catch (e) { return { error: String((e && e.message) || e) }; }
});
check('victory-run: main menu shows the battlecruiser unlocked',
  !menuRes.error && menuRes.display !== 'none' && menuRes.paused === true && menuRes.cardFound && menuRes.cardLocked === false,
  JSON.stringify(menuRes));

// --- 9. Select the battlecruiser and begin a new run with it ---
await page.evaluate(() => document.querySelector('#shipCarousel [data-ship-id="battlecruiser"]')?.click());
await page.evaluate(() => document.getElementById('startRunBtn')?.click());
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const bcRes = await page.evaluate(() => {
  const s = window.stateManager.state;
  return { shipClass: s.ship.shipClass, cls: s.ship.class, maxHealth: s.ship.maxHealth };
});
check('victory-run: battlecruiser run starts with correct class and maxHealth',
  (bcRes.shipClass === 'battlecruiser' || bcRes.cls === 'battlecruiser') && bcRes.maxHealth === 400,
  JSON.stringify(bcRes));

// --- 10. Death, then retry ---
await page.evaluate(() => { window.stateManager.state.ship.health = 0; });
await page.waitForTimeout(1500);
const deathRes2 = await page.evaluate(() => {
  const o = document.getElementById('deathScreenOverlay');
  return {
    display: getComputedStyle(o).display,
    classes: o.className,
    title: o.querySelector('.death-title')?.textContent,
    paused: window.stateManager.state.paused
  };
});
check('victory-run: death screen shows SHIP DESTROYED (not victory)',
  deathRes2.display !== 'none' && !/(^|\s)victory(\s|$)/.test(deathRes2.classes) && deathRes2.title === 'SHIP DESTROYED' && deathRes2.paused === true,
  JSON.stringify(deathRes2));

await page.evaluate(() => document.getElementById('retryRunBtn')?.click());
await page.waitForFunction(() => window.stateManager.state.paused === false, null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const retryRes = await page.evaluate(() => {
  const s = window.stateManager.state;
  return { paused: s.paused, health: s.ship.health, kills: window.__rs.getRunStats().kills };
});
check('victory-run: retry resets to a fresh, alive run',
  retryRes.paused === false && retryRes.health > 0 && retryRes.kills === 0,
  JSON.stringify(retryRes));

// --- 11. No new console errors accrued during the whole scenario ---
check('victory-run: no new console errors', consoleErrors.length === errsBeforeVictoryRun,
  consoleErrors.slice(errsBeforeVictoryRun).slice(0, 5).join(' | '));

await browser.close();
server.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
