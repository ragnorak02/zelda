/**
 * Math and collision utilities shared across modules.
 */

export function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(x, y) {
    const len = Math.sqrt(x * x + y * y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}
