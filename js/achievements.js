/**
 * AchievementManager — tracks and unlocks achievements with localStorage persistence.
 *
 * Loads definitions from achievements.json at boot.
 * Unlock state persisted to 'zelda_achievements' localStorage key.
 * Provides toast callback for UI notification.
 */

const STORAGE_KEY = 'zelda_achievements';

export class AchievementManager {
    constructor() {
        this.achievements = [];         // Full definitions from JSON
        this.unlocked = new Set();      // Set of unlocked achievement IDs
        this.toastQueue = [];           // Pending toast notifications
        this._loaded = false;
    }

    async init() {
        try {
            const resp = await fetch('achievements.json');
            this.achievements = await resp.json();
        } catch (err) {
            console.warn('[achievements] Failed to load achievements.json:', err);
            this.achievements = [];
        }

        // Load persisted unlock state
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const ids = JSON.parse(raw);
                for (const id of ids) this.unlocked.add(id);
            }
        } catch {
            // Corrupted — start fresh
        }
        this._loaded = true;
    }

    /**
     * Attempt to unlock an achievement by ID.
     * Returns true if newly unlocked, false if already unlocked or not found.
     */
    unlock(id) {
        if (this.unlocked.has(id)) return false;
        const def = this.achievements.find(a => a.id === id);
        if (!def) return false;

        this.unlocked.add(id);
        this._save();
        this.toastQueue.push(def);
        return true;
    }

    isUnlocked(id) {
        return this.unlocked.has(id);
    }

    getAll() {
        return this.achievements;
    }

    getUnlockedCount() {
        return this.unlocked.size;
    }

    getTotalCount() {
        return this.achievements.length;
    }

    getTotalPoints() {
        return this.achievements
            .filter(a => this.unlocked.has(a.id))
            .reduce((sum, a) => sum + (a.points || 0), 0);
    }

    /** Pop next toast, or null if queue empty. */
    popToast() {
        return this.toastQueue.shift() || null;
    }

    /** Get serializable state for save system. */
    getSaveData() {
        return Array.from(this.unlocked);
    }

    /** Restore state from save data. */
    loadSaveData(ids) {
        if (Array.isArray(ids)) {
            for (const id of ids) this.unlocked.add(id);
            this._save();
        }
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.unlocked)));
        } catch (err) {
            console.warn('[achievements] Save failed:', err);
        }
    }
}
