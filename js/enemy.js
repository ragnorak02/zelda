/**
 * Enemy entity + EnemyManager.
 *
 * Enemy behaviors (determined by ENEMY_TYPES[type].behavior):
 *   'swarm'  — fast, continuous contact DPS, wobble movement (imp)
 *   'melee'  — chase → windup → swing → recovery cycle (shambler, brute)
 *   'ranged' — hold at preferred distance, strafe, fire arrow projectiles (archer)
 *
 * Melee enemies deal discrete per-hit damage with telegraphed wind-ups.
 * Ranged enemies spawn arrow projectiles tracked by EnemyManager.
 * Swarm enemies keep continuous contact DPS with organic wobble pathing.
 *
 * Supports slow and knockback debuffs from player abilities.
 */

import { ENEMY_TYPES, WORLD } from './constants.js';
import { distance, normalize, clamp } from './utils.js';

let nextId = 0;

// ── Single enemy ──

export class Enemy {
    constructor(type, x, y, level) {
        const def = ENEMY_TYPES[type];
        this.id = nextId++;
        this.type = type;
        this.def = def;
        this.x = x;
        this.y = y;
        this.radius = def.radius;
        this.color = def.color;
        this.speed = def.speed;
        this.maxHp = def.hp * (1 + (level - 1) * 0.20);
        this.hp = this.maxHp;
        this.dead = false;
        this.flashTimer = 0;

        // Behavior type: 'swarm', 'melee', or 'ranged'
        this.behavior = def.behavior || 'swarm';

        // Wobble for organic serpentine movement (all behaviors)
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleFreq = 2 + Math.random() * 2;   // radians/sec

        // ── Melee state machine ──
        // States: 'chase' → 'windup' → 'attack' → 'recovery' → 'chase'
        this.meleeState = 'chase';
        this.meleeTimer = 0;
        this.damage = def.damage * (1 + (level - 1) * 0.15);
        this.attackRange = def.attackRange || 30;
        this.windupTime = def.windupTime || 0.4;
        this.recoveryTime = def.recoveryTime || 0.5;
        this.attackCooldown = def.attackCooldown || 1.2;
        this.attackCooldownTimer = 0;

        // ── Ranged state ──
        this.preferredRange = def.preferredRange || 200;
        this.arrowCooldownTimer = 0;
        this.arrowCooldown = def.arrowCooldown || 2.0;
        this.strafeDir = Math.random() < 0.5 ? 1 : -1;  // circle left or right
        this.strafeTimer = 1 + Math.random() * 2;        // time before switching strafe dir

        // ── Debuffs ──
        this.slowFactor = 1.0;
        this.slowTimer = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
    }

    /** Apply a slow debuff — reduces movement speed. */
    applySlow(factor, duration) {
        this.slowFactor = factor;
        this.slowTimer = duration;
    }

    /** Apply a knockback impulse — pushes enemy in direction. */
    applyKnockback(dx, dy, force) {
        this.knockbackVx += dx * force;
        this.knockbackVy += dy * force;
    }

    update(dt, player) {
        if (this.dead) return;

        // Advance wobble phase
        this.wobblePhase += this.wobbleFreq * dt;

        // Slow debuff tick
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            if (this.slowTimer <= 0) {
                this.slowFactor = 1.0;
            }
        }

        // Knockback decay
        if (this.knockbackVx !== 0 || this.knockbackVy !== 0) {
            this.x += this.knockbackVx * dt;
            this.y += this.knockbackVy * dt;
            // Decay knockback velocity
            const decay = Math.pow(0.05, dt); // rapid decay
            this.knockbackVx *= decay;
            this.knockbackVy *= decay;
            if (Math.abs(this.knockbackVx) < 1) this.knockbackVx = 0;
            if (Math.abs(this.knockbackVy) < 1) this.knockbackVy = 0;
        }

        // Dispatch by behavior
        switch (this.behavior) {
            case 'melee':  this._updateMelee(dt, player); break;
            case 'ranged': this._updateRanged(dt, player); break;
            default:       this._updateSwarm(dt, player); break;
        }

        // Flash timer (damage feedback)
        if (this.flashTimer > 0) this.flashTimer -= dt;

