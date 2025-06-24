import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { Level } from '../game/level.js';
import { Player } from '../game/player.js';
import { InputHandler } from './input-handler.js';
import { Coord } from './utils.js';
import { UIManager } from '../ui/ui-manager.js';
import { ParticleManager } from '../ui/particle-manager.js';
import { LootManager } from '../game/loot-manager.js';

export class GameManager {
    #canvas;
    #ctx;
    #player;
    #camera;
    #renderer;
    #input;
    #levels = [];
    #activeLevelIndex = 0;
    #level;
    #uiManager;
    #particleManager;
    #lootManager;
    #lastTime = performance.now();

    constructor(canvas) {
        this.#canvas = canvas;
        this.#ctx = canvas.getContext('2d');
    }

    async init() {
        this.#renderer = new Renderer(this.#ctx);
        await this.#renderer.init();

        this.#camera = new Camera(this.#canvas.width, this.#canvas.height);

        this.#uiManager = new UIManager(
            () => {
                this.restart();
            },
            this.getTickFunction()
        );

        this.#particleManager = new ParticleManager();
        this.#lootManager = new LootManager();

        this.#input = new InputHandler(null, this.#level, this.#canvas, this.#camera, this.#uiManager);

        this.resize();
        this.restart();

        requestAnimationFrame(this.#gameLoop.bind(this));
    }

    restart() {
        this.#player = new Player(new Coord(0, 0));

        this.#input.setPlayer(this.#player);
        this.#uiManager.setPlayer(this.#player);

        this.#uiManager.updateInventoryData();

        this.#camera.follow(this.#player);
        this.#camera.setZoom(4);

        this.#levels = [];
        this.#activeLevelIndex = 0;
        this.#changeLevel(0);

        this.#player.init(
            this.getTickFunction(),
            () => {
                this.#uiManager.hideAll();
                this.#uiManager.showMenu('death');
            },
            () => {
                this.#uiManager.updateInventoryData(this.#player.getInventory());
            },
            this.getPlaceItemFunction(),
            this.#changeLevel.bind(this)
        );
    }

    getTickFunction() {
        return () => this.#level.incrementTick();
    }

    getPlaceItemFunction() {
        return (coord, item) => this.#level.placeItemAt(coord, item);
    }

    #changeLevel(direction) {
        this.#activeLevelIndex += direction;
        const index = this.#activeLevelIndex;
        if (!this.#levels[index]) {
            const levelSize = 20 * (index == 0 ? 1 : index < 8 ? 2 : Math.floor(Math.log2(index)));
            this.#levels[index] = new Level(
                levelSize, levelSize, this.#player, index,
                this.#particleManager.addParticle.bind(this.#particleManager),
                this.#lootManager.generateLoot.bind(this.#lootManager)
            );
        }

        this.#level = this.#levels[index];
        this.#input.setLevel(this.#level);

        if (direction < 0) {
            this.#player.setPosition(this.#level.getExitPoint());
        } else {
            this.#player.setPosition(this.#level.getEntryPoint());
        }
        this.#level.updateFOV();
    }

    #gameLoop(currentTime) {
        const deltaTime = (currentTime - this.#lastTime) / 1000;
        this.#lastTime = currentTime;

        for (const entity of this.#level.getEntities()) {
            entity.advanceMovement(this.#level, deltaTime);
        }

        this.#uiManager.updateHudData(this.#player.getHealth(), this.#player.getMaxHealth(), this.#player.getScore(), this.#level.getLevelIndex());
        this.#camera.update();
        this.#particleManager.update(deltaTime);

        this.#renderer.render(this.#level, this.#camera, this.#uiManager, this.#particleManager);
        requestAnimationFrame(this.#gameLoop.bind(this));
    }

    resize() {
        this.#canvas.width = window.innerWidth;
        this.#canvas.height = window.innerHeight;
        this.#camera.resize(this.#canvas.width, this.#canvas.height);
        this.#uiManager.resize(this.#canvas.width, this.#canvas.height);
        this.#ctx.imageSmoothingEnabled = false;
    }
}
