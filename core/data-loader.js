const dataStore = {};

export async function loadGameData() {
    const files = {
        tile:       'https://finch957.github.io/js-game/assets/data/tile-data.json',
        structure:  'https://finch957.github.io/js-game/assets/data/structure-data.json',
        entity:     'https://finch957.github.io/js-game/assets/data/entity-data.json',
        item:       'https://finch957.github.io/js-game/assets/data/item-data.json',
        ui:         'https://finch957.github.io/js-game/assets/data/ui-data.json',
    };

    for (const [key, path] of Object.entries(files)) {
        const res = await fetch(path);
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