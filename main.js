import { loadGameData } from './core/data-loader.js';
import { GameManager } from './core/game-manager.js';

const canvas = document.getElementById('game');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

await loadGameData();

const game = new GameManager(canvas);
await game.init();

window.addEventListener('resize', () => {
    game.resize();
});
