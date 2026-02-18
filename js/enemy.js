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
import { distance, normalize, clamp, lightenColor, darkenColor } from './utils.js';

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
        const r = this.radius;
        const time = performance.now() / 1000;

        // Melee windup telegraph — pulsing glow
        if (this.behavior === 'melee' && this.meleeState === 'windup') {
            const pulse = 0.3 + Math.sin(this.meleeTimer * 20) * 0.3;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(s.x, s.y, r + 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Melee attack flash
        if (this.behavior === 'melee' && this.meleeState === 'attack') {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(s.x, s.y, r + 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Slow indicator
        if (this.slowTimer > 0) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#80deea';
            ctx.beginPath();
            ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        const flash = this.flashTimer > 0;

        // ── Ground shadow ──
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + r * 0.3, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── Type-specific body ──
        switch (this.type) {
            case 'shambler': this._renderShambler(ctx, s, r, flash, time); break;
            case 'imp':      this._renderImp(ctx, s, r, flash, time); break;
            case 'brute':    this._renderBrute(ctx, s, r, flash, time); break;
            case 'archer':   this._renderArcher(ctx, s, r, flash, time); break;
            default:         this._renderDefault(ctx, s, r, flash); break;
        }

        // HP bar (only when damaged)
        if (this.hp < this.maxHp) {
            const bw = r * 2.2;
            const bh = 3;
            const bx = s.x - bw / 2;
            const by = s.y - r - 10;
            ctx.fillStyle = '#222';
            ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
            ctx.fillStyle = '#444';
            ctx.fillRect(bx, by, bw, bh);
            const hpPct = this.hp / this.maxHp;
            ctx.fillStyle = hpPct > 0.5 ? '#e74c3c' : '#ff2222';
            ctx.fillRect(bx, by, bw * hpPct, bh);
        }
    }

    // ── Shambler: hunched zombie with glowing eyes ──
    _renderShambler(ctx, s, r, flash, time) {
        const wobble = Math.sin(time * 3) * 0.8;
        const c = flash ? '#fff' : this.color;

        // Hunched body (slightly flattened)
        const grad = ctx.createRadialGradient(s.x - 1, s.y - 1, 1, s.x, s.y, r);
        grad.addColorStop(0, flash ? '#fff' : lightenColor(this.color, 20));
        grad.addColorStop(1, flash ? '#ddd' : darkenColor(this.color, 40));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y + wobble, r, r * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? '#ccc' : darkenColor(this.color, 60);
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dragging arms
        if (!flash) {
            ctx.fillStyle = darkenColor(this.color, 20);
            ctx.beginPath();
            ctx.ellipse(s.x - r * 0.7, s.y + r * 0.4 + wobble, 4, 3, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(s.x + r * 0.7, s.y + r * 0.5 + wobble, 4, 3, 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Glowing eyes
        ctx.fillStyle = '#ff3333';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(s.x - 3, s.y - 2 + wobble, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + 3, s.y - 2 + wobble, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // ── Imp: small horned demon ──
    _renderImp(ctx, s, r, flash, time) {
        const dart = Math.sin(time * 8) * 1;
        const c = flash ? '#fff' : this.color;

        // Body
        const grad = ctx.createRadialGradient(s.x, s.y - 1, 1, s.x, s.y, r);
        grad.addColorStop(0, flash ? '#fff' : lightenColor(this.color, 30));
        grad.addColorStop(1, flash ? '#ddd' : darkenColor(this.color, 35));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y + dart, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? '#ccc' : darkenColor(this.color, 50);
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!flash) {
            // Horns
            ctx.fillStyle = darkenColor(this.color, 50);
            ctx.beginPath();
            ctx.moveTo(s.x - 4, s.y - r * 0.6 + dart);
            ctx.lineTo(s.x - 6, s.y - r - 5 + dart);
            ctx.lineTo(s.x - 1, s.y - r * 0.4 + dart);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(s.x + 4, s.y - r * 0.6 + dart);
            ctx.lineTo(s.x + 6, s.y - r - 5 + dart);
            ctx.lineTo(s.x + 1, s.y - r * 0.4 + dart);
            ctx.fill();

            // Wing stubs
            ctx.fillStyle = darkenColor(this.color, 25);
            const wingFlap = Math.sin(time * 12) * 2;
            ctx.beginPath();
            ctx.moveTo(s.x - r, s.y + dart);
            ctx.lineTo(s.x - r - 5, s.y - 4 + wingFlap + dart);
            ctx.lineTo(s.x - r + 2, s.y - 3 + dart);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(s.x + r, s.y + dart);
            ctx.lineTo(s.x + r + 5, s.y - 4 - wingFlap + dart);
            ctx.lineTo(s.x + r - 2, s.y - 3 + dart);
            ctx.fill();
        }

        // Eyes — bright yellow
        ctx.fillStyle = '#ffe033';
        ctx.beginPath();
        ctx.arc(s.x - 2.5, s.y - 1 + dart, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + 2.5, s.y - 1 + dart, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Brute: large hulking shape with shoulders ──
    _renderBrute(ctx, s, r, flash, time) {
        const breathe = Math.sin(time * 2) * 0.5;

        // Main body
        const grad = ctx.createRadialGradient(s.x - 2, s.y - 2, 2, s.x, s.y, r);
        grad.addColorStop(0, flash ? '#fff' : lightenColor(this.color, 20));
        grad.addColorStop(0.6, flash ? '#eee' : this.color);
        grad.addColorStop(1, flash ? '#ccc' : darkenColor(this.color, 50));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y + breathe, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? '#bbb' : darkenColor(this.color, 60);
        ctx.lineWidth = 2;
        ctx.stroke();

        if (!flash) {
            // Shoulder pads / spikes
            ctx.fillStyle = darkenColor(this.color, 30);
            ctx.beginPath();
            ctx.arc(s.x - r * 0.75, s.y - r * 0.3 + breathe, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s.x + r * 0.75, s.y - r * 0.3 + breathe, 6, 0, Math.PI * 2);
            ctx.fill();

            // Spikes on shoulders
            ctx.fillStyle = darkenColor(this.color, 55);
            ctx.beginPath();
            ctx.moveTo(s.x - r * 0.75, s.y - r * 0.3 - 6 + breathe);
            ctx.lineTo(s.x - r * 0.75 - 3, s.y - r * 0.3 - 12 + breathe);
            ctx.lineTo(s.x - r * 0.75 + 3, s.y - r * 0.3 - 6 + breathe);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(s.x + r * 0.75, s.y - r * 0.3 - 6 + breathe);
            ctx.lineTo(s.x + r * 0.75 + 3, s.y - r * 0.3 - 12 + breathe);
            ctx.lineTo(s.x + r * 0.75 - 3, s.y - r * 0.3 - 6 + breathe);
            ctx.fill();

            // Heavy brow
            ctx.strokeStyle = darkenColor(this.color, 45);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(s.x, s.y - r * 0.15 + breathe, r * 0.45, Math.PI + 0.4, Math.PI * 2 - 0.4);
            ctx.stroke();
        }

        // Angry eyes — red slits
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 3;
        ctx.fillRect(s.x - 5, s.y - 3 + breathe, 4, 2);
        ctx.fillRect(s.x + 1, s.y - 3 + breathe, 4, 2);
        ctx.shadowBlur = 0;
    }

    // ── Archer: lean hooded figure with bow ──
    _renderArcher(ctx, s, r, flash, time) {
        const c = flash ? '#fff' : this.color;

        // Body
        const grad = ctx.createRadialGradient(s.x, s.y - 1, 1, s.x, s.y, r);
        grad.addColorStop(0, flash ? '#fff' : lightenColor(this.color, 25));
        grad.addColorStop(1, flash ? '#ddd' : darkenColor(this.color, 35));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? '#ccc' : darkenColor(this.color, 50);
        ctx.lineWidth = 1;
        ctx.stroke();

        if (!flash) {
            // Hood (darker arc over top)
            ctx.fillStyle = darkenColor(this.color, 35);
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, Math.PI + 0.3, -0.3);
            ctx.lineTo(s.x + r * 0.5, s.y - 1);
            ctx.lineTo(s.x - r * 0.5, s.y - 1);
            ctx.fill();

            // Bow (arc on right side)
            ctx.strokeStyle = '#8b6914';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x + r + 3, s.y, r * 0.7, Math.PI * 0.6, Math.PI * 1.4);
            ctx.stroke();

            // Bow string
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            const bowR = r * 0.7;
            ctx.moveTo(
                s.x + r + 3 + Math.cos(Math.PI * 0.6) * bowR,
                s.y + Math.sin(Math.PI * 0.6) * bowR
            );
            ctx.lineTo(
                s.x + r + 3 + Math.cos(Math.PI * 1.4) * bowR,
                s.y + Math.sin(Math.PI * 1.4) * bowR
            );
            ctx.stroke();

            // Quiver (small rect on back)
            ctx.fillStyle = darkenColor(this.color, 20);
            ctx.fillRect(s.x - r - 2, s.y - 4, 3, 8);
            // Arrow tips poking out
            ctx.fillStyle = '#d4a017';
            ctx.fillRect(s.x - r - 2, s.y - 6, 3, 2);
        }

        // Eyes — sharp green
        ctx.fillStyle = '#44ff88';
        ctx.beginPath();
        ctx.arc(s.x - 2, s.y - 2, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x + 2, s.y - 2, 1.3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── Fallback ──
    _renderDefault(ctx, s, r, flash) {
        ctx.fillStyle = flash ? '#fff' : this.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fill();
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
        const angle = Math.atan2(this.dy, this.dx);
        const r = this.radius;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(angle);

        // Motion trail
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-r * 2, 0);
        ctx.lineTo(-r * 6, -r * 0.3);
        ctx.lineTo(-r * 6, r * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Arrow shaft
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(-r * 2.5, -0.8, r * 4, 1.6);

        // Arrowhead
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(r * 2.5, 0);
        ctx.lineTo(r * 0.8, -r * 0.8);
        ctx.lineTo(r * 1.2, 0);
        ctx.lineTo(r * 0.8, r * 0.8);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = '#aa4444';
        ctx.beginPath();
        ctx.moveTo(-r * 2, -r * 0.6);
        ctx.lineTo(-r * 2.5, -r * 0.1);
        ctx.lineTo(-r * 1.5, -r * 0.1);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * 2, r * 0.6);
        ctx.lineTo(-r * 2.5, r * 0.1);
        ctx.lineTo(-r * 1.5, r * 0.1);
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
