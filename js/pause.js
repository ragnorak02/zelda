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
                        <span>WASD / Arrows</span><span>Move</span>
                        <span>Mouse</span><span>Aim Direction</span>
                        <span>J / Left Click</span><span>Primary Attack</span>
                        <span>K / Right Click</span><span>Secondary Attack</span>
                        <span>Space (hold)</span><span>Pivot Dodge (aim + release)</span>
                        <span>L / Shift</span><span>Back Jump</span>
                        <span>Tab</span><span>Lock-On Target</span>
                        <span>P / Esc</span><span>Pause</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlay = el;

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
    }
}
