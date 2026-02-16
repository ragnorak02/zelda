/**
 * MageAbilities — fire burst, frost ring, lightning arc, meteor drop.
 *
 * Attack (J / LClick / X):
 *   Fire Burst — AoE explosion at fixed range in facing direction.
 *   Hold for 1.5s to charge Meteor Drop (costs 2 MP).
 *
 * Magic (K / RClick / Y):
 *   Frost Ring — expanding ring from player, slows enemies. Costs 1 MP.
 *
 * Ability (I / LB):
 *   Lightning Arc — chain lightning jumping between enemies.
 */

import { AbilitySet } from './AbilitySet.js';
import { MAGE_ABILITIES } from '../constants.js';
import { NovaEffect, FrostRingEffect, LightningArcEffect, MeteorEffect } from '../weapons.js';

export class MageAbilities extends AbilitySet {
    constructor(player, effectEngine) {
        super(player, effectEngine);
        this.cfg = MAGE_ABILITIES;

        // Cooldowns
        this.fireBurstCooldown = 0;
        this.frostRingCooldown = 0;
        this.lightningCooldown = 0;
        this.meteorCooldown = 0;

        // Meteor charge state
        this.holdTime = 0;
        this.holdingAttack = false;
        this.meteorCast = false;  // true if we launched meteor (skip fire burst on release)
    }

    onActionPressed(action) {
        if (action === 'attack') {
            this.holdingAttack = true;
            this.holdTime = 0;
            this.meteorCast = false;
        }

        if (action === 'magic') {
            this._castFrostRing();
        }

        if (action === 'ability') {
            this._castLightningArc();
        }
    }

    onActionReleased(action) {
        if (action === 'attack' && this.holdingAttack) {
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
        // Meteor charge indicator
        if (this.holdingAttack && !this.meteorCast && this.holdTime > 0.3) {
            const p = this.player;
            const s = camera.worldToScreen(p.x, p.y);
            const progress = Math.min(1, this.holdTime / this.cfg.meteor.holdTime);

            ctx.save();
            // Charging arc around player
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = this.cfg.meteor.warningColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(s.x, s.y, p.radius + 10, -Math.PI / 2,
                -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.stroke();

            if (progress >= 1) {
                ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 100) * 0.2;
                ctx.fillStyle = this.cfg.meteor.impactColor;
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('METEOR!', s.x, s.y - p.radius - 14);
            }

            ctx.restore();
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
