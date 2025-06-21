import { getData } from '../core/data-loader.js';
import { Item } from './item.js';
import { weightedRandom } from '../core/utils.js';

export class Structure {
    #type;
    #spriteName;
    #isWalkable;
    #isInteractable;

    constructor(type) {
        this.setType(type);
    }

    setType(type) {
        this.#type = type;
        const data = getData('structure', type);
        this.#isWalkable = data.walkable;
        this.#isInteractable = data.interactable;
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

    isInteractable() {
        return this.#isInteractable;
    }

    interact(entity, level, coord) {
        switch(this.#type) {
            case 'closed-door':
                this.setType('opened-door');
            break;
            case 'trap-active':
                this.setType('trap-disarmed');
                entity.takeDamage(10);
                if (entity.isDead()) {
                    level.removeMob(entity);
                }
            break;
            case 'chest':
                level.removeStructure(coord);
                const itemToPlace = weightedRandom(new Map([
                    ['healing-potion', 60],
                    ['short-sword', 25],
                    ['chainmail', 15]
                ]));
                let itemCount = 1;
                if (itemToPlace == 'healing-potion') {
                    itemCount = Math.round(Math.max(Math.random(), 0.34) * 3);
                }
                level.placeItemAt(coord, new Item(itemToPlace, itemCount));
            break;
            case 'fake-chest':
                level.removeStructure(coord);
                level.addMob(coord, 'mimic');
            break
        }
    }
}
