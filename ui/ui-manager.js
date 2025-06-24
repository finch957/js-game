import { getData } from '../core/data-loader.js';

class MenuElement {
    constructor({
            type, width, height, offsetX = 0, offsetY = 0,
            anchorX = 'left', anchorY = 'top',
            text = null, fontSize = '28px', spriteName = null, sliceBorder = null,
            onClick = null, onDrag = null, onRelease = null,
            children = []
        }) {

        this.type = type;
        this.width = width;
        this.height = height;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.anchorX = anchorX;
        this.anchorY = anchorY;

        this.text = text;
        this.fontSize = fontSize;
        this.spriteName = spriteName;
        this.sliceBorder = sliceBorder;

        this.onClick = onClick;
        this.onDrag = onDrag;
        this.onRelease = onRelease;

        this.children = children;
        this.parent = null;
        for (const child of children) {
            child.parent = this;
        }

        this.x = 0;
        this.y = 0;
    }

    updateLayout(canvasWidth, canvasHeight) {
        let baseX = 0, baseY = 0;

        if (this.parent) {
            baseX = this.parent.x;
            baseY = this.parent.y;

            if (this.anchorX == 'center') baseX += this.parent.width / 2;
            else if (this.anchorX == 'right') baseX += this.parent.width;

            if (this.anchorY == 'middle') baseY += this.parent.height / 2;
            else if (this.anchorY == 'bottom') baseY += this.parent.height;
        } else {
            const anchors = {
                left: 0,
                center: canvasWidth / 2,
                right: canvasWidth,
                top: 0,
                middle: canvasHeight / 2,
                bottom: canvasHeight
            };

            baseX = anchors[this.anchorX] ?? 0;
            baseY = anchors[this.anchorY] ?? 0;
        }

        this.x = baseX + this.offsetX;
        this.y = baseY + this.offsetY;

        for (const child of this.children) {
            child.updateLayout(canvasWidth, canvasHeight);
        }
    }
}

class UIMenu {
    constructor(elements = [], lockInput = true) {
        this.elements = elements;
        this.lockInput = lockInput;
    }

    updateLayout(canvasWidth, canvasHeight) {
        this.elements.forEach(el => el.updateLayout(canvasWidth, canvasHeight));
    }
}

export class UIManager {
    #menus = new Map();
    #activeMenus = new Array();
    #canvasWidth;
    #canvasHeight;
    #activeDragElement = null;

    #player = null;
    #healthRatio = 0;

    #clickedSlot;

