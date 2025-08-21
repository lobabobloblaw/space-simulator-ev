/**
 * All game data and configuration
 */

export const npcTypes = {
    freighter: { 
        color: "#8B7355", 
        behavior: "passive",
        maxSpeed: 0.25,
        thrust: 0.002,
        turnSpeed: 0.006,
        size: 22,
        width: 28,
        credits: 800,
        health: 150,
        maxHealth: 150,
        weapon: { type: "laser", damage: 3, cooldown: 40 }
    },
    trader: { 
        color: "#95A5A6", 
        behavior: "passive",
        maxSpeed: 0.45,
        thrust: 0.004,
        turnSpeed: 0.012,
        size: 12,
        width: 14,
        credits: 200,
        health: 50,
        maxHealth: 50,
        weapon: null
    },
    pirate: { 
        color: "#E74C3C", 
        behavior: "aggressive",
        maxSpeed: 0.7,
        thrust: 0.007,
        turnSpeed: 0.02,
        size: 11,
        width: 12,
        credits: 150,
        health: 80,
        maxHealth: 80,
        weapon: { type: "laser", damage: 10, cooldown: 18 }
    },
    patrol: { 
        color: "#1E3A5F",
        behavior: "lawful",
        maxSpeed: 1.2,
        thrust: 0.015,
        turnSpeed: 0.08,
        size: 16,
        width: 18,
        credits: 100,
        health: 150,
        maxHealth: 150,
        weapon: { type: "rapid", damage: 6, cooldown: 20 }
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
        shopItems: ["weapon1", "shield1", "engine2", "weapon2"]
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
        shopItems: ["shield2", "engine3", "cargo2"]
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
        isComplete: function(ship) { 
            // Support both window.ship (hybrid) and passed ship (pure)
            const s = ship || window.ship;
            return s ? s.kills >= 1 : false;
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
            const s = ship || window.ship;
            return s ? s.credits >= 750 : false;
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
        isComplete: function(ship) { 
            const s = ship || window.ship;
            return s ? s.kills >= 3 : false;
        }
    }
];
