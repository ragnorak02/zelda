/**
 * MageAbilities — fire burst, frost ring, lightning arc, meteor drop + aerial moves.
 *
 * Attack (J / LClick / X):
 *   Fire Burst — AoE explosion at fixed range in facing direction.
 *   Hold for 1.5s to charge Meteor Drop (costs 2 MP).
 *   Holding also raises a magic shield barrier (blocks frontal damage).
 *   Airborne: Meteor Drop — slam down fast, nova explosion on landing.
 *
 * Magic (K / RClick / Y):
 *   Frost Ring — expanding ring from player, slows enemies. Costs 1 MP.
 *   Airborne: Frost Shatter — frost ring from current air position.
 *
 * Ability (I / LB):
 *   Lightning Arc — chain lightning jumping between enemies.
 *
 * Aerial Dodge:
 *   Air Blink — horizontal teleport mid-air, maintain height, i-frames.
 */

import { AbilitySet } from './AbilitySet.js';
import { MAGE_ABILITIES, MAGE_AERIAL, SHIELD_CONFIG, CHARGE_METER, DEBUG_ABILITY } from '../constants.js';
import { NovaEffect, FrostRingEffect, LightningArcEffect, MeteorEffect } from '../weapons.js';
import { normalize } from '../utils.js';
import { renderChargeMeter } from '../chargeMeter.js';

export class MageAbilities extends AbilitySet {
    constructor(player, effectEngine) {
        super(player, effectEngine);
        this.cfg = MAGE_ABILITIES;
        this.aerialCfg = MAGE_AERIAL;

        // Cooldowns
        this.fireBurstCooldown = 0;
        this.frostRingCooldown = 0;
        this.lightningCooldown = 0;
        this.meteorCooldown = 0;

        // Meteor charge state
        this.holdTime = 0;
        this.holdingAttack = false;
        this.meteorCast = false;  // true if we launched meteor (skip fire burst on release)

        // Aerial landing state
        this._pendingLanding = null; // 'meteorDrop'
    }

    onActionPressed(action) {
        const airborne = this.player.stateMachine.isAirborne;

        if (action === 'attack') {
            if (airborne) {
                this._startMeteorDrop();
            } else {
                if (DEBUG_ABILITY) console.log(`[Mage] hold start @ ${performance.now().toFixed(1)}ms`);
                this.holdingAttack = true;
                this.holdTime = 0;
                this.meteorCast = false;
            }
        }

        if (action === 'magic') {
            if (airborne) {
                this._castFrostShatter();
            } else {
                this._castFrostRing();
            }
        }

        if (action === 'ability') {
            this._castLightningArc();
        }
    }

    onActionReleased(action) {
        if (action === 'attack' && this.holdingAttack) {
            if (DEBUG_ABILITY) console.log(`[Mage] hold release meteorCast=${this.meteorCast} @ ${performance.now().toFixed(1)}ms`);
            if (!this.meteorCast) {
                // Short tap — fire burst
                this._castFireBurst();
            }
            this.holdingAttack = false;
            this.holdTime = 0;
        }
    }

    onActionHeld(action, dt) {
        if (action === 'attack' && this.holdingAttack) {
            this.holdTime += dt;

            // Check meteor threshold
            if (!this.meteorCast && this.holdTime >= this.cfg.meteor.holdTime) {
                this._castMeteor();
            }
        }
    }

    update(dt, enemies) {
        if (this.fireBurstCooldown > 0) this.fireBurstCooldown -= dt;
        if (this.frostRingCooldown > 0) this.frostRingCooldown -= dt;
        if (this.lightningCooldown > 0) this.lightningCooldown -= dt;
        if (this.meteorCooldown > 0) this.meteorCooldown -= dt;

        // Store enemies ref for lightning
        this._enemies = enemies;
    }

    // ── Shield ──

    isCharging() {
        return this.holdingAttack;
    }

    getChargeSpeedMult() {
        return this.holdingAttack ? 0.6 : 1;
    }

    getShieldColor() {
        return SHIELD_CONFIG.mage.color;
    }

    // ── Aerial moves ──

    _startMeteorDrop() {
        const cfg = this.aerialCfg.meteorDrop;
        this.player.stateMachine.setVz(cfg.slamSpeed);
        this._pendingLanding = 'meteorDrop';
    }

    _castFrostShatter() {
        const p = this.player;
        const cfg = this.aerialCfg.frostShatter;

        if (!p.canSpendMp(cfg.mpCost)) return;
        p.spendMp(cfg.mpCost);

        const dmg = cfg.damage * p.stats.damage;
        const radius = cfg.radius * p.stats.weaponSize;

        // Cast from current air position (not ground)
        this.effectEngine.addEffect(new FrostRingEffect(
            p.x, p.y, dmg, radius, cfg.expandSpeed,
            cfg.slowFactor, cfg.slowDuration, cfg.color
        ));
    }

