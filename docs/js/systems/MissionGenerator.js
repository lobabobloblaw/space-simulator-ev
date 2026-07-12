/**
 * MissionGenerator - Procedural mission generation system
 * Generates infinite variations of delivery, bounty, and escort missions
 */

import { planets, commodities } from '../data/gameData.js';

export class MissionGenerator {
    constructor() {
        this._generatedCount = 0;
        this._usedCombinations = new Set();

        // Mission templates with variety pools
        this.deliveryTemplates = [
            { urgentChance: 0.15, basePay: 400, amountRange: [3, 10] },
            { urgentChance: 0.25, basePay: 800, amountRange: [5, 15] },
            { urgentChance: 0.10, basePay: 600, amountRange: [4, 12] }
        ];

        this.bountyTemplates = [
            { target: 'pirate', countRange: [2, 5], basePay: 350 },
            { target: 'pirate', countRange: [5, 10], basePay: 800 },
            { target: 'pirate', countRange: [7, 15], basePay: 1200 },
            { target: 'any', countRange: [10, 20], basePay: 2000 }
        ];

        this.escortTemplates = [
            { escortType: 'trader', threatLevel: 'medium', basePay: 700 },
            { escortType: 'freighter', threatLevel: 'medium', basePay: 900 },
            { escortType: 'trader', threatLevel: 'high', basePay: 1200 },
            { escortType: 'freighter', threatLevel: 'high', basePay: 1500 }
        ];

        // Flavor text templates
        this.deliveryDescriptions = [
            'Transport {amount} units of {cargo} from {start} to {end}. Standard courier contract.',
            'Deliver {amount} {cargo} to {end}. Pick up at {start}.',
            '{end} is requesting {amount} units of {cargo} from {start}.',
            'Urgent delivery: {amount} {cargo} needed at {end}. Launch from {start}.',
            'Contract: Move {amount} units of {cargo} between {start} and {end}.'
        ];

        this.bountyDescriptions = [
            'Eliminate {count} hostile {target} vessels. Command is paying bounties.',
            'Sector patrol: Destroy {count} {target} contacts.',
            'Bounty contract: {count} confirmed {target} kills required.',
            'Hunt down {count} {target} ships threatening our lanes.',
            'Combat mission: Neutralize {count} {target} hostiles.'
        ];

        this.escortDescriptions = [
            'Escort {type} from {start} to {end}. {threat} threat level.',
            'Guard duty: Protect {type} traveling {start} to {end}. Expect {threat} resistance.',
            'Convoy protection: {type} needs safe passage from {start} to {end}.',
            'Security contract: Escort {type} between {start} and {end}. Threat: {threat}.'
        ];

        this.deliveryTitles = [
            'Courier Run', 'Cargo Delivery', 'Supply Mission', 'Transport Contract',
            'Freight Haul', 'Express Delivery', 'Logistics Run', 'Cargo Transfer'
        ];

        this.bountyTitles = [
            'Combat Patrol', 'Bounty Hunt', 'Sector Sweep', 'Elimination Contract',
            'Hostile Cleanup', 'Hunter Mission', 'Combat Assignment', 'Bounty Contract'
        ];

        this.escortTitles = [
            'Escort Mission', 'Guard Duty', 'Convoy Protection', 'Security Detail',
            'Safe Passage', 'Escort Contract', 'Protection Assignment', 'Guardian Mission'
        ];
    }

    /**
     * Generate a random delivery mission
     */
    generateDeliveryMission(difficultyMod = 1) {
        const template = this._randomChoice(this.deliveryTemplates);
        const planetArray = Object.values(planets);
        const startPlanet = this._randomChoice(planetArray);
        let endPlanet = this._randomChoice(planetArray);

        // Ensure different planets
        let attempts = 0;
        while (endPlanet.name === startPlanet.name && attempts < 10) {
            endPlanet = this._randomChoice(planetArray);
            attempts++;
        }

        const commodityKeys = Object.keys(commodities);
        const cargoType = this._randomChoice(commodityKeys);
        const cargo = commodities[cargoType];

        const amount = this._randomInt(template.amountRange[0], template.amountRange[1]);
        const isUrgent = Math.random() < template.urgentChance;
        const reward = Math.floor(template.basePay * difficultyMod * (isUrgent ? 1.5 : 1));

        const description = this._randomChoice(this.deliveryDescriptions)
            .replace('{amount}', amount)
            .replace('{cargo}', cargo.name)
            .replace('{start}', startPlanet.name)
            .replace('{end}', endPlanet.name);

        const title = (isUrgent ? 'URGENT: ' : '') + this._randomChoice(this.deliveryTitles);

        return {
            id: `proc_delivery_${this._generatedCount++}`,
            type: 'delivery',
            title,
            description,
            pickupPlanet: startPlanet.name,
            deliveryPlanet: endPlanet.name,
            cargo: cargoType,
            amount,
            reward,
            timeLimit: isUrgent ? this._randomInt(200, 400) : null,
            urgent: isUrgent,
            procedural: true,
            isComplete: function(ship, missionState) {
                return missionState?.delivered === true;
            }
        };
    }

