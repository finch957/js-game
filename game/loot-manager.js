import { getAllData } from "../core/data-loader.js";
import { weightedRandom } from "../core/utils.js";
import { Item } from "./item.js";

class LootEntry {
    constructor({ group = false, weight = 1, min = 1, max = 1, unique = false }) {
        this.group = group;
        this.weight = weight;
        this.min = min;
        this.max = max;
        this.unique = unique;
    }

    isGroup() {
        return this.group;
    }

    isUnique() {
        return this.unique;
    }
}

class LootTable {
    constructor({rollsMin = 1, rollsMax = 1, entries = []}) {
        this.rollsMin = rollsMin;
        this.rollsMax = rollsMax;
        this.entries = new Map();
        for (const [entryId, data] of Object.entries(entries)) {
            this.entries.set(entryId, new LootEntry(data));
        }
    }

    getRandomLoot(LootManager, unique = new Set()) {
        const weights = new Map(
            Array.from(this.entries.entries()).map(([key, entry]) => [key, entry.weight])
        );

        const items = [];
        const rolls = Math.floor(this.rollsMin + Math.random() * (this.rollsMax - this.rollsMin + 1));

        let i = 0;
        while (i < rolls) {
            let entryId = weightedRandom(weights);
            const entryData = this.entries.get(entryId);
            if (!entryData) continue;

            if (entryData.isUnique() && unique.has(entryId)) {
                continue;
            }

            if (entryData.isUnique()) {
                unique.add(entryId);
            }

            if (entryData.isGroup()) {
                const groupItems = LootManager.generateLoot(entryId, unique);

                items.push(...groupItems);
                i++;
                continue;
            }

            const count = Math.floor(entryData.min + Math.random() * (entryData.max - entryData.min + 1));
            const stackSize = new Item(entryId, 1).getStackSize() || count;

            let remaining = count;
            while (remaining > 0) {
                const stackCount = Math.min(stackSize, remaining);
                items.push({ id: entryId, count: stackCount });
                remaining -= stackCount;
            }

            i++;
        }

        return items;
    }

}

export class LootManager {
    #lootTables;

    constructor() {
        this.#lootTables = new Map();
        const rawTables = getAllData('lootTable');
        for (const [tableId, data] of Object.entries(rawTables)) {
            this.#lootTables.set(tableId, new LootTable(data));
        }
    }

    generateLoot(tableId, unique = new Set()) {
        const table = this.getTable(tableId);
        if (!table) return [];
        return table.getRandomLoot(this, unique);
    }

    getTable(tableId) {
        if (!this.#lootTables.has(tableId)) return null;
        return this.#lootTables.get(tableId);
    }

}