/**
 * Vector2D - 2D vector math utility class
 * Replaces repetitive vector calculations throughout the codebase
 */

export class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Create a new vector from existing vector
     * @param {Vector2D} vector - Vector to copy
     * @returns {Vector2D} New vector
     */
    static from(vector) {
        return new Vector2D(vector.x, vector.y);
    }

    /**
     * Create a vector from angle and magnitude
     * @param {number} angle - Angle in radians
     * @param {number} magnitude - Length of vector
     * @returns {Vector2D} New vector
     */
    static fromAngle(angle, magnitude = 1) {
        return new Vector2D(
            Math.cos(angle) * magnitude,
            Math.sin(angle) * magnitude
        );
    }

    /**
     * Create a zero vector
     * @returns {Vector2D} Zero vector
     */
    static zero() {
        return new Vector2D(0, 0);
    }

    /**
     * Add another vector to this vector
     * @param {Vector2D} vector - Vector to add
     * @returns {Vector2D} This vector (for chaining)
     */
    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    /**
     * Subtract another vector from this vector
     * @param {Vector2D} vector - Vector to subtract
     * @returns {Vector2D} This vector (for chaining)
     */
    subtract(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    /**
     * Multiply this vector by a scalar
     * @param {number} scalar - Number to multiply by
     * @returns {Vector2D} This vector (for chaining)
     */
    multiply(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /**
     * Divide this vector by a scalar
     * @param {number} scalar - Number to divide by
     * @returns {Vector2D} This vector (for chaining)
     */
    divide(scalar) {
        if (scalar !== 0) {
            this.x /= scalar;
            this.y /= scalar;
        }
        return this;
    }

    /**
     * Get the magnitude (length) of this vector
     * @returns {number} Magnitude
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Get the squared magnitude (faster than magnitude for comparisons)
     * @returns {number} Squared magnitude
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Normalize this vector (make magnitude = 1)
     * @returns {Vector2D} This vector (for chaining)
     */
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.divide(mag);
        }
        return this;
    }

    /**
     * Get the angle of this vector in radians
     * @returns {number} Angle in radians
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Get the distance to another vector
     * @param {Vector2D} vector - Other vector
     * @returns {number} Distance
     */
    distanceTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get the squared distance to another vector (faster for comparisons)
     * @param {Vector2D} vector - Other vector
     * @returns {number} Squared distance
     */
    distanceSquaredTo(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        return dx * dx + dy * dy;
    }

    /**
     * Get the dot product with another vector
     * @param {Vector2D} vector - Other vector
     * @returns {number} Dot product
     */
    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }

    /**
     * Get the cross product with another vector (2D cross is a scalar)
     * @param {Vector2D} vector - Other vector
     * @returns {number} Cross product
     */
    cross(vector) {
        return this.x * vector.y - this.y * vector.x;
    }

    /**
     * Limit the magnitude of this vector
     * @param {number} max - Maximum magnitude
     * @returns {Vector2D} This vector (for chaining)
     */
    limit(max) {
        const mag = this.magnitude();
        if (mag > max) {
            this.normalize().multiply(max);
        }
        return this;
    }

    /**
     * Set the magnitude of this vector
     * @param {number} magnitude - New magnitude
     * @returns {Vector2D} This vector (for chaining)
     */
    setMagnitude(magnitude) {
        return this.normalize().multiply(magnitude);
    }

    /**
     * Rotate this vector by an angle
     * @param {number} angle - Angle in radians
     * @returns {Vector2D} This vector (for chaining)
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const newX = this.x * cos - this.y * sin;
        const newY = this.x * sin + this.y * cos;
        this.x = newX;
        this.y = newY;
        return this;
    }

    /**
     * Linear interpolation towards another vector
     * @param {Vector2D} vector - Target vector
     * @param {number} amount - Interpolation amount (0-1)
     * @returns {Vector2D} This vector (for chaining)
     */
    lerp(vector, amount) {
        this.x += (vector.x - this.x) * amount;
        this.y += (vector.y - this.y) * amount;
        return this;
    }

    /**
     * Create a copy of this vector
     * @returns {Vector2D} New vector with same values
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }

    /**
     * Set the values of this vector
     * @param {number} x - X component
     * @param {number} y - Y component
     * @returns {Vector2D} This vector (for chaining)
     */
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * Copy values from another vector
     * @param {Vector2D} vector - Vector to copy from
     * @returns {Vector2D} This vector (for chaining)
     */
    copy(vector) {
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    /**
     * Check if this vector equals another vector
     * @param {Vector2D} vector - Vector to compare
     * @param {number} tolerance - Tolerance for floating point comparison
     * @returns {boolean} True if vectors are equal
     */
    equals(vector, tolerance = 0.001) {
        return Math.abs(this.x - vector.x) < tolerance && 
               Math.abs(this.y - vector.y) < tolerance;
    }

    /**
     * Reset this vector to zero
     * @returns {Vector2D} This vector (for chaining)
     */
    zero() {
        this.x = 0;
        this.y = 0;
        return this;
    }

    /**
     * Get a string representation of this vector
     * @returns {string} String representation
     */
    toString() {
        return `Vector2D(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    /**
     * Convert to plain object
     * @returns {object} Plain object with x, y properties
     */
    toObject() {
        return { x: this.x, y: this.y };
    }
}

/**
 * Static utility methods for vector operations
 */
Vector2D.add = function(a, b) {
    return new Vector2D(a.x + b.x, a.y + b.y);
};

Vector2D.subtract = function(a, b) {
    return new Vector2D(a.x - b.x, a.y - b.y);
};

Vector2D.multiply = function(vector, scalar) {
    return new Vector2D(vector.x * scalar, vector.y * scalar);
};

Vector2D.distance = function(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

Vector2D.distanceSquared = function(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
};

Vector2D.dot = function(a, b) {
    return a.x * b.x + a.y * b.y;
};

Vector2D.cross = function(a, b) {
    return a.x * b.y - a.y * b.x;
};

Vector2D.lerp = function(a, b, amount) {
    return new Vector2D(
        a.x + (b.x - a.x) * amount,
        a.y + (b.y - a.y) * amount
    );
};
