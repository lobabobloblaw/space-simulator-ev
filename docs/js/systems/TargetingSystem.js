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
        this.handleClear = this.handleClear.bind(this);
        this.handleNPCDestroyed = this.handleNPCDestroyed.bind(this);
    }

    init() {
        const state = this.stateManager.state;
        state.targeting = state.targeting || { selectedId: null };
        this.eventBus.on(GameEvents.TARGET_NEXT, this.handleNext);
        this.eventBus.on(GameEvents.TARGET_CLEAR, this.handleClear);
        this.eventBus.on(GameEvents.NPC_DEATH, this.handleNPCDeath);
        this.eventBus.on(GameEvents.NPC_DESTROYED, this.handleNPCDestroyed);
        return true;
    }

    handleNext() {
        const state = this.stateManager.state;
        const ship = state.ship;
        // Unify: cycle through all ships present (any faction)
        const pool = (state.npcShips || []).filter(Boolean);
        if (pool.length === 0) { this.clear(); return; }
        // Sort by distance
        pool.sort((a,b)=> (a.x-ship.x)**2+(a.y-ship.y)**2 - ((b.x-ship.x)**2+(b.y-ship.y)**2));
        const currentId = state.targeting?.selectedId || null;
        let idx = -1;
        if (currentId) idx = pool.findIndex(n=>n.id===currentId);
        const next = pool[(idx + 1) % pool.length];
        state.targeting.selectedId = next.id;
        const dx = next.x - ship.x, dy = next.y - ship.y;
        const dist = Math.round(Math.sqrt(dx*dx + dy*dy));
        this.eventBus.emit(GameEvents.TARGET_SET, { id: next.id, npc: next, distance: dist });
    }

    handleNPCDeath(data) {
        const dead = data?.npc;
        if (!dead) return;
        const state = this.stateManager.state;
        if (state.targeting && state.targeting.selectedId === dead.id) {
            this.clear();
        }
    }

    handleNPCDestroyed(data) {
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

    handleClear() {
        const state = this.stateManager.state;
        if (!state.targeting) state.targeting = {};
        state.targeting.selectedId = null;
        // Do not emit inside handler to avoid loops; Render/UI observe state
    }
}
