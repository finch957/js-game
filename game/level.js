import { Tile } from './tile.js';
import { Coord, PriorityQueue, shuffleArray } from '../core/utils.js';
import { Structure } from './structure.js';
import { Mob } from './mob.js';
import { Item } from './item.js';
import { MIN_ROOM_SIZE } from '../core/constants.js';
import { Particle } from '../ui/particle-manager.js';

export class Level {
    #width;
    #height;
    #index;
    #tick = 0;

    #entryPoint;
    #exitPoint;

    #tileLayer;
    #structureLayer;
    #rooms = [];
    #bspDivisions;

    #player;
    #mobs = [];
    #items = new Map;

    constructor(width, height, player, index, addParticleCallback) {
        this.#width = width;
        this.#height = height;
        this.#player = player;
        this.#index = index;
        this.addParticle = addParticleCallback;

        this.#tileLayer = Array.from({ length: this.#height }, () =>
            Array.from({ length: this.#width }, () => null)
        );

        this.#structureLayer = Array.from({ length: this.#height }, () =>
            Array.from({ length: this.#width }, () => null)
        );

        this.#bspDivisions = index == 0 ? 2 : index < 8 ? 3 : Math.floor(Math.log2(index)) + 1;
        const bspRoot = this.#generateBSPMap(0, 0, width, height, this.#bspDivisions);
        this.#connectSubtreeRooms(bspRoot);

        this.#placeLadders();
        this.#decorateLevel();
        this.#spawnMobs();
    }

    incrementTick() {
        this.#tick++;

        const mobs = this.getMobs();
        shuffleArray(mobs);

        let reserved = new Set;

        for (const mob of mobs) {
            mob.update(this, this.#player, reserved);
        }
    }

    getCurrentTick() {
        return this.#tick;
    }

    getLevelNumber() {
        return this.#index;
    }

    getWidth() {
        return this.#width;
    }

    getHeight() {
        return this.#height;
    }

    getEntryPoint() {
        return this.#entryPoint;
    }

    getExitPoint() {
        return this.#exitPoint;
    }

    getRandomRoom() {
        return this.#rooms[Math.floor(Math.random() * this.#rooms.length)];
    }

    getRandomCoordInRoom(room, padding = 1) {
        const x = room.coord.x + padding + Math.floor(Math.random() * (room.width - padding * 2));
        const y = room.coord.y + padding + Math.floor(Math.random() * (room.height - padding * 2));
        return new Coord(x, y);
    }

    isInBorders(coord) {
        return (
            coord.x >= 0 &&
            coord.y >= 0 &&
            coord.x < this.#width &&
            coord.y < this.#height
        );
    }

    isWalkable(coord) {
        if (!this.isInBorders(coord)) return false;

        const tile = this.getTile(coord);
        const structure = this.getStructure(coord);
        if (!tile || !tile.isWalkable() || (structure && !structure.isWalkable())) return false;

        return true;
    }

//#region level generation

    #spawnMobs() {
        const rat_count = Math.floor(this.#index / 5) + (this.#bspDivisions - 1) * 2;
        for (let i = 0; i < rat_count; i++) {
            let coord = null;
            while (!coord) {
                const candidate = this.getRandomCoordInRoom(this.getRandomRoom());
                if (this.isWalkable(candidate) && !this.getEntityAt(candidate)) {
                    coord = candidate;
                }
            }
            this.addMob(coord, 'rat');
        }

        const gelatine_count = Math.floor(Math.max(Math.random(), 0.5) * this.#index / 3);
        for (let i = 0; i < gelatine_count; i++) {
            let coord = null;
            while (!coord) {
                const candidate = this.getRandomCoordInRoom(this.getRandomRoom());
                if (this.isWalkable(candidate) && !this.getEntityAt(candidate)) {
                    coord = candidate;
                }
            }
            this.addMob(coord, 'gelatine');
        }

        const mimic_count = Math.round(Math.random() * (this.#bspDivisions - 2) * Math.ceil(Math.log2(this.#index + 1)));
        for (let i = 0; i < mimic_count; i++) {
            let coord = null;
            while (!coord) {
                const candidate = this.getRandomCoordInRoom(this.getRandomRoom());
                if (this.getTile(candidate).isWalkable() && !this.getStructure(candidate) && !this.getEntityAt(candidate)) {
                    coord = candidate;
                }
            }
            this.setStructure(coord, new Structure('fake-chest'));
        }
    }

    #placeLadders() {
        let upRoom = null;
        let downRoom = null;

        while (!downRoom || upRoom === downRoom) {
            upRoom = this.getRandomRoom();
            downRoom = this.getRandomRoom();
        }

        const upCoord = this.getRandomCoordInRoom(upRoom, 2);
        const downCoord = this.getRandomCoordInRoom(downRoom, 2);

        this.setStructure(upCoord, new Structure('ladder-up'));
        this.setStructure(downCoord, new Structure('ladder-down'));

        const neighborsUp = this.#getNeighbors(upCoord);
        const randomNeighborUp = neighborsUp[Math.floor(Math.random() * neighborsUp.length)];

        const neighborsDown = this.#getNeighbors(downCoord);
        const randomNeighborDown = neighborsDown[Math.floor(Math.random() * neighborsDown.length)];

        this.#entryPoint = randomNeighborUp.coord;
        this.#exitPoint = randomNeighborDown.coord;
    }

    #decorateLevel() {
        for (const room of this.#rooms) {
            const area = room.width * room.height;
            let mossToPlace = Math.floor(Math.max(Math.random(), 0.5) * area * 0.1);
            while (mossToPlace > 0) {
                const coord = this.getRandomCoordInRoom(room);

                if (this.isWalkable(coord) && this.getStructure(coord) == null) {
                    this.setStructure(coord, new Structure('moss'));
                    mossToPlace--;
                }
            }
        }

        let trapsToPlace = this.#rooms.length * 2;
        while (trapsToPlace > 0) {
            const room = this.getRandomRoom();
            const coord = this.getRandomCoordInRoom(room);

            if (this.isWalkable(coord) && this.getStructure(coord) == null) {
                this.setStructure(coord, new Structure('trap-active'));
                trapsToPlace--;
            }
        }

        let chestsToPlace = Math.floor(this.#rooms.length / 3);
        while (chestsToPlace > 0) {
            let chestRooms = new Set();

            let candidate = null;
            while (true) {
                candidate = this.getRandomRoom();
                if (!chestRooms.has(candidate)) {
                    break;
                }
            }

            chestRooms.add(candidate);

            while (true) {
                const coord = this.getRandomCoordInRoom(candidate);
                if (this.isWalkable(coord) && this.getStructure(coord) == null) {
                    this.setStructure(coord, new Structure('chest'));
                    chestsToPlace--;
                    break;
                }
            }
        }
    }

    #generateBSPMap(x, y, width, height, depth) {
        const node = new BSPNode(x, y, width, height);

        if (depth == 0) {
            const room = this.#createRoom(x, y, width, height);
            node.room = room;
            this.#rooms.push(room);
            return node;
        }

        const aspectRatio = width / height;
        const horizontalSplit = aspectRatio < 0.8 || (aspectRatio < 1.2 && Math.random() < 0.5);

        if (horizontalSplit) {
            const split = this.#randomSplit(height);
            node.left = this.#generateBSPMap(x, y, width, split, depth - 1);
            node.right = this.#generateBSPMap(x, y + split, width, height - split, depth - 1);
        } else {
            const split = this.#randomSplit(width);
            node.left = this.#generateBSPMap(x, y, split, height, depth - 1);
            node.right = this.#generateBSPMap(x + split, y, width - split, height, depth - 1);
        }

        return node;
    }

    #randomSplit(size) {
        const min = Math.floor(size * 0.4);
        const max = Math.floor(size * 0.6);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    #createRoom(x, y, width, height) {
        const margin = 1;

        const maxRoomWidth = width - margin * 2;
        const maxRoomHeight = height - margin * 2;

        const roomWidth = Math.floor(Math.max(Math.random(), 0.5) * (maxRoomWidth - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
        const roomHeight = Math.floor(Math.max(Math.random(), 0.5) * (maxRoomHeight - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;

        const roomX = x + margin + Math.floor(Math.random() * (width - roomWidth - margin * 2 + 1));
        const roomY = y + margin + Math.floor(Math.random() * (height - roomHeight - margin * 2 + 1));

        for (let iy = roomY; iy < roomY + roomHeight; iy++) {
            for (let ix = roomX; ix < roomX + roomWidth; ix++) {
                const isWall = ix == roomX || iy == roomY || ix == roomX + roomWidth - 1 || iy == roomY + roomHeight - 1;
                const type = isWall ? 'wall' : 'floor';
                this.#tileLayer[iy][ix] = new Tile(type);
            }
        }

        const centerX = roomX + Math.floor(roomWidth / 2);
        const centerY = roomY + Math.floor(roomHeight / 2);
        return {
            width: roomWidth,
            height: roomHeight,
            coord: new Coord(roomX, roomY),
            center: new Coord(centerX, centerY)
        };
    }

    #findRoomInSubtree(node) {
        if (!node) {
            return null;
        }
        if (node.isLeaf()) {
            return this.getRandomCoordInRoom(node.room, 3);
        }
        const leftRoom = this.#findRoomInSubtree(node.left);
        if (leftRoom) {
            return leftRoom;
        }
        return this.#findRoomInSubtree(node.right);
    }

    #connectSubtreeRooms(node) {
        if (!node || node.isLeaf()) return;

        this.#connectSubtreeRooms(node.left);
        this.#connectSubtreeRooms(node.right);

        const roomA = this.#findRoomInSubtree(node.left);
        const roomB = this.#findRoomInSubtree(node.right);

        if (roomA && roomB) {
            this.#connectRoomsBetween(roomA, roomB);
        }
    }

    #connectRoomsBetween(a, b) {
        const path = this.findPartialPath(a, b);

        if (path && path.length > 0 && path[path.length - 1].equals(b)) {
            return;
        }

        const closest = path && path.length > 0 ? path[path.length - 1] : a;

        if (Math.random() < 0.5) {
            this.#carveHorizontalTunnel(closest.x, b.x, closest.y);
            this.#carveVerticalTunnel(closest.y, b.y, b.x);
            this.#ensureCornerWalls(b.x, closest.y);
        } else {
            this.#carveVerticalTunnel(closest.y, b.y, closest.x);
            this.#carveHorizontalTunnel(closest.x, b.x, b.y);
            this.#ensureCornerWalls(closest.x, b.y);
        }
    }

    #ensureCornerWalls(x, y) {
        for (let dx of [-1, 0, 1]) {
            for (let dy of [-1, 0, 1]) {
                const nx = x + dx;
                const ny = y + dy;
                if ((dx !== 0 || dy !== 0) &&
                    this.isInBorders(new Coord(nx, ny)) &&
                    !this.#tileLayer[ny][nx]) {
                    this.#tileLayer[ny][nx] = new Tile('wall');
                }
            }
        }
    }

    #carveHorizontalTunnel(x1, x2, y) {
        let wasInRoom = false;
        let wasWall = false;

        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            const isInRoom = this.#isInAnyRoom(x, y);
            const isWall = this.#isRoomWall(x, y);

            this.#tileLayer[y][x] = new Tile('floor');
            this.#structureLayer[y][x] = null;
            if (isWall && (!wasInRoom || (isInRoom && !wasWall))) {
                this.#structureLayer[y][x] = new Structure('closed-door');
            }

            for (let dy of [-1, 1]) {
                const ny = y + dy;
                if (this.isInBorders(new Coord(x, ny)) && !this.#tileLayer[ny][x]) {
                    this.#tileLayer[ny][x] = new Tile('wall');
                }
            }

            wasInRoom = isInRoom;
            wasWall = isWall;
        }
    }

    #carveVerticalTunnel(y1, y2, x) {
        let wasInRoom = false;
        let wasWall = false;

        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            const isInRoom = this.#isInAnyRoom(x, y);
            const isWall = this.#isRoomWall(x, y);

            this.#tileLayer[y][x] = new Tile('floor');
            this.#structureLayer[y][x] = null;
            if (isWall && (!wasInRoom || (isInRoom && !wasWall))) {
                this.#structureLayer[y][x] = new Structure('closed-door');
            }

            for (let dx of [-1, 1]) {
                const nx = x + dx;
                if (this.isInBorders(new Coord(nx, y)) && !this.#tileLayer[y][nx]) {
                    this.#tileLayer[y][nx] = new Tile('wall');
                }
            }

            wasInRoom = isInRoom;
            wasWall = isWall;
        }
    }

    #isInAnyRoom(x, y) {
        for (const room of this.#rooms) {
            if (this.#isInRoom(x, y, room)) {
                return true;
            }
        }
        return false;
    }

    #isInRoom(x, y, room) {
        return room &&
            x >= room.coord.x &&
            x < room.coord.x + room.width &&
            y >= room.coord.y &&
            y < room.coord.y + room.height;
    }

    #isRoomWall(x, y) {
        for (const room of this.#rooms) {
            const inside =
                x >= room.coord.x &&
                x < room.coord.x + room.width &&
                y >= room.coord.y &&
                y < room.coord.y + room.height;

            if (!inside) continue;

            const isEdge =
                x == room.coord.x ||
                x == room.coord.x + room.width - 1 ||
                y == room.coord.y ||
                y == room.coord.y + room.height - 1;

            return isEdge;
        }
        return false;
    }

