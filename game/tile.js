import { getData } from '../core/data-loader.js';

export class Tile {
    #type;
    #spriteName;
    #isWalkable;
    #isTransparent;

    constructor(type) {
        this.setType(type);
    }

    setType(type) {
        this.#type = type;
        const data = getData('tile', type);
        this.#spriteName = data.sprite;
        this.#isWalkable = data.walkable;
        this.#isTransparent = data.transparent;
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

    isTransparent() {
        return this.#isTransparent;
    }
}
