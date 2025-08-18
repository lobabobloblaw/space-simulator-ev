/**
 * CollisionUtils - Collision detection utilities
 * Centralizes collision detection methods used throughout the game
 */

import { Vector2D } from './Vector2D.js';
import { MathUtils } from './MathUtils.js';

export class CollisionUtils {
    /**
     * Check collision between two circles
     * @param {object} circle1 - First circle {x, y, radius}
     * @param {object} circle2 - Second circle {x, y, radius}
     * @returns {boolean} True if circles collide
     */
    static circleCircle(circle1, circle2) {
        const dx = circle1.x - circle2.x;
        const dy = circle1.y - circle2.y;
        const radiusSum = circle1.radius + circle2.radius;
        return (dx * dx + dy * dy) <= (radiusSum * radiusSum);
    }

    /**
     * Check collision between a point and a circle
     * @param {object} point - Point {x, y}
     * @param {object} circle - Circle {x, y, radius}
     * @returns {boolean} True if point is inside circle
     */
    static pointCircle(point, circle) {
        const dx = point.x - circle.x;
        const dy = point.y - circle.y;
        return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
    }

    /**
     * Check collision between a point and a rectangle
     * @param {object} point - Point {x, y}
     * @param {object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if point is inside rectangle
     */
    static pointRect(point, rect) {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width &&
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }

    /**
     * Check collision between two rectangles
     * @param {object} rect1 - First rectangle {x, y, width, height}
     * @param {object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if rectangles overlap
     */
    static rectRect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    /**
     * Check collision between a circle and a rectangle
     * @param {object} circle - Circle {x, y, radius}
     * @param {object} rect - Rectangle {x, y, width, height}
     * @returns {boolean} True if circle and rectangle overlap
     */
    static circleRect(circle, rect) {
        // Find closest point on rectangle to circle center
        const closestX = MathUtils.clamp(circle.x, rect.x, rect.x + rect.width);
        const closestY = MathUtils.clamp(circle.y, rect.y, rect.y + rect.height);
        
        // Check if closest point is within circle radius
        const dx = circle.x - closestX;
        const dy = circle.y - closestY;
        return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
    }

    /**
     * Check if a point is on a line segment
     * @param {object} point - Point {x, y}
     * @param {object} line - Line segment {x1, y1, x2, y2}
     * @param {number} threshold - Distance threshold
     * @returns {boolean} True if point is on line
     */
    static pointLine(point, line, threshold = 1) {
        // Calculate distance from point to line segment
        const A = point.x - line.x1;
        const B = point.y - line.y1;
        const C = line.x2 - line.x1;
        const D = line.y2 - line.y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // Line is a point
            return MathUtils.distance(point.x, point.y, line.x1, line.y1) <= threshold;
        }
        
        const param = dot / lenSq;
        let xx, yy;
        
        if (param < 0) {
            xx = line.x1;
            yy = line.y1;
        } else if (param > 1) {
            xx = line.x2;
            yy = line.y2;
        } else {
            xx = line.x1 + param * C;
            yy = line.y1 + param * D;
        }
        
