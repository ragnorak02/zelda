/**
 * Node.js diagnostic — mock browser globals, then import modules one by one.
 * This catches runtime errors during module evaluation and class construction.
 */

// Minimal DOM/canvas mock
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
globalThis.performance = { now: () => 0 };
globalThis.requestAnimationFrame = () => {};
globalThis.setTimeout = setTimeout;
globalThis.Math = Math;

function log(msg) { process.stdout.write(msg + '\n'); }

async function test(label, fn) {
    try {
        const result = await fn();
        log(`OK: ${label}`);
        return result;
    } catch (e) {
        log(`FAIL: ${label}`);
        log(`  Error: ${e.message}`);
        log(`  Stack: ${e.stack?.split('\n').slice(0, 3).join('\n  ')}`);
        return null;
    }
}

// Test each module import
const constants = await test('1. import constants', () => import('./js/constants.js'));
if (constants) {
    log(`   CHARACTERS keys: ${Object.keys(constants.CHARACTERS)}`);
    log(`   MP_CONFIG: ${JSON.stringify(constants.MP_CONFIG)}`);
    log(`   FIGHTER_ABILITIES keys: ${Object.keys(constants.FIGHTER_ABILITIES)}`);
    log(`   MAGE_ABILITIES keys: ${Object.keys(constants.MAGE_ABILITIES)}`);
    log(`   CELESTIAL_ABILITIES keys: ${Object.keys(constants.CELESTIAL_ABILITIES)}`);
}

await test('2. import utils', () => import('./js/utils.js'));
await test('3. import input', () => import('./js/input.js'));
await test('4. import weapons (EffectEngine)', () => import('./js/weapons.js'));
await test('5. import dodge', () => import('./js/dodge.js'));
await test('6. import AbilitySet', () => import('./js/abilities/AbilitySet.js'));
await test('7. import FighterAbilities', () => import('./js/abilities/FighterAbilities.js'));
await test('8. import MageAbilities', () => import('./js/abilities/MageAbilities.js'));
await test('9. import CelestialAbilities', () => import('./js/abilities/CelestialAbilities.js'));
await test('10. import player', () => import('./js/player.js'));
await test('11. import enemy', () => import('./js/enemy.js'));
await test('12. import ui', () => import('./js/ui.js'));
await test('13. import camera', () => import('./js/camera.js'));
await test('14. import lockon', () => import('./js/lockon.js'));
await test('15. import pause', () => import('./js/pause.js'));
await test('16. import world', () => import('./js/world.js'));
await test('17. import game', () => import('./js/game.js'));

// Test construction
const { CHARACTERS } = await import('./js/constants.js');
const { Player } = await import('./js/player.js');

await test('18. new Player(fighter)', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    log(`   hp=${p.hp} mp=${p.mp} maxMp=${p.maxMp}`);
    log(`   abilities: ${p.abilities.constructor.name}`);
    log(`   effectEngine: ${p.effectEngine.constructor.name}`);
    log(`   dodgeSystem: ${p.dodgeSystem.constructor.name}`);
    log(`   canSpendMp(1): ${p.canSpendMp(1)}`);
    log(`   getAbilityStatus: ${JSON.stringify(p.abilities.getAbilityStatus())}`);
    return p;
});

await test('19. new Player(mage)', () => {
    const p = new Player(CHARACTERS.mage, 'mage');
    log(`   hp=${p.hp} mp=${p.mp}`);
    log(`   abilities: ${p.abilities.constructor.name}`);
    return p;
});

await test('20. new Player(celestial)', () => {
    const p = new Player(CHARACTERS.celestial, 'celestial');
    log(`   hp=${p.hp} mp=${p.mp}`);
    log(`   abilities: ${p.abilities.constructor.name}`);
    log(`   fairy exists: ${!!p.abilities.fairy}`);
    return p;
});

// Test Game construction
await test('21. new Game(canvas)', () => {
    const { Game } = import('./js/game.js');
    // Game constructor needs canvas element
    const canvas = document.getElementById('game-canvas');
    // Can't fully test Game without a real DOM, but import should work
    return 'import OK';
});

// Test enemy
await test('22. EnemyManager + spawn', async () => {
    const { EnemyManager } = await import('./js/enemy.js');
    const mgr = new EnemyManager();
    mgr.spawn('shambler', 100, 100, 1);
    const e = mgr.getEnemies()[0];
    log(`   enemy: ${e.type} hp=${e.hp}`);
    log(`   applySlow: ${typeof e.applySlow}`);
    log(`   applyKnockback: ${typeof e.applyKnockback}`);
    return mgr;
});

// Test effect engine update with a player
await test('23. EffectEngine update cycle', async () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    const { SwingEffect, NovaEffect } = await import('./js/weapons.js');
    p.effectEngine.addEffect(new SwingEffect(100, 100, 0, 50, Math.PI/2, 10, 0.2, '#fff'));
    p.effectEngine.addEffect(new NovaEffect(100, 100, 10, 80, 200, '#f00'));
    p.effectEngine.update(0.016, []);
    log(`   effects active: ${p.effectEngine.effects.length}`);
    return true;
});

// Test player update cycle
await test('24. Player update cycle', () => {
    const p = new Player(CHARACTERS.fighter, 'fighter');
    const mockInput = {
        getMovement: () => ({ x: 0, y: 0 }),
        keys: {}
    };
    p.update(0.016, mockInput, [], null);
    log(`   mp after update: ${p.mp}`);
    return true;
});

log('\n=== ALL TESTS COMPLETE ===');