    constructor(onReturnToMenu, nextTick) {

        const mainMenu = new UIMenu([
            new MenuElement({
                type: '9slice',
                anchorX: 'left', anchorY: 'top',
                offsetX: 100, offsetY: 200,
                width: 300, height: 60,
                sliceBorder: 12,
                spriteName: 'generic-button.png',
                onClick: () => {
                    this.hideAll();
                    this.showMenu('hud');
                },
                children: [
                    new MenuElement({
                        type: 'text',
                        text: 'Start Game',
                        offsetY: 15,
                        anchorX: 'center', anchorY: 'middle'
                    })
                ]
            }),
            new MenuElement({
                type: '9slice',
                anchorX: 'left', anchorY: 'top',
                offsetX: 100, offsetY: 280,
                width: 300, height: 60,
                sliceBorder: 12,
                spriteName: 'generic-button.png',
                onClick: () => window.close(),
                children: [
                    new MenuElement({
                        type: 'text',
                        text: 'Exit',
                        offsetY: 15,
                        anchorX: 'center', anchorY: 'middle'
                    })
                ]
            })
        ]);

        const deathMenu = new UIMenu([
            new MenuElement({
                type: 'text',
                anchorX: 'center', anchorY: 'middle',
                offsetX: 0, offsetY: -90,
                text: 'YOU DIED'
            }),
            new MenuElement({
                type: '9slice',
                anchorX: 'center', anchorY: 'middle',
                offsetX: -210, offsetY: 0,
                width: 420, height: 70,
                sliceBorder: 12,
                spriteName: 'generic-button.png',
                onClick: () => {
                    this.hideAll();
                    this.showMenu('main');
                    onReturnToMenu();
                },
                children: [
                    new MenuElement({
                        type: 'text',
                        text: 'Return to Menu',
                        offsetY: 15,
                        anchorX: 'center', anchorY: 'middle'
                    })
                ]
            })
        ]);

        const hudMenu = new UIMenu([
            new MenuElement({
                type: '9slice',
                spriteName: 'health-bar.png',
                width: 320,
                height: 40,
                sliceBorder: 12,
                anchorX: 'left',
                anchorY: 'top',
                offsetX: 10,
                offsetY: 10
            }),
            new MenuElement({
                type: 'text',
                text: 'SC',
                anchorX: 'right', anchorY: 'top',
                offsetX: -150, offsetY: 45
            }),
            new MenuElement({
                type: 'image',
                width: 96, height: 96,
                anchorX: 'right', anchorY: 'bottom',
                offsetX: -282, offsetY: -96,
                spriteName: 'hud-button-wait.png',
                onClick: nextTick
            }),
            new MenuElement({
                type: 'image',
                width: 96, height: 96,
                anchorX: 'right', anchorY: 'bottom',
                offsetX: -186, offsetY: -96,
                spriteName: 'hud-button-inventory.png',
                onClick: () => {
                    this.hideAll();
                    this.showMenu('inventory');
                }
            }),
            new MenuElement({
                type: 'image',
                width: 96, height: 96,
                anchorX: 'right', anchorY: 'bottom',
                offsetX: -90, offsetY: -96,
                spriteName: 'hud-button-exit.png',
                onClick: () => {
                    this.hideAll();
                    this.showMenu('main');
                    onReturnToMenu();
                }
            })
        ], false);

        const itemMenu = new UIMenu([
            new MenuElement({
                type: '9slice',
                sliceBorder: 12,
                spriteName: 'generic-panel.png',
                //width: 454, height: 124,
                width: 454, height: 194,
                offsetX: -227,
                anchorX: 'center', anchorY: 'top',
                children: [
                    new MenuElement({
                        type: 'text',
                        text: '123',
                        offsetY: 62,
                        anchorX: 'center', anchorY: 'top',
                    }),
                    new MenuElement({
                        type: '9slice',
                        sliceBorder: 12,
                        spriteName: 'generic-button.png',
                        width: 200, height: 80,
                        offsetX: 22, offsetY: -102,
                        anchorX: 'left', anchorY: 'bottom',
                        children: [
                            new MenuElement({
                                type: 'text',
                                text: 'Drop',
                                offsetY: 15,
                                anchorX: 'center', anchorY: 'middle'
                            })
                        ],
                        onClick: () => {
                            this.#player.dropItemAt(this.#clickedSlot);
                            this.hideMenu('item');
                        }
                    })
                ]
            }),
            new MenuElement({
                type: 'image',
                spriteName: 'empty.png',
                onClick: () => {
                    this.hideMenu('item');
                },
            })
        ])

        this.#menus.set('main', mainMenu);
        this.#menus.set('death', deathMenu);
        this.#menus.set('hud', hudMenu);
        this.#menus.set('item', itemMenu);

        this.#activeMenus = ['main'];
    }

    resize(canvasWidth, canvasHeight) {
        this.#canvasWidth = canvasWidth;
        this.#canvasHeight = canvasHeight;

        for (const menu of this.#menus.values()) {
            menu.updateLayout(canvasWidth, canvasHeight);
        }
    }

    setPlayer(newPlayer) {
        this.#player = newPlayer;
        this.#initInventoryMenu();
    }

    isMenuVisible(menuKey) {
        return this.#activeMenus.includes(menuKey);
    }

    isAnyMenuVisible() {
        return this.#activeMenus.length > 0;
    }

    shouldLockInput() {
        for (const key of this.#activeMenus) {
            const menu = this.#menus.get(key);
            if (menu?.lockInput) return true;
        }
        return false;
    }

    showMenu(menuKey) {
        const index = this.#activeMenus.indexOf(menuKey);
        if (index != -1) this.#activeMenus.splice(index, 1);
        this.#activeMenus.push(menuKey);
    }

    hideMenu(menuKey) {
        const index = this.#activeMenus.indexOf(menuKey);
        if (index != -1) this.#activeMenus.splice(index, 1);
    }

    hideAll() {
        this.#activeMenus = [];
    }

