/**
 * Advanced Procedural Planet Renderer
 * Uses noise-based procedural generation inspired by Three.js planet generators
 */

export class ProceduralPlanetRenderer {
    constructor() {
        this.planetCache = new Map();
        this.permutation = this.generatePermutation();
    }
    
    /**
     * Initialize planets with procedural generation
     */
    initializePlanets(planets) {
        for (const planet of planets) {
            this.generateProceduralPlanet(planet);
        }
    }
    
    /**
     * Generate permutation table for Perlin noise
     */
    generatePermutation() {
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        
        // Deterministic shuffle using a fixed seed
        let seed = 12345;
        for (let i = 255; i > 0; i--) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const j = seed % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }
        
        // Duplicate for wrapping
        for (let i = 0; i < 256; i++) {
            p[256 + i] = p[i];
        }
        
        return p;
    }
    
    /**
     * Generate deterministic seed from planet properties
     */
    getDeterministicSeed(planet) {
        // Create a hash from planet name and position
        let hash = 0;
        for (let i = 0; i < planet.name.length; i++) {
            hash = ((hash << 5) - hash) + planet.name.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        // Mix in position for uniqueness
        hash = hash ^ (planet.x * 73856093) ^ (planet.y * 19349663);
        // Return a positive seed value
        return Math.abs(hash % 10000) / 10;
    }
    
    /**
     * Improved Perlin noise function
     */
    noise2D(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        const u = this.fade(x);
        const v = this.fade(y);
        
        const p = this.permutation;
        const A = p[X] + Y;
        const AA = p[A];
        const AB = p[A + 1];
        const B = p[X + 1] + Y;
        const BA = p[B];
        const BB = p[B + 1];
        
        return this.lerp(v,
            this.lerp(u, this.grad(p[AA], x, y), this.grad(p[BA], x - 1, y)),
            this.lerp(u, this.grad(p[AB], x, y - 1), this.grad(p[BB], x - 1, y - 1))
        );
    }
    
    /**
     * Fade function for smooth interpolation
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    /**
     * Linear interpolation
     */
    lerp(t, a, b) {
        return a + t * (b - a);
    }
    
    /**
     * Gradient function
     */
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    /**
     * Fractional Brownian Motion - layers of noise
     */
    fbm(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise2D(x * frequency, y * frequency);
            maxValue += amplitude;
            amplitude *= gain;
            frequency *= lacunarity;
        }
        
        return value / maxValue;
    }
    
    /**
     * Ridge noise for mountain-like features
     */
    ridgeNoise(x, y, octaves = 4) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        
        for (let i = 0; i < octaves; i++) {
            const n = 1 - Math.abs(this.noise2D(x * frequency, y * frequency));
            value += n * n * amplitude;
            amplitude *= 0.5;
            frequency *= 2.1;
        }
        
        return value;
    }
    
    /**
     * Generate procedural planet texture
     */
    generateProceduralPlanet(planet) {
        const cache = {
            texture: document.createElement('canvas'),
            normalMap: document.createElement('canvas'),
            cloudMap: document.createElement('canvas'),
            features: this.getPlanetFeatures(planet)
        };
        
        const size = Math.ceil(planet.radius * 3);
        cache.texture.width = cache.texture.height = size;
        cache.normalMap.width = cache.normalMap.height = size;
        cache.cloudMap.width = cache.cloudMap.height = size;
        
        // Generate based on planet type
        if (planet.name === "Terra Nova") {
            this.generateEarthLikePlanet(cache, planet, size);
        } else if (planet.name === "Crimson Moon") {
            this.generateVolcanicPlanet(cache, planet, size);
        } else if (planet.name === "Ice World") {
            this.generateIcePlanet(cache, planet, size);
        } else if (planet.name === "Mining Station") {
            this.generateRockyPlanet(cache, planet, size);
        }
        
        // Generate cloud map for applicable planets
        if (cache.features.hasClouds) {
            this.generateCloudMap(cache, size, planet);
        }
        
        // Apply spherical distortion to make it look 3D
        this.applySphericalDistortion(cache, planet, size);
        
        this.planetCache.set(planet.name, cache);
    }
    
    /**
     * Generate Earth-like planet
     */
    generateEarthLikePlanet(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        const center = size / 2;
        const radius = planet.radius;
        // Use deterministic seed based on planet name and position
        const seed = this.getDeterministicSeed(planet);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                const dist2 = dx * dx + dy * dy;
                const r2 = radius * radius;
                if (dist2 <= r2) {
                    // Convert to sphere coordinates
                    const nx = dx / radius;
                    const ny = dy / radius;
                    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                    
                    // Sample noise at sphere surface
                    const theta = Math.atan2(ny, nx);
                    const phi = Math.acos(nz);
                    
                    // Use 3D coordinates for seamless wrapping
                    const px = Math.sin(phi) * Math.cos(theta) * 2;
                    const py = Math.sin(phi) * Math.sin(theta) * 2;
                    const pz = Math.cos(phi) * 2;
                    
                    // Continental noise
                    const continental = this.fbm(px + seed, py + seed, 4, 2.0, 0.5);
                    // Mountain noise
                    const mountains = this.ridgeNoise(px * 4 + seed, py * 4 + seed, 3);
                    // Detail noise
                    const detail = this.fbm(px * 8 + seed, py * 8 + seed, 2, 2.0, 0.5);
                    
                    // Combine noises - shift down by 0.45 for 75% water coverage (oceanic world)
                    const elevation = (continental * 0.6 + mountains * 0.3 + detail * 0.1) - 0.45;
                    
                    const i = (y * size + x) * 4;
                    
                    if (elevation < 0.08) {
                        // Unified ocean with smooth gradient based on depth
                        // Deeper water = darker, shallower = lighter
                        const waterDepth = Math.max(0, Math.min(1, (elevation + 0.45) / 0.53));
                        
                        // Smooth color interpolation from deep to shallow
                        const deepR = 15;
                        const deepG = 50;
                        const deepB = 95;
                        
                        const shallowR = 35;
                        const shallowG = 95;
                        const shallowB = 155;
                        
                        // Interpolate colors based on depth
                        data[i] = deepR + (shallowR - deepR) * waterDepth;
                        data[i + 1] = deepG + (shallowG - deepG) * waterDepth;
                        data[i + 2] = deepB + (shallowB - deepB) * waterDepth;
                        
                        // Add subtle variation to prevent banding
                        const variation = (Math.sin(px * 50) * Math.sin(py * 50)) * 5;
                        data[i] = Math.max(0, Math.min(255, data[i] + variation));
                        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + variation));
                        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + variation * 0.5));
                    } else if (elevation < 0.13) {
                        // Beach/sand - narrower beach band
                        data[i] = 230 - elevation * 50;
                        data[i + 1] = 210 - elevation * 50;
                        data[i + 2] = 140 - elevation * 50;
                    } else if (elevation < 0.3) {
                        // Grassland
                        data[i] = 80 + elevation * 100;
                        data[i + 1] = 120 + elevation * 100;
                        data[i + 2] = 60 + elevation * 50;
                    } else if (elevation < 0.6) {
                        // Forest
                        data[i] = 40 + elevation * 60;
                        data[i + 1] = 80 + elevation * 60;
                        data[i + 2] = 30 + elevation * 30;
                    } else if (elevation < 0.8) {
                        // Mountains
                        data[i] = 100 + elevation * 80;
                        data[i + 1] = 90 + elevation * 80;
                        data[i + 2] = 80 + elevation * 80;
                    } else {
                        // Snow caps
                        data[i] = 240;
                        data[i + 1] = 245;
                        data[i + 2] = 250;
                    }
                    
                    // Apply lighting based on normal
                    const lightDir = { x: -0.5, y: -0.5, z: 0.7 };
                    const dotProduct = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
                    const lighting = Math.max(0.3, dotProduct);
                    
                    data[i] *= lighting;
                    data[i + 1] *= lighting;
                    data[i + 2] *= lighting;
                    data[i + 3] = 255;
                } else {
                    data[(y * size + x) * 4 + 3] = 0;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Generate volcanic planet
     */
    generateVolcanicPlanet(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        const center = size / 2;
        const radius = planet.radius;
        // Use deterministic seed based on planet name and position
        const seed = this.getDeterministicSeed(planet);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                const dist2 = dx * dx + dy * dy;
                const r2 = radius * radius;
                if (dist2 <= r2) {
                    const nx = dx / radius;
                    const ny = dy / radius;
                    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                    
                    const theta = Math.atan2(ny, nx);
                    const phi = Math.acos(nz);
                    
                    const px = Math.sin(phi) * Math.cos(theta) * 2;
                    const py = Math.sin(phi) * Math.sin(theta) * 2;
                    
                    // Volcanic terrain
                    const lava = this.fbm(px * 3 + seed, py * 3 + seed, 5, 2.3, 0.4);
                    const cracks = this.ridgeNoise(px * 8 + seed, py * 8 + seed, 2);
                    const heat = Math.max(0, this.noise2D(px * 15 + seed, py * 15 + seed));
                    
                    const i = (y * size + x) * 4;
                    
                    // Base dark rock
                    data[i] = 40 + lava * 60;
                    data[i + 1] = 20 + lava * 30;
                    data[i + 2] = 10 + lava * 20;
                    
                    // Lava cracks
                    if (cracks > 0.6) {
                        const glowIntensity = (cracks - 0.6) * 2.5;
                        data[i] = Math.min(255, data[i] + glowIntensity * 200);
                        data[i + 1] = Math.min(255, data[i + 1] + glowIntensity * 100);
                        data[i + 2] = Math.min(255, data[i + 2] + glowIntensity * 20);
                    }
                    
                    // Hot spots
                    if (heat > 0.7) {
                        data[i] = Math.min(255, data[i] + heat * 100);
                        data[i + 1] = Math.min(255, data[i + 1] + heat * 50);
                    }
                    
                    // Lighting
                    const lightDir = { x: -0.5, y: -0.5, z: 0.7 };
                    const dotProduct = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
                    const lighting = Math.max(0.2, dotProduct);
                    
                    data[i] *= lighting;
                    data[i + 1] *= lighting;
                    data[i + 2] *= lighting;
                    data[i + 3] = 255;
                } else {
                    data[(y * size + x) * 4 + 3] = 0;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Generate ice planet
     */
    generateIcePlanet(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        const center = size / 2;
        const radius = planet.radius;
        // Use deterministic seed based on planet name and position
        const seed = this.getDeterministicSeed(planet);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                const dist2 = dx * dx + dy * dy;
                if (dist2 <= radius * radius) {
                    const nx = dx / radius;
                    const ny = dy / radius;
                    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                    
                    const theta = Math.atan2(ny, nx);
                    const phi = Math.acos(nz);
                    
                    const px = Math.sin(phi) * Math.cos(theta) * 2;
                    const py = Math.sin(phi) * Math.sin(theta) * 2;
                    
                    // Ice terrain
                    const ice = this.fbm(px * 4 + seed, py * 4 + seed, 4, 2.0, 0.6);
                    const cracks = Math.abs(this.noise2D(px * 10 + seed, py * 10 + seed));
                    const snow = this.fbm(px * 20 + seed, py * 20 + seed, 2, 2.0, 0.5);
                    
                    const i = (y * size + x) * 4;
                    
                    // Base ice color
                    const iceLevel = ice * 0.5 + 0.5;
                    data[i] = 180 + iceLevel * 60;
                    data[i + 1] = 200 + iceLevel * 50;
                    data[i + 2] = 220 + iceLevel * 35;
                    
                    // Cracks (darker)
                    if (cracks < 0.1) {
                        const crackIntensity = (0.1 - cracks) * 10;
                        data[i] *= (1 - crackIntensity * 0.3);
                        data[i + 1] *= (1 - crackIntensity * 0.3);
                        data[i + 2] *= (1 - crackIntensity * 0.2);
                    }
                    
                    // Snow patches (brighter)
                    if (snow > 0.3) {
                        const snowIntensity = (snow - 0.3) * 1.4;
                        data[i] = Math.min(255, data[i] + snowIntensity * 30);
                        data[i + 1] = Math.min(255, data[i + 1] + snowIntensity * 25);
                        data[i + 2] = Math.min(255, data[i + 2] + snowIntensity * 20);
                    }
                    
                    // Lighting
                    const lightDir = { x: -0.5, y: -0.5, z: 0.7 };
                    const dotProduct = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
                    const lighting = Math.max(0.4, dotProduct);
                    
                    data[i] *= lighting;
                    data[i + 1] *= lighting;
                    data[i + 2] *= lighting;
                    data[i + 3] = 255;
                } else {
                    data[(y * size + x) * 4 + 3] = 0;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Generate rocky planet/asteroid
     */
    generateRockyPlanet(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const imageData = ctx.createImageData(size, size);
        const data = imageData.data;
        
        const center = size / 2;
        const radius = planet.radius;
        // Use deterministic seed based on planet name and position
        const seed = this.getDeterministicSeed(planet);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - center;
                const dy = y - center;
                
                // Irregular asteroid shape
                const angle = Math.atan2(dy, dx);
                const shapeNoise = this.fbm(
                    Math.cos(angle) * 3 + seed,
                    Math.sin(angle) * 3 + seed,
                    3, 2.0, 0.5
                );
                const effectiveRadius = radius * (0.8 + shapeNoise * 0.3);
                const dist2 = dx * dx + dy * dy;
                if (dist2 <= effectiveRadius * effectiveRadius) {
                    const nx = dx / effectiveRadius;
                    const ny = dy / effectiveRadius;
                    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
                    
                    const theta = Math.atan2(ny, nx);
                    const phi = Math.acos(nz);
                    
                    const px = Math.sin(phi) * Math.cos(theta) * 2;
                    const py = Math.sin(phi) * Math.sin(theta) * 2;
                    
                    // Rocky terrain
                    const rock = this.fbm(px * 5 + seed, py * 5 + seed, 5, 2.1, 0.5);
                    const craters = Math.max(0, -this.noise2D(px * 8 + seed, py * 8 + seed));
                    const ore = Math.max(0, this.ridgeNoise(px * 12 + seed, py * 12 + seed, 2) - 0.7);
                    
                    const i = (y * size + x) * 4;
                    
                    // Base rock color
                    const rockLevel = rock * 0.5 + 0.5;
                    data[i] = 100 + rockLevel * 60;
                    data[i + 1] = 80 + rockLevel * 50;
                    data[i + 2] = 60 + rockLevel * 40;
                    
                    // Craters (darker)
                    if (craters > 0.3) {
                        const craterDepth = (craters - 0.3) * 2;
                        data[i] *= (1 - craterDepth * 0.4);
                        data[i + 1] *= (1 - craterDepth * 0.4);
                        data[i + 2] *= (1 - craterDepth * 0.4);
                    }
                    
                    // Ore veins (golden)
                    if (ore > 0) {
                        data[i] = Math.min(255, data[i] + ore * 150);
                        data[i + 1] = Math.min(255, data[i + 1] + ore * 120);
                        data[i + 2] = Math.min(255, data[i + 2] + ore * 30);
                    }
                    
                    // Lighting
                    const lightDir = { x: -0.5, y: -0.5, z: 0.7 };
                    const dotProduct = nx * lightDir.x + ny * lightDir.y + nz * lightDir.z;
                    const lighting = Math.max(0.2, dotProduct);
                    
                    data[i] *= lighting;
                    data[i + 1] *= lighting;
                    data[i + 2] *= lighting;
                    data[i + 3] = 255;
                } else {
                    data[(y * size + x) * 4 + 3] = 0;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    /**
     * Generate cloud map
     */
    generateCloudMap(cache, size, planet) {
        const ctx = cache.cloudMap.getContext('2d');
        const center = size / 2;
        const radius = size / 2.5;
        // Use deterministic seed for clouds too
        let seed = this.getDeterministicSeed(planet) * 2;
        
        // Simple deterministic random number generator
        const random = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return seed / 0x7fffffff;
        };
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0)';
        ctx.fillRect(0, 0, size, size);
        
        for (let i = 0; i < 50; i++) {
            const angle = random() * Math.PI * 2;
            const dist = random() * radius * 0.8;
            const x = center + Math.cos(angle) * dist;
            const y = center + Math.sin(angle) * dist;
            
            const cloudSize = random() * 20 + 10;
            const alpha = random() * 0.3 + 0.1;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, cloudSize);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, cloudSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Apply spherical distortion for 3D effect
     */
    applySphericalDistortion(cache, planet, size) {
        const ctx = cache.texture.getContext('2d');
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Copy original
        tempCtx.drawImage(cache.texture, 0, 0);
        
        // Apply edge darkening for sphere illusion
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, planet.radius * 0.7,
            size / 2, size / 2, planet.radius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, planet.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Get planet features
     */
    getPlanetFeatures(planet) {
        const features = {
            hasAtmosphere: true,
            atmosphereColor: planet.color,
            hasClouds: false,
            cloudSpeed: 0.00003,
            rotationSpeed: 0.00005
        };
        
        if (planet.name === "Terra Nova") {
            features.hasClouds = true;
            features.atmosphereColor = '#4A90E2';
        } else if (planet.name === "Crimson Moon") {
            features.atmosphereColor = '#E74C3C';
            features.rotationSpeed = 0.00008;
        } else if (planet.name === "Ice World") {
            features.hasClouds = true;
            features.atmosphereColor = '#85C1E9';
            features.cloudSpeed = 0.00002;
        } else if (planet.name === "Mining Station") {
            features.hasAtmosphere = false;
            features.rotationSpeed = 0.0001;
        }
        
        return features;
    }
    
    /**
     * Render planet
     */
    renderPlanet(ctx, planet, time) {
        const cache = this.planetCache.get(planet.name);
        if (!cache) return;
        
        const features = cache.features;
        
        ctx.save();
        
        // Atmospheric glow
        if (features.hasAtmosphere) {
            const glowGradient = ctx.createRadialGradient(
                planet.x, planet.y, planet.radius,
                planet.x, planet.y, planet.radius * 1.4
            );
            glowGradient.addColorStop(0, features.atmosphereColor + '33');
            glowGradient.addColorStop(0.5, features.atmosphereColor + '18');
            glowGradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(planet.x, planet.y, planet.radius * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw planet
        ctx.save();
        ctx.translate(planet.x, planet.y);
        ctx.rotate(time * features.rotationSpeed);
        
        const textureSize = cache.texture.width;
        ctx.drawImage(
            cache.texture,
            -textureSize / 2,
            -textureSize / 2,
            textureSize,
            textureSize
        );
        
        // Draw clouds
        if (features.hasClouds && cache.cloudMap) {
            ctx.save();
            ctx.rotate(time * features.cloudSpeed);
            ctx.globalAlpha = 0.7;
            ctx.drawImage(
                cache.cloudMap,
                -textureSize / 2,
                -textureSize / 2,
                textureSize,
                textureSize
            );
            ctx.restore();
        }
        
        ctx.restore();
        ctx.restore();
    }
}