    /**
     * Generate a random bounty mission
     */
    generateBountyMission(difficultyMod = 1) {
        const template = this._randomChoice(this.bountyTemplates);
        const count = this._randomInt(template.countRange[0], template.countRange[1]);
        const reward = Math.floor(template.basePay * difficultyMod);

        const description = this._randomChoice(this.bountyDescriptions)
            .replace('{count}', count)
            .replace('{target}', template.target);

        const title = this._randomChoice(this.bountyTitles);

        return {
            id: `proc_bounty_${this._generatedCount++}`,
            type: 'bounty',
            title,
            description,
            target: template.target,
            count,
            reward,
            procedural: true,
            isComplete: function(ship, missionState) {
                if (!ship) return false;
                const killsSinceAccept = ship.kills - (missionState?.killsAtAccept || 0);
                return killsSinceAccept >= count;
            }
        };
    }

    /**
     * Generate a random escort mission
     */
    generateEscortMission(difficultyMod = 1) {
        const template = this._randomChoice(this.escortTemplates);
        const planetArray = Object.values(planets);
        const startPlanet = this._randomChoice(planetArray);
        let endPlanet = this._randomChoice(planetArray);

        // Ensure different planets
        let attempts = 0;
        while (endPlanet.name === startPlanet.name && attempts < 10) {
            endPlanet = this._randomChoice(planetArray);
            attempts++;
        }

        const reward = Math.floor(template.basePay * difficultyMod);
        const isUrgent = Math.random() < 0.2;

        const description = this._randomChoice(this.escortDescriptions)
            .replace('{type}', template.escortType)
            .replace('{start}', startPlanet.name)
            .replace('{end}', endPlanet.name)
            .replace('{threat}', template.threatLevel);

        const title = (isUrgent ? 'URGENT: ' : '') + this._randomChoice(this.escortTitles);

        return {
            id: `proc_escort_${this._generatedCount++}`,
            type: 'escort',
            title,
            description,
            escortType: template.escortType,
            startPlanet: startPlanet.name,
            endPlanet: endPlanet.name,
            reward,
            threatLevel: template.threatLevel,
            urgent: isUrgent,
            timeLimit: isUrgent ? this._randomInt(300, 500) : null,
            procedural: true,
            isComplete: function(ship, missionState) {
                return missionState?.escortArrived === true;
            }
        };
    }

    /**
     * Generate a batch of random missions
     * @param {number} count - Number of missions to generate
     * @param {object} options - Generation options
     * @returns {Array} Array of generated missions
     */
    generateMissionBatch(count = 5, options = {}) {
        const {
            difficultyMod = 1,
            typeWeights = { delivery: 0.4, bounty: 0.35, escort: 0.25 }
        } = options;

        const missions = [];

        for (let i = 0; i < count; i++) {
            const roll = Math.random();
            let mission;

            if (roll < typeWeights.delivery) {
                mission = this.generateDeliveryMission(difficultyMod);
            } else if (roll < typeWeights.delivery + typeWeights.bounty) {
                mission = this.generateBountyMission(difficultyMod);
            } else {
                mission = this.generateEscortMission(difficultyMod);
            }

            missions.push(mission);
        }

        return missions;
    }

    /**
     * Calculate difficulty modifier based on player progress
     * @param {object} ship - Player ship data
     * @returns {number} Difficulty multiplier
     */
    calculateDifficultyMod(ship) {
        if (!ship) return 1;

        let mod = 1;

        // Scale with kills
        if (ship.kills >= 25) mod += 0.5;
        else if (ship.kills >= 15) mod += 0.3;
        else if (ship.kills >= 10) mod += 0.2;

        // Scale with credits
        if (ship.credits >= 10000) mod += 0.3;
        else if (ship.credits >= 5000) mod += 0.2;

        // Scale with upgrades (check if player has advanced gear)
        if (ship.maxShield >= 50) mod += 0.2;
        if (ship.weapon?.damage >= 15) mod += 0.2;

        return Math.min(mod, 2.5); // Cap at 2.5x
    }

    // Utility functions
    _randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    _randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

export default MissionGenerator;
