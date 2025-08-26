// Lightweight QA utilities for quick profiling and toggle hygiene
// Usage (in browser console at /docs/):
//   await import('./js/qaToggles.js');
//   QA.reset(); QA.profile(15); QA.tcInspect(10); QA.silenceLandscapes();

(() => {
  const g = (typeof window !== 'undefined') ? window : globalThis;
  const del = (k) => { try { delete g[k]; } catch(_) {} };

  const QA = g.QA || {};

  // Reset commonly used QA/debug toggles to defaults (OFF)
  QA.reset = function reset() {
    [
      'TC_FORCE','TC_FORCE_ENABLED','TC_DEBUG','TC_SHOW_PATH','TC_SILENT',
      'RENDER_AUTO_QUALITY','RENDER_PROF_OVERLAY','RENDER_PROF_LOG','RENDER_PROF_AUTO_ENABLED',
      'UPDATE_PROF_LOG','UPDATE_PROF_OVERLAY','DEBUG_SPAWN','DEBUG_SAVE',
      'TC_ANGLE_EPS','TC_MIN_MS','SPAWN_TYPE_COOLDOWN_MS','SPAWN_PIRATE_SUPPRESS_MS',
      'RENDER_OTHER_GUARD','RENDER_OTHER_GUARD_MS','RENDER_OTHER_GUARD_N'
    ].forEach(del);
    try { if (g.localStorage) g.localStorage.removeItem('RENDER_WEBGL'); } catch(_) {}
    console.log('[QA] Reset complete (Canvas2D preferred; toggles cleared).');
  };

  // Ensure Canvas2D by removing WebGL preference
  QA.canvas2d = function canvas2d() {
    try { if (g.localStorage) g.localStorage.removeItem('RENDER_WEBGL'); } catch(_) {}
    console.log('[QA] Canvas2D enforced (removed RENDER_WEBGL from localStorage).');
  };

  // Enable render profiler overlay/log briefly
  QA.profile = function profile(seconds = 15) {
    g.RENDER_PROF_OVERLAY = true; g.RENDER_PROF_LOG = true;
    const ms = Math.max(1, Number(seconds)) * 1000;
    setTimeout(() => { del('RENDER_PROF_OVERLAY'); del('RENDER_PROF_LOG'); console.log('[QA] Profiling disabled'); }, ms);
    console.log(`[QA] Profiling enabled for ${seconds}s`);
  };

  // Temporarily enable other-spike guard
  QA.otherGuard = function otherGuard(ms = 12, n = 1, seconds = 8) {
    g.RENDER_OTHER_GUARD = true; g.RENDER_OTHER_GUARD_MS = Number(ms); g.RENDER_OTHER_GUARD_N = Number(n);
    const dur = Math.max(1, Number(seconds)) * 1000;
    setTimeout(() => { del('RENDER_OTHER_GUARD'); del('RENDER_OTHER_GUARD_MS'); del('RENDER_OTHER_GUARD_N'); console.log('[QA] Other guard disabled'); }, dur);
    console.log(`[QA] Other guard enabled (th=${ms}, N=${n}) for ${seconds}s`);
  };

  // Briefly show TargetCam debug axes and source path label
  QA.tcInspect = function tcInspect(seconds = 10) {
    g.TC_DEBUG = true; g.TC_SHOW_PATH = true;
    const ms = Math.max(1, Number(seconds)) * 1000;
    setTimeout(() => { del('TC_DEBUG'); del('TC_SHOW_PATH'); console.log('[QA] TargetCam debug disabled'); }, ms);
    console.log(`[QA] TargetCam debug enabled for ${seconds}s`);
  };

  // Adjust TargetCam warm-up window (ms)
  QA.warm = function warm(ms) {
    const v = Number(ms);
    if (!Number.isFinite(v) || v < 0) { console.warn('[QA] Invalid warm ms'); return; }
    g.TC_WARM_MS = v;
    console.log('[QA] TC_WARM_MS =', v);
  };

  // Silence external planet landscape image fetches during QA
  QA.silenceLandscapes = function silenceLandscapes() {
    g.UI_LANDSCAPE_PROVIDER = 'none';
    console.log('[QA] UI_LANDSCAPE_PROVIDER set to "none"');
  };

  // Set spawn suppression windows
  QA.spawnWindows = function spawnWindows(typeCooldownMs = 6000, pirateSuppressMs = 4500) {
    g.SPAWN_TYPE_COOLDOWN_MS = Number(typeCooldownMs);
    g.SPAWN_PIRATE_SUPPRESS_MS = Number(pirateSuppressMs);
    console.log(`[QA] Spawn windows set: type=${g.SPAWN_TYPE_COOLDOWN_MS}ms, pirate=${g.SPAWN_PIRATE_SUPPRESS_MS}ms`);
  };

  // Show available helpers
  QA.info = function info() {
    console.table({
      reset: 'Clear toggles + prefer Canvas2D',
      canvas2d: 'Remove RENDER_WEBGL flag',
      profile: 'Enable overlay/log briefly (s)',
      otherGuard: 'Enable guard (ms, n, s)',
      tcInspect: 'Enable TC_DEBUG/TC_SHOW_PATH (s)',
      warm: 'Set TC_WARM_MS (ms)',
      silenceLandscapes: "Set UI_LANDSCAPE_PROVIDER='none'",
      spawnWindows: 'Set SPAWN_TYPE_COOLDOWN_MS / SPAWN_PIRATE_SUPPRESS_MS',
      autosave: 'Set SAVE_INTERVAL_MS and SAVE_FIRST_DELAY_MS (ms)',
      autosaveOff: 'Disable autosave (set SAVE_DISABLED)',
      uiUpdate: 'Set UI_UPDATE_MS (throttle UI_UPDATE)',
      uiUpdatesOff: 'Disable UI_UPDATE events',
      audioOff: 'Toggle global audio off (emit AUDIO_TOGGLE)',
      uiLight: "Toggle 'ui-light' class to disable heavy HUD effects",
      uiGuard: 'Guard: skip UI after longtask (on/off)',
      ltTrace: 'Enable LongTask trace (mark recent phases)',
      boot: 'Set BOOT_QUALITY_MS (ms)',
      starBootSkip: 'Skip first N star passes',
      panels: 'Enable/disable panel/dial static overlays (bool)'
    });
  };

  // Toggle panel/dial static overlays together (TargetCam, Minimap, Radio)
  // QA.panels(true)  -> enable static overlays
  // QA.panels(false) -> disable all static overlays
  QA.panels = function panels(enable = true) {
    const on = !!enable;
    if (on) {
      delete g.UI_PANEL_STATIC; delete g.TC_STATIC; delete g.MINIMAP_STATIC; delete g.RADIO_STATIC;
      console.log('[QA] Panel static overlays ENABLED (TargetCam, Minimap, Radio)');
    } else {
      g.UI_PANEL_STATIC = false; g.TC_STATIC = false; g.MINIMAP_STATIC = false; g.RADIO_STATIC = false;
      console.log('[QA] Panel static overlays DISABLED (TargetCam, Minimap, Radio)');
    }
  };

  // Configure autosave cadence (ms). Call then reload.
  QA.autosave = function autosave(intervalMs = 30000, firstDelayMs = 60000, quietMs = 7000) {
    g.SAVE_INTERVAL_MS = Number(intervalMs);
    g.SAVE_FIRST_DELAY_MS = Number(firstDelayMs);
    g.SAVE_QUIET_MS = Number(quietMs);
    console.log(`[QA] Autosave set: interval=${g.SAVE_INTERVAL_MS}ms, first=${g.SAVE_FIRST_DELAY_MS}ms, quiet=${g.SAVE_QUIET_MS}ms (reload to apply)`);
  };

  // Disable autosave entirely (reload to apply)
  QA.autosaveOff = function autosaveOff() {
    g.SAVE_DISABLED = true;
    console.log('[QA] Autosave disabled (reload to apply)');
  };

  // Observe browser long tasks (main-thread > 50ms) for attribution.
  // Usage: QA.longTasks(30) // observe for 30s
  QA.longTasks = function longTasks(seconds = 20) {
    const dur = Math.max(1, Number(seconds)) * 1000;
    if (!('PerformanceObserver' in g)) { console.warn('[QA] PerformanceObserver not supported'); return; }
    try {
      if (QA.__ltObs) { try { QA.__ltObs.disconnect(); } catch(_) {} }
      QA.__longTasks = [];
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries() || []) {
          const payload = {
            name: e.name,
            duration: Number(e.duration?.toFixed?.(1) || e.duration || 0),
            startTime: Number(e.startTime?.toFixed?.(1) || e.startTime || 0),
            entryType: e.entryType,
            attribution: (e.attribution || []).map(a => ({ name: a.name, entryType: a.entryType, startTime: Math.round(a.startTime||0), duration: Math.round(a.duration||0), containerType: a.containerType }))
          };
          QA.__longTasks.push(payload);
          try { console.warn('[LongTask]', payload); } catch(_) {}
        }
      });
      obs.observe({ type: 'longtask', buffered: true });
      QA.__ltObs = obs;
      console.log(`[QA] LongTask observer enabled for ${seconds}s`);
      setTimeout(() => { try { obs.disconnect(); console.log('[QA] LongTask observer disabled'); } catch(_) {} }, dur);
    } catch (e) {
      console.warn('[QA] LongTask observer failed:', e);
    }
  };

  // Adjust HUD/UI update throttle (ms)
  QA.uiUpdate = function uiUpdate(ms = 250) {
    g.UI_UPDATE_MS = Number(ms);
    console.log('[QA] UI_UPDATE_MS =', g.UI_UPDATE_MS);
  };

  // Disable HUD/UI updates
  QA.uiUpdatesOff = function uiUpdatesOff() {
    g.UI_DISABLE_UPDATE = true;
    console.log('[QA] UI updates disabled');
  };

  // Toggle audio off
  QA.audioOff = function audioOff() {
    try { g.dispatchEvent(new Event('keydown')); } catch(_) {}
    try { const { getEventBus, GameEvents } = g.__modules__ || {}; if (getEventBus) getEventBus().emit('audio.toggle'); } catch(_) {}
    try { if (g.eventBus && g.GameEvents) g.eventBus.emit(g.GameEvents.AUDIO_TOGGLE); } catch(_) {}
    console.log('[QA] Requested AUDIO_TOGGLE');
  };

  // Toggle lightweight UI mode (disables heavy HUD effects like backdrop blur)
  QA.uiLight = function uiLight(enable = true) {
    try {
      const add = !!enable;
      document.body.classList[add ? 'add' : 'remove']('ui-light');
      console.log(`[QA] UI light mode ${add ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.warn('[QA] UI light mode failed:', e);
    }
  };

  // Toggle heavy UI mode (enables blur/animations)
  QA.uiHeavy = function uiHeavy(enable = true) {
    try {
      const add = !!enable;
      document.body.classList[add ? 'add' : 'remove']('ui-heavy');
      if (add) {
        // Ensure mutually exclusive with ui-light
        document.body.classList.remove('ui-light');
      }
      console.log(`[QA] UI heavy mode ${add ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.warn('[QA] UI heavy mode failed:', e);
    }
  };

  // Enable/disable UI long-task guard (skips UI updates briefly after a long task)
  QA.uiGuard = function uiGuard(enable = true) {
    try {
      if (enable) { window.UI_LONG_GUARD = true; console.log('[QA] UI long-task guard ENABLED'); }
      else { delete window.UI_LONG_GUARD; console.log('[QA] UI long-task guard DISABLED'); }
    } catch (e) { console.warn('[QA] UI guard toggle failed:', e); }
  };

  // Enable LongTask tracing with phase marks
  QA.ltTrace = function ltTrace(enable = true) {
    try {
      if (enable) { window.LT_TRACE = true; console.log('[QA] LT_TRACE ENABLED'); }
      else { delete window.LT_TRACE; console.log('[QA] LT_TRACE DISABLED'); }
    } catch (e) { console.warn('[QA] LT trace toggle failed:', e); }
  };

  // Set boot quality ramp duration (ms)
  QA.boot = function boot(ms = 3000) {
    try {
      const v = Math.max(0, Number(ms));
      window.BOOT_QUALITY_MS = v;
      console.log('[QA] BOOT_QUALITY_MS =', v);
    } catch (e) { console.warn('[QA] Failed to set BOOT_QUALITY_MS:', e); }
  };

  // Skip first N star passes after boot (tiny first-paint stride)
  QA.starBootSkip = function starBootSkip(n = 2) {
    try {
      const v = Math.max(0, Number(n)|0);
      window.STAR_BOOT_SKIP = v;
      console.log('[QA] STAR_BOOT_SKIP =', v);
    } catch (e) { console.warn('[QA] Failed to set STAR_BOOT_SKIP:', e); }
  };

  g.QA = QA;
  console.log('[QA] Helpers loaded — call QA.info() for commands');
})();
