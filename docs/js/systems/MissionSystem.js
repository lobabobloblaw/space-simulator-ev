/**
 * Mission System - Handles mission acceptance, tracking, and completion
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { missions } from '../data/gameData.js';

export default class MissionSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.allMissions = new Map();
    }

    async init() {
        // Load all available missions
        missions.forEach(m => this.allMissions.set(m.id, m));

        // Listen for mission-related events
        this.eventBus.on(GameEvents.MISSION_ACCEPT, (data) => {
            if (!data || !data.missionId) return;
            this.acceptMission(data.missionId);
        });

        this.eventBus.on(GameEvents.MISSION_COMPLETE, (data) => {
            if (!data || !data.missionId) return;
            this.completeMission(data.missionId);
        });

        this.eventBus.on(GameEvents.MISSION_ABANDON, (data) => {
            if (!data || !data.missionId) return;
            this.abandonMission(data.missionId);
        });

        this.eventBus.on(GameEvents.MISSION_FAILED, (data) => {
            if (!data || !data.missionId) return;
            this.failMission(data.missionId, data.reason);
        });

        // Check for delivery completions when player lands at a planet
        this.eventBus.on(GameEvents.SHIP_LANDED, (data) => {
            if (data && data.ship && data.planet) {
                this.checkDeliveries(data.ship, data.planet);
            }
        });

        // Missions that came back through JSON lost their isComplete() closures
        this.rehydrate(this.stateManager.state?.ship);

        console.log('[MissionSystem] Initialized');
    }

    /**
     * Build a completion checker for a mission whose static definition is gone
     * (procedural missions restored from a save).
     */
    _genericChecker(mission) {
        const type = mission?.type;
        const count = Number(mission?.count) || 0;
        const targetCredits = Number(mission?.targetCredits) || 0;
        const anyKill = mission?.target === 'any';

        if (type === 'delivery') return (ship, st) => st?.delivered === true;
        if (type === 'escort') return (ship, st) => st?.escortArrived === true;
        if (type === 'bounty') {
            return (ship, st) => {
                if (!ship) return false;
                const since = anyKill
                    ? (ship.kills || 0) - (st?.killsAtAccept || 0)
                    : (ship.pirateKills || 0) - (st?.pirateKillsAtAccept || 0);
                return since >= count;
            };
        }
        if (type === 'trade') return (ship) => !!ship && (ship.credits || 0) >= targetCredits;
        return () => false;
    }

    /**
     * Reattach isComplete() to every mission that lost it to JSON. Static
     * missions get their definition back from gameData; procedural ones get a
     * generic checker built from their own fields. (E13)
     */
    rehydrate(ship) {
        const state = this.stateManager.state;
        const fix = (mission) => {
            if (!mission || typeof mission.isComplete === 'function') return mission;
            const def = this.allMissions.get(mission.id);
            mission.isComplete = (def && typeof def.isComplete === 'function')
                ? def.isComplete
                : this._genericChecker(mission);
            return mission;
        };

        let repaired = 0;
        const sweep = (list) => {
            if (!Array.isArray(list)) return;
            for (const m of list) {
                if (m && typeof m.isComplete !== 'function') repaired++;
                fix(m);
            }
        };

        const target = ship || state?.ship;
        if (target?.missions) {
            sweep(target.missions.active);
            sweep(target.missions.available);
            sweep(target.missions.completed);
        }
        if (state?.missionSystem) {
            sweep(state.missionSystem.available);
            if (state.missionSystem.active && typeof state.missionSystem.active.isComplete !== 'function') {
                repaired++;
                fix(state.missionSystem.active);
            }
        }

        if (repaired > 0) console.log('[MissionSystem] Rehydrated', repaired, 'mission(s)');
        return repaired;
    }

    /**
     * Accept a mission
     */
    acceptMission(missionId) {
        const state = this.stateManager.state;
        const ship = state.ship;

        // Initialize mission tracking if not exists
        if (!ship.missions) {
            ship.missions = {
                active: [],
                completed: [],
                available: []
            };
        }

        // Find mission in static missions or procedural missions
        let mission = this.allMissions.get(missionId);
        if (!mission) {
            mission = ship.missions.available.find(m => m.id === missionId);
        }

        if (!mission) {
            console.error('[MissionSystem] Mission not found:', missionId);
            return;
        }

        // Check if already active or completed
        if (ship.missions.active.find(m => m.id === missionId)) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Mission already active!',
                type: 'warning',
                duration: 2000
            });
            return;
        }

        if (ship.missions.completed.find(m => m.id === missionId)) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Mission already completed!',
                type: 'warning',
                duration: 2000
            });
            return;
        }

        // Check mission limit (max 5 active missions)
        if (ship.missions.active.length >= 5) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Too many active missions! (Max 5)',
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Add mission to active list (use spread + reassign to trigger proxy)
        ship.missions.active = [...ship.missions.active, mission];

        // Remove from available list if procedural (use filter + reassign to trigger proxy)
        ship.missions.available = ship.missions.available.filter(m => m.id !== missionId);

        // Initialize mission state if needed (use spread + reassign to trigger proxy)
        ship.missionStates = {
            ...(ship.missionStates || {}),
            [missionId]: {
                acceptedTime: performance.now ? performance.now() : Date.now(),
                delivered: false,
                escortArrived: false,
                killsAtAccept: ship.kills || 0,
                // Bounties measure pirate kills, not every kill (E12)
                pirateKillsAtAccept: ship.pirateKills || 0
            }
        };

        // Show success message
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Mission accepted: ${mission.title}`,
            type: 'success',
            duration: 2500
        });

        // Update UI
        this.eventBus.emit(GameEvents.MISSION_UPDATED, { ship: ship });
    }

    /**
     * Complete a mission
     */
    completeMission(missionId) {
        const state = this.stateManager.state;
        const ship = state.ship;

        if (!ship.missions) return;

        // Find mission in active list
        const missionIndex = ship.missions.active.findIndex(m => m.id === missionId);
        if (missionIndex === -1) {
            console.error('[MissionSystem] Mission not active:', missionId);
            return;
        }

        const mission = ship.missions.active[missionIndex];

        // Verify mission completion
        const isComplete = mission.isComplete
            ? mission.isComplete(ship, ship.missionStates?.[missionId])
            : false;

        if (!isComplete) {
            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: 'Mission objectives not completed!',
                type: 'error',
                duration: 2000
            });
            return;
        }

        // Remove from active list and add to completed (use filter/spread to trigger proxy)
        ship.missions.active = ship.missions.active.filter((_, i) => i !== missionIndex);
        ship.missions.completed = [...ship.missions.completed, mission];

        // Award credits
        ship.credits += mission.reward;

        // Play completion sound
        this.eventBus.emit(GameEvents.AUDIO_PLAY, { sound: 'buy' });

        // Show success message
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Mission complete: ${mission.title} (+§${mission.reward})`,
            type: 'success',
            duration: 3000
        });

        // Update UI
        this.eventBus.emit(GameEvents.MISSION_UPDATED, { ship: ship });
        this.eventBus.emit(GameEvents.CREDITS_CHANGE, {
            credits: ship.credits,
            change: mission.reward
        });
    }

    /**
     * Abandon a mission
     */
    abandonMission(missionId) {
        const state = this.stateManager.state;
        const ship = state.ship;

        if (!ship.missions) return;

        // Find mission in active list
        const missionIndex = ship.missions.active.findIndex(m => m.id === missionId);
        if (missionIndex === -1) {
            console.error('[MissionSystem] Mission not active:', missionId);
            return;
        }

        const mission = ship.missions.active[missionIndex];

        // Remove from active list (use filter to trigger proxy)
        ship.missions.active = ship.missions.active.filter((_, i) => i !== missionIndex);

        // Clean up mission state (use spread to trigger proxy)
        if (ship.missionStates && ship.missionStates[missionId]) {
            const { [missionId]: removed, ...remaining } = ship.missionStates;
            ship.missionStates = remaining;
        }

        // Return to available list if procedural (use spread to trigger proxy)
        if (mission.procedural) {
            ship.missions.available = [...ship.missions.available, mission];
        }

        // Show message
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Mission abandoned: ${mission.title}`,
            type: 'warning',
            duration: 2000
        });

        // Update UI
        this.eventBus.emit(GameEvents.MISSION_UPDATED, { ship: ship });
    }

    /**
     * Check if any active delivery missions can be completed at this planet
     */
    checkDeliveries(ship, planet) {
        if (!ship.missions?.active || !planet?.name) return;

        for (const mission of ship.missions.active) {
            if (mission.type !== 'delivery') continue;
            if (mission.deliveryPlanet !== planet.name) continue;

            const missionState = ship.missionStates?.[mission.id];
            if (!missionState || missionState.delivered) continue;

            // Check if player has the required cargo
            const cargo = ship.cargo || [];
            let matchCount = 0;
            for (const item of cargo) {
                const itemType = (typeof item === 'string') ? item : item?.type;
                if (itemType === mission.cargo) matchCount++;
            }

            if (matchCount < mission.amount) continue;

            // Deduct cargo
            let removed = 0;
            ship.cargo = cargo.filter(item => {
                if (removed >= mission.amount) return true;
                const itemType = (typeof item === 'string') ? item : item?.type;
                if (itemType === mission.cargo) {
                    removed++;
                    return false;
                }
                return true;
            });

            // Mark delivered
            ship.missionStates = {
                ...ship.missionStates,
                [mission.id]: { ...missionState, delivered: true }
            };

            this.eventBus.emit(GameEvents.UI_MESSAGE, {
                message: `Cargo delivered: ${mission.title}`,
                type: 'success',
                duration: 2500
            });
        }
    }

    /**
     * Fail a mission (e.g., escort lost during zone transition)
     */
    failMission(missionId, reason) {
        const state = this.stateManager.state;
        const ship = state.ship;
        if (!ship.missions) return;

        const missionIndex = ship.missions.active.findIndex(m => m.id === missionId);
        if (missionIndex === -1) return;

        const mission = ship.missions.active[missionIndex];

        // Remove from active list
        ship.missions.active = ship.missions.active.filter((_, i) => i !== missionIndex);

        // Clean up mission state
        if (ship.missionStates && ship.missionStates[missionId]) {
            const { [missionId]: removed, ...remaining } = ship.missionStates;
            ship.missionStates = remaining;
        }

        // Show failure message
        this.eventBus.emit(GameEvents.UI_MESSAGE, {
            message: `Mission failed: ${mission.title}${reason ? ` (${reason})` : ''}`,
            type: 'error',
            duration: 3000
        });

        this.eventBus.emit(GameEvents.MISSION_UPDATED, { ship: ship });
    }

    update(state, deltaTime) {
        // Check for mission failures due to time limits
        if (!state.ship.missions || !state.ship.missions.active) return;

        const now = performance.now ? performance.now() : Date.now();
        const failedMissions = [];

        for (const mission of state.ship.missions.active) {
            if (mission.timeLimit) {
                const missionState = state.ship.missionStates?.[mission.id];
                if (missionState) {
                    const elapsed = (now - missionState.acceptedTime) / 1000;
                    if (elapsed > mission.timeLimit) {
                        failedMissions.push(mission);
                    }
                }
            }
        }

        // Handle failed missions
        if (failedMissions.length > 0) {
            const failedIds = new Set(failedMissions.map(m => m.id));

            // Remove all failed missions at once (use filter to trigger proxy)
            state.ship.missions.active = state.ship.missions.active.filter(m => !failedIds.has(m.id));

            // Emit events for each failed mission
            for (const mission of failedMissions) {
                this.eventBus.emit(GameEvents.UI_MESSAGE, {
                    message: `Mission failed: ${mission.title} (Time expired)`,
                    type: 'error',
                    duration: 3000
                });

                this.eventBus.emit(GameEvents.MISSION_FAILED, {
                    missionId: mission.id,
                    reason: 'timeout'
                });
            }
        }
    }
}
