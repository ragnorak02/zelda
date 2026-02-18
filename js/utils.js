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

/** Lighten a hex color by amount (0-255). */
export function lightenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' + [r, g, b].map(c =>
        Math.min(255, c + amount).toString(16).padStart(2, '0')
    ).join('');
}

/** Darken a hex color by amount (0-255). */
export function darkenColor(hex, amount) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' + [r, g, b].map(c =>
        Math.max(0, c - amount).toString(16).padStart(2, '0')
    ).join('');
}
