export class Inventory {
    #items;
    #slotCount = 10;

    constructor() {
        this.#items = Array(this.#slotCount).fill(null);
    }

    getWeapon() {
        return this.#items[0];
    }

    getArmor() {
        return this.#items[1];
    }

    addItem(newItem) {
        if (!newItem) return 0;

        let remaining = newItem.getAmount();
        const type = newItem.getType();
        const stackSize = newItem.getStackSize();

        if (newItem.isStackable()) {
            for (let i = 2; i < this.#slotCount; i++) {
                const existingItem = this.#items[i];
                if (
                    existingItem &&
                    existingItem.getType() == type &&
                    existingItem.getAmount() < stackSize
                ) {
                    const space = stackSize - existingItem.getAmount();
                    const toAdd = Math.min(space, remaining);
                    existingItem.increaseAmount(toAdd);
                    remaining -= toAdd;
                    if (remaining == 0) return newItem.getAmount();
                }
            }
        }

        for (let i = 2; i < this.#slotCount && remaining > 0; i++) {
            if (!this.#items[i]) {
                const itemToInsert = newItem.clone();
                itemToInsert.setAmount(remaining);
                this.#items[i] = itemToInsert;
                remaining = 0;
                return newItem.getAmount();
            }
        }

        return newItem.getAmount() - remaining;
    }

    removeItemAt(index) {
        if (index < 0 || index >= this.#slotCount) return null;
        const removed = this.#items[index];

        if (index < 2) {
            this.#items[index] = null;
        } else {
            for (let i = index; i < this.#slotCount - 1; i++) {
                this.#items[i] = this.#items[i + 1];
            }
            this.#items[this.#slotCount - 1] = null;
        }
        return removed;
    }

    getItems() {
        return [...this.#items];
    }

    getSlotCount() {
        return this.#slotCount;
    }

    getItemAt(index) {
        if (index < 0 || index >= this.#slotCount) return null;
        return this.#items[index];
    }

    setItemAt(index, item) {
        if (index < 0 || index >= this.#slotCount) return false;
        this.#items[index] = item;
        return true;
    }

    useItemAt(player, index) {
        const item = this.getItemAt(index);
        if (!item) return false;

        if (index > 1) {
            if (this.useLastOfType(item.getType(), player)) {
                if (item.isEquipable()) this.removeItemAt(index);
                return true;
            }
            return false;
        } else {
            const count = this.addItem(item);
            if (count > 0) {
                this.#items[index] = null;
                return true;
            }
            return false;
        }
    }

    useLastOfType(type, player) {
        for (let i = this.#slotCount - 1; i >= 0; i--) {
            const item = this.#items[i];
            if (!item || item.getType() != type) continue;

            if (item.isConsumable()) {
                item.use(player);
                item.decreaseAmount();
                if (item.getAmount() <= 0) {
                    this.removeItemAt(i);
                }
                return true;
            }

            if (item.isEquipable()) {
                const category = item.getCategory();
                const slot = category == 'weapon' ? 0 : 1;

                if (!this.#items[slot]) {
                    this.#items[slot] = item;
                    return true;
                }
                return false;
            }

            break;
        }

        return false;
    }

}
