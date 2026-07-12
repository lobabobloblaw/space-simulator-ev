/**
 * Zone Definitions for Roguelike Progression
 *
 * Players progress through zones of increasing difficulty.
 * Each zone has unique enemy spawns, difficulty scaling, and a potential boss gate.
 */

export const zones = [
    {
        id: 'core',
        name: 'Core Systems',
        description: 'The familiar trading lanes. Pirates lurk, but patrols keep order.',
        difficulty: 1,
        difficultyMultiplier: 1.0,

        // Enemy configuration
        enemyTypes: ['trader', 'freighter', 'pirate', 'patrol'],
        pirateSpawnWeight: 0.3,    // 30% of spawns are pirates
        eliteChance: 0,            // No elites in starting zone

        // Planets in this zone
        planets: ['Terra Nova', 'Mining Station'],

        // Boss gate (null = no boss required to leave)
        bossId: null,

        // Requirements to advance to next zone
        advanceRequirements: {
            kills: 5,
            credits: 1000
        },

        // Visual/audio theming
        theme: {
            starDensity: 1.0,
            nebulaColor: 'rgba(20, 60, 100, 0.15)',
            ambientTrack: 'ambient_calm'
        }
    },
    {
        id: 'frontier',
        name: 'Frontier Space',
        description: 'Beyond patrol reach. Pirates grow bolder, traders more desperate.',
        difficulty: 2,
        difficultyMultiplier: 1.5,

        enemyTypes: ['trader', 'pirate', 'patrol'],
        pirateSpawnWeight: 0.5,
        eliteChance: 0.1,

        planets: ['Crimson Moon'],

        bossId: null,

        advanceRequirements: {
            kills: 15,
            credits: 5000
        },

        theme: {
            starDensity: 0.8,
            nebulaColor: 'rgba(100, 40, 40, 0.2)',
            ambientTrack: 'ambient_tense'
        }
    },
    {
        id: 'outer_rim',
        name: 'Outer Rim',
        description: 'Lawless territory. Only the strong survive here.',
        difficulty: 3,
        difficultyMultiplier: 2.0,

        enemyTypes: ['pirate', 'elite_pirate'],
        pirateSpawnWeight: 0.7,
        eliteChance: 0.3,

        planets: ['Ice World'],

        // Must defeat Pirate Lord to enter The Void
        bossId: 'pirate_lord',

        advanceRequirements: {
            bossDefeated: 'pirate_lord'
        },

        theme: {
            starDensity: 0.6,
            nebulaColor: 'rgba(60, 20, 80, 0.25)',
            ambientTrack: 'ambient_danger'
        }
    },
    {
        id: 'void',
        name: 'The Void',
        description: 'The edge of known space. Something ancient awaits.',
        difficulty: 4,
        difficultyMultiplier: 3.0,

        enemyTypes: ['elite_pirate', 'void_hunter'],
        pirateSpawnWeight: 0.8,
        eliteChance: 0.5,

        planets: [],  // No safe havens in The Void

        // Final boss - defeating grants victory
        bossId: 'void_king',

        // No advance requirements - this is the final zone
        advanceRequirements: null,

        theme: {
            starDensity: 0.3,
            nebulaColor: 'rgba(20, 0, 40, 0.4)',
            ambientTrack: 'ambient_void'
        }
    }
];

/**
 * Boss definitions
 */
export const bosses = {
    pirate_lord: {
        id: 'pirate_lord',
        name: 'Captain Blackstar',
        title: 'Pirate Lord',
        type: 'boss',

        // Combat stats
        health: 400,
        maxHealth: 400,
        size: 28,
        maxSpeed: 0.6,
        thrust: 0.004,
        turnSpeed: 0.012,

        // Weapon
        weapon: {
            type: 'plasma',
            damage: 18,
            cooldown: 18,
            projectileSpeed: 0.5
        },

        // AI behavior phases
        phases: [
            { healthThreshold: 1.0, behavior: 'aggressive', addSpawnCount: 0 },
            { healthThreshold: 0.5, behavior: 'berserk', addSpawnCount: 2 }
        ],

        // Rewards
        drops: {
            credits: 2000
        },

        // What defeating this boss unlocks
        unlocks: {
            type: 'upgrade',
            id: 'shield2'   // must be a shopInventory key (see gameData.js)
        },

        // Dialogue
        spawnMessage: 'You dare enter my domain?',
        phase2Message: 'You\'ll regret that!',
        deathMessage: 'This isn\'t... over...'
    },

    void_king: {
        id: 'void_king',
        name: 'The Void King',
        title: 'Herald of the End',
        type: 'boss',

        health: 800,
        maxHealth: 800,
        size: 40,
        maxSpeed: 0.7,
        thrust: 0.005,
        turnSpeed: 0.008,

        weapon: {
            type: 'void',
            damage: 30,
            cooldown: 20,
            projectileSpeed: 0.6
        },

        phases: [
            { healthThreshold: 1.0, behavior: 'tactical', addSpawnCount: 0 },
            { healthThreshold: 0.6, behavior: 'aggressive', addSpawnCount: 3 },
            { healthThreshold: 0.3, behavior: 'desperate', addSpawnCount: 5 }
        ],

        drops: {
            credits: 5000
        },

        // Defeating the Void King wins the run
        victoryTrigger: true,

        unlocks: {
            type: 'ship',
            id: 'battlecruiser'
        },

        spawnMessage: 'So... another mortal seeks the void.',
        phase2Message: 'Your persistence is... irritating.',
        phase3Message: 'ENOUGH!',
        deathMessage: 'The void... will remember...'
    }
};

/**
 * Helper: Get zone by ID
 */
export function getZone(zoneId) {
    return zones.find(z => z.id === zoneId) || zones[0];
}

/**
 * Helper: Get next zone after current
 */
export function getNextZone(currentZoneId) {
    const idx = zones.findIndex(z => z.id === currentZoneId);
    if (idx === -1 || idx >= zones.length - 1) return null;
    return zones[idx + 1];
}

/**
 * Helper: Get boss by ID
 */
export function getBoss(bossId) {
    return bosses[bossId] || null;
}

/**
 * Helper: Check if player meets zone advance requirements
 */
export function canAdvanceZone(currentZoneId, playerStats) {
    const zone = getZone(currentZoneId);
    const reqs = zone.advanceRequirements;

    if (!reqs) return false; // Final zone

    // Check boss requirement
    if (reqs.bossDefeated) {
        if (!playerStats.bossesDefeated?.includes(reqs.bossDefeated)) {
            return false;
        }
    }

    // Check kills requirement
    if (reqs.kills && (playerStats.kills || 0) < reqs.kills) {
        return false;
    }

    // Check credits requirement
    if (reqs.credits && (playerStats.credits || 0) < reqs.credits) {
        return false;
    }

    return true;
}

export default { zones, bosses, getZone, getNextZone, getBoss, canAdvanceZone };
