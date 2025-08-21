// FactionVisuals - generic palettes and decals for ship silhouettes
// Keep simple for now; expandable to many factions later

export const FactionVisuals = {
    // Return a palette for a faction; baseColor may tint accents
    getPalette(faction = 'civilian', baseColor = '#88aaff') {
        const palettes = {
            civilian: { hullA: '#e6e6e6', hullB: '#6f6f6f', stroke: '#cfcfcf', cockpit: 'rgba(120,200,255,0.85)', accent: '#7fd3ff' },
            trader:   { hullA: '#f2e8c8', hullB: '#7c7155', stroke: '#e2d9bd', cockpit: 'rgba(120,200,255,0.85)', accent: '#ffd24a' },
            patrol:   { hullA: '#d7e7ff', hullB: '#4a5c7a', stroke: '#a9c4ff', cockpit: 'rgba(120,200,255,0.85)', accent: '#4aa3ff' },
            pirate:   { hullA: '#f0d0d0', hullB: '#5a2a2a', stroke: '#ffaaaa', cockpit: 'rgba(255,140,140,0.8)', accent: '#ff4444' },
            miner:    { hullA: '#e2e2e2', hullB: '#5c5c5c', stroke: '#d0d0d0', cockpit: 'rgba(120,200,255,0.85)', accent: '#ffb84d' },
            merc:     { hullA: '#e7e7ed', hullB: '#4c4c60', stroke: '#cfcfe3', cockpit: 'rgba(140,180,255,0.85)', accent: '#b08cff' }
        };
        const p = palettes[faction] || palettes.civilian;
        // Use provided baseColor as accent tint if given
        return { ...p, accent: baseColor || p.accent };
    },

    // Draw simple faction decals on top of the ship shape
    drawDecals(ctx, faction = 'civilian', size = 10) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        switch (faction) {
            case 'patrol':
                // Twin blue stripes across wings/body
                ctx.fillStyle = 'rgba(70,150,255,0.9)';
                ctx.fillRect(-size * 0.2, -size * 0.55, size * 0.9, size * 0.12);
                ctx.fillRect(-size * 0.2, size * 0.43, size * 0.9, size * 0.12);
                break;
            case 'pirate':
                // Bold red band near nose and small X mark
                ctx.fillStyle = 'rgba(255,60,60,0.9)';
                ctx.fillRect(size * 0.5, -size * 0.25, size * 0.25, size * 0.5);
                ctx.strokeStyle = 'rgba(255,80,80,0.9)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(size * 0.2, -size * 0.25);
                ctx.lineTo(size * 0.35, size * 0.25);
                ctx.moveTo(size * 0.35, -size * 0.25);
                ctx.lineTo(size * 0.2, size * 0.25);
                ctx.stroke();
                break;
            case 'trader':
                // Gold stripe along fuselage
                ctx.fillStyle = 'rgba(255,210,74,0.9)';
                ctx.fillRect(-size * 0.6, -size * 0.08, size * 1.3, size * 0.16);
                break;
            case 'miner':
                // Orange chevrons at tail
                ctx.fillStyle = 'rgba(255,184,77,0.9)';
                ctx.beginPath();
                ctx.moveTo(-size * 0.9, -size * 0.35);
                ctx.lineTo(-size * 0.6, 0);
                ctx.lineTo(-size * 0.9, size * 0.35);
                ctx.closePath();
                ctx.fill();
                break;
            case 'merc':
                // Purple angular badge
                ctx.fillStyle = 'rgba(176,140,255,0.9)';
                ctx.beginPath();
                ctx.moveTo(size * 0.2, 0);
                ctx.lineTo(size * 0.05, -size * 0.2);
                ctx.lineTo(-size * 0.2, 0);
                ctx.lineTo(size * 0.05, size * 0.2);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // Civilian: minimal small accent near cockpit
                ctx.fillStyle = 'rgba(127,211,255,0.8)';
                ctx.fillRect(size * 0.15, -2, size * 0.25, 4);
        }
        ctx.restore();
    }
};

export default FactionVisuals;

