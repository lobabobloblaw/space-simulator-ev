/**
 * Persistence — the single owner of Galaxy Trader's localStorage keys.
 *
 * Three blobs are persisted, each with its own integer schema version:
 *
 *   | logical key | localStorage key     | schema | written by              |
 *   |-------------|----------------------|--------|-------------------------|
 *   | 'save'      | galaxyTraderSave     | 7      | SaveSystemAdapterFixed  |
 *   | 'run'       | galaxyTraderRun      | 1      | RunSystem               |
 *   | 'meta'      | galaxyTraderMeta     | 2      | MetaStateManager        |
 *
 * A fourth key ('loadPending' → galaxyTraderLoadPending) is a bare string flag,
 * not a versioned blob; it is routed through here only so that no system pokes
 * localStorage directly.
 *
 * Rules:
 * - Every written blob is stamped `{ schema, savedAt, ...payload }`.
 * - Reads migrate forward through `migrations[kind][from]` chains and persist
 *   the migrated blob once, so storage converges on the current schema.
 * - An unknown or newer-than-current schema is refused (logged once per key per
 *   session, `read()` returns null). Older-but-unmigratable / corrupt blobs are
 *   removed; newer blobs are left alone so a downgrade cannot destroy data.
 * - Storage failures are never swallowed: they are logged, and a quota failure
 *   surfaces a single UI_MESSAGE per session.
 */

import { getEventBus, GameEvents } from './EventBus.js';
import { validateSaveData } from '../utils/SaveUtils.js';
import { shipClasses, shopInventory } from '../data/gameData.js';

/** Logical key → localStorage key */
export const STORAGE_KEYS = Object.freeze({
    save: 'galaxyTraderSave',
    run: 'galaxyTraderRun',
    meta: 'galaxyTraderMeta',
    loadPending: 'galaxyTraderLoadPending'
});

/** Current schema version per logical key (integers, bump on breaking shape changes) */
export const SCHEMA = Object.freeze({ save: 7, run: 1, meta: 2 });

const QUOTA_MESSAGE = "Storage full — progress can't be saved";

let _quotaNotified = false;          // one UI_MESSAGE per session
let _lastWriteError = null;
let _lastWriteBytes = 0;
const _refusedOnce = new Set();      // keys already logged as unreadable

// ==================== low-level storage access ====================

function store() {
    try {
        return (typeof localStorage !== 'undefined') ? localStorage : null;
    } catch (e) {
        // Access itself throws when cookies/site data are blocked
        return null;
    }
}

function storageKey(kind) {
    const key = STORAGE_KEYS[kind];
    if (!key) throw new Error(`[Persistence] Unknown storage key: ${kind}`);
    return key;
}

/**
 * True when an exception from setItem is a storage-quota failure.
 * Covers the modern name plus the legacy Firefox/WebKit codes.
 */
export function isQuotaError(e) {
    if (!e) return false;
    return e.name === 'QuotaExceededError' ||
           e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
           e.code === 22 || e.code === 1014;
}

function notifyQuotaOnce() {
    if (_quotaNotified) return;
    _quotaNotified = true;
    try {
        getEventBus().emit(GameEvents.UI_MESSAGE, {
            message: QUOTA_MESSAGE,
            type: 'error',
            duration: 4000
        });
    } catch (e) {
        console.warn('[Persistence] Could not surface quota failure:', e);
    }
}

// ==================== boss-count coercion (shared with MetaStateManager) ====================

/**
 * Coerce a possibly-corrupt `bossesDefeated` stat back to a count.
 * Old builds concatenated the run's boss-id array onto the meta counter,
 * producing strings like "0pirate_lord,void_king".
 * @param {any} value
 * @returns {number}
 */
export function coerceBossCount(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'string') {
        const ids = value.replace(/^\d+/, '').split(',').filter(Boolean);
        const leading = parseInt(value, 10);
        return (Number.isFinite(leading) ? leading : 0) + ids.length;
    }
    return 0;
}

// ==================== migrations ====================

/**
 * Per-key migration chain: `migrations[kind][n]` upgrades a blob from schema n
 * to schema n+1. A missing step means the blob cannot be read.
 */
