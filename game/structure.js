import { getData } from '../core/data-loader.js';
import { Item } from './item.js';

export class Structure {
    #type;
    #spriteName;
    #isWalkable;
    #isInteractable;
    #isTransparent;

    constructor(type) {
        this.setType(type);
    }

    setType(type) {
        this.#type = type;
        const data = getData('structure', type);
        this.#spriteName = data.sprite;
        this.#isWalkable = data.walkable;
        this.#isInteractable = data.interactable;
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

    isInteractable() {
        return this.#isInteractable;
    }

    isTransparent() {
        return this.#isTransparent;
    }

    interact(entity, level, coord) {
        switch(this.#type) {
            case 'closed-door':
                this.setType('opened-door');
            break;
            case 'trap-active':
                this.setType('trap-disarmed');
                entity.takeDamage(10, level);
            break;
            case 'chest':
                level.removeStructure(coord);
                level.generateLootAt(coord, 'chest');
            break;
            case 'fake-chest':
                level.removeStructure(coord);
                level.addMob(coord, 'mimic');
            break
        }
    }
}
