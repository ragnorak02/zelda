/**
 * CelestialAbilities — fairy companion, spirit dash, celestial pulse, minor heal.
 *
 * Fairy Companion (always active):
 *   Orbits player, auto-heals below 50% HP, auto-attacks nearby enemies.
 *
 * Attack (J / LClick / X):
 *   Celestial Pulse — radial wave from player, damages and pushes enemies.
 *
 * Magic (K / RClick / Y):
 *   Minor Heal — instant heal for 20% max HP, costs 2 MP.
 *
 * Ability (I / LB):
 *   Spirit Dash — teleport in facing direction with afterimage trail.
 */

import { AbilitySet } from './AbilitySet.js';
import { CELESTIAL_ABILITIES } from '../constants.js';
import { PulseEffect, FairyBolt } from '../weapons.js';
import { distance } from '../utils.js';

// ── Fairy Companion ──

class FairyCompanion {
    constructor(player, effectEngine, cfg) {
        this.player = player;
        this.effectEngine = effectEngine;
        this.cfg = cfg;

        // Position (world coords)
        this.x = player.x + cfg.orbitRadius;
        this.y = player.y;
        this.orbitAngle = 0;

        // AI state
        this.state = 'orbit';  // 'orbit' | 'heal' | 'attack'
        this.healCooldown = 0;
        this.boltCooldown = 0;

        // Trail for rendering
        this.trail = [];
    }

    update(dt, enemies) {
        const p = this.player;
        const cfg = this.cfg;

        // Cooldowns
        if (this.healCooldown > 0) this.healCooldown -= dt;
        if (this.boltCooldown > 0) this.boltCooldown -= dt;

        // Determine state
        const hpPct = p.hp / p.stats.maxHp;

        if (hpPct < cfg.healThreshold && this.healCooldown <= 0) {
            this.state = 'heal';
        } else {
            // Check for nearby enemies to attack
            let nearestEnemy = null;
            let nearestDist = cfg.boltRange;
            for (const enemy of enemies) {
                if (enemy.dead) continue;
                const d = distance(p, enemy);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearestEnemy = enemy;
                }
            }

            if (nearestEnemy && this.boltCooldown <= 0) {
                this.state = 'attack';
                this._fireAt(nearestEnemy);
            } else {
                this.state = 'orbit';
            }
        }

        // Execute state
        if (this.state === 'heal') {
            this._doHeal();
        }

        // Movement: orbit around player smoothly
        this.orbitAngle += cfg.orbitSpeed * dt;
        const targetX = p.x + Math.cos(this.orbitAngle) * cfg.orbitRadius;
        const targetY = p.y + Math.sin(this.orbitAngle) * cfg.orbitRadius;

        // Smooth follow
        const lerpSpeed = 8;
        this.x += (targetX - this.x) * lerpSpeed * dt;
        this.y += (targetY - this.y) * lerpSpeed * dt;

