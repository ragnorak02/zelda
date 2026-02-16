# Test Plan

## Current Testing
- **test.html** — Browser-based smoke test that imports every module and constructs key objects (Player, Game, EnemyManager). Outputs pass/fail to a `<pre>` element. Open in browser to run.
- **test-node.mjs** — Node.js equivalent with DOM mocks. Run with `node test-node.mjs`. Tests module imports and object construction for all 3 character classes.

## How to Run

### Browser Tests
1. Serve the project root with any static server (e.g., `npx serve .` or Python `http.server`)
2. Open `test.html` in the browser
3. All 20 tests should print "OK"

### Node Tests
```bash
node test-node.mjs
```
All 24 tests should print "OK".

## What Is Tested
- Module import integrity (all 17 JS modules load without error)
- Player construction for all 3 classes (fighter, mage, celestial)
- AbilitySet creation and getAbilityStatus()
- EffectEngine construction and update cycle
- DodgeSystem construction
- EnemyManager spawn and enemy creation
- Game class import and construction
- One full update + render frame simulation

## What Is NOT Tested (Gaps)
- No automated CI pipeline
- No unit tests for combat damage calculations
- No integration tests for input → ability → effect → hit pipeline
- No tests for world collision resolution
- No tests for save/load round-trip integrity
- No tests for dodge/blink cooldown timing
- No visual regression testing
- No performance benchmarking

## Recommended Additions
1. Add assertions to test-node.mjs (currently just checks for no-throw)
2. Test damage calculations: Player.takeDamage with defense stat
3. Test MP spend/regen cycle
4. Test DodgeSystem cooldown and movement lock
5. Test EnemyManager melee attack cycle (chase → windup → attack → recovery)
6. Test world collision: push-from-circle, push-from-rect, gap detection
