/**
 * SystemRegistry — the explicit, declared update order for game systems (roadmap S4).
 *
 * Before this module the loop iterated `Object.entries(systems)`, so the update
 * order was whatever order `initializeSystems()` happened to construct things in:
 * Physics ran before NPC and Weapon, meaning collisions resolved against the
 * previous frame's positions, and four systems with empty `update()` bodies were
 * called 60 times a second for nothing.
 *
 * The order below is the contract. Read it top to bottom as one simulation tick:
 *
 *   input    → read intent for this tick
 *   npc      → AI decides what each NPC does
 *   weapon   → fire/move projectiles from those decisions
 *   physics  → integrate the player, then resolve collisions
 *   vfx      → decay/advance purely visual state off the same fixed clock
 *   spawn    → asteroids, pickups, NPC spawning, world upkeep
 *   mission  → objectives evaluated against the settled world
 *   ui/debug → present it
 *
 * Rendering is deliberately NOT part of this sequence: it runs from `onRender`
 * at display rate, reads state and never writes it (see VisualEffectsSystem).
 *
 * ── Adding a system ──────────────────────────────────────────────────────────
 * Add ONE line to SYSTEM_ORDER at the position it must run in, and construct it
 * as `systems.<key>` in `initializeSystems()`. Nothing else needs to change.
 * `update: false` means "event-driven only" — declare it so the registry knows
 * the system exists and does not warn about it.
 */

/**
 * @typedef {Object} SystemDecl
 * @property {string} key      Property name on the `systems` container
 * @property {boolean} [update] Participates in the fixed-timestep update sequence
 * @property {boolean} [render] Participates in the render pass
 * @property {boolean} [optional] Absence is not worth a warning
 * @property {string} [note]   Why it sits here / why it has no update
 */

/** @type {ReadonlyArray<SystemDecl>} */
export const SYSTEM_ORDER = Object.freeze([
    // ── simulation, in dependency order ──────────────────────────────────────
    { key: 'input',   update: true,  note: 'intent for this tick' },
    { key: 'npc',     update: true,  note: 'AI decisions before anything moves' },
    { key: 'weapon',  update: true,  note: 'fires and integrates projectiles' },
    { key: 'physics', update: true,  note: 'player integration + collisions' },
    { key: 'vfx',     update: true,  note: 'shake/flash/spin decay on the fixed clock' },
    { key: 'gamefeel', update: true, note: 'hit-stop, damage numbers and state.fx decay' },
    { key: 'spawn',   update: true,  note: 'asteroids, pickups, NPC spawning' },
    { key: 'mission', update: true,  note: 'objectives against the settled world' },

    // ── event-driven services (no per-frame work) ───────────────────────────
    { key: 'assets',  update: false, note: 'loads on demand, emits assets.ready' },
    { key: 'save',    update: false, note: 'driven by GAME_SAVE / GAME_LOAD' },
    { key: 'targeting', update: false, note: 'driven by TARGET_SET / TARGET_CLEAR' },
    { key: 'trading', update: false, note: 'driven by trade events' },
    { key: 'shop',    update: false, note: 'driven by shop events' },
    { key: 'audio',   update: false, note: 'driven by gameplay events' },

    // ── presentation ────────────────────────────────────────────────────────
    { key: 'ui',      update: true,  note: 'tutorial stage drift only; HUD is event-driven' },
    { key: 'debug',   update: true,  optional: true },
    { key: 'render',  update: false, render: true, note: 'runs from onRender, not the update sequence' }
]);

/**
 * Resolve SYSTEM_ORDER against the live system instances.
 *
 * Returns an ordered array of `{ key, instance, update, render }`. The `update`
 * flag is the declaration AND-ed with the instance actually having an `update`
 * method, so a system can never be silently skipped or silently called.
 *
 * Mismatches are reported rather than papered over:
 *  - declared `update: true` but no `update()`  → the tick is missing work
 *  - declared `update: false` but has `update()` → a leftover stub, delete it
 *  - present in `systems` but not declared here  → it will never run
 *
 * @param {Record<string, any>} systems   The system container from initializeSystems()
 * @param {{warn?: (msg: string) => void}} [opts]
 * @returns {Array<{key: string, instance: any, update: boolean, render: boolean}>}
 */
export function buildSystemRegistry(systems, opts = {}) {
    const warn = opts.warn || ((msg) => console.warn(msg));
    const registry = [];
    const declared = new Set();

    for (const decl of SYSTEM_ORDER) {
        declared.add(decl.key);
        const instance = systems ? systems[decl.key] : null;
        if (!instance) {
            if (!decl.optional) warn(`[SystemRegistry] '${decl.key}' is declared but was not constructed`);
            continue;
        }
        const hasUpdate = typeof instance.update === 'function';
        const hasRender = typeof instance.render === 'function';
        if (decl.update && !hasUpdate) {
            warn(`[SystemRegistry] '${decl.key}' is declared with update:true but has no update()`);
        }
        if (!decl.update && hasUpdate) {
            warn(`[SystemRegistry] '${decl.key}' has an update() the registry does not call — delete the stub or declare update:true`);
        }
        if (decl.render && !hasRender) {
            warn(`[SystemRegistry] '${decl.key}' is declared with render:true but has no render()`);
        }
        registry.push({
            key: decl.key,
            instance,
            update: !!decl.update && hasUpdate,
            render: !!decl.render && hasRender
        });
    }

    for (const key of Object.keys(systems || {})) {
        if (!declared.has(key)) {
            warn(`[SystemRegistry] '${key}' is not declared in SYSTEM_ORDER — it will never be updated`);
        }
    }

    return registry;
}

export default buildSystemRegistry;
