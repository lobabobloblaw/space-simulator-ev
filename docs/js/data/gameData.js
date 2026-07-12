/**
 * All game data and configuration
 */

// Canonical NPC stat table — SpawnSystem clones this at construction and the
// debug spawner reads it directly. Values are the live, balanced numbers
// (this table previously carried a stale older design that nothing spawned).
export const npcTypes = {
    freighter: {
        size: 18,
        color: "#4488ff",
        maxSpeed: 0.25,
        thrust: 0.002,
        turnSpeed: 0.008,
        health: 80,
        maxHealth: 80,
        credits: 100,
        behavior: "passive",
        weapon: { type: "laser", damage: 5, cooldown: 30 }
    },
    trader: {
        size: 12,
        color: "#44ff88",
        maxSpeed: 0.35,
        thrust: 0.003,
        turnSpeed: 0.01,
        health: 60,
        maxHealth: 60,
        credits: 75,
        behavior: "passive",
        weapon: null
    },
    patrol: {
        size: 14,
        color: "#8888ff",
        maxSpeed: 0.45,
        thrust: 0.004,
        turnSpeed: 0.012,
        health: 100,
        maxHealth: 100,
        credits: 50,
        behavior: "lawful",
        weapon: { type: "rapid", damage: 7, cooldown: 8 }
    },
    pirate: {
        size: 10,
        color: "#ff4444",
        maxSpeed: 0.5,
        thrust: 0.005,
        turnSpeed: 0.015,
        health: 70,
        maxHealth: 70,
        credits: 150,
        behavior: "aggressive",
        weapon: { type: "plasma", damage: 15, cooldown: 25 }
    },
    elite_pirate: {
        size: 14,
        color: "#ff2222",
        maxSpeed: 0.55,
        thrust: 0.006,
        turnSpeed: 0.018,
        health: 120,
        maxHealth: 120,
        credits: 300,
        behavior: "aggressive",
        weapon: { type: "plasma", damage: 20, cooldown: 20 },
        isElite: true
    },
    void_hunter: {
        size: 12,
        color: "#a06bff",
        maxSpeed: 0.65,
        thrust: 0.007,
        turnSpeed: 0.02,
        health: 150,
        maxHealth: 150,
        credits: 400,
        behavior: "aggressive",
        weapon: { type: "void", damage: 12, cooldown: 24 },
        isElite: true
    }
};

export const commodities = {
    food: { name: "Food", basePrice: 20, icon: "🌾" },
    ore: { name: "Ore", basePrice: 50, icon: "⛏️" },
    tech: { name: "Tech", basePrice: 150, icon: "💻" },
    fuel_cells: { name: "Fuel Cells", basePrice: 80, icon: "⚡" },
    weapons: { name: "Weapons", basePrice: 200, icon: "🔫" },
    luxury: { name: "Luxury Goods", basePrice: 300, icon: "💎" }
};

export const shopInventory = {
    weapon1: { 
        name: "Mining Laser", 
        type: "weapon", 
        price: 150, 
        value: { type: "mining", damage: 2, cooldown: 35 },
        description: "Very weak mining laser (2 damage, slow)"
    },
    shield1: { 
        name: "Basic Shield", 
        type: "shield", 
        price: 500, 
        value: 25,
        description: "Provides 25 shield points"
    },
    shield2: { 
        name: "Advanced Shield", 
        type: "shield", 
        price: 1500, 
        value: 50,
        description: "Provides 50 shield points"
    },
    engine2: { 
        name: "Enhanced Engine", 
        type: "engine", 
        price: 800, 
        value: 2,
        description: "Increases thrust by 50% and speed by 30%"
    },
    engine3: { 
        name: "Military Engine", 
        type: "engine", 
        price: 2000, 
        value: 3,
        description: "Increases thrust by 100% and speed by 60%"
    },
    weapon2: { 
        name: "Rapid Laser", 
        type: "weapon", 
        price: 600, 
        value: { type: "rapid", damage: 5, cooldown: 12 },
        description: "Spray-fire; best at close range"
    },
    weapon3: { 
        name: "Plasma Cannon", 
        type: "weapon", 
        price: 1200, 
        value: { type: "plasma", damage: 20, cooldown: 28, speed: 1.9 },
        description: "High burst; slower bolts (20 dmg, 28 cd)"
    },
    cargo1: { 
        name: "Cargo Expansion", 
        type: "cargo", 
        price: 400, 
        value: 5,
        description: "Adds 5 cargo slots"
    },
    cargo2: { 
        name: "Large Cargo Bay", 
        type: "cargo", 
        price: 1000, 
        value: 10,
        description: "Adds 10 cargo slots"
    },
    radar1: {
        name: "Radar MK I",
        type: "radar",
        price: 350,
        value: 1,
        description: "Basic target separation on minimap"
    },
    radar2: {
        name: "Radar MK II",
        type: "radar",
        price: 900,
        value: 2,
        description: "Faction colors and hostile pings on minimap"
    }
};

