import { getEventBus, GameEvents } from '../core/EventBus.js';
import { getStateManager } from '../core/StateManager.js';
import { ProceduralPlanetRenderer } from './proceduralPlanetRenderer.js';
import ShipDesigns from './ShipDesigns.js';
import FactionVisuals from './FactionVisuals.js';

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
        this.nebulaOffset = { x: 0, y: 0 };
        
        // Performance optimization flags
        this.quality = 'high'; // 'low', 'medium', 'high'
        this.showParticles = true;
        this.showEffects = true;
        
        // Minimap canvas (from existing setup)
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        this.minimapScale = 0.018;
        
        // Initialize procedural planet renderer
        this.planetRenderer = new ProceduralPlanetRenderer();
        
        // Don't generate stars here - we'll use the ones from state
        
        // Bind methods
        this.handleCanvasResize = this.handleCanvasResize.bind(this);
        this.handleShieldHit = this.handleShieldHit.bind(this);
        
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

        // Safety: ensure visual world data exists (stars/asteroids/planets)
        // In theory initializeGameState sets these, but if anything raced or failed,
        // we restore minimal visuals here to avoid an empty scene.
        this.ensureWorldVisuals();
        
        // Initialize planets with procedural generation
        // We'll do this after a small delay to ensure state is ready
        setTimeout(() => {
            const state = this.stateManager.state;
            if (state.planets && state.planets.length > 0) {
                console.log('[RenderSystem] Initializing procedural planets:', state.planets.length);
                this.planetRenderer.initializePlanets(state.planets);
            }
        }, 100);
        
        console.log('[RenderSystem] Initialized');
    }

    /**
     * Ensure stars, asteroids, and planets exist in state (fallback safeguard)
     */
    ensureWorldVisuals() {
        const state = this.stateManager.state;

        // Stars fallback
        if (!state.stars || !state.stars.far || !state.stars.mid || !state.stars.near) {
            console.warn('[RenderSystem] World stars missing; generating fallback starfields');
            const density = (state.renderSettings && state.renderSettings.starDensity) ? state.renderSettings.starDensity : 1.0;
            state.stars = { far: [], mid: [], near: [] };
            for (let i = 0; i < Math.floor(3000 * density); i++) {
                state.stars.far.push({
                    x: (Math.random() - 0.5) * 12000,
                    y: (Math.random() - 0.5) * 12000,
                    brightness: Math.random() * 0.5 + 0.3,
                    size: Math.random() < 0.95 ? 1 : 2,
                    color: Math.random() < 0.94 ? '#ffffff' : 
                           Math.random() < 0.5 ? '#ffeeee' :
                           Math.random() < 0.7 ? '#eeeeff' : '#ffffee'
                });
            }
            for (let i = 0; i < Math.floor(1200 * density); i++) {
                state.stars.mid.push({
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
            for (let i = 0; i < Math.floor(600 * density); i++) {
                state.stars.near.push({
                    x: (Math.random() - 0.5) * 6000,
                    y: (Math.random() - 0.5) * 6000,
                    brightness: Math.random() * 0.7 + 0.5,
                    size: Math.random() < 0.8 ? 1 : Math.random() < 0.95 ? 2 : 3,
                    color: '#ffffff'
                });
            }
        }

        // Asteroids fallback
        if (!state.asteroids || state.asteroids.length === 0) {
            console.warn('[RenderSystem] Asteroids missing; generating fallback field');
            state.asteroids = [];
            for (let i = 0; i < 40; i++) {
                const shapePoints = [];
                for (let j = 0; j < 8; j++) shapePoints.push(0.7 + Math.random() * 0.6);
                state.asteroids.push({
                    x: (Math.random() - 0.5) * 4000,
                    y: (Math.random() - 0.5) * 4000,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: Math.random() * 8 + 2,
                    color: '#666',
                    rotationSpeed: (Math.random() - 0.5) * 0.02,
                    rotation: Math.random() * Math.PI * 2,
                    health: 20,
                    maxHealth: 20,
                    oreContent: Math.floor(Math.random() * 3) + 1,
                    shapePoints
                });
            }
        }

        // Planets fallback
        if (!state.planets || state.planets.length === 0) {
            console.warn('[RenderSystem] Planets missing; loading from data module');
            import('../data/gameData.js')
                .then(mod => {
                    if (mod.planets && mod.planets.length) {
                        state.planets = mod.planets;
                        // Initialize renderer cache now that planets exist
                        this.planetRenderer.initializePlanets(state.planets);
                        console.log('[RenderSystem] Loaded', state.planets.length, 'planets from data');
                    }
                })
                .catch(e => console.error('[RenderSystem] Failed to load planets data:', e));
        }
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

        // Shield hit visual ping
        this.eventBus.on(GameEvents.SHIELD_HIT, this.handleShieldHit);
    }
    
    // Stars are now generated in main_eventbus_pure.js and stored in state
    // This provides consistency across all systems
    
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
        
        // Apply screen shake if active
        let shakeX = 0, shakeY = 0;
        if (state.ship.screenShake && state.ship.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * state.ship.screenShake;
            shakeY = (Math.random() - 0.5) * state.ship.screenShake;
            state.ship.screenShake *= state.ship.screenShakeDecay || 0.8;
            if (state.ship.screenShake < 0.5) state.ship.screenShake = 0;
        }
        
        // Apply camera transform with shake
        this.ctx.translate(this.screenCenter.x - this.camera.x + shakeX, this.screenCenter.y - this.camera.y + shakeY);
        
        // Render layers in order (back to front)
        this.renderNebula();
        this.renderStars();
        this.renderPlanets(state);
        this.renderAsteroids(state);
        this.renderPickups(state);
        this.renderNPCs(state);
        this.renderProjectiles(state);
        this.renderMuzzleFlashes(state);
        this.renderHitSparks(state);
        this.renderShip(state);
        this.renderShieldHits(state);
        this.renderExplosions(state);
        this.renderWarpEffects(state);

        // Debug overlays in world space (before restore)
        this.renderDebug(state);

        // Restore context
        this.ctx.restore();
        
        // Draw damage flash overlay
        if (state.ship.damageFlash && state.ship.damageFlash > 0) {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${state.ship.damageFlash * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            state.ship.damageFlash -= 0.05;
            if (state.ship.damageFlash < 0) state.ship.damageFlash = 0;
        }
        
        // Render UI elements (not affected by camera)
        this.renderMinimap(state);
        
        // Render touch controls if needed
        if (window.touchControls) {
            window.touchControls.render();
        }
    }

    /**
     * Handle shield hit event to spawn a short-lived ring effect
     */
    handleShieldHit(data) {
        try {
            const state = this.stateManager.state;
            if (!state.shieldHits) state.shieldHits = [];
            if (!state.pools) state.pools = {};
            if (!state.pools.shieldHits) state.pools.shieldHits = [];
            const ship = data?.ship || state.ship;
            const fx = state.pools.shieldHits.pop() || {};
            fx.x = ship.x; fx.y = ship.y;
            fx.radius = (ship.size || 10) * 2.2;
            fx.lifetime = 0;
            fx.maxLifetime = 14;
            fx.color = '#66e0ff';
            // Soft-cap
            if (state.shieldHits.length > 24) {
                const old = state.shieldHits.shift();
                if (old) state.pools.shieldHits.push(old);
            }
            state.shieldHits.push(fx);
        } catch (e) {
            // no-op
        }
    }

    /**
     * Render shield hit rings
     */
    renderShieldHits(state) {
        const hits = state.shieldHits || [];
        if (hits.length === 0) return;
        const viewLeft = this.camera.x - this.screenCenter.x - 100;
        const viewTop = this.camera.y - this.screenCenter.y - 100;
        const viewRight = this.camera.x + this.screenCenter.x + 100;
        const viewBottom = this.camera.y + this.screenCenter.y + 100;
        for (const fx of hits) {
            if (fx.x < viewLeft || fx.x > viewRight || fx.y < viewTop || fx.y > viewBottom) continue;
            const t = fx.lifetime / fx.maxLifetime;
            const alpha = Math.max(0, 1 - t);
            const r = fx.radius * (1 + t * 0.4);
            this.ctx.save();
            this.ctx.strokeStyle = fx.color || '#66e0ff';
            this.ctx.globalAlpha = alpha * 0.8;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
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
     * Render simple debug overlays (hitboxes, vectors, npc info)
     */
    renderDebug(state) {
        const dbg = state.debug || {};
        if (!dbg.enabled) return;
        this.ctx.save();
        // World-space overlays already drawn due to camera transform earlier
        if (dbg.drawHitboxes) {
            // Ship
            if (!state.ship.isDestroyed) {
                this.ctx.strokeStyle = '#0ff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(state.ship.x, state.ship.y, state.ship.size, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            // NPCs
            for (const npc of state.npcShips || []) {
                this.ctx.strokeStyle = npc.behavior === 'aggressive' ? '#f44' : (npc.behavior === 'lawful' ? '#4af' : '#aaa');
                this.ctx.beginPath();
                this.ctx.arc(npc.x, npc.y, npc.size, 0, Math.PI * 2);
                this.ctx.stroke();
            }
            // Asteroids
            for (const a of state.asteroids || []) {
                this.ctx.strokeStyle = '#666';
                this.ctx.beginPath();
                this.ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        if (dbg.drawVectors) {
            // Velocity vectors for ship and NPCs
            const drawVec = (x, y, vx, vy, color) => {
                this.ctx.strokeStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + vx * 20, y + vy * 20);
                this.ctx.stroke();
            };
            drawVec(state.ship.x, state.ship.y, state.ship.vx, state.ship.vy, '#0f0');
            for (const npc of state.npcShips || []) {
                drawVec(npc.x, npc.y, npc.vx, npc.vy, '#ff0');
            }
        }
        if (dbg.showProjInfo) {
            // Draw projectile lifetime bars
            for (const proj of state.projectiles || []) {
                const max = (proj.type === 'rapid') ? 45 : (proj.type === 'plasma') ? 80 : 60;
                const t = Math.min(1, (proj.lifetime || 0) / max);
                const len = 12;
                this.ctx.strokeStyle = proj.isPlayer ? '#0ff' : '#f80';
                this.ctx.beginPath();
                this.ctx.moveTo(proj.x, proj.y);
                this.ctx.lineTo(proj.x - proj.vx * (len/5) * (1-t), proj.y - proj.vy * (len/5) * (1-t));
                this.ctx.stroke();
            }
            // Floating damage numbers
            const dnums = (state.debug && state.debug.damageNumbers) || [];
            this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'center';
            for (const dn of dnums) {
                const alpha = Math.max(0, 1 - dn.life / dn.max);
                this.ctx.fillStyle = `rgba(255,220,120,${alpha})`;
                this.ctx.fillText(`-${dn.amount}`, dn.x, dn.y);
            }
        }
        if (dbg.drawNPCInfo) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px "JetBrains Mono", monospace';
            this.ctx.textAlign = 'left';
            for (const npc of state.npcShips || []) {
                const info = `${npc.type}/${npc.behavior} hp:${Math.max(0, Math.round(npc.health))} cd:${Math.max(0, Math.round(npc.weaponCooldown||0))}`;
                this.ctx.fillText(info, npc.x + npc.size + 6, npc.y - npc.size - 6);
            }
        }
        this.ctx.restore();
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
        const state = this.stateManager.state;
        if (!state.stars) return;
        
        // Far stars (minimal parallax)
        for (let star of state.stars.far || []) {
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
        for (let star of state.stars.mid || []) {
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
        for (let star of state.stars.near || []) {
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
            // Use procedural planet renderer
            // Check if planet has been initialized, if not, initialize it now
            if (!this.planetRenderer.planetCache.has(planet.name)) {
                this.planetRenderer.generateProceduralPlanet(planet);
            }
            this.planetRenderer.renderPlanet(this.ctx, planet, Date.now());
            
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
        // Frustum cull to avoid off-screen gradients
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;

        for (let pickup of pickups) {
            if (pickup.x < viewLeft || pickup.x > viewRight || pickup.y < viewTop || pickup.y > viewBottom) continue;
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            if (this.quality === 'low') {
                // Simple core only for low quality
                this.ctx.globalAlpha = 1;
                this.ctx.fillStyle = pickup.type === 'ore' ? '#aaa' : '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(pickup.x, pickup.y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
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
            // Upscale NPCs based on type for clearer silhouettes
            const scaleMap = { freighter: 1.6, trader: 1.5, patrol: 1.4, pirate: 1.35, interceptor: 1.4 };
            const npcScale = scaleMap[npc.type] || 1.4;
            this.ctx.scale(npcScale, npcScale);
            
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

            // Faction/hostility brackets (subtle corner brackets around hostiles)
            // Keep draw in screen space (no rotation), sized from npc size and scale
            this.renderFactionBracket(npc, scaleMap[npc.type] || 1.4);
            
            // State indicator icon
            if (npc.state) {
                this.renderNPCStateIndicator(npc);
            }
            
            // Communication bubble
            if (npc.message && npc.messageTime) {
                this.renderNPCMessage(npc);
            }
            
            // Health bar
            if (npc.health < npc.maxHealth) {
                const barWidth = 30;
                const barHeight = 3;
                const barY = npc.message ? npc.y - npc.size - 45 : npc.y - npc.size - 10;
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.fillRect(npc.x - barWidth/2, barY, barWidth, barHeight);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                this.ctx.fillRect(npc.x - barWidth/2, barY, 
                                barWidth * (npc.health / npc.maxHealth), barHeight);
            }
        }
    }

    /**
     * Subtle HUD-style corner brackets around ships based on faction/hostility
     */
    renderFactionBracket(npc, npcScale = 1.0) {
        // Only show for hostiles (pirates) for now
        const isHostile = (npc.faction === 'pirate');
        if (!isHostile) return;

        const size = (npc.size || 10) * npcScale;
        const half = size * 1.1;
        const arm = Math.max(5, Math.min(9, size * 0.5));

        const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
        this.ctx.save();
        this.ctx.strokeStyle = palette.accent || '#ff4444';
        this.ctx.globalAlpha = 0.6;
        this.ctx.lineWidth = 1.5;

        // Four corner L-shapes around npc.x, npc.y
        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(npc.x - half, npc.y - half + arm);
        this.ctx.lineTo(npc.x - half, npc.y - half);
        this.ctx.lineTo(npc.x - half + arm, npc.y - half);
        this.ctx.stroke();
        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(npc.x + half - arm, npc.y - half);
        this.ctx.lineTo(npc.x + half, npc.y - half);
        this.ctx.lineTo(npc.x + half, npc.y - half + arm);
        this.ctx.stroke();
        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(npc.x - half, npc.y + half - arm);
        this.ctx.lineTo(npc.x - half, npc.y + half);
        this.ctx.lineTo(npc.x - half + arm, npc.y + half);
        this.ctx.stroke();
        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(npc.x + half - arm, npc.y + half);
        this.ctx.lineTo(npc.x + half, npc.y + half);
        this.ctx.lineTo(npc.x + half, npc.y + half - arm);
        this.ctx.stroke();

        this.ctx.restore();
    }
    
    /**
     * Render NPC state indicator
     */
    renderNPCStateIndicator(npc) {
        const iconY = npc.y + npc.size + 15;
        const iconSize = 8;
        
        this.ctx.save();
        this.ctx.translate(npc.x, iconY);
        
        switch(npc.state) {
            case 'pursuing':
                // Exclamation mark in red
                this.ctx.fillStyle = '#ff4444';
                this.ctx.fillRect(-1, -iconSize/2, 2, iconSize * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(0, iconSize/2 - 1, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'fleeing':
                // Arrows pointing away
                this.ctx.strokeStyle = '#ffff44';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-iconSize, 0);
                this.ctx.lineTo(-iconSize/2, -iconSize/2);
                this.ctx.moveTo(-iconSize, 0);
                this.ctx.lineTo(-iconSize/2, iconSize/2);
                this.ctx.moveTo(iconSize, 0);
                this.ctx.lineTo(iconSize/2, -iconSize/2);
                this.ctx.moveTo(iconSize, 0);
                this.ctx.lineTo(iconSize/2, iconSize/2);
                this.ctx.stroke();
                break;
                
            case 'warning':
                // Warning triangle
                this.ctx.strokeStyle = '#ff8800';
                this.ctx.fillStyle = 'rgba(255, 136, 0, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -iconSize);
                this.ctx.lineTo(-iconSize, iconSize);
                this.ctx.lineTo(iconSize, iconSize);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
                break;
                
            case 'patrolling':
                // Small rotating circle segments
                const angle = Date.now() * 0.002;
                this.ctx.strokeStyle = '#4488ff';
                this.ctx.lineWidth = 2;
                this.ctx.rotate(angle);
                for (let i = 0; i < 3; i++) {
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, iconSize/2, i * Math.PI * 2/3, i * Math.PI * 2/3 + Math.PI/4);
                    this.ctx.stroke();
                }
                break;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render NPC communication bubble
     */
    renderNPCMessage(npc) {
        const fadeTime = 3000; // Match NPCSystem message duration
        const timeSinceMessage = Date.now() - npc.messageTime;
        const alpha = Math.max(0, 1 - (timeSinceMessage / fadeTime));
        
        if (alpha <= 0) return;
        
        this.ctx.save();
        
        // Measure text
        this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const textWidth = this.ctx.measureText(npc.message).width;
        const bubbleWidth = textWidth + 16;
        const bubbleHeight = 20;
        const bubbleX = npc.x - bubbleWidth / 2;
        const bubbleY = npc.y - npc.size - 35;
        
        // Draw speech bubble
        this.ctx.globalAlpha = alpha;
        
        // Bubble background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.strokeStyle = npc.color;
        this.ctx.lineWidth = 1.5;
        
        // Rounded rectangle for bubble
        const radius = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(bubbleX + radius, bubbleY);
        this.ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
        this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
        this.ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
        this.ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
        
        // Tail pointing to NPC
        this.ctx.lineTo(npc.x + 5, bubbleY + bubbleHeight);
        this.ctx.lineTo(npc.x, bubbleY + bubbleHeight + 5);
        this.ctx.lineTo(npc.x - 5, bubbleY + bubbleHeight);
        
        this.ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
        this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
        this.ctx.lineTo(bubbleX, bubbleY + radius);
        this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
        this.ctx.closePath();
        
        this.ctx.fill();
        this.ctx.stroke();
        
        // Text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(npc.message, npc.x, bubbleY + bubbleHeight / 2);
        
        this.ctx.restore();
    }
    
    /**
     * Render specific NPC ship type
     */
    renderNPCShip(npc) {
        // Unified ship designs per type
        const typeToDesign = {
            freighter: 'hauler',
            pirate: 'raider',
            patrol: 'wing',
            trader: 'oval',
            interceptor: 'dart',
        };
        const design = typeToDesign[npc.type] || 'delta';
        const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
        ShipDesigns.draw(this.ctx, design, npc.size, palette);
        FactionVisuals.drawDecals(this.ctx, npc.faction || 'civilian', npc.size);
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
        const viewLeft = this.camera.x - this.screenCenter.x - 100;
        const viewTop = this.camera.y - this.screenCenter.y - 100;
        const viewRight = this.camera.x + this.screenCenter.x + 100;
        const viewBottom = this.camera.y + this.screenCenter.y + 100;

        for (let proj of projectiles) {
            // Frustum cull projectiles outside the viewport with margin
            if (proj.x < viewLeft || proj.x > viewRight || proj.y < viewTop || proj.y > viewBottom) continue;
            // Trail effect
            const seg = Math.max(3, Math.min(12, proj.trailLen || 5));
            const trailGradient = this.ctx.createLinearGradient(
                proj.x - proj.vx * seg, proj.y - proj.vy * seg,
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
            this.ctx.lineWidth = Math.max(1.5, Math.min(5, proj.trailWidth || 3));
            this.ctx.beginPath();
            this.ctx.moveTo(proj.x - proj.vx * seg, proj.y - proj.vy * seg);
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
        // Upscale for richer sprite-like presentation
        this.ctx.scale(1.6, 1.6);
        
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
        
        // Ship body via design system with faction palette
        const palette = FactionVisuals.getPalette(state.ship.faction || 'civilian');
        const playerDesign = (state.ship.class === 'interceptor') ? 'dart' :
                             (state.ship.class === 'freighter') ? 'hauler' :
                             (state.ship.class === 'trader') ? 'oval' :
                             (state.ship.class === 'patrol') ? 'wing' :
                             (state.ship.class === 'pirate') ? 'raider' :
                             'delta';
        ShipDesigns.draw(this.ctx, playerDesign, ship.size, palette);
        FactionVisuals.drawDecals(this.ctx, state.ship.faction || 'civilian', ship.size);
        
        // Weapon indicators
        if (ship.weapons && ship.weapons.length > 0) {
            this.ctx.fillStyle = '#ff5555';
            this.ctx.fillRect(ship.size * 0.9, -2, 2, 4);
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
        const viewLeft = this.camera.x - this.screenCenter.x - 150;
        const viewTop = this.camera.y - this.screenCenter.y - 150;
        const viewRight = this.camera.x + this.screenCenter.x + 150;
        const viewBottom = this.camera.y + this.screenCenter.y + 150;

        for (let exp of explosions) {
            // Frustum cull explosions outside viewport with margin
            if (exp.x + exp.maxRadius < viewLeft || exp.x - exp.maxRadius > viewRight ||
                exp.y + exp.maxRadius < viewTop || exp.y - exp.maxRadius > viewBottom) {
                continue;
            }
            const progress = exp.lifetime / exp.maxLifetime;
            const radius = exp.radius + (exp.maxRadius - exp.radius) * progress;
            // Multiple explosion rings (quality-aware)
            const ringCount = this.quality === 'low' ? 1 : (this.quality === 'medium' ? 2 : 3);
            for (let i = 0; i < ringCount; i++) {
                const ringProgress = Math.max(0, progress - i * 0.1);
                const ringRadius = radius * (1 - i * 0.2);
                const alpha = (1 - ringProgress) * (1 - i * 0.3);
                if (this.quality === 'low') {
                    this.ctx.fillStyle = `rgba(255, 140, 40, ${alpha * 0.6})`;
                    this.ctx.beginPath();
                    this.ctx.arc(exp.x, exp.y, ringRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                } else {
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
            }
            
            // Sparks
            if (progress < 0.5 && this.showParticles) {
                this.ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress * 2})`;
                const sparkCount = this.quality === 'low' ? 3 : 8;
                for (let i = 0; i < sparkCount; i++) {
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
     * Render lightweight hit sparks
     */
    renderHitSparks(state) {
        const sparks = state.hitSparks || [];
        if (sparks.length === 0) return;
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;
        for (const s of sparks) {
            if (s.x < viewLeft || s.x > viewRight || s.y < viewTop || s.y > viewBottom) continue;
            const t = s.lifetime / s.maxLifetime;
            const alpha = 1 - t;
            const len = s.size * (1 - t * 0.5);
            this.ctx.save();
            this.ctx.strokeStyle = s.color || '#ffffaa';
            this.ctx.globalAlpha = Math.max(0, alpha);
            this.ctx.lineWidth = 1;
            // Draw small star burst (4 rays)
            this.ctx.beginPath();
            this.ctx.moveTo(s.x - len, s.y);
            this.ctx.lineTo(s.x + len, s.y);
            this.ctx.moveTo(s.x, s.y - len);
            this.ctx.lineTo(s.x, s.y + len);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    /**
     * Render short-lived muzzle flashes
     */
    renderMuzzleFlashes(state) {
        const flashes = state.muzzleFlashes || [];
        if (flashes.length === 0) return;
        const viewLeft = this.camera.x - this.screenCenter.x - 50;
        const viewTop = this.camera.y - this.screenCenter.y - 50;
        const viewRight = this.camera.x + this.screenCenter.x + 50;
        const viewBottom = this.camera.y + this.screenCenter.y + 50;
        for (const fx of flashes) {
            if (fx.x < viewLeft || fx.x > viewRight || fx.y < viewTop || fx.y > viewBottom) continue;
            const t = fx.lifetime / fx.maxLifetime;
            const alpha = 1 - t;
            const length = 10 * (1 - t * 0.7);
            const width = 4 * (1 - t * 0.7);
            const x2 = fx.x + Math.cos(fx.angle) * length;
            const y2 = fx.y + Math.sin(fx.angle) * length;
            this.ctx.save();
            this.ctx.strokeStyle = fx.color || '#ffffaa';
            this.ctx.globalAlpha = Math.max(0, alpha * 0.9);
            this.ctx.lineWidth = width;
            this.ctx.beginPath();
            this.ctx.moveTo(fx.x, fx.y);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
            this.ctx.restore();
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
        
        // Range circles gated by radar level (featureless at level 0)
        const radarLevel = state.ship?.radarLevel || 0;
        if (radarLevel >= 1) {
            this.minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.minimapCtx.lineWidth = 1;
            for (let r = 15; r <= 45; r += 15) {
                this.minimapCtx.beginPath();
                this.minimapCtx.arc(centerX, centerY, r, 0, Math.PI * 2);
                this.minimapCtx.stroke();
            }
        }
        
        // radarLevel already defined above

        // Planets
        const planets = state.planets || [];
        if (radarLevel >= 1) {
            // Basic separation: planets as slightly larger dots (still white at lvl1)
            this.minimapCtx.fillStyle = '#ffffff';
            this.minimapCtx.shadowColor = '#ffffff';
            this.minimapCtx.shadowBlur = radarLevel >= 2 ? 3 : 0;
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
        }

        // NPCs
        const npcShips = state.npcShips || [];
        for (let npc of npcShips) {
            const dx = (npc.x - state.ship.x) * this.minimapScale;
            const dy = (npc.y - state.ship.y) * this.minimapScale;
            if (Math.abs(dx) < maxRadius && Math.abs(dy) < maxRadius) {
                const x = Math.floor(centerX + dx);
                const y = Math.floor(centerY + dy);
                if (radarLevel <= 0) {
                    // Level 0: featureless white pixels for everything
                    this.minimapCtx.fillStyle = '#ffffff';
                    this.minimapCtx.fillRect(x, y, 1, 1);
                } else if (radarLevel === 1) {
                    // Level 1: NPCs as small white squares, planets handled above
                    this.minimapCtx.fillStyle = '#ffffff';
                    this.minimapCtx.fillRect(x - 1, y - 1, 2, 2);
                } else {
                    // Level 2+: faction colors and hostile outline ring
                    const palette = FactionVisuals.getPalette(npc.faction || 'civilian', npc.color);
                    this.minimapCtx.fillStyle = palette.accent || '#ffffff';
                    this.minimapCtx.fillRect(x - 1, y - 1, 2, 2);
                    if (npc.faction === 'pirate') {
                        this.minimapCtx.strokeStyle = (palette.accent || '#ff4444');
                        this.minimapCtx.lineWidth = 1;
                        this.minimapCtx.beginPath();
                        this.minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
                        this.minimapCtx.stroke();
                    }
                }
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
        try {
            const root = document.documentElement;
            const reserveStr = getComputedStyle(root).getPropertyValue('--hud-reserve').trim();
            const reserve = parseInt(reserveStr || '150', 10) || 150;
            this.canvas.height = window.innerHeight - reserve; // Account for HUD via CSS var
        } catch (_) {
            this.canvas.height = window.innerHeight - 150; // Fallback
        }
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
        // Unsubscribe from events
        if (this.eventBus && this.handleCanvasResize) {
            this.eventBus.off('canvas.resize', this.handleCanvasResize);
        }
        if (this.eventBus && this.handleShieldHit) {
            this.eventBus.off(GameEvents.SHIELD_HIT, this.handleShieldHit);
        }
        console.log('[RenderSystem] Destroyed');
    }
}

export default RenderSystem;
