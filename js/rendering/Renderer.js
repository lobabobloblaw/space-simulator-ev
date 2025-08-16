/**
 * Game renderer
 */
export class Renderer {
    constructor(ctx, minimapCtx, canvas) {
        this.ctx = ctx;
        this.minimapCtx = minimapCtx;
        this.canvas = canvas;
        this.minimapScale = 0.018;
        this.minimapRange = 800;
    }
    
    render(game, ship, planets, asteroids, npcs, projectiles, pickups, explosions, stars) {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Debug: Draw a test rectangle to confirm rendering works
        ctx.fillStyle = '#f00';
        ctx.fillRect(10, 10, 100, 100);
        
        // Save context
        ctx.save();
        
        // Apply camera transform
        ctx.translate(this.canvas.width / 2 - game.camera.x, this.canvas.height / 2 - game.camera.y);
        
        // Draw stars
        if (stars && stars.far) {
            ctx.fillStyle = '#fff';
            for (let star of stars.far) {
                ctx.globalAlpha = star.brightness;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            }
            ctx.globalAlpha = 1;
        }
        
        // Draw planets
        for (let planet of planets) {
            ctx.fillStyle = planet.color;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Planet name
            ctx.fillStyle = '#fff';
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(planet.name, planet.x, planet.y - planet.radius - 10);
        }
        
        // Draw asteroids
        for (let asteroid of asteroids) {
            ctx.fillStyle = asteroid.color;
            ctx.beginPath();
            ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw NPCs
        for (let npc of npcs) {
            ctx.save();
            ctx.translate(npc.x, npc.y);
            ctx.rotate(npc.angle);
            ctx.fillStyle = npc.color;
            ctx.beginPath();
            ctx.moveTo(npc.size, 0);
            ctx.lineTo(-npc.size, -npc.size/2);
            ctx.lineTo(-npc.size/2, 0);
            ctx.lineTo(-npc.size, npc.size/2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        // Draw projectiles
        ctx.fillStyle = '#ff0';
        for (let proj of projectiles) {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw pickups
        for (let pickup of pickups) {
            ctx.fillStyle = pickup.type === 'ore' ? '#888' : '#ff0';
            ctx.beginPath();
            ctx.arc(pickup.x, pickup.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw explosions
        for (let exp of explosions) {
            const progress = exp.lifetime / exp.maxLifetime;
            const radius = exp.radius + (exp.maxRadius - exp.radius) * progress;
            ctx.strokeStyle = `rgba(255, ${Math.floor(255 * (1 - progress))}, 0, ${1 - progress})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw player ship
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(ship.size, 0);
        ctx.lineTo(-ship.size, -ship.size/2);
        ctx.lineTo(-ship.size/2, 0);
        ctx.lineTo(-ship.size, ship.size/2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Restore context
        ctx.restore();
        
        // Draw minimap
        this.renderMinimap(game, ship, planets, npcs);
    }
    
    renderMinimap(game, ship, planets, npcs) {
        const ctx = this.minimapCtx;
        const centerX = 37.5;
        const centerY = 37.5;
        
        // Clear minimap
        ctx.clearRect(0, 0, 75, 75);
        
        // Draw planets on minimap
        ctx.fillStyle = '#44f';
        for (let planet of planets) {
            const dx = (planet.x - ship.x) * this.minimapScale;
            const dy = (planet.y - ship.y) * this.minimapScale;
            if (Math.abs(dx) < 37 && Math.abs(dy) < 37) {
                ctx.beginPath();
                ctx.arc(centerX + dx, centerY + dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw NPCs on minimap
        for (let npc of npcs) {
            const dx = (npc.x - ship.x) * this.minimapScale;
            const dy = (npc.y - ship.y) * this.minimapScale;
            if (Math.abs(dx) < 37 && Math.abs(dy) < 37) {
                ctx.fillStyle = npc.behavior === 'aggressive' ? '#f44' : '#888';
                ctx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
            }
        }
        
        // Draw player at center
        ctx.fillStyle = '#0f0';
        ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
    }
}