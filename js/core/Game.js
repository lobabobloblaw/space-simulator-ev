/**
 * Core game state and configuration
 */
export class Game {
    constructor() {
        this.camera = { x: 0, y: 0 };
        this.keys = {};
        this.paused = false;
    }
}