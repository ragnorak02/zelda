/**
 * FighterAbilities — charge attack, wind spell, spin + aerial moves.
 *
 * Attack (J / LClick / X / RT):
 *   Hold to charge (3 tiers), release to execute scaled swing.
 *   Shows shield arc while charging, movement slowed.
 *   Airborne: Falling Slash — slam down, wide swing on landing.
 *
 * Magic (K / RClick / Y):
 *   Wind spell — cone push, costs 1 MP. Can cast during charge.
 *   Airborne: Air Wind Burst — 360° pulse push + slight float.
 *
 * Ability (I / LB):
 *   Spin — 360° emergency knockback, cooldown.
 *
 * Aerial Dodge:
 *   Dive Roll — slam down with i-frames, forward push + AoE on landing.
 */

import { AbilitySet } from './AbilitySet.js';
import { FIGHTER_ABILITIES, FIGHTER_AERIAL, SHIELD_CONFIG, CHARGE_METER, DEBUG_ABILITY } from '../constants.js';
import { SwingEffect, WindPushEffect, SpinAttackState, PulseEffect } from '../weapons.js';
import { renderChargeMeter } from '../chargeMeter.js';

export class FighterAbilities extends AbilitySet {
    constructor(player, effectEngine) {
        super(player, effectEngine);
        this.cfg = FIGHTER_ABILITIES;
        this.aerialCfg = FIGHTER_AERIAL;

        // Charge state
        this.charging = false;
        this.chargeTime = 0;
        this.chargeTier = 0;    // 0 = none, 1-3

        // Spin cooldown
        this.spinCooldown = 0;

        // Aerial landing state
        this._pendingLanding = null; // 'fallingSlash' | 'diveRoll'
        this._diveRollDir = null;    // direction for dive roll forward push

        // Track speed modifier
        this._originalSpeedMult = 1;
    }

    onActionPressed(action) {
        const airborne = this.player.stateMachine.isAirborne;

        if (action === 'attack') {
            if (airborne) {
                this._startFallingSlash();
            } else {
                if (DEBUG_ABILITY) console.log(`[Fighter] charge start @ ${performance.now().toFixed(1)}ms`);
                this.charging = true;
                this.chargeTime = 0;
                this.chargeTier = 0;
            }
        }

        if (action === 'magic') {
            if (airborne) {
                this._castAirWindBurst();
            } else {
                this._castWind();
            }
        }

        if (action === 'ability') {
            this._castSpin();
        }
    }

    onActionReleased(action) {
        if (action === 'attack' && this.charging) {
            if (DEBUG_ABILITY) console.log(`[Fighter] charge release tier=${this.chargeTier} @ ${performance.now().toFixed(1)}ms`);
            this._releaseCharge();
        }
    }

    onActionHeld(action, dt) {
        if (action === 'attack' && this.charging) {
            this.chargeTime += dt;
            this._updateChargeTier();
        }
    }

    update(dt, enemies) {
        if (this.spinCooldown > 0) this.spinCooldown -= dt;
    }

    // ── Aerial moves ──

    _startFallingSlash() {
        const cfg = this.aerialCfg.fallingSlash;
        this.player.stateMachine.setVz(cfg.slamSpeed);
        this._pendingLanding = 'fallingSlash';
    }

    _castAirWindBurst() {
        const p = this.player;
        const cfg = this.aerialCfg.airWindBurst;

        if (!p.canSpendMp(cfg.mpCost)) return;
        p.spendMp(cfg.mpCost);

        const dmg = cfg.damage * p.stats.damage;
        this.effectEngine.addEffect(new PulseEffect(
            p.x, p.y, dmg, cfg.radius, cfg.expandSpeed, cfg.pushForce, cfg.color
        ));

        // Slight upward float boost
        if (p.stateMachine.isAirborne) {
            p.stateMachine.vz = Math.max(p.stateMachine.vz, cfg.floatBoost);
        }
    }

    onAirDodge(moveDir) {
        const p = this.player;
        const cfg = this.aerialCfg.diveRoll;

        p.stateMachine.setVz(cfg.slamSpeed);
        p.invulnTimer = Math.max(p.invulnTimer, cfg.iframes);

        // Store move direction for forward push on landing
        const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
        if (len > 0) {
            this._diveRollDir = { x: moveDir.x / len, y: moveDir.y / len };
        } else {
            this._diveRollDir = { x: p.facing.x, y: p.facing.y };
        }
        this._pendingLanding = 'diveRoll';
        return true;
    }

