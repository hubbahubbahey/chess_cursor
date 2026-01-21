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
