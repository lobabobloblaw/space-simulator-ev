/**
 * Debug script for Save/Load NPC Issues
 * Paste this in browser console to monitor NPC behavior
 */

// Monitor NPC removals
window.debugNPCs = true;

if (window.systems && window.systems.npc) {
    const originalShouldRemove = window.systems.npc.shouldRemoveNPC;
    
    window.systems.npc.shouldRemoveNPC = function(npc, ship, state) {
        const distFromPlayer = Math.sqrt((npc.x - ship.x) ** 2 + (npc.y - ship.y) ** 2);
        const willRemove = originalShouldRemove.call(this, npc, ship, state);
        
        if (willRemove && window.debugNPCs) {
            console.warn('🚨 NPC REMOVAL TRIGGERED:', {
                type: npc.type,
                color: npc.color,
                reasons: {
                    readyToDock: npc.readyToDock,
                    isDead: npc.health <= 0,
                    tooFar: distFromPlayer > 3000,
                    actualDistance: Math.round(distFromPlayer)
                },
                position: {x: Math.round(npc.x), y: Math.round(npc.y)},
                lifetime: npc.lifetime
            });
        }
        
        return willRemove;
    };
    
    console.log('✅ NPC removal monitoring enabled');
}

// Function to test save/load cycle
window.testNPCSaveLoad = function() {
    const beforeState = {
        count: stateManager.state.npcShips.length,
        npcs: stateManager.state.npcShips.map(n => ({
            type: n.type,
            color: n.color,
            x: Math.round(n.x),
            y: Math.round(n.y),
            angle: n.angle.toFixed(2),
            state: n.state,
            readyToDock: n.readyToDock
        }))
    };
    
    console.log('📝 BEFORE SAVE:', beforeState);
    
    // Save
    eventBus.emit(GameEvents.GAME_SAVE);
    
    setTimeout(() => {
        // Load
        eventBus.emit(GameEvents.GAME_LOAD);
        
        setTimeout(() => {
            const afterState = {
                count: stateManager.state.npcShips.length,
                npcs: stateManager.state.npcShips.map(n => ({
                    type: n.type,
                    color: n.color,
                    x: Math.round(n.x),
                    y: Math.round(n.y),
                    angle: n.angle.toFixed(2),
                    state: n.state,
                    readyToDock: n.readyToDock
                }))
            };
            
            console.log('📝 AFTER LOAD:', afterState);
            
            // Compare
            console.log('🔍 COMPARISON:');
            console.log('  Count:', beforeState.count, '→', afterState.count);
            
            // Check for color changes
            const colorChanges = [];
            beforeState.npcs.forEach((before, i) => {
                const after = afterState.npcs[i];
                if (after && before.color !== after.color) {
                    colorChanges.push({
                        type: before.type,
                        before: before.color,
                        after: after.color
                    });
                }
            });
            
            if (colorChanges.length > 0) {
                console.warn('⚠️ COLOR CHANGES:', colorChanges);
            }
            
            // Check for missing NPCs
            if (afterState.count < beforeState.count) {
                console.error('❌ NPCs LOST:', beforeState.count - afterState.count);
            }
            
        }, 1500);
    }, 500);
};

// Function to check current NPC states
window.checkNPCs = function() {
    const ship = stateManager.state.ship;
    const npcs = stateManager.state.npcShips.map(n => ({
        type: n.type,
        color: n.color,
        correctColor: {
            pirate: '#ff4444',
            trader: '#44ff88',
            patrol: '#8888ff',
            freighter: '#4488ff'
        }[n.type] || '???',
        isCorrect: n.color === {
            pirate: '#ff4444',
            trader: '#44ff88',
            patrol: '#8888ff',
            freighter: '#4488ff'
        }[n.type],
        distance: Math.round(Math.sqrt((n.x - ship.x) ** 2 + (n.y - ship.y) ** 2)),
        willRemove: n.readyToDock || n.health <= 0 || 
                    Math.sqrt((n.x - ship.x) ** 2 + (n.y - ship.y) ** 2) > 3000
    }));
    
    console.table(npcs);
    
    const wrongColors = npcs.filter(n => !n.isCorrect);
    if (wrongColors.length > 0) {
        console.warn('⚠️ NPCs with wrong colors:', wrongColors);
    }
};

console.log(`
🔧 NPC Debug Tools Loaded!
Commands:
  testNPCSaveLoad() - Test save/load cycle and report issues
  checkNPCs()       - Check current NPC states and colors
  debugNPCs = false - Disable removal monitoring
`);

// Auto-check on load
setTimeout(checkNPCs, 1000);