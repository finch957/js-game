export class Coord {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    getDistanceTo(other) {
        const dx = Math.abs(this.x - other.x);
        const dy = Math.abs(this.y - other.y);
        return dx + dy;
    }

    toKey() {
        return `${this.x},${this.y}`;
    }

    static fromKey(key) {
        const [x, y] = key.split(',').map(Number);
        return new Coord(x, y);
    }

    static lerp(a, b, t) {
        return new Coord(
            a.x + (b.x - a.x) * t,
            a.y + (b.y - a.y) * t
        );
    }

    equals(other) {
        return this.x === other.x && this.y === other.y;
    }

    add(other) {
        return new Coord(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        return new Coord(this.x - other.x, this.y - other.y);
    }

    negate() {
        return new Coord(-this.x, -this.y);
    }
}

export class PriorityQueue {
    constructor() {
        this.elements = [];
    }

    enqueue(item, priority) {
        this.elements.push({ item, priority });
        this.elements.sort((a, b) => a.priority - b.priority);
    }

    dequeue() {
        return this.elements.shift().item;
    }

    isEmpty() {
        return this.elements.length === 0;
    }
}

export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function weightedRandom(weightedMap) {
    let totalWeight = 0;
    for (const weight of weightedMap.values()) {
        if (weight > 0) {
            totalWeight += weight;
        }
    }

    let random = Math.random() * totalWeight;

    for (const [value, weight] of weightedMap.entries()) {
        if (weight <= 0) continue;
        if (random < weight) return value;
        random -= weight;
    }
    return Array.from(weightedMap.keys())[0];
}