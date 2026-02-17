/**
 * Hybrid Nights Studio OS — contract-compliant test runner for Zelda.
 *
 * Outputs ONLY the required JSON to stdout.
 * Exit code: 0 on all pass, 1 on any failure.
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── Browser global mocks (same pattern as test-node.mjs) ──

globalThis.window = globalThis;
globalThis.document = {
    getElementById: (id) => ({
        getContext: () => new Proxy({}, { get: () => () => {} }),
        addEventListener: () => {},
        width: 800, height: 600,
        style: {},
        querySelectorAll: () => [],
        querySelector: () => null,
        remove: () => {},
        innerHTML: ''
    }),
    createElement: (tag) => ({
        id: '', innerHTML: '', style: {},
        addEventListener: () => {},
        appendChild: () => {},
        querySelectorAll: () => ({ forEach: () => {} }),
        querySelector: () => null,
        remove: () => {}
    }),
    body: { appendChild: () => {} },
    addEventListener: () => {}
};
Object.defineProperty(globalThis, 'navigator', {
    value: { getGamepads: () => [] },
    writable: true, configurable: true
});
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => {};
globalThis.setTimeout = setTimeout;
globalThis.Math = Math;

// ── Suppress all console output (stdout reserved for JSON) ──

const noop = () => {};
console.log = noop;
console.warn = noop;
console.error = noop;
console.info = noop;
console.debug = noop;

// ── Test harness ──

const results = [];
const startTime = Date.now();

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(msg || `Expected ${expected}, got ${actual}`);
    }
}

async function test(name, fn) {
    const t0 = Date.now();
    try {
        await fn();
        results.push({ name, status: 'pass', message: `OK (${Date.now() - t0}ms)` });
    } catch (e) {
        results.push({ name, status: 'fail', message: e.message });
    }
}

/** Convert a relative path (from project root) to a file:// URL safe for import(). */
function modURL(relPath) {
    return pathToFileURL(join(ROOT, relPath)).href;
}

// ════════════════════════════════════════════════════════════════
// A. File Existence (2 tests)
// ════════════════════════════════════════════════════════════════

await test('file-existence: all source modules', () => {
    const files = [
        'index.html', 'css/style.css',
        'js/utils.js', 'js/constants.js', 'js/input.js', 'js/camera.js',
        'js/player.js', 'js/playerState.js', 'js/enemy.js', 'js/weapons.js',
        'js/dodge.js', 'js/world.js', 'js/ui.js', 'js/game.js', 'js/main.js',
        'js/lockon.js', 'js/pause.js', 'js/spawn.js', 'js/upgrade.js',
        'js/abilities/AbilitySet.js', 'js/abilities/FighterAbilities.js',
        'js/abilities/MageAbilities.js', 'js/abilities/CelestialAbilities.js'
    ];
    for (const f of files) {
        assert(existsSync(join(ROOT, f)), `Missing: ${f}`);
    }
});

await test('file-existence: game.config.json', () => {
    assert(existsSync(join(ROOT, 'game.config.json')), 'Missing: game.config.json');
});

// ════════════════════════════════════════════════════════════════
// B. Module Imports / Scene Loading (4 tests)
// ════════════════════════════════════════════════════════════════

const constants = await import(modURL('js/constants.js'));
const utils = await import(modURL('js/utils.js'));

await test('module-import: constants exports', () => {
    assert(constants.CHARACTERS, 'CHARACTERS not exported');
    assert(constants.ENEMY_TYPES, 'ENEMY_TYPES not exported');
    assert(constants.MP_CONFIG, 'MP_CONFIG not exported');
    assert(constants.WORLD, 'WORLD not exported');
});

await test('module-import: utils exports', () => {
    assert(typeof utils.distance === 'function', 'distance not exported');
    assert(typeof utils.normalize === 'function', 'normalize not exported');
    assert(typeof utils.clamp === 'function', 'clamp not exported');
    assert(typeof utils.lerp === 'function', 'lerp not exported');
    assert(typeof utils.randomInRange === 'function', 'randomInRange not exported');
});

