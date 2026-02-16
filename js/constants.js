// ── World ──

export const WORLD = {
    WIDTH: 3000,
    HEIGHT: 3000,
    GRID_SIZE: 100
};

export const PLAYER_RADIUS = 14;

// ── MP Config ──

export const MP_CONFIG = {
    maxMp: 5,
    mpRegen: 0.5    // MP per second (1 MP every 2 seconds)
};

// ── Fighter Abilities ──

export const FIGHTER_ABILITIES = {
    charge: {
        tier1: { time: 1.0, damage: 20, name: 'Quick Slash' },
        tier2: { time: 2.0, damage: 40, name: 'Heavy Slash' },
        tier3: { time: 3.0, damage: 70, name: 'Devastating Blow' },
        range: 60,
        arc: Math.PI * 2 / 3,   // 120°
        color: '#64b5f6',
        moveSpeedMult: 0.4      // 40% speed while charging
    },
    wind: {
        mpCost: 1,
        damage: 8,
        pushForce: 300,
        range: 100,
        arc: Math.PI / 3,       // 60° cone
        color: '#a8e6cf',
        duration: 0.4
    },
    spin: {
        radius: 70,
        damage: 15,
        knockback: 250,
        cooldown: 4.0,
        duration: 0.3,
        color: '#42a5f5'
    }
};

// ── Mage Abilities ──

export const MAGE_ABILITIES = {
    fireBurst: {
        damage: 35,
        radius: 60,
        expandSpeed: 350,
        cooldown: 1.5,
        range: 150,
        color: '#ff7043'
    },
    frostRing: {
        damage: 15,
        radius: 120,
        expandSpeed: 250,
        slowFactor: 0.5,
        slowDuration: 3.0,
        cooldown: 5.0,
        mpCost: 1,
        color: '#80deea'
    },
    lightningArc: {
        damage: 30,
        chainCount: 3,
        damageDecay: 0.7,
        range: 200,
        cooldown: 3.0,
        color: '#fff176'
    },
    meteor: {
        damage: 80,
        radius: 80,
        delay: 1.5,
        holdTime: 1.5,
        cooldown: 8.0,
        mpCost: 2,
        warningColor: '#ff5722',
        impactColor: '#ff9800'
    }
};

// ── Celestial Abilities ──

export const CELESTIAL_ABILITIES = {
    fairy: {
        orbitRadius: 40,
        orbitSpeed: 2.0,
        healThreshold: 0.5,     // heal when player below 50% HP
        healAmount: 15,
        healCooldown: 2.0,
        boltDamage: 5,
        boltSpeed: 300,
        boltCooldown: 1.2,
        boltRange: 150,
        boltRadius: 4,
        color: '#e1bee7',
        glowColor: '#ce93d8'
    },
    spiritDash: {
        distance: 160,
        cooldown: 3.0,
        iframes: 0.2,
        color: '#b39ddb'
    },
    pulse: {
        damage: 25,
        radius: 100,
        expandSpeed: 300,
        knockback: 150,
        cooldown: 2.0,
        color: '#ce93d8'
    },
    minorHeal: {
        healPercent: 0.20,      // 20% of max HP
        mpCost: 2,
        cooldown: 6.0,
        color: '#a5d6a7'
    }
};

// ── Characters ──

export const CHARACTERS = {
    fighter: {
        name: 'Fighter',
        description: 'Armored warrior with charge attacks and wind magic',
        color: '#4a90d9',
        maxHp: 120,
        speed: 150,
        damage: 1.0,
        attackSpeed: 1.0,
        evadeType: 'roll',
        evadeLabel: 'Combat Roll',
        abilitySet: 'fighter'
    },
    mage: {
        name: 'Mage',
        description: 'Arcane caster with fire, frost, lightning, and meteor',
        color: '#9b59b6',
        maxHp: 80,
        speed: 180,
        damage: 1.2,
        attackSpeed: 0.8,
        evadeType: 'blink',
        evadeLabel: 'Blink',
        abilitySet: 'mage'
    },
    celestial: {
        name: 'Celestial',
        description: 'Spirit warrior with fairy companion and healing',
        color: '#2ecc71',
        maxHp: 70,
        speed: 220,
        damage: 0.8,
        attackSpeed: 1.5,
        evadeType: 'roll',
        evadeLabel: 'Combat Roll',
        abilitySet: 'celestial'
    }
};

