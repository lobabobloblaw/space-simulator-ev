/**
 * MathUtils - Common math utility functions
 * Centralizes math operations used throughout the game
 */

export class MathUtils {
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Inverse linear interpolation - find t for a value between a and b
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} value - Value to find t for
     * @returns {number} Interpolation factor
     */
    static inverseLerp(a, b, value) {
        return (value - a) / (b - a);
    }

    /**
     * Map a value from one range to another
     * @param {number} value - Value to map
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    static map(value, inMin, inMax, outMin, outMax) {
        return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
    }

    /**
     * Normalize an angle to be between -PI and PI
     * @param {number} angle - Angle in radians
     * @returns {number} Normalized angle
     */
    static normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    /**
     * Get the shortest angle between two angles
     * @param {number} from - Starting angle
     * @param {number} to - Target angle
     * @returns {number} Shortest angle difference
     */
    static angleDifference(from, to) {
        let diff = to - from;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    /**
     * Smoothly approach a target angle
     * @param {number} current - Current angle
     * @param {number} target - Target angle
     * @param {number} speed - Approach speed
     * @param {number} deltaTime - Time step
     * @returns {number} New angle
     */
    static approachAngle(current, target, speed, deltaTime) {
        const diff = this.angleDifference(current, target);
        const maxDelta = speed * deltaTime;
        
        if (Math.abs(diff) <= maxDelta) {
            return target;
        }
        
        return current + Math.sign(diff) * maxDelta;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} Radians
     */
    static degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees
     * @param {number} radians - Radians
     * @returns {number} Degrees
     */
    static radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * Get a random number between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    static random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    }

    /**
     * Get a random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    static randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }

    /**
     * Choose a random element from an array
     * @param {array} array - Array to choose from
     * @returns {*} Random element
     */
    static choose(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Get a random boolean with given probability
     * @param {number} probability - Probability of true (0-1)
     * @returns {boolean} Random boolean
     */
    static chance(probability = 0.5) {
        return Math.random() < probability;
    }

    /**
     * Get a random value from a weighted array
     * @param {array} weights - Array of weights
     * @returns {number} Index of chosen weight
     */
    static weightedRandom(weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return i;
            }
        }
        
        return weights.length - 1;
    }

    /**
     * Smooth step interpolation (ease in/out)
     * @param {number} t - Input value (0-1)
     * @returns {number} Smoothed value
     */
    static smoothStep(t) {
        return t * t * (3 - 2 * t);
    }

    /**
     * Smoother step interpolation (more ease)
     * @param {number} t - Input value (0-1)
     * @returns {number} Smoothed value
     */
    static smootherStep(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Ease in interpolation
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    static easeIn(t) {
        return t * t;
    }

    /**
     * Ease out interpolation
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    static easeOut(t) {
        return 1 - Math.pow(1 - t, 2);
    }

    /**
     * Ease in-out interpolation
     * @param {number} t - Input value (0-1)
     * @returns {number} Eased value
     */
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * Round to nearest multiple
     * @param {number} value - Value to round
     * @param {number} multiple - Multiple to round to
     * @returns {number} Rounded value
     */
    static roundToMultiple(value, multiple) {
        return Math.round(value / multiple) * multiple;
    }

    /**
     * Check if a number is approximately equal to another
     * @param {number} a - First number
     * @param {number} b - Second number
     * @param {number} epsilon - Tolerance
     * @returns {boolean} True if approximately equal
     */
    static approximately(a, b, epsilon = 0.001) {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * Get the sign of a number (-1, 0, or 1)
     * @param {number} value - Number to get sign of
     * @returns {number} Sign of the number
     */
    static sign(value) {
        return value > 0 ? 1 : value < 0 ? -1 : 0;
    }

    /**
     * Wrap a value around a range
     * @param {number} value - Value to wrap
     * @param {number} min - Range minimum
     * @param {number} max - Range maximum
     * @returns {number} Wrapped value
     */
    static wrap(value, min, max) {
        const range = max - min;
        if (range <= 0) return min;
        
        while (value < min) value += range;
        while (value > max) value -= range;
        return value;
    }

    /**
     * Get the fractional part of a number
     * @param {number} value - Number
     * @returns {number} Fractional part
     */
    static fract(value) {
        return value - Math.floor(value);
    }

    /**
     * Simple 1D Perlin-like noise function
     * @param {number} x - Input value
     * @returns {number} Noise value (-1 to 1)
     */
    static noise1D(x) {
        x = Math.sin(x * 12.9898) * 43758.5453;
        return 2 * (x - Math.floor(x)) - 1;
    }

    /**
     * Simple 2D Perlin-like noise function
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    static noise2D(x, y) {
        const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return 2 * (value - Math.floor(value)) - 1;
    }

    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Distance
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate squared distance (faster for comparisons)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Squared distance
     */
    static distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /**
     * Calculate angle between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Angle in radians
     */
    static angleBetween(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Check if a point is inside a circle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} cx - Circle center X
     * @param {number} cy - Circle center Y
     * @param {number} radius - Circle radius
     * @returns {boolean} True if point is inside circle
     */
    static pointInCircle(px, py, cx, cy, radius) {
        return this.distanceSquared(px, py, cx, cy) <= radius * radius;
    }

    /**
     * Check if a point is inside a rectangle
     * @param {number} px - Point X
     * @param {number} py - Point Y
     * @param {number} rx - Rectangle X
     * @param {number} ry - Rectangle Y
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     * @returns {boolean} True if point is inside rectangle
     */
    static pointInRect(px, py, rx, ry, width, height) {
        return px >= rx && px <= rx + width && py >= ry && py <= ry + height;
    }
}

// Math constants
MathUtils.PI = Math.PI;
MathUtils.TWO_PI = Math.PI * 2;
MathUtils.HALF_PI = Math.PI / 2;
MathUtils.QUARTER_PI = Math.PI / 4;
MathUtils.DEG_TO_RAD = Math.PI / 180;
MathUtils.RAD_TO_DEG = 180 / Math.PI;
