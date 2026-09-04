/**
 * SaveUtils - Shared save data validation
 * Single source of truth for validating save data structures.
 *
 * Two generations of stamp are accepted:
 *  - `schema: 7` (integer) — written by core/Persistence.js, authoritative.
 *  - `version: '6.x'` (string) — pre-schema saves, still readable.
 * Persistence migrates 6.x → 7 on read; this validator stays tolerant of both
 * because main_eventbus_pure.js and StateManager read saves directly.
 */

/** Current integer schema of the main save blob (mirrors Persistence.SCHEMA.save) */
export const SAVE_SCHEMA = 7;

/**
 * Validate parsed save data has expected structure.
 * @param {any} data - Parsed JSON data
 * @returns {boolean} True if data is valid
 */
export function validateSaveData(data) {
    // Basic type check
    if (!data || typeof data !== 'object') {
        console.warn('[SaveUtils] Invalid save data: not an object');
        return false;
    }

    // Ship object is required
    if (!data.ship || typeof data.ship !== 'object') {
        console.warn('[SaveUtils] Invalid save data: missing or invalid ship');
        return false;
    }

    // Version gate: reject saves with no recognisable stamp, or from an
    // incompatible format. Accepted: the current integer `schema`, or the
    // legacy '6.x' `version` string that Persistence migrates forward.
    // Treated as invalid rather than thrown so callers fall back to defaults.
    const schemaOk = Number.isInteger(data.schema) && data.schema === SAVE_SCHEMA;
    const legacyOk = typeof data.version === 'string' && data.version.startsWith('6');
    if (!schemaOk && !legacyOk) {
        console.warn('[SaveUtils] Invalid save data: missing or unsupported version',
            data.schema ?? data.version);
        return false;
    }

    // Critical ship properties must be numbers
    const numericProps = ['x', 'y', 'health', 'credits'];
    for (const prop of numericProps) {
        if (typeof data.ship[prop] !== 'number') {
            console.warn(`[SaveUtils] Invalid save data: ship.${prop} is not a number`);
            return false;
        }
    }

    // Validate arrays if present
    if (data.ship.cargo && !Array.isArray(data.ship.cargo)) {
        console.warn('[SaveUtils] Invalid save data: ship.cargo is not an array');
        return false;
    }

    if (data.ship.weapons && !Array.isArray(data.ship.weapons)) {
        console.warn('[SaveUtils] Invalid save data: ship.weapons is not an array');
        return false;
    }

    if (data.npcs && !Array.isArray(data.npcs)) {
        console.warn('[SaveUtils] Invalid save data: npcs is not an array');
        return false;
    }

    return true;
}
