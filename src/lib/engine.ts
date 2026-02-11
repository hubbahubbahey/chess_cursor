/**
 * Stockfish chess engine wrapper using Web Worker
 */

// Import worker using Vite's worker syntax
import StockfishWasmWorker from 'stockfish.js/stockfish.wasm.js?worker'
import StockfishJsWorker from 'stockfish.js/stockfish.js?worker'

let engine: Worker | null = null
let isReady = false
let currentResolve: ((move: string) => void) | null = null
let currentReject: ((error: Error) => void) | null = null
let moveTimeout: NodeJS.Timeout | null = null
let initTimeout: NodeJS.Timeout | null = null
let topMovesResolve: ((moves: string[]) => void) | null = null
let topMovesReject: ((error: Error) => void) | null = null
const topMoves: Map<number, string> = new Map()
let expectedMultipv: number = 0
let initPromise: Promise<void> | null = null

function createStockfishWorker(): Worker {
  try {
    return new StockfishWasmWorker()
  } catch (wasmError) {
    console.warn('Failed to create WASM Stockfish worker, falling back to JS worker:', wasmError)
    return new StockfishJsWorker()
  }
}

/**
 * Initialize the Stockfish engine
 */
export function initEngine(): Promise<void> {
  if (engine && isReady) {
    return Promise.resolve()
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = new Promise((resolve, reject) => {
    try {
      // Reset a stale worker instance before creating a new one
      if (engine) {
        try {
          engine.terminate()
        } catch {
          // Ignore terminate errors
        }
        engine = null
      }

      isReady = false
      engine = createStockfishWorker()
      let settled = false

      engine.onmessage = (e: MessageEvent) => {
        const message = String(e.data)

        // Handle UCI protocol responses
        if (message === 'uciok') {
          // Engine is ready after UCI initialization
          engine?.postMessage('isready')
        } else if (message === 'readyok' && !settled) {
          settled = true
          isReady = true
          // Clear initialization timeout since engine is ready
          if (initTimeout) {
            clearTimeout(initTimeout)
            initTimeout = null
          }
          resolve()
        } else if (message.startsWith('info') && topMovesResolve) {
          // Parse multipv info lines: "info depth X multipv Y score cp X pv move1 move2 ..."
          const multipvMatch = message.match(/multipv (\d+)/)
          if (multipvMatch) {
            const multipvNum = parseInt(multipvMatch[1], 10)
            // Extract the first move from the PV (principal variation)
            // PV format: "pv d7d5 c2c4 e5d4" - we want just "d7d5"
            const pvMatch = message.match(/pv\s+([a-h][1-8][a-h][1-8][qrnb]?)(?:\s|$)/)
            if (pvMatch) {
              const move = pvMatch[1]
              topMoves.set(multipvNum, move)
              console.log(`Multipv ${multipvNum} move: ${move} (total collected: ${topMoves.size})`)
            } else {
              // Debug: log the message if PV doesn't match
              console.warn(
                'Multipv info line found but PV pattern did not match:',
                message.substring(0, 100)
              )
            }
          }
        } else if (message.startsWith('bestmove')) {
          // Check if this is a multipv result
          if (topMovesResolve && expectedMultipv > 0) {
            // When we get bestmove, we've collected all multipv moves
            console.log(
              `Multipv bestmove received, expectedMultipv: ${expectedMultipv}, topMoves size: ${topMoves.size}`
            )
            const movesArray: string[] = []
            for (let i = 1; i <= expectedMultipv; i++) {
              const move = topMoves.get(i)
              if (move) {
                movesArray.push(move)
              } else {
                console.warn(`Multipv ${i} move not found in topMoves map`)
              }
            }

            console.log(
              `Collected ${movesArray.length} moves from multipv (expected ${expectedMultipv}):`,
              movesArray
            )

            if (movesArray.length > 0) {
              if (moveTimeout) {
                clearTimeout(moveTimeout)
                moveTimeout = null
              }
              console.log(`Successfully collected ${movesArray.length} top moves:`, movesArray)
              // Reset multipv to 1 for future requests
              engine?.postMessage('setoption name multipv value 1')
              const savedResolve = topMovesResolve
              topMovesResolve = null
              topMovesReject = null
              topMoves.clear()
              expectedMultipv = 0
              savedResolve(movesArray)
            } else if (topMovesReject) {
              if (moveTimeout) {
                clearTimeout(moveTimeout)
                moveTimeout = null
              }
              console.warn('No moves collected from multipv, rejecting')
              // Reset multipv to 1 for future requests
              engine?.postMessage('setoption name multipv value 1')
              const savedReject = topMovesReject
              topMovesResolve = null
              topMovesReject = null
              topMoves.clear()
              expectedMultipv = 0
              savedReject(new Error('No valid moves found from multipv'))
            } else {
              console.warn(
                'Multipv bestmove received but topMovesResolve was cleared before processing'
              )
            }
          } else {
            // Regular bestmove handler (for single-move requests)
            // Parse the best move from the response
            // Format: "bestmove e2e4" or "bestmove e7e8q" (with promotion)
            console.log(
              'Engine bestmove response:',
              message,
              'topMovesResolve:',
              !!topMovesResolve,
              'currentResolve:',
              !!currentResolve
            )
            const parts = message.split(' ')
            const move = parts[1]
            if (currentResolve && move && move !== '(none)') {
              if (moveTimeout) {
                clearTimeout(moveTimeout)
                moveTimeout = null
              }
              console.log('Engine parsed move:', move)
              currentResolve(move)
              currentResolve = null
              currentReject = null
            } else if (currentReject) {
              if (moveTimeout) {
                clearTimeout(moveTimeout)
                moveTimeout = null
              }
              console.warn('Engine returned invalid move:', move)
              currentReject(new Error('No valid move found'))
              currentResolve = null
              currentReject = null
            }
          }
        } else if (message.startsWith('error')) {
          // Handle engine errors
          if (currentReject) {
            if (moveTimeout) {
              clearTimeout(moveTimeout)
              moveTimeout = null
            }
            currentReject(new Error(message))
            currentResolve = null
            currentReject = null
          }
          if (topMovesReject) {
            if (moveTimeout) {
              clearTimeout(moveTimeout)
              moveTimeout = null
            }
            topMovesReject(new Error(message))
            topMovesResolve = null
            topMovesReject = null
            topMoves.clear()
            expectedMultipv = 0
          }
        }
      }

      engine.onerror = (error) => {
        console.error('Stockfish worker error:', error)
        isReady = false
        try {
          engine?.terminate()
        } catch {
          // Ignore terminate errors
        }
        engine = null
        if (moveTimeout) {
          clearTimeout(moveTimeout)
          moveTimeout = null
        }
        if (currentReject) {
          currentReject(new Error('Worker error'))
          currentResolve = null
          currentReject = null
        }
        if (topMovesReject) {
          topMovesReject(new Error('Worker error'))
          topMovesResolve = null
          topMovesReject = null
          topMoves.clear()
          expectedMultipv = 0
        }
        if (!settled) {
          settled = true
          reject(error instanceof Error ? error : new Error('Stockfish worker failed'))
        }
      }

      // Initialize UCI protocol
      engine.postMessage('uci')

      // Set timeout for initialization
      initTimeout = setTimeout(() => {
        if (!isReady && !settled) {
          settled = true
          initTimeout = null
          try {
            engine?.terminate()
          } catch {
            // Ignore terminate errors
          }
          engine = null
          reject(new Error('Engine initialization timeout'))
        }
      }, 10000)
    } catch (error) {
      console.error('Failed to initialize Stockfish:', error)
      reject(error)
    }
  })

  initPromise.finally(() => {
    initPromise = null
  })

  return initPromise
}

/**
 * Get the best move for a given position
 * @param fen - The FEN string of the current position
 * @param depth - Search depth (1-20, higher = stronger but slower)
 * @returns Promise resolving to the best move in UCI format (e.g., "e2e4")
 */
export function getBestMove(fen: string, depth: number = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!engine || !isReady) {
      reject(new Error('Engine not initialized. Call initEngine() first.'))
      return
    }

    // Clear any previous pending move
    if (currentReject) {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      currentReject(new Error('New move requested'))
    }

    currentResolve = resolve
    currentReject = reject

    // Set timeout for move calculation (30 seconds max)
    moveTimeout = setTimeout(() => {
      if (currentReject === reject) {
        stopCalculation()
        currentReject(new Error('Move calculation timeout'))
        currentResolve = null
        currentReject = null
        moveTimeout = null
      }
    }, 30000)

    // Set the position and start calculating
    try {
      console.log('Setting engine position:', fen, 'depth:', depth)
      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`go depth ${depth}`)
    } catch (error) {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      currentResolve = null
      currentReject = null
      reject(error)
    }
  })
}

