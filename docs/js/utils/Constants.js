/**
 * Constants - Game configuration and magic numbers
 * Centralizes all constants to eliminate magic numbers throughout the codebase
 */

export const GameConstants = {
    // Display settings
    CANVAS: {
        HUD_HEIGHT: 150,           // Height reserved for HUD
        MINIMAP_SIZE: 100,         // Minimap canvas size
        PLANET_CANVAS_WIDTH: 420,  // Planet detail canvas width
        PLANET_CANVAS_HEIGHT: 472  // Planet detail canvas height
    },

    // Physics constants
    PHYSICS: {
        MAX_DELTA_TIME: 0.05,      // Maximum frame delta (50ms) to prevent large jumps
        SPACE_FRICTION: 0.999,     // Very slight space friction
        BOUNCE_RESTITUTION: 0.8,   // Default bounce factor for collisions
        GRAVITY: 0.0001           // Minimal gravity for atmosphere effects
    },

    // Ship configuration
    SHIP: {
        DEFAULT_SIZE: 8,
        DEFAULT_THRUST: 0.004,
        DEFAULT_MAX_SPEED: 0.45,
        DEFAULT_TURN_SPEED: 0.012,
        DEFAULT_MAX_FUEL: 100,
        DEFAULT_MAX_HEALTH: 100,
        DEFAULT_CREDITS: 250,
        DEFAULT_CARGO_CAPACITY: 10,
        
        // Engine upgrade multipliers
        ENGINE_LEVEL_2_THRUST_MULT: 1.5,
        ENGINE_LEVEL_2_SPEED_MULT: 1.3,
        ENGINE_LEVEL_3_THRUST_MULT: 2.0,
        ENGINE_LEVEL_3_SPEED_MULT: 1.6,
        
        // Regeneration rates
        FUEL_REGEN_RATE: 0.01,     // Per frame
        SHIELD_REGEN_RATE: 0.02,   // Per frame
        HEALTH_REGEN_RATE_LANDED: 0.1, // Per frame when landed
        
        // Landing/takeoff
        LANDING_DISTANCE: 50,      // Distance from planet edge to land
        LANDING_COOLDOWN: 60,      // Frames between landing attempts
        RESPAWN_SHIELD_FRACTION: 0.5, // Fraction of max shield on respawn
        DEATH_PENALTY: 100         // Credits lost on death
    },

    // Weapon system
    WEAPONS: {
        DEFAULT_LASER: {
            type: "laser",
            damage: 10,
            cooldown: 15,
            speed: 2,
            color: '#ffff00'
        },
        
        MINING_LASER: {
            type: "mining",
            damage: 2,
            cooldown: 35,
            speed: 2,
            color: '#888888'
        },
        
        RAPID_LASER: {
            type: "rapid",
            damage: 5,
            cooldown: 12,
            speed: 3,
            color: '#ff8800'
        },
        
        PLASMA_CANNON: {
            type: "plasma",
            damage: 20,
            cooldown: 35,
            speed: 1.5,
            color: '#00ffff'
        },
        
        PROJECTILE_LIFETIME: 60,   // Frames before projectile expires
        PROJECTILE_TRAIL_LENGTH: 5 // Length of projectile trail effect
    },

    // NPC configuration
    NPC: {
        MAX_SPAWN_COUNT: 12,       // Maximum NPCs in world
        MAX_NEARBY_COUNT: 5,       // Maximum NPCs near player
        SPAWN_DISTANCE_MIN: 400,   // Minimum spawn distance from player
        SPAWN_DISTANCE_MAX: 1200,  // Maximum spawn distance from player
        DESPAWN_DISTANCE: 3000,    // Distance at which NPCs despawn
        
        BASE_SPAWN_DELAY: 3000,    // Base milliseconds between spawns
        SPAWN_DELAY_VARIANCE: 2000, // Random variance in spawn delay
        
        // Spawn weights for different NPC types
        SPAWN_WEIGHTS: {
            freighter: 0.25,
            trader: 0.3,
            patrol: 0.2,
            pirate: 0.25
        },
        
        // AI behavior parameters
        DETECTION_RANGE: {
            pirate: 800,
            patrol: 1200,
            trader: 300
        },
        
        PURSUIT_TIMEOUT: 300,      // Frames before giving up pursuit
        FLEE_DISTANCE: 200,        // Distance to maintain when fleeing
        PATROL_RADIUS: 300,        // Radius of patrol patterns
        
        // Combat parameters
        ACCURACY: {
            close: 0.8,    // < 150 units
            medium: 0.5,   // < 300 units
            long: 0.3,     // < 450 units
            max: 0.2       // > 450 units
        },
        
        MOVEMENT_PENALTY: 0.5,     // Accuracy penalty for moving targets
        
        // Patrol warning system
        PATROL_WARNING_DURATION: 2000, // Milliseconds
        PATROL_FORGIVENESS_TIME: 5000,  // Milliseconds to clear hostility
        HOSTILE_CRIMINAL_RATIO: 0.5     // Pirate kill ratio for hostility
    },

    // World generation
    WORLD: {
        ASTEROID_COUNT: 50,
        ASTEROID_SIZE_MIN: 2,
        ASTEROID_SIZE_MAX: 10,
        ASTEROID_HEALTH: 20,
        ASTEROID_ORE_CONTENT_MAX: 3,
        ASTEROID_WORLD_SIZE: 4000,     // World boundaries for asteroids
        
        // Star field
        STARS_FAR_COUNT: 3000,
        STARS_MID_COUNT: 1200,
        STARS_NEAR_COUNT: 600,
        
        STAR_FIELD_SIZE: {
            far: 12000,
            mid: 8000,
            near: 6000
        },
        
        STAR_PARALLAX: {
            far: 0.05,
            mid: 0.2,
            near: 0.4
        },
        
        STAR_TWINKLE_SPEED: 0.02
    },

    // Effects and visuals
    EFFECTS: {
        EXPLOSION_SMALL_RADIUS: 15,
        EXPLOSION_LARGE_RADIUS: 40,
        EXPLOSION_LIFETIME: 20,    // Frames
        
        WARP_EFFECT_LIFETIME: 30,  // Frames
        
        PICKUP_LIFETIME: 600,      // Frames (10 seconds at 60fps)
        PICKUP_PULSE_SPEED: 0.005, // Pulse animation speed
        
        TRAIL_ALPHA: 0.7,
        GLOW_RADIUS: 15,
        
        // Film grain effect
        FILM_GRAIN_OPACITY: 0.15,
        FILM_GRAIN_ANIMATION_SPEED: 8 // seconds
    },

    // Audio settings
    AUDIO: {
        MASTER_VOLUME: 0.3,
        
        // Sound types and their properties
        LASER_FREQUENCY: 600,
        EXPLOSION_DURATION: 0.3,
        THRUST_FREQUENCY: 60,
        THRUST_VOLUME: 0.05,
        PICKUP_FREQUENCY: 400,
        SHIELD_HIT_FREQUENCY: 2000
    },

    // UI configuration
    UI: {
        NOTIFICATION_DURATION: 2000, // Milliseconds
        HUD_UPDATE_INTERVAL: 16,     // Milliseconds (60fps)
        
        MINIMAP: {
            SCALE: 0.018,
            RANGE: 800,
            CENTER_X: 50,
            CENTER_Y: 50,
            MAX_RADIUS: 45
        },
        
        LANDING_FADE_DURATION: 60,   // Frames for planet image fade-in
        
        CYBERPUNK_COLORS: {
            PRIMARY: '#00ffff',
            SECONDARY: '#888888',
            DANGER: '#ff0040',
            SUCCESS: '#00ff88',
            WARNING: '#ffaa00'
        }
    },

    // Performance settings
    PERFORMANCE: {
        TARGET_FPS: 60,
        FRAME_TIME_WARNING: 16.67,  // Milliseconds (60fps threshold)
        MAX_PARTICLES: 100,
        MAX_TRAILS: 50,
        
        // LOD (Level of Detail) distances
        LOD_DISTANCE_NEAR: 500,
        LOD_DISTANCE_MEDIUM: 1000,
        LOD_DISTANCE_FAR: 2000
    },

    // Save system
    SAVE: {
        AUTOSAVE_INTERVAL: 30000,   // Milliseconds (30 seconds)
        MAX_SAVE_SIZE: 1048576,     // 1MB in bytes
        SAVE_VERSION: '1.0'
    },

    // Mission system
    MISSIONS: {
        COMPLETION_CHECK_INTERVAL: 1000, // Milliseconds
        NOTIFICATION_DURATION: 3000,      // Milliseconds
        
        REWARDS: {
            FIRST_KILL: 200,
            TRADE_MILESTONE: 300,
            BOUNTY_HUNTER: 500
        }
    },

    // Touch controls (mobile)
    TOUCH: {
        JOYSTICK_RADIUS: 60,
        JOYSTICK_INNER_RADIUS: 20,
        JOYSTICK_DEAD_ZONE: 0.3,
        
        BUTTON_RADIUS: {
            fire: 35,
            brake: 30,
            land: 30,
            weapon: 25
        },
        
        TOUCH_OPACITY: {
            active: 0.8,
            inactive: 0.3
        }
    },

    // Color schemes
    COLORS: {
        // Ship colors by type
        SHIP_COLORS: {
            player: '#ffffff',
            pirate: '#E74C3C',
            trader: '#95A5A6',
            freighter: '#8B7355',
            patrol: '#1E3A5F'
        },
        
        // Planet colors
        PLANET_COLORS: {
            terra_nova: '#4A90E2',
            crimson_moon: '#E74C3C',
            ice_world: '#85C1E9',
            mining_station: '#F39C12'
        },
        
        // Effect colors
        EFFECT_COLORS: {
            explosion: '#ff6600',
            warp_blue: '#00ffff',
            pickup_credits: '#ffd700',
            pickup_ore: '#888888',
            thrust: '#0099ff'
        }
    },

    // Debug settings
    DEBUG: {
        COLLISION_BOXES: false,
        AI_PATHS: false,
        PERFORMANCE_OVERLAY: false,
        ENTITY_INFO: false,
        EVENT_LOGGING: false
    }
};