const migrations = {
    save: {
        // 6 → 7: the pre-schema saves carried a string `version` ('6.1',
        // '6.0-critical'). Nothing about the payload changes; the blob just
        // gains the integer stamp. `version` is left in place because
        // main_eventbus_pure.js and StateManager read saves without going
        // through this module.
        6: (data) => data
    },
    run: {
        // 0 → 1: run blobs were never versioned. Fill in the stats fields that
        // later builds assume exist, so resume never hands out undefined.
        0: (data) => {
            const stats = { ...(data.stats || {}) };
            if (!Array.isArray(stats.bossesDefeated)) stats.bossesDefeated = [];
            if (!Array.isArray(stats.zonesVisited) || stats.zonesVisited.length === 0) {
                stats.zonesVisited = ['core'];
            }
            if (!Array.isArray(stats.unlocksGranted)) stats.unlocksGranted = [];
            const zoneKills = Number(data.zoneKills);
            return {
                ...data,
                stats,
                zoneKills: Number.isFinite(zoneKills) ? zoneKills : 0
            };
        }
    },
    meta: {
        // 1 → 2: coerce the corrupted bossesDefeated counter and drop unlock ids
        // that no longer exist in gameData (renamed/removed ships or upgrades
        // otherwise leak into the menu and the shop pool).
        1: (data) => {
            const out = { ...data };
            delete out.version; // superseded by the schema stamp

            const stats = { ...(data.stats || {}) };
            stats.bossesDefeated = coerceBossCount(stats.bossesDefeated);
            out.stats = stats;

            const ships = [...new Set((data.unlocks?.ships || [])
                .filter(id => Object.prototype.hasOwnProperty.call(shipClasses, id)))];
            const upgrades = [...new Set((data.unlocks?.upgrades || [])
                .filter(id => Object.prototype.hasOwnProperty.call(shopInventory, id)))];
            out.unlocks = {
                ships: ships.length ? ships : ['shuttle'],
                upgrades: upgrades.length ? upgrades : ['weapon1']
            };
            return out;
        }
    }
};

/**
 * Detect the schema of a stored blob.
 * @returns {number|null} null when the blob is unrecognisable
 */
function detectSchema(kind, blob) {
    if (blob && Number.isInteger(blob.schema)) return blob.schema;
    if (kind === 'save') {
        // Pre-schema saves: version string '6.1' / '6.0-critical'
        const v = typeof blob?.version === 'string' ? parseInt(blob.version, 10) : NaN;
        return Number.isFinite(v) ? v : null;
    }
    if (kind === 'meta') {
        const v = typeof blob?.version === 'string' ? parseInt(blob.version, 10) : NaN;
        return Number.isFinite(v) ? v : 1; // earliest meta blobs were '1.0'
    }
    if (kind === 'run') return 0;          // run blobs were never versioned
    return null;
}

function refuse(kind, reason, detail) {
    if (!_refusedOnce.has(kind)) {
        _refusedOnce.add(kind);
        console.warn(`[Persistence] Ignoring '${kind}' blob — ${reason}`, detail ?? '');
    }
    return null;
}

// ==================== public API ====================

/**
 * True when the key currently holds anything.
 */
export function has(kind) {
    const s = store();
    if (!s) return false;
    try {
        return s.getItem(storageKey(kind)) !== null;
    } catch (e) {
        console.warn('[Persistence] has() failed for', kind, e);
        return false;
    }
}

/**
 * Read a raw string value (schemaless flags such as 'loadPending').
 */
export function readRaw(kind) {
    const s = store();
    if (!s) return null;
    try {
        return s.getItem(storageKey(kind));
    } catch (e) {
        console.warn('[Persistence] readRaw() failed for', kind, e);
        return null;
    }
}

/**
 * Write a raw string value (schemaless flags such as 'loadPending').
 */
export function writeRaw(kind, value) {
    const s = store();
    if (!s) return false;
    try {
        s.setItem(storageKey(kind), String(value));
        return true;
    } catch (e) {
        _lastWriteError = e;
        console.warn('[Persistence] writeRaw() failed for', kind, e);
        if (isQuotaError(e)) notifyQuotaOnce();
        return false;
    }
}

/**
 * Read, migrate and validate a versioned blob.
 * @param {'save'|'run'|'meta'} kind
 * @returns {object|null} the migrated payload, or null when absent/unusable
 */
export function read(kind) {
    const target = SCHEMA[kind];
    if (typeof target !== 'number') throw new Error(`[Persistence] Unknown blob kind: ${kind}`);

    const raw = readRaw(kind);
    if (raw === null || raw === undefined || raw === '') return null;

    let blob;
    try {
        blob = JSON.parse(raw);
    } catch (e) {
        console.warn(`[Persistence] Corrupt '${kind}' blob, discarding:`, e);
        remove(kind);
        return null;
    }
    if (!blob || typeof blob !== 'object' || Array.isArray(blob)) {
        console.warn(`[Persistence] Unexpected '${kind}' blob shape, discarding`);
        remove(kind);
        return null;
    }

    let version = detectSchema(kind, blob);
    if (version === null) {
        // Unrecognisable and unmigratable — reset it rather than keep tripping over it.
        remove(kind);
        return refuse(kind, 'unrecognised format (reset)');
    }
    if (version > target) {
        // Written by a newer build: refuse, but never delete the player's data.
        return refuse(kind, `schema ${version} is newer than supported ${target}`);
    }

    let data = blob;
    let migrated = false;
    while (version < target) {
        const step = migrations[kind]?.[version];
        if (typeof step !== 'function') {
            remove(kind);
            return refuse(kind, `no migration from schema ${version} to ${version + 1} (reset)`);
        }
        try {
            data = step(data) || {};
        } catch (e) {
            console.warn(`[Persistence] Migration ${kind} ${version}→${version + 1} failed:`, e);
            remove(kind);
            return refuse(kind, 'migration failed (reset)');
        }
        version += 1;
        migrated = true;
    }

    // Shape checks for the main save stay in SaveUtils (shared with the
    // readers that do not route through this module).
    if (kind === 'save' && !validateSaveData({ ...data, schema: target })) {
        return refuse(kind, 'failed validateSaveData()');
    }

    if (migrated) {
        console.log(`[Persistence] Migrated '${kind}' to schema ${target}`);
        write(kind, data, { quiet: true });
    }

    const { schema, savedAt, ...payload } = data;
    return { ...payload, schema: target, savedAt: savedAt ?? null };
}

