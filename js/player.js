/**
 * Player entity — movement, health, MP, stats, directional facing, and rendering.
 *
 * Direction model:
 *   moveDir   – raw input direction from WASD / joystick / left stick
 *   facing    – visual facing set by mouse cursor / right stick (or lock-on target)
 *   attackDir – direction attacks fire toward (always equals facing)
 *
 * Facing is decoupled from movement: the character always faces the mouse
 * (or right-stick) direction while WASD / left stick provides world-space
 * strafing.  Lock-on overrides facing toward the locked target.
 *
 * Delegates effects to EffectEngine.
 * Delegates abilities to per-class AbilitySet.
 * Delegates evasion to DodgeSystem.
 */

import { WORLD, PLAYER_RADIUS, MP_CONFIG } from './constants.js';
import { clamp, normalize, lightenColor, darkenColor } from './utils.js';
import { EffectEngine } from './weapons.js';
import { DodgeSystem } from './dodge.js';
import { PlayerStateMachine } from './playerState.js';
import { AbilitySet } from './abilities/AbilitySet.js';
import { FighterAbilities } from './abilities/FighterAbilities.js';
import { MageAbilities } from './abilities/MageAbilities.js';
import { CelestialAbilities } from './abilities/CelestialAbilities.js';

export class Player {
    constructor(characterDef, classKey) {
        // Spawn at world center (town square)
        this.x = WORLD.WIDTH / 2;
        this.y = WORLD.HEIGHT / 2;
        this.radius = PLAYER_RADIUS;
        this.color = characterDef.color;
        this.characterName = characterDef.name;
        this.classKey = classKey;
        this.evadeType = characterDef.evadeType;

        // Mutable stats
        this.stats = {
            maxHp: characterDef.maxHp,
            speed: characterDef.speed,
            damage: characterDef.damage,
            attackSpeed: characterDef.attackSpeed,
            defense: 0,
            weaponSize: 1,
            extraProjectiles: 0
        };

        this.hp = this.stats.maxHp;
        this.invulnTimer = 0;

        // MP system
        this.maxMp = MP_CONFIG.maxMp;
        this.mp = this.maxMp;
        this.mpRegenTimer = 0;

        // Direction vectors
        this.moveDir = { x: 0, y: 0 };
        this.facing = { x: 1, y: 0 };
        this.attackDir = { x: 1, y: 0 };

        // Lock-on target reference (set by Game each frame)
        this.lockOnTarget = null;

        // Z-axis (height above ground, synced from state machine)
        this.z = 0;

        // Strafe mode flag (set by Game each frame)
        this.isStrafing = false;

        // Subsystems
        this.effectEngine = new EffectEngine(this);
        this.abilities = this._createAbilitySet(classKey);
        this.dodgeSystem = new DodgeSystem(this, characterDef.evadeType);
        this.stateMachine = new PlayerStateMachine(this);
    }

    _createAbilitySet(classKey) {
        switch (classKey) {
            case 'fighter':  return new FighterAbilities(this, this.effectEngine);
            case 'mage':     return new MageAbilities(this, this.effectEngine);
            case 'celestial': return new CelestialAbilities(this, this.effectEngine);
            default:         return new AbilitySet(this, this.effectEngine);
        }
    }

    // ── MP System ──

    canSpendMp(cost) {
        return this.mp >= cost;
    }

    spendMp(cost) {
        if (this.mp < cost) return false;
        this.mp -= cost;
        return true;
    }

    update(dt, input, enemies, world) {
        // 1. Dodge tick (applies roll/backstep velocity if active)
        const wasDodging = this.dodgeSystem.isMovementLocked();
        this.dodgeSystem.update(dt);

        // 2. Movement — suppressed during roll, backstep, and non-ground states
        //    Use wasDodging to prevent double-velocity on the frame dodge ends
        const canMove = !wasDodging && !this.dodgeSystem.isMovementLocked() && this.stateMachine.canMove();
        const move = input.getMovement();
        this.moveDir.x = move.x;
        this.moveDir.y = move.y;

        if (canMove) {
            // Fighter charge slows movement
            let speedMult = 1;
            if (this.abilities.getChargeSpeedMult) {
                speedMult = this.abilities.getChargeSpeedMult();
            }

            this.x += move.x * this.stats.speed * speedMult * dt;
            this.y += move.y * this.stats.speed * speedMult * dt;
        }

        // 3. World obstacle collision (skip gaps when airborne)
        if (world) {
            const r = world.resolveCollision(this.x, this.y, this.radius, this.stateMachine.isAirborne);
            this.x = r.x;
            this.y = r.y;
        }

        // 4. World bounds
        this.x = clamp(this.x, this.radius, WORLD.WIDTH - this.radius);
        this.y = clamp(this.y, this.radius, WORLD.HEIGHT - this.radius);

        // 5. Gap check: grounded player over a gap → fall
        if (world && this.stateMachine.isGrounded) {
            const gap = world.checkGap(this.x, this.y, this.radius);
            if (gap) {
                this.stateMachine.enterFalling(true);
            }
        }

        // 6. Facing direction — lock-on overrides toward target
        if (this.lockOnTarget && !this.lockOnTarget.dead) {
            const dir = normalize(
                this.lockOnTarget.x - this.x,
                this.lockOnTarget.y - this.y
            );
            if (dir.x !== 0 || dir.y !== 0) {
                this.facing.x = dir.x;
                this.facing.y = dir.y;
            }
        }

        // 7. Attack direction always equals facing
        this.attackDir.x = this.facing.x;
        this.attackDir.y = this.facing.y;

        // 8. Invulnerability cooldown
        if (this.invulnTimer > 0) this.invulnTimer -= dt;

        // 9. MP regeneration
        this.mpRegenTimer += dt;
        const regenInterval = 1 / MP_CONFIG.mpRegen; // seconds per MP
        while (this.mpRegenTimer >= regenInterval) {
            this.mpRegenTimer -= regenInterval;
            if (this.mp < this.maxMp) {
                this.mp = Math.min(this.mp + 1, this.maxMp);
            }
        }

        // 10. Ability system tick
        this.abilities.update(dt, enemies);

        // 11. Effect engine tick (cooldowns + effects + hits)
        this.effectEngine.update(dt, enemies);

        // 12. State machine tick (z-axis physics, vine grabs, landing)
        this.stateMachine.update(dt, move, this.isStrafing, world);
    }

