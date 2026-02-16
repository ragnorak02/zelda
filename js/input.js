/**
 * Handles keyboard, mouse, touch, and Xbox gamepad input.
 *
 * Provides:
 *   getMovement()        — continuous movement vector (length 0-1)
 *   getAimDir()          — right-stick aim override (or null)
 *   actionPressed(a)     — true only on the frame the action first fires
 *   actionReleased(a)    — true only on the frame the action is released
 *   isHeld(action)       — true while the action button is held
 *   isStrafeHeld()       — shorthand for isHeld('strafe')
 *   hasActiveGamepad()   — true if a connected gamepad was found last poll
 *   endFrame()           — clears one-shot flags (call at end of game update)
 *
 * Actions:
 *   'attack'   — charge/primary   (J / Left Click / Gamepad X / RT held)
 *   'magic'    — magic ability    (K / Right Click / Gamepad Y)
 *   'ability'  — special ability  (I / Gamepad RB)
 *   'dodge'    — dodge            (Space / Gamepad B)
 *   'jump'     — jump             (F / Gamepad A)
 *   'strafe'   — strafe modifier  (Alt / Gamepad LB)
 *   'lockon'   — lock-on toggle   (Tab / Gamepad R3)
 *   'pause'    — pause toggle     (P / Escape / Gamepad Start)
 *
 * Mobile buttons inject into the same system via _hookButton.
 */

// Action -> keyboard key mappings (multiple keys can map to the same action)
const KEY_MAP = {
    'j':      'attack',
    'k':      'magic',
    'i':      'ability',
    ' ':      'dodge',
    'f':      'jump',
    'alt':    'strafe',
    'tab':    'lockon',
    'p':      'pause',
    'escape': 'pause'
};

// Gamepad button indices (standard mapping)
const GP_BUTTON = {
    A: 0,       // jump
    B: 1,       // dodge
    X: 2,       // attack
    Y: 3,       // magic
    LB: 4,      // strafe
    RB: 5,      // ability
    START: 9,   // pause
    R3: 11      // lockon (right stick click)
};

const STICK_DEADZONE = 0.2;
const RT_THRESHOLD = 0.3;  // Right trigger threshold for charge hold

