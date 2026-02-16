/**
 * Camera that follows a target and converts world ↔ screen coordinates.
 */

import { clamp } from './utils.js';
import { WORLD } from './constants.js';

export class Camera {
    constructor(viewWidth, viewHeight) {
        this.x = 0;
        this.y = 0;
        this.width = viewWidth;
        this.height = viewHeight;
    }

    /** Center the camera on a target, clamped to world bounds. */
    follow(target) {
        this.x = clamp(target.x - this.width / 2, 0, WORLD.WIDTH - this.width);
        this.y = clamp(target.y - this.height / 2, 0, WORLD.HEIGHT - this.height);
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
