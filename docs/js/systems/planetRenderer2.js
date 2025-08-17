/**
 * Simplified Planet Rendering System
 * Pre-generates realistic planet textures instead of complex layering
 */

export class PlanetRenderer {
    constructor() {
        this.planetCache = new Map();
        this.animationTime = 0;
    }
    
    /**
     * Initialize planet rendering cache
     */
    initializePlanets(planets) {
        for (const planet of planets) {
            this.generatePlanetTexture(planet);
        }
    }
    
    /**
     * Generate a realistic planet texture using noise and gradients
     */
    generatePlanetTexture(planet) {
        const cache = {
            // Main planet texture
            texture: document.createElement('canvas'),
            clouds: document.createElement('canvas'),
            
            // Animation data
            rotationAngle: 0,
            cloudOffset: 0,
            
            // Planet-specific features
            features: this.getPlanetFeatures(planet)
        };
        
        // Set canvas sizes
        const size = planet.radius * 2.5; // Slightly larger for glow
        cache.texture.width = cache.texture.height = size;
        cache.clouds.width = cache.clouds.height = size;
        
        // Generate the planet texture based on type
        if (planet.name === "Terra Nova") {
            this.generateOceanWorld(cache, planet, size);
        } else if (planet.name === "Crimson Moon") {
            this.generateVolcanicWorld(cache, planet, size);
        } else if (planet.name === "Ice World") {
            this.generateIceWorld(cache, planet, size);
        } else if (planet.name === "Mining Station") {
            this.generateAsteroid(cache, planet, size);
        }
        
        this.planetCache.set(planet.name, cache);
    }
    
    /**
     * Get planet-specific features for animation
     */
    getPlanetFeatures(planet) {
        const features = {
            hasAtmosphere: true,
            atmosphereColor: planet.color,
            rotationSpeed: 0.0001,
            cloudSpeed: 0.00005,
            hasClouds: false,
            hasLava: false,
            hasAurora: false,
            hasCities: false
        };
        
        if (planet.name === "Terra Nova") {
            features.hasClouds = true;
            features.hasCities = true;
            features.atmosphereColor = '#4A90E2';
        } else if (planet.name === "Crimson Moon") {
            features.hasLava = true;
            features.atmosphereColor = '#E74C3C';
            features.rotationSpeed = 0.00008;
        } else if (planet.name === "Ice World") {
            features.hasAurora = true;
            features.hasClouds = true;
            features.atmosphereColor = '#85C1E9';
        } else if (planet.name === "Mining Station") {
            features.hasAtmosphere = false;
            features.rotationSpeed = 0.00015;
        }
        
        return features;
    }
    
    /**
     * Generate ocean world texture
     */
    generateOceanWorld(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const center = size / 2;
        const radius = planet.radius;
        
        // Create a more realistic ocean planet
        ctx.save();
        ctx.translate(center, center);
        
        // Base ocean color
        const oceanGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, radius * 0.2,
            0, 0, radius
        );
        oceanGradient.addColorStop(0, '#6BB6E5');
        oceanGradient.addColorStop(0.3, '#5AA5D5');
        oceanGradient.addColorStop(0.5, '#4A90C5');
        oceanGradient.addColorStop(0.7, '#3A70A5');
        oceanGradient.addColorStop(1, '#2A5085');
        
        // Draw base sphere
        ctx.fillStyle = oceanGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some landmasses using irregular shapes
        ctx.fillStyle = 'rgba(100, 140, 80, 0.6)';
        
        // Continent 1 - irregular blob
        this.drawIrregularShape(ctx, -radius * 0.3, -radius * 0.2, radius * 0.35, 8);
        
        // Continent 2 - another irregular shape
        this.drawIrregularShape(ctx, radius * 0.4, radius * 0.1, radius * 0.25, 6);
        
