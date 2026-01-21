---
name: Fix Chess Board Overlap Issue
overview: Fix the critical layout issue where the right accordion panel overlaps the chess board, obscuring pieces on the right side. The board must be fully visible and properly constrained within available space.
todos:
  - id: fix-layout-structure
    content: Update App.tsx to change right panel from flex-1 to fixed width w-80 flex-shrink-0
    status: completed
  - id: improve-board-sizing
    content: Update ChessBoard.tsx to calculate available space accounting for sidebar, right panel, and CoachPanel widths
    status: completed
  - id: add-overflow-protection
    content: Add proper overflow handling and constraints to prevent overlap
    status: completed
  - id: test-layout
    content: Test layout with CoachPanel open/closed and at different window sizes
    status: completed
isProject: false
---

# Fix Chess Board Overlap Issue

## Problem Analysis

The chess board is being overlapped by the right accordion panel (AI Opponent, Your Coach, Move Tree), obscuring pieces on files f, g, and h. This is caused by:

1. **Flex Layout Competition**: Both the board container and right panel use `flex-1`, competing for space without proper constraints
2. **Board Sizing**: The board size calculation doesn't account for the right panel width
3. **Missing Constraints**: No minimum width constraints or proper overflow handling to prevent overlap
4. **Layout Structure**: The three-column layout (Sidebar + Board/Right Panel + CoachPanel) needs better space distribution

## Solution

### 1. Fix Layout Structure in `src/App.tsx`

**Current structure:**

- Main container: `flex-1 flex gap-4 p-4 overflow-hidden`
- Board area: `flex-1 flex justify-center items-start min-w-0 max-w-2xl`
- Right panel: `flex-1 flex flex-col gap-4 overflow-hidden min-w-0 max-w-md`

**Issues:**

- Both `flex-1` children compete equally, causing overlap when space is limited
- Board container `max-w-2xl` (512px) + right panel `max-w-md` (448px) = 960px minimum, but no guarantee they fit
- No calculation accounts for sidebar (256px) and CoachPanel (320px when open)

**Changes needed:**

- Change right panel from `flex-1` to fixed width or use `flex-shrink-0` with explicit width
- Ensure board container respects remaining space
- Add proper min-width constraints to prevent overlap
- Calculate available space dynamically

### 2. Update Board Sizing Logic in `src/components/ChessBoard.tsx`

**Current calculation:**

```typescript
const maxSize = useMemo(() => {
  if (typeof window === 'undefined') return MAX_BOARD_SIZE
  return Math.min(MAX_BOARD_SIZE, Math.min(window.innerWidth * 0.4, window.innerHeight * 0.6))
}, [])
```

**Issues:**

- Uses fixed percentage (40% width) without accounting for actual panel widths
- Doesn't consider sidebar, right panel, or CoachPanel widths
- Can result in board being too large for available space

**Changes needed:**

- Calculate available width: `window.innerWidth - sidebarWidth - rightPanelWidth - coachPanelWidth - padding`
- Ensure board size + padding fits within calculated available space
- Add safety margin to prevent edge cases

### 3. Adjust Right Panel Width

**Options:**

- Option A: Fixed width (e.g., `w-80` = 320px) instead of `flex-1`
- Option B: Use `flex-shrink-0` with `min-w-md` and `max-w-md`
- Option C: Make it collapsible/expandable

**Recommendation:** Use fixed width `w-80` (320px) with `flex-shrink-0` to prevent it from shrinking and overlapping the board.

### 4. Ensure Proper Overflow Handling

- Add `overflow-hidden` to parent containers
- Ensure board container has `max-width: 100%` to prevent overflow
- Add `min-width: 0` where needed for flex items to shrink properly

## Implementation Steps

### Step 1: Update App.tsx Layout

- Change right panel from `flex-1` to fixed width `w-80 flex-shrink-0`
- Ensure board container uses remaining space properly
- Add proper gap spacing

### Step 2: Improve Board Size Calculation

- Update `ChessBoard.tsx` to calculate available space more accurately
- Account for sidebar (256px), right panel (320px), CoachPanel (320px when open, 0 when closed), and padding (32px total)
- Formula: `availableWidth = window.innerWidth - 256 - 320 - (coachPanelOpen ? 320 : 0) - 32`

### Step 3: Add Responsive Constraints

- Ensure board never exceeds available space
- Add minimum board size constraint
- Handle window resize events properly

### Step 4: Test and Verify

- Test with CoachPanel open and closed
- Test at different window sizes
- Verify no pieces are obscured
- Ensure board remains interactive

## Files to Modify

1. **`src/App.tsx`** - Fix layout structure and flex properties
2. **`src/components/ChessBoard.tsx`** - Improve board size calculation
3. **`src/index.css`** - Add any necessary utility classes if needed

## Expected Outcome

- Chess board is fully visible with no overlapping panels
- All pieces are accessible and clickable
- Layout adapts properly to window resizing
- Board size is constrained to available space
- Right panel has fixed width and doesn't compete for space
