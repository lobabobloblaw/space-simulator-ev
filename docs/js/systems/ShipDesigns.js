// Procedural 2D ship silhouettes with simple panel lines and cockpits
// Usage: ShipDesigns.draw(ctx, designKey, size, palette)

export const ShipDesigns = {
    draw(ctx, design = 'delta', size = 10, palette = {}) {
        const colors = {
            hullA: palette.hullA || '#e6e6e6',
            hullB: palette.hullB || '#7b7b7b',
            stroke: palette.stroke || '#d0d0d0',
            cockpit: palette.cockpit || 'rgba(120,200,255,0.85)'
        };

        // Base gradient along x-axis (nose→tail)
        const grad = ctx.createLinearGradient(size, 0, -size, 0);
        grad.addColorStop(0, colors.hullA);
        grad.addColorStop(1, colors.hullB);
        ctx.fillStyle = grad;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1;

        switch (design) {
            case 'dart':
                ShipDesigns.dart(ctx, size); break;
            case 'wing':
                ShipDesigns.wing(ctx, size); break;
            case 'raider':
                ShipDesigns.raider(ctx, size); break;
            case 'hauler':
                ShipDesigns.hauler(ctx, size); break;
            case 'oval':
                ShipDesigns.oval(ctx, size); break;
            default:
                ShipDesigns.delta(ctx, size); break;
        }

        // Panel line down the center
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, 0);
        ctx.lineTo(size * 0.9, 0);
        ctx.stroke();
        ctx.restore();

        // Cockpit
        ctx.save();
        ctx.fillStyle = colors.cockpit;
        ctx.beginPath();
        ctx.ellipse(size * 0.3, 0, Math.max(3, size * 0.18), Math.max(2, size * 0.12), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Extra paneling and greebles for 16-bit feel
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.6;
        // Diagonal panel seams
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, -size * 0.5);
        ctx.lineTo(size * 0.6, -size * 0.1);
        ctx.moveTo(-size * 0.2, size * 0.5);
        ctx.lineTo(size * 0.6, size * 0.1);
        ctx.stroke();
        ctx.restore();

        // Engine nozzles (tail)
        const drawEngine = (x, y) => {
            ctx.save();
            // Outer dark ring
            ctx.fillStyle = 'rgba(30,30,30,0.9)';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.5, size * 0.14), 0, Math.PI * 2);
            ctx.fill();
            // Inner core
            ctx.fillStyle = 'rgba(80,80,80,1)';
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, size * 0.08), 0, Math.PI * 2);
            ctx.fill();
            // Rim highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1.5, size * 0.14), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        };
        drawEngine(-size * 0.9, -size * 0.25);
        drawEngine(-size * 0.9, size * 0.25);

        // Small hull ports near nose
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        const px = size * 0.85;
        ctx.fillRect(px - 1, -2, 2, 2);
        ctx.fillRect(px - 4, -2, 2, 2);
        ctx.fillRect(px - 7, -2, 2, 2);
        ctx.fillRect(px - 1, 0, 2, 2);
        ctx.fillRect(px - 4, 0, 2, 2);
        ctx.fillRect(px - 7, 0, 2, 2);
        ctx.restore();
    },

    // Triangular nose with side chines — nimble player shuttle
    delta(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(s * 1.2, 0);
        ctx.lineTo(-s * 0.6, -s * 0.65);
        ctx.lineTo(-s * 0.2, -s * 0.18);
        ctx.lineTo(-s * 0.6, 0);
        ctx.lineTo(-s * 0.2, s * 0.18);
        ctx.lineTo(-s * 0.6, s * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    // Long slender interceptor with canards
    dart(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(s * 1.4, 0);
        ctx.lineTo(s * 0.2, -s * 0.28);
        ctx.lineTo(-s * 0.9, -s * 0.2);
        ctx.lineTo(-s * 0.9, s * 0.2);
        ctx.lineTo(s * 0.2, s * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Canards
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.7);
        ctx.lineTo(-s * 0.2, -s * 0.45);
        ctx.lineTo(s * 0.25, -s * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, s * 0.7);
        ctx.lineTo(-s * 0.2, s * 0.45);
        ctx.lineTo(s * 0.25, s * 0.4);
        ctx.closePath();
        ctx.fill();
    },

    // Aggressive angles — pirate raider
    raider(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(s * 1.0, 0);
        ctx.lineTo(s * 0.5, -s * 0.45);
        ctx.lineTo(0, -s * 0.25);
        ctx.lineTo(-s * 0.8, -s * 0.55);
        ctx.lineTo(-s * 0.7, 0);
        ctx.lineTo(-s * 0.8, s * 0.55);
        ctx.lineTo(0, s * 0.25);
        ctx.lineTo(s * 0.5, s * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    // Boxy freighter core with pods
    hauler(ctx, s) {
        const w = s * 1.3;
        const h = s * 0.7;
        ctx.fillRect(-w, -h, w * 2, h * 2);
        ctx.strokeRect(-w, -h, w * 2, h * 2);
        ctx.save();
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 5; i++) {
            const x = -w * 0.8 + i * w * 0.4;
            ctx.fillRect(x, -h * 1.1, w * 0.28, h * 0.32);
            ctx.fillRect(x, h * 0.78, w * 0.28, h * 0.32);
        }
        ctx.restore();
    },

    // Rounded trader shuttle
    oval(ctx, s) {
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.9, s * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    },

    // Wide patrol wing with tips
    wing(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(s, 0);
        ctx.lineTo(-s * 0.6, -s * 0.25);
        ctx.lineTo(-s * 0.9, -s * 0.18);
        ctx.lineTo(-s * 0.9, s * 0.18);
        ctx.lineTo(-s * 0.6, s * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Wing tips
        ctx.beginPath();
        ctx.moveTo(s * 0.35, -s * 0.9);
        ctx.lineTo(s * 0.65, -s * 0.7);
        ctx.lineTo(s * 0.35, -s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(s * 0.35, s * 0.9);
        ctx.lineTo(s * 0.65, s * 0.7);
        ctx.lineTo(s * 0.35, s * 0.5);
        ctx.closePath();
        ctx.fill();
    }
};

export default ShipDesigns;
