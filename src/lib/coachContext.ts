/**
 * Utility functions for building chess context for the AI Coach
 */

import { Chess } from 'chess.js'

export type AnalysisType = 'position' | 'moves' | 'mistakes' | 'plan' | 'custom'

export interface ChessContext {
  fen: string
  moveHistory: string[]
  playerColor?: 'white' | 'black'
  openingName?: string
  customQuestion?: string
}

/**
 * Get a human-readable description of the current game state
 */
export function getGameStateDescription(fen: string): string {
  try {
    const game = new Chess(fen)
    const parts: string[] = []

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White'
      parts.push(`Checkmate! ${winner} wins.`)
    } else if (game.isStalemate()) {
      parts.push('Stalemate - the game is drawn.')
    } else if (game.isDraw()) {
      parts.push('The game is drawn.')
    } else if (game.isCheck()) {
      const inCheck = game.turn() === 'w' ? 'White' : 'Black'
      parts.push(`${inCheck} is in check.`)
    }

    const turn = game.turn() === 'w' ? 'White' : 'Black'
    if (!game.isGameOver()) {
      parts.push(`${turn} to move.`)
    }

    return parts.join(' ')
  } catch {
    return ''
  }
}

/**
 * Format move history into PGN-like notation
 */
export function formatMoveHistory(moves: string[]): string {
  if (moves.length === 0) return 'No moves played yet'

  return moves.reduce((acc, move, i) => {
    if (i % 2 === 0) {
      return acc + `${Math.floor(i / 2) + 1}. ${move} `
    }
    return acc + `${move} `
  }, '').trim()
}

/**
 * Get material count from FEN
 */
export function getMaterialCount(fen: string): { white: number; black: number } {
  const pieceValues: Record<string, number> = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
    'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
  }

  const position = fen.split(' ')[0]
  let white = 0
  let black = 0

  for (const char of position) {
    if (pieceValues[char]) {
      if (char === char.toUpperCase()) {
        white += pieceValues[char]
      } else {
        black += pieceValues[char]
      }
    }
  }

  return { white, black }
}

/**
 * Get a simple evaluation summary based on material
 */
export function getMaterialAdvantage(fen: string): string {
  const { white, black } = getMaterialCount(fen)
  const diff = white - black

  if (diff === 0) return 'Material is equal'
  if (diff > 0) return `White is up ${diff} point${diff > 1 ? 's' : ''} of material`
  return `Black is up ${Math.abs(diff)} point${Math.abs(diff) > 1 ? 's' : ''} of material`
}

/**
 * Get readable labels for analysis types
 */
export function getAnalysisTypeLabel(type: AnalysisType): string {
  switch (type) {
    case 'position':
      return 'Analyze Position'
    case 'moves':
      return 'Suggest Move'
    case 'mistakes':
      return 'Find Mistakes'
    case 'plan':
      return 'Explain Plan'
    case 'custom':
      return 'Ask Question'
  }
}

/**
 * Get description for analysis type buttons
 */
export function getAnalysisTypeDescription(type: AnalysisType): string {
  switch (type) {
    case 'position':
      return 'Get an evaluation of the current position'
    case 'moves':
      return 'Get the best move recommendation'
    case 'mistakes':
      return 'Review the game for errors'
    case 'plan':
      return 'Understand strategic ideas'
    case 'custom':
      return 'Ask any chess question'
  }
}
