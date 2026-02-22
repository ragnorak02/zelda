/**
 * Entry point — sets up the canvas, handles resize, and starts the game.
 */

import { Game } from './game.js';

// ── Global error handlers ──
window.addEventListener('error', (e) => {
    console.error('[zelda] Uncaught error:', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
    console.error('[zelda] Unhandled promise rejection:', e.reason);
});

function resizeCanvas(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[zelda] #game-canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('[zelda] Could not get 2d context from canvas');
        return;
    }

    resizeCanvas(canvas);

    const game = new Game(canvas);

    window.addEventListener('resize', () => {
        resizeCanvas(canvas);
        game.resize(canvas.width, canvas.height);
    });

    game.start();
});
