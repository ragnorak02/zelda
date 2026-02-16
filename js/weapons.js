/**
 * EffectEngine — shared pool for all combat visual effects and hit detection.
 *
 * Abilities push effects into the engine via addEffect().
 * The engine updates, renders, and checks hits for all active effects.
 *
 * Effect types:
 *   Projectile        — moving bullet with lifetime
 *   SwingEffect       — melee arc (range + cone hit detection)
 *   NovaEffect        — expanding ring AoE
 *   SpinAttackState   — orbiting blades
 *   WindPushEffect    — expanding cone that pushes enemies
 *   FrostRingEffect   — expanding ring that applies slow debuff
 *   LightningArcEffect — chain lightning between enemies
 *   MeteorEffect      — delayed AoE (warning circle -> impact)
 *   PulseEffect       — radial wave expanding outward with knockback
 *   FairyBolt         — small auto-targeted projectile
 */

import { distance, normalize } from './utils.js';

// ── Projectile ──

export class Projectile {
    constructor(x, y, vx, vy, damage, radius, lifetime, color) {
        this.type = 'projectile';
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.radius = radius;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.color = color;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.alive = false;
    }
}

// ── Melee swing effect (arc visual + hit detection) ──

export class SwingEffect {
    constructor(x, y, dir, range, arc, damage, duration, color) {
        this.type = 'swing';
        this.x = x;
        this.y = y;
        this.dir = dir;        // center angle
        this.range = range;
        this.arc = arc;        // total arc in radians
        this.damage = damage;
        this.duration = duration;
        this.timer = duration;
        this.color = color;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.timer -= dt;
        if (this.timer <= 0) this.alive = false;
    }
}

// ── Nova effect (expanding ring AoE) ──

export class NovaEffect {
    constructor(x, y, damage, maxRadius, expandSpeed, color) {
        this.type = 'nova';
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.maxRadius = maxRadius;
        this.expandSpeed = expandSpeed;
        this.color = color;
        this.radius = 10;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.radius += this.expandSpeed * dt;
        if (this.radius >= this.maxRadius) this.alive = false;
    }
}

// ── Spin attack state (temporary orbiting blades) ──

export class SpinAttackState {
    constructor(baseDamage, orbitRadius, bladeRadius, duration, color, bladeCount, knockback) {
        this.type = 'spin';
        this.baseDamage = baseDamage;
        this.orbitRadius = orbitRadius;
        this.bladeRadius = bladeRadius;
        this.duration = duration;
        this.timer = duration;
        this.color = color;
        this.bladeCount = bladeCount;
        this.knockback = knockback || 0;
        this.angle = 0;
        this.rotationSpeed = 5;
        this.hitTimers = {};
        this.alive = true;
        // Owner position set by engine each frame
        this.ownerX = 0;
        this.ownerY = 0;
    }

    update(dt) {
        this.angle += this.rotationSpeed * dt;
        this.timer -= dt;
        if (this.timer <= 0) this.alive = false;
        for (const key in this.hitTimers) {
            this.hitTimers[key] -= dt;
        }
    }
}

// ── Wind Push Effect (expanding cone that pushes enemies) ──

export class WindPushEffect {
    constructor(x, y, dir, range, arc, damage, pushForce, duration, color) {
        this.type = 'windPush';
        this.x = x;
        this.y = y;
        this.dir = dir;        // center angle in radians
        this.range = range;
        this.arc = arc;
        this.damage = damage;
        this.pushForce = pushForce;
        this.duration = duration;
        this.timer = duration;
        this.color = color;
        this.hitEnemies = new Set();
        this.currentRange = 10;
        this.alive = true;
    }

    update(dt) {
        this.timer -= dt;
        this.currentRange += (this.range / this.duration) * dt;
        if (this.timer <= 0) this.alive = false;
    }
}

// ── Frost Ring Effect (expanding ring that applies slow) ──

