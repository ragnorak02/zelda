/**
 * StatusMenu — DOM-based overlay showing player stats, moves, inventory, and objective.
 *
 * Opened from the pause menu "Status" button.
 * Tabs: Stats | Moves | Inventory | Objective
 * Gamepad: LB/RB or D-pad left/right to switch tabs, B to close.
 */

import { CHARACTERS, DEBUG_STATUS_MENU } from './constants.js';

const TABS = ['Stats', 'Moves', 'Inventory', 'Objective'];

export class StatusMenu {
    constructor() {
        this.overlay = null;
        this.player = null;
        this._onClose = null;
        this._tabIndex = 0;
        this._stickCooldown = 0;
    }

    /**
     * Show the status menu.
     * @param {Player} player
     * @param {Function} onClose  Called when menu is dismissed.
     */
    show(player, onClose) {
        if (this.overlay) return;
        this.player = player;
        this._onClose = onClose;
        this._tabIndex = 0;
        this._stickCooldown = 0;
        this._build();
        if (DEBUG_STATUS_MENU) console.log('[StatusMenu] opened');
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.remove();
        this.overlay = null;
        if (DEBUG_STATUS_MENU) console.log('[StatusMenu] closed');
        if (this._onClose) this._onClose();
        this._onClose = null;
        this.player = null;
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
            this.hide();
            return;
        }

        // Tab switching: LB/RB or D-pad left/right
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp = null;
        for (const g of gamepads) {
            if (g && g.connected) { gp = g; break; }
        }