export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this._justActions = {};      // one-shot: true on press frame
        this._releasedActions = {};   // one-shot: true on release frame
        this._heldActions = {};       // continuous: true while held

        // Previous gamepad button states for edge detection
        this._prevGpButtons = {};
        this._prevRT = false;        // previous right trigger state

        // Mouse aim (screen coords, converted to world by Game)
        this.mouseScreen = { x: 0, y: 0 };
        this.mouseActive = false;
        this.mouseLastMoveTime = 0;

        // Right-stick aim (raw -1..1)
        this._rightStick = { x: 0, y: 0 };

        // Gamepad presence flag
        this._hasGamepad = false;

        // Touch joystick state (left side of screen)
        this.touch = {
            active: false,
            id: null,
            startX: 0, startY: 0,
            currentX: 0, currentY: 0
        };
        this.joystick = { x: 0, y: 0 };

        this._bindKeyboard();
        this._bindMouse();
        this._bindTouch();
        this._bindMobileButtons();
    }

    // ── Keyboard ──

    _bindKeyboard() {
        window.addEventListener('keydown', e => {
            const key = e.key.toLowerCase();
            if (key === 'tab') e.preventDefault();
            if (key === 'alt') e.preventDefault();

            const action = KEY_MAP[key];
            if (action && !this.keys[key]) {
                this._justActions[action] = true;
                this._heldActions[action] = true;
            }
            if (!this.keys[key]) {
                this.keys[key] = true;
            }
        });
        window.addEventListener('keyup', e => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;

            const action = KEY_MAP[key];
            if (action) {
                this._heldActions[action] = false;
                // Mark released (one-shot, cleared in endFrame)
                this._releasedActions[action] = true;
            }
        });
    }

    // ── Mouse ──

    _bindMouse() {
        this.canvas.addEventListener('mousemove', e => {
            this.mouseScreen.x = e.clientX;
            this.mouseScreen.y = e.clientY;
            this.mouseActive = true;
            this.mouseLastMoveTime = performance.now();
        });
        this.canvas.addEventListener('mousedown', e => {
            if (e.button === 0) {
                this._justActions['attack'] = true;
                this._heldActions['attack'] = true;
            }
            if (e.button === 2) {
                this._justActions['magic'] = true;
                this._heldActions['magic'] = true;
            }
        });
        this.canvas.addEventListener('mouseup', e => {
            if (e.button === 0) {
                this._heldActions['attack'] = false;
                this._releasedActions['attack'] = true;
            }
            if (e.button === 2) {
                this._heldActions['magic'] = false;
                this._releasedActions['magic'] = true;
            }
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    // ── Touch (virtual joystick) ──

    _bindTouch() {
        this.canvas.addEventListener('touchstart', e => this._onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', e => this._onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', e => this._onTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', e => this._onTouchEnd(e), { passive: false });
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (this.touch.active) return;
        const t = e.changedTouches[0];
        this.touch.active = true;
        this.touch.id = t.identifier;
        this.touch.startX = t.clientX;
        this.touch.startY = t.clientY;
        this.touch.currentX = t.clientX;
        this.touch.currentY = t.clientY;
    }

    _onTouchMove(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== this.touch.id) continue;
            this.touch.currentX = t.clientX;
            this.touch.currentY = t.clientY;

            const dx = this.touch.currentX - this.touch.startX;
            const dy = this.touch.currentY - this.touch.startY;
            const maxDist = 50;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                const clamped = Math.min(dist, maxDist);
                this.joystick.x = (dx / dist) * (clamped / maxDist);
                this.joystick.y = (dy / dist) * (clamped / maxDist);
            }
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== this.touch.id) continue;
            this.touch.active = false;
            this.touch.id = null;
            this.joystick.x = 0;
            this.joystick.y = 0;
        }
    }

    // ── Mobile buttons ──

    _bindMobileButtons() {
        this._hookButton('btn-attack', 'attack');
        this._hookButton('btn-magic', 'magic');
        this._hookButton('btn-ability', 'ability');
        this._hookButton('btn-dodge', 'dodge');
        this._hookButton('btn-jump', 'jump');
        this._hookButton('btn-strafe', 'strafe');
        this._hookButton('btn-lockon', 'lockon');
        this._hookButton('btn-pause', 'pause');
    }

    _hookButton(id, action) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            e.stopPropagation();
            this._justActions[action] = true;
            this._heldActions[action] = true;
        }, { passive: false });
        btn.addEventListener('touchend', e => {
            e.preventDefault();
            e.stopPropagation();
            this._heldActions[action] = false;
            this._releasedActions[action] = true;
        }, { passive: false });
    }

    // ── Gamepad polling (call once per frame before action queries) ──

    pollGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }
        if (!gp) {
            this._rightStick.x = 0;
            this._rightStick.y = 0;
            this._hasGamepad = false;
            return;
        }

        this._hasGamepad = true;

        // Button mapping
        const map = {
            [GP_BUTTON.A]: 'jump',
            [GP_BUTTON.B]: 'dodge',
            [GP_BUTTON.X]: 'attack',
            [GP_BUTTON.Y]: 'magic',
            [GP_BUTTON.LB]: 'strafe',
            [GP_BUTTON.RB]: 'ability',
            [GP_BUTTON.START]: 'pause',
            [GP_BUTTON.R3]: 'lockon'
        };

        for (const [idx, action] of Object.entries(map)) {
            const pressed = gp.buttons[idx] && gp.buttons[idx].pressed;
            const wasPrev = !!this._prevGpButtons[idx];

            // Edge detection: pressed this frame
            if (pressed && !wasPrev) {
                this._justActions[action] = true;
                this._heldActions[action] = true;
            }
            // Edge detection: released this frame
            if (!pressed && wasPrev) {
                this._heldActions[action] = false;
                this._releasedActions[action] = true;
            }
            // Sustain held state
            if (pressed) {
                this._heldActions[action] = true;
            }

            this._prevGpButtons[idx] = pressed;
        }

        // Right trigger (RT) → attack hold for charge
        const rtValue = gp.buttons[7] ? gp.buttons[7].value : 0;
        const rtPressed = rtValue > RT_THRESHOLD;
        if (rtPressed && !this._prevRT) {
            this._justActions['attack'] = true;
            this._heldActions['attack'] = true;
        }
        if (!rtPressed && this._prevRT) {
            this._heldActions['attack'] = false;
            this._releasedActions['attack'] = true;
        }
        if (rtPressed) {
            this._heldActions['attack'] = true;
        }
        this._prevRT = rtPressed;

        // Right stick -> aim direction
        const rx = gp.axes[2] || 0;
        const ry = gp.axes[3] || 0;
        const rLen = Math.sqrt(rx * rx + ry * ry);
        if (rLen > STICK_DEADZONE) {
            this._rightStick.x = rx;
            this._rightStick.y = ry;
        } else {
            this._rightStick.x = 0;
            this._rightStick.y = 0;
        }
    }

    // ── Queries ──

    /** True only on the frame the action first fires. */
    actionPressed(action) {
        return !!this._justActions[action];
    }

    /** True only on the frame the action is released. */
    actionReleased(action) {
        return !!this._releasedActions[action];
    }

    /** True while the action button is held down. */
    isHeld(action) {
        return !!this._heldActions[action];
    }

    /** Shorthand: true while strafe modifier is held. */
    isStrafeHeld() {
        return this.isHeld('strafe');
    }

    /** True if a connected gamepad was found in the last pollGamepad(). */
    hasActiveGamepad() {
        return this._hasGamepad;
    }

    /** Continuous movement vector (length 0-1). Combines keyboard + left stick + touch. */
    getMovement() {
        let mx = 0;
        let my = 0;

        if (this.keys['w'] || this.keys['arrowup'])    my -= 1;
        if (this.keys['s'] || this.keys['arrowdown'])  my += 1;
        if (this.keys['a'] || this.keys['arrowleft'])  mx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) mx += 1;

        if (this.touch.active) {
            mx += this.joystick.x;
            my += this.joystick.y;
        }

        // Gamepad left stick
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp || !gp.connected) continue;
            const lx = gp.axes[0] || 0;
            const ly = gp.axes[1] || 0;
            const len = Math.sqrt(lx * lx + ly * ly);
            if (len > STICK_DEADZONE) {
                mx += lx;
                my += ly;
            }
            break;
        }

        const len = Math.sqrt(mx * mx + my * my);
        if (len > 1) { mx /= len; my /= len; }

        return { x: mx, y: my };
    }

    /** Right-stick aim override direction (normalized), or null. */
    getAimDir() {
        const rx = this._rightStick.x;
        const ry = this._rightStick.y;
        const len = Math.sqrt(rx * rx + ry * ry);
        if (len > STICK_DEADZONE) {
            return { x: rx / len, y: ry / len };
        }
        return null;
    }

    /** Returns raw left-stick axis values {x, y} from the gamepad (0 if no gamepad). */
    getLeftStick() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp || !gp.connected) continue;
            const lx = gp.axes[0] || 0;
            const ly = gp.axes[1] || 0;
            const len = Math.sqrt(lx * lx + ly * ly);
            if (len > STICK_DEADZONE) return { x: lx, y: ly };
            return { x: 0, y: 0 };
        }
        return { x: 0, y: 0 };
    }

    /** Returns raw right-stick axis values {x, y}. */
    getRightStick() {
        return { x: this._rightStick.x, y: this._rightStick.y };
    }

    /** Returns the right trigger value (0-1). */
    getRightTrigger() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const gp of gamepads) {
            if (!gp || !gp.connected) continue;
            return gp.buttons[7] ? gp.buttons[7].value : 0;
        }
        return 0;
    }

    /** Call at end of each game update to reset one-shot flags. */
    endFrame() {
        this._justActions = {};
        this._releasedActions = {};
    }
}