export class FrostRingEffect {
    constructor(x, y, damage, maxRadius, expandSpeed, slowFactor, slowDuration, color) {
        this.type = 'frostRing';
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.maxRadius = maxRadius;
        this.expandSpeed = expandSpeed;
        this.slowFactor = slowFactor;
        this.slowDuration = slowDuration;
        this.color = color;
        this.radius = 10;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.radius += this.expandSpeed * dt;
        if (this.radius >= this.maxRadius) this.alive = false;
    }
}

// ── Lightning Arc Effect (chain lightning between enemies) ──

export class LightningArcEffect {
    constructor(x, y, damage, chainCount, damageDecay, range, color, enemies) {
        this.type = 'lightningArc';
        this.color = color;
        this.alive = true;
        this.timer = 0.4;    // visual duration
        this.chains = [];     // [{x1,y1,x2,y2,damage}]

        // Build chain
        this._buildChain(x, y, damage, chainCount, damageDecay, range, enemies);
    }

    _buildChain(startX, startY, baseDamage, maxChains, decay, range, enemies) {
        const hitSet = new Set();
        let cx = startX;
        let cy = startY;
        let dmg = baseDamage;

        for (let i = 0; i < maxChains + 1; i++) {
            let nearest = null;
            let nearestDist = range;

            for (const enemy of enemies) {
                if (enemy.dead || hitSet.has(enemy.id)) continue;
                const d = distance({ x: cx, y: cy }, enemy);
                if (d < nearestDist) {
                    nearestDist = d;
                    nearest = enemy;
                }
            }

            if (!nearest) break;

            this.chains.push({
                x1: cx, y1: cy,
                x2: nearest.x, y2: nearest.y,
                damage: dmg
            });

            nearest.takeDamage(dmg);
            hitSet.add(nearest.id);
            cx = nearest.x;
            cy = nearest.y;
            dmg *= decay;
        }
    }

    update(dt) {
        this.timer -= dt;
        if (this.timer <= 0) this.alive = false;
    }
}

// ── Meteor Effect (delayed AoE — warning circle then impact) ──

export class MeteorEffect {
    constructor(x, y, damage, radius, delay, warningColor, impactColor) {
        this.type = 'meteor';
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = radius;
        this.delay = delay;
        this.timer = delay;
        this.warningColor = warningColor;
        this.impactColor = impactColor;
        this.phase = 'warning';   // 'warning' -> 'impact'
        this.impactTimer = 0.3;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        if (this.phase === 'warning') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.phase = 'impact';
                this.timer = this.impactTimer;
            }
        } else {
            this.timer -= dt;
            if (this.timer <= 0) this.alive = false;
        }
    }
}

// ── Pulse Effect (radial wave expanding outward with knockback) ──

export class PulseEffect {
    constructor(x, y, damage, maxRadius, expandSpeed, knockback, color) {
        this.type = 'pulse';
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.maxRadius = maxRadius;
        this.expandSpeed = expandSpeed;
        this.knockback = knockback;
        this.color = color;
        this.radius = 10;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.radius += this.expandSpeed * dt;
        if (this.radius >= this.maxRadius) this.alive = false;
    }
}

// ── Fairy Bolt (small auto-targeted projectile) ──

export class FairyBolt {
    constructor(x, y, tx, ty, damage, speed, radius, color) {
        this.type = 'fairyBolt';
        const dir = normalize(tx - x, ty - y);
        this.x = x;
        this.y = y;
        this.vx = dir.x * speed;
        this.vy = dir.y * speed;
        this.damage = damage;
        this.radius = radius;
        this.lifetime = 2.0;
        this.maxLifetime = 2.0;
        this.color = color;
        this.hitEnemies = new Set();
        this.alive = true;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.alive = false;
    }
}

// ── EffectEngine ──

export class EffectEngine {
    constructor(player) {
        this.player = player;
        this.effects = [];
    }

    addEffect(effect) {
        this.effects.push(effect);
    }

