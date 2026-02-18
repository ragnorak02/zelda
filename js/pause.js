/**
 * PauseManager — pause menu with game options.
 *
 * Menu: Resume, View Character, Save Game, Return to Main Menu.
 * Controls reference shown below the buttons.
 */

export class PauseManager {
    constructor() {
        this.paused = false;
        this.overlay = null;

        this._onResume = null;
        this._onViewCharacter = null;
        this._onSave = null;
        this._onMainMenu = null;

        // Gamepad navigation state
        this._pauseButtons = [];
        this._pauseIndex = 0;
        this._pauseStickCooldown = 0;
    }

    /** Register callbacks for each menu action. */
    setCallbacks({ onResume, onViewCharacter, onSave, onMainMenu }) {
        this._onResume = onResume;
        this._onViewCharacter = onViewCharacter;
        this._onSave = onSave;
        this._onMainMenu = onMainMenu;
    }

    toggle() {
        this.paused ? this.resume() : this.pause();
    }

    pause() {
        if (this.paused) return;
        this.paused = true;
        this._showOverlay();
    }

    resume() {
        if (!this.paused) return;
        this.paused = false;
        this._hideOverlay();
        if (this._onResume) this._onResume();
    }

    // ── Overlay ──

    _showOverlay() {
        if (this.overlay) return;

        const el = document.createElement('div');
        el.id = 'pause-overlay';
        el.innerHTML = `
            <div class="pause-panel">
                <h2>PAUSED</h2>
                <div class="pause-menu">
                    <button class="pause-btn" data-action="resume">Resume</button>
                    <button class="pause-btn" data-action="character">View Character</button>
                    <button class="pause-btn" data-action="save">Save Game</button>
                    <button class="pause-btn" data-action="mainmenu">Return to Main Menu</button>
                </div>
                <div class="pause-controls">
                    <h3>Controls</h3>
                    <div class="controls-grid">
                        <span>WASD / LS</span><span>Move</span>
                        <span>Mouse / RS</span><span>Aim Direction</span>
                        <span>J / Click / X</span><span>Primary Attack</span>
                        <span>K / RClick / Y</span><span>Secondary Attack</span>
                        <span>Space / B</span><span>Pivot Dodge (aim + release)</span>
                        <span>F / A</span><span>Jump</span>
                        <span>Tab / R3</span><span>Lock-On Target</span>
                        <span>P / Esc / Start</span><span>Pause</span>
                        <span>D-pad ↑↓ / A / B</span><span>Menu Navigate / Select / Back</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlay = el;

        // Capture button refs for gamepad navigation
        this._pauseButtons = Array.from(el.querySelectorAll('.pause-btn'));
        this._pauseIndex = 0;
        this._pauseStickCooldown = 0;
        this._updatePauseHighlight();

        // Button handlers
        el.querySelector('[data-action="resume"]').addEventListener('click', () => {
            this.resume();
        });

        el.querySelector('[data-action="character"]').addEventListener('click', () => {
            if (this._onViewCharacter) this._onViewCharacter();
        });

        el.querySelector('[data-action="save"]').addEventListener('click', (e) => {
            if (this._onSave) this._onSave(e.target);
        });

        el.querySelector('[data-action="mainmenu"]').addEventListener('click', () => {
            if (this._onMainMenu) this._onMainMenu();
        });
    }

    _hideOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this._pauseButtons = [];
    }

    // ── Gamepad navigation ──

    updateGamepad(dt, input) {
        if (!this.overlay || this._pauseButtons.length === 0) return;

        // Cooldown
        if (this._pauseStickCooldown > 0) {
            this._pauseStickCooldown -= dt;
        }

        // Read D-pad / left stick
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }

        if (gp && this._pauseStickCooldown <= 0) {
            const dUp = gp.buttons[12] && gp.buttons[12].pressed;
            const dDown = gp.buttons[13] && gp.buttons[13].pressed;
            const ly = gp.axes[1] || 0;
            const stickUp = ly < -0.5;
            const stickDown = ly > 0.5;

            let moved = false;
            if (dUp || stickUp) {
                this._pauseIndex = Math.max(0, this._pauseIndex - 1);
                moved = true;
            } else if (dDown || stickDown) {
                this._pauseIndex = Math.min(this._pauseButtons.length - 1, this._pauseIndex + 1);
                moved = true;
            }

            if (moved) {
                this._pauseStickCooldown = 0.2;
                this._updatePauseHighlight();
            }
        }

        // A button → click selected button
        if (input.actionPressed('jump')) {
            const btn = this._pauseButtons[this._pauseIndex];
            if (btn) btn.click();
        }

        // B button → resume
        if (input.actionPressed('dodge')) {
            this.resume();
        }
    }

    _updatePauseHighlight() {
        for (const btn of this._pauseButtons) {
            btn.classList.remove('gp-selected');
        }
        if (this._pauseButtons[this._pauseIndex]) {
            this._pauseButtons[this._pauseIndex].classList.add('gp-selected');
        }
    }
}
