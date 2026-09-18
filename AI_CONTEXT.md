# AI_CONTEXT.md

## Project Overview

This is a small browser-based tower defense game built with:
- Plain JavaScript (no frameworks)
- HTML Canvas
- Single-file architecture (for now)

Game Title: **Kindness TD**

This project is intentionally:
- Simple
- Educational (built with a 4th grade student)
- Easy to modify and extend

---

## Core Game Concept

This is a **non-violent tower defense game**.

Enemies:
- Called **Grumpies**
- Do NOT have HP
- Have a **Sad Meter**

Grumpy traits (mutually exclusive on normal grumpies, by design - the spawn
rule uses distinct residues so they never stack):
- **Headphones**: ignores Affirming Words and Glad Radio
- **Dog allergy** (mask): Therapy Dogs skip them
- **No hugs** (prickly thorns): Huggers skip them
- **Stress Eater**: Advanced Mode only. Twice the sad meter of a normal grumpy
  of the same round. Detours to **cookies** scattered around the field instead
  of walking for the exit, pausing to nibble each one, and only heads for the
  exit once every cookie is gone. Carries a cookie so he is identifiable, and
  is drawn at 1.25 scale.

Cookies exist only in Advanced Mode. They are placed off the spawn row so every
one is a real detour, and buddies cannot be built on a cookie's cell.

Goal:
- Reduce Sad Meter to 0 using kindness
- Happy grumpies go to the **Happy Hangout**

Lose:
- Too many grumpies reach the exit still sad

---

## Core Systems

### Grid + Pathfinding
- Grid-based placement system
- BFS pathfinding (not A*)
- Buddies block grid cells
- Placement must NOT block all paths

### Currency
- Called **Kindness**
- Earned when grumpies become happy
- Spent to place buddies

---

## The Kindness Crew

Player-facing naming: one unit is a **buddy**, the group is your **kindness
crew**. Never call them towers in player-facing copy. In code the identifiers
match: `buddyCosts`, `placeBuddy`, `canPlaceBuddy`, `buddyPixelArt`, `hugBuddies`.
"Tower defense" stays in the README as the genre description.

### Hugger
- Single target
- Freezes target
- High sadness reduction

### Therapy Dog
- Mobile unit
- Can handle up to 4 targets
- Medium sadness reduction

### Affirming Words
- Single target
- Sends text bubbles
- Medium sadness reduction

### Glad Radio
- AoE passive
- Low sadness reduction

### Grumpies
- Pixel art on the **same block size as the buddies**: `PLAYFIELD_PIXEL_BLOCK`
  is 4px and both read it, so the two can no longer drift. A grumpy is a 7x7
  head (28px) against a 40px buddy. 6x6 was tried first and came out a rounded
  square with a letterbox mouth
- The head, headphone band and thorns all come from one polar test
  (`grumpyRingCells`) rather than hand-listed pixels
- `drawGrumpyCells` snaps every block to whole pixels. The Stress Eater's 1.25
  scale otherwise lands blocks on half-pixels, and canvas antialiases those into
  a blur
- `tools/sprite-preview.html` renders every grumpy and buddy variant at a chosen
  zoom, using the real draw functions. Dev only, not in the build

### Happy Horn the Unicorn (hero)
- Hero unit, limited to one on the field
- Auto-circles the nearest grumpy instead of standing still
- Leaves a fading rainbow trail; the trail itself cheers up grumpies it touches
- This is our hook into the 2026 "Unicorns and Rainbows" theme
- Immune to Negative Neil. Without this she is actively bad against him: she
  orbits at 34px, inside his 90px souring aura, so she would fly in and be
  disabled in about five seconds
- **Free to place in both modes.** What she costs the player is the tile she
  stands on and the Kindness her training takes, not a purchase price
- **Five levels** (`UNICORN_LEVELS`), bought by clicking her. They alternate,
  and each keeps what the level below bought: 2 faster (190), 3 stronger (240),
  4 faster (300), 5 stronger (380). Her coat recolours white, pink, purple,
  blue, gold so the level reads from across the field
