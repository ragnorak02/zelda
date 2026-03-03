/**
 * SettingsMenu — DOM-based overlay for game settings.
 *
 * Opened from the pause menu "Settings" button.
 * Settings: Control Hints toggle, Debug Overlay toggle, Volume slider.
 * Gamepad: D-pad up/down to navigate, A to toggle/adjust, B to close.
 * All settings persist to localStorage.
 */

import { SETTINGS_DEFAULTS } from './constants.js';

const STORAGE_KEY = 'zelda_settings';

export class SettingsMenu {
    constructor() {
        this.overlay = null;
        this._onClose = null;
        this._itemIndex = 0;
        this._stickCooldown = 0;
        this._items = [];

        // Load persisted settings or use defaults
        this.values = this._load();
    }

    /** Current setting values (live reference). */
    get showControlHints() { return this.values.showControlHints; }
    get showDebugOverlay() { return this.values.showDebugOverlay; }
    get volume() { return this.values.volume; }

    /**
     * Show the settings menu.
     * @param {Function} onClose  Called when menu is dismissed.
     */
    open(onClose) {
        if (this.overlay) return;
        this._onClose = onClose;
        this._itemIndex = 0;
        this._stickCooldown = 0;
        this._build();
    }

    close() {
        if (!this.overlay) return;
        this._save();
        this.overlay.remove();
        this.overlay = null;
        this._items = [];
        if (this._onClose) this._onClose();
        this._onClose = null;
    }

    toggle(onClose) {
        if (this.overlay) {
            this.close();
        } else {
            this.open(onClose);
        }
    }

    isActive() {
        return !!this.overlay;
    }

    // ── Gamepad navigation ──

    updateGamepad(dt, input) {
        if (!this.overlay) return;

        if (this._stickCooldown > 0) {
            this._stickCooldown -= dt;
        }

        // B to close
        if (input.actionPressed('dodge')) {
            this.close();
            return;
        }

        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }

        if (gp && this._stickCooldown <= 0) {
            const dUp = gp.buttons[12] && gp.buttons[12].pressed;
            const dDown = gp.buttons[13] && gp.buttons[13].pressed;
            const dLeft = gp.buttons[14] && gp.buttons[14].pressed;
            const dRight = gp.buttons[15] && gp.buttons[15].pressed;
            const ly = gp.axes[1] || 0;
            const lx = gp.axes[0] || 0;
            const stickUp = ly < -0.5;
            const stickDown = ly > 0.5;
            const stickLeft = lx < -0.5;
            const stickRight = lx > 0.5;

            let moved = false;

            // Up/down to navigate items
            if (dUp || stickUp) {
                this._itemIndex = Math.max(0, this._itemIndex - 1);
                moved = true;
            } else if (dDown || stickDown) {
                this._itemIndex = Math.min(this._items.length - 1, this._itemIndex + 1);
                moved = true;
            }

            // Left/right to adjust slider values
            if (dLeft || stickLeft) {
                this._adjustItem(this._itemIndex, -1);
                moved = true;
            } else if (dRight || stickRight) {
                this._adjustItem(this._itemIndex, 1);
                moved = true;
            }

            if (moved) {
                this._stickCooldown = 0.18;
                this._updateHighlight();
            }
        }