/**
 * Get the top N moves for a given position using multipv
 * @param fen - The FEN string of the current position
 * @param depth - Search depth (1-20, higher = stronger but slower)
 * @param count - Number of top moves to return (1-5)
 * @returns Promise resolving to array of moves in UCI format, sorted by evaluation
 */
export function getTopMoves(fen: string, depth: number = 10, count: number = 3): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!engine || !isReady) {
      reject(new Error('Engine not initialized. Call initEngine() first.'))
      return
    }

    // Clear any previous pending requests
    if (currentReject) {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      currentReject(new Error('New move requested'))
      currentResolve = null
      currentReject = null
    }
    if (topMovesReject) {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      topMovesReject(new Error('New move requested'))
      topMovesResolve = null
      topMovesReject = null
      topMoves.clear()
      expectedMultipv = 0
    }

    topMovesResolve = resolve
    topMovesReject = reject
    topMoves.clear()
    expectedMultipv = Math.max(1, Math.min(5, count))

    // Set timeout for move calculation (30 seconds max)
    moveTimeout = setTimeout(() => {
      if (topMovesReject === reject) {
        // Save reference before stopCalculation clears it
        const savedReject = topMovesReject
        stopCalculation()
        // Reset multipv to 1 for future requests
        if (engine && isReady) {
          engine.postMessage('setoption name multipv value 1')
        }
        savedReject(new Error('Move calculation timeout'))
        topMovesResolve = null
        topMovesReject = null
        topMoves.clear()
        expectedMultipv = 0
        moveTimeout = null
      }
    }, 30000)

    // Set the position and start calculating with multipv
    try {
      console.log(
        'Setting engine position with multipv:',
        fen,
        'depth:',
        depth,
        'multipv:',
        expectedMultipv
      )
      engine.postMessage(`position fen ${fen}`)
      engine.postMessage(`setoption name multipv value ${expectedMultipv}`)
      engine.postMessage(`go depth ${depth}`)
    } catch (error) {
      if (moveTimeout) {
        clearTimeout(moveTimeout)
        moveTimeout = null
      }
      topMovesResolve = null
      topMovesReject = null
      topMoves.clear()
      expectedMultipv = 0
      reject(error)
    }
  })
}

