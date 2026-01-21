---
name: Optimize multipv performance
overview: Reduce the performance impact of multipv by using time-based search or reducing depth when variety is enabled, making AI moves faster while maintaining quality.
todos:
  - id: add-time-based-search
    content: Add option to use time-based search (movetime) instead of depth for multipv
    status: cancelled
  - id: reduce-depth-for-multipv
    content: Reduce depth by 1-2 when using multipv to compensate for extra calculation
    status: completed
  - id: add-early-termination
    content: Accept moves as soon as we have enough top moves, even if not at full depth
    status: cancelled
isProject: false
---

# Optimize Multipv Performance

## Problem

Using multipv to get top N moves takes ~75% longer than getting just the best move because Stockfish has to calculate multiple principal variations. This makes the AI feel slow.

## Solution Options

### Option 1: Reduce Depth for Multipv (Recommended)
When using variety > 1, reduce the search depth by 1-2 levels. This compensates for the extra work multipv requires while still getting strong moves.

**Pros**: Simple, maintains quality, predictable timing
**Cons**: Slightly weaker moves (but still very strong)

### Option 2: Use Time-Based Search
Use `go movetime <ms>` instead of `go depth <n>` for multipv. Set a reasonable time limit (e.g., 2-3 seconds) that's similar to what depth-based search takes.

**Pros**: More consistent timing, can be faster
**Cons**: Less predictable move quality, need to tune time values

### Option 3: Hybrid Approach
Get the best move quickly first, then get top moves with reduced depth/time. This ensures we always have a move ready.

**Pros**: Fastest perceived response
**Cons**: More complex, might still take time for variety

## Recommended Implementation

Use **Option 1** (reduce depth) as it's the simplest and most effective:

- When `aiVariety > 1`, reduce depth by 1-2 for multipv calculations
- This should bring the time back close to original while maintaining strong play
- Easy to adjust the depth reduction if needed

## Files to Modify

### `src/stores/useAppStore.ts`

**In `triggerAiMove` function** (around line 381-387):
- When calling `getTopMoves`, reduce depth by 1-2
- Example: `const multipvDepth = Math.max(1, depth - 2)`
- Use `multipvDepth` for multipv, keep original `depth` for fallback

### `src/lib/engine.ts` (Optional)

If we want to add time-based search option:
- Add `getTopMovesWithTime(fen: string, movetime: number, count: number)` function
- Use `go movetime <ms>` instead of `go depth <n>`

## Implementation Details

### Depth Reduction Strategy

```typescript
// In triggerAiMove
const depth = DIFFICULTY_PRESETS[aiDifficulty]
if (aiVariety > 1) {
  // Reduce depth by 2 for multipv to compensate for extra calculation
  const multipvDepth = Math.max(1, depth - 2)
  const topMoves = await getTopMoves(currentFen, multipvDepth, aiVariety)
  // ...
} else {
  bestMove = await getBestMove(currentFen, depth)
}
```

This should reduce calculation time by approximately 50-75% (since depth reduction is exponential in chess engines), bringing it back close to the original timing.

## Testing

- Test with variety = 1 (should be same speed as before)
- Test with variety = 3-5 (should be faster than current, but still get good moves)
- Verify moves are still strong (within top N, just calculated faster)
- Test with different difficulty levels
- Measure actual time differences
