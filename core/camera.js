import { Coord } from './utils.js';
import { TILE_SIZE } from './constants.js';

export class Camera {
    #position;
    #zoom;
    #canvasWidth;
    #canvasHeight;
    #renderAreaTopLeft;
    #renderAreaBottomRight;
    #followTarget;

    constructor(canvasWidth, canvasHeight, initialZoom = 4, entity) {
        this.#position = new Coord(0, 0);
        this.#zoom = initialZoom;
        this.#canvasWidth = canvasWidth;
        this.#canvasHeight = canvasHeight;
        this.#followTarget = entity;
        this.#updateRenderArea();
    }

    getPosition() {
        return this.#position;
    }

    setPosition(newPosition) {
        this.#position = newPosition;
        this.#updateRenderArea();
    }

    getZoom() {
        return this.#zoom;
    }

    setZoom(newZoom) {
        this.#zoom = newZoom;
        this.#updateRenderArea();
    }

    resize(canvasWidth, canvasHeight) {
        this.#canvasWidth = canvasWidth;
        this.#canvasHeight = canvasHeight;
        this.#updateRenderArea();
    }

    #updateRenderArea() {
        const tilesX = this.#canvasWidth / (TILE_SIZE * this.#zoom);
        const tilesY = this.#canvasHeight / (TILE_SIZE * this.#zoom);

        this.#renderAreaTopLeft = new Coord(
            Math.floor(this.#position.x - tilesX / 2),
            Math.floor(this.#position.y - tilesY / 2)
        );

        this.#renderAreaBottomRight = new Coord(
            Math.ceil(this.#position.x + tilesX / 2),
            Math.ceil(this.#position.y + tilesY / 2)
        );
    }

    getRenderArea() {
        return { topLeft: this.#renderAreaTopLeft, bottomRight: this.#renderAreaBottomRight };
    }

    follow(entity) {
        this.#followTarget = entity;
    }

    unfollow() {
        this.#followTarget = null;
    }

    update() {
        if (this.#followTarget) {
            this.setPosition(this.#followTarget.getDrawPosition());
        }
    }

    screenToWorld(screenX, screenY) {
        const scaledTileSize = TILE_SIZE * this.#zoom;
        const centerX = this.#canvasWidth / 2;
        const centerY = this.#canvasHeight / 2;

        const worldX = (screenX - centerX) / scaledTileSize + this.#position.x;
        const worldY = (screenY - centerY) / scaledTileSize + this.#position.y;

        return new Coord(worldX, worldY);
    }

    worldToScreen(worldCoord) {
        const scaledTileSize = TILE_SIZE * this.#zoom;
        const centerX = this.#canvasWidth / 2;
        const centerY = this.#canvasHeight / 2;

        const screenX = Math.floor((worldCoord.x - this.#position.x) * scaledTileSize + centerX);
        const screenY = Math.floor((worldCoord.y - this.#position.y) * scaledTileSize + centerY);

        return { x: screenX, y: screenY };
    }
}