/**
 * Write a versioned blob, stamped with its schema and a timestamp.
 * @param {'save'|'run'|'meta'} kind
 * @param {object} payload
 * @param {{quiet?: boolean}} [opts] quiet suppresses the quota UI_MESSAGE for
 *        callers that surface their own (the save adapter's fallback ladder).
 * @returns {boolean} true when the write landed
 */
export function write(kind, payload, opts = {}) {
    const schema = SCHEMA[kind];
    if (typeof schema !== 'number') throw new Error(`[Persistence] Unknown blob kind: ${kind}`);

    _lastWriteError = null;
    const s = store();
    if (!s) {
        _lastWriteError = new Error('localStorage unavailable');
        console.warn(`[Persistence] Cannot write '${kind}': localStorage unavailable`);
        return false;
    }

    let json;
    try {
        const { schema: _s, savedAt: _t, ...rest } = (payload || {});
        json = JSON.stringify({ schema, savedAt: Date.now(), ...rest });
    } catch (e) {
        _lastWriteError = e;
        console.warn(`[Persistence] Could not serialise '${kind}':`, e);
        return false;
    }

    try {
        s.setItem(storageKey(kind), json);
        _lastWriteBytes = byteLength(json);
        return true;
    } catch (e) {
        _lastWriteError = e;
        console.warn(`[Persistence] Write of '${kind}' failed:`, e);
        if (isQuotaError(e) && !opts.quiet) notifyQuotaOnce();
        return false;
    }
}

/** The error from the most recent failed write (null after a successful one). */
export function lastWriteError() {
    return _lastWriteError;
}

/** Byte size of the most recent successful write. */
export function lastWriteBytes() {
    return _lastWriteBytes;
}

function byteLength(json) {
    try {
        return (typeof TextEncoder !== 'undefined')
            ? new TextEncoder().encode(json).length
            : json.length * 2;
    } catch (e) {
        return json.length * 2;
    }
}

/**
 * Remove one key.
 */
export function remove(kind) {
    const s = store();
    if (!s) return false;
    try {
        s.removeItem(storageKey(kind));
        return true;
    } catch (e) {
        console.warn(`[Persistence] Failed to clear '${kind}':`, e);
        return false;
    }
}

/**
 * Drop the ephemeral run blob (permadeath, abandoned run, inconsistent pair).
 */
export function clearRun() {
    return remove('run');
}

/**
 * Clear the per-run save state. Permanent progression ('meta') is kept unless
 * `keepMeta` is explicitly false — this is what F12 does.
 */
export function clearAll({ keepMeta = true } = {}) {
    const cleared = [];
    for (const kind of ['save', 'loadPending', 'run']) {
        if (remove(kind)) cleared.push(STORAGE_KEYS[kind]);
    }
    if (!keepMeta && remove('meta')) cleared.push(STORAGE_KEYS.meta);
    return cleared;
}

// ==================== flush-on-hide ====================

const flushHandlers = new Set();
let _flushListenersInstalled = false;

function installFlushListeners() {
    if (_flushListenersInstalled) return;
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    _flushListenersInstalled = true;
    window.addEventListener('pagehide', () => flushNow('pagehide'));
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flushNow('visibilitychange');
        });
    }
}

/**
 * Register a handler that must flush pending writes before the page goes away.
 * One pagehide/visibilitychange listener is installed for all handlers.
 * @param {(reason: string) => void} fn
 * @returns {() => void} unregister
 */
export function onFlush(fn) {
    if (typeof fn !== 'function') return () => {};
    flushHandlers.add(fn);
    installFlushListeners();
    return () => flushHandlers.delete(fn);
}

/**
 * Run every registered flush handler now.
 */
export function flushNow(reason = 'manual') {
    for (const fn of flushHandlers) {
        try { fn(reason); } catch (e) { console.warn('[Persistence] Flush handler failed:', e); }
    }
}

export default {
    STORAGE_KEYS, SCHEMA,
    read, write, remove, clearRun, clearAll,
    readRaw, writeRaw, has,
    onFlush, flushNow,
    isQuotaError, lastWriteError, lastWriteBytes, coerceBossCount
};