- **Advanced Mode pre-places her** in the centre cell, so she is painting from
  the first grumpy rather than costing the player a tile-picking turn. The
  one-hero rule still applies, so she cannot be stacked with a placed one

---

## Difficulty

One **Challenge level** button on the title screen, above Start Game, that
cycles through three settings named the way a player would describe themselves
rather than as levels: **Casual Complimenter** (x1), **Normal Encourager**
(x5), **Expert Hugger** (x10).

A pixel heart sits at the right end of the button and scales with the setting
(`heart`: 2, 4, 6 pixel blocks) so the choice reads at a glance without any
text. It is centred on the button's height, so the Expert heart deliberately
outgrows the frame and spills over it. The heart itself is built from the
`HEART_ROWS` strings rather than a hand-listed pixel array, and drawn through
the existing `drawPixelArt`.

The multiplier applies to the **per-round climb only** (`getRoundSadBonus`),
not to the flat 100 base sad meter. Round 1 is therefore identical on all three
settings and the opening stays gentle for younger players; the difference
compounds into the late rounds, which is where the game was going slack once a
good crew was built:

| round | Casual | Normal | Expert |
|-------|--------|--------|--------|
| 1     | 100    | 100    | 100    |
| 3     | 104    | 120    | 140    |
| 5     | 158    | 390    | 680    |
| 10    | 293    | 1065   | 2030   |

