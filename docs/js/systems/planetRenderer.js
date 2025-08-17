/**
 * Advanced Planet Rendering System
 * Creates stunning procedural planets with multiple animated layers
 */

export class PlanetRenderer {
    constructor() {
        this.planetCache = new Map();
        this.animationTime = 0;
        this.noiseGrid = this.generateNoiseGrid(64, 64);
    }
    
    /**
     * Initialize planet rendering cache
     */
    initializePlanets(planets) {
        for (const planet of planets) {
            this.cachePlanet(planet);
        }
    }
    
    /**
     * Cache planet visuals for performance
     */
    cachePlanet(planet) {
        const cache = {
            // Pre-rendered layers
            surface: document.createElement('canvas'),
            clouds: document.createElement('canvas'),
            atmosphere: document.createElement('canvas'),
            features: document.createElement('canvas'),
            
            // Cached gradients
            gradients: {},
            
            // Animation data
            cloudOffset: 0,
            rotationAngle: 0,
            featureAnimations: [],
            
            // Planet-specific data
            cityPositions: [],
            lavaFlows: [],
            auroraPoints: [],
            asteroidShape: []
        };
        
        // Set canvas sizes (2x radius for features, 3x for atmosphere)
        const size = planet.radius * 2;
        cache.surface.width = cache.surface.height = size;
        cache.clouds.width = cache.clouds.height = size;
        cache.features.width = cache.features.height = size;
        cache.atmosphere.width = cache.atmosphere.height = size * 1.5;
        
        // Pre-render based on planet type
        if (planet.name === "Terra Nova") {
            this.renderTerraNovaSurface(cache, planet);
            this.generateCityPositions(cache, planet);
        } else if (planet.name === "Crimson Moon") {
            this.renderCrimsonSurface(cache, planet);
            this.generateLavaFlows(cache, planet);
        } else if (planet.name === "Ice World") {
            this.renderIceSurface(cache, planet);
            this.generateAuroraPath(cache, planet);
        } else if (planet.name === "Mining Station") {
            this.renderAsteroidSurface(cache, planet);
            this.generateAsteroidShape(cache, planet);
        }
        
        // Pre-render atmosphere for all planets
        this.renderAtmosphere(cache, planet);
        
        this.planetCache.set(planet.name, cache);
    }
    
    /**
     * Render Terra Nova ocean world surface
     */
    renderTerraNovaSurface(cache, planet) {
        const ctx = cache.surface.getContext('2d');
        const r = planet.radius;
        
        // Ocean base with multiple gradient stops for depth
        const oceanGradient = ctx.createRadialGradient(
            r * 0.7, r * 0.7, r * 0.2,
            r, r, r
        );
        oceanGradient.addColorStop(0, '#7BB8E8');
        oceanGradient.addColorStop(0.2, '#6BA3E5');
        oceanGradient.addColorStop(0.4, '#5A92D4');
        oceanGradient.addColorStop(0.6, '#4A82C4');
        oceanGradient.addColorStop(0.8, '#2A5A94');
        oceanGradient.addColorStop(1, '#1A3A64');
        
        ctx.fillStyle = oceanGradient;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Add continental shapes using noise
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const x = r + Math.cos(angle) * r * 0.5;
            const y = r + Math.sin(angle) * r * 0.5;
            
            // Continent gradient
            const landGradient = ctx.createRadialGradient(x, y, 0, x, y, r * 0.4);
            landGradient.addColorStop(0, '#4A9A4A');
            landGradient.addColorStop(0.5, '#3A7A3A');
            landGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = landGradient;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        
        // Cache the gradient for reuse
        cache.gradients.ocean = oceanGradient;
    }
    