export const planets = [
    { 
        x: 700, y: 400, radius: 120, name: "Terra Nova", color: "#4A90E2", landable: true,
        description: "A lush oceanic world with floating cities connected by quantum bridges. The atmosphere hums with advanced technology and the scent of exotic spices from the orbital markets.",
        longDescription: "Terra Nova is a glittering archipelago of floating cities, each one stabilized by quantum anchors sunk deep beneath the ocean. Merchant skiffs and shuttle ferries drift between chrome platforms while distant orbital elevators stitch the sky to the sea. Markets overflow with imported luxuries and clean technology; credits are earned quickly here—but spent even faster. Docking controllers speak in clipped, efficient phrases, and the night horizon glows with the soft arc of satellites sweeping overhead.",
        commodityPrices: {
            food: 15,
            ore: 70,
            tech: 120,
            fuel_cells: 85,
            weapons: 250,
            luxury: 280
        },
        shopItems: ["weapon1", "shield1", "engine2", "weapon2", "radar1"]
    },
    { 
        x: -1200, y: -900, radius: 180, name: "Crimson Moon", color: "#E74C3C", landable: true,
        description: "This volcanic mining colony glows red from the molten ore refineries. Hardy miners extract rare crystals from the unstable crust while dodging frequent seismic tremors.",
        longDescription: "The Crimson Moon rumbles underfoot—industrial cathedrals belching steam into a copper sky. Conveyor lines crawl across the basalt, dragging ore toward refineries that cast everything in furnace light. Miners trade stories of vent quakes and pirate skirmishes in low orbit. Prices swing with each convoy arrival; a sharp pilot can turn turbulence into profit, but vigilance is survival: the siren of a breach alarm carries for miles across the slag plains.",
        commodityPrices: {
            food: 40,
            ore: 30,
            tech: 180,
            fuel_cells: 60,
            weapons: 150,
            luxury: 400
        },
        shopItems: ["weapon1", "weapon2", "weapon3", "cargo1"]
    },
    { 
        x: 1600, y: -500, radius: 100, name: "Ice World", color: "#85C1E9", landable: true,
        description: "An arctic research station built into crystalline ice caverns. Scientists here study quantum ice formations that might hold the key to faster-than-light travel.",
        longDescription: "Ice World is a chorus of wind through crystalline corridors. The research array clings to the glacier’s edge, its antennae haloed in auroras. Supply drones land with the precision of metronomes; inside the domes, frost-white labs hum with experiments and quiet arguments over exotic matter. Trade is pragmatic and lean—fuel cells and tech components move briskly, while luxury goods sit untouched beneath frost.",
        commodityPrices: {
            food: 35,
            ore: 90,
            tech: 100,
            fuel_cells: 100,
            weapons: 300,
            luxury: 200
        },
        shopItems: ["shield2", "engine3", "cargo2", "radar2"]
    },
    { 
        x: -600, y: 1200, radius: 75, name: "Mining Station", color: "#F39C12", landable: true,
        description: "A bustling asteroid processing facility where fortune-seekers trade rare metals. The station's mechanical arms constantly harvest resources from nearby debris fields.",
        longDescription: "The Mining Station hangs in a halo of dust and light, a spider of steel with a dozen articulated arms sorting rubble from riches. Docking clamps shudder as ore barges lock in; along the ring corridor, vendors hawk repair kits and last-chance upgrades. Patrols are never far—but neither are opportunists sifting the lanes for unattended cargo. It’s loud, honest work here, and the sound of profit is the grind of rock against rock.",
        commodityPrices: {
            food: 50,
            ore: 25,
            tech: 200,
            fuel_cells: 70,
            weapons: 180,
            luxury: 350
        },
        shopItems: ["weapon1", "cargo1", "cargo2", "engine2"]
    }
];

