/**
 * Stockfish Analysis Service
 * Spawns native Stockfish executable and parses UCI output for evaluation and best move
 */

import { spawn, ChildProcess } from 'child_process'
import { Chess } from 'chess.js'

const STOCKFISH_PATH =
  'C:\\Users\\coldk\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish-windows-x86-64-avx2.exe'

export interface StockfishAnalysis {
  evalText: string
  bestMove: string
  bestMoveSan: string
}

export interface MoveQualityAnalysis {
  evalBefore: { type: 'cp' | 'mate'; value: number }
  evalAfter: { type: 'cp' | 'mate'; value: number }
  bestMove: string
  bestMoveSan: string
  evalDelta: number  // In centipawns, positive = improvement for side to move
  quality: 'blunder' | 'mistake' | 'inaccuracy' | 'good'
}

/**
 * Get engine analysis (evaluation and best move) for a given position
 * @param fen - The FEN string of the position to analyze
 * @param depth - Search depth (default: 15)
 * @returns Promise resolving to analysis result
 */
export async function getEngineAnalysis(
  fen: string,
  depth: number = 15
): Promise<StockfishAnalysis> {
  return new Promise((resolve, reject) => {
    let stockfish: ChildProcess | null = null
    let outputBuffer = ''
    let bestMove: string | null = null
    let score: { type: 'cp' | 'mate'; value: number } | null = null
    let analysisStarted = false
    const timeout = 30000 // 30 second timeout

    const cleanup = () => {
      if (stockfish) {
        try {
          stockfish.kill()
        } catch {
          // Ignore cleanup errors
        }
        stockfish = null
      }
    }

    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Stockfish analysis timed out'))
    }, timeout)

    try {
      // Spawn Stockfish process
      stockfish = spawn(STOCKFISH_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      if (!stockfish.stdout || !stockfish.stdin) {
        cleanup()
        clearTimeout(timeoutId)
        reject(new Error('Failed to spawn Stockfish process'))
        return
      }

      // Handle stdout
      stockfish.stdout.on('data', (data: Buffer) => {
        outputBuffer += data.toString()
        const lines = outputBuffer.split('\n')
        outputBuffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim()

          // Check for readyok
          if (trimmed === 'readyok') {
            if (!analysisStarted) {
              // Start analysis
              analysisStarted = true
              stockfish?.stdin?.write(`position fen ${fen}\n`)
              stockfish?.stdin?.write(`go depth ${depth}\n`)
            }
            continue
          }

          // Parse info lines for score
          if (trimmed.startsWith('info')) {
            // Look for score cp (centipawns)
            const cpMatch = trimmed.match(/score cp (-?\d+)/)
            if (cpMatch) {
              score = { type: 'cp', value: parseInt(cpMatch[1], 10) }
              continue
            }

            // Look for score mate
            const mateMatch = trimmed.match(/score mate (-?\d+)/)
            if (mateMatch) {
              score = { type: 'mate', value: parseInt(mateMatch[1], 10) }
              continue
            }
          }

          // Parse bestmove
          if (trimmed.startsWith('bestmove')) {
            const parts = trimmed.split(' ')
            if (parts.length >= 2 && parts[1] !== '(none)') {
              bestMove = parts[1]

              // We have everything we need
              cleanup()
              clearTimeout(timeoutId)

              // Convert UCI move to SAN
              try {
                const game = new Chess(fen)
                const from = bestMove.substring(0, 2)
                const to = bestMove.substring(2, 4)
                const promotion = bestMove.length > 4 ? bestMove[4] : undefined

                const move = game.move({
                  from,
                  to,
                  promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined
                })

                if (!move) {
                  reject(new Error('Invalid move from Stockfish'))
                  return
                }

                // Format evaluation
                let evalText: string
                if (score) {
                  if (score.type === 'mate') {
                    evalText = `Mate in ${Math.abs(score.value)}`
                    if (score.value < 0) {
                      evalText = `-${evalText}`
                    }
                  } else {
                    // Convert centipawns to pawn units
                    const pawnUnits = score.value / 100
                    evalText = pawnUnits.toFixed(2)
                  }
                } else {
                  evalText = '0.00' // Default if no score found
                }

                resolve({
                  evalText,
                  bestMove,
                  bestMoveSan: move.san
                })
              } catch (error) {
                reject(
                  new Error(
                    `Failed to convert move: ${error instanceof Error ? error.message : 'Unknown error'}`
                  )
                )
              }
              return
            } else {
              cleanup()
              clearTimeout(timeoutId)
              reject(new Error('No valid move from Stockfish'))
              return
            }
          }
        }
      })

      // Handle stderr
      stockfish.stderr?.on('data', (data: Buffer) => {
        // Stockfish may output to stderr, but we can usually ignore it
        console.warn('Stockfish stderr:', data.toString())
      })

      // Handle process errors
      stockfish.on('error', (error) => {
        cleanup()
        clearTimeout(timeoutId)
        reject(new Error(`Failed to start Stockfish: ${error.message}`))
      })

      stockfish.on('exit', (code) => {
        if (code !== 0 && code !== null && !bestMove) {
          cleanup()
          clearTimeout(timeoutId)
          reject(new Error(`Stockfish exited with code ${code}`))
        }
      })

      // Initialize UCI protocol
      stockfish.stdin.write('uci\n')
      stockfish.stdin.write('isready\n')
    } catch (error) {
      cleanup()
      clearTimeout(timeoutId)
      reject(
        new Error(
          `Failed to analyze position: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      )
    }
  })
}

/**
 * Analyze move quality by comparing evaluations before and after a move
 * @param fenBefore - FEN before the move was played
 * @param fenAfter - FEN after the move was played
 * @param depth - Search depth (default: 15)
 * @returns Promise resolving to move quality analysis
 */
export async function analyzeMoveQuality(
  fenBefore: string,
  fenAfter: string,
  depth: number = 15
): Promise<MoveQualityAnalysis> {
  try {
    // Analyze position before the move
    const analysisBefore = await getEngineAnalysis(fenBefore, depth)
    
    // Analyze position after the move
    const analysisAfter = await getEngineAnalysis(fenAfter, depth)
    
    // Parse evaluations
    const evalBefore = parseEvaluation(analysisBefore.evalText)
    const evalAfter = parseEvaluation(analysisAfter.evalText)
    
    // Calculate eval delta from the perspective of the player who made the move
    // The player who just moved is now waiting (it's opponent's turn in fenAfter)
    const gameAfter = new Chess(fenAfter)
    const gameBefore = new Chess(fenBefore)
    const playerJustMoved = gameAfter.turn() === 'w' ? 'black' : 'white'
    
    // Stockfish evaluations are from the side-to-move's perspective
    // We need to convert both evals to the same perspective (the player who just moved)
    const sideToMoveBefore = gameBefore.turn() === 'w' ? 'white' : 'black'
    const sideToMoveAfter = gameAfter.turn() === 'w' ? 'white' : 'black'
    
    // Convert evaluations to centipawns from the moving player's perspective
    const cpBefore = evaluationToCentipawns(evalBefore, sideToMoveBefore, playerJustMoved)
    const cpAfter = evaluationToCentipawns(evalAfter, sideToMoveAfter, playerJustMoved)
    
    // Negative delta means the position got worse for the player who moved
    const evalDelta = cpAfter - cpBefore
    
    // Classify move quality based on eval loss
    let quality: 'blunder' | 'mistake' | 'inaccuracy' | 'good'
    const evalLoss = -evalDelta // Positive evalLoss means the move made things worse
    
    if (evalLoss >= 200) {
      quality = 'blunder'
    } else if (evalLoss >= 100) {
      quality = 'mistake'
    } else if (evalLoss >= 50) {
      quality = 'inaccuracy'
    } else {
      quality = 'good'
    }
    
    // Special cases for mate situations
    if (evalBefore.type === 'mate' && evalBefore.value > 0 &&
        (evalAfter.type === 'cp' || (evalAfter.type === 'mate' && evalAfter.value < 0))) {
      // Had mate, lost it = blunder
      quality = 'blunder'
    } else if (evalAfter.type === 'mate' && evalAfter.value < 0) {
      // Allowed opponent mate = blunder
      quality = 'blunder'
    }
    
    return {
      evalBefore,
      evalAfter,
      bestMove: analysisBefore.bestMove,
      bestMoveSan: analysisBefore.bestMoveSan,
      evalDelta,
      quality
    }
  } catch (error) {
    throw new Error(
      `Move quality analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse evaluation text into structured format
 */
function parseEvaluation(evalText: string): { type: 'cp' | 'mate'; value: number } {
  if (evalText.includes('Mate')) {
    // Format: "Mate in N" or "-Mate in N"
    const isNegative = evalText.startsWith('-')
    const match = evalText.match(/(\d+)/)
    if (match) {
      const moves = parseInt(match[1], 10)
      return { type: 'mate', value: isNegative ? -moves : moves }
    }
    // If "Mate" is in text but regex failed, return a safe default mate value
    // This handles edge cases where the format is unexpected
    return { type: 'mate', value: isNegative ? -1 : 1 }
  }
  
  // Centipawn evaluation
  const cp = Math.round(parseFloat(evalText) * 100)
  // Handle NaN case - if parseFloat failed, return 0
  if (isNaN(cp)) {
    console.warn('Failed to parse evaluation text:', evalText)
    return { type: 'cp', value: 0 }
  }
  return { type: 'cp', value: cp }
}

/**
 * Convert evaluation to centipawns from a specific player's perspective
 * Stockfish evaluations are always from the side-to-move's perspective
 * @param evaluation - The evaluation object (from side-to-move's perspective)
 * @param sideToMove - Whose turn it was when the evaluation was computed
 * @param targetPlayer - The player perspective we want the result in
 * @returns Evaluation in centipawns (positive = good for targetPlayer, negative = bad)
 */
function evaluationToCentipawns(
  evaluation: { type: 'cp' | 'mate'; value: number },
  sideToMove: 'white' | 'black',
  targetPlayer: 'white' | 'black'
): number {
  // Stockfish UCI evaluations are from side-to-move's perspective
  // Positive value = good for side-to-move
  
  if (evaluation.type === 'mate') {
    // Positive mate value = side-to-move is winning (can deliver mate)
    // Negative mate value = side-to-move is losing (getting mated)
    const mateValue = evaluation.value > 0 ? 10000 : -10000
    // If targetPlayer is the same as sideToMove, keep the sign
    // Otherwise, flip it
    return sideToMove === targetPlayer ? mateValue : -mateValue
  }
  
  // CP values are from side-to-move's perspective
  // If targetPlayer matches sideToMove, keep the value
  // Otherwise, flip the sign
  return sideToMove === targetPlayer ? evaluation.value : -evaluation.value
}