    updateHudData(hp = 0, maxHp = 100, score, levelIndex) {
        this.#healthRatio = hp / maxHp;
        for (const el of this.#menus.get('hud').elements) {
            if (el.type == 'text' && el.text.startsWith('SC')) {
                const text = 'SC ' + score + ' LVL ' + levelIndex;
                el.text = text;
                el.offsetX = -text.length * 15;
                el.updateLayout(this.#canvasWidth, this.#canvasHeight);
                return;
            }
        }
    }

    #initInventoryMenu() {
        if (this.#menus.has('inventory')) return;

        const inventory = this.#player.getInventory();

        const gap = 10;
        const items = inventory.getItems();
        const slotCount = inventory.getSlotCount();
        const itemsPerRow = 4;
        const itemsPerColumn = Math.ceil((slotCount + 2) / itemsPerRow);

        const slotSize = 128;
        const itemScale = 0.7;
        const itemSize = slotSize * itemScale;

        const panelPadding = 22;
        const panelWidth = itemsPerRow * slotSize + (itemsPerRow - 1) * gap + 2 * panelPadding;
        const panelHeight = itemsPerColumn * slotSize + (itemsPerColumn - 1) * gap + 2 * panelPadding;

        const inventoryMenu = new UIMenu([]);

        const inventoryPanel = new MenuElement({
            type: '9slice',
            spriteName: 'generic-panel.png',
            sliceBorder: 12,
            width: panelWidth,
            height: panelHeight,
            offsetX: -panelWidth / 2,
            offsetY: -panelHeight / 2,
            anchorX: 'center',
            anchorY: 'middle',
            children: []
        });

        for (let i = 0; i < slotCount; i++) {
            const item = items[i];
            let offsetX, offsetY;

            if (i == 0) {
                offsetX = panelPadding;
                offsetY = panelPadding;
            } else if (i == 1) {
                offsetX = panelPadding + slotSize + gap;
                offsetY = panelPadding;
            } else {
                const col = (i - 2) % itemsPerRow;
                const row = Math.floor((i - 2) / itemsPerRow);
                offsetX = panelPadding + col * (slotSize + gap);
                offsetY = panelPadding + slotSize + gap + row * (slotSize + gap);
            }

            const slot = new MenuElement({
                type: '9slice',
                spriteName: 'slot.png',
                sliceBorder: 6,
                width: slotSize,
                height: slotSize,
                offsetX,
                offsetY,
                onClick: () => {
                    const item = this.#player.getInventory().getItemAt(i);

                    if (!item) return;

                    this.#clickedSlot = i;

                    let itemMenu = this.#menus.get('item');
                    const elements = itemMenu.elements;

                    const itemMenuFrame = elements[0];
                    const row = Math.floor((i - 2) / itemsPerRow) + 1;
                    itemMenuFrame.offsetY = panelPadding + slotSize + row * (slotSize + gap);
                    itemMenuFrame.parent = inventoryPanel;
                    itemMenuFrame.updateLayout();

                    const isConsumable = item.isConsumable();
                    const isEquipable = item.isEquipable();
                    if (isConsumable || isEquipable) {
                        const secondButton = new MenuElement({
                            type: '9slice',
                            sliceBorder: 12,
                            spriteName: 'generic-button.png',
                            width: 200, height: 80,
                            offsetX: 232, offsetY: -102,
                            anchorX: 'left', anchorY: 'bottom',
                            children: [
                                new MenuElement({
                                    type: 'text',
                                    text: i < 2 ? 'Unequip' : isConsumable ? 'Use' : 'Equip',
                                    offsetY: 15,
                                    anchorX: 'center', anchorY: 'middle'
                                })
                            ],
                            onClick: () => {
                                this.#player.useItemAt(this.#clickedSlot);
                                this.hideMenu('item');
                            }
                        })
                        itemMenuFrame.children.push(secondButton);
                        secondButton.parent = itemMenuFrame;
                        secondButton.updateLayout();
                    } else if (itemMenuFrame.children.length > 2) itemMenuFrame.children = [itemMenuFrame.children[0], itemMenuFrame.children[1]];

                    const description = itemMenuFrame.children[0];
                    description.text = item.getDescription();

                    const backdrop = elements[1];
                    backdrop.height = this.#canvasHeight;
                    backdrop.width = this.#canvasWidth;

                    this.showMenu('item');
                },
                //onDrag: () => console.log(`Dragged inventory slot ${i}`),
                //onRelease: () => console.log(`Released inventory slot ${i}`),
                children: [
                    new MenuElement({
                        type: 'image',
                        spriteName: item ? item.getSpriteName() : (
                            i == 0 ? 'weapon-slot-empty.png' :
                            i == 1 ? 'armor-slot-empty.png' :
                            'empty.png'
                        ),
                        width: itemSize,
                        height: itemSize,
                        anchorX: 'center',
                        anchorY: 'middle',
                        offsetX: -itemSize / 2,
                        offsetY: -itemSize / 2
                    }),
                    new MenuElement({
                        type: 'text',
                        text: '',
                        offsetX: -30,
                        offsetY: -10,
                        anchorX: 'right',
                        anchorY: 'bottom'
                    })
                ]
            });

            inventoryPanel.children.push(slot);
            slot.parent = inventoryPanel;
        }

        const backButton = new MenuElement({
            type: '9slice',
            spriteName: 'generic-button.png',
            sliceBorder: 12,
            width: 200,
            height: 80,
            offsetX: -200,
            anchorX: 'right',
            anchorY: 'bottom',
            onClick: () => {
                this.hideAll();
                this.showMenu('hud');
            },
            children: [
                new MenuElement({
                    type: 'text',
                    text: 'Back',
                    offsetY: 15,
                    anchorX: 'center',
                    anchorY: 'middle'
                })
            ]
        });

        inventoryPanel.children.push(backButton);
        backButton.parent = inventoryPanel;

        inventoryMenu.elements.push(inventoryPanel);
        this.#menus.set('inventory', inventoryMenu);
        inventoryMenu.updateLayout(this.#canvasWidth, this.#canvasHeight);
    }

    updateInventoryData() {
        if (!this.#menus.has('inventory') || !this.#player) return;

        const inventory = this.#player.getInventory();
        const items = inventory.getItems();

        const menu = this.#menus.get('inventory');
        const panel = menu.elements.find(el => el.spriteName == 'generic-panel.png');
        if (!panel) return;

        const slotElements = panel.children.filter(el =>
            el.type == '9slice' &&
            el.spriteName == 'slot.png'
        );

        for (let i = 0; i < slotElements.length; i++) {
            const el = slotElements[i];
            const item = items[i];

            for (const child of el.children) {
                if (child.type == 'image') {
                    child.spriteName = item
                        ? item.getSpriteName()
                        : (i == 0 ? 'weapon-slot-empty.png' :
                        i == 1 ? 'armor-slot-empty.png' :
                        'empty.png');
                } else if (child.type == 'text') {
                    const amount = item?.getAmount?.() ?? 0;
                    child.text = amount > 1 ? amount.toString() : '';
                }
            }
        }
    }

    getPlayerHealthRatio() {
        return this.#healthRatio;
    }

    getActiveMenus() {
        return this.#activeMenus;
    }

    getActiveMenuElements() {
        const elements = [];
        for (const key of this.#activeMenus) {
            elements.push(...this.#menus.get(key).elements);
        }
        return elements;
    }

    getMenuElements(menuKey) {
        return this.isMenuVisible(menuKey) ? this.#menus.get(menuKey)?.elements ?? [] : [];
    }

    traverseElements(elements, callback) {
        for (const el of elements) {
            if (callback(el)) return true;
            if (el.children?.length && this.traverseElements(el.children, callback)) return true;
        }
        return false;
    }

    handlePointerEvent(mx, my, type) {
        for (const key of Array.from(this.#activeMenus).reverse()) {
            const menu = this.#menus.get(key);
            if (!menu) continue;

            if (this.#activeDragElement) {
                if (type == 'drag') {
                    this.#activeDragElement.onDrag(mx, my);
                    return true;
                }
                if (type == 'release') {
                    this.#activeDragElement.onRelease(mx, my);
                    this.#activeDragElement = null;
                    return true;
                }
            }

            if (type == 'release') continue;

            const result = this.traverseElements(menu.elements, el => {
                if (
                    mx >= el.x && mx <= el.x + el.width &&
                    my >= el.y && my <= el.y + el.height
                ) {
                    if (type == 'click' && el.onClick) {
                        el.onClick();
                        return true;
                    }
                    if (type == 'drag' && el.onDrag) {
                        this.#activeDragElement = el;
                        el.onDrag(mx, my);
                        return true;
                    }
                }
                return false;
            });

            if (result) return true;
        }
        return false;
    }

}
