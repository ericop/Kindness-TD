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

### HappyHorn the Unicorn (hero)
- Hero unit, limited to one on the field
- Auto-circles the nearest grumpy instead of standing still
- Leaves a fading rainbow trail; the trail itself cheers up grumpies it touches
- This is our hook into the 2026 "Unicorns and Rainbows" theme

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