/**
 * GameLoop - Advanced game loop with fixed timestep and interpolation
 * Ensures consistent physics regardless of frame rate
 *
 * Time scale (W2.1): `timeScale` multiplies the wall-clock delta fed to the
 * accumulator, so hit-stop slows the simulation without changing the fixed
 * step (physics stays deterministic; only how much sim time a real frame buys
 * changes). Systems never touch the loop directly — they emit
 * `TIME_SCALE_SET` and the loop broadcasts `TIME_SCALE_CHANGED`.
 */
import { getEventBus } from './EventBus.js';

// Time-scale channel. String literals (not GameEvents constants) because
// core/EventBus.js is owned elsewhere; these mirror the 'debug.fps' style
// ad-hoc events already in use.
export const TIME_SCALE_SET = 'game.timescale.set';       // request: { value, ms }
export const TIME_SCALE_CHANGED = 'game.timescale';        // broadcast: { value }

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

        // Simulation speed multiplier (1 = real time). Hit-stop drops this
        // briefly; it never changes fixedTimeStep.
        this.timeScale = 1;
        this._timeScaleTimer = null;

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

        // EventBus-driven time scale requests
        this.eventBus = getEventBus();
        this._handleTimeScaleRequest = (data) => {
            this.setTimeScale(data?.value, data?.ms);
        };
        this.eventBus.on(TIME_SCALE_SET, this._handleTimeScaleRequest);
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
     * Set the simulation speed multiplier.
     * @param {number} value - Multiplier (1 = real time; 0.15 = hit-stop)
     * @param {number} [ms] - Restore to 1 after this many REAL milliseconds
     */
    setTimeScale(value, ms = 0) {
        const raw = Number(value);
        const v = Number.isFinite(raw) ? Math.max(0.02, Math.min(4, raw)) : 1;

        if (this._timeScaleTimer) {
            clearTimeout(this._timeScaleTimer);
            this._timeScaleTimer = null;
        }
        this._applyTimeScale(v);

        const hold = Number(ms);
        if (v !== 1 && Number.isFinite(hold) && hold > 0) {
            this._timeScaleTimer = setTimeout(() => {
                this._timeScaleTimer = null;
                this._applyTimeScale(1);
            }, hold);
        }
    }

    _applyTimeScale(v) {
        if (this.timeScale === v) return;
        this.timeScale = v;
        try { this.eventBus.emit(TIME_SCALE_CHANGED, { value: v }); } catch (_) { /* non-fatal */ }
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

        // Fixed timestep updates (time scale buys less sim time per real frame)
        this.accumulator += frameTime * this.timeScale;

        const updateStart = performance.now();

        // Perform fixed updates
        while (this.accumulator >= this.fixedTimeStep) {
            this.onUpdate(this.fixedTimeStep / 1000); // Convert to seconds
            this.accumulator -= this.fixedTimeStep;
            this.currentTime += this.fixedTimeStep;
        }

        this.updateTime = performance.now() - updateStart;

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
                timeScale: this.timeScale
            }
        };
    }

    /**
     * Stop the loop and release the EventBus subscription
     */
    destroy() {
        this.stop();
        if (this._timeScaleTimer) {
            clearTimeout(this._timeScaleTimer);
            this._timeScaleTimer = null;
        }
        this.eventBus.off(TIME_SCALE_SET, this._handleTimeScaleRequest);
    }
}

export default GameLoop;
