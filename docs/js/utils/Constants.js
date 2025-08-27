/**
 * Constants - Game configuration and magic numbers
 * Centralizes all constants to eliminate magic numbers throughout the codebase
 */

export const GameConstants = {
    META: {
        VERSION: 'c1e2bfd-dirty+2025-08-27'
    },
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
        GRAVITY: 0.0001,           // Minimal gravity for atmosphere effects
        TURN_SPEED: 0.025,         // Player turn speed (radians per frame)
        ASTEROID_IMPACT_DAMAGE_MULT: 3, // Damage multiplier for ship-asteroid impacts
        MIN_COLLISION_DAMAGE: 5,   // Minimum collision damage
        BOUNCE_FORCE_BASE: 0.5,    // Base bounce impulse on impact
        BOUNCE_FORCE_SPEED_MULT: 0.3, // Speed-scaled bounce impulse multiplier
        SCREEN_SHAKE_DECAY: 0.8,     // Default decay factor per frame
        DAMAGE_FLASH_INITIAL: 1.0,   // Initial red damage flash value
        DAMAGE_FLASH_DECAY: 0.05,    // Per-frame decay of damage flash
        DAMAGE_FLASH_ALPHA_MULT: 0.3, // Alpha multiplier for damage flash overlay
        // Warnings/thresholds
        HEAVY_COLLISION_DAMAGE_WARN: 30, // UI warning threshold for heavy collisions
        // Landing
        LANDING_CLEAR_DISTANCE: 100 // Additional distance beyond planet radius to clear before takeoff
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
        LANDING_POS_OFFSET: 40,    // Placement offset from planet surface on land
        LANDING_COOLDOWN: 60,      // Frames between landing attempts
        RESPAWN_LANDING_COOLDOWN: 30, // Cooldown frames right after respawn
        DESTRUCT_SEQUENCE_MS: 600, // Duration of pre-explosion destruct sequence
        RESPAWN_SHIELD_FRACTION: 0.5, // Fraction of max shield on respawn
        DEATH_PENALTY: 100         // Credits lost on death
        ,
        // Thrust/brake tuning
        BRAKE_THRUST_MULT: 1.0,    // Retro-thrust relative to ship.thrust while braking
        BRAKE_FUEL_COST: 0.1       // Fuel consumed per frame while braking
        ,
        // Visual scale multipliers for NPC ship types (sprites and vectors)
        TYPE_SPRITE_SCALE: {
            freighter: 1.6,
            trader: 1.5,
            patrol: 1.4,
            pirate: 1.35,
            interceptor: 1.4
        },
        // Optional standardized classes and nominal sizes (scaffolding)
        CLASSES: {
            SIZES: { XS: 8, S: 10, M: 12, L: 14, XL: 18 },
            TYPE_CLASS: {
                freighter: 'XL',
                trader: 'M',
                patrol: 'L',
                pirate: 'S',
                interceptor: 'L'
            }
        }
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
            cooldown: 28,
            speed: 1.9,
            color: '#00ffff'
        },
        
        PROJECTILE_LIFETIME: 60,   // Frames before projectile expires (laser/default)
        PROJECTILE_TRAIL_LENGTH: 5, // Length of projectile trail effect
        // Per-type projectile lifetime overrides (frames)
        PROJECTILE_LIFETIME_FRAMES: {
            laser: 60,
            rapid: 80,
            plasma: 140,
            mining: 100
        },
        // Recoil/bloom tuning
        RECOIL_BLOOM: {
            MAX: 6.0,               // Maximum dynamic bloom
            DECAY_PER_FRAME: 0.03,  // Bloom decay per frame
            ADD_PER_SHOT: {         // Bloom added per shot by type
                rapid: 0.4,
                plasma: 0.3,
                default: 0.25
            }
        }
    },

    // NPC configuration
    NPC: {
        MAX_SPAWN_COUNT: 12,       // Maximum NPCs in world
        MAX_NEARBY_COUNT: 5,       // Maximum NPCs near player
        SPAWN_DISTANCE_MIN: 400,   // Minimum spawn distance from player
        SPAWN_DISTANCE_MAX: 1200,  // Maximum spawn distance from player
        DESPAWN_DISTANCE: 3000,    // Distance at which NPCs despawn
        NEARBY_RADIUS: 1000,       // Distance considered "nearby" player
        
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
        HOSTILE_CRIMINAL_RATIO: 0.5,    // Pirate kill ratio for hostility

        // Engage distances (player/pirate/merchant interactions)
        REP_COMMS_NEAR_DIST: 450,
        PATROL_WARNING_DISTANCE: 1000,
        PATROL_FIRE_DISTANCE: 450,
        PATROL_FIRE_PIRATE_DISTANCE: 600,
        PATROL_PURSUIT_MSG_DISTANCE: 500,
        PIRATE_ENGAGE_DISTANCE: 800,
        PIRATE_TAUNT_DISTANCE: 400,
        PIRATE_BREAKOFF_DISTANCE: 800,
        PIRATE_NEAR_MERCHANT_DISTANCE: 400,
        PATROL_HELP_PLAYER_DISTANCE: 500,
        TRADER_FLEE_PLAYER_DISTANCE: 300,
        TRADER_FLEE_HOSTILE_DISTANCE: 200,
        SCAVENGER_SCAN_DISTANCE: 900,

        // Message cooldowns (ms)
        HAIL_COOLDOWN_MS: 9000,
        TAUNT_COOLDOWN_MS: 8000,
        PURSUIT_MSG_COOLDOWN_MS: 6000,
        HOSTILE_MSG_COOLDOWN_MS: 5000,
        PANIC_COOLDOWN_MS: 4000,
        PIRATE_PANIC_COOLDOWN_MS: 5000,
        ASSIST_MSG_COOLDOWN_MS: 6000,

        // Distress beacons
        DISTRESS_RESPOND_RANGE: 1600,
        DISTRESS_RESPOND_DURATION_MS: 6000,
        DISTRESS_THROTTLE_MS: 6000,

        // Pursuit/stand down
        PURSUIT_TIMEOUT: 300,           // Frames before giving up pursuit
        PURSUIT_TIMEOUT_BREAK_CHANCE: 0.1,
        PIRATE_BREAKOFF_CHANCE: 0.05,
        PATROL_STAND_DOWN_RESET_MS: 2000
    },

    // World generation
    WORLD: {
        ASTEROID_COUNT: 50,
        ASTEROID_SIZE_MIN: 2,
        ASTEROID_SIZE_MAX: 10,
        ASTEROID_HEALTH: 20,
        ASTEROID_ORE_CONTENT_MAX: 3,
        ASTEROID_WORLD_SIZE: 4000,     // World boundaries for asteroids
        
        // Asteroid tiers, fragmentation, and ore yields
        ASTEROIDS: {
            // Tier thresholds by radius
            THRESHOLDS: {
                LARGE_MIN_RADIUS: 8,
                MEDIUM_MIN_RADIUS: 5
            },
            // Number of children spawned when breaking by tier
            CHILD_COUNTS: {
                large: 3,
                medium: 2,
                small: 0
            },
            // Size shrink factor applied to child fragments
            FRAGMENT_SHRINK: 0.55,
            // Ore yields per destruction by tier
            ORE_YIELDS: {
                large: 2,
                medium: 1,
                small: 1
            }
        },
        
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
        // Visual pulse speed for pickups (used in RenderSystem.renderPickups)
        // Tuned to match current behavior
        PICKUP_PULSE_SPEED: 0.008,
        
        // Pickup visual tuning (sizes, glitter cadence)
        PICKUPS: {
            // Shared twinkle cadence
            TWINKLE_SPEED: 0.02,    // Multiplier for time-based glitter
            TWINKLE_POS_MIX: 0.01,  // Position-based phase mix
            // Per-type visuals
            ORE: {
                CORE_RADIUS: 2,
                GLOW_RADIUS: 5,
                GLITTER_HALF: 3,      // Half-length of glitter cross arms
                GLITTER_ALPHA: 0.6,   // Base alpha scale for glitter
                GLITTER_LINE_WIDTH: 0.8
            },
            CREDITS: {
                CORE_RADIUS: 2,
                GLOW_RADIUS: 5
            }
        },
        
        TRAIL_ALPHA: 0.7,
        GLOW_RADIUS: 15,
        
        // Film grain effect
        FILM_GRAIN_OPACITY: 0.15,
        FILM_GRAIN_ANIMATION_SPEED: 8, // seconds
        // Muzzle flashes
        MUZZLE_FLASH_MAX_LIFETIME_FRAMES: 6,
        MUZZLE_FLASH_SOFT_CAP: 40,

        // Debris tuning (asteroid break and impact debris)
        DEBRIS: {
            SHARDS: {
                COUNT_MIN: 6,
                COUNT_MAX: 11,          // inclusive
                SPEED_MIN: 0.6,
                SPEED_MAX: 1.8,
                SIZE_MIN: 1,
                SIZE_MAX: 3,
                ROT_SPEED_RANGE: 0.15,  // ± range for angular velocity
                LIFETIME_MIN: 50,
                LIFETIME_RANGE: 30
            },
            CHUNKS: {
                COUNT_MIN: 3,
                COUNT_MAX: 6,           // inclusive
                SPEED_MIN: 0.4,
                SPEED_MAX: 1.4,
                SIZE_MIN: 2,
                SIZE_MAX: 4,
                ROT_SPEED_RANGE: 0.12,
                SIDES_MIN: 5,
                SIDES_RANGE: 3,
                LIFETIME_MIN: 80,
                LIFETIME_RANGE: 40
            },
            SLIVERS: {
                SPEED_MIN: 0.8,
                SPEED_MAX: 2.2,
                LIFETIME_MIN: 45,
                LIFETIME_RANGE: 25
            },
            POLISH: {
                // Applied only when window.VFX_DEBRIS_POLISH === true
                ENABLED: false,
                FADE_ALPHA_MAX: 0.9,
                WARM_G: { hi: 140, lo: 60 },
                WARM_B: { hi: 50, lo: 40 },
                WARM_R: 255
            }
        }
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
        NOTIF_SHIP_DESTROYED_MS: 5000, // Ship destroyed banner
        NOTIF_WEAPON_SWITCH_MS: 1000,  // Weapon switch popup
        NOTIF_REPUTATION_MS: 1200,     // Reputation change popup
        // Tiny console readout default duration
        CONSOLE_MESSAGE_MS: 1200,
        PLANET_NAME_OFFSET: 25,       // px above planet surface
        PLANET_DISTANCE_OFFSET: 10,   // px above planet surface for distance
        PLANET_NAME_SHADOW_BLUR: 8,   // blur radius when high quality
        // HUD speed readout cadence
        SPEED_READOUT_MS: 333,

        // Radio UI timings
        RADIO: {
            SCAN_ROLL_MS: 140,
            LOCK_MS: 1200,
            BUTTON_LOCK_MS: 1000,
            DIAL_STATIC_INTERVAL_MS: 120,
            DIAL_NOISE_ROLL_MS: 80
        },

        // Landing overlay image timeouts
        LANDSCAPE_FETCH_TIMEOUT_MS: 3500, // Lexica fetch timeout
        POLLINATIONS_TIMEOUT_MS: 12000,   // Per-attempt timeout for Pollinations
        
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
        },
        // Planet rendering mode and sprite settings (scaffolding; default procedural)
        PLANETS: {
            MODE: 'procedural', // 'procedural' | 'sprites'
            SPRITES: {
                MANIFEST_URL: './assets/planets.json'
            }
        }
    },

    // NPC settings
    NPC_SETTINGS: {
        DESTRUCT_SEQUENCE_MS: 450 // NPC pre-explosion sequence duration
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

    // TargetCam settings
    TARGET_CAM: {
        WARM_UP_MS: 450,            // Suppress atlas/baseline during warm-up
        FRAME_THROTTLE_MS: 33,      // Render throttle (~30 Hz)
        TRANSITION_DURATION_MS: 320,
        TRANSITION_HOLD_MS: 140,
        BLIP_DURATION_MS: 320,
        BUILD_MIN_INTERVAL_MS: 90,  // Silhouette rebuild minimum spacing
        ANGLE_EPS_RAD: 0.12,        // Angle epsilon for rebuild
        HEAVY_FRAME_MS: 24,         // Consider frames > this heavy
        IDLE_LIGHT_STREAK: 6,       // Required consecutive light frames before building
        IDLE_LIGHT_MS: 16,          // A light frame is <= this
        RETRY_BUILD_MS: 150         // Retry delay when skipping build
    },

    // Spawn settings
    SPAWN: {
        TYPE_COOLDOWN_MS: 6000,                 // Suppress same-type spawns after death
        PIRATE_SUPPRESS_MS: 4500,               // Suppress pirate spawns after any death
        POST_NPC_DEATH_PAUSE_MS: 2000,          // Pause spawning briefly after any NPC death
        POST_SHIP_DEATH_PAUSE_MS: 2500,         // Pause spawning after player death
        SHIP_DEATH_EXTRA_PIRATE_SUPPRESS_MS: 1500 // Additional pirate suppress after player death
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
