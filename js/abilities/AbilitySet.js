/**
 * AbilitySet — base class for per-class ability systems.
 *
 * Each class (Fighter, Mage, Celestial) extends this and implements
 * its own ability logic. The Game routes input actions through
 * onActionPressed/Released/Held, and calls update/render each frame.
 */

export class AbilitySet {
    constructor(player, effectEngine) {
        this.player = player;
        this.effectEngine = effectEngine;
    }

    /** Called when an action button is first pressed. */
    onActionPressed(action) {}

    /** Called when an action button is released. */
    onActionReleased(action) {}

    /** Called each frame while an action is held. */
    onActionHeld(action, dt) {}

    /** Dodge intercept hook. Return true to consume the dodge. */
    onDodge(moveDir) { return false; }

    /** Aerial dodge hook. Return true to consume the dodge. */
    onAirDodge(moveDir) { return false; }

    /** Called when landing from airborne state. */
    onLand() {}

    /** Returns true if the character is in a shield/charge state. */
    isCharging() { return false; }

    /** Returns the shield color for this class, or null. */
    getShieldColor() { return null; }

    /** Per-frame logic (cooldowns, AI, etc). */
    update(dt, enemies) {}

    /** Per-class visuals (shield arc, fairy, charge glow, etc). */
    render(ctx, camera) {}

    /**
     * Returns array of ability status objects for HUD display.
     * Each: { name, ready, cooldownPct, binding, charging }
     */
    getAbilityStatus() {
        return [];
    }
}
