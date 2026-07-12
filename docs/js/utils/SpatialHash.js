/**
 * SpatialHash - Grid-based spatial partitioning for efficient proximity queries
 * Reduces O(n²) collision/proximity checks to approximately O(n)
 */
export class SpatialHash {
    /**
     * @param {number} cellSize - Size of each grid cell (default 200px)
     */
    constructor(cellSize = 200) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this._entityCells = new Map(); // Track which cells an entity is in
    }

    /**
     * Get the cell key for a position
     * @private
     */
    _getCellKey(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    /**
     * Clear all entities from the hash
     */
    clear() {
        this.cells.clear();
        this._entityCells.clear();
    }

    /**
     * Insert an entity into the spatial hash
     * @param {Object} entity - Entity with x, y properties
     */
    insert(entity) {
        if (entity == null || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
            return;
        }

        const key = this._getCellKey(entity.x, entity.y);

        if (!this.cells.has(key)) {
            this.cells.set(key, new Set());
        }
        this.cells.get(key).add(entity);

        // Track cell for fast removal
        this._entityCells.set(entity, key);
    }

    /**
     * Remove an entity from the spatial hash
     * @param {Object} entity - Entity to remove
     */
    remove(entity) {
        const key = this._entityCells.get(entity);
        if (key) {
            const cell = this.cells.get(key);
            if (cell) {
                cell.delete(entity);
                if (cell.size === 0) {
                    this.cells.delete(key);
                }
            }
            this._entityCells.delete(entity);
        }
    }

    /**
     * Update entity position (remove and re-insert if cell changed)
     * @param {Object} entity - Entity to update
     */
    update(entity) {
        if (entity == null || typeof entity.x !== 'number' || typeof entity.y !== 'number') {
            return;
        }

        const oldKey = this._entityCells.get(entity);
        const newKey = this._getCellKey(entity.x, entity.y);

        if (oldKey !== newKey) {
            this.remove(entity);
            this.insert(entity);
        }
    }

    /**
     * Query entities near a point within a given radius
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @returns {Array} Array of entities within the radius
     */
    queryNear(x, y, radius) {
        const results = [];
        const radiusSq = radius * radius;

        // Calculate cell range to check
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);

        // Check each cell in range
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (!cell) continue;

                for (const entity of cell) {
                    const dx = entity.x - x;
                    const dy = entity.y - y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        results.push(entity);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Query entities near a point, filtered by a predicate
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @param {Function} predicate - Filter function (entity) => boolean
     * @returns {Array} Filtered array of nearby entities
     */
    queryNearFiltered(x, y, radius, predicate) {
        const results = [];
        const radiusSq = radius * radius;

        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (!cell) continue;

                for (const entity of cell) {
                    if (!predicate(entity)) continue;
                    const dx = entity.x - x;
                    const dy = entity.y - y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        results.push(entity);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Find the nearest entity to a point, optionally filtered
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} maxRadius - Maximum search radius
     * @param {Function} [predicate] - Optional filter function
     * @returns {{entity: Object, distSq: number}|null} Nearest entity and squared distance
     */
    findNearest(x, y, maxRadius, predicate) {
        let nearest = null;
        let nearestDistSq = maxRadius * maxRadius;

        const minCx = Math.floor((x - maxRadius) / this.cellSize);
        const maxCx = Math.floor((x + maxRadius) / this.cellSize);
        const minCy = Math.floor((y - maxRadius) / this.cellSize);
        const maxCy = Math.floor((y + maxRadius) / this.cellSize);

        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (!cell) continue;

                for (const entity of cell) {
                    if (predicate && !predicate(entity)) continue;
                    const dx = entity.x - x;
                    const dy = entity.y - y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < nearestDistSq) {
                        nearestDistSq = distSq;
                        nearest = entity;
                    }
                }
            }
        }

        return nearest ? { entity: nearest, distSq: nearestDistSq } : null;
    }

    /**
     * Bulk insert multiple entities
     * @param {Array} entities - Array of entities to insert
     */
    insertAll(entities) {
        for (const entity of entities) {
            this.insert(entity);
        }
    }

    /**
     * Rebuild the hash from a list of entities
     * More efficient than individual updates when most entities moved
     * @param {Array} entities - Array of all entities
     */
    rebuild(entities) {
        this.clear();
        this.insertAll(entities);
    }

    /**
     * Get count of entities in the hash
     * @returns {number}
     */
    get size() {
        return this._entityCells.size;
    }
}

export default SpatialHash;
