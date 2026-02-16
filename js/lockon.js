/**
 * LockOnSystem — optional target lock for directional combat.
 *
 * When locked on:
 *   - player.facing always points at the target
 *   - movement becomes strafing (world-space directions still, but player faces enemy)
 *   - weapons fire toward the locked target
 *
 * When unlocked:
 *   - free movement / facing follows input
 *
 * Toggle with Tab (keyboard) or mobile lock-on button.
 */

import { distance, normalize } from './utils.js';

const ACQUIRE_RANGE = 400;  // max range to lock onto a new target
const BREAK_RANGE = 600;    // auto-release if target exceeds this distance

export class LockOnSystem {
    constructor() {
        this.target = null;
    }

    /** Toggle lock-on: if locked, release; if free, acquire nearest. */
    toggle(player, enemies) {
        if (this.target) {
            this.target = null;
        } else {
            this.target = this._findNearest(player, enemies);
        }
    }

    /** Call every frame to auto-release dead / out-of-range targets. */
    update(player, enemies) {
        if (!this.target) return;

        if (this.target.dead || distance(player, this.target) > BREAK_RANGE) {
            this.target = null;
        }
    }

    /** Direction from player toward locked target (or null). */
    getAttackDirection(player) {
        if (!this.target) return null;
        return normalize(this.target.x - player.x, this.target.y - player.y);
    }

    isLocked() {
        return this.target !== null;
    }

    // ── Rendering (reticle on locked enemy) ──

    render(ctx, camera) {
        if (!this.target || this.target.dead) return;

        const s = camera.worldToScreen(this.target.x, this.target.y);
        const r = this.target.radius + 14;
        const rot = performance.now() / 1000 * 1.5;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(rot);

        // Rotating diamond
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r);
        ctx.lineTo(-r, 0);
        ctx.closePath();
        ctx.stroke();

        // Corner tick marks
        const t = r * 0.25;
        ctx.beginPath();
        ctx.moveTo(-t, -r); ctx.lineTo(0, -r - t); ctx.lineTo(t, -r);
        ctx.moveTo(r, -t);  ctx.lineTo(r + t, 0);  ctx.lineTo(r, t);
        ctx.moveTo(-t, r);  ctx.lineTo(0, r + t);  ctx.lineTo(t, r);
        ctx.moveTo(-r, -t); ctx.lineTo(-r - t, 0); ctx.lineTo(-r, t);
        ctx.stroke();

        ctx.restore();
    }

    // ── Internals ──

    _findNearest(player, enemies) {
        let best = null;
        let bestDist = ACQUIRE_RANGE;

        for (const e of enemies) {
            if (e.dead) continue;
            const d = distance(player, e);
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        return best;
    }
}
