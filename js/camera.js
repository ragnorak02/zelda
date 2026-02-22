/**
 * Camera that follows a target and converts world ↔ screen coordinates.
 */

import { clamp } from './utils.js';
import { WORLD, SCREEN_SHAKE } from './constants.js';

export class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0;
        this.y = 0;
        this.width = viewWidth;
        this.height = viewHeight;

        // Screen shake state
        this._shakeIntensity = 0;
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
    }

    /** Center the camera on a target, clamped to world bounds. */
    follow(target) {
        this.x = clamp(target.x - this.width / 2, 0, WORLD.WIDTH - this.width);
        this.y = clamp(target.y - this.height / 2, 0, WORLD.HEIGHT - this.height);
        // Apply shake offset
        this.x += this._shakeOffsetX;
        this.y += this._shakeOffsetY;
    }

    /** Trigger a camera shake. Stacks with current shake (takes max intensity). */
    shake(duration, intensity) {
        // Duration isn't tracked — we use intensity decay instead
        this._shakeIntensity = Math.min(
            Math.max(this._shakeIntensity, intensity),
            SCREEN_SHAKE.MAX_INTENSITY
        );
    }

    /** Decay shake and compute offset. Call before follow() each frame. */
    updateShake(dt) {
        if (this._shakeIntensity <= 0) {
            this._shakeOffsetX = 0;
            this._shakeOffsetY = 0;
            return;
        }
        this._shakeIntensity -= SCREEN_SHAKE.DECAY_RATE * dt;
        if (this._shakeIntensity < 0) this._shakeIntensity = 0;
        this._shakeOffsetX = (Math.random() - 0.5) * 2 * this._shakeIntensity;
        this._shakeOffsetY = (Math.random() - 0.5) * 2 * this._shakeIntensity;
    }

    /** Convert a world position to screen coordinates. */
    worldToScreen(wx, wy) {
        return { x: wx - this.x, y: wy - this.y };
    }

    /** Check if a world position is within the visible area (with optional margin). */
    isVisible(wx, wy, margin = 50) {
        return (
            wx > this.x - margin &&
            wx < this.x + this.width + margin &&
            wy > this.y - margin &&
            wy < this.y + this.height + margin
        );
    }
}
