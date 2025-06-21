import { getData } from '../core/data-loader.js';

export class Tile {
    #type;
    #spriteName;
    #isWalkable;

    constructor(type) {
        this.setType(type);
    }

    setType(type) {
        this.#type = type;
        const data = getData('tile', type);
        this.#isWalkable = data.walkable;
        this.#spriteName = data.sprite;
    }

    getType() {
        return this.#type;
    }

    getSpriteName() {
        return this.#spriteName;
    }

    isWalkable() {
        return this.#isWalkable;
    }
}
