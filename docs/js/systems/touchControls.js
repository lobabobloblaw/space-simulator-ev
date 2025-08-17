/**
 * Touch Controls System for Galaxy Trader
 * Virtual joystick and action buttons for mobile play
 */

export class TouchControls {
    constructor(game, ship, canvas) {
        this.game = game;
        this.ship = ship;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.enabled = false;
        
        // Virtual joystick state
        this.joystick = {
            active: false,
            baseX: 100,
            baseY: 0, // Will be set based on canvas height
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            angle: 0,
            distance: 0,
            radius: 60,
            innerRadius: 20
        };
        
        // Button definitions
        this.buttons = [
            { id: 'fire', label: 'FIRE', x: 0, y: 0, radius: 35, pressed: false, key: 'KeyF' },
            { id: 'brake', label: 'BRAKE', x: 0, y: 0, radius: 30, pressed: false, key: 'Space' },
            { id: 'land', label: 'LAND', x: 0, y: 0, radius: 30, pressed: false, key: 'KeyL' },
            { id: 'weapon', label: 'WPN', x: 0, y: 0, radius: 25, pressed: false, key: 'KeyQ' }
        ];
        
        // Touch tracking
        this.touches = new Map();
        
        // Check if mobile/tablet
        this.checkMobile();
        
        if (this.enabled) {
            this.init();
        }
    }
    
