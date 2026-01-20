import { Chess, Square, Move } from 'chess.js'

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type PieceColor = 'w' | 'b'

export interface ChessPiece {
  type: PieceType
  color: PieceColor
}

/**
 * Get all legal moves from a position
 */
export function getLegalMoves(fen: string): Move[] {
  const game = new Chess(fen)
  return game.moves({ verbose: true })
}

/**
 * Get legal moves for a specific square
 */
export function getLegalMovesFromSquare(fen: string, square: Square): Move[] {
  const game = new Chess(fen)
  return game.moves({ square, verbose: true })
}

/**
 * Check if a move is legal
 */
export function isMoveLegal(fen: string, from: Square, to: Square): boolean {
  const game = new Chess(fen)
  const moves = game.moves({ square: from, verbose: true })
  return moves.some(move => move.to === to)
}

/**
 * Make a move and return the new FEN
 */
export function makeMove(fen: string, from: Square, to: Square, promotion?: string): string | null {
  const game = new Chess(fen)
  try {
    game.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined })
    return game.fen()
  } catch {
    return null
  }
}

/**
 * Get the piece at a square
 */
export function getPieceAt(fen: string, square: Square): ChessPiece | null {
  const game = new Chess(fen)
  return game.get(square)
}

/**
 * Check if it's white's turn
 */
export function isWhiteTurn(fen: string): boolean {
  const game = new Chess(fen)
  return game.turn() === 'w'
}

/**
 * Get whose turn it is
 */
export function getTurn(fen: string): 'white' | 'black' {
  return isWhiteTurn(fen) ? 'white' : 'black'
}

/**
 * Check if the game is in check
 */
export function isInCheck(fen: string): boolean {
  const game = new Chess(fen)
  return game.isCheck()
}

/**
 * Check if the game is checkmate
 */
export function isCheckmate(fen: string): boolean {
  const game = new Chess(fen)
  return game.isCheckmate()
}

/**
 * Check if the game is a draw
 */
export function isDraw(fen: string): boolean {
  const game = new Chess(fen)
  return game.isDraw()
}

/**
 * Parse a PGN string and return positions
 */
export function parsePGN(pgn: string): { fen: string; move: string }[] {
  const game = new Chess()
  game.loadPgn(pgn)
  
  const positions: { fen: string; move: string }[] = []
  const history = game.history({ verbose: true })
  
  // Reset and replay to capture each position
  game.reset()
  positions.push({ fen: game.fen(), move: '' })
  
  for (const move of history) {
    game.move(move.san)
    positions.push({ fen: game.fen(), move: move.san })
  }
  
  return positions
}

/**
 * Convert a move to SAN notation
 */
export function moveToSAN(fen: string, from: Square, to: Square, promotion?: string): string | null {
  const game = new Chess(fen)
  try {
    const move = game.move({ from, to, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined })
    return move?.san || null
  } catch {
    return null
  }
}

/**
 * Get the FEN after a SAN move
 */
export function getFenAfterSAN(fen: string, san: string): string | null {
  const game = new Chess(fen)
  try {
    game.move(san)
    return game.fen()
  } catch {
    return null
  }
}

/**
 * Validate a FEN string
 */
export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen)
    return true
  } catch {
    return false
  }
}