    onAirDodge(moveDir) {
        const p = this.player;
        const cfg = this.aerialCfg.airBlink;

        // Determine blink direction
        const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
        let dx, dy;
        if (len > 0) {
            dx = moveDir.x / len;
            dy = moveDir.y / len;
        } else {
            dx = p.facing.x;
            dy = p.facing.y;
        }

        // Horizontal teleport, maintain height
        p.x += dx * cfg.distance;
        p.y += dy * cfg.distance;

        // Clamp to world
        const WORLD_W = 3000, WORLD_H = 3000;
        p.x = Math.max(p.radius, Math.min(WORLD_W - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(WORLD_H - p.radius, p.y));

        // I-frames
        p.invulnTimer = Math.max(p.invulnTimer, cfg.iframes);

        return true;
    }

    onLand() {
        if (!this._pendingLanding) return;
        if (DEBUG_ABILITY) console.log(`[Mage] onLand type=${this._pendingLanding} @ ${performance.now().toFixed(1)}ms`);

        const p = this.player;

        if (this._pendingLanding === 'meteorDrop') {
            const cfg = this.aerialCfg.meteorDrop;
            const dmg = cfg.damage * p.stats.damage;
            const radius = cfg.radius * p.stats.weaponSize;

            this.effectEngine.addEffect(new NovaEffect(
                p.x, p.y, dmg, radius, 400, cfg.landingColor
            ));
        }

        this._pendingLanding = null;
    }

    // ── Ground moves ──

    _castFireBurst() {
        if (this.fireBurstCooldown > 0) return;

        const p = this.player;
        const fb = this.cfg.fireBurst;
        this.fireBurstCooldown = fb.cooldown;

        // Place at fixed range in facing direction
        const tx = p.x + p.attackDir.x * fb.range;
        const ty = p.y + p.attackDir.y * fb.range;
        const dmg = fb.damage * p.stats.damage;
        const radius = fb.radius * p.stats.weaponSize;

        this.effectEngine.addEffect(new NovaEffect(
            tx, ty, dmg, radius, fb.expandSpeed, fb.color
        ));
    }

    _castFrostRing() {
        if (this.frostRingCooldown > 0) return;

        const p = this.player;
        const fr = this.cfg.frostRing;

        if (!p.canSpendMp(fr.mpCost)) return;
        p.spendMp(fr.mpCost);

        this.frostRingCooldown = fr.cooldown;
        const dmg = fr.damage * p.stats.damage;
        const radius = fr.radius * p.stats.weaponSize;

        this.effectEngine.addEffect(new FrostRingEffect(
            p.x, p.y, dmg, radius, fr.expandSpeed,
            fr.slowFactor, fr.slowDuration, fr.color
        ));
    }

    _castLightningArc() {
        if (this.lightningCooldown > 0) return;

        const p = this.player;
        const la = this.cfg.lightningArc;
        this.lightningCooldown = la.cooldown;

        const dmg = la.damage * p.stats.damage;
        const enemies = this._enemies || [];

        this.effectEngine.addEffect(new LightningArcEffect(
            p.x, p.y, dmg, la.chainCount, la.damageDecay,
            la.range, la.color, enemies
        ));
    }

    _castMeteor() {
        if (this.meteorCooldown > 0) return;

        const p = this.player;
        const m = this.cfg.meteor;

        if (!p.canSpendMp(m.mpCost)) return;
        p.spendMp(m.mpCost);

        this.meteorCast = true;
        this.meteorCooldown = m.cooldown;

        // Place at ~150 units in facing direction
        const range = 150;
        const tx = p.x + p.attackDir.x * range;
        const ty = p.y + p.attackDir.y * range;
        const dmg = m.damage * p.stats.damage;
        const radius = m.radius * p.stats.weaponSize;

        this.effectEngine.addEffect(new MeteorEffect(
            tx, ty, dmg, radius, m.delay, m.warningColor, m.impactColor
        ));
    }

    render(ctx, camera) {
        const p = this.player;
        const s = camera.worldToScreen(p.x, p.y);

        // Shield arc while holding attack
        if (this.holdingAttack) {
            const shieldCfg = SHIELD_CONFIG.mage;
            const angle = Math.atan2(p.facing.y, p.facing.x);
            const shieldRadius = p.radius + 25;
            const arcHalf = shieldCfg.arc / 2;
            const pulse = 0.5 + Math.sin(performance.now() / 250) * 0.2;

            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = shieldCfg.color;
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(s.x, s.y, shieldRadius, angle - arcHalf, angle + arcHalf);
            ctx.stroke();

            ctx.globalAlpha = pulse * 0.15;
            ctx.fillStyle = shieldCfg.color;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.arc(s.x, s.y, shieldRadius, angle - arcHalf, angle + arcHalf);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Meteor charge indicator
        if (this.holdingAttack && !this.meteorCast && this.holdTime > 0.3) {
            const progress = Math.min(1, this.holdTime / this.cfg.meteor.holdTime);

            renderChargeMeter(ctx, s.x, s.y, p.radius, progress, CHARGE_METER.MAGE_COLOR, {
                tierReached: progress >= 1,
                zOffset: p.z,
            });

            if (progress >= 1) {
                ctx.save();
                ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 100) * 0.2;
                ctx.fillStyle = this.cfg.meteor.impactColor;
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('METEOR!', s.x, s.y - p.radius - 14);
                ctx.restore();
            }
        }
    }

    getAbilityStatus() {
        const c = this.cfg;
        return [
            {
                name: this.holdingAttack && this.holdTime > 0.3 && !this.meteorCast
                    ? 'CHARGING...'
                    : 'Fire Burst',
                ready: this.fireBurstCooldown <= 0,
                cooldownPct: this.fireBurstCooldown > 0
                    ? this.fireBurstCooldown / c.fireBurst.cooldown : 0,
                binding: 'J/X',
                charging: this.holdingAttack && !this.meteorCast
            },
            {
                name: 'Frost Ring',
                ready: this.frostRingCooldown <= 0 && this.player.canSpendMp(c.frostRing.mpCost),
                cooldownPct: this.frostRingCooldown > 0
                    ? this.frostRingCooldown / c.frostRing.cooldown : 0,
                binding: 'K/Y',
                mpCost: c.frostRing.mpCost
            },
            {
                name: 'Lightning',
                ready: this.lightningCooldown <= 0,
                cooldownPct: this.lightningCooldown > 0
                    ? this.lightningCooldown / c.lightningArc.cooldown : 0,
                binding: 'I/RB'
            }
        ];
    }
}