        // A button → toggle/activate selected item
        if (input.actionPressed('jump')) {
            this._activateItem(this._itemIndex);
        }
    }

    // ── Build DOM ──

    _build() {
        const el = document.createElement('div');
        el.id = 'settings-menu';
        el.innerHTML = `
            <div class="settings-panel">
                <h2>SETTINGS</h2>
                <div class="settings-list">
                    <div class="settings-item" data-key="showControlHints" data-type="toggle">
                        <span class="settings-label">Control Hints</span>
                        <span class="settings-value">${this.values.showControlHints ? 'ON' : 'OFF'}</span>
                    </div>
                    <div class="settings-item" data-key="showDebugOverlay" data-type="toggle">
                        <span class="settings-label">Debug Overlay</span>
                        <span class="settings-value">${this.values.showDebugOverlay ? 'ON' : 'OFF'}</span>
                    </div>
                    <div class="settings-item" data-key="volume" data-type="slider">
                        <span class="settings-label">Volume</span>
                        <div class="settings-slider-wrap">
                            <div class="settings-slider-track">
                                <div class="settings-slider-fill" style="width:${Math.round(this.values.volume * 100)}%"></div>
                            </div>
                            <span class="settings-value">${Math.round(this.values.volume * 100)}%</span>
                        </div>
                    </div>
                </div>
                <div class="settings-close-hint">A — Toggle / Adjust &nbsp;&nbsp; D-pad — Navigate &nbsp;&nbsp; B / Esc — Close</div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlay = el;

        // Gather item refs for gamepad nav
        this._items = Array.from(el.querySelectorAll('.settings-item'));
        this._updateHighlight();

        // Click handlers
        this._items.forEach((item, i) => {
            item.addEventListener('click', () => {
                this._itemIndex = i;
                this._activateItem(i);
                this._updateHighlight();
            });
        });

        // Close on click outside panel
        el.addEventListener('click', (e) => {
            if (e.target === el) this.close();
        });
    }

    _updateHighlight() {
        for (const item of this._items) {
            item.classList.remove('gp-selected');
        }
        if (this._items[this._itemIndex]) {
            this._items[this._itemIndex].classList.add('gp-selected');
        }
    }

    _activateItem(index) {
        const item = this._items[index];
        if (!item) return;
        const key = item.dataset.key;
        const type = item.dataset.type;

        if (type === 'toggle') {
            this.values[key] = !this.values[key];
            this._refreshItemDisplay(item, key);
            this._save();
        } else if (type === 'slider') {
            // A button on slider bumps by +10%, wraps at 100->0
            this.values[key] = Math.round((this.values[key] + 0.1) * 10) / 10;
            if (this.values[key] > 1.0) this.values[key] = 0;
            this._refreshItemDisplay(item, key);
            this._save();
        }
    }

    _adjustItem(index, direction) {
        const item = this._items[index];
        if (!item) return;
        const key = item.dataset.key;
        const type = item.dataset.type;

        if (type === 'slider') {
            const step = 0.05;
            this.values[key] = Math.round(Math.min(1, Math.max(0, this.values[key] + direction * step)) * 100) / 100;
            this._refreshItemDisplay(item, key);
            this._save();
        } else if (type === 'toggle') {
            // Left/right also toggles booleans
            this.values[key] = !this.values[key];
            this._refreshItemDisplay(item, key);
            this._save();
        }
    }

    _refreshItemDisplay(item, key) {
        const type = item.dataset.type;
        if (type === 'toggle') {
            item.querySelector('.settings-value').textContent = this.values[key] ? 'ON' : 'OFF';
        } else if (type === 'slider') {
            const pct = Math.round(this.values[key] * 100);
            item.querySelector('.settings-value').textContent = pct + '%';
            const fill = item.querySelector('.settings-slider-fill');
            if (fill) fill.style.width = pct + '%';
        }
    }

    // ── Persistence ──

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
        } catch (err) {
            console.error('[SettingsMenu] Save failed:', err);
        }
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    showControlHints: parsed.showControlHints !== undefined ? !!parsed.showControlHints : SETTINGS_DEFAULTS.showControlHints,
                    showDebugOverlay: parsed.showDebugOverlay !== undefined ? !!parsed.showDebugOverlay : SETTINGS_DEFAULTS.showDebugOverlay,
                    volume: parsed.volume !== undefined ? Number(parsed.volume) : SETTINGS_DEFAULTS.volume,
                };
            }
        } catch (err) {
            console.error('[SettingsMenu] Load failed:', err);
        }
        return { ...SETTINGS_DEFAULTS };
    }
}
