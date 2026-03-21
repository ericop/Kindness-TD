# PLAN.md

## Goal

Improve usability and game flow by adding:

1. On-screen UI buttons for tower selection (mobile-friendly)
2. Visual feedback for selected tower
3. Basic wave control (start / next level)
4. Minimal polish without increasing complexity

---

## Constraints

- DO NOT rewrite existing systems
- DO NOT introduce frameworks
- Keep everything compatible with single-file JS
- Keep code simple and readable
- Changes must be incremental

---

## Phase 1: UI Tower Selection Buttons

### Objective
Allow players to select towers using on-screen buttons instead of keyboard.

### Tasks

1. Add UI button data structure
   - Array of buttons with:
     - x, y, width, height
     - label
     - tower type

2. Render buttons in `draw()`
   - Draw rectangle
   - Draw label text
   - Highlight selected tower

3. Handle input
   - Detect click/touch inside button bounds
   - Set `selectedTower`

### Done When

- Player can tap/click buttons to switch towers
- Selected tower is visually highlighted

---

## Phase 2: Placement UX Improvements

### Objective
Make placement clearer and more intuitive

### Tasks

1. Show tower cost near cursor or preview
2. Change preview color based on:
   - valid placement
   - enough kindness
3. Prevent placement if:
   - invalid path
   - insufficient kindness

### Done When

- Player understands why placement is blocked
- Feedback is immediate and visual

---

## Phase 3: Wave System (Minimal)

### Objective
Introduce basic game progression

### Tasks

1. Add `wave` to state
2. Add "Start Wave" button
3. Only spawn grumpies when wave is active
4. After all grumpies:
   - Show "Next Wave" button
   - Increase difficulty slightly:
     - more grumpies OR faster speed

### Done When

- Player manually starts wave
- Game progresses through multiple waves

---

## Phase 4: Basic Feedback Polish

### Objective
Make the game feel more alive

### Tasks

1. Add simple visual feedback:
   - flash or color change when grumpy becomes happy
2. Improve text bubbles:
   - slight variation in position
3. Add simple placement feedback:
   - console log or visual cue on placement

### Done When

- Actions feel responsive
- Player sees clear feedback for actions

---

## Phase 5: Guardrails

### Objective
Prevent bugs and confusion

### Tasks

1. Prevent placing towers on same grid cell
2. Ensure pathfinding still works after every placement
3. Ensure towers do not target invalid grumpies
4. Ensure no crashes if no path found

### Done When

- No soft-lock scenarios
- No obvious runtime errors

---

## Implementation Order

Follow strictly:

1. Phase 1 (UI buttons)
2. Phase 2 (placement UX)
3. Phase 3 (waves)
4. Phase 4 (polish)
5. Phase 5 (guardrails)

---

## Instructions for AI Assistant

When working on this plan:

- Only implement ONE task at a time
- Explain changes before coding
- Do NOT modify unrelated systems
- Keep code small and readable
- Perform compile check after each step

---

## Compile Check Template

After each change, verify:

- No syntax errors
- Variables exist
- Functions are defined
- No broken references

Then state:

Compile Check:
- No obvious syntax errors
- References valid
- Behavior likely correct (verify in browser)

---

## Definition of Success

- Game playable on desktop AND mobile
- Player can:
  - Select towers via UI
  - Place towers with clear feedback
  - Start and progress waves
- Code remains simple and understandable