    onLand() {
        if (!this._pendingLanding) return;
        if (DEBUG_ABILITY) console.log(`[Fighter] onLand type=${this._pendingLanding} @ ${performance.now().toFixed(1)}ms`);

        const p = this.player;

        if (this._pendingLanding === 'fallingSlash') {
            const cfg = this.aerialCfg.fallingSlash;
            const angle = Math.atan2(p.attackDir.y, p.attackDir.x);
            const dmg = cfg.damage * p.stats.damage;
            const range = cfg.range * p.stats.weaponSize;

            this.effectEngine.addEffect(new SwingEffect(
                p.x, p.y, angle, range, cfg.arc, dmg, 0.25, cfg.color
            ));
        }

        if (this._pendingLanding === 'diveRoll') {
            const cfg = this.aerialCfg.diveRoll;

            // Forward push
            if (this._diveRollDir) {
                p.x += this._diveRollDir.x * cfg.forwardDist;
                p.y += this._diveRollDir.y * cfg.forwardDist;
            }

            // Landing AoE
            const dmg = cfg.landingDamage * p.stats.damage;
            this.effectEngine.addEffect(new PulseEffect(
                p.x, p.y, dmg, cfg.landingRadius, 300, 100, cfg.landingColor
            ));
        }

        this._pendingLanding = null;
        this._diveRollDir = null;
    }

    // ── Ground moves ──

    _updateChargeTier() {
        const t = this.chargeTime;
        const c = this.cfg.charge;
        if (t >= c.tier3.time) {
            this.chargeTier = 3;
        } else if (t >= c.tier2.time) {
            this.chargeTier = 2;
        } else if (t >= c.tier1.time) {
            this.chargeTier = 1;
        } else {
            this.chargeTier = 0;
        }
    }

    _releaseCharge() {
        this.charging = false;
        const p = this.player;
        const c = this.cfg.charge;
        const angle = Math.atan2(p.attackDir.y, p.attackDir.x);

        // Determine tier and damage
        let dmg, tierName;
        if (this.chargeTier >= 3) {
            dmg = c.tier3.damage;
            tierName = c.tier3.name;
        } else if (this.chargeTier >= 2) {
            dmg = c.tier2.damage;
            tierName = c.tier2.name;
        } else if (this.chargeTier >= 1) {
            dmg = c.tier1.damage;
            tierName = c.tier1.name;
        } else {
            // Quick tap — still do tier 1 damage
            dmg = c.tier1.damage;
            tierName = c.tier1.name;
        }

        dmg *= p.stats.damage;
        const rangeMult = this.chargeTier >= 3 ? c.chargedRangeMult.tier3
            : this.chargeTier >= 2 ? c.chargedRangeMult.tier2
            : c.chargedRangeMult.tier1;
        const range = c.range * p.stats.weaponSize * rangeMult * (c.globalRangeMult || 1);
        const duration = 0.2 + (this.chargeTier >= 3 ? 0.15 : 0);

        this.effectEngine.addEffect(new SwingEffect(
            p.x, p.y, angle, range, c.arc, dmg, duration, c.color
        ));

        // Screen shake for tier 3
        if (this.chargeTier >= 3 && this.player._screenShake) {
            this.player._screenShake(0.2, 6);
        }

        this.chargeTime = 0;
        this.chargeTier = 0;
    }

    _castWind() {
        const p = this.player;
        const w = this.cfg.wind;

        if (!p.canSpendMp(w.mpCost)) return;
        p.spendMp(w.mpCost);

        const angle = Math.atan2(p.attackDir.y, p.attackDir.x);
        const dmg = w.damage * p.stats.damage;

        this.effectEngine.addEffect(new WindPushEffect(
            p.x, p.y, angle, w.range * p.stats.weaponSize,
            w.arc, dmg, w.pushForce, w.duration, w.color
        ));
    }

    _castSpin() {
        if (this.spinCooldown > 0) return;

        const p = this.player;
        const s = this.cfg.spin;

        this.spinCooldown = s.cooldown;
        const dmg = s.damage * p.stats.damage;
        const radius = s.radius * p.stats.weaponSize;

        this.effectEngine.addEffect(new SpinAttackState(
            dmg, radius, 16, s.duration, s.color, 4, s.knockback
        ));
    }