    /**
     * Render Crimson Moon volcanic surface
     */
    renderCrimsonSurface(cache, planet) {
        const ctx = cache.surface.getContext('2d');
        const r = planet.radius;
        
        // Volcanic surface with dark rock and lava veins
        const surfaceGradient = ctx.createRadialGradient(
            r * 0.6, r * 0.6, r * 0.1,
            r, r, r
        );
        surfaceGradient.addColorStop(0, '#AA4444');
        surfaceGradient.addColorStop(0.3, '#883333');
        surfaceGradient.addColorStop(0.6, '#662222');
        surfaceGradient.addColorStop(0.9, '#441111');
        surfaceGradient.addColorStop(1, '#220808');
        
        ctx.fillStyle = surfaceGradient;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Add volcanic craters
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * r * 0.7 + r * 0.2;
            const x = r + Math.cos(angle) * dist;
            const y = r + Math.sin(angle) * dist;
            const craterSize = Math.random() * 10 + 5;
            
            // Crater with glowing center
            const craterGradient = ctx.createRadialGradient(x, y, 0, x, y, craterSize);
            craterGradient.addColorStop(0, '#FF6600');
            craterGradient.addColorStop(0.3, '#CC3300');
            craterGradient.addColorStop(0.7, '#661100');
            craterGradient.addColorStop(1, '#330800');
            
            ctx.fillStyle = craterGradient;
            ctx.beginPath();
            ctx.arc(x, y, craterSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    /**
     * Render Ice World frozen surface
     */
    renderIceSurface(cache, planet) {
        const ctx = cache.surface.getContext('2d');
        const r = planet.radius;
        
        // Icy surface with varied blues and whites
        const iceGradient = ctx.createRadialGradient(
            r * 0.6, r * 0.6, r * 0.2,
            r, r, r
        );
        iceGradient.addColorStop(0, '#F0F8FF');
        iceGradient.addColorStop(0.2, '#D0E8F8');
        iceGradient.addColorStop(0.4, '#A0C8E8');
        iceGradient.addColorStop(0.6, '#70A8D8');
        iceGradient.addColorStop(0.8, '#4088C8');
        iceGradient.addColorStop(1, '#2068A8');
        
        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Add ice cracks pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            const startAngle = Math.random() * Math.PI * 2;
            const endAngle = startAngle + Math.random() * Math.PI * 0.5;
            const startDist = Math.random() * r * 0.8;
            const endDist = Math.random() * r * 0.8;
            
            ctx.moveTo(
                r + Math.cos(startAngle) * startDist,
                r + Math.sin(startAngle) * startDist
            );
            ctx.lineTo(
                r + Math.cos(endAngle) * endDist,
                r + Math.sin(endAngle) * endDist
            );
            ctx.stroke();
        }
        
        // Frozen lakes/seas
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 6; i++) {
            const x = r + (Math.random() - 0.5) * r * 1.5;
            const y = r + (Math.random() - 0.5) * r * 1.5;
            const lakeSize = Math.random() * r * 0.3 + r * 0.1;
            
            ctx.fillStyle = '#6090C0';
            ctx.beginPath();
            ctx.arc(x, y, lakeSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    /**
     * Render Mining Station asteroid surface
     */
    renderAsteroidSurface(cache, planet) {
        const ctx = cache.surface.getContext('2d');
        const r = planet.radius;
        
        // Rocky asteroid surface
        const rockGradient = ctx.createRadialGradient(
            r * 0.7, r * 0.7, r * 0.1,
            r, r, r
        );
        rockGradient.addColorStop(0, '#C8A878');
        rockGradient.addColorStop(0.3, '#A88858');
        rockGradient.addColorStop(0.6, '#886838');
        rockGradient.addColorStop(0.9, '#684828');
        rockGradient.addColorStop(1, '#483018');
        
        ctx.fillStyle = rockGradient;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Add ore deposits (glowing patches)
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * r * 0.8;
            const x = r + Math.cos(angle) * dist;
            const y = r + Math.sin(angle) * dist;
            const oreSize = Math.random() * 8 + 4;
            
            const oreGradient = ctx.createRadialGradient(x, y, 0, x, y, oreSize);
            oreGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            oreGradient.addColorStop(0.5, 'rgba(255, 195, 0, 0.4)');
            oreGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = oreGradient;
            ctx.beginPath();
            ctx.arc(x, y, oreSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Mining station structures
        ctx.fillStyle = '#666';
        ctx.fillRect(r - 10, r - 5, 20, 10);
        ctx.fillStyle = '#888';
        ctx.fillRect(r - 5, r - 15, 10, 10);
        
        // Landing pads
        ctx.strokeStyle = '#AAA';
        ctx.lineWidth = 1;
        ctx.strokeRect(r + 15, r - 8, 12, 12);
        ctx.strokeRect(r - 27, r - 8, 12, 12);
    }
    
    /**
     * Pre-render atmospheric effects
     */
    renderAtmosphere(cache, planet) {
        const ctx = cache.atmosphere.getContext('2d');
        const size = cache.atmosphere.width;
        const r = size / 3; // Atmosphere extends beyond planet
        const center = size / 2;
        
        // Multi-layer atmosphere
        const layers = [
            { radius: r * 1.5, alpha: 0.05 },
            { radius: r * 1.3, alpha: 0.08 },
            { radius: r * 1.15, alpha: 0.12 },
            { radius: r * 1.05, alpha: 0.18 }
        ];
        
        for (const layer of layers) {
            const gradient = ctx.createRadialGradient(
                center, center, r * 0.95,
                center, center, layer.radius
            );
            gradient.addColorStop(0, planet.color + '00');
            gradient.addColorStop(0.5, planet.color + Math.floor(layer.alpha * 255).toString(16));
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(center, center, layer.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Generate fixed city positions for Terra Nova
     */
    generateCityPositions(cache, planet) {
        const cities = [];
        const cityCount = 25;
        
        for (let i = 0; i < cityCount; i++) {
            const angle = (Math.PI * 2 / cityCount) * i + Math.random() * 0.2;
            const dist = planet.radius * (0.3 + Math.random() * 0.6);
            cities.push({
                angle: angle,
                distance: dist,
                size: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
        
        cache.cityPositions = cities;
    }
    
    /**
     * Generate lava flow paths for Crimson Moon
     */
    generateLavaFlows(cache, planet) {
        const flows = [];
        
        for (let i = 0; i < 5; i++) {
            const flow = {
                startAngle: Math.random() * Math.PI * 2,
                startDist: Math.random() * planet.radius * 0.3,
                points: []
            };
            
            let angle = flow.startAngle;
            let dist = flow.startDist;
            
            // Create winding lava path
            for (let j = 0; j < 8; j++) {
                flow.points.push({ angle, dist });
                angle += (Math.random() - 0.5) * 0.3;
                dist += planet.radius * 0.1;
                if (dist > planet.radius * 0.9) break;
            }
            
            flows.push(flow);
        }
        
        cache.lavaFlows = flows;
    }
    
    /**
     * Generate aurora path for Ice World
     */
    generateAuroraPath(cache, planet) {
        const points = [];
        const pointCount = 20;
        
        for (let i = 0; i <= pointCount; i++) {
            const t = i / pointCount;
            const baseAngle = -Math.PI * 0.7 + (Math.PI * 1.4 * t);
            points.push({
                angle: baseAngle,
                distance: planet.radius * (0.8 + Math.sin(t * Math.PI * 3) * 0.1),
                offset: 0
            });
        }
        
        cache.auroraPoints = points;
    }
    
    /**
     * Generate asteroid irregular shape
     */
    generateAsteroidShape(cache, planet) {
        const points = [];
        const vertices = 12;
        
        for (let i = 0; i < vertices; i++) {
            const angle = (Math.PI * 2 / vertices) * i;
            const variance = 0.7 + Math.random() * 0.3;
            points.push({
                angle: angle,
                radius: planet.radius * variance
            });
        }
        
        cache.asteroidShape = points;
    }
    
    /**
     * Main render function - draws planet with all effects
     */
    renderPlanet(ctx, planet, time) {
        const cache = this.planetCache.get(planet.name);
        if (!cache) return;
        
        this.animationTime = time;
        
        ctx.save();
        
        // Draw atmosphere first (behind planet)
        const atmSize = cache.atmosphere.width;
        const atmOffset = atmSize / 2 - planet.radius;
        ctx.drawImage(
            cache.atmosphere,
            planet.x - atmOffset,
            planet.y - atmOffset
        );
        
        // Draw planet surface
        ctx.save();
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.clip();
        
        // For mining station, apply rotation
        if (planet.name === "Mining Station") {
            ctx.translate(planet.x, planet.y);
            ctx.rotate(time * 0.0001);
            ctx.drawImage(
                cache.surface,
                -planet.radius,
                -planet.radius
            );
            ctx.translate(-planet.x, -planet.y);
        } else {
            ctx.drawImage(
                cache.surface,
                planet.x - planet.radius,
                planet.y - planet.radius
            );
        }
        
        // Draw animated features
        if (planet.name === "Terra Nova") {
            this.drawTerraNovaClouds(ctx, planet, cache, time);
            this.drawOceanShimmer(ctx, planet, time);
            this.drawCityLights(ctx, planet, cache, time);
        } else if (planet.name === "Crimson Moon") {
            this.drawLavaFlows(ctx, planet, cache, time);
            this.drawVolcanicPlumes(ctx, planet, time);
        } else if (planet.name === "Ice World") {
            this.drawAurora(ctx, planet, cache, time);
            this.drawIceSparkles(ctx, planet, time);
        } else if (planet.name === "Mining Station") {
            this.drawMiningOperations(ctx, planet, time);
        }
        
        ctx.restore();
        
        // Draw terminator line (day/night boundary)
        this.drawTerminator(ctx, planet, time);
        
        // Rim lighting
        ctx.strokeStyle = planet.color + '44';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Draw animated cloud layer for Terra Nova
     */
    drawTerraNovaClouds(ctx, planet, cache, time) {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        // Multiple cloud layers moving at different speeds
        for (let layer = 0; layer < 3; layer++) {
            const speed = 0.00005 * (layer + 1);
            const offset = time * speed;
            
            for (let i = 0; i < 6; i++) {
                const baseAngle = (Math.PI * 2 / 6) * i + offset;
                const dist = planet.radius * (0.4 + layer * 0.2);
                const x = planet.x + Math.cos(baseAngle) * dist;
                const y = planet.y + Math.sin(baseAngle) * dist;
                const size = planet.radius * (0.3 - layer * 0.05);
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw ocean shimmer effect
     */
    drawOceanShimmer(ctx, planet, time) {
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Animated specular highlights
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const shimmerOffset = Math.sin(time * 0.002 + i) * 10;
            const x = planet.x + Math.cos(angle) * (planet.radius * 0.6 + shimmerOffset);
            const y = planet.y + Math.sin(angle) * (planet.radius * 0.6 + shimmerOffset);
            const size = 2 + Math.sin(time * 0.003 + i * 2) * 1;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw city lights on night side
     */
    drawCityLights(ctx, planet, cache, time) {
        const nightAngle = time * 0.0001;
        
        ctx.globalAlpha = 0.8;
        
        for (const city of cache.cityPositions) {
            const angle = city.angle;
            const x = planet.x + Math.cos(angle) * city.distance;
            const y = planet.y + Math.sin(angle) * city.distance;
            
            // Only show cities on dark side
            const angleDiff = Math.abs(angle - nightAngle);
            if (angleDiff > Math.PI * 0.5 && angleDiff < Math.PI * 1.5) {
                const pulse = Math.sin(time * 0.005 + city.angle * 10) * 0.2 + 0.8;
                ctx.fillStyle = `rgba(100, 200, 255, ${city.brightness * pulse})`;
                
                ctx.beginPath();
                ctx.arc(x, y, city.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw animated lava flows
     */
    drawLavaFlows(ctx, planet, cache, time) {
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.8)';
        ctx.lineWidth = 2;
        
        for (const flow of cache.lavaFlows) {
            ctx.beginPath();
            
            for (let i = 0; i < flow.points.length; i++) {
                const point = flow.points[i];
                const pulse = Math.sin(time * 0.001 + i * 0.5) * 0.1;
                const x = planet.x + Math.cos(point.angle) * (point.dist + pulse * 10);
                const y = planet.y + Math.sin(point.angle) * (point.dist + pulse * 10);
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.stroke();
            
            // Glowing lava particles
            ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
            for (let i = 0; i < flow.points.length; i += 2) {
                const point = flow.points[i];
                const particleOffset = Math.sin(time * 0.002 + i) * 5;
                const x = planet.x + Math.cos(point.angle) * (point.dist + particleOffset);
                const y = planet.y + Math.sin(point.angle) * (point.dist + particleOffset);
                
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Draw volcanic smoke plumes
     */
    drawVolcanicPlumes(ctx, planet, time) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
        
        // Smoke rising from craters
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i;
            const baseX = planet.x + Math.cos(angle) * planet.radius * 0.5;
            const baseY = planet.y + Math.sin(angle) * planet.radius * 0.5;
            
            for (let j = 0; j < 5; j++) {
                const rise = j * 8 + Math.sin(time * 0.001 + i) * 3;
                const spread = j * 3;
                const size = 5 + j * 2;
                
                ctx.beginPath();
                ctx.arc(baseX + Math.sin(time * 0.0005 + j) * spread, 
                       baseY - rise, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw aurora borealis effect
     */
    drawAurora(ctx, planet, cache, time) {
        ctx.globalAlpha = 0.4;
        
        // Animated aurora ribbons
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < cache.auroraPoints.length; i++) {
            const point = cache.auroraPoints[i];
            const wave = Math.sin(time * 0.001 + i * 0.3) * 10;
            const x = planet.x + Math.cos(point.angle) * (point.distance + wave);
            const y = planet.y + Math.sin(point.angle) * (point.distance + wave);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Second aurora layer
        ctx.strokeStyle = 'rgba(150, 100, 255, 0.3)';
        ctx.beginPath();
        
        for (let i = 0; i < cache.auroraPoints.length; i++) {
            const point = cache.auroraPoints[i];
            const wave = Math.sin(time * 0.0015 - i * 0.2) * 15;
            const x = planet.x + Math.cos(point.angle) * (point.distance + wave - 10);
            const y = planet.y + Math.sin(point.angle) * (point.distance + wave - 10);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw ice crystal sparkles
     */
    drawIceSparkles(ctx, planet, time) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        
        // Twinkling ice crystals
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            const dist = planet.radius * (0.5 + Math.sin(i * 2) * 0.3);
            const twinkle = Math.sin(time * 0.005 + i * 3) > 0.5 ? 1 : 0;
            
            if (twinkle) {
                const x = planet.x + Math.cos(angle) * dist;
                const y = planet.y + Math.sin(angle) * dist;
                
                ctx.globalAlpha = Math.random() * 0.5 + 0.5;
                ctx.fillRect(x - 1, y - 1, 2, 2);
            }
        }
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Draw mining operations
     */
    drawMiningOperations(ctx, planet, time) {
        // Mining laser beams
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i + time * 0.0002;
            const startX = planet.x + Math.cos(angle) * planet.radius;
            const startY = planet.y + Math.sin(angle) * planet.radius;
            const endX = planet.x + Math.cos(angle) * (planet.radius + 30);
            const endY = planet.y + Math.sin(angle) * (planet.radius + 30);
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // Small ships/drones
        ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        for (let i = 0; i < 4; i++) {
            const orbitAngle = time * 0.0003 * (i % 2 ? 1 : -1) + (Math.PI * 0.5 * i);
            const orbitDist = planet.radius + 20 + i * 5;
            const x = planet.x + Math.cos(orbitAngle) * orbitDist;
            const y = planet.y + Math.sin(orbitAngle) * orbitDist;
            
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
    }
    
    /**
     * Draw day/night terminator line
     */
    drawTerminator(ctx, planet, time) {
        const terminatorAngle = time * 0.0001;
        
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(terminatorAngle);
        
        // Dark side shadow
        const shadowGradient = ctx.createLinearGradient(
            -planet.radius * 0.2, 0,
            planet.radius * 0.5, 0
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        shadowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.arc(0, 0, planet.radius, Math.PI * 0.5, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Simple 2D Perlin noise generator
     */
    generateNoiseGrid(width, height) {
        const grid = [];
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                grid[y][x] = Math.random();
            }
        }
        return grid;
    }
    
    /**
     * Get noise value at position
     */
    getNoise(x, y) {
        const gridX = Math.floor(x) % this.noiseGrid[0].length;
        const gridY = Math.floor(y) % this.noiseGrid.length;
        return this.noiseGrid[gridY][gridX];
    }
}