// Convenience exports for commonly used constants
export const SHIP_DEFAULTS = GameConstants.SHIP;
export const WEAPON_TYPES = GameConstants.WEAPONS;
export const NPC_CONFIG = GameConstants.NPC;
export const WORLD_CONFIG = GameConstants.WORLD;
export const UI_CONFIG = GameConstants.UI;
export const COLORS = GameConstants.COLORS;

// Calculated constants (derived from base constants)
export const CALCULATED = {
    // Frame-rate independent timings (assuming 60fps)
    FRAMES_PER_SECOND: GameConstants.PERFORMANCE.TARGET_FPS,
    
    // Convert frame-based values to time-based
    FUEL_REGEN_PER_SECOND: GameConstants.SHIP.FUEL_REGEN_RATE * 60,
    SHIELD_REGEN_PER_SECOND: GameConstants.SHIP.SHIELD_REGEN_RATE * 60,
    
    // Weapon speeds in units per second
    PROJECTILE_SPEED_PER_SECOND: {
        laser: GameConstants.WEAPONS.DEFAULT_LASER.speed * 60,
        rapid: GameConstants.WEAPONS.RAPID_LASER.speed * 60,
        plasma: GameConstants.WEAPONS.PLASMA_CANNON.speed * 60
    }
};

export default GameConstants;