    /** Fighter moves slower while charging. */
    getChargeSpeedMult() {
        return this.charging ? this.cfg.charge.moveSpeedMult : 1;
    }

    isCharging() {
        return this.charging;
    }

    getShieldColor() {
        return SHIELD_CONFIG.fighter.color;
    }

    /**
     * Dodge intercept: if charging and moving, execute a shield bash instead
     * of normal dodge. Returns true if intercepted.
     */
    onDodge(moveDir) {
        if (!this.charging) return false;
        if (moveDir.x === 0 && moveDir.y === 0) return false;

        // Shield bash: release charge into a short dash + damage cone
        const p = this.player;
        const angle = Math.atan2(moveDir.y, moveDir.x);
        const dmg = 15 * p.stats.damage;
        const range = 45 * p.stats.weaponSize;

        this.effectEngine.addEffect(new SwingEffect(
            p.x, p.y, angle, range, Math.PI / 2, dmg, 0.15, SHIELD_CONFIG.fighter.color
        ));

        // Short dash in move direction
        const dashDist = 50;
        const dir = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
        p.x += (moveDir.x / dir) * dashDist;
        p.y += (moveDir.y / dir) * dashDist;

        // Brief i-frames
        p.invulnTimer = Math.max(p.invulnTimer, 0.1);

        // End charge
        this.charging = false;
        this.chargeTime = 0;
        this.chargeTier = 0;

        return true;
    }

    render(ctx, camera) {
        if (!this.charging) return;

        const p = this.player;
        const s = camera.worldToScreen(p.x, p.y);
        const angle = Math.atan2(p.facing.y, p.facing.x);
        const shieldCfg = SHIELD_CONFIG.fighter;

        // Charge meter ring
        const maxTime = this.cfg.charge.tier3.time;
        const progress = Math.min(1, this.chargeTime / maxTime);
        const tierThresholds = [
            this.cfg.charge.tier1.time / maxTime,
            this.cfg.charge.tier2.time / maxTime,
            this.cfg.charge.tier3.time / maxTime,
        ];
        renderChargeMeter(ctx, s.x, s.y, p.radius, progress, CHARGE_METER.FIGHTER_COLOR, {
            tierThresholds,
            tierReached: this.chargeTier >= 3,
            zOffset: p.z,
        });

        // Shield arc while charging
        const shieldRadius = p.radius + 25;
        const arcHalf = shieldCfg.arc / 2;
        const pulse = 0.6 + Math.sin(performance.now() / 200) * 0.2;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = shieldCfg.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(s.x, s.y, shieldRadius, angle - arcHalf, angle + arcHalf);
        ctx.stroke();

        ctx.globalAlpha = pulse * 0.2;
        ctx.fillStyle = shieldCfg.color;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.arc(s.x, s.y, shieldRadius, angle - arcHalf, angle + arcHalf);
        ctx.closePath();
        ctx.fill();

        // Charge glow (grows with tier)
        const glowRadius = p.radius + 4 + this.chargeTier * 6;
        const glowAlpha = 0.15 + this.chargeTier * 0.1;
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = this.cfg.charge.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Tier indicator text
        if (this.chargeTier > 0) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const cfg = this.cfg.charge;
            const name = this.chargeTier >= 3 ? cfg.tier3.name
                : this.chargeTier >= 2 ? cfg.tier2.name
                : cfg.tier1.name;
            ctx.fillText(name, s.x, s.y - p.radius - 12);
        }

        ctx.restore();
    }

    getAbilityStatus() {
        const c = this.cfg;
        return [
            {
                name: this.charging
                    ? `CHARGE T${this.chargeTier || 1}`
                    : 'Charge Attack',
                ready: true,
                cooldownPct: 0,
                binding: 'J/X',
                charging: this.charging
            },
            {
                name: 'Wind Spell',
                ready: this.player.canSpendMp(c.wind.mpCost),
                cooldownPct: 0,
                binding: 'K/Y',
                mpCost: c.wind.mpCost
            },
            {
                name: 'Spin',
                ready: this.spinCooldown <= 0,
                cooldownPct: this.spinCooldown > 0
                    ? this.spinCooldown / c.spin.cooldown : 0,
                binding: 'I/RB'
            }
        ];
    }
}
