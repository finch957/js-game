import { Coord } from './utils.js';
import { TILE_SIZE, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, MOUSE_DRAG_THRESHOLD } from './constants.js';

export class InputHandler {
    #player;
    #level;
    #canvas;
    #camera;
    #uiManager;
    #mouseDown = false;
    #mouseMoved = false;
    #lastMousePos;

    constructor(player, level, canvas, camera, uiManager) {
        this.#player = player;
        this.#level = level;
        this.#canvas = canvas;
        this.#camera = camera;
        this.#uiManager = uiManager;

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('wheel', this.#onWheel.bind(this), { passive: false });
        canvas.addEventListener('mousedown', this.#onMouseDown.bind(this));
        canvas.addEventListener('mouseup', this.#onMouseUp.bind(this));
        canvas.addEventListener('mousemove', this.#onMouseMove.bind(this));
    }

    setLevel(newLevel) {
        this.#level = newLevel;
    }

    setPlayer(newPlayer) {
        this.#player = newPlayer;
    }

    onKeyDown(event) {
        if (this.#uiManager.shouldLockInput()) return;

        const pos = this.#player.getPosition();
        let target = null;

        switch (event.key) {
            case ' ':
                if (this.#player.isMoving()) {
                    this.#player.clearPath();
                    return;
                }
                this.#player.skipTick();
                break;
            case 'ArrowUp':
                target = new Coord(pos.x, pos.y - 1);
                break;
            case 'ArrowDown':
                target = new Coord(pos.x, pos.y + 1);
                break;
            case 'ArrowLeft':
                target = new Coord(pos.x - 1, pos.y);
                break;
            case 'ArrowRight':
                target = new Coord(pos.x + 1, pos.y);
                break;
            default:
                return;
        }

        if (this.#player.isMoving()) {
            if (target) this.#player.clearPath();
            return;
        }

        if (!target) return;

        if (this.#level.getTile(target).isWalkable()) {
            this.#player.setPath([target])
            this.#camera.follow(this.#player);
        }
    }

    #onMouseDown(event) {
        if (event.button != 0) return;
        this.#mouseDown = true;
        this.#mouseMoved = false;
        this.#lastMousePos = { x: event.clientX, y: event.clientY };
    }

    #onMouseMove(event) {
        if (!this.#mouseDown) return;

        const rect = this.#canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const dx = mouseX - this.#lastMousePos.x;
        const dy = mouseY - this.#lastMousePos.y;

        if (Math.abs(dx) > MOUSE_DRAG_THRESHOLD || Math.abs(dy) > MOUSE_DRAG_THRESHOLD) {
            this.#mouseMoved = true;
            const uiManager = this.#uiManager;
            const isOnlyHUDVisible = uiManager.isMenuVisible('hud') && uiManager.getActiveMenus().length == 1;
            if (!uiManager.isAnyMenuVisible() || isOnlyHUDVisible) {
                this.#panCamera(dx, dy);
                this.#lastMousePos = { x: event.clientX, y: event.clientY };
            } else if (!isOnlyHUDVisible) {
                uiManager.handlePointerEvent(mouseX, mouseY, 'drag');
            }
        }
    }

    #onMouseUp(event) {
        if (event.button != 0) return;

        const uiManager = this.#uiManager;
        this.#mouseDown = false;

        const rect = this.#canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (!this.#mouseMoved) {
            const isAnyMenuVisible = uiManager.isAnyMenuVisible();
            const isOnlyHUDVisible = uiManager.isMenuVisible('hud') && uiManager.getActiveMenus().length == 1;
            const isPlayerMoving = this.#player.isMoving();

            let uiClicked = false;

            if (isAnyMenuVisible) {
                if (isOnlyHUDVisible && !isPlayerMoving) {
                    uiClicked = uiManager.handlePointerEvent(mouseX, mouseY, 'click');
                } else if (!isOnlyHUDVisible) {
                    uiClicked = uiManager.handlePointerEvent(mouseX, mouseY, 'click');
                }
            }
            if (!uiClicked && !uiManager.shouldLockInput()) {
                this.#handleClickOnWorld(mouseX, mouseY);
            }
        } else {
            uiManager.handlePointerEvent(mouseX, mouseY, 'release');
        }
    }

    #handleClickOnWorld(mouseX, mouseY) {
        if (this.#player.isMoving()) {
            this.#player.clearPath();
            return;
        }

        const worldCoord = this.#camera.screenToWorld(mouseX, mouseY);
        const targetTile = new Coord(Math.floor(worldCoord.x), Math.floor(worldCoord.y));
        const playerPos = this.#player.getPosition();

        if (targetTile.equals(playerPos)) return;

        const path = this.#level.findPath(playerPos, targetTile, { filter: (coord) => {
            const entity = this.#level.getEntityAt(coord);
            const structure = this.#level.getStructure(coord);
            return this.#level.getTile(coord).isWalkable()
                    && (!entity || coord.equals(targetTile))
                    && (!structure || structure.isWalkable() || coord.equals(targetTile));
        }});

        if (!path || path.length < 1) return;

        this.#player.setPath(path);
        this.#camera.follow(this.#player);
    }

    #onWheel(event) {
        if (!this.#uiManager.isAnyMenuVisible() || !this.#uiManager.isMenuVisible('hud')) return;

        event.preventDefault();
        const delta = Math.sign(event.deltaY);
        const newZoom = this.#camera.getZoom() - delta * ZOOM_STEP;
        this.#camera.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));
    }

    #panCamera(dx, dy) {
        const position = this.#camera.getPosition();
        const zoom = this.#camera.getZoom();
        const newPosition = new Coord(
            position.x - dx / (TILE_SIZE * zoom),
            position.y - dy / (TILE_SIZE * zoom)
        );
        this.#camera.unfollow();
        this.#camera.setPosition(newPosition);
    }
}
