import { getData } from '../core/data-loader.js';

export class Item {
    #type;
    #sprite;
    #stackable;
    #stackSize = 1;
    #amount;
    #category;
    #description;

    #attributes = {};

    constructor(type, amount = 1) {
        this.#type = type;
        const data = getData('item', type);
        this.#sprite = data.sprite;
        this.#stackable = data.stackable;
        if (this.#stackable) {
            this.#stackSize = data.stack;
        }
        this.#amount = Math.min(amount, this.#stackSize);
        this.#category = data.category;
        this.#description = data.description;

        switch (this.#category) {
            case 'consumable':
                this.#attributes = {
                    effect: data.effect,
                    power: data.power
                };
                break;
            case 'weapon':
                this.#attributes = {
                    damage: data.damage
                };
                break;
            case 'armor':
                this.#attributes = {
                    defense: data.defense
                };
                break;
        }
    }

    getType() {
        return this.#type;
    }

    getSpriteName() {
        return this.#sprite;
    }

    isStackable() {
        return this.#stackable;
    }

    getStackSize() {
        return this.#stackSize;
    }

    getAmount() {
        return this.#amount;
    }

    getCategory() {
        return this.#category;
    }

    getAttributes() {
        return this.#attributes;
    }

    getDescription() {
        return this.#description;
    }

    isConsumable() {
        return this.#category == 'consumable';
    }

    isEquipable() {
        return this.#category == 'weapon' || this.#category == 'armor';
    }

    use(player) {
        switch(this.#attributes['effect']) {
            case 'heal':
                player.heal(this.#attributes['power']);
                break;
        }
    }

    setAmount(newAmount) {
        this.#amount = Math.max(0, Math.min(newAmount, this.#stackSize));
    }

    increaseAmount(delta = 1) {
        this.setAmount(this.#amount + delta);
    }

    decreaseAmount(delta = 1) {
        this.setAmount(this.#amount - delta);
    }

    clone() {
        const copy = new Item(this.#type, this.#amount);
        return copy;
    }

}