//#endregion

//#region path finding

    findPath(start, goal, filter = (coord) => { return this.isWalkable(coord); }) {
        const path = this.findPartialPath(start, goal, filter);
        if (!path || path.length == 0 || !path[path.length - 1].equals(goal)) {
            return null;
        }
        return path;
    }

    findPartialPath(start, goal, filter = (coord) => { return this.isWalkable(coord); }) {
        const openSet = new PriorityQueue();
        openSet.enqueue(start, 0);

        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        gScore.set(start.toKey(), 0);
        fScore.set(start.toKey(), start.getDistanceTo(goal));

        let bestSoFar = start;
        let bestHeuristic = start.getDistanceTo(goal);

        while (!openSet.isEmpty()) {
            let current = openSet.dequeue();

            if (current.equals(goal)) {
                const path = [current];
                while (cameFrom.has(current.toKey())) {
                    current = cameFrom.get(current.toKey());
                    path.push(current);
                }
                path.reverse();
                return path;
            }

            const currentKey = current.toKey();

            for (const { coord: neighbor, cost } of this.#getNeighbors(current, filter)) {
                const neighborKey = neighbor.toKey();
                const tentativeG = gScore.get(currentKey) + cost;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeG);

                    const heuristic = neighbor.getDistanceTo(goal);
                    const totalCost = tentativeG + heuristic;

                    fScore.set(neighborKey, totalCost);
                    openSet.enqueue(neighbor, totalCost);

                    if (heuristic < bestHeuristic) {
                        bestSoFar = neighbor;
                        bestHeuristic = heuristic;
                    }
                }
            }
        }

        const path = [bestSoFar];
        let current = bestSoFar;
        while (cameFrom.has(current.toKey())) {
            current = cameFrom.get(current.toKey());
            path.push(current);
        }
        path.reverse();
        return path;
    }

    #getNeighbors(coord, filter = (coord) => { return this.isWalkable(coord); }) {
        const deltas = [
            [0, -1, 1], [1, 0, 1], [0, 1, 1], [-1, 0, 1],
            [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2],
            [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2]
        ];
        const neighbors = [];

        for (const [dx, dy, cost] of deltas) {
            const neighbor = new Coord(coord.x + dx, coord.y + dy);

            if (filter(neighbor)) {
                neighbors.push({ coord: neighbor, cost });
            }
        }

        return neighbors;
    }

    rayCast(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        const stepX = dx / steps;
        const stepY = dy / steps;

        let x = start.x;
        let y = start.y;

        for (let i = 0; i <= steps; i++) {
            const tilePos = new Coord(Math.round(x), Math.round(y));
            if (!this.isWalkable(tilePos, true)) {
                return tilePos;
            }
            if (tilePos.equals(end)) {
                return end;
            }
            x += stepX;
            y += stepY;
        }
        return null;
    }

