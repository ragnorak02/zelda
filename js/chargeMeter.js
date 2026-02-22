/**
 * ChargeMeter — stateless circular progress renderer for chargeable abilities.
 *
 * Draws a ring around the player that fills clockwise from top (12 o'clock)
 * as charge progresses. Optional tier threshold dots and flash effects.
 *
 * All charge state remains in the calling ability class.
 */

import { CHARGE_METER } from './constants.js';

/**
 * Render a circular charge meter around a screen position.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} screenX   Screen-space X center
 * @param {number} screenY   Screen-space Y center
 * @param {number} playerRadius  Player render radius
 * @param {number} progress  0..1 charge completion
 * @param {string} color     Foreground arc color
 * @param {object} [options]
 * @param {number[]} [options.tierThresholds] Array of 0..1 values where dots are drawn
 * @param {boolean}  [options.tierReached]    If true, flash the ring white briefly
 * @param {number}   [options.zOffset]        Y offset for airborne rendering
 */
export function renderChargeMeter(ctx, screenX, screenY, playerRadius, progress, color, options = {}) {
    const { tierThresholds, tierReached, zOffset = 0 } = options;
    const cfg = CHARGE_METER;
    const cx = screenX;
    const cy = screenY - zOffset;
    const radius = playerRadius + cfg.RADIUS_OFFSET;
    const startAngle = -Math.PI / 2; // 12 o'clock

    ctx.save();

    // Background ring (dim full circle)
    ctx.globalAlpha = cfg.BACKGROUND_ALPHA;
    ctx.strokeStyle = color;
    ctx.lineWidth = cfg.RING_WIDTH;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Foreground arc (progress fill, clockwise from top)
    ctx.globalAlpha = cfg.FOREGROUND_ALPHA;
    if (tierReached) {
        // White flash pulse when tier reached
        const flash = Math.sin(performance.now() / cfg.TIER_FLASH_SPEED) * 0.3 + 0.7;
        ctx.globalAlpha = flash;
        ctx.strokeStyle = '#fff';
    } else {
        ctx.strokeStyle = color;
    }
    ctx.lineWidth = cfg.RING_WIDTH;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + Math.PI * 2 * progress);
    ctx.stroke();

    // Tier threshold dots
    if (tierThresholds && tierThresholds.length > 0) {
        ctx.globalAlpha = 0.8;
        for (const t of tierThresholds) {
            const dotAngle = startAngle + Math.PI * 2 * t;
            const dx = cx + Math.cos(dotAngle) * radius;
            const dy = cy + Math.sin(dotAngle) * radius;
            ctx.fillStyle = progress >= t ? '#fff' : 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();
}