await test('module-import: all core modules', async () => {
    const modules = [
        'js/input.js', 'js/weapons.js', 'js/dodge.js',
        'js/abilities/AbilitySet.js', 'js/abilities/FighterAbilities.js',
        'js/abilities/MageAbilities.js', 'js/abilities/CelestialAbilities.js',
        'js/player.js', 'js/playerState.js', 'js/enemy.js',
        'js/ui.js', 'js/camera.js', 'js/lockon.js',
        'js/pause.js', 'js/world.js', 'js/spawn.js', 'js/upgrade.js'
    ];
    for (const m of modules) {
        await import(modURL(m));
    }
});

await test('module-import: game.js full dependency chain', async () => {
    await import(modURL('js/game.js'));
});

// ════════════════════════════════════════════════════════════════
// C. Core Gameplay Logic (~22 tests)
// ════════════════════════════════════════════════════════════════

// ── Utils (4) ──

await test('utils: distance', () => {
    const d = utils.distance({ x: 0, y: 0 }, { x: 3, y: 4 });
    assertEqual(d, 5, `Expected 5, got ${d}`);
});

await test('utils: normalize', () => {
    const n = utils.normalize(3, 4);
    assert(Math.abs(n.x - 0.6) < 0.001, `Expected x~0.6, got ${n.x}`);
    assert(Math.abs(n.y - 0.8) < 0.001, `Expected y~0.8, got ${n.y}`);
    const z = utils.normalize(0, 0);
    assertEqual(z.x, 0);
    assertEqual(z.y, 0);
});

await test('utils: clamp and lerp', () => {
    assertEqual(utils.clamp(5, 0, 10), 5);
    assertEqual(utils.clamp(-1, 0, 10), 0);
    assertEqual(utils.clamp(15, 0, 10), 10);
    assertEqual(utils.lerp(0, 10, 0.5), 5);
    assertEqual(utils.lerp(0, 10, 0), 0);
    assertEqual(utils.lerp(0, 10, 1), 10);
});

await test('utils: randomInRange bounds', () => {
    for (let i = 0; i < 100; i++) {
        const v = utils.randomInRange(5, 10);
        assert(v >= 5 && v <= 10, `Out of range: ${v}`);
    }
});

// ── Constants (3) ──

await test('constants: CHARACTERS completeness', () => {
    for (const key of ['fighter', 'mage', 'celestial']) {
        const c = constants.CHARACTERS[key];
        assert(c, `Missing character: ${key}`);
        assert(c.name, `${key} missing name`);
        assert(c.maxHp > 0, `${key} maxHp must be > 0`);
        assert(c.speed > 0, `${key} speed must be > 0`);
        assert(c.evadeType, `${key} missing evadeType`);
        assert(c.abilitySet, `${key} missing abilitySet`);
    }
});

await test('constants: ENEMY_TYPES completeness', () => {
    for (const key of ['shambler', 'imp', 'brute', 'archer']) {
        const e = constants.ENEMY_TYPES[key];
        assert(e, `Missing enemy type: ${key}`);
        assert(e.hp > 0, `${key} hp must be > 0`);
        assert(e.speed > 0, `${key} speed must be > 0`);
        assert(e.behavior, `${key} missing behavior`);
    }
});

await test('constants: ability configs completeness', () => {
    assert(constants.FIGHTER_ABILITIES.charge, 'Missing fighter charge');
    assert(constants.FIGHTER_ABILITIES.wind, 'Missing fighter wind');
    assert(constants.FIGHTER_ABILITIES.spin, 'Missing fighter spin');
    assert(constants.MAGE_ABILITIES.fireBurst, 'Missing mage fireBurst');
    assert(constants.MAGE_ABILITIES.frostRing, 'Missing mage frostRing');
    assert(constants.MAGE_ABILITIES.lightningArc, 'Missing mage lightningArc');
    assert(constants.MAGE_ABILITIES.meteor, 'Missing mage meteor');
    assert(constants.CELESTIAL_ABILITIES.fairy, 'Missing celestial fairy');
    assert(constants.CELESTIAL_ABILITIES.spiritDash, 'Missing celestial spiritDash');
    assert(constants.CELESTIAL_ABILITIES.pulse, 'Missing celestial pulse');
    assert(constants.CELESTIAL_ABILITIES.minorHeal, 'Missing celestial minorHeal');
});