/**
 * Stop the current calculation
 */
export function stopCalculation(): void {
  if (engine && isReady) {
    engine.postMessage('stop')
  }
  if (moveTimeout) {
    clearTimeout(moveTimeout)
    moveTimeout = null
  }
  if (currentReject) {
    currentReject(new Error('Calculation stopped'))
  }
  if (topMovesReject) {
    topMovesReject(new Error('Calculation stopped'))
  }
  currentResolve = null
  currentReject = null
  topMovesResolve = null
  topMovesReject = null
  topMoves.clear()
  expectedMultipv = 0
}

/**
 * Shutdown the engine
 */
export function shutdownEngine(): void {
  stopCalculation()
  if (engine) {
    engine.postMessage('quit')
    engine.terminate()
    engine = null
    isReady = false
  }
}

/**
 * Check if engine is ready
 */
export function isEngineReady(): boolean {
  return isReady
}

/**
 * Convert UCI move format to from/to squares
 * @param uciMove - Move in UCI format (e.g., "e2e4" or "e7e8q" for promotion)
 * @returns Object with from, to squares and optional promotion piece
 */
export function parseUciMove(uciMove: string): { from: string; to: string; promotion?: string } {
  // Validate UCI move format (should be at least 4 characters: from + to)
  if (!uciMove || uciMove.length < 4) {
    throw new Error(`Invalid UCI move format: ${uciMove}`)
  }

  const from = uciMove.slice(0, 2)
  const to = uciMove.slice(2, 4)
  const promotion = uciMove.length > 4 ? uciMove[4] : undefined

  // Validate square format (should be a-h, 1-8)
  const squareRegex = /^[a-h][1-8]$/
  if (!squareRegex.test(from) || !squareRegex.test(to)) {
    throw new Error(`Invalid square format in UCI move: ${uciMove}`)
  }

  // Validate promotion piece if present (should be q, r, b, or n)
  if (promotion && !['q', 'r', 'b', 'n'].includes(promotion.toLowerCase())) {
    throw new Error(`Invalid promotion piece in UCI move: ${uciMove}`)
  }

  return { from, to, promotion }
}

/**
 * Difficulty presets mapping to search depth
 */
export const DIFFICULTY_PRESETS = {
  easy: 3,
  medium: 8,
  hard: 15,
  expert: 20
} as const

export type DifficultyLevel = keyof typeof DIFFICULTY_PRESETS
