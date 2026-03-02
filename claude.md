# Zelda (Working Title) — Amaris Development Spec

Engine: Vanilla JS (ES Modules)  
Platform: Browser  
Rendering: HTML5 Canvas 2D  
Resolution: Dynamic Canvas  
Genre: 2D Top-Down Action Adventure  
Studio: Amaris  
Controller Required: Yes (Xbox + Keyboard)  

---

# Amaris Studio Rules

- `project_status.json` is the single source of truth for dashboard metrics.
- This file defines architecture, systems, and structured development checkpoints.
- Do NOT duplicate completion percentages here.
- Controller-first design is mandatory.
- All major systems must be testable.
- Maintain structural consistency with other Amaris games.

If a checklist item does not apply, mark it **N/A** rather than deleting it.

---

# Project Overview

Browser-based 2D top-down action-adventure game inspired by early Zelda-style gameplay.

No build tools. No frameworks. No npm.

Pure ES modules served statically.

Core Loop:

CharacterSelect → PLAYING ⇄ PAUSED → GAME_OVER

World is procedurally generated and fully canvas-rendered.

---

# Architecture

## Entry Flow

index.html → js/main.js → Game (game.js) → requestAnimationFrame loop

---

# Godot Execution Contract

Godot is installed at:

Z:/godot

Claude MUST use the full explicit path when invoking Godot.

Never assume it is on PATH.  
Never use just `godot`.

Always use:

Z:/godot/godot.exe

Headless test execution pattern:

Z:/godot/godot.exe --path . --headless --quit-after 1

Scene execution pattern:

Z:/godot/godot.exe --path . --scene res://scenes/tests/test_runner.tscn

If running from Windows PowerShell:

& "Z:/godot/godot.exe" --path .

If Godot fails to launch:
1. Verify path exists.
2. Verify working directory is project root.
3. Do not attempt to reinstall.
4. Do not modify PATH.

---

## State Machine

CHARACTER_SELECT  
PLAYING  
PAUSED  
GAME_OVER  

---

## Core Systems

game.js — Main loop, state machine, routing  
player.js — Player entity + stats  
playerState.js — Z-axis state machine  
enemy.js — Enemy entity + behaviors  
weapons.js — EffectEngine (combat + hit detection)  
input.js — Unified action system (keyboard/mouse/gamepad)  
camera.js — Camera follow + culling  
ui.js — HUD + overlays  
dodge.js — DodgeSystem  
world.js — WorldManager (procedural generation)  
lockon.js — Lock-on system  
pause.js — Pause overlay  

spawn.js — SpawnSystem (wired into Game; upgrade to SpawnSystem v2 required)
upgrade.js — Upgrade system (wired; confirm integration points)
chargeMeter.js — Shared circular charge progress renderer
statusMenu.js — DOM-based Status Menu overlay (stats, moves, inventory, objective)

constants.js — All tuning values
utils.js — Math utilities

---

# Installed Systems — World Control Zones (Amaris Standard)

## Purpose

Prevent enemies from:
- Entering the town / safe areas
- Spawning inside safe areas
- Camping the player via uncontrolled respawn

This system is REQUIRED for “Town is Safe” behavior and must be enforced by code,
not implied by visuals (trees/walls).

---

## Zone Types (Minimum)

### TownZone (Safe Zone)

Rules:
- Enemies cannot enter TownZone.
- Enemies cannot spawn inside TownZone.
- If an enemy is forced into TownZone (edge-case), it must be redirected or safely despawned.
- Multiple TownZones must be supported.

Implementation Contract (Required API):
- `containsPoint(x, y): boolean`
- `getType(): "TOWN" | "NO_SPAWN" | "NO_ENEMY" | ...`
- Optional: `getBounds()` for debug overlay

Integration Requirements:
- Movement restriction (AI/pathing/collision) must respect TownZone.
- Spawn restriction must check TownZone before any spawn.

Debug (Required):
- Toggleable debug overlay showing zone bounds
- OFF by default in production builds

---

# Installed Systems — SpawnSystem v2 (Spawn Points + Cooldowns)

## Current Problem

Enemies respawn too frequently and appear everywhere, including near/inside safe areas.

## Goal

Replace uncontrolled spawning with:
- Designated spawn points
- Cooldowns
- Density caps
- Anti-camping rules
- Safe-zone restrictions (TownZone / NoSpawn)

---

## Required Entities

### EnemySpawnPoint

Per-point config:
- `enemyType`
- `cooldownMs`
- `maxAliveNearPoint`
- `radiusCheckPx`
- `enabled`
- Optional: `spawnGroupId` (for waves/regions later)

---

## Spawn Manager Rules (Required)

- Spawns ONLY occur at EnemySpawnPoint nodes (no random “spawn anywhere”).
- Block spawn if:
  - SpawnPoint is inside TownZone / NoSpawn zone
  - SpawnPoint is on cooldown
  - `aliveNearPoint >= maxAliveNearPoint`
  - Player is within minimum spawn distance (configurable)
- Do NOT respawn immediately upon death.
- Cooldown + caps must be deterministic and tunable via `constants.js`.

---

## Anti-Camping Rules (Required)

- Never spawn within X px of player (configurable).
- Prefer spawn points outside immediate camera view (recommended).
- Optional: “offscreen but nearby” selection if multiple points exist.

---

## Debug (Required)