// ── Player (6) ──

const { Player } = await import(modURL('js/player.js'));
const { CHARACTERS } = constants;

await test('player: fighter construction + stats', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    assertEqual(p.hp, 120);
    assertEqual(p.stats.maxHp, 120);
    assertEqual(p.stats.speed, 150);
    assertEqual(p.classKey, 'fighter');
    assert(p.abilities.constructor.name === 'FighterAbilities', 'Wrong ability set');
});

await test('player: mage construction + stats', () => {
    const p = new Player(CHARACTERS.mage, 'mage');
    assertEqual(p.hp, 80);
    assertEqual(p.stats.maxHp, 80);
    assertEqual(p.stats.speed, 180);
    assert(p.abilities.constructor.name === 'MageAbilities', 'Wrong ability set');
});

await test('player: celestial construction + stats', () => {
    const p = new Player(CHARACTERS.celestial, 'celestial');
    assertEqual(p.hp, 70);
    assertEqual(p.stats.maxHp, 70);
    assertEqual(p.stats.speed, 220);
    assert(p.abilities.constructor.name === 'CelestialAbilities', 'Wrong ability set');
});

await test('player: MP spend and check', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    assert(p.canSpendMp(1), 'Should be able to spend 1 MP');
    assert(p.canSpendMp(5), 'Should be able to spend 5 MP');
    assert(!p.canSpendMp(6), 'Should not spend 6 MP (max is 5)');
    assert(p.spendMp(2), 'spendMp(2) should return true');
    assertEqual(p.mp, 3);
    assert(!p.spendMp(4), 'spendMp(4) should fail with 3 MP');
    assertEqual(p.mp, 3);
});

await test('player: takeDamage + isDead', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    p.takeDamage(50);
    assertEqual(p.hp, 70);
    assert(!p.isDead(), 'Should not be dead at 70 HP');
    p.invulnTimer = 0;
    p.takeDamage(100);
    assert(p.hp <= 0, 'Should be at 0 HP');
    assert(p.isDead(), 'Should be dead');
});

await test('player: defense reduction', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    p.stats.defense = 0.5;
    p.takeDamage(100);
    assertEqual(p.hp, 70);
});

await test('player: update cycle', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    const mockInput = { getMovement: () => ({ x: 0, y: 0 }), keys: {} };
    p.update(0.016, mockInput, [], null);
    assert(p.hp > 0, 'Player should still be alive after update');
});

// ── Enemy (3) ──

const { EnemyManager } = await import(modURL('js/enemy.js'));

await test('enemy: spawn + getEnemies', () => {
    const mgr = new EnemyManager();
    mgr.spawn('shambler', 100, 100, 1);
    mgr.spawn('archer', 200, 200, 1);
    assertEqual(mgr.getEnemies().length, 2);
    assertEqual(mgr.getEnemies()[0].type, 'shambler');
    assertEqual(mgr.getEnemies()[1].type, 'archer');
});

await test('enemy: takeDamage + death', () => {
    const mgr = new EnemyManager();
    mgr.spawn('shambler', 100, 100, 1);
    const enemy = mgr.getEnemies()[0];
    assertEqual(enemy.hp, 30);
    enemy.takeDamage(15);
    assertEqual(enemy.hp, 15);
    assert(!enemy.dead, 'Should not be dead at 15 HP');
    enemy.takeDamage(20);
    assert(enemy.dead, 'Should be dead');
});

await test('enemy: debuff methods', () => {
    const mgr = new EnemyManager();
    mgr.spawn('shambler', 100, 100, 1);
    const enemy = mgr.getEnemies()[0];
    enemy.applySlow(0.5, 3.0);
    assertEqual(enemy.slowFactor, 0.5);
    assertEqual(enemy.slowTimer, 3.0);
    enemy.applyKnockback(1, 0, 200);
    assertEqual(enemy.knockbackVx, 200);
    assertEqual(enemy.knockbackVy, 0);
});

// ── Weapons (3) ──

const weapons = await import(modURL('js/weapons.js'));

