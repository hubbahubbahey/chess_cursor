---
name: Integrate Stockfish Analysis into Coach Service
overview: Integrate the Python script's Stockfish analysis functionality into the existing coach service. This will enhance position analysis by first getting Stockfish evaluation and best move, then sending that data to LM Studio for explanation, matching the Python script's workflow.
todos:
  - id: "1"
    content: Create electron/stockfishService.ts with getEngineAnalysis function that spawns native Stockfish and parses UCI output
    status: completed
  - id: "2"
    content: Add IPC handler in electron/main.ts for stockfish:analyze
    status: completed
  - id: "3"
    content: Expose analyzePosition API in electron/preload.ts
    status: completed
  - id: "4"
    content: Enhance buildCoachPrompt in electron/llmService.ts to include Stockfish analysis data in prompts
    status: completed
  - id: "5"
    content: Update askCoach in src/stores/useAppStore.ts to fetch Stockfish analysis before building prompt for position/moves types
    status: completed
isProject: false
---

# Integrate Stockfish Analysis into Coach Service

## Overview

The Python script (`chess_analyst.py`) provides a workflow where:

1. Stockfish analyzes a position and returns evaluation + best move
2. This data is sent to LM Studio along with the position for explanation

We need to integrate this into the existing Electron app, which currently:

- Has Stockfish via `stockfish.js` (WASM) but only gets best move, not evaluation
- Has LM Studio integration but doesn't include Stockfish data in prompts

## Implementation Plan

### 1. Create Stockfish Analysis Service (`electron/stockfishService.ts`)

Create a new service that spawns the native Stockfish executable (similar to the Python script):

- **Function**: `getEngineAnalysis(fen: string, depth: number = 15)`
  - Spawns Stockfish process at `C:\Users\coldk\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe`
  - Uses UCI protocol to get evaluation and best move
  - Parses UCI info strings to extract:
    - Score (centipawns or mate)
    - Best move (in UCI format)
  - Returns: `{ evalText: string, bestMove: string, bestMoveSan: string }`
  - Format evaluation similar to Python script:
    - Mate: `"Mate in X"` or `"Mate in -X"`
    - Centipawns: Convert to pawn units (divide by 100)

- **Implementation details**:
  - Use Node.js `child_process.spawn()` to run Stockfish
  - Send UCI commands: `uci`, `isready`, `position fen <fen>`, `go depth <depth>`
  - Parse `info` lines for score (`cp` or `mate`)
  - Parse `bestmove` line for the move
  - Convert UCI move to SAN using `chess.js`
  - Handle timeouts and errors gracefully

### 2. Update IPC Handlers (`electron/main.ts`)

Add new IPC handler:

- `ipcMain.handle('stockfish:analyze', async (_, fen: string, depth?: number) => ...)`
  - Calls `getEngineAnalysis` from stockfishService
  - Returns the analysis result

### 3. Update Preload (`electron/preload.ts`)

Expose new API:

- `window.electronAPI.analyzePosition(fen: string, depth?: number)`
  - Calls the IPC handler

### 4. Enhance LLM Service (`electron/llmService.ts`)

Modify `buildCoachPrompt` function to optionally include Stockfish analysis:

- **New parameter**: `stockfishAnalysis?: { evalText: string, bestMove: string, bestMoveSan: string }`
- **Update prompt building**:
  - For `'position'` and `'moves'` analysis types, include Stockfish data if provided
  - Format similar to Python script:
    ```
    Data:
 - Position (FEN): {fen}
 - Engine Eval: {evalText} (Positive=White adv, Negative=Black adv)
 - Best Engine Move: {bestMoveSan}
    ```

  - Include board visualization (using `chess.js` to generate ASCII board)

### 5. Update Store (`src/stores/useAppStore.ts`)

Modify `askCoach` function:

- For `'position'` and `'moves'` analysis types:

  1. First call `window.electronAPI.analyzePosition(fen, 15)` to get Stockfish analysis
  2. Pass the analysis result to `buildCoachPrompt` via the context
  3. Show loading state during Stockfish calculation
  4. Handle errors: If Stockfish fails, show error message and stop (do not proceed with analysis)

### 6. Configuration

Stockfish path configuration:

- Hardcode the path in `electron/stockfishService.ts`: `C:\Users\coldk\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe`
- Can be made configurable via settings in the future if needed

## Files to Create/Modify

**New Files:**

- `electron/stockfishService.ts` - Stockfish analysis service

**Modified Files:**

- `electron/main.ts` - Add IPC handler for Stockfish analysis
- `electron/preload.ts` - Expose Stockfish analysis API
- `electron/llmService.ts` - Enhance `buildCoachPrompt` to include Stockfish data
- `src/stores/useAppStore.ts` - Update `askCoach` to fetch Stockfish analysis first

## Technical Considerations

1. **Stockfish Path**: Hardcode the path initially (`C:\Users\coldk\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe`), can be made configurable later

2. **Error Handling**: 

   - If Stockfish fails, show error message and require Stockfish to be available
   - Display user-friendly error messages in the coach panel
   - Do not proceed with analysis if Stockfish is unavailable

3. **Performance**: 

   - Stockfish analysis may take a few seconds (depth 15)
   - Show appropriate loading states
   - Consider caching results for the same position

4. **UCI Protocol Parsing**:

   - Parse `info depth X score cp Y` or `info depth X score mate Y`
   - Parse `bestmove XXXX` line
   - Handle edge cases (no best move, invalid position, etc.)

5. **Move Format Conversion**:

   - Use `chess.js` to convert UCI move to SAN notation
   - Handle promotions correctly

## Testing

After implementation, verify:

- Stockfish analysis returns correct evaluation and best move
- Position analysis includes Stockfish data in the prompt
- LM Studio receives properly formatted prompts
- Error handling works when Stockfish is unavailable
- Loading states display correctly during analysis