// ── Enemy Types ──
//
// behavior:
//   'melee'  — chase → stop at range → windup → swing → recovery (shambler, brute, imp)
//   'ranged' — hold at distance, strafe, fire arrows (archer)

export const ENEMY_TYPES = {
    shambler: {
        name: 'Shambler',
        color: '#c0392b',
        radius: 12,
        hp: 30,
        speed: 60,
        damage: 15,             // per-hit melee damage
        xp: 10,
        behavior: 'melee',
        attackRange: 50,        // stop ~2 body widths away before swiping
        windupTime: 0.4,
        recoveryTime: 0.5,
        attackCooldown: 1.2
    },
    imp: {
        name: 'Imp',
        color: '#e67e22',
        radius: 9,
        hp: 15,
        speed: 120,
        damage: 8,              // per-hit melee damage (fast attacker)
        xp: 8,
        behavior: 'melee',
        attackRange: 35,        // quick lunges from short range
        windupTime: 0.12,       // very fast windup
        recoveryTime: 0.15,
        attackCooldown: 0.5     // attacks frequently
    },
    brute: {
        name: 'Brute',
        color: '#8e44ad',
        radius: 18,
        hp: 80,
        speed: 40,
        damage: 25,             // per-hit melee damage
        xp: 25,
        behavior: 'melee',
        attackRange: 55,        // long reach, stops further out
        windupTime: 0.6,
        recoveryTime: 0.7,
        attackCooldown: 2.0
    },
    archer: {
        name: 'Archer',
        color: '#16a085',
        radius: 10,
        hp: 20,
        speed: 80,
        damage: 4,              // minimal contact damage
        xp: 12,
        behavior: 'ranged',
        preferredRange: 200,
        arrowSpeed: 250,
        arrowDamage: 12,
        arrowRadius: 4,
        arrowLifetime: 3.0,
        arrowCooldown: 2.0,
        arrowColor: '#d4a017'
    }
};

// ── Dodge / Evade ──

export const DODGE = {
    roll: {
        duration: 0.25,     // seconds
        speed: 500,          // units/second burst
        cooldown: 1.5,       // seconds
        iframes: 0.25        // invulnerability window
    },
    blink: {
        distance: 120,       // teleport distance in world units
        cooldown: 2.0,
        iframes: 0.15,
        effectDuration: 0.35 // visual ring effect duration
    }
};

// ── Back Jump ──

export const BACK_JUMP = {
    distance: 75,       // ~3.5 character widths
    speed: 600,          // units/second (fast burst)
    duration: 0.12,      // seconds (very quick)
    cooldown: 2.0,       // seconds
    iframes: 0.15        // invulnerability window
};

// ── Jump ──

export const JUMP = {
    initialVelocity: 300,    // units/sec upward
    gravity: 800,            // units/sec^2
    landSquashDuration: 0.1, // visual squash on landing
};

// ── Upgrades ──

export const UPGRADES = [
    {
        id: 'maxHp',
        name: '+25 Max HP',
        description: 'Increase maximum health by 25',
        stat: 'maxHp',
        value: 25
    },
    {
        id: 'speed',
        name: '+12% Speed',
        description: 'Move 12% faster',
        stat: 'speed',
        multiplier: 1.12
    },
    {
        id: 'damage',
        name: '+15% Damage',
        description: 'Deal 15% more damage',
        stat: 'damage',
        multiplier: 1.15
    },
    {
        id: 'attackSpeed',
        name: '+20% Atk Speed',
        description: 'Attack 20% faster',
        stat: 'attackSpeed',
        multiplier: 1.20
    },
    {
        id: 'weaponSize',
        name: '+15% Range',
        description: 'Increase weapon size and range',
        stat: 'weaponSize',
        multiplier: 1.15
    },
    {
        id: 'heal',
        name: 'Heal 40%',
        description: 'Restore 40% of max HP immediately',
        special: 'heal',
        value: 0.4
    },
    {
        id: 'defense',
        name: '+10% Defense',
        description: 'Take 10% less damage from enemies',
        stat: 'defense',
        value: 0.1
    },
    {
        id: 'extraProjectile',
        name: '+1 Projectile',
        description: 'Fire one additional projectile per attack',
        stat: 'extraProjectiles',
        value: 1
    }
];
