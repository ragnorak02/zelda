# Achievement System — Integration Contract

This document defines how `achievements.json` should be consumed by the game runtime. It is a **contract only** — it does not implement engine-specific code.

## Data Source

All achievement state lives in `/achievements.json`. The runtime reads/writes this file (or its localStorage mirror) as the single source of truth.

```
achievements.json
├── gameId          — must match the repo folder name
├── achievements[]  — ordered list of achievement definitions
│   ├── id          — unique string key (snake_case)
│   ├── name        — display name
│   ├── description — short description shown in UI
│   ├── points      — integer point value
│   ├── icon        — relative path (placeholder until art exists)
│   ├── unlocked    — boolean
│   └── unlockedAt  — ISO 8601 timestamp or null
└── meta
    ├── totalPointsEarned — sum of unlocked achievement points
    └── lastUpdated       — ISO 8601 timestamp of last mutation
```

## Menu Integration

### Recommended Menu Label

**"Achievements"** — shown as a tab or button in the pause menu or main menu.

### Menu Panel Behavior

When the player opens the Achievements tab:

1. Load `achievements.json` (or its localStorage equivalent).
2. Render a scrollable list of all achievements.
3. Each row shows: icon, name, description, points, and locked/unlocked state.
4. Unlocked achievements display in full color with a checkmark and the unlock date.
5. Locked achievements display greyed out with a lock icon.
6. A header shows total points earned and progress fraction (e.g. "85 / 290 pts — 7 / 20").
7. Closing the panel returns to the previous menu state.

### Data Flow

```
Game event (e.g. enemy killed)
  → Check unlock condition
  → If met and not already unlocked:
      → Set achievement.unlocked = true
      → Set achievement.unlockedAt = new Date().toISOString()
      → Recalculate meta.totalPointsEarned
      → Set meta.lastUpdated
      → Persist to localStorage
      → Fire toast notification
```

## Unlock Flow Expectations

The game code is responsible for calling an unlock function at the appropriate moment. The achievement system itself does **not** poll or watch for conditions — it is purely event-driven.

### Recommended API Shape

```js
// Check and unlock (idempotent — safe to call multiple times)
achievementSystem.unlock('first_steps');

// Query state
achievementSystem.isUnlocked('first_steps');  // → boolean
achievementSystem.getProgress();               // → { earned: 85, total: 290, count: 7, of: 20 }
```

### Idempotency

Calling `unlock()` on an already-unlocked achievement must be a no-op. It must not:
- Reset `unlockedAt`
- Re-fire the toast
- Re-count points

## Overlay Toast Specification

When an achievement unlocks, the game should display a temporary toast notification.

### Layout

```
┌──────────────────────────────────┐
│  [icon]  Achievement Name        │
│          +10 pts                 │
└──────────────────────────────────┘
```

### Behavior

| Property        | Value                                    |
|-----------------|------------------------------------------|
| Position        | Top-center of viewport, below game title |
| Width           | 300px max, responsive                    |
| Background      | Semi-transparent dark (`rgba(0,0,0,0.85)`) with gold border |
| Icon size       | 32x32px (placeholder: colored circle)    |
| Name font       | Bold 14px monospace, white               |
| Points font     | 12px monospace, gold (`#f1c40f`)         |
| Enter animation | Slide down + fade in, 300ms ease-out     |
| Display time    | 3 seconds                                |
| Exit animation  | Fade out, 500ms                          |
| Stacking        | Queue multiple toasts, show one at a time |
| Z-index         | Above game canvas, below modal overlays  |

### When NOT to Show

- During the character select screen
- During the game over screen
- While a modal overlay (upgrade, pause) is active — queue and show after dismissal

## Safe Update Rules

When adding achievements in future updates:

1. **Only append** new entries to the `achievements` array.
2. **Never remove** existing achievements.
3. **Never reset** `unlocked` or `unlockedAt` on existing entries.
4. **Never change** the `id` of an existing achievement.
5. **Always recalculate** `meta.totalPointsEarned` as the sum of points for unlocked achievements.
6. **Always update** `meta.lastUpdated` on any mutation.
7. Changing `name`, `description`, `points`, or `icon` on existing achievements is allowed but should be done sparingly.

## localStorage Key

```
zelda_achievements
```

The game should load from localStorage on startup and fall back to the bundled `achievements.json` if no saved data exists. On first load, copy the bundled file into localStorage. On subsequent loads, merge: add any new achievements from the bundled file that don't exist in localStorage, but preserve all user unlock state.
