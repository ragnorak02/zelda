/**
 * Upgrade system — shown between levels.
 *
 * Creates an HTML overlay with 3 random upgrade options and the player's
 * current stats.  Calls a callback when the player picks one.
 */

import { UPGRADES } from './constants.js';

export class UpgradeSystem {
    constructor() {
        this.overlay = null;
        this.active = false;
        this.onComplete = null;

        // Gamepad navigation state
        this._upgradeButtons = [];
        this._upgradeIndex = 0;
        this._upgradeStickCooldown = 0;
    }

    /** Show the upgrade screen.  Calls `callback` once the player picks. */
    show(player, callback) {
        this.active = true;
        this.onComplete = callback;
        const options = this._pickRandom(3);
        this._buildOverlay(player, options);
    }

    // ── Internals ──

    _pickRandom(count) {
        const shuffled = [...UPGRADES].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    _buildOverlay(player, options) {
        if (this.overlay) this.overlay.remove();

        const el = document.createElement('div');
        el.id = 'upgrade-overlay';
        el.innerHTML = `
            <div class="upgrade-panel">
                <h2>LEVEL UP!</h2>
                <p class="upgrade-subtitle">Choose an upgrade</p>
                <div class="upgrade-options">
                    ${options.map((opt, i) => `
                        <button class="upgrade-option" data-idx="${i}">
                            <div class="upgrade-name">${opt.name}</div>
                            <div class="upgrade-desc">${opt.description}</div>
                        </button>
                    `).join('')}
                </div>
                <div class="current-stats">
                    <h3>Current Stats</h3>
                    <div class="stat-grid">
                        <span>HP: ${Math.ceil(player.hp)}/${player.stats.maxHp}</span>
                        <span>Speed: ${Math.round(player.stats.speed)}</span>
                        <span>Damage: ${(player.stats.damage * 100).toFixed(0)}%</span>
                        <span>Atk Spd: ${(player.stats.attackSpeed * 100).toFixed(0)}%</span>
                        <span>Defense: ${(player.stats.defense * 100).toFixed(0)}%</span>
                        <span>Projectiles: +${player.stats.extraProjectiles}</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(el);
        this.overlay = el;

        // Capture button refs for gamepad navigation
        this._upgradeButtons = Array.from(el.querySelectorAll('.upgrade-option'));
        this._upgradeIndex = 0;
        this._upgradeStickCooldown = 0;
        this._updateUpgradeHighlight();

        // Button handlers
        el.querySelectorAll('.upgrade-option').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                this._apply(player, options[i]);
                this._hide();
            });
        });
    }

    _apply(player, upgrade) {
        if (upgrade.special === 'heal') {
            player.hp = Math.min(
                player.stats.maxHp,
                player.hp + player.stats.maxHp * upgrade.value
            );
            return;
        }

        if (upgrade.multiplier) {
            player.stats[upgrade.stat] *= upgrade.multiplier;
        } else if (upgrade.value !== undefined) {
            player.stats[upgrade.stat] += upgrade.value;
        }

        // If max HP went up, also heal by the same amount
        if (upgrade.stat === 'maxHp') {
            player.hp += upgrade.value;
        }
    }

    _hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        this._upgradeButtons = [];
        this.active = false;
        if (this.onComplete) this.onComplete();
    }

    // ── Gamepad navigation ──

    updateGamepad(dt, input) {
        if (!this.overlay || this._upgradeButtons.length === 0) return;

        // Cooldown
        if (this._upgradeStickCooldown > 0) {
            this._upgradeStickCooldown -= dt;
        }

        // Read D-pad / left stick
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }

        if (gp && this._upgradeStickCooldown <= 0) {
            const dLeft = gp.buttons[14] && gp.buttons[14].pressed;
            const dRight = gp.buttons[15] && gp.buttons[15].pressed;
            const lx = gp.axes[0] || 0;
            const stickLeft = lx < -0.5;
            const stickRight = lx > 0.5;

            let moved = false;
            if (dLeft || stickLeft) {
                this._upgradeIndex = Math.max(0, this._upgradeIndex - 1);
                moved = true;
            } else if (dRight || stickRight) {
                this._upgradeIndex = Math.min(this._upgradeButtons.length - 1, this._upgradeIndex + 1);
                moved = true;
            }

            if (moved) {
                this._upgradeStickCooldown = 0.2;
                this._updateUpgradeHighlight();
            }
        }

        // A button → click selected button
        if (input.actionPressed('jump')) {
            const btn = this._upgradeButtons[this._upgradeIndex];
            if (btn) btn.click();
        }
    }

    _updateUpgradeHighlight() {
        for (const btn of this._upgradeButtons) {
            btn.classList.remove('gp-selected');
        }
        if (this._upgradeButtons[this._upgradeIndex]) {
            this._upgradeButtons[this._upgradeIndex].classList.add('gp-selected');
        }
    }
}