        return MathUtils.distance(point.x, point.y, xx, yy) <= threshold;
    }

    /**
     * Check collision between two line segments
     * @param {object} line1 - First line {x1, y1, x2, y2}
     * @param {object} line2 - Second line {x1, y1, x2, y2}
     * @returns {boolean} True if lines intersect
     */
    static lineLine(line1, line2) {
        const x1 = line1.x1, y1 = line1.y1, x2 = line1.x2, y2 = line1.y2;
        const x3 = line2.x1, y3 = line2.y1, x4 = line2.x2, y4 = line2.y2;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (denom === 0) return false; // Parallel lines
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
        
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    /**
     * Check collision between a circle and a line segment
     * @param {object} circle - Circle {x, y, radius}
     * @param {object} line - Line segment {x1, y1, x2, y2}
     * @returns {boolean} True if circle intersects line
     */
    static circleLine(circle, line) {
        return this.pointLine(circle, line, circle.radius);
    }

    /**
     * Get collision information between two circles
     * @param {object} circle1 - First circle {x, y, radius}
     * @param {object} circle2 - Second circle {x, y, radius}
     * @returns {object|null} Collision info or null if no collision
     */
    static circleCircleInfo(circle1, circle2) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radiusSum = circle1.radius + circle2.radius;
        
        if (distance > radiusSum) {
            return null; // No collision
        }
        
        const overlap = radiusSum - distance;
        const normalX = distance > 0 ? dx / distance : 1;
        const normalY = distance > 0 ? dy / distance : 0;
        
        return {
            overlap: overlap,
            normal: { x: normalX, y: normalY },
            distance: distance,
            contactPoint: {
                x: circle1.x + normalX * circle1.radius,
                y: circle1.y + normalY * circle1.radius
            }
        };
    }

    /**
     * Check if a moving circle will collide with a stationary circle
     * @param {object} moving - Moving circle {x, y, vx, vy, radius}
     * @param {object} stationary - Stationary circle {x, y, radius}
     * @param {number} deltaTime - Time step
     * @returns {object|null} Collision time and info, or null
     */
    static movingCircleCircle(moving, stationary, deltaTime) {
        // Relative velocity
        const vx = moving.vx;
        const vy = moving.vy;
        
        // Relative position
        const dx = moving.x - stationary.x;
        const dy = moving.y - stationary.y;
        
        // Quadratic formula coefficients for collision time
        const a = vx * vx + vy * vy;
        const b = 2 * (dx * vx + dy * vy);
        const radiusSum = moving.radius + stationary.radius;
        const c = dx * dx + dy * dy - radiusSum * radiusSum;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0 || a === 0) {
            return null; // No collision
        }
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        // We want the earliest positive collision time within our time step
        let collisionTime = null;
        if (t1 >= 0 && t1 <= deltaTime) {
            collisionTime = t1;
        } else if (t2 >= 0 && t2 <= deltaTime) {
            collisionTime = t2;
        }
        
        if (collisionTime === null) {
            return null;
        }
        
        // Calculate collision point
        const collisionX = moving.x + vx * collisionTime;
        const collisionY = moving.y + vy * collisionTime;
        
        const finalDx = collisionX - stationary.x;
        const finalDy = collisionY - stationary.y;
        const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
        
        return {
            time: collisionTime,
            normal: {
                x: finalDistance > 0 ? finalDx / finalDistance : 1,
                y: finalDistance > 0 ? finalDy / finalDistance : 0
            },
            contactPoint: {
                x: collisionX,
                y: collisionY
            }
        };
    }

    /**
     * Resolve collision between two circles with elastic collision
     * @param {object} circle1 - First circle {x, y, vx, vy, mass}
     * @param {object} circle2 - Second circle {x, y, vx, vy, mass}
     * @param {number} restitution - Bounce factor (0-1)
     */
    static resolveCircleCollision(circle1, circle2, restitution = 0.8) {
        const dx = circle2.x - circle1.x;
        const dy = circle2.y - circle1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Avoid division by zero
        
        // Normal vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Relative velocity
        const dvx = circle2.vx - circle1.vx;
        const dvy = circle2.vy - circle1.vy;
        
        // Relative velocity along normal
        const dvn = dvx * nx + dvy * ny;
        
        // Don't resolve if objects are separating
        if (dvn > 0) return;
        
        // Collision impulse
        const impulse = 2 * dvn / (circle1.mass + circle2.mass);
        
        // Update velocities
        circle1.vx += impulse * circle2.mass * nx * restitution;
        circle1.vy += impulse * circle2.mass * ny * restitution;
        circle2.vx -= impulse * circle1.mass * nx * restitution;
        circle2.vy -= impulse * circle1.mass * ny * restitution;
    }

    /**
     * Get closest point on a line segment to a point
     * @param {object} point - Point {x, y}
     * @param {object} line - Line segment {x1, y1, x2, y2}
     * @returns {object} Closest point {x, y}
     */
    static closestPointOnLine(point, line) {
        const A = point.x - line.x1;
        const B = point.y - line.y1;
        const C = line.x2 - line.x1;
        const D = line.y2 - line.y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            return { x: line.x1, y: line.y1 };
        }
        
        const param = MathUtils.clamp(dot / lenSq, 0, 1);
        
        return {
            x: line.x1 + param * C,
            y: line.y1 + param * D
        };
    }

    /**
     * Check if a ray intersects a circle
     * @param {object} ray - Ray {x, y, dx, dy}
     * @param {object} circle - Circle {x, y, radius}
     * @param {number} maxDistance - Maximum ray distance
     * @returns {object|null} Intersection info or null
     */
    static rayCircle(ray, circle, maxDistance = Infinity) {
        const dx = ray.x - circle.x;
        const dy = ray.y - circle.y;
        
        const a = ray.dx * ray.dx + ray.dy * ray.dy;
        const b = 2 * (dx * ray.dx + dy * ray.dy);
        const c = dx * dx + dy * dy - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        let t = null;
        if (t1 >= 0 && t1 <= maxDistance) {
            t = t1;
        } else if (t2 >= 0 && t2 <= maxDistance) {
            t = t2;
        }
        
        if (t === null) return null;
        
        const hitX = ray.x + ray.dx * t;
        const hitY = ray.y + ray.dy * t;
        
        return {
            distance: t,
            point: { x: hitX, y: hitY },
            normal: {
                x: (hitX - circle.x) / circle.radius,
                y: (hitY - circle.y) / circle.radius
            }
        };
    }

    /**
     * Create a bounding box for a rotated rectangle
     * @param {object} rect - Rectangle {x, y, width, height, angle}
     * @returns {object} Bounding box {x, y, width, height}
     */
    static getRotatedRectBounds(rect) {
        const cos = Math.cos(rect.angle);
        const sin = Math.sin(rect.angle);
        
        const corners = [
            { x: 0, y: 0 },
            { x: rect.width, y: 0 },
            { x: rect.width, y: rect.height },
            { x: 0, y: rect.height }
        ];
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const corner of corners) {
            const rotatedX = corner.x * cos - corner.y * sin + rect.x;
            const rotatedY = corner.x * sin + corner.y * cos + rect.y;
            
            minX = Math.min(minX, rotatedX);
            maxX = Math.max(maxX, rotatedX);
            minY = Math.min(minY, rotatedY);
            maxY = Math.max(maxY, rotatedY);
        }
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
}
