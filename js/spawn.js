/**
 * SpawnSystem v2 — Spawn-point-based with cooldowns, density caps, anti-camping.
 *
 * Pressure fills over time.  When it maxes out a 10-second survival countdown
 * begins with increased spawn intensity.  Surviving advances the level.
 *
 * Enemies now spawn ONLY at designated EnemySpawnPoints (from constants.js),
 * never randomly off-screen.  Each point has its own cooldown, density cap,
 * and zone-awareness.
 */

import { ENEMY_SPAWN_POINTS, SPAWN_CONFIG, DEBUG_SPAWN } from './constants.js';
import { distance } from './utils.js';

const SPAWN_PRESSURE = { MAX: 100, BASE_RATE: 2, LEVEL_MULTIPLIER: 0.5, COUNTDOWN_DURATION: 10 };

export class SpawnSystem {
    constructor(enemyManager) {
        this.enemyManager = enemyManager;
        this.world = null;
        this.pressure = 0;
        this.countdownActive = false;
        this.countdownTimer = SPAWN_PRESSURE.COUNTDOWN_DURATION;
        this.spawnTimer = 0;
        this.level = 1;
        this.levelComplete = false;

        // Per-point cooldown tracking: Map<id, { cooldownRemaining }>
        this.pointStates = new Map();
        for (const pt of ENEMY_SPAWN_POINTS) {
            this.pointStates.set(pt.id, { cooldownRemaining: 0 });
        }
    }

    setWorld(world) {
        this.world = world;
    }

    /** Reset for a new level. */
    reset(level) {
        this.level = level;
        this.pressure = 0;
        this.countdownActive = false;
        this.countdownTimer = SPAWN_PRESSURE.COUNTDOWN_DURATION;
        this.spawnTimer = 0;
        this.levelComplete = false;

        // Reset all point cooldowns
        for (const [, state] of this.pointStates) {
            state.cooldownRemaining = 0;
        }
    }

    update(dt, camera, player) {
        if (this.levelComplete) return;

        // Tick down per-point cooldowns
        for (const [, state] of this.pointStates) {
            if (state.cooldownRemaining > 0) {
                state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dt * 1000);
            }
        }

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
            this._spawnFromPoints(camera, player);

            // Interval shrinks with pressure and level
            const baseInterval = Math.max(0.6, 2 - (this.level - 1) * 0.1);
            const pressureFactor = 1 - (this.pressure / SPAWN_PRESSURE.MAX) * 0.7;
            const countdownFactor = this.countdownActive ? 0.5 : 1;
            this.spawnTimer = Math.max(0.2, baseInterval * pressureFactor * countdownFactor);
        }
    }

    // ── Spawn-point logic ──

    _spawnFromPoints(camera, player) {
        const budget = this.countdownActive
            ? (2 + Math.floor(this.level / 2)) * 2
            : 1 + Math.floor(this.level / 2);

        // Collect eligible points
        const eligible = [];
        for (const pt of ENEMY_SPAWN_POINTS) {
            const state = this.pointStates.get(pt.id);

            // On cooldown
            if (state.cooldownRemaining > 0) continue;

            // Zone blocked (spawn restriction)
            if (this.world && this.world.isSpawnBlocked(pt.x, pt.y)) continue;

            // Density cap — count alive enemies near this point
            const nearCount = this._countNearPoint(pt);
            if (nearCount >= pt.maxAlive) continue;

            // Anti-camping — too close to player
            if (player) {
                const dx = pt.x - player.x;
                const dy = pt.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < SPAWN_CONFIG.MIN_PLAYER_DISTANCE) continue;
            }

            eligible.push(pt);
        }

        if (eligible.length === 0) return;

        // Sort: prefer offscreen points (further from camera center)
        if (SPAWN_CONFIG.PREFER_OFFSCREEN && camera) {
            const camCX = camera.x + camera.width / 2;
            const camCY = camera.y + camera.height / 2;
            eligible.sort((a, b) => {
                const distA = Math.abs(a.x - camCX) + Math.abs(a.y - camCY);
                const distB = Math.abs(b.x - camCX) + Math.abs(b.y - camCY);
                return distB - distA; // further points first
            });
        }

        // Spawn from up to `budget` points
        const toSpawn = Math.min(budget, eligible.length);
        for (let i = 0; i < toSpawn; i++) {
            const pt = eligible[i];
            const state = this.pointStates.get(pt.id);

            this.enemyManager.spawn(pt.enemyType, pt.x, pt.y, this.level);

            // Apply cooldown with level scaling
            const cdMult = Math.max(0.3,
                SPAWN_CONFIG.BASE_COOLDOWN_MULT - (this.level - 1) * SPAWN_CONFIG.LEVEL_COOLDOWN_REDUCTION
            );
            state.cooldownRemaining = pt.cooldownMs * cdMult;

            if (DEBUG_SPAWN) {
                console.log(`[spawn] ${pt.id}: spawned ${pt.enemyType} at (${pt.x}, ${pt.y}), cooldown=${state.cooldownRemaining.toFixed(0)}ms`);
            }
        }
    }

    /** Count alive enemies within a spawn point's radius. */
    _countNearPoint(pt) {
        let count = 0;
        for (const enemy of this.enemyManager.getEnemies()) {
            if (enemy.dead) continue;
            const dx = enemy.x - pt.x;
            const dy = enemy.y - pt.y;
            if (dx * dx + dy * dy < pt.radiusPx * pt.radiusPx) {
                count++;
            }
        }
        return count;
    }

    /** Returns debug data for the spawn overlay. */
    getDebugData() {
        const data = [];
        for (const pt of ENEMY_SPAWN_POINTS) {
            const state = this.pointStates.get(pt.id);
            data.push({
                ...pt,
                cooldownRemaining: state.cooldownRemaining,
                nearbyCount: this._countNearPoint(pt),
                zoneBlocked: this.world ? this.world.isSpawnBlocked(pt.x, pt.y) : false,
            });
        }
        return data;
    }

    /** 0–1 value for the HUD bar. */
    getPressurePercent() {
        return this.pressure / SPAWN_PRESSURE.MAX;
    }
}
