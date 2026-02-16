/**
 * PlayerStateMachine — manages player states including ground and airborne.
 *
 * States: idle, moving, strafing, jumping, hanging, falling
 *
 * Z-axis physics for jump: vz -= gravity * dt; z += vz * dt;
 * Landing when z <= 0.
 */

import { JUMP } from './constants.js';

export class PlayerStateMachine {
    constructor(player) {
        this.player = player;
        this.state = 'idle';

        // Z-axis (height above ground)
        this.z = 0;
        this.vz = 0;

        // Landing squash visual
        this.landSquash = 0;

        // Vine hanging
        this.hangTarget = null;
        this.hangTimer = 0;
        this.hangLerpTarget = 0;

        // Gap fall tracking
        this.lastSafeX = player.x;
        this.lastSafeY = player.y;
        this.gapFallTimer = 0;
        this.gapFalling = false;
        this.gapFallAlpha = 1;

        // Fall damage tracking
        this.fallStartZ = 0;
    }

    // ── Queries ──

    get isGrounded() {
        return this.state === 'idle' || this.state === 'moving' || this.state === 'strafing';
    }

    get isAirborne() {
        return this.state === 'jumping' || this.state === 'falling';
    }

    canDodge() {
        return this.isGrounded;
    }

    canMove() {
        return this.isGrounded;
    }

    canUseAbility() {
        return this.state !== 'hanging' && this.state !== 'falling';
    }

    // ── Actions ──

    requestJump() {
        if (!this.isGrounded) return false;
        this.vz = JUMP.initialVelocity;
        this.state = 'jumping';
        this.fallStartZ = 0;
        return true;
    }

    dismountVine() {
        if (this.state !== 'hanging') return;
        // Small upward boost when leaving vine
        this.vz = JUMP.initialVelocity * 0.5;
        this.state = 'jumping';
        this.fallStartZ = this.z;
        this.hangTarget = null;
        this.hangTimer = 0;
    }

    enterFalling(isGapFall) {
        if (this.isAirborne) return;
        this.vz = 0;
        this.state = 'falling';
        this.fallStartZ = this.z;

        if (isGapFall) {
            this.gapFalling = true;
            this.gapFallTimer = 0.5;
            this.gapFallAlpha = 1;
        }
    }

    enterHanging(vine) {
        this.state = 'hanging';
        this.hangTarget = vine;
        this.hangTimer = 3.0; // 3 second timeout
        this.hangLerpTarget = vine.grabHeight;
        // Don't snap — lerp will handle it in update
        this.vz = 0;
    }

    // ── Per-frame ──

    update(dt, moveInput, isStrafing, world) {
        // Track last safe position while grounded and not over a gap
        if (this.isGrounded && world) {
            const gap = world.checkGap(this.player.x, this.player.y, this.player.radius);
            if (!gap) {
                this.lastSafeX = this.player.x;
                this.lastSafeY = this.player.y;
            }
        }

        // Update ground state based on movement
        if (this.isGrounded) {
            const hasInput = moveInput.x !== 0 || moveInput.y !== 0;
            if (hasInput) {
                this.state = isStrafing ? 'strafing' : 'moving';
            } else {
                this.state = 'idle';
            }
        }

        // Z-axis physics for jumping/falling
        if (this.state === 'jumping' || this.state === 'falling') {

            // Gap fall: fade out and respawn
            if (this.gapFalling) {
                this.gapFallTimer -= dt;
                this.gapFallAlpha = Math.max(0, this.gapFallTimer / 0.5);

                if (this.gapFallTimer <= 0) {
                    // Respawn at last safe position
                    this.player.x = this.lastSafeX;
                    this.player.y = this.lastSafeY;
                    this.player.takeDamage(15);
                    this.player.invulnTimer = 1.0;
                    this.z = 0;
                    this.vz = 0;
                    this.gapFalling = false;
                    this.gapFallAlpha = 1;
                    this.state = 'idle';
                    this.player.z = this.z;
                    return;
                }
                // Don't apply normal physics during gap fall
                this.player.z = this.z;
                return;
            }

            this.vz -= JUMP.gravity * dt;
            // Terminal velocity cap
            this.vz = Math.max(this.vz, -600);
            this.z += this.vz * dt;

            // Track fall start when velocity turns negative (apex of jump)
            if (this.state === 'jumping' && this.vz < 0 && this.z > this.fallStartZ) {
                this.fallStartZ = this.z;
            }

            // Check vine grab while airborne
            if (world && this.vz <= 0) {
                const vine = world.checkVineGrab(
                    this.player.x, this.player.y, this.player.radius, this.z
                );
                if (vine) {
                    this.enterHanging(vine);
                    return;
                }
            }

            // Landing
            if (this.z <= 0) {
                this.z = 0;
                this.vz = 0;
                this.landSquash = JUMP.landSquashDuration;

                // Fall damage from height
                if (this.fallStartZ > 80) {
                    const dmg = (this.fallStartZ - 80) * 0.3;
                    this.player.takeDamage(dmg);
                }
                this.fallStartZ = 0;

                this.state = 'idle';
            }
        }

        // Hanging: lerp to grab height, bob slightly, timeout
        if (this.state === 'hanging') {
            // Smooth lerp to grab height
            const diff = this.hangLerpTarget - this.z;
            if (Math.abs(diff) > 0.5) {
                this.z += diff * 15 * dt;
            } else {
                // Close enough — snap and bob
                this.z = this.hangTarget.grabHeight + Math.sin(performance.now() / 300) * 2;
            }

            this.hangTimer -= dt;
            if (this.hangTimer <= 0) {
                // Timeout → fall
                this.fallStartZ = this.z;
                this.hangTarget = null;
                this.state = 'falling';
                this.vz = 0;
            }
        }

        // Landing squash decay
        if (this.landSquash > 0) {
            this.landSquash -= dt;
            if (this.landSquash < 0) this.landSquash = 0;
        }

        // Sync z to player
        this.player.z = this.z;
    }
}
