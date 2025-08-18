/**
 * GameLoop - Advanced game loop with fixed timestep and interpolation
 * Ensures consistent physics regardless of frame rate
 */
export class GameLoop {
    constructor(options = {}) {
        // Configuration
        this.targetFPS = options.targetFPS || 60;
        this.fixedTimeStep = 1000 / this.targetFPS; // Fixed update rate in ms
        this.maxFrameTime = options.maxFrameTime || 250; // Max ms per frame (prevents spiral of death)
        
        // Callbacks
        this.onUpdate = options.onUpdate || (() => {});
        this.onRender = options.onRender || (() => {});
        this.onFPS = options.onFPS || (() => {});
        
        // State
        this.running = false;
        this.paused = false;
        
        // Timing
        this.currentTime = 0;
        this.accumulator = 0;
        this.lastTime = 0;
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFPS = this.targetFPS;
        this.averageFPS = this.targetFPS;
        this.fpsHistory = [];
        this.maxFPSHistory = 60;
        
        // Frame timing stats
        this.updateTime = 0;
        this.renderTime = 0;
        this.frameTime = 0;
        
        // Bind methods
        this.loop = this.loop.bind(this);
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        
        requestAnimationFrame(this.loop);
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
    }
    
    /**
     * Pause updates (rendering continues)
     */
    pause() {
        this.paused = true;
    }
    
    /**
     * Resume updates
     */
    resume() {
        this.paused = false;
        this.lastTime = performance.now(); // Reset to avoid huge accumulator
        this.accumulator = 0;
    }
    
    /**
     * Main loop using fixed timestep with interpolation
     */
    loop(timestamp) {
        if (!this.running) return;
        
        // Calculate frame delta
        let frameTime = timestamp - this.lastTime;
        
        // Clamp frame time to prevent spiral of death
        if (frameTime > this.maxFrameTime) {
            frameTime = this.maxFrameTime;
        }
        
        this.lastTime = timestamp;
        this.frameTime = frameTime;
        
        // Update FPS
        this.updateFPS(timestamp);
        
        // Fixed timestep updates
        if (!this.paused) {
            this.accumulator += frameTime;
            
            const updateStart = performance.now();
            
            // Perform fixed updates
            while (this.accumulator >= this.fixedTimeStep) {
                this.onUpdate(this.fixedTimeStep / 1000); // Convert to seconds
                this.accumulator -= this.fixedTimeStep;
                this.currentTime += this.fixedTimeStep;
            }
            
            this.updateTime = performance.now() - updateStart;
        }
        
        // Calculate interpolation for smooth rendering
        const interpolation = this.accumulator / this.fixedTimeStep;
        
        // Render with interpolation
        const renderStart = performance.now();
        this.onRender(interpolation, frameTime / 1000);
        this.renderTime = performance.now() - renderStart;
        
        // Continue loop
        requestAnimationFrame(this.loop);
    }
    
    /**
     * Update FPS metrics
     */
    updateFPS(timestamp) {
        this.frameCount++;
        
        // Update every second
        if (timestamp >= this.fpsTime + 1000) {
            // Calculate current FPS
            this.currentFPS = Math.round(this.frameCount * 1000 / (timestamp - this.fpsTime));
            
            // Add to history
            this.fpsHistory.push(this.currentFPS);
            if (this.fpsHistory.length > this.maxFPSHistory) {
                this.fpsHistory.shift();
            }
            
            // Calculate average
            this.averageFPS = Math.round(
                this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
            );
            
            // Callback with FPS data
            this.onFPS({
                current: this.currentFPS,
                average: this.averageFPS,
                target: this.targetFPS,
                updateTime: this.updateTime,
                renderTime: this.renderTime,
                frameTime: this.frameTime
            });
            
            // Reset counters
            this.fpsTime = timestamp;
            this.frameCount = 0;
        }
    }
    
    /**
     * Get current performance stats
     */
    getStats() {
        return {
            fps: {
                current: this.currentFPS,
                average: this.averageFPS,
                target: this.targetFPS
            },
            timing: {
                update: this.updateTime,
                render: this.renderTime,
                frame: this.frameTime,
                accumulator: this.accumulator
            },
            state: {
                running: this.running,
                paused: this.paused
            }
        };
    }
    
    /**
     * Set target FPS (updates fixed timestep)
     */
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.fixedTimeStep = 1000 / fps;
    }
    
    /**
     * Reset timing (useful after long pauses)
     */
    resetTiming() {
        this.lastTime = performance.now();
        this.accumulator = 0;
    }
}

/**
 * Simple game loop without fixed timestep
 * For simpler games or when variable timestep is preferred
 */
export class SimpleGameLoop {
    constructor(options = {}) {
        this.onUpdate = options.onUpdate || (() => {});
        this.onRender = options.onRender || (() => {});
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        
        this.loop = this.loop.bind(this);
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop);
    }
    
    stop() {
        this.running = false;
    }
    
    pause() {
        this.paused = true;
    }
    
    resume() {
        this.paused = false;
        this.lastTime = performance.now();
    }
    
    loop(timestamp) {
        if (!this.running) return;
        
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        if (!this.paused) {
            this.onUpdate(deltaTime);
        }
        
        this.onRender(deltaTime);
        
        requestAnimationFrame(this.loop);
    }
}

export default GameLoop;
