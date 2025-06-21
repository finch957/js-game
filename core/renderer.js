import { getAllData } from './data-loader.js';
import { Coord } from './utils.js';
import { TILE_SIZE } from './constants.js';

export class Renderer {
    #ctx;
    #spriteAtlas = {};
    #wasHudVisible = false;
    #offscreen = null;
    #offscreenCtx = null;

    constructor(context) {
        this.#ctx = context;

        this.#offscreen = document.createElement('canvas');
        this.#offscreen.width = this.#ctx.canvas.width;
        this.#offscreen.height = this.#ctx.canvas.height;
        this.#offscreenCtx = this.#offscreen.getContext('2d');
    }

//#region load sprites

    async init() {
        await this.#loadSpritesByType('tile');
        await this.#loadSpritesByType('structure');
        await this.#loadSpritesByType('entity');
        await this.#loadSpritesByType('item');
        await this.#loadSpritesByType('ui');
    }

    #getSpritePath(type, spriteName) {
        const pathMap = {
            tile:       'sprites/environment/',
            structure:  'sprites/environment/',
            entity:     'sprites/entities/',
            item:       'sprites/items/',
            ui:         'sprites/ui/'
        };

        const basePath = pathMap[type];
        if (!basePath) {
            throw new Error(`Unknown sprite type: ${type}`);
        }

        return `assets/${basePath}${spriteName}`;
    }

    async #loadImage(fullPath) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = fullPath;
        });
    }

    async #loadSpritesByType(type) {
        const allData = getAllData(type);

        for (const [key, data] of Object.entries(allData)) {
            const spriteName = data.sprite;
            const path = this.#getSpritePath(type, spriteName);
            const img = await this.#loadImage(path);
            this.#spriteAtlas[spriteName] = img;
        }
    }

