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

/**
 * Extract SAN moves from text and return target squares
 */
function extractSANMoves(text: string, fen: string): string[] {
  const squares: string[] = []
  const game = new Chess(fen)
  
  // Pattern for SAN moves: Nf3, Bf4, d4, c6, O-O, e4+, etc.
  // Matches: piece moves (Nf3), pawn moves (d4), castling (O-O, O-O-O), with optional check/checkmate (+#)
  const sanPattern = /\b([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?|[a-h][1-8](?:=[QRBN])?)\+?\#?\b/g
  
  const matches = text.matchAll(sanPattern)
  for (const match of matches) {
    const moveText = match[1]
    try {
      // Try to parse the move
      const move = game.move(moveText, { sloppy: true })
      if (move) {
        squares.push(move.to)
      }
    } catch {
      // Invalid move, skip
    }
  }
  
  return squares
}

/**
 * Extract square references from text (e.g., "d4", "e4")
 */
function extractSquareReferences(text: string): string[] {
  const squares: string[] = []
  
  // Pattern for squares: a-h followed by 1-8
  // We exclude matches that are part of SAN moves (already handled)
  const squarePattern = /\b([a-h][1-8])\b/g
  
  const matches = text.matchAll(squarePattern)
  for (const match of matches) {
    const square = match[1]
    // Validate it's a valid square
    if (/^[a-h][1-8]$/.test(square)) {
      squares.push(square)
    }
  }
  
  return squares
}

/**
 * Extract piece references from text (e.g., "d4 pawn", "knight on f3")
 */
function extractPieceReferences(text: string, fen: string): string[] {
  const squares: string[] = []
  const game = new Chess(fen)
  
  // Pattern for piece references: "pawn on d4", "knight on f3", "d4 pawn", etc.
  const piecePattern = /\b(pawn|knight|bishop|rook|queen|king)\s+(?:on\s+)?([a-h][1-8])\b|\b([a-h][1-8])\s+(pawn|knight|bishop|rook|queen|king)\b/gi
  
  const matches = text.matchAll(piecePattern)
  for (const match of matches) {
    const pieceName = (match[1] || match[4])?.toLowerCase()
    const square = (match[2] || match[3])?.toLowerCase()
    
    if (!pieceName || !square) continue
    
    // Map piece names to chess.js piece types
    const pieceMap: Record<string, PieceType> = {
      'pawn': 'p',
      'knight': 'n',
      'bishop': 'b',
      'rook': 'r',
      'queen': 'q',
      'king': 'k'
    }
    
    const pieceType = pieceMap[pieceName]
    if (!pieceType) continue
    
    // Check if there's a piece of this type on the square
    try {
      const piece = game.get(square as Square)
      if (piece && piece.type === pieceType) {
        squares.push(square)
      }
    } catch {
      // Invalid square, skip
    }
  }
  
  return squares
}

/**
 * Parse chess notation from text and return squares to highlight
 * Detects SAN moves, square references, and piece references
 */
export function parseChessNotation(text: string, fen: string): string[] {
  const squares = new Set<string>()
  
  // Extract different types of notation
  const sanSquares = extractSANMoves(text, fen)
  const squareRefs = extractSquareReferences(text)
  const pieceRefs = extractPieceReferences(text, fen)
  
  // Combine all squares
  sanSquares.forEach(sq => squares.add(sq))
  squareRefs.forEach(sq => squares.add(sq))
  pieceRefs.forEach(sq => squares.add(sq))
  
  return Array.from(squares)
}
