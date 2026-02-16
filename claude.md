# Zelda — Project Intelligence

## Overview
Browser-based 2D top-down action-adventure game built with vanilla JS + HTML5 Canvas.
No build tools, no frameworks, no npm — just ES modules served from a static file server.

## Architecture

### Entry Flow
`index.html` → `js/main.js` → `Game` (game.js) → requestAnimationFrame loop

### State Machine
`CHARACTER_SELECT → PLAYING ⇄ PAUSED → GAME_OVER`

### Core Systems
| File | Responsibility |
|---|---|
| `js/game.js` | Main loop, state machine, input routing, rendering pipeline |
| `js/player.js` | Player entity, movement, HP/MP, stat system, subsystem wiring |
| `js/playerState.js` | State machine (idle/moving/jumping/hanging/falling), z-axis physics |
| `js/enemy.js` | Enemy entity + EnemyManager, behaviors (swarm/melee/ranged), arrow projectiles |
| `js/weapons.js` | EffectEngine — combat visual effects + hit detection pool |
| `js/input.js` | Keyboard, mouse, touch, Xbox gamepad input (unified action system) |
| `js/camera.js` | Camera follow + viewport culling |
| `js/ui.js` | HUD (HP/MP bars, zone name, control bar, gamepad overlay, game over) |
| `js/dodge.js` | DodgeSystem — roll/blink/backstep evasion |
| `js/world.js` | WorldManager — map generation, collision, NPCs, zones, rendering |
| `js/lockon.js` | Lock-on targeting system |
| `js/pause.js` | Pause menu overlay |
| `js/spawn.js` | SpawnSystem — pressure-based enemy spawning (currently not wired into Game) |
| `js/upgrade.js` | Upgrade system (currently not wired into Game) |
| `js/constants.js` | All tuning values, character defs, enemy types, ability configs |
| `js/utils.js` | Math utilities (distance, normalize, clamp, lerp, randomInRange) |

### Ability System (per-class, extends AbilitySet)
| File | Class |
|---|---|
| `js/abilities/AbilitySet.js` | Base class — action routing, update/render interface |
| `js/abilities/FighterAbilities.js` | Charge attacks, wind push, spin attack, shield deflection |
| `js/abilities/MageAbilities.js` | Fire burst, frost ring, lightning arc, meteor |
| `js/abilities/CelestialAbilities.js` | Fairy companion, spirit dash, pulse, minor heal |

### Characters
- **Fighter** — 120 HP, roll dodge, charge + wind + spin abilities
- **Mage** — 80 HP, blink dodge, fire/frost/lightning/meteor abilities
- **Celestial** — 70 HP, roll dodge, fairy companion + spirit dash + pulse + heal

## Key Conventions
- Pure ES modules (`import`/`export`), no bundler
- Canvas 2D rendering only — no WebGL, no sprites, no asset loading
- All art is procedural (circles, rects, arcs, gradients)
- Input system uses action abstraction (`attack`, `dodge`, `jump`, etc.)
- Effect-based combat: abilities push effects into EffectEngine, engine handles hit detection
- World is 3000x3000 units, generated procedurally in WorldManager._generate()

## Current Repo State (Auto-Detected)
- No TODO/FIXME comments found in source
- No console.log/debug statements in production code
- No external assets (images, audio) — fully procedural rendering
- `SpawnSystem` (spawn.js) exists but is not imported or used by Game
- `UPGRADES` constant and upgrade.js exist but are not wired into gameplay
- World has defined zones (Millhaven, Fairy Tree, Cave, Bridge) but no quest/progression system
- NPCs have dialogue but no interaction system beyond proximity display
- Save/load system stores basic player state to localStorage
- test.html and test-node.mjs provide module-import smoke tests (not automated CI)
- Barricade at east bridge is purely visual — no unlock mechanic
- No enemy spawning during normal gameplay (SpawnSystem disconnected)