await test('weapons: effect class construction', () => {
    const proj = new weapons.Projectile(0, 0, 100, 0, 10, 5, 2.0, '#fff');
    assertEqual(proj.type, 'projectile');
    assert(proj.alive, 'Projectile should be alive');

    const swing = new weapons.SwingEffect(0, 0, 0, 50, Math.PI / 2, 10, 0.2, '#fff');
    assertEqual(swing.type, 'swing');

    const nova = new weapons.NovaEffect(0, 0, 10, 80, 200, '#f00');
    assertEqual(nova.type, 'nova');

    const pulse = new weapons.PulseEffect(0, 0, 25, 100, 300, 150, '#ce93d8');
    assertEqual(pulse.type, 'pulse');

    const frost = new weapons.FrostRingEffect(0, 0, 15, 120, 250, 0.5, 3.0, '#80deea');
    assertEqual(frost.type, 'frostRing');
});

await test('weapons: effect update lifecycle', () => {
    const proj = new weapons.Projectile(0, 0, 100, 0, 10, 5, 0.1, '#fff');
    proj.update(0.05);
    assert(proj.alive, 'Should still be alive at 0.05s');
    assertEqual(proj.x, 5);
    proj.update(0.06);
    assert(!proj.alive, 'Should be dead after exceeding lifetime');
});

await test('weapons: EffectEngine cleanup of dead effects', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    const eng = p.effectEngine;
    eng.addEffect(new weapons.Projectile(0, 0, 100, 0, 10, 5, 0.05, '#fff'));
    eng.addEffect(new weapons.NovaEffect(0, 0, 10, 80, 200, '#f00'));
    assertEqual(eng.effects.length, 2);
    eng.update(0.1, []);
    assertEqual(eng.effects.length, 1);
    assertEqual(eng.effects[0].type, 'nova');
});

// ── World (2) ──

const { WorldManager } = await import(modURL('js/world.js'));

await test('world: construction + zone detection at town center', () => {
    const w = new WorldManager();
    const zone = w.getZoneName(1500, 1500);
    assertEqual(zone, 'Millhaven');
    const wild = w.getZoneName(50, 50);
    assertEqual(wild, 'Wilderness');
});

await test('world: collision resolution returns valid position', () => {
    const w = new WorldManager();
    const r = w.resolveCollision(1500, 1550, 14);
    assert(typeof r.x === 'number' && !isNaN(r.x), 'x must be a valid number');
    assert(typeof r.y === 'number' && !isNaN(r.y), 'y must be a valid number');
});

// ── Dodge (1) ──

await test('dodge: DodgeSystem initial readiness', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    assert(p.dodgeSystem.isReady(), 'DodgeSystem should start ready');
    assert(!p.dodgeSystem.isRolling(), 'Should not be rolling');
    assert(!p.dodgeSystem.isMovementLocked(), 'Movement should not be locked');
});

// ════════════════════════════════════════════════════════════════
// D. Performance Sanity (2 tests)
// ════════════════════════════════════════════════════════════════

await test('performance: 1000 Player updates < 500ms', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    const mockInput = { getMovement: () => ({ x: 0, y: 0 }), keys: {} };
    const t0 = Date.now();
    for (let i = 0; i < 1000; i++) {
        p.update(0.016, mockInput, [], null);
    }
    const elapsed = Date.now() - t0;
    assert(elapsed < 500, `Took ${elapsed}ms, expected < 500ms`);
});

await test('performance: 100 WorldManager constructions < 2000ms', () => {
    const t0 = Date.now();
    for (let i = 0; i < 100; i++) {
        new WorldManager();
    }
    const elapsed = Date.now() - t0;
    assert(elapsed < 2000, `Took ${elapsed}ms, expected < 2000ms`);
});

// ════════════════════════════════════════════════════════════════
// Output (contract-compliant JSON)
// ════════════════════════════════════════════════════════════════

const totalMs = Date.now() - startTime;
const passed = results.filter(r => r.status === 'pass').length;

const output = {
    status: passed === results.length ? 'pass' : 'fail',
    testsTotal: results.length,
    testsPassed: passed,
    durationMs: totalMs,
    timestamp: new Date().toISOString(),
    details: results
};

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
process.exit(passed === results.length ? 0 : 1);