        // Small islands
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.6 + radius * 0.2;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            this.drawIrregularShape(ctx, x, y, radius * 0.08, 5);
        }
        
        // Add atmospheric rim
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Generate cloud layer
        this.generateClouds(cache, planet, size);
    }
    
    /**
     * Generate volcanic world texture
     */
    generateVolcanicWorld(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const center = size / 2;
        const radius = planet.radius;
        
        ctx.save();
        ctx.translate(center, center);
        
        // Dark rocky surface
        const rockGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, radius * 0.1,
            0, 0, radius
        );
        rockGradient.addColorStop(0, '#883333');
        rockGradient.addColorStop(0.3, '#773333');
        rockGradient.addColorStop(0.5, '#662222');
        rockGradient.addColorStop(0.7, '#551111');
        rockGradient.addColorStop(1, '#330808');
        
        ctx.fillStyle = rockGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add lava veins and hot spots
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const size = Math.random() * 15 + 5;
            
            // Glowing lava spot
            const lavaGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            lavaGradient.addColorStop(0, 'rgba(255, 200, 0, 0.9)');
            lavaGradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.7)');
            lavaGradient.addColorStop(0.6, 'rgba(200, 50, 0, 0.5)');
            lavaGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = lavaGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add some darker craters
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const size = Math.random() * 12 + 8;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Atmospheric heat glow
        ctx.strokeStyle = 'rgba(255, 100, 0, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Generate ice world texture
     */
    generateIceWorld(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const center = size / 2;
        const radius = planet.radius;
        
        ctx.save();
        ctx.translate(center, center);
        
        // Ice surface gradient
        const iceGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, radius * 0.2,
            0, 0, radius
        );
        iceGradient.addColorStop(0, '#F0F8FF');
        iceGradient.addColorStop(0.3, '#D0E8F8');
        iceGradient.addColorStop(0.5, '#A0C8E8');
        iceGradient.addColorStop(0.7, '#70A8D8');
        iceGradient.addColorStop(1, '#5088B8');
        
        ctx.fillStyle = iceGradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add frozen seas (darker blue patches)
        ctx.fillStyle = 'rgba(80, 120, 160, 0.4)';
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.6;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            this.drawIrregularShape(ctx, x, y, radius * 0.2, 6);
        }
        
        // Add ice cracks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            const startAngle = Math.random() * Math.PI * 2;
            const startDist = Math.random() * radius * 0.9;
            const endAngle = startAngle + (Math.random() - 0.5) * 0.5;
            const endDist = Math.random() * radius * 0.9;
            
            ctx.beginPath();
            ctx.moveTo(
                Math.cos(startAngle) * startDist,
                Math.sin(startAngle) * startDist
            );
            ctx.lineTo(
                Math.cos(endAngle) * endDist,
                Math.sin(endAngle) * endDist
            );
            ctx.stroke();
        }
        
        // Atmospheric frost
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
        
        // Generate wispy clouds
        this.generateClouds(cache, planet, size);
    }
    
    /**
     * Generate asteroid texture
     */
    generateAsteroid(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const center = size / 2;
        const radius = planet.radius;
        
        ctx.save();
        ctx.translate(center, center);
        
        // Rocky surface
        const rockGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, radius * 0.1,
            0, 0, radius
        );
        rockGradient.addColorStop(0, '#A88858');
        rockGradient.addColorStop(0.3, '#987848');
        rockGradient.addColorStop(0.5, '#886838');
        rockGradient.addColorStop(0.7, '#685828');
        rockGradient.addColorStop(1, '#483818');
        
        // Draw irregular asteroid shape
        ctx.fillStyle = rockGradient;
        this.drawIrregularShape(ctx, 0, 0, radius, 12);
        
        // Add craters and surface features
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const size = Math.random() * 10 + 5;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add ore deposits (bright spots)
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.8;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const size = Math.random() * 6 + 3;
            
            const oreGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
            oreGradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            oreGradient.addColorStop(0.5, 'rgba(255, 195, 0, 0.5)');
            oreGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = oreGradient;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    /**
     * Generate cloud layer
     */
    generateClouds(cache, planet, size) {
        const ctx = cache.clouds.getContext('2d');
        const center = size / 2;
        const radius = planet.radius;
        
        ctx.save();
        ctx.translate(center, center);
        
        // Create wispy clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
            const dist = radius * (0.5 + Math.random() * 0.4);
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const cloudSize = radius * (0.15 + Math.random() * 0.1);
            
            // Draw cloud using multiple soft circles
            for (let j = 0; j < 3; j++) {
                const offsetX = x + (Math.random() - 0.5) * cloudSize;
                const offsetY = y + (Math.random() - 0.5) * cloudSize;
                ctx.beginPath();
                ctx.arc(offsetX, offsetY, cloudSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Draw an irregular shape (for continents, asteroids, etc.)
     */
    drawIrregularShape(ctx, x, y, baseRadius, vertices) {
        ctx.save();
        ctx.translate(x, y);
        
        ctx.beginPath();
        for (let i = 0; i <= vertices; i++) {
            const angle = (Math.PI * 2 / vertices) * i;
            const variance = 0.7 + Math.random() * 0.3;
            const r = baseRadius * variance;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                // Use quadratic curves for smoother shapes
                const prevAngle = (Math.PI * 2 / vertices) * (i - 0.5);
                const cpx = Math.cos(prevAngle) * r * 1.1;
                const cpy = Math.sin(prevAngle) * r * 1.1;
                ctx.quadraticCurveTo(cpx, cpy, px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * Main render function - much simpler now
     */
    renderPlanet(ctx, planet, time) {
        const cache = this.planetCache.get(planet.name);
        if (!cache) {
            console.warn(`No cache for planet: ${planet.name}`);
            return;
        }
        
        const features = cache.features;
        ctx.save();
        
        // Draw atmospheric glow
        if (features.hasAtmosphere) {
            const glowGradient = ctx.createRadialGradient(
                planet.x, planet.y, planet.radius,
                planet.x, planet.y, planet.radius * 1.5
            );
            glowGradient.addColorStop(0, features.atmosphereColor + '22');
            glowGradient.addColorStop(0.5, features.atmosphereColor + '11');
            glowGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw the main planet texture
        ctx.save();
        ctx.translate(planet.x, planet.y);
        
        // Rotate for mining station
        if (planet.name === "Mining Station") {
            ctx.rotate(time * features.rotationSpeed);
        }
        
        // Clip to circle for non-asteroids
        if (planet.name !== "Mining Station") {
            ctx.beginPath();
            ctx.arc(0, 0, planet.radius, 0, Math.PI * 2);
            ctx.clip();
        }
        
        // Draw the pre-rendered planet texture
        const textureSize = cache.texture.width;
        ctx.drawImage(
            cache.texture,
            -textureSize / 2,
            -textureSize / 2,
            textureSize,
            textureSize
        );
        
        // Draw clouds if applicable
        if (features.hasClouds && cache.clouds) {
            ctx.save();
            ctx.rotate(time * features.cloudSpeed);
            ctx.globalAlpha = 0.6;
            ctx.drawImage(
                cache.clouds,
                -textureSize / 2,
                -textureSize / 2,
                textureSize,
                textureSize
            );
            ctx.restore();
        }
        
        // Simple day/night terminator
        const terminatorAngle = time * 0.0001;
        const shadowGradient = ctx.createLinearGradient(
            -planet.radius, 0,
            planet.radius * 0.3, 0
        );
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        shadowGradient.addColorStop(1, 'transparent');
        
        ctx.rotate(terminatorAngle);
        ctx.fillStyle = shadowGradient;
        ctx.fillRect(-planet.radius, -planet.radius, planet.radius * 2, planet.radius * 2);
        
        ctx.restore();
        
        // Add special effects based on planet type
        if (planet.name === "Terra Nova" && features.hasCities) {
            this.drawCityLights(ctx, planet, time, terminatorAngle);
        } else if (planet.name === "Ice World" && features.hasAurora) {
            this.drawSimpleAurora(ctx, planet, time);
        } else if (planet.name === "Crimson Moon" && features.hasLava) {
            this.drawLavaGlow(ctx, planet, time);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw city lights on the night side
     */
    drawCityLights(ctx, planet, time, nightAngle) {
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(nightAngle);
        
        // Draw cities only on the dark side
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI - Math.PI * 0.5; // Only on left side
            const dist = planet.radius * (0.3 + Math.random() * 0.5);
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            
            const pulse = Math.sin(time * 0.005 + i * 2) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(100, 200, 255, ${pulse})`;
            ctx.fillRect(x - 1, y - 1, 2, 2);
        }
        
        ctx.restore();
    }
    
    /**
     * Draw simple aurora effect
     */
    drawSimpleAurora(ctx, planet, time) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        const wave = Math.sin(time * 0.001) * 10;
        const auroraGradient = ctx.createLinearGradient(
            planet.x - planet.radius,
            planet.y - planet.radius + wave,
            planet.x + planet.radius,
            planet.y - planet.radius * 0.5 + wave
        );
        auroraGradient.addColorStop(0, 'transparent');
        auroraGradient.addColorStop(0.3, 'rgba(0, 255, 200, 0.3)');
        auroraGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.4)');
        auroraGradient.addColorStop(0.7, 'rgba(150, 100, 255, 0.3)');
        auroraGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = auroraGradient;
        ctx.fillRect(
            planet.x - planet.radius,
            planet.y - planet.radius,
            planet.radius * 2,
            planet.radius
        );
        
        ctx.restore();
    }
    
    /**
     * Draw lava glow effect
     */
    drawLavaGlow(ctx, planet, time) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        
        const pulse = Math.sin(time * 0.002) * 0.2 + 0.8;
        const glowGradient = ctx.createRadialGradient(
            planet.x, planet.y + planet.radius * 0.3,
            0,
            planet.x, planet.y,
            planet.radius
        );
        glowGradient.addColorStop(0, `rgba(255, 100, 0, ${pulse})`);
        glowGradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.3)');
        glowGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