    takeDamage(amount) {
        if (this.invulnTimer > 0) return;
        const reduced = amount * (1 - this.stats.defense);
        this.hp -= reduced;
        this.invulnTimer = 0.3;
        if (this.hp < 0) this.hp = 0;
    }

    isDead() {
        return this.hp <= 0;
    }

    render(ctx, camera) {
        // Dodge effects (trail / blink rings) render behind player
        this.dodgeSystem.render(ctx, camera);

        // Ability visuals behind player (dash trail, fairy, etc.)
        this.abilities.render(ctx, camera);

        const s = camera.worldToScreen(this.x, this.y);
        const z = this.z;
        const sm = this.stateMachine;

        // ── Shadow (when airborne) ──
        if (z > 0) {
            const shadowScale = Math.max(0.3, 1 - z / 120);
            ctx.globalAlpha = 0.3 * shadowScale;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, this.radius * shadowScale, this.radius * 0.4 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // ── Landing squash ──
        let scaleX = 1, scaleY = 1;
        if (sm.landSquash > 0) {
            const t = sm.landSquash / 0.1;
            scaleX = 1 + t * 0.3;
            scaleY = 1 - t * 0.25;
        } else if (z > 0) {
            scaleX = 1.05;
            scaleY = 1.05;
        }

        // Fade out during gap fall
        if (sm.gapFalling) {
            ctx.globalAlpha = sm.gapFallAlpha;
        }

        // Flash when invulnerable
        if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const drawY = s.y - z;

        ctx.save();
        ctx.translate(s.x, drawY);
        ctx.scale(scaleX, scaleY);

        const r = this.radius;
        const fx = this.facing.x;
        const fy = this.facing.y;
        const time = performance.now() / 1000;
        const isMoving = this.moveDir.x !== 0 || this.moveDir.y !== 0;
        const bob = isMoving ? Math.sin(time * 10) * 1.2 : 0;

        // ── Ground contact shadow ──
        if (z === 0) {
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, r * 0.35, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // ── Body ──
        const bodyGrad = ctx.createRadialGradient(-2, bob - 2, 1, 0, bob, r);
        bodyGrad.addColorStop(0, lightenColor(this.color, 35));
        bodyGrad.addColorStop(0.7, this.color);
        bodyGrad.addColorStop(1, darkenColor(this.color, 50));
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, bob, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darkenColor(this.color, 60);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ── Class accent on body ──
        if (this.classKey === 'fighter') {
            // Belt / armor band
            ctx.strokeStyle = darkenColor(this.color, 30);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, bob, r * 0.65, Math.PI * 0.3, Math.PI * 0.7);
            ctx.stroke();
            // Shoulder pads
            const perpX = -fy;
            const perpY = fx;
            ctx.fillStyle = darkenColor(this.color, 25);
            ctx.beginPath();
            ctx.arc(perpX * r * 0.7, bob + perpY * r * 0.7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-perpX * r * 0.7, bob - perpY * r * 0.7, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.classKey === 'mage') {
            // Arcane inner glow
            const pulse = 0.15 + Math.sin(time * 3) * 0.08;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = lightenColor(this.color, 80);
            ctx.beginPath();
            ctx.arc(0, bob, r * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (this.classKey === 'celestial') {
            // Nature leaf marks
            ctx.strokeStyle = lightenColor(this.color, 50);
            ctx.lineWidth = 1.5;
            const leafA = time * 0.5;
            for (let i = 0; i < 3; i++) {
                const a = leafA + i * (Math.PI * 2 / 3);
                const lx = Math.cos(a) * r * 0.45;
                const ly = bob + Math.sin(a) * r * 0.45;
                ctx.beginPath();
                ctx.ellipse(lx, ly, 3, 1.5, a, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // ── Head ──
        const headR = r * 0.52;
        const headX = fx * r * 0.15;
        const headY = -r * 0.42 + fy * r * 0.15 + bob;
        const headGrad = ctx.createRadialGradient(headX - 1, headY - 1, 1, headX, headY, headR);
        headGrad.addColorStop(0, lightenColor(this.color, 55));
        headGrad.addColorStop(1, this.color);
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(headX, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darkenColor(this.color, 40);
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Eyes ──
        const perpEyeX = -fy;
        const perpEyeY = fx;
        const eyeSpread = headR * 0.4;
        const eyeFwd = headR * 0.32;

        for (let side = -1; side <= 1; side += 2) {
            const ex = headX + fx * eyeFwd + perpEyeX * eyeSpread * side;
            const ey = headY + fy * eyeFwd + perpEyeY * eyeSpread * side;
            // White
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
            ctx.fill();
            // Pupil
            ctx.fillStyle = '#111';
            ctx.beginPath();
            ctx.arc(ex + fx * 0.8, ey + fy * 0.8, 1.1, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
        ctx.globalAlpha = 1;

        // Combat effects (swings, projectiles, novas, etc.)
        this.effectEngine.render(ctx, camera);
    }
}
