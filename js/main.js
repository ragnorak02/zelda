/**
 * Entry point — sets up the canvas, handles resize, and starts the game.
 */

import { Game } from './game.js';

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    resizeCanvas(canvas);

    const game = new Game(canvas);

    window.addEventListener('resize', () => {
        resizeCanvas(canvas);
        game.resize(canvas.width, canvas.height);
    });

    game.start();
});
