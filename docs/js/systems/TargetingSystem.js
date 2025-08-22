import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * TargetingSystem - Minimal hostile targeting selection
 * - X key cycles to next hostile (pirate) by distance
 * - Stores selected target id in state.targeting.selectedId
 */
export default class TargetingSystem {
    constructor() {
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        this.handleNext = this.handleNext.bind(this);
        this.handleNPCDeath = this.handleNPCDeath.bind(this);
    }

    init() {
        const state = this.stateManager.state;
        state.targeting = state.targeting || { selectedId: null };
        this.eventBus.on(GameEvents.TARGET_NEXT, this.handleNext);
        this.eventBus.on(GameEvents.NPC_DEATH, this.handleNPCDeath);
        return true;
    }

    handleNext() {
        const state = this.stateManager.state;
        const ship = state.ship;
        const npcs = (state.npcShips || []).filter(n => n && n.faction === 'pirate');
        if (npcs.length === 0) {
            this.clear();
            return;
        }
        // Sort by distance
        npcs.sort((a,b)=> (a.x-ship.x)**2+(a.y-ship.y)**2 - ((b.x-ship.x)**2+(b.y-ship.y)**2));
        const currentId = state.targeting?.selectedId || null;
        let idx = -1;
        if (currentId) {
            idx = npcs.findIndex(n=>n.id===currentId);
        }
        const next = npcs[(idx + 1) % npcs.length];
        state.targeting.selectedId = next.id;
        this.eventBus.emit(GameEvents.TARGET_SET, { id: next.id, npc: next });
    }

    handleNPCDeath(data) {
        const dead = data?.npc;
        if (!dead) return;
        const state = this.stateManager.state;
        if (state.targeting && state.targeting.selectedId === dead.id) {
            this.clear();
        }
    }

    clear() {
        const state = this.stateManager.state;
        if (!state.targeting) state.targeting = {};
        state.targeting.selectedId = null;
        this.eventBus.emit(GameEvents.TARGET_CLEAR, {});
    }
}

