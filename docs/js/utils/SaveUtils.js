/**
 * SaveUtils - Shared save data validation
 * Single source of truth for validating save data structures.
 */

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
