/**
 * Spawn pressure system.
 *
 * Pressure fills over time.  When it maxes out a 10-second survival countdown
 * begins with increased spawn intensity.  Surviving advances the level.
 */

import { WORLD } from './constants.js';

const SPAWN_PRESSURE = { MAX: 100, BASE_RATE: 2, LEVEL_MULTIPLIER: 0.5, COUNTDOWN_DURATION: 10 };
import { randomInRange } from './utils.js';

export class SpawnSystem {
    constructor(enemyManager) {
        this.enemyManager = enemyManager;
        this.pressure = 0;
        this.countdownActive = false;
        this.countdownTimer = SPAWN_PRESSURE.COUNTDOWN_DURATION;
        this.spawnTimer = 0;
        this.level = 1;
        this.levelComplete = false;
    }

    /** Reset for a new level. */
    reset(level) {
        this.level = level;
        this.pressure = 0;
        this.countdownActive = false;
        this.countdownTimer = SPAWN_PRESSURE.COUNTDOWN_DURATION;
        this.spawnTimer = 0;
        this.levelComplete = false;
    }

    update(dt, camera) {
        if (this.levelComplete) return;

        // Build pressure
        if (!this.countdownActive) {
            const rate = SPAWN_PRESSURE.BASE_RATE + (this.level - 1) * SPAWN_PRESSURE.LEVEL_MULTIPLIER;
            this.pressure += rate * dt;

            if (this.pressure >= SPAWN_PRESSURE.MAX) {
                this.pressure = SPAWN_PRESSURE.MAX;
                this.countdownActive = true;
                this.countdownTimer = SPAWN_PRESSURE.COUNTDOWN_DURATION;
            }
        } else {
            // Survival countdown
            this.countdownTimer -= dt;
            if (this.countdownTimer <= 0) {
                this.levelComplete = true;
                return;
            }
        }

        // Spawn loop
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this._spawnWave(camera);

            // Interval shrinks with pressure and level
            const baseInterval = Math.max(0.6, 2 - (this.level - 1) * 0.1);
            const pressureFactor = 1 - (this.pressure / SPAWN_PRESSURE.MAX) * 0.7;
            const countdownFactor = this.countdownActive ? 0.5 : 1;
            this.spawnTimer = Math.max(0.2, baseInterval * pressureFactor * countdownFactor);
        }
    }

    // ── Internals ──

    _spawnWave(camera) {
        const base = 1 + Math.floor(this.level / 2);
        const count = this.countdownActive ? base * 2 : base;

        for (let i = 0; i < count; i++) {
            const type = this._pickType();
            const pos = this._positionOffScreen(camera);
            this.enemyManager.spawn(type, pos.x, pos.y, this.level);
        }
    }

    _pickType() {
        const r = Math.random();
        if (this.level >= 3 && r < 0.15) return 'brute';
        if (this.level >= 2 && r < 0.25) return 'archer';
        if (r < 0.4) return 'imp';
        return 'shambler';
    }

    /** Random position just outside the visible area. */
    _positionOffScreen(camera) {
        const margin = 80;
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch (side) {
            case 0: // top
                x = randomInRange(camera.x - margin, camera.x + camera.width + margin);
                y = camera.y - margin;
                break;
            case 1: // bottom
                x = randomInRange(camera.x - margin, camera.x + camera.width + margin);
                y = camera.y + camera.height + margin;
                break;
            case 2: // left
                x = camera.x - margin;
                y = randomInRange(camera.y - margin, camera.y + camera.height + margin);
                break;
            default: // right
                x = camera.x + camera.width + margin;
                y = randomInRange(camera.y - margin, camera.y + camera.height + margin);
                break;
        }

        // Keep inside world bounds
        x = Math.max(20, Math.min(WORLD.WIDTH - 20, x));
        y = Math.max(20, Math.min(WORLD.HEIGHT - 20, y));
        return { x, y };
    }

    /** 0–1 value for the HUD bar. */
    getPressurePercent() {
        return this.pressure / SPAWN_PRESSURE.MAX;
    }
}
