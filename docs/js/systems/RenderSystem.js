import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';

/**
 * RenderSystem - Handles all visual rendering for the game
 * Draws all game entities, effects, and UI elements to the canvas
 */
export class RenderSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.eventBus = getEventBus();
        this.stateManager = getStateManager();
        
        // Cache frequently used values
        this.camera = { x: 0, y: 0 };
        this.screenCenter = { x: canvas.width / 2, y: canvas.height / 2 };
        
        // Rendering state
        this.stars = { far: [], mid: [], near: [] };
        this.nebulaOffset = { x: 0, y: 0 };
        
        // Performance optimization flags
        this.quality = 'high'; // 'low', 'medium', 'high'
        this.showParticles = true;
        this.showEffects = true;
        
        // Minimap canvas (from existing setup)
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.minimapScale = 0.018;
        
        // Generate stars on creation (reduced for performance)
        this.generateStars();
        
        // Bind methods
        this.handleCanvasResize = this.handleCanvasResize.bind(this);
        
        console.log('[RenderSystem] Created');
    }
    
    /**
     * Initialize the render system
     */
    init() {
        // Subscribe to events
        this.subscribeToEvents();
        
        // Set initial canvas size
        this.resizeCanvas();
        
        console.log('[RenderSystem] Initialized');
    }
    
    /**
     * Subscribe to render-relevant events
     */
    subscribeToEvents() {
        // Canvas resize
        this.eventBus.on('canvas.resize', this.handleCanvasResize);
        
        // Quality settings
        this.eventBus.on('render.quality', (data) => {
            this.quality = data.quality;
        });
        
        // Visual toggles
        this.eventBus.on('render.toggleParticles', () => {
            this.showParticles = !this.showParticles;
        });
    }
    
    /**
     * Generate star field
     */
    generateStars() {
        // Far stars (minimal parallax) - reduced for performance
        for (let i = 0; i < 300; i++) {
            this.stars.far.push({
                x: (Math.random() - 0.5) * 12000,
                y: (Math.random() - 0.5) * 12000,
                brightness: Math.random() * 0.5 + 0.3,
                size: Math.random() < 0.95 ? 1 : 2,
                color: Math.random() < 0.94 ? '#ffffff' : 
                       Math.random() < 0.5 ? '#ffeeee' :
                       Math.random() < 0.7 ? '#eeeeff' : '#ffffee'
            });
        }
        
        // Mid-range stars with twinkling - reduced for performance
        for (let i = 0; i < 120; i++) {
            this.stars.mid.push({
                x: (Math.random() - 0.5) * 8000,
                y: (Math.random() - 0.5) * 8000,
                brightness: Math.random() * 0.6 + 0.4,
                size: Math.random() < 0.9 ? 1 : 2,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.01 + Math.random() * 0.03,
                color: Math.random() < 0.92 ? '#ffffff' : 
                       Math.random() < 0.6 ? '#ffeeee' : '#eeeeff'
            });
        }
        
        // Near stars (maximum parallax) - reduced for performance  
        for (let i = 0; i < 60; i++) {
            this.stars.near.push({
                x: (Math.random() - 0.5) * 6000,
                y: (Math.random() - 0.5) * 6000,
                brightness: Math.random() * 0.7 + 0.5,
                size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
                color: '#ffffff'
            });
        }
    }
    
    /**
     * Main render method - called each frame
     */
    render(state, deltaTime) {
        // Update camera to follow ship
        this.camera.x = state.ship.x;
        this.camera.y = state.ship.y;
        
        // Clear canvas with gradient background
        this.clearCanvas();
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(this.screenCenter.x - this.camera.x, this.screenCenter.y - this.camera.y);
        
        // Render layers in order (back to front)
        this.renderNebula();
        this.renderStars();
        this.renderPlanets(state);
        this.renderAsteroids(state);
        this.renderPickups(state);
        this.renderNPCs(state);
        this.renderProjectiles(state);
        this.renderShip(state);
        this.renderExplosions(state);
        this.renderWarpEffects(state);
        
        // Restore context
        this.ctx.restore();
        
        // Render UI elements (not affected by camera)
        this.renderMinimap(state);
        
        // Render touch controls if needed
        if (window.touchControls) {
            window.touchControls.render();
        }
    }
    
    /**
     * Clear canvas with background gradient
     */
    clearCanvas() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000011');
        gradient.addColorStop(1, '#000000');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Render nebula background
     */
    renderNebula() {
        if (this.quality === 'low') return;
        
        this.ctx.globalAlpha = 0.03;
        
        // Purple nebula cloud
        const nebulaGradient1 = this.ctx.createRadialGradient(
            -this.camera.x * 0.05 + 200, -this.camera.y * 0.05 - 300, 100,
            -this.camera.x * 0.05 + 200, -this.camera.y * 0.05 - 300, 600
        );
        nebulaGradient1.addColorStop(0, 'rgba(200, 100, 255, 0.4)');
        nebulaGradient1.addColorStop(0.5, 'rgba(100, 50, 200, 0.2)');
        nebulaGradient1.addColorStop(1, 'transparent');
        this.ctx.fillStyle = nebulaGradient1;
        this.ctx.fillRect(-2000, -2000, 4000, 4000);
        
        // Blue nebula cloud
        const nebulaGradient2 = this.ctx.createRadialGradient(
            -this.camera.x * 0.05 - 500, -this.camera.y * 0.05 + 400, 150,
            -this.camera.x * 0.05 - 500, -this.camera.y * 0.05 + 400, 800
        );
        nebulaGradient2.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
        nebulaGradient2.addColorStop(0.5, 'rgba(50, 100, 200, 0.15)');
        nebulaGradient2.addColorStop(1, 'transparent');
        this.ctx.fillStyle = nebulaGradient2;
        this.ctx.fillRect(-2000, -2000, 4000, 4000);
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render parallax star layers
     */
    renderStars() {
        // Far stars (minimal parallax)
        for (let star of this.stars.far) {
            const screenX = star.x - this.camera.x * 0.05;
            const screenY = star.y - this.camera.y * 0.05;
            
            // Wrap stars for infinite field
            const wrappedX = ((screenX + 6000) % 12000) - 6000;
            const wrappedY = ((screenY + 6000) % 12000) - 6000;
            
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillStyle = star.color || '#ffffff';
            
            if (star.size > 2 && this.quality === 'high') {
                this.ctx.shadowColor = star.color || '#ffffff';
                this.ctx.shadowBlur = star.size;
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            }
        }
        
        // Mid stars with twinkling
        for (let star of this.stars.mid) {
            const screenX = star.x - this.camera.x * 0.2;
            const screenY = star.y - this.camera.y * 0.2;
            
            const wrappedX = ((screenX + 4000) % 8000) - 4000;
            const wrappedY = ((screenY + 4000) % 8000) - 4000;
            
            // Twinkling effect
            star.twinkle += star.twinkleSpeed || 0.02;
            const twinkle = Math.sin(star.twinkle) * 0.1 + 0.9;
            
            this.ctx.globalAlpha = star.brightness * twinkle;
            this.ctx.fillStyle = star.color || '#ffffff';
            this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
        }
        
        // Near stars
        for (let star of this.stars.near) {
            const screenX = star.x - this.camera.x * 0.4;
            const screenY = star.y - this.camera.y * 0.4;
            
            const wrappedX = ((screenX + 3000) % 6000) - 3000;
            const wrappedY = ((screenY + 3000) % 6000) - 3000;
            
            this.ctx.globalAlpha = star.brightness;
            this.ctx.fillStyle = star.color || '#ffffff';
            
            if (star.size > 1 && this.quality === 'high') {
                this.ctx.shadowColor = '#ffffff';
                this.ctx.shadowBlur = 2;
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
                this.ctx.shadowBlur = 0;
            } else {
                this.ctx.fillRect(wrappedX, wrappedY, star.size, star.size);
            }
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    /**
     * Render planets
     */
    renderPlanets(state) {
        // Get planets from state
        const planets = state.planets || [];
        
        for (let planet of planets) {
            // Use procedural planet renderer if available
            if (window.planetRenderer) {
                window.planetRenderer.renderPlanet(this.ctx, planet, Date.now());
            } else {
                // Fallback simple planet rendering
                const gradient = this.ctx.createRadialGradient(
                    planet.x, planet.y, 0,
                    planet.x, planet.y, planet.radius
                );
                gradient.addColorStop(0, planet.color || '#888');
                gradient.addColorStop(0.7, planet.color || '#888');
                gradient.addColorStop(1, '#000');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Planet name
            this.ctx.save();
            this.ctx.shadowColor = planet.color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = `bold ${Math.max(12, planet.radius / 8)}px 'Orbitron', monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(planet.name.toUpperCase(), planet.x, planet.y - planet.radius - 25);
            
            // Distance indicator when nearby
            const dx = state.ship.x - planet.x;
            const dy = state.ship.y - planet.y;
            const distToPlanet = Math.sqrt(dx * dx + dy * dy);
            
            if (distToPlanet < planet.radius * 3 && distToPlanet > planet.radius + 50) {
                this.ctx.shadowBlur = 5;
                this.ctx.font = '10px "JetBrains Mono", monospace';
                this.ctx.fillStyle = planet.color;
                const displayDist = Math.round(distToPlanet - planet.radius);
                this.ctx.fillText(`[ ${displayDist} ]`, planet.x, planet.y - planet.radius - 10);
            }
            
            this.ctx.restore();
        }
    }
    
    /**
     * Render asteroids
     */
    renderAsteroids(state) {
        const asteroids = state.asteroids || [];
        
        for (let asteroid of asteroids) {
            this.ctx.save();
            this.ctx.translate(asteroid.x, asteroid.y);
            
            // Rotation
            if (!asteroid.rotation) asteroid.rotation = 0;
            asteroid.rotation += asteroid.rotationSpeed || 0;
            this.ctx.rotate(asteroid.rotation);
            
            // Color based on damage
            const damage = 1 - (asteroid.health / asteroid.maxHealth);
            const r = 102 + Math.floor(damage * 100);
            this.ctx.fillStyle = `rgb(${r}, 102, 102)`;
            this.ctx.strokeStyle = `rgb(${Math.min(r + 30, 255)}, 102, 102)`;
            this.ctx.lineWidth = 1;
            
            // Generate shape points if missing
            if (!asteroid.shapePoints) {
                asteroid.shapePoints = [];
                for (let j = 0; j < 8; j++) {
                    asteroid.shapePoints.push(0.7 + Math.random() * 0.6);
                }
            }
            
            // Draw irregular shape
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const variance = asteroid.shapePoints[i];
                const r = asteroid.radius * variance;
                if (i === 0) {
                    this.ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                } else {
                    this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                }
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }
    
    /**
     * Render pickups
     */
    renderPickups(state) {
        const pickups = state.pickups || [];
        
        for (let pickup of pickups) {
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            
            // Glow effect
            const glowGradient = this.ctx.createRadialGradient(
                pickup.x, pickup.y, 0,
                pickup.x, pickup.y, 15
            );
            
            if (pickup.type === 'ore') {
                glowGradient.addColorStop(0, 'rgba(136, 136, 136, 0.8)');
                glowGradient.addColorStop(1, 'transparent');
            } else {
                glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
                glowGradient.addColorStop(1, 'transparent');
            }
            
            this.ctx.globalAlpha = pulse;
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Core
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = pickup.type === 'ore' ? '#888' : '#ffd700';
            this.ctx.beginPath();
            this.ctx.arc(pickup.x, pickup.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Render NPC ships
     */
    renderNPCs(state) {
        const npcShips = state.npcShips || [];
        
        for (let npc of npcShips) {
            this.ctx.save();
            this.ctx.translate(npc.x, npc.y);
            this.ctx.rotate(npc.angle);
            
            // Engine thrust effect
            if (npc.thrusting && this.showEffects) {
                const flicker = Math.random();
                const thrustGradient = this.ctx.createLinearGradient(
                    -npc.size - 10, 0,
                    -npc.size, 0
                );
                thrustGradient.addColorStop(0, 'transparent');
                thrustGradient.addColorStop(0.5, `rgba(255, 100, 0, ${0.5 * flicker})`);
                thrustGradient.addColorStop(1, `rgba(255, 200, 0, ${0.8 * flicker})`);
                
                this.ctx.fillStyle = thrustGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(-npc.size - 10 - Math.random() * 5, 0);
                this.ctx.lineTo(-npc.size, -3);
                this.ctx.lineTo(-npc.size, 3);
                this.ctx.closePath();
                this.ctx.fill();
            }
            
            // Ship body
            this.renderNPCShip(npc);
            
            this.ctx.restore();
            
            // Health bar
            if (npc.health < npc.maxHealth) {
                const barWidth = 30;
                const barHeight = 3;
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.fillRect(npc.x - barWidth/2, npc.y - npc.size - 10, barWidth, barHeight);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                this.ctx.fillRect(npc.x - barWidth/2, npc.y - npc.size - 10, 
                                barWidth * (npc.health / npc.maxHealth), barHeight);
            }
        }
    }
    
    /**
     * Render specific NPC ship type
     */
    renderNPCShip(npc) {
        // Ship gradient
        const shipGradient = this.ctx.createLinearGradient(
            npc.size, 0, -npc.size, 0
        );
        shipGradient.addColorStop(0, npc.color);
        shipGradient.addColorStop(0.5, npc.color);
        shipGradient.addColorStop(1, '#000000');
        
        this.ctx.fillStyle = shipGradient;
        this.ctx.strokeStyle = npc.color;
        this.ctx.lineWidth = 1;
        
        // Different shapes based on type
        if (npc.type === 'freighter') {
            this.renderFreighter(npc);
        } else if (npc.type === 'pirate') {
            this.renderPirate(npc);
        } else if (npc.type === 'patrol') {
            this.renderPatrol(npc);
        } else if (npc.type === 'trader') {
            this.renderTrader(npc);
        } else {
            this.renderDefaultShip(npc);
        }
    }
    
    renderFreighter(npc) {
        const width = npc.size * 1.3;
        const height = npc.size * 0.7;
        
        // Main body
        this.ctx.fillRect(-width, -height, width * 2, height * 2);
        
        // Cargo pods
        this.ctx.fillStyle = npc.color + '88';
        for (let i = 0; i < 5; i++) {
            const podX = -width * 0.8 + (i * width * 0.4);
            this.ctx.fillRect(podX, -height * 1.2, width * 0.3, height * 0.3);
            this.ctx.fillRect(podX, height * 0.9, width * 0.3, height * 0.3);
        }
        
        // Engines
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-width - 4, -height * 0.5, 4, height * 0.3);
        this.ctx.fillRect(-width - 4, height * 0.2, 4, height * 0.3);
        
        // Bridge
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
        this.ctx.fillRect(width * 0.7, -2, 6, 4);
    }
    
    renderPirate(npc) {
        // Angular aggressive fighter
        this.ctx.beginPath();
        this.ctx.moveTo(npc.size * 1.2, 0);
        this.ctx.lineTo(npc.size * 0.6, -npc.size * 0.4);
        this.ctx.lineTo(npc.size * 0.3, -npc.size * 0.3);
        this.ctx.lineTo(-npc.size * 0.5, -npc.size * 0.7);
        this.ctx.lineTo(-npc.size * 0.8, -npc.size * 0.4);
        this.ctx.lineTo(-npc.size * 0.7, 0);
        this.ctx.lineTo(-npc.size * 0.8, npc.size * 0.4);
        this.ctx.lineTo(-npc.size * 0.5, npc.size * 0.7);
        this.ctx.lineTo(npc.size * 0.3, npc.size * 0.3);
        this.ctx.lineTo(npc.size * 0.6, npc.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Weapon pods
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(npc.size * 0.2, -npc.size * 0.5, 3, 3);
        this.ctx.fillRect(npc.size * 0.2, npc.size * 0.5 - 3, 3, 3);
        
        // Cockpit
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        this.ctx.fillRect(npc.size * 0.5, -2, 4, 4);
    }
    
    renderPatrol(npc) {
        const wingSpan = npc.size * 1.2;
        
        // Main fuselage
        this.ctx.beginPath();
        this.ctx.moveTo(npc.size, 0);
        this.ctx.lineTo(0, -npc.size * 0.3);
        this.ctx.lineTo(-npc.size * 0.7, -npc.size * 0.2);
        this.ctx.lineTo(-npc.size * 0.7, npc.size * 0.2);
        this.ctx.lineTo(0, npc.size * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Wings
        this.ctx.fillRect(-npc.size * 0.4, -wingSpan, npc.size * 0.8, wingSpan * 2);
        
        // Wing tips
        this.ctx.beginPath();
        this.ctx.moveTo(npc.size * 0.4, -wingSpan);
        this.ctx.lineTo(npc.size * 0.7, -wingSpan * 0.8);
        this.ctx.lineTo(npc.size * 0.4, -wingSpan * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(npc.size * 0.4, wingSpan);
        this.ctx.lineTo(npc.size * 0.7, wingSpan * 0.8);
        this.ctx.lineTo(npc.size * 0.4, wingSpan * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Engines
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(-npc.size * 0.9, -wingSpan * 0.5, 4, 6);
        this.ctx.fillRect(-npc.size * 0.9, wingSpan * 0.5 - 6, 4, 6);
        
        // Markings
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 0.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -wingSpan * 0.3);
        this.ctx.lineTo(0, wingSpan * 0.3);
        this.ctx.stroke();
        
        // Cockpit
        this.ctx.fillStyle = 'rgba(50, 150, 255, 0.6)';
        this.ctx.fillRect(npc.size * 0.3, -3, 5, 6);
    }
    
    renderTrader(npc) {
        // Rounded hull
        this.ctx.beginPath();
        this.ctx.arc(0, 0, npc.size * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Cargo bulge
        this.ctx.beginPath();
        this.ctx.ellipse(-npc.size * 0.2, 0, npc.size * 0.6, npc.size * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Engine pods
        this.ctx.fillStyle = '#555';
        this.ctx.beginPath();
        this.ctx.arc(-npc.size * 0.8, -npc.size * 0.4, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(-npc.size * 0.8, npc.size * 0.4, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Viewports
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
        for (let i = 0; i < 3; i++) {
            const angle = -Math.PI * 0.2 + (i * Math.PI * 0.2);
            const x = Math.cos(angle) * npc.size * 0.5;
            const y = Math.sin(angle) * npc.size * 0.5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    renderDefaultShip(npc) {
        // V-shape
        this.ctx.beginPath();
        this.ctx.moveTo(npc.size, 0);
        this.ctx.lineTo(-npc.size * 0.7, -npc.size * 0.6);
        this.ctx.lineTo(-npc.size * 0.4, -npc.size * 0.3);
        this.ctx.lineTo(-npc.size * 0.6, 0);
        this.ctx.lineTo(-npc.size * 0.4, npc.size * 0.3);
        this.ctx.lineTo(-npc.size * 0.7, npc.size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Cockpit
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
        this.ctx.fillRect(npc.size * 0.3, -2, 4, 4);
    }
    
    /**
     * Render projectiles
     */
    renderProjectiles(state) {
        const projectiles = state.projectiles || [];
        
        for (let proj of projectiles) {
            // Trail effect
            const trailGradient = this.ctx.createLinearGradient(
                proj.x - proj.vx * 5, proj.y - proj.vy * 5,
                proj.x, proj.y
            );
            
            // Color based on type
            let color = '#ffff00';
            if (proj.type === 'plasma') {
                color = '#00ffff';
            } else if (proj.type === 'rapid') {
                color = '#ff8800';
            } else if (proj.type === 'mining') {
                color = '#888888';
            }
            
            trailGradient.addColorStop(0, 'transparent');
            trailGradient.addColorStop(1, color);
            
            this.ctx.strokeStyle = trailGradient;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(proj.x - proj.vx * 5, proj.y - proj.vy * 5);
            this.ctx.lineTo(proj.x, proj.y);
            this.ctx.stroke();
            
            // Core with glow
            if (this.quality !== 'low') {
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 5;
            }
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.type === 'plasma' ? 4 : 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }
    
    /**
     * Render player ship
     */
    renderShip(state) {
        const ship = state.ship;
        
        // Don't render if destroyed
        if (ship.isDestroyed) return;
        
        this.ctx.save();
        this.ctx.translate(ship.x, ship.y);
        this.ctx.rotate(ship.angle);
        
        // Engine thrust effect
        // Check if thrust keys are pressed (handle proxy-wrapped Set)
        let isThrusting = false;
        try {
            const keys = state.input?.keys;
            if (keys) {
                // Convert to array to avoid proxy issues with Set methods
                const keyArray = Array.from(keys);
                isThrusting = keyArray.includes('w') || keyArray.includes('arrowup');
            }
        } catch (e) {
            // Silently fail if there's an issue with key checking
        }
        
        if (isThrusting) {
            if (this.showEffects) {
                const flicker = Math.random();
                const thrustGradient = this.ctx.createLinearGradient(
                    -ship.size - 15, 0,
                    -ship.size, 0
                );
                thrustGradient.addColorStop(0, 'transparent');
                thrustGradient.addColorStop(0.4, `rgba(100, 150, 255, ${0.3 * flicker})`);
                thrustGradient.addColorStop(0.7, `rgba(150, 200, 255, ${0.6 * flicker})`);
                thrustGradient.addColorStop(1, `rgba(255, 255, 255, ${0.9 * flicker})`);
                
                this.ctx.fillStyle = thrustGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(-ship.size - 15 - Math.random() * 7, 0);
                this.ctx.lineTo(-ship.size, -4);
                this.ctx.lineTo(-ship.size, 4);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
        
        // Shield effect
        if (ship.shield > 0 && this.showEffects) {
            const shieldAlpha = Math.min(0.3, ship.shield / ship.maxShield);
            const shieldGradient = this.ctx.createRadialGradient(
                0, 0, ship.size,
                0, 0, ship.size * 2
            );
            shieldGradient.addColorStop(0, `rgba(0, 200, 255, ${shieldAlpha})`);
            shieldGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = shieldGradient;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, ship.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Ship body
        const shipGradient = this.ctx.createLinearGradient(
            ship.size, 0, -ship.size, 0
        );
        shipGradient.addColorStop(0, '#ffffff');
        shipGradient.addColorStop(0.3, '#dddddd');
        shipGradient.addColorStop(0.7, '#888888');
        shipGradient.addColorStop(1, '#444444');
        
        this.ctx.fillStyle = shipGradient;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        
        // Ship shape
        this.ctx.beginPath();
        this.ctx.moveTo(ship.size * 1.2, 0);
        this.ctx.lineTo(-ship.size * 0.6, -ship.size * 0.7);
        this.ctx.lineTo(-ship.size * 0.3, -ship.size * 0.4);
        this.ctx.lineTo(-ship.size * 0.5, 0);
        this.ctx.lineTo(-ship.size * 0.3, ship.size * 0.4);
        this.ctx.lineTo(-ship.size * 0.6, ship.size * 0.7);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Cockpit
        this.ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        this.ctx.fillRect(ship.size * 0.4, -3, 5, 6);
        
        // Weapon indicators
        if (ship.weapons && ship.weapons.length > 0) {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(ship.size * 0.8, -2, 2, 4);
        }
        
        this.ctx.restore();
        
        // Health bar
        if (ship.health < ship.maxHealth) {
            const barWidth = 40;
            const barHeight = 4;
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.fillRect(ship.x - barWidth/2, ship.y - ship.size - 15, barWidth, barHeight);
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            this.ctx.fillRect(ship.x - barWidth/2, ship.y - ship.size - 15, 
                            barWidth * (ship.health / ship.maxHealth), barHeight);
        }
    }
    
    /**
     * Render explosions
     */
    renderExplosions(state) {
        const explosions = state.explosions || [];
        
        for (let exp of explosions) {
            const progress = exp.lifetime / exp.maxLifetime;
            const radius = exp.radius + (exp.maxRadius - exp.radius) * progress;
            
            // Multiple explosion rings
            for (let i = 0; i < 3; i++) {
                const ringProgress = Math.max(0, progress - i * 0.1);
                const ringRadius = radius * (1 - i * 0.2);
                const alpha = (1 - ringProgress) * (1 - i * 0.3);
                
                const gradient = this.ctx.createRadialGradient(
                    exp.x, exp.y, ringRadius * 0.5,
                    exp.x, exp.y, ringRadius
                );
                gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(255, 150, 0, ${alpha * 0.8})`);
                gradient.addColorStop(0.7, `rgba(255, 50, 0, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            // Sparks
            if (progress < 0.5 && this.showParticles) {
                this.ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress * 2})`;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const dist = radius * 1.5 * progress;
                    const sparkX = exp.x + Math.cos(angle) * dist;
                    const sparkY = exp.y + Math.sin(angle) * dist;
                    this.ctx.fillRect(sparkX - 1, sparkY - 1, 2, 2);
                }
            }
        }
    }
    
    /**
     * Render warp effects
     */
    renderWarpEffects(state) {
        const warpEffects = state.warpEffects || [];
        
        for (let effect of warpEffects) {
            const progress = effect.lifetime / effect.maxLifetime;
            
            if (effect.type === 'arrive') {
                // Arrival flash
                const radius = 5 + (60 * (1 - progress));
                const alpha = (1 - progress) * 0.8;
                
                // Distortion ring
                this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5})`;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius * 1.5, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Flash
                const flashGradient = this.ctx.createRadialGradient(
                    effect.x, effect.y, 0,
                    effect.x, effect.y, radius
                );
                flashGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                flashGradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.7})`);
                flashGradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = flashGradient;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Light streaks
                if (progress < 0.3 && this.showEffects) {
                    this.ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - progress * 3) * 0.5})`;
                    this.ctx.lineWidth = 1;
                    for (let i = 0; i < 6; i++) {
                        const angle = (Math.PI * 2 / 6) * i;
                        this.ctx.beginPath();
                        this.ctx.moveTo(effect.x, effect.y);
                        this.ctx.lineTo(
                            effect.x + Math.cos(angle) * radius * 3,
                            effect.y + Math.sin(angle) * radius * 3
                        );
                        this.ctx.stroke();
                    }
                }
                
            } else if (effect.type === 'depart') {
                // Departure collapse
                const radius = 60 * progress;
                const alpha = (1 - progress) * 0.8;
                
                this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                this.ctx.stroke();
                
                if (progress > 0.7) {
                    const flashAlpha = (progress - 0.7) * 3;
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`;
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, effect.y, 10 * (1 - progress), 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
            } else if (effect.type === 'land') {
                // Landing dust
                const alpha = (1 - progress) * 0.6;
                
                for (let i = 0; i < 5; i++) {
                    const cloudX = effect.x + (Math.random() - 0.5) * 30;
                    const cloudY = effect.y + progress * 20;
                    const size = 10 + i * 3;
                    
                    this.ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.3})`;
                    this.ctx.beginPath();
                    this.ctx.arc(cloudX, cloudY, size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.fillStyle = `rgba(255, 200, 100, ${alpha * 0.5})`;
                this.ctx.fillRect(effect.x - 2, effect.y - 30 + progress * 30, 4, 20);
                
            } else if (effect.type === 'takeoff') {
                // Takeoff thrust
                const alpha = (1 - progress) * 0.8;
                
                const plumeGradient = this.ctx.createLinearGradient(
                    effect.x, effect.y,
                    effect.x, effect.y + 40
                );
                plumeGradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
                plumeGradient.addColorStop(0.5, `rgba(255, 150, 50, ${alpha * 0.6})`);
                plumeGradient.addColorStop(1, 'transparent');
                
                this.ctx.fillStyle = plumeGradient;
                this.ctx.beginPath();
                this.ctx.moveTo(effect.x - 5, effect.y);
                this.ctx.lineTo(effect.x + 5, effect.y);
                this.ctx.lineTo(effect.x + 8, effect.y + 40);
                this.ctx.lineTo(effect.x - 8, effect.y + 40);
                this.ctx.closePath();
                this.ctx.fill();
                
                // Smoke rings
                for (let i = 0; i < 3; i++) {
                    const ringY = effect.y + 10 + i * 10 + progress * 20;
                    const ringSize = 5 + i * 3 + progress * 10;
                    this.ctx.strokeStyle = `rgba(100, 100, 100, ${alpha * 0.3})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.arc(effect.x, ringY, ringSize, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    /**
     * Render minimap
     */
    renderMinimap(state) {
        if (!this.minimapCtx) return;
        
        const centerX = 50;
        const centerY = 50;
        const maxRadius = 45;
        
        // Clear with dark background
        this.minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.minimapCtx.fillRect(0, 0, 100, 100);
        
        // Range circles
        this.minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.minimapCtx.lineWidth = 1;
        for (let r = 15; r <= 45; r += 15) {
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
            this.minimapCtx.stroke();
        }
        
        // Planets
        const planets = state.planets || [];
        this.minimapCtx.fillStyle = '#ffffff';
        this.minimapCtx.shadowColor = '#ffffff';
        this.minimapCtx.shadowBlur = 3;
        
        for (let planet of planets) {
            const dx = (planet.x - state.ship.x) * this.minimapScale;
            const dy = (planet.y - state.ship.y) * this.minimapScale;
            if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(centerX + dx, centerY + dy, 3, 0, Math.PI * 2);
                this.minimapCtx.fill();
            }
        }
        this.minimapCtx.shadowBlur = 0;
        
        // NPCs
        const npcShips = state.npcShips || [];
        this.minimapCtx.fillStyle = '#ffffff';
        for (let npc of npcShips) {
            const dx = (npc.x - state.ship.x) * this.minimapScale;
            const dy = (npc.y - state.ship.y) * this.minimapScale;
            if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
                this.minimapCtx.fillRect(centerX + dx - 1, centerY + dy - 1, 2, 2);
            }
        }
        
        // Player ship at center
        this.minimapCtx.save();
        this.minimapCtx.translate(centerX, centerY);
        this.minimapCtx.rotate(state.ship.angle);
        this.minimapCtx.fillStyle = '#ffffff';
        this.minimapCtx.shadowColor = '#ffffff';
        this.minimapCtx.shadowBlur = 5;
        this.minimapCtx.beginPath();
        this.minimapCtx.moveTo(4, 0);
        this.minimapCtx.lineTo(-2, -2);
        this.minimapCtx.lineTo(-2, 2);
        this.minimapCtx.closePath();
        this.minimapCtx.fill();
        this.minimapCtx.restore();
    }
    
    /**
     * Handle canvas resize
     */
    handleCanvasResize(data) {
        this.screenCenter.x = data.width / 2;
        this.screenCenter.y = data.height / 2;
    }
    
    /**
     * Resize canvas
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight - 150; // Account for HUD
        this.screenCenter.x = this.canvas.width / 2;
        this.screenCenter.y = this.canvas.height / 2;
    }
    
    /**
     * Update render system (called each frame)
     */
    update(state, deltaTime) {
        // Could update visual effects here if needed
        // For now, rendering happens in render() method
    }
    
    /**
     * Clean up render system
     */
    destroy() {
        // Clear any render-specific resources
        this.stars = { far: [], mid: [], near: [] };
        
        console.log('[RenderSystem] Destroyed');
    }
}

export default RenderSystem;