//#endregion

    render(level, camera, uiManager, particleManager) {
        const ctx = this.#ctx;

        const scaledTileSize = TILE_SIZE * camera.getZoom();
        const { topLeft, bottomRight } = camera.getRenderArea();

        let renderCtx;

        const isHudVisible = uiManager.isMenuVisible('hud');
        if (!isHudVisible) {
            if (!this.#wasHudVisible) {
                this.#offscreen.width = ctx.canvas.width;
                this.#offscreen.height = ctx.canvas.height;
                renderCtx = this.#offscreenCtx;
            } else {
                this.#clearCanvas(ctx);
                ctx.filter = 'blur(3px)';
                ctx.drawImage(this.#offscreen, 0, 0);
                ctx.filter = 'none';
                this.#renderUI(uiManager);
                this.#wasHudVisible = true;
                return;
            }
        } else {
            renderCtx = ctx;
        }

        this.#clearCanvas(renderCtx);
        this.#renderTilesAndStructures(level, camera, topLeft, bottomRight, scaledTileSize, renderCtx);
        this.#renderItems(level, camera, scaledTileSize, renderCtx);
        this.#renderEntities(level, camera, scaledTileSize, renderCtx);
        this.#renderParticles(particleManager, camera, scaledTileSize, ctx)
        this.#renderUI(uiManager);

        this.#wasHudVisible = !isHudVisible;
    }

    #clearCanvas(ctx) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    #renderTilesAndStructures(level, camera, topLeft, bottomRight, scaledTileSize, ctx) {

        for (let y = topLeft.y; y <= bottomRight.y; y++) {
            for (let x = topLeft.x; x <= bottomRight.x; x++) {
                const tileCoord = new Coord(x, y);

                if (!level.isInBorders(tileCoord)) continue;

                const tile = level.getTile(tileCoord);
                if (!tile) continue;

                const { x: drawX, y: drawY } = camera.worldToScreen(tileCoord);
                const tileImg = this.#spriteAtlas[tile.getSpriteName()];
                ctx.drawImage(tileImg, drawX, drawY, scaledTileSize, scaledTileSize);

                const structure = level.getStructure(tileCoord);
                if (structure) {
                    const structureImg = this.#spriteAtlas[structure.getSpriteName()];
                    ctx.drawImage(structureImg, drawX, drawY, scaledTileSize, scaledTileSize);
                }
            }
        }
    }

    #renderItems(level, camera, scaledTileSize, ctx) {

        ctx.font = `${Math.floor(scaledTileSize * 0.35)}px PressStart2P`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        for (const [itemPos, item] of level.getItems()) {
            const { x: itemX, y: itemY } = camera.worldToScreen(Coord.fromKey(itemPos));
            const itemImg = this.#spriteAtlas[item.getSpriteName()];
            ctx.drawImage(itemImg, itemX, itemY, scaledTileSize, scaledTileSize);

            if (item.getAmount() > 1) {
                const text = item.getAmount().toString();
                const centerX = itemX + scaledTileSize / 2;
                const bottomY = itemY + scaledTileSize;

                ctx.strokeText(text, centerX + 10, bottomY + 2);
                ctx.fillText(text, centerX + 10, bottomY + 2);
            }
        }
    }

    #renderEntities(level, camera, scaledTileSize, ctx) {

        for (const entity of level.getEntities()) {
            const entityPos = entity.getDrawPosition();
            const { x: entityX, y: entityY } = camera.worldToScreen(entityPos);
            const entityImg = this.#spriteAtlas[entity.getSpriteName()];
            const flip = entity.isFacingLeft();
            ctx.save();
            ctx.translate(entityX + (flip ? scaledTileSize : 0), entityY);
            ctx.scale(flip ? -1 : 1, 1);
            ctx.drawImage(entityImg, 0, 0, scaledTileSize, scaledTileSize);
            ctx.restore();
        }
    }

    #renderParticles(particleManager, camera, scaledTileSize, ctx) {
        for (const particle of particleManager.particles) {
            const worldPos = particle.getCurrentPosition();
            const screenPos = camera.worldToScreen(worldPos);

            const opacity = particle.getCurrentOpacity();
            const size = particle.getCurrentSize();

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.font = `${size * scaledTileSize}px PressStart2P`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = particle.color;
            ctx.fillText(particle.text, screenPos.x, screenPos.y);
            ctx.restore();
        }
    }

    #renderUI(uiManager) {

        if (!uiManager.isAnyMenuVisible()) return;

        if (!uiManager.isMenuVisible('hud')) {
            this.#renderMenuOverlay();
        }

        this.#renderMenu(uiManager);
    }

    #renderMenu(uiManager) {
        const elements = uiManager.getActiveMenuElements();
        const ctx = this.#ctx;

        const renderElement = (el) => {
            if (el.type == 'text') {
                ctx.font = '28px PressStart2P';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';

                ctx.lineWidth = 6;
                ctx.strokeStyle = 'black';
                ctx.strokeText(el.text, el.x, el.y);

                ctx.fillStyle = '#fff';
                ctx.fillText(el.text, el.x, el.y);
            } else if (el.type == 'image') {
                const sprite = this.#spriteAtlas[el.spriteName];
                ctx.drawImage(sprite, el.x, el.y, el.width, el.height);
            } else if (el.type == '9slice') {
                const sprite = this.#spriteAtlas[el.spriteName];

                const x = el.x;
                const y = el.y;
                const width = el.width;
                const height = el.height;
                const slice = el.sliceBorder || 8;

                if (el.spriteName == 'health-bar.png') {
                    const padding = 4;
                    const innerX = x + padding;
                    const innerY = y + padding;
                    const innerWidth = width - padding * 2;
                    const innerHeight = height - padding * 2;

                    const hpRatio = uiManager.getPlayerHealthRatio();
                    const hpBarWidth = innerWidth * hpRatio;

                    ctx.fillStyle = '#202e37';
                    ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

                    ctx.fillStyle = '#a53030';
                    ctx.fillRect(innerX, innerY, hpBarWidth, innerHeight);
                }

                this.#draw9Slice(sprite, x, y, width, height, slice);
            }

            if (el.children && Array.isArray(el.children)) {
                for (const child of el.children) {
                    renderElement(child);
                }
            }
        };

        for (const el of elements) {
            renderElement(el);
        }
    }

    #renderMenuOverlay() {
        const ctx = this.#ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    }

    #draw9Slice(sprite, x, y, width, height, slice) {
        const ctx = this.#ctx;
        const sw = sprite.width;
        const sh = sprite.height;

        const s = slice;
        const dw = width;
        const dh = height;

        const drawPart = (sx, sy, sw, sh, dx, dy, dw, dh) => {
            ctx.drawImage(
                sprite,
                Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh),
                Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh)
            );
        };

        // corners
        drawPart(0, 0, s, s, x, y, s, s); // top-left
        drawPart(sw - s, 0, s, s, x + dw - s, y, s, s); // top-right
        drawPart(0, sh - s, s, s, x, y + dh - s, s, s); // bottom-left
        drawPart(sw - s, sh - s, s, s, x + dw - s, y + dh - s, s, s); // bottom-right

        // edges
        drawPart(s, 0, sw - 2 * s, s, x + s, y, dw - 2 * s, s); // top
        drawPart(s, sh - s, sw - 2 * s, s, x + s, y + dh - s, dw - 2 * s, s); // bottom
        drawPart(0, s, s, sh - 2 * s, x, y + s, s, dh - 2 * s); // left
        drawPart(sw - s, s, s, sh - 2 * s, x + dw - s, y + s, s, dh - 2 * s); // right

        // center
        drawPart(s, s, sw - 2 * s, sh - 2 * s, x + s, y + s, dw - 2 * s, dh - 2 * s);
    }
}