//#endregion

//#region tiles and structures

    getTile(coord) {
        if (!this.isInBorders(coord)) return null;
        return this.#tileLayer[coord.y][coord.x];
    }

    setTile(coord, tile) {
        if (!this.isInBorders(coord)) return;
        this.#tileLayer[coord.y][coord.x] = tile;
    }

    getStructure(coord) {
        if (!this.isInBorders(coord)) return null;
        return this.#structureLayer[coord.y][coord.x];
    }

    setStructure(coord, structure) {
        if (!this.isInBorders(coord)) return;
        this.#structureLayer[coord.y][coord.x] = structure;
    }

    removeStructure(coord) {
        this.setStructure(coord, null);
    }

//#endregion

//#region entities

    getEntityAt(coord, ignoreType = null) {
        for (const entity of this.getEntities()) {
            if (entity.getPosition().equals(coord) && (!ignoreType || ignoreType != entity.getType())) return entity;
        }
        return null;
    }

    removeMob(mob) {
        const index = this.#mobs.indexOf(mob);
        if (index !== -1) {
            this.#mobs.splice(index, 1);
        }
    }

    getMobs() {
        return this.#mobs;
    }

    getEntities() {
        return [this.#player, ...this.#mobs].filter(Boolean);
    }

    addMob(coord, mobType) {
        if (!this.isWalkable(coord)) return;

        this.#mobs.push(new Mob(mobType, coord));
    }

//#endregion

//#region items

    getItemAt(coord) {
        return this.#items.get(coord.toKey()) || null;
    }

    getItems() {
        return this.#items;
    }

    removeItemAt(coord) {
        this.#items.delete(coord.toKey());
    }

    placeItemAt(coord, item) {
        if (!this.#findNearestFreeTileForItem(coord, item)) return;
        if (item.getAmount() == 0) return;
        this.placeItemAt(coord, item);
    }

    #findNearestFreeTileForItem(startCoord, item) {
        const visited = new Set();
        const queue = [startCoord];
        visited.add(startCoord.toKey());

        while (queue.length > 0) {
            const coord = queue.shift();

            if (this.isWalkable(coord)) {
                let existingItem = this.getItemAt(coord);
                if (!existingItem) {
                    this.#items.set(coord.toKey(), new Item(item.getType(), item.getAmount()));
                    item.setAmount(0);
                    return true;
                }
                if (existingItem.isStackable() && existingItem.getAmount() < existingItem.getStackSize()) {
                    const canAdd = Math.min(item.getAmount(), existingItem.getStackSize() - existingItem.getAmount());
                    existingItem.increaseAmount(canAdd);
                    item.decreaseAmount(canAdd);
                    return true;
                }
            }

            const neighbors = this.#getNeighbors(coord);
            for (const { coord: neighbor } of neighbors) {
                const key = neighbor.toKey();
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(neighbor);
                }
            }
        }

        return false;
    }

//#endregion

}

class BSPNode {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.left = null;
        this.right = null;

        this.room = null;
    }

    isLeaf() {
        return this.left === null && this.right === null;
    }
}