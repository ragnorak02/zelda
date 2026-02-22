// ── Build ──

export const BUILD_VERSION = '0.3.0';

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
        chargedRangeMult: { tier1: 1.0, tier2: 1.3, tier3: 1.6 },
        globalRangeMult: 1.5,   // scales all charged attack ranges
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

// ── Shield Config (per-class directional block while charging) ──

export const SHIELD_CONFIG = {
    fighter:   { arc: Math.PI * 2 / 3, blockReduction: 1.0, sideReduction: 0.0, sideArc: Math.PI,       color: '#7ec8e3', pushForce: 200 },
    mage:      { arc: Math.PI / 2,     blockReduction: 1.0, sideReduction: 0.0, sideArc: Math.PI * 0.6, color: '#b388ff', pushForce: 150 },
    celestial: { arc: Math.PI * 2 / 3, blockReduction: 1.0, sideReduction: 0.0, sideArc: Math.PI * 0.8, color: '#a5d6a7', pushForce: 120 },
};

// ── Fighter Aerial Moves ──

export const FIGHTER_AERIAL = {
    diveRoll:     { slamSpeed: -500, forwardDist: 60, iframes: 0.3, landingDamage: 20, landingRadius: 50, landingColor: '#64b5f6' },
    fallingSlash: { slamSpeed: -600, damage: 45, range: 70, arc: Math.PI, color: '#42a5f5' },
    airWindBurst: { mpCost: 1, damage: 10, radius: 90, expandSpeed: 350, pushForce: 250, floatBoost: 150, color: '#a8e6cf' },
};

// ── Mage Aerial Moves ──

export const MAGE_AERIAL = {
    meteorDrop:   { slamSpeed: -700, damage: 60, radius: 70, landingColor: '#ff9800' },
    airBlink:     { distance: 100, iframes: 0.2, color: '#b388ff' },
    frostShatter: { damage: 20, radius: 100, expandSpeed: 300, slowFactor: 0.5, slowDuration: 2.5, mpCost: 1, color: '#80deea' },
};

// ── Celestial Aerial Moves ──

export const CELESTIAL_AERIAL = {
    divePulse:    { slamSpeed: -500, damage: 30, radius: 80, expandSpeed: 300, knockback: 200, landingColor: '#ce93d8' },
    airDash:      { distance: 130, iframes: 0.25, color: '#b39ddb' },
    fairyBarrage: { boltCount: 5, boltInterval: 0.08, boltDamage: 8, boltSpeed: 350, boltRadius: 4, range: 180, color: '#e1bee7' },
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

// ── Run (B-button hold) ──

export const RUN = {
    speedMult: 1.6,
    holdThreshold: 0.15,   // seconds before hold triggers run
};

// ── Jump ──

export const JUMP = {
    initialVelocity: 300,    // units/sec upward
    gravity: 800,            // units/sec^2
    landSquashDuration: 0.1, // visual squash on landing
};

export const AIR_MOVE_SPEED_MULT = 1.0;

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

// ── Zone Control Types ──
export const ZONE_TYPES = Object.freeze({
    TOWN: 'TOWN',           // No spawning, no enemy entry
    NO_SPAWN: 'NO_SPAWN',   // No spawning, enemies may chase through
    NO_ENEMY: 'NO_ENEMY',   // No spawning, no enemy entry
    WILD: 'WILD'            // Normal combat zone
});

export const ZONE_TYPE_MAP = {
    'Millhaven':       ZONE_TYPES.TOWN,
    'Starting Path':   ZONE_TYPES.NO_SPAWN,
    'The Fairy Tree':  ZONE_TYPES.NO_SPAWN,
    // All others default to WILD
};

// ── Enemy Spawn Points ──
export const ENEMY_SPAWN_POINTS = [
    { id: 'north_1', x: 1500, y: 900,  enemyType: 'shambler', cooldownMs: 5000,  maxAlive: 3, radiusPx: 200 },
    { id: 'north_2', x: 1500, y: 650,  enemyType: 'imp',      cooldownMs: 3000,  maxAlive: 4, radiusPx: 180 },
    { id: 'north_3', x: 1450, y: 500,  enemyType: 'archer',   cooldownMs: 8000,  maxAlive: 2, radiusPx: 250 },
    { id: 'west_1',  x: 700,  y: 1500, enemyType: 'shambler', cooldownMs: 5000,  maxAlive: 3, radiusPx: 200 },
    { id: 'west_2',  x: 500,  y: 1500, enemyType: 'brute',    cooldownMs: 12000, maxAlive: 1, radiusPx: 300 },
    { id: 'cave_1',  x: 300,  y: 1500, enemyType: 'imp',      cooldownMs: 3000,  maxAlive: 5, radiusPx: 180 },
    { id: 'cave_2',  x: 250,  y: 1450, enemyType: 'shambler', cooldownMs: 6000,  maxAlive: 2, radiusPx: 200 },
    { id: 'east_1',  x: 2100, y: 1500, enemyType: 'archer',   cooldownMs: 7000,  maxAlive: 2, radiusPx: 250 },
    { id: 'east_2',  x: 2300, y: 1500, enemyType: 'shambler', cooldownMs: 5000,  maxAlive: 3, radiusPx: 200 },
    { id: 'bridge_1',x: 2500, y: 1450, enemyType: 'brute',    cooldownMs: 15000, maxAlive: 1, radiusPx: 300 },
];

export const SPAWN_CONFIG = {
    MIN_PLAYER_DISTANCE: 250,
    PREFER_OFFSCREEN: true,
    BASE_COOLDOWN_MULT: 1.0,
    LEVEL_COOLDOWN_REDUCTION: 0.05,
};

// ── Guard Config ──

export const GUARD_CONFIG = {
    attackRadius: 120,
    damage: 20,
    attackCooldown: 1.5,
    invulnerable: true,
    attackVisualDuration: 0.2,
};

// ── Charge Meter (shared circular progress renderer) ──
export const CHARGE_METER = {
    FIGHTER_COLOR: '#64b5f6',
    MAGE_COLOR: '#ff7043',
    CELESTIAL_COLOR: '#a5d6a7',
    RING_WIDTH: 3,
    RADIUS_OFFSET: 18,
    BACKGROUND_ALPHA: 0.2,
    FOREGROUND_ALPHA: 0.7,
    TIER_FLASH_SPEED: 200,
};

// ── VFX Identity (per-character visual signature) ──
export const VFX_IDENTITY = {
    fighter: {
        dustColor: 'rgba(180, 160, 120, 0.6)',
        impactRingColor: 'rgba(100, 181, 246, 0.4)',
    },
    mage: {
        streakColor: '#ff7043',
        flareColor: '#fff3e0',
    },
    celestial: {
        beamColor: 'rgba(206, 147, 216, 0.5)',
        glowColor: 'rgba(225, 190, 231, 0.3)',
        particleColor: '#e1bee7',
    },
};

// ── Screen Shake ──
export const SCREEN_SHAKE = {
    MAX_INTENSITY: 12,
    DECAY_RATE: 8,
};

// ── XP / Level Scaffold ──
export const XP_CONFIG = {
    baseXpToLevel: 100,
    startingLevel: 1,
};

// ── Debug Flags ──
export const DEBUG_ZONES = false;
export const DEBUG_SPAWN = false;
export const DEBUG_AI = false;
export const DEBUG_ABILITY = false;
export const DEBUG_STATUS_MENU = false;
