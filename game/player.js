import { Coord } from '../core/utils.js';
import { Entity } from './entity.js';
import { Inventory } from './inventory.js';

export class Player extends Entity {
    #onActionCallback;
    #updateInventoryUICallback;
    #onDeathCallback;
    #placeItemAtCallback;
    #changeLevelCallback;

    #inventory = new Inventory();;
    #score = 0;
    #targetPosition = null;
    #isDead = false;

    constructor(coord) {
        super('player', coord);
    }

    init(onActionCallback, onDeathCallback, updateInventoryUICallback, placeItemAtCallback, changeLevelCallback) {
        this.#onActionCallback = onActionCallback;
        this.#onDeathCallback = onDeathCallback;
        this.#updateInventoryUICallback = updateInventoryUICallback;
        this.#placeItemAtCallback = placeItemAtCallback;
        this.#changeLevelCallback = changeLevelCallback;
    }

    skipTick() {
        this.#onActionCallback();
    }

    getScore() {
        return this.#score;
    }

    addScore(amount) {
        this.#score += amount;
    }

    getInventory() {
        return this.#inventory;
    }

    getDamage() {
        const weapon = this.#inventory.getItemAt(0);
        if (weapon) return weapon.getAttributes()['damage'];
        return super.getDamage();
    }

    getDefense() {
        const armor = this.#inventory.getItemAt(1);
        if (armor) return armor.getAttributes()['defense'];
        return super.getDefense();
    }

    takeDamage(amount) {
        const finalDamage = super.takeDamage(amount);
        if (this.isDead() && !this.#isDead) {
            this.#isDead = true;
            this.resetMovement();
            this.#onDeathCallback();
        } else {
            return finalDamage;
        }
    }

    setPath(newPath) {
        super.setPath(newPath);
        const path = this.getPath();
        this.#targetPosition = path ? path[path.length - 1] : null;
    }

    moveTo(newPosition, level) {
        const entity = level.getEntityAt(newPosition);
        if (entity && entity != this) {
            this.attackEntity(entity, level);
            this.resetMovement();
            this.#onActionCallback();
            return false;
        }

        const structure = level.getStructure(newPosition);
        if (structure && structure.isInteractable()) {
            if (structure.getType() == 'ladder-up') {
                if (level.getLevelNumber() < 1) return false;
                this.#changeLevelCallback(-1);
            } else if (structure.getType() == 'ladder-down') {
                this.#changeLevelCallback(1);
            } else {
                structure.interact(this, level, newPosition);
            }
            if (!structure.isWalkable()) return false;
        }

        if (newPosition == this.#targetPosition) {
            this.#pickupItemAt(newPosition, level);
        }

        this.setPosition(newPosition);
        this.#onActionCallback();

        return true;
    }

    attackEntity(victim, level) {
        const finalDamage = victim.takeDamage(this.getDamage(), level);
        level.addParticle({
            text: finalDamage,
            color: '#ffffff',
            position: victim.getPosition().add(new Coord(0.5, 0)),
            offset: new Coord(0, -0.5),
            startOpacity: 1,
            endOpacity: 0,
            lifetime: 0.8
        });
    }

    #pickupItemAt(position, level) {
        const item = level.getItemAt(position);
        if (!item) return false;

        const added = this.#inventory.addItem(item);

        if (added > 0) {
            item.decreaseAmount(added);
            if (item.getAmount() == 0) {
                level.removeItemAt(position);
            }
            this.#updateInventoryUICallback();
            return true;
        }

        return false;
    }

    dropItemAt(index) {
        const item = this.#inventory.getItemAt(index);
        if (!item) return;

        this.#placeItemAtCallback(this.getPosition(), item);
        this.#inventory.removeItemAt(index);
        this.#updateInventoryUICallback();
    }

    useItemAt(index) {
        const item = this.#inventory.getItemAt(index);
        if (!item) return;

        if (this.#inventory.useItemAt(this, index)) this.#updateInventoryUICallback();
    }

}