    update(dt, enemies) {
        for (const e of this.effects) {
            // Update owner position for spin attacks
            if (e.type === 'spin') {
                e.ownerX = this.player.x;
                e.ownerY = this.player.y;
            }
            e.update(dt);
        }
        this.effects = this.effects.filter(e => e.alive);

        this._checkHits(enemies);
    }

    _checkHits(enemies) {
        for (const effect of this.effects) {
            switch (effect.type) {
                case 'projectile':
                case 'fairyBolt':
                    this._checkProjectileHit(effect, enemies);
                    break;
                case 'swing':
                    this._checkSwingHit(effect, enemies);
                    break;
                case 'nova':
                    this._checkNovaHit(effect, enemies);
                    break;
                case 'spin':
                    this._checkSpinHit(effect, enemies);
                    break;
                case 'windPush':
                    this._checkWindPushHit(effect, enemies);
                    break;
                case 'frostRing':
                    this._checkFrostRingHit(effect, enemies);
                    break;
                // lightningArc does damage during construction
                case 'meteor':
                    this._checkMeteorHit(effect, enemies);
                    break;
                case 'pulse':
                    this._checkPulseHit(effect, enemies);
                    break;
            }
        }
    }

    _checkProjectileHit(proj, enemies) {
        if (!proj.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (proj.hitEnemies.has(enemy.id)) continue;
            if (distance(proj, enemy) < proj.radius + enemy.radius) {
                enemy.takeDamage(proj.damage);
                proj.hitEnemies.add(enemy.id);
                proj.alive = false;
                break;
            }
        }
    }