- Overlay: draw spawn points + cooldown status + alive-near counts
- Structured spawn logs only when DEBUG_SPAWN is enabled
- Debug must be OFF by default

---

## Ability System

AbilitySet base class extended per character:

FighterAbilities  
MageAbilities  
CelestialAbilities  

All abilities push effects into EffectEngine.

---

## Characters

Fighter — 120 HP  
Mage — 80 HP  
Celestial — 70 HP  

All art is procedural (no sprite assets).

---

# Current Known Gaps

- ~~No structured quest/progression system~~ (CP29-30 complete)
- ~~No unlock mechanics~~ (CP31 — east bridge conditional removal)
- No external assets (audio/music)
- NPCs lack interaction depth
- ~~Save/load limited~~ (CP33 — quest/achievement/zone state persisted)
- ~~No settings menu~~ (CP11 complete)
- No boss encounters
- ~~No achievement trigger code~~ (CP32 — 20 hooks wired)
- Version not displayed on screen
- PAUSED not in State enum (handled via external flag)

---

# Structured Development Checklist (Amaris Standard — 54 Checkpoints)

## Macro Phase 1 — Foundation (1–8)

- [x] 1. Repo standardized
- [x] 2. Boots without console errors
- [x] 3. Unified input abstraction complete
- [x] 4. Controller navigation baseline
- [x] 5. Base state machine stable
- [x] 6. Error handling + logging pattern
- [x] 7. Config constants centralized
- [x] 8. Version/build identifier visible

---

## Macro Phase 2 — Menus & UX (9–16)

- [x] 9. Character select complete
- [x] 10. Pause menu complete
- [x] 11. Settings menu baseline
- [x] 12. Save/load stub validated
- [x] 13. HUD clarity baseline
- [x] 14. On-screen control hints
- [x] 15. UI navigation polish
- [x] 16. Consistent Back behavior

---

## Macro Phase 3 — Core Gameplay Loop (17–26)

- [x] 17. Movement + collision stable
- [x] 18. Combat loop stable
- [x] 19. Fail condition works
- [ ] 20. Win condition defined
- [x] 21. EffectEngine stable under stress
- [x] 22. Enemy behaviors tuned
- [x] 23. Dodge system reliable
- [x] 24. Lock-on stable
- [x] 25. First playable zone balanced
- [x] 26. Restart flow stable

---

## Macro Phase 4 — Systems Expansion (27–36)

- [x] 27. SpawnSystem wired into Game
- [x] 28. Upgrade system integrated

- [x] 28a. WorldZoneSystem added (TownZone + NoSpawn support)
- [x] 28b. TownZone blocks enemy entry (movement restriction enforced)
- [x] 28c. TownZone blocks enemy spawning (spawn restriction enforced)

- [x] 28d. SpawnSystem v2: spawn points implemented (EnemySpawnPoint)
- [x] 28e. SpawnSystem v2: cooldowns per spawn point
- [x] 28f. SpawnSystem v2: density caps near spawn point
- [x] 28g. SpawnSystem v2: anti-camping (min player distance)
- [x] 28h. SpawnSystem v2: debug overlay + structured logs

- [x] 29. Progression system defined (XP from enemy kills, level up with scaling thresholds)
- [x] 30. Quest framework implemented (QuestManager with 5 data-driven quests)
- [x] 31. Zone unlocking mechanics added (east bridge barricade conditional removal)
- [x] 32. Achievement hooks integrated (20 achievements with localStorage + toast system)
- [x] 33. Save persistence expanded (questData, achievementData, eastBridgeUnlocked added)
- [x] 34. Enemy variety expanded
- [ ] 35. Debug/dev tooling commands
- [ ] 36. Input remap support

---

## Macro Phase 5 — Vertical Slice & Content (37–42)

- [x] 37. Full gameplay loop vertical slice
- [ ] 38. 3+ zones meaningful
- [ ] 39. Boss encounter implemented
- [x] 40. Reward loop tuned
- [ ] 41. Ability balance pass
- [x] 42. UX clarity pass

---

## Macro Phase 6 — Testing & Stability (43–46)

- [x] 43. Automated test runner defined
- [ ] 44. test_results.json contract implemented
- [ ] 45. Smoke tests cover boot + combat
- [ ] 46. Performance baseline verified

---

## Macro Phase 7 — Visual + Audio + Release (47–54)

- [x] 47. Visual polish pass
- [ ] 48. UI animation/juice pass
- [ ] 49. External audio system integrated
- [ ] 50. Audio polish pass
- [x] 51. Controller prompts finalized
- [ ] 52. Credits screen
- [ ] 53. Release packaging script
- [ ] 54. Release build verified

---

# Current Focus

Current Goal: Phase 4 — Systems Expansion (finishing)
Current Task: Debug tooling + Input remap (CP35-36)
Work Mode: Feature
Next Milestone: Phase 5 — Vertical Slice & Content

---

# Debug Flags (Standard)

Must exist:
- DEBUG_ZONES
- DEBUG_SPAWN
- DEBUG_AI
- DEBUG_ABILITY
- DEBUG_STATUS_MENU

All default to false in production.

---

# Automation Reminder

After major updates:

- Update `project_status.json`
  - macroPhase
  - subphaseIndex
  - completionPercent
  - timestamps
  - testStatus
- Run smoke tests
- Commit changes
- Push to GitHub