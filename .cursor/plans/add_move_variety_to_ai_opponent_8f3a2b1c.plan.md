---
name: Add move variety to AI opponent
overview: Add variety to AI opponent by allowing it to randomly select from Stockfish's top N moves instead of always playing the best move, while maintaining strong play.
todos:
  - id: add-variety-state
    content: Add aiVariety state and setter to useAppStore
    status: completed
  - id: implement-get-top-moves
    content: Implement getTopMoves function in engine.ts using Stockfish multipv
    status: completed
  - id: update-trigger-ai-move
    content: Update triggerAiMove to use variety setting and randomly select from top moves
    status: completed
  - id: add-variety-ui
    content: Add variety control slider/selector to AiControlPanel
    status: completed
isProject: false
---

# Add Move Variety to AI Opponent

## Problem

The AI opponent always plays the exact best move from Stockfish, making games predictable. After 1.d4, it always plays Nf6, which is correct but repetitive.

## Solution

Use Stockfish's `multipv` (multiple principal variations) feature to get the top N moves, then randomly select from them. This adds variety while keeping the AI strong.

## Implementation

### 1. Add Variety Setting to Store

**File**: `src/stores/useAppStore.ts`

- Add `aiVariety: number` to state (1-5, where 1 = always best move, 5 = random from top 5)
- Add `setAiVariety: (variety: number) => void` setter
- Default variety: 3 (random from top 3 moves)

### 2. Extend Engine to Support Multiple Moves

**File**: `src/lib/engine.ts`

- Add `getTopMoves(fen: string, depth: number, count: number): Promise<string[]>` function
- Use Stockfish `multipv` command to get multiple principal variations
- Parse `info` lines with `multipv` to extract top moves
- Return array of moves in UCI format, sorted by evaluation

**Key changes**:
- Send `setoption name multipv value <count>` before calculating
- Parse `info depth X multipv Y score cp X pv <move1> <move2> ...` lines
- Collect moves from all multipv lines
- Return array of moves

### 3. Update triggerAiMove to Use Variety

**File**: `src/stores/useAppStore.ts`

- Modify `triggerAiMove` to call `getTopMoves` when variety > 1
- Randomly select from the top N moves
- Fall back to `getBestMove` if variety is 1 or if multipv fails

### 4. Add UI Control for Variety

**File**: `src/components/AiControlPanel.tsx`

- Add variety slider/selector below difficulty
- Range: 1-5
- Label: "Move Variety" with description
- Show current value

## Technical Details

### Stockfish multipv Usage

1. Before calculating: `setoption name multipv value 3`
2. Calculate: `go depth 8`
3. Parse output:
   ```
   info depth 8 multipv 1 score cp 25 pv g8f6 d2d4 ...
   info depth 8 multipv 2 score cp 20 pv d7d5 d2d4 ...
   info depth 8 multipv 3 score cp 18 pv e7e6 d2d4 ...
   ```
4. Extract moves from `pv` field (first move in each line)

### Move Selection Logic

- If variety = 1: Use best move only (current behavior)
- If variety > 1: Get top N moves, randomly select one
- Weight by evaluation (optional): Higher eval moves more likely

## Files to Modify

1. `src/stores/useAppStore.ts` - Add variety state and update triggerAiMove
2. `src/lib/engine.ts` - Add getTopMoves function with multipv support
3. `src/components/AiControlPanel.tsx` - Add variety control UI

## Testing

- Test with variety = 1 (should behave as before)
- Test with variety = 3 (should see different moves)
- Verify moves are still strong (within top N)
- Test with different difficulties
- Verify no performance issues with multipv
