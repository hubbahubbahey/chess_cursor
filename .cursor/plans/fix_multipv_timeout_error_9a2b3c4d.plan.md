---
name: Fix multipv timeout error
overview: Fix the "topMovesReject is not a function" error that occurs when the multipv calculation times out, preventing the variety feature from working correctly.
todos:
  - id: fix-timeout-handler
    content: Fix timeout handler in getTopMoves to save reject reference before calling stopCalculation
    status: completed
  - id: fix-stop-calculation
    content: Update stopCalculation to not clear topMovesReject if it's being used by timeout handler
    status: completed
isProject: false
---

# Fix Multipv Timeout Error

## Problem

When using the variety feature with multipv, if the calculation times out, there's an error: "Uncaught TypeError: topMovesReject is not a function" at line 265 in `engine.ts`. This happens because:

1. The timeout handler calls `stopCalculation()` which clears `topMovesReject`
2. Then the timeout handler tries to call `topMovesReject()` but it's already null

## Root Cause

In `src/lib/engine.ts`, the timeout handler for `getTopMoves`:

- Line 264: Calls `stopCalculation()` which sets `topMovesReject = null` (line 314)
- Line 265: Tries to call `topMovesReject(new Error('Move calculation timeout'))` but it's already null

## Solution

Save a reference to the reject function before calling `stopCalculation()`, or restructure the timeout handler to not rely on the global `topMovesReject` after `stopCalculation()` clears it.

## Files to Modify

### `src/lib/engine.ts`

**Fix the timeout handler in `getTopMoves` function** (around line 261-272):

- Save a reference to `topMovesReject` before calling `stopCalculation()`
- Use the saved reference instead of the global variable
- Alternatively, don't call `stopCalculation()` from the timeout handler since we're handling cleanup ourselves

**Option 1 (Recommended)**: Save reference before calling stopCalculation:

```typescript
moveTimeout = setTimeout(() => {
  if (topMovesReject === reject) {
    const savedReject = topMovesReject // Save reference
    stopCalculation() // This clears topMovesReject
    savedReject(new Error('Move calculation timeout')) // Use saved reference
    topMovesResolve = null
    topMovesReject = null
    topMoves.clear()
    expectedMultipv = 0
    moveTimeout = null
  }
}, 30000)
```

**Option 2**: Don't call stopCalculation, handle cleanup directly:

```typescript
moveTimeout = setTimeout(() => {
  if (topMovesReject === reject) {
    if (engine && isReady) {
      engine.postMessage('stop')
    }
    if (moveTimeout) {
      clearTimeout(moveTimeout)
      moveTimeout = null
    }
    topMovesReject(new Error('Move calculation timeout'))
    topMovesResolve = null
    topMovesReject = null
    topMoves.clear()
    expectedMultipv = 0
    // Reset multipv
    engine.postMessage('setoption name multipv value 1')
  }
}, 30000)
```

## Implementation Details

The recommended approach is Option 1 as it's simpler and reuses the existing `stopCalculation()` logic. We just need to save the reject function reference before it gets cleared.

## Testing

After the fix:

- Test with variety > 1 and let it timeout (unlikely in normal use, but should work)
- Verify normal multipv operation still works
- Verify timeout doesn't cause errors
- Test that moves are still collected and selected correctly
