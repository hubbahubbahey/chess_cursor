import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Square } from 'chess.js'
import { useAppStore } from '../stores/useAppStore'
import { getLegalMovesFromSquare } from '../lib/chess'
import { RotateCcw, FlipVertical, ChevronLeft, Loader2 } from 'lucide-react'

interface ChessBoardProps {
  onMoveAttempt?: (from: string, to: string) => boolean | void
  interactive?: boolean
  showControls?: boolean
  highlightSquares?: string[]
  size?: number
}

const MIN_BOARD_SIZE = 300
const MAX_BOARD_SIZE = 800
const DEFAULT_BOARD_SIZE = 480

export default function ChessBoard({
  onMoveAttempt,
  interactive = true,
  showControls = true,
  highlightSquares = [],
  size: propSize
}: ChessBoardProps) {
  // Load board size from localStorage or use prop/default
  const [boardSize, setBoardSize] = useState(() => {
    const saved = localStorage.getItem('chessBoardSize')
    return saved ? parseInt(saved, 10) : propSize || DEFAULT_BOARD_SIZE
  })

  const isResizing = useRef(false)
  const resizeStartX = useRef(0)
  const resizeStartY = useRef(0)
  const resizeStartSize = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    fen,
    boardOrientation,
    flipBoard,
    resetGame,
    goBack,
    makeMove,
    childPositions,
    setCurrentPosition,
    // positions, // Removed unused variable
    aiEnabled,
    aiColor,
    aiThinking,
    triggerAiMove,
    game,
    coachPanelOpen,
    coachHighlightSquares,
    currentMoveAnalysis
  } = useAppStore()

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const aiMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Derive last move from game history so both player and AI moves are highlighted
  const lastMove = useMemo(() => {
    const history = game.history({ verbose: true })
    const last = history.length ? history[history.length - 1] : null
    return last ? { from: last.from, to: last.to } : null
  }, [fen, game])

  // Save board size to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('chessBoardSize', boardSize.toString())
  }, [boardSize])

  // Handle resize mouse events
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return

    const deltaX = e.clientX - resizeStartX.current
    const deltaY = e.clientY - resizeStartY.current
    // Use the larger delta to maintain square aspect ratio
    // For bottom-right corner, positive delta = larger, negative = smaller
    const delta = Math.max(Math.abs(deltaX), Math.abs(deltaY))
    const sign = (deltaX > 0 || deltaY > 0) ? 1 : -1

    const newSize = Math.max(
      MIN_BOARD_SIZE,
      Math.min(MAX_BOARD_SIZE, resizeStartSize.current + sign * delta)
    )
    setBoardSize(newSize)
  }, [])

  const handleResizeEndRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    handleResizeEndRef.current = () => {
      isResizing.current = false
      document.removeEventListener('mousemove', handleResizeMove)
      if (handleResizeEndRef.current) {
        document.removeEventListener('mouseup', handleResizeEndRef.current)
      }
    }
  }, [handleResizeMove])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isResizing.current = true
    resizeStartX.current = e.clientX
    resizeStartY.current = e.clientY
    resizeStartSize.current = boardSize
    document.addEventListener('mousemove', handleResizeMove)
    if (handleResizeEndRef.current) {
      document.addEventListener('mouseup', handleResizeEndRef.current)
    }
  }, [boardSize, handleResizeMove])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      if (handleResizeEndRef.current) {
        document.removeEventListener('mouseup', handleResizeEndRef.current)
      }
      // Clear AI move timeout on unmount
      if (aiMoveTimeoutRef.current) {
        clearTimeout(aiMoveTimeoutRef.current)
      }
    }
  }, [handleResizeMove])

  // Determine if it's the player's turn (when AI is enabled)
  const currentTurn = game.turn() === 'w' ? 'white' : 'black'
  const isPlayerTurn = !aiEnabled || currentTurn !== aiColor
  const canInteract = interactive && isPlayerTurn && !aiThinking
  const isGameOver = game.isGameOver()

  // Auto-trigger AI move when it becomes AI's turn
  // This handles: AI enabled when it's already AI's turn, game reset with AI playing white, etc.
  useEffect(() => {
    if (aiEnabled && !aiThinking && currentTurn === aiColor && !isGameOver) {
      // Small delay to allow UI to update
      const timer = setTimeout(() => {
        triggerAiMove()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [aiEnabled, aiThinking, currentTurn, aiColor, isGameOver, triggerAiMove])

  // Handle move via drag and drop or click
  const handleMove = useCallback((from: string, to: string) => {
    // If there's a custom move handler, use it
    if (onMoveAttempt) {
      const result = onMoveAttempt(from, to)
      if (result === false) return false
    }

    // Check if this move leads to a known position in the opening
    const moveSuccess = makeMove(from, to)
    if (moveSuccess) {
      // Find the child position that matches this move
      const targetFen = useAppStore.getState().fen
      const matchingChild = childPositions.find(child => {
        // Compare FEN positions (ignoring move counts)
        const childFenParts = child.fen.split(' ').slice(0, 4).join(' ')
        const targetFenParts = targetFen.split(' ').slice(0, 4).join(' ')
        return childFenParts === targetFenParts
      })

      if (matchingChild) {
        setCurrentPosition(matchingChild)
      }

      // Trigger AI move after player's move (with a delay for visual feedback)
      if (aiEnabled) {
        // Clear any existing timeout
        if (aiMoveTimeoutRef.current) {
          clearTimeout(aiMoveTimeoutRef.current)
        }
        aiMoveTimeoutRef.current = setTimeout(() => {
          triggerAiMove()
          aiMoveTimeoutRef.current = null
        }, 600)
      }
    }
    return moveSuccess
  }, [makeMove, childPositions, setCurrentPosition, onMoveAttempt, aiEnabled, triggerAiMove])

  // Handle piece click to show legal moves
  const onSquareClick = useCallback(
    (square: Square) => {
      if (!canInteract) return

      if (selectedSquare === square) {
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      // If clicking a legal move destination, make the move
      if (legalMoves.includes(square)) {
        handleMove(selectedSquare!, square)
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      // Show legal moves for the clicked piece
      const moves = getLegalMovesFromSquare(fen, square)
      if (moves.length > 0) {
        setSelectedSquare(square)
        setLegalMoves(moves.map((m) => m.to))
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    },
    [fen, selectedSquare, legalMoves, canInteract, handleMove]
  )

  // Handle drag and drop
  const onPieceDrop = useCallback(
    (sourceSquare: Square, targetSquare: Square) => {
      if (!canInteract) return false
      setSelectedSquare(null)
      setLegalMoves([])
      return handleMove(sourceSquare, targetSquare)
    },
    [canInteract, handleMove]
  )

  // Custom square styles for highlights
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}

    // Highlight legal move destinations
    legalMoves.forEach((square) => {
      styles[square] = {
        background: 'radial-gradient(circle, rgba(212, 165, 74, 0.4) 25%, transparent 25%)',
        borderRadius: '50%'
      }
    })

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        background: 'rgba(212, 165, 74, 0.5)'
      }
    }

    // Highlight last move
    if (lastMove) {
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        background: 'rgba(247, 236, 94, 0.3)'
      }
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        background: 'rgba(247, 236, 94, 0.4)'
      }
    }

    // Custom highlights (e.g., for correct/incorrect feedback)
    highlightSquares.forEach((square) => {
      styles[square] = {
        ...styles[square],
        boxShadow: 'inset 0 0 0 4px rgba(74, 222, 128, 0.8)'
      }
    })

    // Coach panel highlights (distinct blue styling)
    coachHighlightSquares.forEach((square) => {
      styles[square] = {
        ...styles[square],
        boxShadow: 'inset 0 0 0 3px rgba(59, 130, 246, 0.6)'
      }
    })

    // Move quality indicators (blunders, mistakes, inaccuracies)
    if (currentMoveAnalysis && lastMove) {
      const qualityColors = {
        blunder: 'rgba(239, 68, 68, 0.6)',      // red-500
        mistake: 'rgba(249, 115, 22, 0.6)',     // orange-500
        inaccuracy: 'rgba(234, 179, 8, 0.6)'    // yellow-500
      }
      
      if (currentMoveAnalysis.quality !== 'good' && qualityColors[currentMoveAnalysis.quality]) {
        // Apply colored border to the destination square
        styles[lastMove.to] = {
          ...styles[lastMove.to],
          boxShadow: `inset 0 0 0 4px ${qualityColors[currentMoveAnalysis.quality]}`
        }
      }
    }

    return styles
  }, [legalMoves, selectedSquare, lastMove, highlightSquares, coachHighlightSquares, currentMoveAnalysis])

  // Use propSize if provided, otherwise use state
  const currentSize = propSize !== undefined ? propSize : boardSize

  // Calculate max size based on viewport to prevent overflow
  // Account for: Sidebar (256px) + Right Panel (320px) + CoachPanel (320px when open) + Padding (32px)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }

    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  const maxSize = useMemo(() => {
    if (typeof window === 'undefined' || windowSize.width === 0) return MAX_BOARD_SIZE

    const sidebarWidth = 256 // w-64
    const rightPanelWidth = 320 // w-80
    const coachPanelWidth = coachPanelOpen ? 320 : 0 // w-80 when open
    const padding = 32 // gap-4 (16px) + p-4 (16px) on each side = 32px total

    const availableWidth =
      windowSize.width - sidebarWidth - rightPanelWidth - coachPanelWidth - padding
    const availableHeight = windowSize.height - 32 // title bar height

    // Board should fit in available space with some safety margin
    const maxWidth = Math.max(MIN_BOARD_SIZE, availableWidth - 16) // 16px safety margin
    const maxHeight = Math.max(MIN_BOARD_SIZE, availableHeight * 0.6)

    return Math.min(MAX_BOARD_SIZE, Math.min(maxWidth, maxHeight))
  }, [coachPanelOpen, windowSize])
  const constrainedSize = Math.min(currentSize, maxSize)

  return (
    <div
      ref={containerRef}
      className="chess-board-container relative flex-shrink-0 mx-auto z-10"
      style={{
        width: `${constrainedSize + 32}px`,
        maxWidth: '100%',
        minWidth: `${MIN_BOARD_SIZE + 32}px`
      }}
    >
      <Chessboard
        position={fen}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        boardOrientation={boardOrientation}
        boardWidth={currentSize}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        customNotationStyle={{
          fontWeight: 700,
          color: 'rgba(0, 0, 0, 0.85)',
          fontSize: '12px'
        }}
        animationDuration={200}
        arePiecesDraggable={canInteract}
      />

      {/* Resize handle */}
      {propSize === undefined && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize board"
        />
      )}

      {/* AI thinking overlay */}
      {aiThinking && (
        <div className="flex items-center justify-center gap-2 mt-2 text-accent-gold">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">AI is thinking...</span>
        </div>
      )}

      {showControls && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={goBack}
            className="btn-ghost flex items-center gap-2"
            title="Go back (←)"
          >
            <ChevronLeft size={18} />
            Back
          </button>
          <button
            onClick={flipBoard}
            className="btn-ghost flex items-center gap-2"
            title="Flip board (F)"
          >
            <FlipVertical size={18} />
            Flip
          </button>
          <button
            onClick={resetGame}
            className="btn-ghost flex items-center gap-2"
            title="Reset (R)"
          >
            <RotateCcw size={18} />
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