Because it rides on `getRoundSadBonus`, the round intro text ("+N sad meter
each", "Next round: +N sad") reports the scaled numbers with no extra code.

Bosses scale by the factor a **normal grumpy of their round** scaled by, not by
the multiplier directly, so a boss stays the same multiple of the wave it
headlines on every setting: Headphone Hank ~9.9x a round-5 grumpy, Negative
Neil ~10.9x a round-10 one. `getRawRoundSadBonus` is the climb before the
multiplier, and `createGrumpy` uses it to work out how much the wave grew.

Applying the multiplier to a boss's flat base instead was tried and rejected:
a boss meter is nearly all base where a minion's is nearly all round bonus, so
the boss outpaces its own wave. Hank went from 9.9x a round-5 grumpy on Casual
to 22.9x on Expert Hugger (15,580 sad at round 5, before much crew is built).

| boss        | Casual | Normal | Expert |
|-------------|--------|--------|--------|
| Hank (r5)   | 1558   | 3846   | 6705   |
| Neil (r10)  | 3193   | 11606  | 22122  |

Advanced Mode's x2 `hpMultiplier` stacks on top of all of this, so Expert plus
Advanced puts Neil at 44,244.

Saved to `localStorage` under `ktd:diff` alongside `ktd:music`, wrapped in
try/catch, and the stored index is validated against `DIFFICULTIES` before use
so a junk value cannot throw. Advanced Mode's own x2 `hpMultiplier` is separate
and stacks on top.

---

## Architecture Rules (VERY IMPORTANT)

- DO NOT introduce frameworks (no Phaser, React, etc.)
- Keep everything compatible with a single JS file
- Prefer small, simple functions over abstractions
- Avoid classes unless clearly beneficial
- Avoid over-engineering

Each entity should behave like:
- `update(dt)`
- `draw(ctx)`

---

## Pathfinding Rules

- Always ensure a valid path exists
- Never allow buddy placement that blocks all paths
- Use BFS (already implemented)
- Recalculate paths only when necessary

---

## Coding Style

- Use plain JavaScript (ES modules optional later)
- Prefer `const` over `let`
- Use descriptive but short names
- Avoid deeply nested logic
- Avoid magic numbers (use constants when reasonable)

---

## Working With This Codebase

### 1. Make Small Changes Only
- Do NOT rewrite large sections
- Modify only what is necessary

### 2. Explain Before Changing
Always:
1. Describe planned changes
2. Then provide code

---

### 3. Keep Changes Incremental
Good:
- "Added therapy dog targeting fix"

Bad:
- "Rewrote buddy system"

---

### 4. Perform a Compile Check After Changes

Always verify:
- No syntax errors
- Variables exist
- Imports (if added) are valid
- Functions are defined before use

Then state:

Compile Check:
- No obvious syntax errors
- References look valid
- Runtime behavior likely correct (verify in browser)

---

### 5. Call Out Uncertainty

If unsure:
- Say so clearly
- Do NOT guess silently

---

## JS13K Constraints (IMPORTANT)

Kindness TD targets **js13kGames 2026**. The 2026 theme is
**Unicorns and Rainbows**, and the theme is a scored rating criterion.

- The submitted `.zip` must be **13,312 bytes or less**
- `index.html` must be at the top level of the zip and playable once unzipped
- **No external resources** at all: no CDNs, no web fonts, no analytics
- Must run with **no console errors** in latest Chrome and Firefox
- If storage is ever added, namespace keys (`ktd:`) and never call
  `localStorage.clear()` - games on the site share one origin
- Keep code size small
- Avoid runtime dependencies
- Reuse logic where possible
- Avoid duplication
- Prefer simple math over libraries

Run `npm run build` after changes: it produces `dist/kindness-td.zip` and fails
if the package goes over budget. Full checklist in `JS13K-2026.md`.

---

## Music

Square-wave lead over a triangle bass, scheduled ahead onto the WebAudio clock
from `update()` rather than a timer, so the beat does not wobble. Notes are hex
semitone offsets from A3 in a 32-character string; `.` is a rest.

- **Title screen**: Kindness March (`TITLE_TUNE`)
- **While a wave runs**: Sunny Skip (`ROUND_TUNE`)
- **Round popup, paused, game over**: silence

Each round starts its loop from step 0 rather than resuming mid-phrase, so the
music lines up with the wave.

Transitions fade over 500ms via a gain ramp; the tune only swaps once the
fade-out has finished, so nothing cuts abruptly.

`startAudio()` runs once at load so the title tune starts on its own where the
browser allows it, and again from `pointerdown` for browsers that require a
gesture. The `resume()` rejection is caught: an unhandled one would log an
error, and the competition requires a clean console.

Two mute controls, both writing the same setting: a music-note button in the
title screen's top-right corner (notes dim and a white slash crosses them when
muted) and a Music On/Off button on the pause screen. Saved to `localStorage`
under `ktd:music` - namespaced because js13k games share one origin - wrapped
in try/catch since private browsing throws.

## Performance Rules

- Avoid unnecessary recalculations
- Avoid running pathfinding every frame
- Prefer event-driven updates

---

## UX Rules

- Always show placement preview (valid/invalid)
- Feedback must be immediate and visual
- Keep controls simple (mouse + touch)

---

## Mobile Support

- Must support:
  - click
  - touchstart
  - touchmove
- Input handling should be shared logic

---

## Known Pitfalls (Avoid These)

- Do NOT allow full path blocking
- Do NOT let multiple systems fight over the same target
- Do NOT introduce hidden state
- Do NOT add complex architecture patterns

---

## AI Behavior Rules

You are a **collaborative coding assistant**, not an autonomous agent.

- Do NOT take over the codebase
- Do NOT refactor everything
- Stay within the current design
- Optimize for clarity and learning

---

## When Making Suggestions

Prefer:
- Simple solutions
- Readable code
- Incremental improvements

Avoid:
- Clever but confusing code
- Large rewrites
- Unnecessary abstractions

---

## Tone & Collaboration

- Act like a patient senior developer
- Optimize for teaching and clarity
- Keep explanations simple and direct
- Prioritize helping a beginner understand

---

## Optional Enhancements (Safe to Suggest)

- UI buttons for buddy selection
- Path visualization
- Grid snapping polish
- Basic sound effects

---

## Final Principle

This game is about kindness.

The code should reflect that:
- Simple
- Clear
- Encouraging
- Fun to build