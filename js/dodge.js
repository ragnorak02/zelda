/**
 * DodgeSystem — evasive movement with per-class behavior.
 *
 * Unified dodge via execute(moveDir, facingDir):
 *   - If moveDir has input: directional dodge (roll/blink) in move direction
 *   - If moveDir is zero: backstep — leap backward opposite to facingDir
 *
 * Roll (Fighter / Celestial):
 *   Quick burst of speed with full i-frames.
 *
 * Blink (Mage):
 *   Instant short-range teleport with brief i-frames.
 *
 * Single shared cooldown for both directional and backstep variants.
 */

import { normalize, clamp } from './utils.js';
import { WORLD, DODGE, BACK_JUMP } from './constants.js';

export class DodgeSystem {
    constructor(player, evadeType) {
        this.player = player;
        this.evadeType = evadeType; // 'roll' | 'blink'

        // ── Shared cooldown ──
        this.cooldown = 0;
        this.maxCooldown = 0;

        // ── Roll state ──
        this.active = false;    // true while roll movement is in progress
        this.timer = 0;
        this.direction = { x: 0, y: 0 };
        this.trail = [];

        // ── Blink effects ──
        this.blinkEffects = [];

        // ── Backstep state ──
        this.backstepActive = false;
        this.backstepTimer = 0;
        this.backstepDir = { x: 0, y: 0 };
        this.backstepTrail = [];
    }

    // ── Unified dodge ──

    /**
     * Execute a dodge action.
     * @param {object} moveDir - Current movement input {x, y}. Zero = no directional input.
     * @param {object} facingDir - Player's current facing direction {x, y}.
     */
    execute(moveDir, facingDir) {
        if (this.cooldown > 0 || this.active || this.backstepActive) return;

        const hasInput = moveDir.x !== 0 || moveDir.y !== 0;

        if (hasInput) {
            // Directional dodge in movement direction
            const dir = normalize(moveDir.x, moveDir.y);
            if (dir.x === 0 && dir.y === 0) return;

            if (this.evadeType === 'blink') {
                this._triggerBlink(dir);
            } else {
                this._triggerRoll(dir);
            }
        } else {
            // Backstep — leap backward opposite to facing
            const dir = normalize(facingDir.x, facingDir.y);
            if (dir.x === 0 && dir.y === 0) return;

            this._triggerBackstep({ x: -dir.x, y: -dir.y });
        }
    }

    // ── Roll / Blink / Backstep internals ──

    _triggerRoll(dir) {
        const cfg = DODGE.roll;
        this.direction = dir;
        this.active = true;
        this.timer = cfg.duration;
        this.cooldown = cfg.cooldown;
        this.maxCooldown = cfg.cooldown;
        this.player.invulnTimer = Math.max(this.player.invulnTimer, cfg.iframes);
    }

    _triggerBlink(dir) {
        const cfg = DODGE.blink;

        // Effect at origin
        this.blinkEffects.push({
            x: this.player.x, y: this.player.y,
            timer: cfg.effectDuration, maxTimer: cfg.effectDuration,
            radius: this.player.radius
        });

        // Teleport
        this.player.x += dir.x * cfg.distance;
        this.player.y += dir.y * cfg.distance;

        // Clamp to world
        this.player.x = clamp(this.player.x, this.player.radius, WORLD.WIDTH - this.player.radius);
        this.player.y = clamp(this.player.y, this.player.radius, WORLD.HEIGHT - this.player.radius);

        // Effect at destination
        this.blinkEffects.push({
            x: this.player.x, y: this.player.y,
            timer: cfg.effectDuration, maxTimer: cfg.effectDuration,
            radius: 4
        });

        this.player.invulnTimer = Math.max(this.player.invulnTimer, cfg.iframes);
        this.cooldown = cfg.cooldown;
        this.maxCooldown = cfg.cooldown;
    }

    _triggerBackstep(dir) {
        this.backstepDir.x = dir.x;
        this.backstepDir.y = dir.y;
        this.backstepActive = true;
        this.backstepTimer = BACK_JUMP.duration;
        this.cooldown = BACK_JUMP.cooldown;
        this.maxCooldown = BACK_JUMP.cooldown;

        // Brief i-frames
        this.player.invulnTimer = Math.max(this.player.invulnTimer, BACK_JUMP.iframes);
    }

    // ── Per-frame update ──

    update(dt) {
        // Shared cooldown
        if (this.cooldown > 0) this.cooldown -= dt;

        // Roll movement
        if (this.active) {
            const spd = DODGE.roll.speed;
            this.player.x += this.direction.x * spd * dt;
            this.player.y += this.direction.y * spd * dt;
            this.timer -= dt;

            this.trail.push({ x: this.player.x, y: this.player.y, alpha: 0.6 });
            if (this.trail.length > 6) this.trail.shift();

            if (this.timer <= 0) this.active = false;
        }

        // Backstep movement
        if (this.backstepActive) {
            const spd = BACK_JUMP.speed;
            this.player.x += this.backstepDir.x * spd * dt;
            this.player.y += this.backstepDir.y * spd * dt;
            this.backstepTimer -= dt;

            this.backstepTrail.push({ x: this.player.x, y: this.player.y, alpha: 0.5 });
            if (this.backstepTrail.length > 4) this.backstepTrail.shift();

            if (this.backstepTimer <= 0) this.backstepActive = false;
        }

        // Fade trails
        for (const t of this.trail) t.alpha -= dt * 3;
        this.trail = this.trail.filter(t => t.alpha > 0);

        for (const t of this.backstepTrail) t.alpha -= dt * 4;
        this.backstepTrail = this.backstepTrail.filter(t => t.alpha > 0);

        // Tick blink effects
        for (const e of this.blinkEffects) {
            e.timer -= dt;
            e.radius += dt * 80;
        }
        this.blinkEffects = this.blinkEffects.filter(e => e.timer > 0);
    }

    // ── Queries ──

    isRolling() {
        return this.active;
    }

    /** True if any movement override is active (roll or backstep). */
    isMovementLocked() {
        return this.active || this.backstepActive;
    }

    isReady() {
        return this.cooldown <= 0 && !this.active && !this.backstepActive;
    }

    getCooldownPercent() {
        if (this.maxCooldown <= 0) return 0;
        return Math.max(0, this.cooldown / this.maxCooldown);
    }

    // ── Rendering ──

    render(ctx, camera) {
        // Roll trail
        for (const t of this.trail) {
            const s = camera.worldToScreen(t.x, t.y);
            ctx.globalAlpha = t.alpha * 0.5;
            ctx.fillStyle = this.player.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.player.radius * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Backstep trail
        for (const t of this.backstepTrail) {
            const s = camera.worldToScreen(t.x, t.y);
            ctx.globalAlpha = t.alpha * 0.4;
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.player.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Blink effects
        for (const e of this.blinkEffects) {
            const s = camera.worldToScreen(e.x, e.y);
            const alpha = (e.timer / e.maxTimer) * 0.6;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = '#b388ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, e.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}
