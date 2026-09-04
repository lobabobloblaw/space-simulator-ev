/**
 * ShipStats - the single derivation of player ship stats.
 *
 * A player ship carries a hull id (`ship.shipClass`) plus four upgrade levels
 * (`engineLevel`, `shieldLevel`, `cargoLevel`, `radarLevel`). Every stat that
 * used to be written absolutely by the shop, the run initializer or the save
 * loader is derived here instead, so an upgrade is always relative to the hull
 * it is bolted onto and a reload cannot silently revert it.
 *
 * Canonical field: `ship.shipClass`.
 * `ship.class` is written with the same value for compatibility.
 */

import ShipCatalog from './ShipCatalog.js';

// Additive bonuses by upgrade level (index === level)
export const SHIELD_BY_LEVEL = [0, 25, 50];
export const CARGO_BY_LEVEL = [0, 5, 15];

// Engine level 1 is the hull baseline; each further level adds 25%
export const ENGINE_STEP = 0.25;

export const UPGRADE_LEVEL_RANGE = {
    engineLevel: { min: 1, max: 3 },
    shieldLevel: { min: 0, max: 2 },
    cargoLevel: { min: 0, max: 2 },
    radarLevel: { min: 0, max: 2 }
};

function clampLevel(value, min, max) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}

/**
 * Resolve a class definition, falling back to the shuttle.
 */
export function getShipClassDef(classId, shipClasses) {
    if (!shipClasses) return null;
    return shipClasses[classId] || shipClasses.shuttle || null;
}

/**
 * Normalize the four upgrade levels in place and return them.
 */
export function normalizeUpgradeLevels(ship) {
    for (const [key, range] of Object.entries(UPGRADE_LEVEL_RANGE)) {
        ship[key] = clampLevel(ship[key], range.min, range.max);
    }
    return {
        engineLevel: ship.engineLevel,
        shieldLevel: ship.shieldLevel,
        cargoLevel: ship.cargoLevel,
        radarLevel: ship.radarLevel
    };
}

/**
 * Recompute every derived stat from the hull class + upgrade levels.
 * Health and shield are clamped into the new maxima.
 *
 * @param {object} ship - the player ship (mutated in place)
 * @param {object} shipClasses - gameData.shipClasses
 * @returns {object} the ship
 */
export function deriveShipStats(ship, shipClasses) {
    if (!ship) return ship;
    const classId = ship.shipClass || ship.class || 'shuttle';
    const def = getShipClassDef(classId, shipClasses);
    if (!def) return ship;

    const id = def.id || classId;
    ship.shipClass = id;
    // TODO: RenderSystem still reads ship.class — keep the mirror until it moves
    // to ship.shipClass.
    ship.class = id;

    const { engineLevel, shieldLevel, cargoLevel } = normalizeUpgradeLevels(ship);
    const engineMult = 1 + ENGINE_STEP * (engineLevel - 1);

    ship.maxHealth = def.maxHealth ?? 100;
    ship.maxShield = (def.maxShield ?? 0) + (SHIELD_BY_LEVEL[shieldLevel] ?? 0);
    ship.maxSpeed = (def.maxSpeed ?? 0.8) * engineMult;
    ship.thrust = (def.thrust ?? 0.012) * engineMult;
    ship.turnSpeed = def.turnSpeed ?? 0.015;
    ship.cargoCapacity = (def.cargoCapacity ?? 10) + (CARGO_BY_LEVEL[cargoLevel] ?? 0);
    ship.weaponSlots = def.weaponSlots ?? 1;

    // Presentation comes from the hull too (P2: every class rendered as shuttle)
    if (def.spriteId) ship.spriteId = def.spriteId;
    if (def.color) ship.color = def.color;
    if (def.width) ship.width = def.width;

    // Nominal size: prefer the shared catalog when it knows this hull
    ship.size = ShipCatalog.has(id)
        ? ShipCatalog.get(id).nominalSize
        : (def.size ?? 12);

    // Clamp current pools into the (possibly smaller) new maxima
    const health = Number.isFinite(ship.health) ? ship.health : ship.maxHealth;
    ship.health = Math.max(0, Math.min(ship.maxHealth, health));
    const shield = Number.isFinite(ship.shield) ? ship.shield : 0;
    ship.shield = Math.max(0, Math.min(ship.maxShield, shield));

    return ship;
}

/**
 * Put the ship into a hull at baseline: upgrade levels reset, stats derived,
 * health and shield full. Callers that need to keep upgrades (a shipyard
 * trade-in) snapshot the levels, call this, restore them and re-derive.
 *
 * @param {object} ship - the player ship (mutated in place)
 * @param {string} classId
 * @param {object} shipClasses - gameData.shipClasses
 * @returns {object} the ship
 */
export function applyShipClass(ship, classId, shipClasses) {
    if (!ship) return ship;
    const def = getShipClassDef(classId, shipClasses);
    if (!def) return ship;

    ship.shipClass = def.id || classId;
    ship.class = ship.shipClass;
    ship.engineLevel = 1;
    ship.shieldLevel = 0;
    ship.cargoLevel = 0;
    ship.radarLevel = 0;

    deriveShipStats(ship, shipClasses);
    ship.health = ship.maxHealth;
    ship.shield = ship.maxShield;

    return ship;
}

/**
 * Legacy saves stored absolute maxShield/cargoCapacity with no level field.
 * Recover the level from the delta over the hull baseline so an existing
 * player does not lose paid-for upgrades on the first load after this change.
 */
export function inferUpgradeLevels(ship, shipClasses) {
    if (!ship) return ship;
    const def = getShipClassDef(ship.shipClass || ship.class || 'shuttle', shipClasses);
    if (!def) return ship;

    if (!Number.isFinite(Number(ship.shieldLevel))) {
        const delta = (Number(ship.maxShield) || 0) - (def.maxShield ?? 0);
        ship.shieldLevel = delta >= SHIELD_BY_LEVEL[2] ? 2 : delta >= SHIELD_BY_LEVEL[1] ? 1 : 0;
    }
    if (!Number.isFinite(Number(ship.cargoLevel))) {
        const delta = (Number(ship.cargoCapacity) || 0) - (def.cargoCapacity ?? 10);
        ship.cargoLevel = delta >= CARGO_BY_LEVEL[2] ? 2 : delta >= CARGO_BY_LEVEL[1] ? 1 : 0;
    }
    normalizeUpgradeLevels(ship);
    return ship;
}

export default { applyShipClass, deriveShipStats, inferUpgradeLevels, normalizeUpgradeLevels };
