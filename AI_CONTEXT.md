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
- Towers block grid cells
- Placement must NOT block all paths

### Currency
- Called **Kindness**
- Earned when grumpies become happy
- Spent to place towers

---

## Towers

### Hug Tower
- Single target
- Freezes target
- High sadness reduction

### Therapy Dog
- Mobile unit
- Can handle up to 4 targets
- Medium sadness reduction

### Affirmation Tower
- Single target
- Sends text bubbles
- Medium sadness reduction

### Radio Tower
- AoE passive
- Low sadness reduction

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
- Never allow tower placement that blocks all paths
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
- "Rewrote tower system"

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

- Keep code size small
- Avoid dependencies
- Reuse logic where possible
- Avoid duplication
- Prefer simple math over libraries

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

- UI buttons for tower selection
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