    _checkSwingHit(swing, enemies) {
        if (!swing.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (swing.hitEnemies.has(enemy.id)) continue;

            const dx = enemy.x - swing.x;
            const dy = enemy.y - swing.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > swing.range + enemy.radius) continue;

            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - swing.dir;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) <= swing.arc / 2) {
                enemy.takeDamage(swing.damage);
                swing.hitEnemies.add(enemy.id);
            }
        }
    }

    _checkNovaHit(nova, enemies) {
        if (!nova.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (nova.hitEnemies.has(enemy.id)) continue;

            const dist = distance(nova, enemy);
            if (dist < nova.radius + enemy.radius && dist > nova.radius - 25) {
                enemy.takeDamage(nova.damage);
                nova.hitEnemies.add(enemy.id);
            }
        }
    }

    _checkSpinHit(spin, enemies) {
        if (!spin.alive) return;

        for (let i = 0; i < spin.bladeCount; i++) {
            const angle = spin.angle + (i * Math.PI * 2 / spin.bladeCount);
            const bx = spin.ownerX + Math.cos(angle) * spin.orbitRadius;
            const by = spin.ownerY + Math.sin(angle) * spin.orbitRadius;

            for (const enemy of enemies) {
                if (enemy.dead) continue;
                if (distance({ x: bx, y: by }, enemy) < spin.bladeRadius + enemy.radius) {
                    const key = enemy.id;
                    if (!spin.hitTimers[key] || spin.hitTimers[key] <= 0) {
                        enemy.takeDamage(spin.baseDamage);
                        spin.hitTimers[key] = 0.3;
                        // Knockback if configured
                        if (spin.knockback && enemy.applyKnockback) {
                            const dx = enemy.x - spin.ownerX;
                            const dy = enemy.y - spin.ownerY;
                            const d = Math.sqrt(dx * dx + dy * dy) || 1;
                            enemy.applyKnockback(dx / d, dy / d, spin.knockback);
                        }
                    }
                }
            }
        }
    }

    _checkWindPushHit(wind, enemies) {
        if (!wind.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;

            const dx = enemy.x - wind.x;
            const dy = enemy.y - wind.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > wind.currentRange + enemy.radius) continue;

            const enemyAngle = Math.atan2(dy, dx);
            let angleDiff = enemyAngle - wind.dir;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) <= wind.arc / 2) {
                // Damage only once
                if (!wind.hitEnemies.has(enemy.id)) {
                    enemy.takeDamage(wind.damage);
                    wind.hitEnemies.add(enemy.id);
                }
                // Push every frame
                if (enemy.applyKnockback) {
                    const n = dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 };
                    enemy.applyKnockback(n.x, n.y, wind.pushForce);
                }
            }
        }
    }

    _checkFrostRingHit(frost, enemies) {
        if (!frost.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (frost.hitEnemies.has(enemy.id)) continue;

            const dist = distance(frost, enemy);
            if (dist < frost.radius + enemy.radius && dist > frost.radius - 25) {
                enemy.takeDamage(frost.damage);
                frost.hitEnemies.add(enemy.id);
                if (enemy.applySlow) {
                    enemy.applySlow(frost.slowFactor, frost.slowDuration);
                }
            }
        }
    }

    _checkMeteorHit(meteor, enemies) {
        if (meteor.phase !== 'impact') return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (meteor.hitEnemies.has(enemy.id)) continue;

            const dist = distance(meteor, enemy);
            if (dist < meteor.radius + enemy.radius) {
                enemy.takeDamage(meteor.damage);
                meteor.hitEnemies.add(enemy.id);
            }
        }
    }

    _checkPulseHit(pulse, enemies) {
        if (!pulse.alive) return;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (pulse.hitEnemies.has(enemy.id)) continue;

            const dist = distance(pulse, enemy);
            if (dist < pulse.radius + enemy.radius && dist > pulse.radius - 25) {
                enemy.takeDamage(pulse.damage);
                pulse.hitEnemies.add(enemy.id);
                if (pulse.knockback && enemy.applyKnockback) {
                    const dx = enemy.x - pulse.x;
                    const dy = enemy.y - pulse.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    enemy.applyKnockback(dx / d, dy / d, pulse.knockback);
                }
            }
        }
    }

    // ── Rendering ──

    render(ctx, camera) {
        for (const effect of this.effects) {
            switch (effect.type) {
                case 'projectile':
                case 'fairyBolt':
                    this._renderProjectile(ctx, camera, effect);
                    break;
                case 'swing':
                    this._renderSwing(ctx, camera, effect);
                    break;
                case 'nova':
                    this._renderNova(ctx, camera, effect);
                    break;
                case 'spin':
                    this._renderSpin(ctx, camera, effect);
                    break;
                case 'windPush':
                    this._renderWindPush(ctx, camera, effect);
                    break;
                case 'frostRing':
                    this._renderFrostRing(ctx, camera, effect);
                    break;
                case 'lightningArc':
                    this._renderLightningArc(ctx, camera, effect);
                    break;
                case 'meteor':
                    this._renderMeteor(ctx, camera, effect);
                    break;
                case 'pulse':
                    this._renderPulse(ctx, camera, effect);
                    break;
            }
        }
    }

    _renderProjectile(ctx, camera, p) {
        if (!camera.isVisible(p.x, p.y, p.radius)) return;
        const s = camera.worldToScreen(p.x, p.y);

        ctx.globalAlpha = Math.min(1, p.lifetime / (p.maxLifetime * 0.3));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    _renderSwing(ctx, camera, swing) {
        const s = camera.worldToScreen(swing.x, swing.y);
        const progress = 1 - swing.timer / swing.duration;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = 0.4 * (1 - progress);

        ctx.fillStyle = swing.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, swing.range,
            swing.dir - swing.arc / 2,
            swing.dir + swing.arc / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6 * (1 - progress);
        ctx.beginPath();
        ctx.arc(0, 0, swing.range,
            swing.dir - swing.arc / 2,
            swing.dir + swing.arc / 2);
        ctx.stroke();

        ctx.restore();
    }

    _renderNova(ctx, camera, nova) {
        const s = camera.worldToScreen(nova.x, nova.y);
        const progress = nova.radius / nova.maxRadius;

        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - progress);
        ctx.strokeStyle = nova.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, nova.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.15 * (1 - progress);
        ctx.fillStyle = nova.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, nova.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _renderSpin(ctx, camera, spin) {
        if (!spin.alive) return;

        for (let i = 0; i < spin.bladeCount; i++) {
            const angle = spin.angle + (i * Math.PI * 2 / spin.bladeCount);
            const bx = spin.ownerX + Math.cos(angle) * spin.orbitRadius;
            const by = spin.ownerY + Math.sin(angle) * spin.orbitRadius;
            const s = camera.worldToScreen(bx, by);

            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(spin.angle * 3);
            ctx.fillStyle = spin.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, spin.bladeRadius, spin.bladeRadius / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#90caf9';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    _renderWindPush(ctx, camera, wind) {
        const s = camera.worldToScreen(wind.x, wind.y);
        const progress = 1 - wind.timer / wind.duration;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.globalAlpha = 0.35 * (1 - progress);

        // Draw expanding cone
        ctx.fillStyle = wind.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, wind.currentRange,
            wind.dir - wind.arc / 2,
            wind.dir + wind.arc / 2);
        ctx.closePath();
        ctx.fill();

        // Wind lines
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 * (1 - progress);
        for (let i = 0; i < 3; i++) {
            const lineAngle = wind.dir + (i - 1) * (wind.arc / 4);
            const lineR = wind.currentRange * (0.4 + progress * 0.6);
            ctx.beginPath();
            ctx.moveTo(Math.cos(lineAngle) * 10, Math.sin(lineAngle) * 10);
            ctx.lineTo(Math.cos(lineAngle) * lineR, Math.sin(lineAngle) * lineR);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderFrostRing(ctx, camera, frost) {
        const s = camera.worldToScreen(frost.x, frost.y);
        const progress = frost.radius / frost.maxRadius;

        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - progress);
        ctx.strokeStyle = frost.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, frost.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Frosty inner fill
        ctx.globalAlpha = 0.1 * (1 - progress);
        ctx.fillStyle = frost.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, frost.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    _renderLightningArc(ctx, camera, arc) {
        const alpha = arc.timer / 0.4;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 8;

        for (const chain of arc.chains) {
            const s1 = camera.worldToScreen(chain.x1, chain.y1);
            const s2 = camera.worldToScreen(chain.x2, chain.y2);

            // Jagged lightning line
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            const segments = 5;
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const mx = s1.x + (s2.x - s1.x) * t + (Math.random() - 0.5) * 20;
                const my = s1.y + (s2.y - s1.y) * t + (Math.random() - 0.5) * 20;
                ctx.lineTo(mx, my);
            }
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    _renderMeteor(ctx, camera, meteor) {
        const s = camera.worldToScreen(meteor.x, meteor.y);

        ctx.save();

        if (meteor.phase === 'warning') {
            // Pulsing warning circle
            const pulse = 0.3 + Math.sin(performance.now() / 100) * 0.2;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = meteor.warningColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(s.x, s.y, meteor.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Fill
            ctx.globalAlpha = pulse * 0.15;
            ctx.fillStyle = meteor.warningColor;
            ctx.beginPath();
            ctx.arc(s.x, s.y, meteor.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Impact explosion
            const progress = 1 - meteor.timer / meteor.impactTimer;
            ctx.globalAlpha = 0.7 * (1 - progress);
            ctx.fillStyle = meteor.impactColor;
            ctx.beginPath();
            ctx.arc(s.x, s.y, meteor.radius * (0.5 + progress * 0.5), 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.5 * (1 - progress);
            ctx.beginPath();
            ctx.arc(s.x, s.y, meteor.radius * (0.5 + progress * 0.5), 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderPulse(ctx, camera, pulse) {
        const s = camera.worldToScreen(pulse.x, pulse.y);
        const progress = pulse.radius / pulse.maxRadius;

        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - progress);
        ctx.strokeStyle = pulse.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(s.x, s.y, pulse.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = 0.12 * (1 - progress);
        ctx.fillStyle = pulse.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, pulse.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