export const missions = [
    {
        id: 'first_kill',
        type: 'bounty',
        title: 'First Blood',
        description: 'Destroy your first pirate vessel',
        target: 'pirate',
        count: 1,
        reward: 200,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 1;
        }
    },
    {
        id: 'trader',
        type: 'trade',
        title: 'Merchant Apprentice',
        description: 'Earn 500 credits from trading',
        targetCredits: 750,
        reward: 300,
        isComplete: function(ship) {
            return ship ? ship.credits >= 750 : false;
        }
    },
    {
        id: 'bounty_hunter',
        type: 'bounty',
        title: 'Bounty Hunter',
        description: 'Destroy 3 pirate vessels',
        target: 'pirate',
        count: 3,
        reward: 500,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 3;
        }
    },
    // Delivery/Courier missions (require mission state tracking system)
    {
        id: 'delivery_food_crimson',
        type: 'delivery',
        title: 'Miner Relief Supplies',
        description: 'Deliver 5 units of Food from Terra Nova to Crimson Moon. The mining colony is running low on rations.',
        pickupPlanet: 'Terra Nova',
        deliveryPlanet: 'Crimson Moon',
        cargo: 'food',
        amount: 5,
        reward: 400,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_ore_ice',
        type: 'delivery',
        title: 'Research Materials',
        description: 'Transport 8 units of Ore from Crimson Moon to Ice World for quantum ice experiments.',
        pickupPlanet: 'Crimson Moon',
        deliveryPlanet: 'Ice World',
        cargo: 'ore',
        amount: 8,
        reward: 650,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_tech_terra',
        type: 'delivery',
        title: 'Maintenance Parts',
        description: 'Bring 4 units of Tech from Ice World to Terra Nova. The floating cities need replacement components.',
        pickupPlanet: 'Ice World',
        deliveryPlanet: 'Terra Nova',
        cargo: 'tech',
        amount: 4,
        reward: 550,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_fuel_emergency',
        type: 'delivery',
        title: 'Emergency Fuel Run',
        description: 'URGENT: Rush 10 Fuel Cells from Mining Station to Crimson Moon. Refinery backup generators failing!',
        pickupPlanet: 'Mining Station',
        deliveryPlanet: 'Crimson Moon',
        cargo: 'fuel_cells',
        amount: 10,
        reward: 900,
        timeLimit: 300,
        urgent: true,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_luxury_ice',
        type: 'delivery',
        title: 'Morale Boost',
        description: 'Deliver 3 units of Luxury Goods from Terra Nova to Ice World. Researchers deserve better coffee.',
        pickupPlanet: 'Terra Nova',
        deliveryPlanet: 'Ice World',
        cargo: 'luxury',
        amount: 3,
        reward: 800,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_weapons_defense',
        type: 'delivery',
        title: 'Station Defense',
        description: 'Transport 6 units of Weapons from Crimson Moon to Mining Station. Pirate activity is increasing.',
        pickupPlanet: 'Crimson Moon',
        deliveryPlanet: 'Mining Station',
        cargo: 'weapons',
        amount: 6,
        reward: 750,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_food_station',
        type: 'delivery',
        title: 'Crew Rations',
        description: 'Bring 7 units of Food from Terra Nova to Mining Station. Fresh supplies always lift morale.',
        pickupPlanet: 'Terra Nova',
        deliveryPlanet: 'Mining Station',
        cargo: 'food',
        amount: 7,
        reward: 450,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_tech_urgent',
        type: 'delivery',
        title: 'Critical Research Equipment',
        description: 'URGENT: Rush 5 units of Tech from Terra Nova to Ice World. Quantum stabilizer failure imminent!',
        pickupPlanet: 'Terra Nova',
        deliveryPlanet: 'Ice World',
        cargo: 'tech',
        amount: 5,
        reward: 1100,
        timeLimit: 240,
        urgent: true,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_ore_construction',
        type: 'delivery',
        title: 'Construction Materials',
        description: 'Deliver 12 units of Ore from Mining Station to Terra Nova for platform expansion.',
        pickupPlanet: 'Mining Station',
        deliveryPlanet: 'Terra Nova',
        cargo: 'ore',
        amount: 12,
        reward: 700,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    {
        id: 'delivery_luxury_crimson',
        type: 'delivery',
        title: 'Worker Bonus Package',
        description: 'Transport 4 units of Luxury Goods from Terra Nova to Crimson Moon. Miners earned hazard bonuses.',
        pickupPlanet: 'Terra Nova',
        deliveryPlanet: 'Crimson Moon',
        cargo: 'luxury',
        amount: 4,
        reward: 850,
        timeLimit: null,
        urgent: false,
        isComplete: function(ship, missionState) {
            return missionState?.delivered === true;
        }
    },
    // Bounty/Combat missions
    {
        id: 'pirate_scourge',
        type: 'bounty',
        title: 'Pirate Scourge',
        description: 'Eliminate 5 pirate vessels threatening shipping lanes near Terra Nova.',
        target: 'pirate',
        count: 5,
        reward: 800,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 5;
        }
    },
    {
        id: 'pirate_menace',
        type: 'bounty',
        title: 'Pirate Menace',
        description: 'Destroy 10 pirate ships. Command is offering premium bounties for experienced hunters.',
        target: 'pirate',
        count: 10,
        reward: 1500,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 10;
        }
    },
    {
        id: 'pirate_warlord',
        type: 'bounty',
        title: 'Pirate Warlord',
        description: 'Hunt down 15 pirates. Only elite pilots dare take this contract.',
        target: 'pirate',
        count: 15,
        reward: 2500,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 15;
        }
    },
    {
        id: 'convoy_protection',
        type: 'bounty',
        title: 'Convoy Protection',
        description: 'Patrol trade routes and eliminate any hostile vessels. Payment for 3 confirmed kills.',
        target: 'pirate',
        count: 3,
        reward: 600,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 3;
        }
    },
    {
        id: 'ace_pilot',
        type: 'bounty',
        title: 'Ace Pilot',
        description: 'Achieve 20 total kills. Prove yourself worthy of the Ace designation.',
        target: 'any',
        count: 20,
        reward: 3000,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 20;
        }
    },
    {
        id: 'rapid_response',
        type: 'bounty',
        title: 'Rapid Response',
        description: 'Quick contract: Neutralize 2 hostile contacts near Crimson Moon immediately.',
        target: 'pirate',
        count: 2,
        reward: 350,
        urgent: true,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 2;
        }
    },
    {
        id: 'sector_sweep',
        type: 'bounty',
        title: 'Sector Sweep',
        description: 'Clear hostile presence: 7 confirmed pirate eliminations required.',
        target: 'pirate',
        count: 7,
        reward: 1200,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 7;
        }
    },
    {
        id: 'combat_veteran',
        type: 'bounty',
        title: 'Combat Veteran',
        description: 'Elite contract: 25 total kills. Reserved for veteran combat pilots only.',
        target: 'any',
        count: 25,
        reward: 4000,
        isComplete: function(ship, missionState) {
            if (!ship) return false;
            const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
            return killsSinceAccept >= 25;
        }
    },
    // Escort missions (require mission state tracking and NPC escort system)
    {
        id: 'escort_vip',
        type: 'escort',
        title: 'VIP Transport',
        description: 'Escort a diplomatic courier from Terra Nova to Ice World. Hostile interception expected.',
        escortType: 'trader',
        startPlanet: 'Terra Nova',
        endPlanet: 'Ice World',
        reward: 1200,
        threatLevel: 'high',
        isComplete: function(ship, missionState) {
            return missionState?.escortArrived === true;
        }
    },
    {
        id: 'escort_freighter',
        type: 'escort',
        title: 'Freighter Guard Duty',
        description: 'Protect a cargo freighter traveling from Mining Station to Terra Nova. Pirates are active in the sector.',
        escortType: 'freighter',
        startPlanet: 'Mining Station',
        endPlanet: 'Terra Nova',
        reward: 700,
        threatLevel: 'medium',
        isComplete: function(ship, missionState) {
            return missionState?.escortArrived === true;
        }
    },
    {
        id: 'escort_research',
        type: 'escort',
        title: 'Research Vessel Protection',
        description: 'Guard a research vessel from Ice World to Crimson Moon. They need samples from the volcanic flows.',
        escortType: 'trader',
        startPlanet: 'Ice World',
        endPlanet: 'Crimson Moon',
        reward: 900,
        threatLevel: 'medium',
        isComplete: function(ship, missionState) {
            return missionState?.escortArrived === true;
        }
    },
    {
        id: 'escort_convoy',
        type: 'escort',
        title: 'Convoy Escort',
        description: 'Lead a supply convoy from Terra Nova to Mining Station. Multiple hostile contacts reported along the route.',
        escortType: 'freighter',
        startPlanet: 'Terra Nova',
        endPlanet: 'Mining Station',
        reward: 1500,
        threatLevel: 'high',
        isComplete: function(ship, missionState) {
            return missionState?.escortArrived === true;
        }
    },
    {
        id: 'escort_medical',
        type: 'escort',
        title: 'Medical Emergency',
        description: 'URGENT: Escort medical transport from Crimson Moon to Terra Nova. Lives depend on safe arrival!',
        escortType: 'trader',
        startPlanet: 'Crimson Moon',
        endPlanet: 'Terra Nova',
        reward: 1800,
        threatLevel: 'high',
        urgent: true,
        timeLimit: 400,
        isComplete: function(ship, missionState) {
            return missionState?.escortArrived === true;
        }
    }
];