    checkMobile() {
        // Check for debug mode via URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const debugTouch = urlParams.get('touch') === 'true';
        
        if (debugTouch) {
            console.log('[TouchControls] Debug mode enabled via URL parameter');
            this.enabled = true;
            return;
        }
        
        // Detect mobile/tablet devices
        const isTouchDevice = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) || 
                            (navigator.msMaxTouchPoints > 0);
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Enable for touch devices or mobile user agents
        this.enabled = isTouchDevice || isMobile;
    }
    
    init() {
        // Position controls based on canvas size
        this.updatePositions();
        
        // Add touch event listeners
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // Add mouse event listeners for debug mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('touch') === 'true') {
            this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
            this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        }
        
        // Handle window resize
        window.addEventListener('resize', this.updatePositions.bind(this));
        
        // Prevent default touch behaviors
        document.body.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }
    
    updatePositions() {
        const padding = 20;
        
        // Joystick on bottom left
        this.joystick.baseX = 100;
        this.joystick.baseY = this.canvas.height - 100;
        
        // Buttons on bottom right
        const rightX = this.canvas.width - 80;
        const bottomY = this.canvas.height - 80;
        
        // Fire button (largest, primary action)
        this.buttons[0].x = rightX;
        this.buttons[0].y = bottomY - 60;
        
        // Brake button (left of fire)
        this.buttons[1].x = rightX - 80;
        this.buttons[1].y = bottomY;
        
        // Land button (above brake)
        this.buttons[2].x = rightX - 80;
        this.buttons[2].y = bottomY - 70;
        
        // Weapon switch (far left)
        this.buttons[3].x = rightX - 150;
        this.buttons[3].y = bottomY - 35;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Check if touch is on joystick area
            const jDist = Math.hypot(x - this.joystick.baseX, y - this.joystick.baseY);
            if (jDist <= this.joystick.radius * 1.5) {
                this.joystick.active = true;
                this.joystick.startX = x;
                this.joystick.startY = y;
                this.joystick.currentX = x;
                this.joystick.currentY = y;
                this.touches.set(touch.identifier, 'joystick');
                this.updateJoystick();
                continue;
            }
            
            // Check buttons
            for (let btn of this.buttons) {
                const dist = Math.hypot(x - btn.x, y - btn.y);
                if (dist <= btn.radius) {
                    btn.pressed = true;
                    this.touches.set(touch.identifier, btn.id);
                    // Simulate key press
                    this.game.keys[btn.key] = true;
                    break;
                }
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const touchType = this.touches.get(touch.identifier);
            
            if (touchType === 'joystick' && this.joystick.active) {
                this.joystick.currentX = touch.clientX;
                this.joystick.currentY = touch.clientY;
                this.updateJoystick();
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const touchType = this.touches.get(touch.identifier);
            
            if (touchType === 'joystick') {
                this.joystick.active = false;
                this.joystick.distance = 0;
                this.joystick.angle = 0;
                // Stop movement
                this.game.keys['KeyW'] = false;
                this.game.keys['KeyA'] = false;
                this.game.keys['KeyD'] = false;
            } else {
                // Find and release button
                const btn = this.buttons.find(b => b.id === touchType);
                if (btn) {
                    btn.pressed = false;
                    this.game.keys[btn.key] = false;
                }
            }
            
            this.touches.delete(touch.identifier);
        }
    }
    
    updateJoystick() {
        const dx = this.joystick.currentX - this.joystick.baseX;
        const dy = this.joystick.currentY - this.joystick.baseY;
        
        this.joystick.distance = Math.min(Math.hypot(dx, dy), this.joystick.radius);
        this.joystick.angle = Math.atan2(dy, dx);
        
        // Convert joystick input to keyboard controls
        const threshold = 0.3; // Dead zone
        const normalizedDist = this.joystick.distance / this.joystick.radius;
        
        // Thrust (forward movement)
        if (normalizedDist > threshold) {
            const thrustAmount = (normalizedDist - threshold) / (1 - threshold);
            // Use angle to determine if moving forward (top half of joystick)
            if (Math.abs(this.joystick.angle + Math.PI/2) < Math.PI/2) {
                this.game.keys['KeyW'] = true;
            } else {
                this.game.keys['KeyW'] = false;
            }
        } else {
            this.game.keys['KeyW'] = false;
        }
        
        // Rotation (left/right)
        const rotationThreshold = 0.3;
        const horizontalComponent = Math.cos(this.joystick.angle) * normalizedDist;
        
        if (Math.abs(horizontalComponent) > rotationThreshold) {
            if (horizontalComponent > 0) {
                this.game.keys['KeyD'] = true;
                this.game.keys['KeyA'] = false;
            } else {
                this.game.keys['KeyA'] = true;
                this.game.keys['KeyD'] = false;
            }
        } else {
            this.game.keys['KeyA'] = false;
            this.game.keys['KeyD'] = false;
        }
    }
    
    render() {
        if (!this.enabled) return;
        
        this.ctx.save();
        
        // Draw virtual joystick
        this.renderJoystick();
        
        // Draw action buttons
        this.renderButtons();
        
        this.ctx.restore();
    }
    
    renderJoystick() {
        // Outer circle
        this.ctx.strokeStyle = this.joystick.active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Inner circle (knob)
        let knobX = this.joystick.baseX;
        let knobY = this.joystick.baseY;
        
        if (this.joystick.active) {
            const angle = this.joystick.angle;
            const dist = Math.min(this.joystick.distance, this.joystick.radius);
            knobX += Math.cos(angle) * dist;
            knobY += Math.sin(angle) * dist;
        }
        
        // Knob gradient
        const gradient = this.ctx.createRadialGradient(knobX, knobY, 0, knobX, knobY, this.joystick.innerRadius);
        gradient.addColorStop(0, this.joystick.active ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 255, 255, 0.4)');
        gradient.addColorStop(1, this.joystick.active ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.1)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(knobX, knobY, this.joystick.innerRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Direction indicator lines
        if (this.joystick.active && this.joystick.distance > 10) {
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.joystick.baseX, this.joystick.baseY);
            this.ctx.lineTo(knobX, knobY);
            this.ctx.stroke();
        }
    }
    
    renderButtons() {
        for (let btn of this.buttons) {
            // Button circle
            this.ctx.strokeStyle = btn.pressed ? 'rgba(0, 255, 255, 0.8)' : 'rgba(0, 255, 255, 0.3)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // Button fill
            if (btn.pressed) {
                const gradient = this.ctx.createRadialGradient(btn.x, btn.y, 0, btn.x, btn.y, btn.radius);
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            }
            
            // Button label
            this.ctx.fillStyle = btn.pressed ? '#00ffff' : 'rgba(0, 255, 255, 0.6)';
            this.ctx.font = `${btn.radius < 30 ? '10' : '12'}px 'JetBrains Mono', monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(btn.label, btn.x, btn.y);
        }
    }
    
    // Call this method from the main game loop
    update() {
        if (!this.enabled) return;
        // Additional update logic if needed
    }
    
    // Mouse event handlers for debug mode
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Simulate touch event
        const fakeTouch = {
            identifier: 'mouse',
            clientX: e.clientX,
            clientY: e.clientY
        };
        
        e.changedTouches = [fakeTouch];
        this.handleTouchStart(e);
    }
    
    handleMouseMove(e) {
        if (this.touches.has('mouse')) {
            const fakeTouch = {
                identifier: 'mouse',
                clientX: e.clientX,
                clientY: e.clientY
            };
            
            e.changedTouches = [fakeTouch];
            this.handleTouchMove(e);
        }
    }
    
    handleMouseUp(e) {
        if (this.touches.has('mouse')) {
            const fakeTouch = {
                identifier: 'mouse',
                clientX: e.clientX,
                clientY: e.clientY
            };
            
            e.changedTouches = [fakeTouch];
            this.handleTouchEnd(e);
        }
    }
}
