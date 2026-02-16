# Game Direction

## Vision
A 2D top-down action-adventure in the spirit of classic Zelda, played in the browser.
Explore the town of Millhaven and surrounding areas, fight enemies, and progress through zones.

## What Exists
- Three playable character classes (Fighter, Mage, Celestial) with distinct ability sets
- JRPG-style town with NPC dialogue, shops (visual only), and distinct zone landmarks
- Full combat system: melee swings, projectiles, AoE effects, chain lightning, meteor
- Dodge/evade system with roll, blink, and backstep variants
- Jump + z-axis physics, vine grabbing, gap hazards
- Lock-on targeting, gamepad support, mobile touch controls
- Pause menu with character view and save/load

## Potential Next Steps (Suggestions — Not Committed)
- Wire SpawnSystem into Game to enable enemy encounters during exploration
- Wire upgrade system to level-up rewards after clearing enemy waves
- Add NPC interaction (talk action, shop UI, quest accept/complete)
- Implement bridge unlock / cave dungeon progression
- Add sound effects and music
- Add sprite-based art to replace procedural circles
- Implement inventory and item pickup system
- Add boss encounters at key locations (Cave, Fairy Tree)

## Design Principles
- Keep it playable in the browser with zero build step
- No external dependencies — vanilla JS only
- Gameplay feel over visual polish
- Modular systems that can be composed independently