/**
 * Ship classes - Purchasable ships with varying stats
 * Each ship has trade-offs between combat, cargo, and maneuverability
 */
export const shipClasses = {
    // Starter ship (default, not purchasable)
    shuttle: {
        id: 'shuttle',
        name: 'Scout Shuttle',
        price: 0,
        description: 'Basic starter vessel. Light, fast, but fragile with minimal cargo.',
        class: 'scout',
        // Base stats
        maxSpeed: 0.8,
        thrust: 0.012,
        turnSpeed: 0.015,
        maxHealth: 100,
        maxShield: 0,
        cargoCapacity: 10,
        weaponSlots: 1,
        // Visual
        size: 12,
        width: 14,
        color: '#95A5A6',
        // Requirements
        requiredKills: 0,
        requiredCredits: 0
    },

    // Light fighter - combat focused
    interceptor: {
        id: 'interceptor',
        name: 'Viper Interceptor',
        price: 8000,
        description: 'Swift combat interceptor. Excellent maneuverability and speed, but limited cargo space.',
        class: 'fighter',
        maxSpeed: 1.4,
        thrust: 0.020,
        turnSpeed: 0.025,
        maxHealth: 120,
        maxShield: 25,
        cargoCapacity: 8,
        weaponSlots: 2,
        size: 11,
        width: 13,
        color: '#E74C3C',
        requiredKills: 5,
        requiredCredits: 1000
    },

    // Balanced ship - good all-rounder
    corvette: {
        id: 'corvette',
        name: 'Falcon Corvette',
        price: 15000,
        description: 'Versatile mid-class ship. Balanced combat ability, decent cargo, and good handling.',
        class: 'corvette',
        maxSpeed: 1.0,
        thrust: 0.015,
        turnSpeed: 0.018,
        maxHealth: 180,
        maxShield: 50,
        cargoCapacity: 20,
        weaponSlots: 2,
        size: 14,
        width: 16,
        color: '#3498DB',
        requiredKills: 10,
        requiredCredits: 5000
    },

    // Cargo hauler - trading focused
    freighter: {
        id: 'freighter',
        name: 'Atlas Freighter',
        price: 20000,
        description: 'Heavy cargo vessel. Massive cargo hold, but slow and poor combat performance.',
        class: 'freighter',
        maxSpeed: 0.5,
        thrust: 0.008,
        turnSpeed: 0.010,
        maxHealth: 250,
        maxShield: 75,
        cargoCapacity: 50,
        weaponSlots: 1,
        size: 20,
        width: 26,
        color: '#8B7355',
        requiredKills: 0,
        requiredCredits: 10000
    },

    // Heavy fighter - combat powerhouse
    gunship: {
        id: 'gunship',
        name: 'Hammer Gunship',
        price: 35000,
        description: 'Heavy assault gunship. Maximum firepower and durability at the cost of speed.',
        class: 'gunship',
        maxSpeed: 0.7,
        thrust: 0.011,
        turnSpeed: 0.013,
        maxHealth: 300,
        maxShield: 100,
        cargoCapacity: 15,
        weaponSlots: 3,
        size: 18,
        width: 22,
        color: '#1E3A5F',
        requiredKills: 25,
        requiredCredits: 15000
    },

    // Ultimate ship - best all-around
    battlecruiser: {
        id: 'battlecruiser',
        name: 'Phoenix Battlecruiser',
        price: 75000,
        description: 'Elite capital-class vessel. Superior in every category. The ultimate endgame ship.',
        class: 'capital',
        maxSpeed: 1.2,
        thrust: 0.018,
        turnSpeed: 0.020,
        maxHealth: 400,
        maxShield: 150,
        cargoCapacity: 30,
        weaponSlots: 4,
        size: 22,
        width: 28,
        color: '#9B59B6',
        requiredKills: 50,
        requiredCredits: 50000
    }
};