        // Trail
        this.trail.push({ x: this.x, y: this.y, alpha: 0.4 });
        if (this.trail.length > 5) this.trail.shift();
        for (const t of this.trail) t.alpha -= dt * 3;
        this.trail = this.trail.filter(t => t.alpha > 0);
    }

    _doHeal() {
        const p = this.player;
        const cfg = this.cfg;

        p.hp = Math.min(p.hp + cfg.healAmount, p.stats.maxHp);
        this.healCooldown = cfg.healCooldown;
        this.state = 'orbit';
    }

    _fireAt(enemy) {
        const cfg = this.cfg;
        this.boltCooldown = cfg.boltCooldown;

        this.effectEngine.addEffect(new FairyBolt(
            this.x, this.y,
            enemy.x, enemy.y,
            cfg.boltDamage,
            cfg.boltSpeed,
            cfg.boltRadius,
            cfg.color
        ));
    }

    render(ctx, camera) {
        const cfg = this.cfg;
        const time = performance.now();

        // Trail with sparkle
        for (const t of this.trail) {
            const ts = camera.worldToScreen(t.x, t.y);
            ctx.globalAlpha = t.alpha * 0.25;
            ctx.fillStyle = cfg.color;
            ctx.beginPath();
            ctx.arc(ts.x, ts.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        const s = camera.worldToScreen(this.x, this.y);
        const pulse = 0.7 + Math.sin(time / 200) * 0.3;
        const wingFlap = Math.sin(time / 80) * 0.4;

        // Outer glow halo
        const glowGrad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 12);
        glowGrad.addColorStop(0, `rgba(206, 147, 216, ${0.2 * pulse})`);
        glowGrad.addColorStop(1, 'rgba(206, 147, 216, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.globalAlpha = 0.5 * pulse;
        ctx.fillStyle = 'rgba(225, 190, 231, 0.6)';
        ctx.save();
        ctx.translate(s.x, s.y);

        // Left wing
        ctx.save();
        ctx.scale(1, 0.6 + wingFlap);
        ctx.beginPath();
        ctx.ellipse(-5, -1, 6, 3.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.scale(1, 0.6 - wingFlap);
        ctx.beginPath();
        ctx.ellipse(5, -1, 6, 3.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
        ctx.globalAlpha = 1;

        // Body core
        ctx.globalAlpha = pulse;
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting sparkle particles
        for (let i = 0; i < 3; i++) {
            const sparkAngle = time / 500 + i * (Math.PI * 2 / 3);
            const sparkDist = 7 + Math.sin(time / 300 + i) * 2;
            const sparkAlpha = 0.3 + Math.sin(time / 200 + i * 2) * 0.2;
            ctx.globalAlpha = sparkAlpha;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(
                s.x + Math.cos(sparkAngle) * sparkDist,
                s.y + Math.sin(sparkAngle) * sparkDist,
                0.8, 0, Math.PI * 2
            );
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }
}

// ── CelestialAbilities ──

export class CelestialAbilities extends AbilitySet {
    constructor(player, effectEngine) {
        super(player, effectEngine);
        this.cfg = CELESTIAL_ABILITIES;

        // Fairy companion
        this.fairy = new FairyCompanion(player, effectEngine, this.cfg.fairy);

        // Cooldowns
        this.pulseCooldown = 0;
        this.healCooldown = 0;
        this.dashCooldown = 0;

        // Spirit dash state
        this.dashTrail = [];
    }

    onActionPressed(action) {
        if (action === 'attack') {
            this._castPulse();
        }

        if (action === 'magic') {
            this._castMinorHeal();
        }

        if (action === 'ability') {
            this._castSpiritDash();
        }
    }

    onActionReleased(action) {}
    onActionHeld(action, dt) {}

    update(dt, enemies) {
        if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
        if (this.healCooldown > 0) this.healCooldown -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        // Fairy AI
        this.fairy.update(dt, enemies);

        // Dash trail fade
        for (const t of this.dashTrail) t.alpha -= dt * 4;
        this.dashTrail = this.dashTrail.filter(t => t.alpha > 0);
    }

    _castPulse() {
        if (this.pulseCooldown > 0) return;

        const p = this.player;
        const cfg = this.cfg.pulse;
        this.pulseCooldown = cfg.cooldown;

        const dmg = cfg.damage * p.stats.damage;
        const radius = cfg.radius * p.stats.weaponSize;

        this.effectEngine.addEffect(new PulseEffect(
            p.x, p.y, dmg, radius, cfg.expandSpeed, cfg.knockback, cfg.color
        ));
    }

    _castMinorHeal() {
        if (this.healCooldown > 0) return;

        const p = this.player;
        const cfg = this.cfg.minorHeal;

        if (!p.canSpendMp(cfg.mpCost)) return;
        p.spendMp(cfg.mpCost);

        this.healCooldown = cfg.cooldown;
        const healAmt = p.stats.maxHp * cfg.healPercent;
        p.hp = Math.min(p.hp + healAmt, p.stats.maxHp);
    }

    _castSpiritDash() {
        if (this.dashCooldown > 0) return;

        const p = this.player;
        const cfg = this.cfg.spiritDash;
        this.dashCooldown = cfg.cooldown;

        // Save afterimage
        this.dashTrail.push({
            x: p.x, y: p.y, alpha: 0.6, color: p.color
        });

        // Teleport
        const dist = cfg.distance;
        p.x += p.facing.x * dist;
        p.y += p.facing.y * dist;

        // Clamp to world
        const WORLD_W = 3000, WORLD_H = 3000;
        p.x = Math.max(p.radius, Math.min(WORLD_W - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(WORLD_H - p.radius, p.y));

        // Add destination afterimage
        this.dashTrail.push({
            x: p.x, y: p.y, alpha: 0.4, color: cfg.color
        });

        // I-frames
        p.invulnTimer = Math.max(p.invulnTimer, cfg.iframes);
    }

    render(ctx, camera) {
        // Spirit dash trail
        for (const t of this.dashTrail) {
            const s = camera.worldToScreen(t.x, t.y);
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.player.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Fairy companion
        this.fairy.render(ctx, camera);
    }

    getAbilityStatus() {
        const c = this.cfg;
        return [
            {
                name: 'Pulse',
                ready: this.pulseCooldown <= 0,
                cooldownPct: this.pulseCooldown > 0
                    ? this.pulseCooldown / c.pulse.cooldown : 0,
                binding: 'J/X'
            },
            {
                name: 'Heal',
                ready: this.healCooldown <= 0 && this.player.canSpendMp(c.minorHeal.mpCost),
                cooldownPct: this.healCooldown > 0
                    ? this.healCooldown / c.minorHeal.cooldown : 0,
                binding: 'K/Y',
                mpCost: c.minorHeal.mpCost
            },
            {
                name: 'Spirit Dash',
                ready: this.dashCooldown <= 0,
                cooldownPct: this.dashCooldown > 0
                    ? this.dashCooldown / c.spiritDash.cooldown : 0,
                binding: 'I/RB'
            }
        ];
    }
}
