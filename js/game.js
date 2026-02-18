/**
 * Game manager — owns the main loop, state machine, and all subsystems.
 *
 * States:
 *   CHARACTER_SELECT → PLAYING ⇄ PAUSED → GAME_OVER
 *
 * JRPG adventure — explore the town of Millhaven, talk to NPCs,
 * visit the Fairy Tree, cave, and blocked bridge.
 */

import { WORLD, CHARACTERS } from './constants.js';
import { Input } from './input.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { EnemyManager } from './enemy.js';
import { UI } from './ui.js';
import { PauseManager } from './pause.js';
import { LockOnSystem } from './lockon.js';
import { WorldManager } from './world.js';
import { SpawnSystem } from './spawn.js';
import { UpgradeSystem } from './upgrade.js';
import { normalize } from './utils.js';

const State = Object.freeze({
    CHARACTER_SELECT: 'characterSelect',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
});

const SPAWN_X = 1500;
const SPAWN_Y = 2700;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new Input(canvas);
        this.camera = new Camera(canvas.width, canvas.height);
        this.ui = new UI(this.ctx, canvas);
        this.pauseManager = new PauseManager();
        this.lockOnSystem = new LockOnSystem();
        this.world = new WorldManager();

        this.state = State.CHARACTER_SELECT;
        this.player = null;
        this.charKey = null;
        this.enemyManager = new EnemyManager();
        this.spawnSystem = new SpawnSystem(this.enemyManager);
        this.upgradeSystem = new UpgradeSystem();
        this.spawnLevel = 1;
        this.upgradeActive = false;
        this.lastTime = 0;

        // NPC dialogue state
        this.nearbyNPC = null;

        // Character view overlay
        this.charViewOverlay = null;

        // Gamepad character select state
        this._charSelectOverlay = null;
        this._charSelectCards = [];
        this._charSelectIndex = 0;
        this._charSelectHasContinue = false;
        this._charSelectStickCooldown = 0;

        this._setupPauseCallbacks();
        this._showCharacterSelect();
        this._bindRestart();
    }

    // ── Public ──

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame(t => this._loop(t));
    }

    resize(w, h) {
        this.camera.width = w;
        this.camera.height = h;
    }

    // ── Pause menu callbacks ──

    _setupPauseCallbacks() {
        this.pauseManager.setCallbacks({
            onResume: () => {},
            onViewCharacter: () => this._showCharacterView(),
            onSave: (btn) => this._saveGame(btn),
            onMainMenu: () => this._returnToMainMenu()
        });
    }

    _showCharacterView() {
        if (this.charViewOverlay) return;
        if (!this.player) return;

        const p = this.player;
        const el = document.createElement('div');
        el.id = 'character-view';
        el.innerHTML = `
            <div class="char-view-panel">
                <h2>${p.characterName}</h2>
                <div class="char-view-avatar" style="background:${p.color}"></div>
                <div class="char-view-stats">
                    <div class="stat-row"><span>HP</span><span>${Math.ceil(p.hp)} / ${p.stats.maxHp}</span></div>
                    <div class="stat-row"><span>MP</span><span>${Math.floor(p.mp)} / ${p.maxMp}</span></div>
                    <div class="stat-row"><span>Speed</span><span>${Math.round(p.stats.speed)}</span></div>
                    <div class="stat-row"><span>Damage</span><span>${(p.stats.damage * 100).toFixed(0)}%</span></div>
                    <div class="stat-row"><span>Attack Speed</span><span>${(p.stats.attackSpeed * 100).toFixed(0)}%</span></div>
                    <div class="stat-row"><span>Defense</span><span>${(p.stats.defense * 100).toFixed(0)}%</span></div>
                    <div class="stat-row"><span>Weapon Size</span><span>${(p.stats.weaponSize * 100).toFixed(0)}%</span></div>
                </div>
                <button class="pause-btn" id="char-view-close">Close</button>
            </div>
        `;
        document.body.appendChild(el);
        this.charViewOverlay = el;

        el.querySelector('#char-view-close').addEventListener('click', () => {
            this._hideCharacterView();
        });
    }

    _hideCharacterView() {
        if (this.charViewOverlay) {
            this.charViewOverlay.remove();
            this.charViewOverlay = null;
        }
    }

    _saveGame(btn) {
        if (!this.player || !this.charKey) return;

        const saveData = {
            charKey: this.charKey,
            x: this.player.x,
            y: this.player.y,
            hp: this.player.hp,
            mp: this.player.mp,
            stats: { ...this.player.stats },
            spawnLevel: this.spawnLevel
        };
        localStorage.setItem('zelda_save', JSON.stringify(saveData));

        // Visual feedback on the button
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'Saved!';
            btn.style.color = '#2ecc71';
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.color = '';
            }, 1500);
        }
    }

    _loadGame() {
        const raw = localStorage.getItem('zelda_save');
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    _returnToMainMenu() {
        this.pauseManager.resume();
        this._hideCharacterView();
        this.player = null;
        this.charKey = null;
        this.nearbyNPC = null;
        this.enemyManager.clear();
        this.spawnSystem.reset(1);
        this.spawnLevel = 1;
        this.upgradeActive = false;
        if (this.upgradeSystem.overlay) this.upgradeSystem._hide();
        this.lockOnSystem.target = null;
        this.state = State.CHARACTER_SELECT;
        this._showCharacterSelect();
    }

    // ── Main loop ──

    _loop(timestamp) {
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.input.pollGamepad();

        this._update(dt);
        this._render();

        requestAnimationFrame(t => this._loop(t));
    }

    _update(dt) {
        // ── Pause toggle ──
        if (this.state === State.PLAYING && !this.upgradeActive && this.input.actionPressed('pause')) {
            this.pauseManager.toggle();
        }
        if (this.pauseManager.paused) {
            // B closes character view first, then resume is handled by pauseManager
            if (this.charViewOverlay && this.input.actionPressed('dodge')) {
                this._hideCharacterView();
            } else {
                this.pauseManager.updateGamepad(dt, this.input);
            }
            this.input.endFrame();
            return;
        }
        if (this.upgradeActive) {
            this.upgradeSystem.updateGamepad(dt, this.input);
            this.input.endFrame();
            return;
        }

        if (this.state === State.CHARACTER_SELECT) {
            this._updateCharSelectGamepad(dt);
            this.input.endFrame();
            return;
        }

        if (this.state === State.GAME_OVER) {
            // A button restarts from game over
            if (this.input.actionPressed('jump')) {
                this._restart();
            }
            this.input.endFrame();
            return;
        }

        if (this.state !== State.PLAYING) {
            this.input.endFrame();
            return;
        }

        const dodge = this.player.dodgeSystem;
        const abilities = this.player.abilities;

        // ── Dodge (unified: directional roll/blink or backstep) ──
        if (this.input.actionPressed('dodge') && this.player.stateMachine.canDodge()) {
            const move = this.input.getMovement();
            // Let abilities intercept (e.g. fighter shield bash during charge)
            const intercepted = abilities.onDodge(move);
            if (!intercepted) {
                dodge.execute(move, this.player.facing);
            }
        }

        // ── Jump ──
        if (this.input.actionPressed('jump')) {
            if (this.player.stateMachine) {
                if (this.player.stateMachine.state === 'hanging') {
                    this.player.stateMachine.dismountVine();
                } else {
                    this.player.stateMachine.requestJump();
                }
            }
        }

        // ── Fighter shield deflection during charge ──
        if (this.player.abilities.isCharging && this.player.abilities.isCharging()) {
            const shieldRadius = this.player.radius + 25;
            const arcHalf = Math.PI / 3;
            const facingAngle = Math.atan2(this.player.facing.y, this.player.facing.x);

            for (const enemy of this.enemyManager.getEnemies()) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > shieldRadius + enemy.radius) continue;

                let angleDiff = Math.atan2(dy, dx) - facingAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) < arcHalf) {
                    const n = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 };
                    enemy.x += n.x * 200 * dt;
                    enemy.y += n.y * 200 * dt;
                }
            }
        }

        // ── Lock-on ──
        if (this.input.actionPressed('lockon')) {
            this.lockOnSystem.toggle(this.player, this.enemyManager.getEnemies());
        }
        this.lockOnSystem.update(this.player, this.enemyManager.getEnemies());
        this.player.lockOnTarget = this.lockOnSystem.target;

        // ── Facing: auto-face movement direction, or strafe mode ──
        this.player.isStrafing = this.input.isStrafeHeld();

        if (this.input.isStrafeHeld()) {
            // Strafe mode: old behavior — right stick / mouse / lock-on aims
            const aimDir = this.input.getAimDir();
            if (aimDir) {
                this.player.facing.x = aimDir.x;
                this.player.facing.y = aimDir.y;
            } else if (this.input.mouseActive && !this.lockOnSystem.isLocked()) {
                const wx = this.input.mouseScreen.x + this.camera.x;
                const wy = this.input.mouseScreen.y + this.camera.y;
                const dir = normalize(wx - this.player.x, wy - this.player.y);
                if (dir.x !== 0 || dir.y !== 0) {
                    this.player.facing.x = dir.x;
                    this.player.facing.y = dir.y;
                }
            }
            // Lock-on still overrides in player.update
        } else {
            // Default: face movement direction, keep last facing when idle
            const move = this.input.getMovement();
            if (move.x !== 0 || move.y !== 0) {
                const dir = normalize(move.x, move.y);
                this.player.facing.x = dir.x;
                this.player.facing.y = dir.y;
            }
            // Lock-on still overrides in player.update
        }

        // Sync attackDir with facing
        this.player.attackDir.x = this.player.facing.x;
        this.player.attackDir.y = this.player.facing.y;

        // Action pressed events (gated on state machine)
        const canAct = this.player.stateMachine.canUseAbility();
        if (this.input.actionPressed('attack') && canAct) {
            abilities.onActionPressed('attack');
        }
        if (this.input.actionPressed('magic') && canAct) {
            abilities.onActionPressed('magic');
        }
        if (this.input.actionPressed('ability') && canAct) {
            abilities.onActionPressed('ability');
        }

        // Action released events
        if (this.input.actionReleased('attack')) {
            abilities.onActionReleased('attack');
        }
        if (this.input.actionReleased('magic')) {
            abilities.onActionReleased('magic');
        }
        if (this.input.actionReleased('ability')) {
            abilities.onActionReleased('ability');
        }

        // Held actions (per-frame)
        if (this.input.isHeld('attack')) {
            abilities.onActionHeld('attack', dt);
        }
        if (this.input.isHeld('magic')) {
            abilities.onActionHeld('magic', dt);
        }
        if (this.input.isHeld('ability')) {
            abilities.onActionHeld('ability', dt);
        }

        // ── Core systems ──
        this.player.update(dt, this.input, this.enemyManager.getEnemies(), this.world);
        this.camera.follow(this.player);
        this.enemyManager.update(dt, this.player);

        // ── Spawn system (only outside Millhaven) ──
        const currentZone = this.world.getZoneName(this.player.x, this.player.y);
        if (currentZone !== 'Millhaven') {
            this.spawnSystem.update(dt, this.camera);
        }

        // Level complete → upgrade screen
        if (this.spawnSystem.levelComplete) {
            this.enemyManager.clear();
            this.upgradeActive = true;
            this.upgradeSystem.show(this.player, () => {
                this.upgradeActive = false;
                this.spawnLevel++;
                this.spawnSystem.reset(this.spawnLevel);
            });
        }

        // ── NPC proximity ──
        this.nearbyNPC = this.world.getNearbyNPC(this.player.x, this.player.y, 60);

        // ── Death check ──
        if (this.player.isDead()) {
            this.state = State.GAME_OVER;
            this.lockOnSystem.target = null;
        }

        this.input.endFrame();
    }

    _render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);

        if (this.state === State.CHARACTER_SELECT) return;

        // World grid + border
        this._renderWorldGrid();

        // Ground (paths, floors — behind everything)
        this.world.renderGround(ctx, this.camera);

        // World (obstacles, NPCs, signs)
        this.world.render(ctx, this.camera);

        // Enemies (if any)
        this.enemyManager.render(ctx, this.camera);

        // Lock-on reticle
        this.lockOnSystem.render(ctx, this.camera);

        // Player
        if (this.player) this.player.render(ctx, this.camera);

        // NPC dialogue bubble (above everything)
        if (this.nearbyNPC) {
            this.world.renderDialogue(ctx, this.camera, this.nearbyNPC);
        }

        // HUD
        if (this.player) {
            const zoneName = this.world.getZoneName(this.player.x, this.player.y);
            this.ui.renderHUD(this.player, zoneName, this.lockOnSystem);
            if (this.state === State.PLAYING && zoneName !== 'Millhaven') {
                this.ui.renderSpawnHUD(this.spawnSystem);
            }
        }

        // Controller HUD (left side, always visible during play)
        if (this.player) {
            this.ui.renderControllerHUD(this.input);
        }

        // Touch joystick
        this.ui.renderTouchJoystick(this.input);

        // Game over
        if (this.state === State.GAME_OVER) {
            this.ui.renderGameOver();
        }
    }

    _renderWorldGrid() {
        const ctx = this.ctx;
        const cam = this.camera;

        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        const gs = WORLD.GRID_SIZE;
        const startX = Math.floor(cam.x / gs) * gs;
        const startY = Math.floor(cam.y / gs) * gs;

        for (let x = startX; x <= cam.x + cam.width + gs; x += gs) {
            const sx = cam.worldToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, this.canvas.height);
            ctx.stroke();
        }
        for (let y = startY; y <= cam.y + cam.height + gs; y += gs) {
            const sy = cam.worldToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(this.canvas.width, sy);
            ctx.stroke();
        }

        // World border
        const tl = cam.worldToScreen(0, 0);
        const br = cam.worldToScreen(WORLD.WIDTH, WORLD.HEIGHT);
        ctx.strokeStyle = 'rgba(231,76,60,0.6)';
        ctx.lineWidth = 3;
        ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    }

    // ── Character select ──

    _showCharacterSelect() {
        const overlay = document.createElement('div');
        overlay.id = 'character-select';

        const saveData = this._loadGame();
        const continueBtn = saveData
            ? `<button class="continue-btn" id="continue-game">Continue Game</button>`
            : '';

        overlay.innerHTML = `
            <div class="select-panel">
                <h1>ZELDA</h1>
                <p class="select-subtitle">Choose your character</p>
                <p class="select-hint">Gamepad: D-pad / Stick to navigate, A to select</p>
                ${continueBtn}
                <div class="character-options">
                    ${Object.entries(CHARACTERS).map(([key, c]) => `
                        <button class="character-card" data-key="${key}">
                            <div class="char-avatar" style="background:${c.color}"></div>
                            <div class="char-name">${c.name}</div>
                            <div class="char-desc">${c.description}</div>
                            <div class="char-stats">
                                <span>HP: ${c.maxHp}</span>
                                <span>SPD: ${c.speed}</span>
                                <span>DMG: ${(c.damage * 100).toFixed(0)}%</span>
                                <span>ATK: ${(c.attackSpeed * 100).toFixed(0)}%</span>
                            </div>
                            <div class="char-evade">Evade: ${c.evadeLabel}</div>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Store references for gamepad navigation
        this._charSelectOverlay = overlay;
        this._charSelectCards = Array.from(overlay.querySelectorAll('.character-card'));
        this._charSelectHasContinue = !!saveData;
        this._charSelectIndex = 0;
        this._charSelectStickCooldown = 0;
        this._charSelectSaveData = saveData;
        this._updateCharSelectHighlight();

        // New game buttons
        this._charSelectCards.forEach(card => {
            card.addEventListener('click', () => {
                this._charSelectOverlay = null;
                overlay.remove();
                this._startPlaying(card.dataset.key);
            });
        });

        // Continue button
        if (saveData) {
            overlay.querySelector('#continue-game').addEventListener('click', () => {
                this._charSelectOverlay = null;
                overlay.remove();
                this._continueGame(saveData);
            });
        }
    }

    _updateCharSelectGamepad(dt) {
        if (!this._charSelectOverlay) return;

        // Total selectable items: continue (if exists) + character cards
        const totalItems = (this._charSelectHasContinue ? 1 : 0) + this._charSelectCards.length;
        if (totalItems === 0) return;

        // Stick/D-pad cooldown to prevent rapid scrolling
        if (this._charSelectStickCooldown > 0) {
            this._charSelectStickCooldown -= dt;
        }

        // D-pad navigation (buttons 12=up, 13=down, 14=left, 15=right)
        let moved = false;
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }

        if (gp && this._charSelectStickCooldown <= 0) {
            // D-pad left/right
            const dLeft = gp.buttons[14] && gp.buttons[14].pressed;
            const dRight = gp.buttons[15] && gp.buttons[15].pressed;
            const dUp = gp.buttons[12] && gp.buttons[12].pressed;
            const dDown = gp.buttons[13] && gp.buttons[13].pressed;

            // Left stick
            const lx = gp.axes[0] || 0;
            const ly = gp.axes[1] || 0;
            const stickLeft = lx < -0.5;
            const stickRight = lx > 0.5;
            const stickUp = ly < -0.5;
            const stickDown = ly > 0.5;

            if (dLeft || stickLeft) {
                this._charSelectIndex = Math.max(0, this._charSelectIndex - 1);
                moved = true;
            } else if (dRight || stickRight) {
                this._charSelectIndex = Math.min(totalItems - 1, this._charSelectIndex + 1);
                moved = true;
            } else if (dUp || stickUp) {
                // If on a character card and continue exists, go up to continue
                if (this._charSelectHasContinue && this._charSelectIndex > 0) {
                    this._charSelectIndex = 0;
                    moved = true;
                }
            } else if (dDown || stickDown) {
                // If on continue, go down to first character card
                if (this._charSelectHasContinue && this._charSelectIndex === 0) {
                    this._charSelectIndex = 1;
                    moved = true;
                }
            }

            if (moved) {
                this._charSelectStickCooldown = 0.2;
                this._updateCharSelectHighlight();
            }
        }

        // A button to select
        if (this.input.actionPressed('jump')) {
            const continueOffset = this._charSelectHasContinue ? 1 : 0;
            if (this._charSelectHasContinue && this._charSelectIndex === 0) {
                // Select continue
                this._charSelectOverlay.remove();
                this._charSelectOverlay = null;
                this._continueGame(this._charSelectSaveData);
            } else {
                // Select character card
                const cardIdx = this._charSelectIndex - continueOffset;
                if (cardIdx >= 0 && cardIdx < this._charSelectCards.length) {
                    const key = this._charSelectCards[cardIdx].dataset.key;
                    this._charSelectOverlay.remove();
                    this._charSelectOverlay = null;
                    this._startPlaying(key);
                }
            }
        }
    }

    _updateCharSelectHighlight() {
        if (!this._charSelectOverlay) return;

        const continueBtn = this._charSelectOverlay.querySelector('#continue-game');
        const continueOffset = this._charSelectHasContinue ? 1 : 0;

        // Remove all highlights
        if (continueBtn) continueBtn.classList.remove('gp-selected');
        for (const card of this._charSelectCards) {
            card.classList.remove('gp-selected');
        }

        // Apply highlight
        if (this._charSelectHasContinue && this._charSelectIndex === 0) {
            if (continueBtn) continueBtn.classList.add('gp-selected');
        } else {
            const cardIdx = this._charSelectIndex - continueOffset;
            if (cardIdx >= 0 && cardIdx < this._charSelectCards.length) {
                this._charSelectCards[cardIdx].classList.add('gp-selected');
            }
        }
    }

    _startPlaying(charKey) {
        this.charKey = charKey;
        this.player = new Player(CHARACTERS[charKey], charKey);
        this.player.x = SPAWN_X;
        this.player.y = SPAWN_Y;
        this.enemyManager.clear();
        this.spawnLevel = 1;
        this.spawnSystem.reset(1);
        this.upgradeActive = false;
        this.lockOnSystem.target = null;
        this.nearbyNPC = null;
        this.state = State.PLAYING;
    }

    _continueGame(saveData) {
        // Map old save keys to new ones
        let charKey = saveData.charKey;
        if (charKey === 'knight') charKey = 'fighter';
        if (charKey === 'rogue') charKey = 'celestial';

        if (!CHARACTERS[charKey]) {
            charKey = 'fighter';
        }

        this.charKey = charKey;
        this.player = new Player(CHARACTERS[charKey], charKey);
        this.player.x = saveData.x;
        this.player.y = saveData.y;
        this.player.hp = saveData.hp;
        if (saveData.mp !== undefined) {
            this.player.mp = saveData.mp;
        }
        if (saveData.stats) {
            Object.assign(this.player.stats, saveData.stats);
        }
        this.enemyManager.clear();
        this.spawnLevel = saveData.spawnLevel || 1;
        this.spawnSystem.reset(this.spawnLevel);
        this.upgradeActive = false;
        this.lockOnSystem.target = null;
        this.nearbyNPC = null;
        this.state = State.PLAYING;
    }

    // ── Restart ──

    _restart() {
        if (this.state !== State.GAME_OVER) return;
        this.enemyManager.clear();
        this.spawnSystem.reset(1);
        this.spawnLevel = 1;
        this.upgradeActive = false;
        this.state = State.CHARACTER_SELECT;
        this._showCharacterSelect();
    }

    _bindRestart() {
        const handler = () => this._restart();
        this.canvas.addEventListener('click', handler);
        this.canvas.addEventListener('touchend', handler);
    }
}
