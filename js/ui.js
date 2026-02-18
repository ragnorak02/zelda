/**
 * Heads-up display — game title, HP bar, MP bar, zone name,
 * bottom control bar, lock-on indicator, game-over screen, mobile joystick.
 */

export class UI {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
    }

    // ── Main HUD ──

    renderHUD(player, zoneName, lockOnSystem) {
        const ctx = this.ctx;
        const w = this.canvas.width;

        // ── Game title (top-center, always visible) ──
        ctx.save();
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillText('ZELDA', w / 2 + 1, 13);
        ctx.fillStyle = '#e74c3c';
        ctx.fillText('ZELDA', w / 2, 12);
        ctx.restore();

        // ── HP bar (top-left) ──
        const hpW = 200, hpH = 20, hpX = 20, hpY = 20;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(hpX - 2, hpY - 2, hpW + 4, hpH + 4);
        ctx.fillStyle = '#222';
        ctx.fillRect(hpX, hpY, hpW, hpH);

        const pct = player.hp / player.stats.maxHp;
        ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(hpX, hpY, hpW * pct, hpH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${Math.ceil(player.hp)} / ${player.stats.maxHp}`,
            hpX + hpW / 2, hpY + hpH / 2
        );

        // ── MP bar (below HP) ──
        const mpY = hpY + hpH + 4;
        const mpH = 10;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(hpX - 2, mpY - 1, hpW + 4, mpH + 2);
        ctx.fillStyle = '#222';
        ctx.fillRect(hpX, mpY, hpW, mpH);

        const mpPct = player.mp / player.maxMp;
        ctx.fillStyle = '#3498db';
        ctx.fillRect(hpX, mpY, hpW * mpPct, mpH);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `MP ${Math.floor(player.mp)} / ${player.maxMp}`,
            hpX + hpW / 2, mpY + mpH / 2
        );

        // Zone name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#ccc';
        ctx.fillText(zoneName, hpX, mpY + mpH + 8);

        // ── Lock-on indicator (below zone name) ──
        if (lockOnSystem && lockOnSystem.isLocked()) {
            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#f1c40f';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('LOCKED ON', hpX, mpY + mpH + 28);
        }

        // ── Fairy status (Celestial only) ──
        const abilities = player.abilities;
        if (abilities.fairy) {
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = '#e1bee7';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const fairyState = abilities.fairy.state;
            ctx.fillText(`FAIRY: ${fairyState.toUpperCase()}`, hpX + hpW + 16, hpY);
        }

        // ── Bottom control bar ──
        this._renderControlBar(player);
    }

    // ── Bottom control bar ──

    _renderControlBar(player) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const dodge = player.dodgeSystem;
        const abilities = player.abilities;
        const abilityStatus = abilities.getAbilityStatus();

        // Bar dimensions
        const barH = 48;
        const barY = h - barH;

        // Dark grey background
        ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
        ctx.fillRect(0, barY, w, barH);

        // Top border line
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(w, barY);
        ctx.stroke();

        // Build list of control slots
        const slots = [];

        // Movement
        slots.push({ label: 'MOVE', binding: 'WASD', ready: true, color: '#aaa' });

        // Dodge (roll/blink + backstep combined)
        const evadeLabel = player.evadeType === 'blink' ? 'BLINK' : 'DODGE';
        slots.push({
            label: evadeLabel,
            binding: 'SPACE/B',
            ready: dodge.isReady(),
            color: '#3498db',
            cooldownPct: dodge.getCooldownPercent()
        });

        // Jump
        slots.push({ label: 'JUMP', binding: 'F/A', ready: true, color: '#1abc9c' });

        // Strafe
        slots.push({
            label: 'STRAFE',
            binding: 'Alt/LB',
            ready: true,
            color: '#27ae60',
            active: player.isStrafing
        });

        // Class abilities
        for (const ability of abilityStatus) {
            const slot = {
                label: ability.name,
                binding: ability.binding,
                ready: ability.ready,
                color: '#8e44ad',
                cooldownPct: ability.cooldownPct || 0
            };
            if (ability.charging) {
                slot.active = true;
                slot.color = '#c0392b';
            }
            if (ability.mpCost) {
                slot.mpCost = ability.mpCost;
            }
            slots.push(slot);
        }

        // Lock-on
        slots.push({ label: 'LOCK', binding: 'Tab', ready: true, color: '#f1c40f' });

        // Pause
        slots.push({ label: 'PAUSE', binding: 'P/Esc', ready: true, color: '#888' });

        // Layout: evenly space slots across the bar
        const slotCount = slots.length;
        const slotW = Math.min(130, (w - 20) / slotCount);
        const totalW = slotW * slotCount;
        const startX = (w - totalW) / 2;

        for (let i = 0; i < slotCount; i++) {
            const slot = slots[i];
            const sx = startX + i * slotW;
            const cy = barY + barH / 2;

            // Cooldown bar behind text
            if (slot.cooldownPct && slot.cooldownPct > 0) {
                const cdW = slotW - 8;
                const cdH = 3;
                const cdX = sx + 4;
                const cdY = barY + barH - 7;

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(cdX, cdY, cdW, cdH);
                ctx.fillStyle = slot.ready ? slot.color : '#555';
                ctx.fillRect(cdX, cdY, cdW * (1 - slot.cooldownPct), cdH);
            }

            // Label (ability name)
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (slot.active) {
                // Pulsing active state
                const pulse = 0.7 + Math.sin(performance.now() / 150) * 0.3;
                ctx.globalAlpha = pulse;
                ctx.fillStyle = slot.color;
            } else {
                ctx.globalAlpha = 1;
                ctx.fillStyle = slot.ready ? slot.color : '#555';
            }

            let displayName = slot.label;
            if (slot.mpCost) displayName += ` ${slot.mpCost}MP`;
            ctx.fillText(displayName, sx + slotW / 2, cy - 7);

            // Binding (key hint)
            ctx.font = '9px monospace';
            ctx.fillStyle = slot.ready ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
            ctx.globalAlpha = 1;
            ctx.fillText(`[${slot.binding}]`, sx + slotW / 2, cy + 9);

            // Separator line between slots
            if (i < slotCount - 1) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx + slotW, barY + 6);
                ctx.lineTo(sx + slotW, barY + barH - 6);
                ctx.stroke();
            }
        }
    }

    // ── Xbox Controller HUD (left side) ──

    renderControllerHUD(input) {
        const ctx = this.ctx;

        // Panel position and sizing
        const panelX = 8;
        const panelW = 140;
        const rowH = 30;
        const startY = 110;  // Below HP/MP/zone

        // Button definitions: label, action key for isHeld(), Xbox color
        const buttons = [
            { label: 'LS',    type: 'stick',   stickFn: () => input.getLeftStick(),  desc: 'Move',    color: '#aaa' },
            { label: 'A',     type: 'action',  action: 'jump',    desc: 'Jump',    color: '#5cb85c' },
            { label: 'B',     type: 'action',  action: 'dodge',   desc: 'Dodge',   color: '#d9534f' },
            { label: 'X',     type: 'action',  action: 'attack',  desc: 'Attack',  color: '#5bc0de' },
            { label: 'Y',     type: 'action',  action: 'magic',   desc: 'Magic',   color: '#f0ad4e' },
            { label: 'LB',    type: 'action',  action: 'strafe',  desc: 'Strafe',  color: '#888' },
            { label: 'RB',    type: 'action',  action: 'ability', desc: 'Ability', color: '#888' },
            { label: 'RT',    type: 'trigger', trigFn: () => input.getRightTrigger(), desc: 'Charge', color: '#888' },
            { label: 'RS',    type: 'stick',   stickFn: () => input.getRightStick(),  desc: 'Aim',    color: '#aaa' },
            { label: 'R3',    type: 'action',  action: 'lockon',  desc: 'Lock-on', color: '#aaa' },
            { label: 'START', type: 'action',  action: 'pause',   desc: 'Pause',   color: '#666' },
        ];

        // Panel background
        const panelH = buttons.length * rowH + 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(panelX, startY, panelW, panelH);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, startY, panelW, panelH);

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const y = startY + 4 + i * rowH + rowH / 2;

            let active = false;
            let intensity = 0; // 0-1 for analog

            if (btn.type === 'action') {
                active = input.isHeld(btn.action);
                intensity = active ? 1 : 0;
            } else if (btn.type === 'trigger') {
                const val = btn.trigFn();
                intensity = val;
                active = val > 0.3;
            } else if (btn.type === 'stick') {
                const s = btn.stickFn();
                const len = Math.sqrt(s.x * s.x + s.y * s.y);
                intensity = Math.min(len, 1);
                active = len > 0.2;
            }

            // Button circle/rect
            const btnX = panelX + 24;
            const btnSize = btn.label.length > 2 ? 22 : 18;
            const isCircle = btn.label.length <= 2;

            if (active) {
                // Glow behind
                ctx.globalAlpha = 0.3 * intensity;
                ctx.fillStyle = btn.color;
                if (isCircle) {
                    ctx.beginPath();
                    ctx.arc(btnX, y, btnSize / 2 + 4, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(btnX - btnSize / 2 - 4, y - 10, btnSize + 8, 20);
                }
            }

            // Button shape
            ctx.globalAlpha = active ? 1 : 0.5;
            ctx.fillStyle = active ? btn.color : '#333';
            ctx.strokeStyle = active ? btn.color : '#555';
            ctx.lineWidth = 1.5;

            if (isCircle) {
                ctx.beginPath();
                ctx.arc(btnX, y, btnSize / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(btnX - btnSize / 2, y - 9, btnSize, 18);
                ctx.strokeRect(btnX - btnSize / 2, y - 9, btnSize, 18);
            }

            // Button label
            ctx.fillStyle = active ? '#fff' : '#999';
            ctx.font = `bold ${btn.label.length > 2 ? 7 : 10}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btnX, y);

            // Action description
            ctx.fillStyle = active ? '#fff' : '#777';
            ctx.font = '11px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(btn.desc, panelX + 44, y);

            // Stick direction indicator
            if (btn.type === 'stick' && active) {
                const s = btn.stickFn();
                const indX = panelX + panelW - 16;
                const indR = 5;
                ctx.fillStyle = btn.color;
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(indX + s.x * indR, y + s.y * indR, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Trigger bar
            if (btn.type === 'trigger' && intensity > 0) {
                const barX = panelX + panelW - 30;
                const barW = 22;
                const barH2 = 4;
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, y - barH2 / 2, barW, barH2);
                ctx.globalAlpha = 0.9;
                ctx.fillStyle = btn.color;
                ctx.fillRect(barX, y - barH2 / 2, barW * intensity, barH2);
            }

            ctx.globalAlpha = 1;
        }
    }

    // ── Spawn HUD (pressure bar, level badge, countdown) ──

    renderSpawnHUD(spawnSystem) {
        const ctx = this.ctx;
        const w = this.canvas.width;

        // Pressure bar — top-right
        const barW = 200, barH = 14;
        const barX = w - barW - 20, barY = 20;

        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);

        // Yellow→red gradient fill
        const pct = spawnSystem.getPressurePercent();
        const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
        grad.addColorStop(0, '#f1c40f');
        grad.addColorStop(1, '#e74c3c');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, barW * pct, barH);

        // "PRESSURE" label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PRESSURE', barX + barW / 2, barY + barH / 2);

        // Level badge — below bar, right-aligned
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f1c40f';
        ctx.fillText(`LEVEL ${spawnSystem.level}`, barX + barW, barY + barH + 6);

        // Countdown timer — center-top, pulsing red
        if (spawnSystem.countdownActive) {
            const remaining = Math.ceil(spawnSystem.countdownTimer);
            const pulse = 0.6 + Math.sin(performance.now() / 200) * 0.4;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`SURVIVE ${remaining}`, w / 2, 44);
            ctx.restore();
        }
    }

    // ── Game Over ──

    renderGameOver() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 30);

        ctx.fillStyle = '#999';
        ctx.font = '16px monospace';
        ctx.fillText('Click, tap, or press A to restart', w / 2, h / 2 + 25);
    }

    // ── Virtual joystick (mobile) ──

    renderTouchJoystick(input) {
        if (!input.touch.active) return;
        const ctx = this.ctx;

        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(input.touch.startX, input.touch.startY, 50, 0, Math.PI * 2);
        ctx.stroke();

        const tx = input.touch.startX + input.joystick.x * 50;
        const ty = input.touch.startY + input.joystick.y * 50;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(tx, ty, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}
