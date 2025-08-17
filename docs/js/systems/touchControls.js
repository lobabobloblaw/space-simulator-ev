/**
 * Touch Controls System for Galaxy Trader
 * Virtual joystick and action buttons for mobile play
 */

export class TouchControls {
    constructor(game, ship) {
        this.game = game;
        this.ship = ship;
        this.enabled = false;
        this.controls = {};
        
        // Virtual joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            angle: 0,
            distance: 0,
            maxDistance: 60
        };
        
        // Button states
        this.buttons = {
            fire: false,
            brake: false,
            land: false,
            weaponSwitch: false
        };
        