        // Keep inside world bounds
        this.x = clamp(this.x, this.radius, WORLD.WIDTH - this.radius);
        this.y = clamp(this.y, this.radius, WORLD.HEIGHT - this.radius);
    }

    // ── Swarm behavior (imp) ──
    // Chase player with wobble movement, deal continuous contact DPS.

    _updateSwarm(dt, player) {
        const dir = normalize(player.x - this.x, player.y - this.y);
        // Perpendicular wobble for organic pathing
        const wobble = Math.sin(this.wobblePhase) * 0.4;
        const mx = dir.x + (-dir.y) * wobble;
        const my = dir.y + dir.x * wobble;
        const n = normalize(mx, my);
        this.x += n.x * this.speed * this.slowFactor * dt;
        this.y += n.y * this.speed * this.slowFactor * dt;
    }

    // ── Melee behavior (shambler, brute) ──
    // Chase with wobble → pause at range → windup (telegraph) → swing → recovery.

    _updateMelee(dt, player) {
        const dist = distance(this, player);
        this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
        const inRange = dist < this.attackRange + player.radius + this.radius;

        switch (this.meleeState) {
            case 'chase': {
                // Move toward player, but STOP at attack range (don't walk into them)
                if (!inRange) {
                    const dir = normalize(player.x - this.x, player.y - this.y);
                    const wobble = Math.sin(this.wobblePhase) * 0.3;
                    const mx = dir.x + (-dir.y) * wobble;
                    const my = dir.y + dir.x * wobble;
                    const n = normalize(mx, my);
                    this.x += n.x * this.speed * this.slowFactor * dt;
                    this.y += n.y * this.speed * this.slowFactor * dt;
                }

                // Transition to windup when in attack range and cooldown ready
                if (inRange && this.attackCooldownTimer <= 0) {
                    this.meleeState = 'windup';
                    this.meleeTimer = this.windupTime;
                }
                break;
            }

            case 'windup': {
                // Stand still, telegraph attack (visual handled in render)
                this.meleeTimer -= dt;
                if (this.meleeTimer <= 0) {
                    this.meleeState = 'attack';
                    this.meleeTimer = 0.1;  // brief attack frame
                }
                break;
            }

            case 'attack': {
                // Deal discrete damage if still in range
                this.meleeTimer -= dt;
                if (this.meleeTimer <= 0) {
                    if (dist < this.attackRange + player.radius + this.radius + 10) {
                        player.takeDamage(this.damage);
                    }
                    this.meleeState = 'recovery';
                    this.meleeTimer = this.recoveryTime;
                    this.attackCooldownTimer = this.attackCooldown;
                }
                break;
            }

            case 'recovery': {
                // Brief pause after swing before resuming chase
                this.meleeTimer -= dt;
                if (this.meleeTimer <= 0) {
                    this.meleeState = 'chase';
                }
                break;
            }
        }
    }

    // ── Ranged behavior (archer) ──
    // Approach to preferred range, then strafe and fire arrows.
    // Returns arrow projectile data via _pendingArrow (consumed by EnemyManager).

    _updateRanged(dt, player) {
        const dist = distance(this, player);
        const dir = normalize(player.x - this.x, player.y - this.y);
        this.arrowCooldownTimer = Math.max(0, this.arrowCooldownTimer - dt);

        // Strafe direction switch timer
        this.strafeTimer -= dt;
        if (this.strafeTimer <= 0) {
            this.strafeDir *= -1;
            this.strafeTimer = 1.5 + Math.random() * 2;
        }

        const spd = this.speed * this.slowFactor;

        if (dist > this.preferredRange + 40) {
            // Too far — approach with wobble
            const wobble = Math.sin(this.wobblePhase) * 0.3;
            const mx = dir.x + (-dir.y) * wobble;
            const my = dir.y + dir.x * wobble;
            const n = normalize(mx, my);
            this.x += n.x * spd * dt;
            this.y += n.y * spd * dt;
        } else if (dist < this.preferredRange - 40) {
            // Too close — back away
            this.x -= dir.x * spd * 0.7 * dt;
            this.y -= dir.y * spd * 0.7 * dt;
        } else {
            // At preferred range — strafe perpendicular to player
            const perpX = -dir.y * this.strafeDir;
            const perpY = dir.x * this.strafeDir;
            this.x += perpX * spd * 0.5 * dt;
            this.y += perpY * spd * 0.5 * dt;
        }

        // Fire arrow when cooldown ready
        if (this.arrowCooldownTimer <= 0 && dist < this.preferredRange + 100) {
            this._pendingArrow = {
                x: this.x,
                y: this.y,
                dx: dir.x,
                dy: dir.y,
                speed: this.def.arrowSpeed || 250,
                damage: this.def.arrowDamage || 12,
                radius: this.def.arrowRadius || 4,
                lifetime: this.def.arrowLifetime || 3.0,
                color: this.def.arrowColor || '#d4a017'
            };
            this.arrowCooldownTimer = this.arrowCooldown;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.flashTimer = 0.1;
        if (this.hp <= 0) this.dead = true;
    }

    render(ctx, camera) {
        if (this.dead) return;
        if (!camera.isVisible(this.x, this.y, this.radius + 10)) return;

        const s = camera.worldToScreen(this.x, this.y);

        // Melee windup telegraph — pulsing glow
        if (this.behavior === 'melee' && this.meleeState === 'windup') {
            const pulse = 0.3 + Math.sin(this.meleeTimer * 20) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.radius + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Melee attack flash — brief red burst
        if (this.behavior === 'melee' && this.meleeState === 'attack') {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.radius + 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Slow indicator — blue tint
        if (this.slowTimer > 0) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#80deea';
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.radius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Body
        ctx.fillStyle = this.flashTimer > 0 ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Ranged indicator — small inner dot
        if (this.behavior === 'ranged') {
            ctx.fillStyle = this.def.arrowColor || '#d4a017';
            ctx.beginPath();
            ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // HP bar (only when damaged)
        if (this.hp < this.maxHp) {
            const bw = this.radius * 2;
            const bh = 3;
            const bx = s.x - bw / 2;
            const by = s.y - this.radius - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(bx, by, bw, bh);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(bx, by, bw * (this.hp / this.maxHp), bh);
        }
    }
}

// ── Arrow projectile ──
// Spawned by ranged enemies, tracked by EnemyManager.

class Arrow {
    constructor(data) {
        this.x = data.x;
        this.y = data.y;
        this.dx = data.dx;
        this.dy = data.dy;
        this.speed = data.speed;
        this.damage = data.damage;
        this.radius = data.radius;
        this.lifetime = data.lifetime;
        this.color = data.color;
        this.dead = false;
    }

    update(dt) {
        this.x += this.dx * this.speed * dt;
        this.y += this.dy * this.speed * dt;
        this.lifetime -= dt;
        if (this.lifetime <= 0) this.dead = true;

        // Out of world bounds
        if (this.x < 0 || this.x > WORLD.WIDTH || this.y < 0 || this.y > WORLD.HEIGHT) {
            this.dead = true;
        }
    }

    render(ctx, camera) {
        if (this.dead) return;
        if (!camera.isVisible(this.x, this.y, this.radius + 5)) return;

        const s = camera.worldToScreen(this.x, this.y);

        // Arrow body — elongated in direction of travel
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(this.dy, this.dx));

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.radius * 2, 0);
        ctx.lineTo(-this.radius, -this.radius * 0.7);
        ctx.lineTo(-this.radius, this.radius * 0.7);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ── Manager ──

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.projectiles = [];   // enemy arrows
    }

    spawn(type, x, y, level) {
        this.enemies.push(new Enemy(type, x, y, level));
    }

    update(dt, player) {
        for (const enemy of this.enemies) {
            enemy.update(dt, player);

            // Collect arrow projectiles from ranged enemies
            if (enemy._pendingArrow) {
                this.projectiles.push(new Arrow(enemy._pendingArrow));
                enemy._pendingArrow = null;
            }

            // Contact damage — swarm only (continuous, per-second)
            if (!enemy.dead
                && enemy.behavior === 'swarm'
                && distance(enemy, player) < enemy.radius + player.radius) {
                player.takeDamage(enemy.damage * dt);
            }
        }

        // Update arrow projectiles
        for (const arrow of this.projectiles) {
            arrow.update(dt);

            // Hit detection against player
            if (!arrow.dead && distance(arrow, player) < arrow.radius + player.radius) {
                player.takeDamage(arrow.damage);
                arrow.dead = true;
            }
        }

        // Prune dead
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(a => !a.dead);
    }

    render(ctx, camera) {
        for (const enemy of this.enemies) {
            enemy.render(ctx, camera);
        }
        for (const arrow of this.projectiles) {
            arrow.render(ctx, camera);
        }
    }

    getEnemies() {
        return this.enemies;
    }

    clear() {
        this.enemies = [];
        this.projectiles = [];
    }
}
