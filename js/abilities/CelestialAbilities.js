/**
 * CelestialAbilities — fairy companion, spirit dash, celestial pulse, minor heal + aerial moves.
 *
 * Fairy Companion (always active):
 *   Orbits player, auto-heals below 50% HP, auto-attacks nearby enemies.
 *
 * Attack (J / LClick / X):
 *   Hold: Spirit Ward shield (blocks frontal damage).
 *   Release: Celestial Pulse — radial wave from player, damages and pushes enemies.
 *   Airborne: Dive Pulse — slam down, pulse wave + knockback on landing.
 *
 * Magic (K / RClick / Y):
 *   Minor Heal — instant heal for 20% max HP, costs 2 MP.
 *   Airborne: Fairy Barrage — fairy fires 5 rapid bolts at nearest enemy.
 *
 * Ability (I / LB):
 *   Spirit Dash — teleport in facing direction with afterimage trail.
 *
 * Aerial Dodge:
 *   Air Dash — spirit dash mid-air, maintain height, afterimage trail, i-frames.
 */

import { AbilitySet } from './AbilitySet.js';
import { CELESTIAL_ABILITIES, CELESTIAL_AERIAL, SHIELD_CONFIG, WORLD, DEBUG_ABILITY } from '../constants.js';
import { PulseEffect, FairyBolt } from '../weapons.js';
import { distance, normalize } from '../utils.js';

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

    /** Fire a barrage bolt at a specific target position. */
    fireBarrageBolt(tx, ty, damage, speed, radius, color) {
        this.effectEngine.addEffect(new FairyBolt(
            this.x, this.y,
            tx, ty,
            damage, speed, radius, color
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
        this.aerialCfg = CELESTIAL_AERIAL;

        // Fairy companion
        this.fairy = new FairyCompanion(player, effectEngine, this.cfg.fairy);

        // Cooldowns
        this.pulseCooldown = 0;
        this.healCooldown = 0;
        this.dashCooldown = 0;

        // Spirit dash state
        this.dashTrail = [];

        // Shield state (hold attack = shield, release = pulse)
        this.holdingAttack = false;

        // Aerial landing state
        this._pendingLanding = null; // 'divePulse'

        // Fairy barrage state
        this._barrageTarget = null;
        this._barrageRemaining = 0;
        this._barrageTimer = 0;
    }

    onActionPressed(action) {
        const airborne = this.player.stateMachine.isAirborne;

        if (action === 'attack') {
            if (airborne) {
                this._startDivePulse();
            } else {
                if (DEBUG_ABILITY) console.log(`[Celestial] shield start @ ${performance.now().toFixed(1)}ms`);
                // Hold to shield, release fires pulse
                this.holdingAttack = true;
            }
        }

        if (action === 'magic') {
            if (airborne) {
                this._startFairyBarrage();
            } else {
                this._castMinorHeal();
            }
        }

        if (action === 'ability') {
            this._castSpiritDash();
        }
    }

    onActionReleased(action) {
        if (action === 'attack' && this.holdingAttack) {
            if (DEBUG_ABILITY) console.log(`[Celestial] shield release → pulse @ ${performance.now().toFixed(1)}ms`);
            this.holdingAttack = false;
            // Fire pulse on release
            this._castPulse();
        }
    }

    onActionHeld(action, dt) {}

    update(dt, enemies) {
        if (this.pulseCooldown > 0) this.pulseCooldown -= dt;
        if (this.healCooldown > 0) this.healCooldown -= dt;
        if (this.dashCooldown > 0) this.dashCooldown -= dt;

        // Store enemies ref for barrage targeting
        this._enemies = enemies;

        // Fairy AI
        this.fairy.update(dt, enemies);

        // Dash trail fade
        for (const t of this.dashTrail) t.alpha -= dt * 4;
        this.dashTrail = this.dashTrail.filter(t => t.alpha > 0);

        // Fairy barrage tick
        if (this._barrageRemaining > 0 && this._barrageTarget) {
            this._barrageTimer -= dt;
            if (this._barrageTimer <= 0) {
                const cfg = this.aerialCfg.fairyBarrage;
                this._barrageTimer = cfg.boltInterval;
                this._barrageRemaining--;

                // Fire bolt at target (or last known position if dead)
                const target = this._barrageTarget;
                const tx = target.dead ? target.x : target.x;
                const ty = target.dead ? target.y : target.y;

                this.fairy.fireBarrageBolt(
                    tx, ty,
                    cfg.boltDamage * this.player.stats.damage,
                    cfg.boltSpeed, cfg.boltRadius, cfg.color
                );

                if (this._barrageRemaining <= 0) {
                    this._barrageTarget = null;
                }
            }
        }
    }

    // ── Shield ──

    isCharging() {
        return this.holdingAttack;
    }

    getChargeSpeedMult() {
        return this.holdingAttack ? 0.5 : 1;
    }

    getShieldColor() {
        return SHIELD_CONFIG.celestial.color;
    }

    // ── Aerial moves ──

    _startDivePulse() {
        const cfg = this.aerialCfg.divePulse;
        this.player.stateMachine.setVz(cfg.slamSpeed);
        this._pendingLanding = 'divePulse';
    }

    _startFairyBarrage() {
        const p = this.player;
        const cfg = this.aerialCfg.fairyBarrage;

        // Find nearest enemy in range
        let nearest = null;
        let nearDist = cfg.range;
        // Use stored enemies from fairy's last update context
        // Access via effectEngine's player reference back to game enemies
        // The fairy already tracks enemies — find nearest from player position
        const enemies = this._enemies || [];
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const d = distance(p, enemy);
            if (d < nearDist) {
                nearDist = d;
                nearest = enemy;
            }
        }

        if (!nearest) return;

        this._barrageTarget = nearest;
        this._barrageRemaining = cfg.boltCount;
        this._barrageTimer = 0; // fire first immediately
    }

    onAirDodge(moveDir) {
        const p = this.player;
        const cfg = this.aerialCfg.airDash;

        // Determine dash direction
        const len = Math.sqrt(moveDir.x * moveDir.x + moveDir.y * moveDir.y);
        let dx, dy;
        if (len > 0) {
            dx = moveDir.x / len;
            dy = moveDir.y / len;
        } else {
            dx = p.facing.x;
            dy = p.facing.y;
        }

        // Save afterimage at start
        this.dashTrail.push({
            x: p.x, y: p.y, alpha: 0.6, color: p.color
        });

        // Horizontal teleport, maintain height
        p.x += dx * cfg.distance;
        p.y += dy * cfg.distance;

        // Clamp to world
        p.x = Math.max(p.radius, Math.min(WORLD.WIDTH - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(WORLD.HEIGHT - p.radius, p.y));

        // Afterimage at destination
        this.dashTrail.push({
            x: p.x, y: p.y, alpha: 0.4, color: cfg.color
        });

        // I-frames
        p.invulnTimer = Math.max(p.invulnTimer, cfg.iframes);

        return true;
    }

    onLand() {
        if (!this._pendingLanding) return;
        if (DEBUG_ABILITY) console.log(`[Celestial] onLand type=${this._pendingLanding} @ ${performance.now().toFixed(1)}ms`);

        const p = this.player;

        if (this._pendingLanding === 'divePulse') {
            const cfg = this.aerialCfg.divePulse;
            const dmg = cfg.damage * p.stats.damage;
            const radius = cfg.radius * p.stats.weaponSize;

            this.effectEngine.addEffect(new PulseEffect(
                p.x, p.y, dmg, radius, cfg.expandSpeed, cfg.knockback, cfg.landingColor
            ));
        }

        this._pendingLanding = null;
    }

    // ── Ground moves ──

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
        p.x = Math.max(p.radius, Math.min(WORLD.WIDTH - p.radius, p.x));
        p.y = Math.max(p.radius, Math.min(WORLD.HEIGHT - p.radius, p.y));

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

        // Shield arc while holding attack
        if (this.holdingAttack) {
            const p = this.player;
            const s = camera.worldToScreen(p.x, p.y);
            const shieldCfg = SHIELD_CONFIG.celestial;
            const angle = Math.atan2(p.facing.y, p.facing.x);
            const shieldRadius = p.radius + 25;
            const arcHalf = shieldCfg.arc / 2;
            const pulse = 0.5 + Math.sin(performance.now() / 300) * 0.2;

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

        // Fairy companion
        this.fairy.render(ctx, camera);
    }

    getAbilityStatus() {
        const c = this.cfg;
        return [
            {
                name: this.holdingAttack ? 'SHIELD' : 'Pulse',
                ready: this.pulseCooldown <= 0,
                cooldownPct: this.pulseCooldown > 0
                    ? this.pulseCooldown / c.pulse.cooldown : 0,
                binding: 'J/X',
                charging: this.holdingAttack
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
