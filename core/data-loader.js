const dataStore = {};

export async function loadGameData() {
    const files = {
        tile:       'assets/data/tile-data.json',
        structure:  'assets/data/structure-data.json',
        entity:     'assets/data/entity-data.json',
        item:       'assets/data/item-data.json',
        ui:         'assets/data/ui-data.json',
        lootTable:  'assets/data/loot-tables.json'
    };

    for (const [key, path] of Object.entries(files)) {
        const prefix = 'https://finch957.github.io/js-game/';
        const res = await fetch(prefix + path);
        if (!res.ok) {
            throw new Error(`Failed to load ${path}`);
        }
        const data = await res.json();
        dataStore[key] = data;
    }
}

export function getData(type, id) {
    if (dataStore[type] && dataStore[type][id] !== undefined) {
        return dataStore[type][id];
    }
    return null;
}

export function getAllData(type) {
    return dataStore[type] || {};
}