        if (gp && this._stickCooldown <= 0) {
            const dLeft = gp.buttons[14] && gp.buttons[14].pressed;
            const dRight = gp.buttons[15] && gp.buttons[15].pressed;
            const lb = gp.buttons[4] && gp.buttons[4].pressed;
            const rb = gp.buttons[5] && gp.buttons[5].pressed;
            const lx = gp.axes[0] || 0;
            const stickLeft = lx < -0.5;
            const stickRight = lx > 0.5;

            let moved = false;
            if (dLeft || lb || stickLeft) {
                this._tabIndex = (this._tabIndex - 1 + TABS.length) % TABS.length;
                moved = true;
            } else if (dRight || rb || stickRight) {
                this._tabIndex = (this._tabIndex + 1) % TABS.length;
                moved = true;
            }

            if (moved) {
                this._stickCooldown = 0.2;
                this._refreshTab();
            }
        }
    }

    // ── Build DOM ──

    _build() {
        const p = this.player;
        const charDef = CHARACTERS[p.classKey] || {};

        const el = document.createElement('div');
        el.id = 'status-menu';
        el.innerHTML = `
            <div class="status-panel">
                <div class="status-header">
                    <div class="status-portrait" style="background:${p.color}"></div>
                    <div class="status-header-info">
                        <div class="status-name">${p.characterName}</div>
                        <div class="status-level">Level ${p.level}</div>
                        <div class="status-xp-bar">
                            <div class="status-xp-fill" style="width:${Math.min(100, (p.currentXP / p.xpToNextLevel) * 100)}%"></div>
                        </div>
                        <div class="status-xp-text">${p.currentXP} / ${p.xpToNextLevel} XP</div>
                    </div>
                </div>
                <div class="status-tabs">
                    ${TABS.map((t, i) => `<button class="status-tab${i === 0 ? ' active' : ''}" data-tab="${i}">${t}</button>`).join('')}
                </div>
                <div class="status-content"></div>
                <div class="status-close-hint">B / Esc — Close</div>
            </div>
        `;
        document.body.appendChild(el);
        this.overlay = el;

        // Tab click handlers
        el.querySelectorAll('.status-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._tabIndex = parseInt(btn.dataset.tab);
                this._refreshTab();
            });
        });

        // Close on click outside panel
        el.addEventListener('click', (e) => {
            if (e.target === el) this.hide();
        });

        this._refreshTab();
    }

    _refreshTab() {
        if (!this.overlay) return;
        const tabs = this.overlay.querySelectorAll('.status-tab');
        tabs.forEach((t, i) => t.classList.toggle('active', i === this._tabIndex));

        const content = this.overlay.querySelector('.status-content');
        switch (this._tabIndex) {
            case 0: content.innerHTML = this._buildStats(); break;
            case 1: content.innerHTML = this._buildMoves(); break;
            case 2: content.innerHTML = this._buildInventory(); break;
            case 3: content.innerHTML = this._buildObjective(); break;
        }
    }

    // ── Tab content builders ──

    _buildStats() {
        const p = this.player;
        const s = p.stats;
        const rows = [
            ['HP', `${Math.ceil(p.hp)} / ${s.maxHp}`],
            ['MP', `${Math.floor(p.mp)} / ${p.maxMp}`],
            ['Speed', `${Math.round(s.speed)}`],
            ['Damage', `${(s.damage * 100).toFixed(0)}%`],
            ['Attack Speed', `${(s.attackSpeed * 100).toFixed(0)}%`],
            ['Defense', `${(s.defense * 100).toFixed(0)}%`],
            ['Weapon Size', `${(s.weaponSize * 100).toFixed(0)}%`],
            ['Extra Projectiles', `${s.extraProjectiles}`],
        ];
        return `<div class="status-section">
            ${rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><span>${v}</span></div>`).join('')}
        </div>`;
    }

    _buildMoves() {
        const moves = this._getMovesForClass(this.player.classKey);
        return `<div class="status-section">
            ${moves.map(m => `
                <div class="move-entry">
                    <div class="move-name">${m.name}</div>
                    <div class="move-binding">${m.binding}</div>
                    <div class="move-desc">${m.description}</div>
                </div>
            `).join('')}
        </div>`;
    }

    _buildInventory() {
        const inv = this.player.inventory;
        const slot = (label, item) => `
            <div class="inv-slot">
                <span class="inv-label">${label}</span>
                <span class="inv-value">${item || '— empty —'}</span>
            </div>`;

        const listItems = (label, arr) => {
            if (!arr || arr.length === 0) return `<div class="inv-category"><span class="inv-label">${label}</span><span class="inv-value">None</span></div>`;
            return `<div class="inv-category"><span class="inv-label">${label}</span>${arr.map(i => `<span class="inv-value">${i}</span>`).join('')}</div>`;
        };

        return `<div class="status-section">
            ${slot('Weapon', inv.weapon)}
            ${slot('Armor', inv.armor)}
            ${listItems('Key Items', inv.keyItems)}
            ${listItems('Consumables', inv.consumables)}
        </div>`;
    }

    _buildObjective() {
        const obj = this.player.currentObjective;
        if (!obj) {
            return `<div class="status-section">
                <div class="obj-title">No Active Objective</div>
                <div class="obj-desc">Explore the world and talk to NPCs to find quests.</div>
            </div>`;
        }
        return `<div class="status-section">
            <div class="obj-title">${obj.title || 'Objective'}</div>
            <div class="obj-desc">${obj.description || ''}</div>
        </div>`;
    }

    _getMovesForClass(classKey) {
        switch (classKey) {
            case 'fighter': return [
                { name: 'Charge Attack', binding: 'J / X (Hold)', description: 'Hold to charge through 3 tiers. Release to swing. Higher tiers deal more damage and have longer range.' },
                { name: 'Wind Spell', binding: 'K / Y', description: 'Cone push that knocks enemies back. Costs 1 MP. Can cast during charge.' },
                { name: 'Spin', binding: 'I / LB', description: '360-degree emergency knockback with cooldown.' },
                { name: 'Shield Bash', binding: 'B (while charging)', description: 'Dodge while charging to dash forward and deal damage.' },
                { name: 'Falling Slash', binding: 'J / X (airborne)', description: 'Slam down and swing wide on landing.' },
                { name: 'Air Wind Burst', binding: 'K / Y (airborne)', description: '360-degree pulse push while airborne. Slight upward float.' },
                { name: 'Dive Roll', binding: 'B (airborne)', description: 'Slam down with i-frames and forward push. AoE on landing.' },
            ];
            case 'mage': return [
                { name: 'Fire Burst', binding: 'J / X (Tap)', description: 'AoE explosion at range in facing direction.' },
                { name: 'Meteor', binding: 'J / X (Hold 1.5s)', description: 'Hold to charge, then launch a delayed AoE meteor. Costs 2 MP.' },
                { name: 'Frost Ring', binding: 'K / Y', description: 'Expanding frost ring that slows enemies. Costs 1 MP.' },
                { name: 'Lightning Arc', binding: 'I / LB', description: 'Chain lightning that jumps between nearby enemies.' },
                { name: 'Meteor Drop', binding: 'J / X (airborne)', description: 'Slam down fast. Nova explosion on landing.' },
                { name: 'Frost Shatter', binding: 'K / Y (airborne)', description: 'Cast frost ring from current air position.' },
                { name: 'Air Blink', binding: 'B (airborne)', description: 'Horizontal teleport mid-air with i-frames.' },
            ];
            case 'celestial': return [
                { name: 'Spirit Ward / Pulse', binding: 'J / X', description: 'Hold for shield. Release to fire a radial pulse wave with knockback.' },
                { name: 'Minor Heal', binding: 'K / Y', description: 'Instantly heal 20% max HP. Costs 2 MP.' },
                { name: 'Spirit Dash', binding: 'I / LB', description: 'Teleport in facing direction with afterimage trail.' },
                { name: 'Fairy Companion', binding: 'Passive', description: 'Orbiting fairy auto-heals below 50% HP and attacks nearby enemies.' },
                { name: 'Dive Pulse', binding: 'J / X (airborne)', description: 'Slam down. Pulse wave with knockback on landing.' },
                { name: 'Fairy Barrage', binding: 'K / Y (airborne)', description: 'Fairy fires 5 rapid bolts at nearest enemy.' },
                { name: 'Air Dash', binding: 'B (airborne)', description: 'Spirit dash mid-air with afterimage and i-frames.' },
            ];
            default: return [];
        }
    }
}
