import { useEffect, useState, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { useAppStore } from '../stores/useAppStore'
import {
  calculateNextReview,
  difficultyToQuality,
  formatInterval,
  getProjectedIntervals,
  getMasteryLevel
} from '../lib/srs'
import { getLegalMovesFromSquare, moveToSAN } from '../lib/chess'
import { Brain, CheckCircle2, XCircle, Clock, Flame, RotateCcw } from 'lucide-react'

type TrainingState = 'loading' | 'question' | 'correct' | 'incorrect' | 'complete'

export default function TrainingMode() {
  const { currentOpening, dueReviews, currentReviewIndex, loadDueReviews, nextReview } =
    useAppStore()

  const [state, setState] = useState<TrainingState>('loading')
  const [fen, setFen] = useState('')
  const [correctMove, setCorrectMove] = useState('')
  const [userMove, setUserMove] = useState('')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const [streak, setStreak] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionTotal, setSessionTotal] = useState(0)

  // Calculate responsive board size
  const boardSize = useMemo(() => {
    if (typeof window === 'undefined') return 480
    // Access window safely
    const width = window.innerWidth
    const height = window.innerHeight
    const availableWidth = width - 256 - 320 - 96 // sidebar + coach panel + padding
    const availableHeight = height - 32 - 48 // title bar + padding
    return Math.min(480, Math.min(availableWidth * 0.4, availableHeight * 0.6))
  }, [])

  // Get the FEN before a move was made
  const getParentFen = useCallback((fen: string, moveSan: string | null): string | null => {
    if (!moveSan) return null
    // For training, we want to show the position where the user needs to find the move
    // The review.fen is the position AFTER the move, so we need to reverse it
    // This is a simplified approach - in a real app you'd store parent FEN
    const game = new Chess(fen)
    try {
      game.undo()
      return game.fen()
    } catch {
      return null
    }
  }, [])

  const currentReview = dueReviews[currentReviewIndex]

  // Load due reviews when component mounts or opening changes
  useEffect(() => {
    if (currentOpening) {
      loadDueReviews(currentOpening.id)
    }
  }, [currentOpening, loadDueReviews])

  // Set up the current review question
  useEffect(() => {
    if (dueReviews.length > 0 && currentReviewIndex < dueReviews.length) {
      const review = dueReviews[currentReviewIndex]
      // Load the parent position (we want to show the position BEFORE the move)
      const parentFen = getParentFen(review.fen, review.move_san)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFen(parentFen || review.fen)
      setCorrectMove(review.move_san || '')
      setState('question')
      setUserMove('')
      setSelectedSquare(null)
      setLegalMoves([])
    } else if (dueReviews.length === 0) {
      setState('complete')
    }
  }, [dueReviews, currentReviewIndex, getParentFen])

  // Check if the user's move is correct
  const handleMoveAttempt = useCallback((moveSan: string) => {
    setUserMove(moveSan)
    setSessionTotal((prev) => prev + 1)

    if (moveSan === correctMove) {
      setState('correct')
      setStreak((prev) => prev + 1)
      setSessionCorrect((prev) => prev + 1)
      // Update the board to show the correct move
      const game = new Chess(fen)
      game.move(moveSan)
      setFen(game.fen())
    } else {
      setState('incorrect')
      setStreak(0)
    }
  }, [correctMove, fen]) // Removed attempts as it wasn't used here, added correctMove and fen

  // Handle square click
  const onSquareClick = useCallback(
    (square: Square) => {
      if (state !== 'question') return

      if (selectedSquare === square) {
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      if (legalMoves.includes(square)) {
        // Make the move
        const san = moveToSAN(fen, selectedSquare!, square)
        if (san) {
          handleMoveAttempt(san)
        }
        setSelectedSquare(null)
        setLegalMoves([])
        return
      }

      const moves = getLegalMovesFromSquare(fen, square)
      if (moves.length > 0) {
        setSelectedSquare(square)
        setLegalMoves(moves.map((m) => m.to))
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    },
    [state, fen, selectedSquare, legalMoves, handleMoveAttempt]
  )

  // Handle piece drop
  const onPieceDrop = useCallback(
    (source: Square, target: Square) => {
      if (state !== 'question') return false
      const san = moveToSAN(fen, source, target)
      if (san) {
        handleMoveAttempt(san)
        return true
      }
      return false
    },
    [state, fen, handleMoveAttempt]
  )



  // Handle difficulty rating and move to next card
  const handleRating = async (difficulty: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentReview) return

    const quality = difficultyToQuality(difficulty)
    const result = calculateNextReview(quality, {
      easeFactor: currentReview.ease_factor,
      interval: currentReview.interval,
      repetitions: currentReview.repetitions
    })

    // Update the review in the database
    await window.electronAPI.updateReview(
      currentReview.position_id,
      result.easeFactor,
      result.interval,
      result.repetitions,
      result.nextReview
    )

    // Update stats
    await window.electronAPI.updateStats(currentReview.position_id, state === 'correct')

    // Move to next review
    if (currentReviewIndex < dueReviews.length - 1) {
      nextReview()
    } else {
      setState('complete')
    }
  }

  // Show "Show Answer" and then rate
  const handleShowAnswer = () => {
    // Show the correct move on the board
    const game = new Chess(fen)
    try {
      game.move(correctMove)
      setFen(game.fen())
    } catch {
      // ignore
    }
    setState('incorrect')
  }

  // Get projected intervals for the rating buttons
  const projectedIntervals = currentReview
    ? getProjectedIntervals({
      easeFactor: currentReview.ease_factor,
      interval: currentReview.interval,
      repetitions: currentReview.repetitions
    })
    : { again: 1, hard: 1, good: 1, easy: 1 }

  // Custom square styles
  const customSquareStyles: Record<string, React.CSSProperties> = {}
  legalMoves.forEach((square) => {
    customSquareStyles[square] = {
      background: 'radial-gradient(circle, rgba(212, 165, 74, 0.4) 25%, transparent 25%)'
    }
  })
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      background: 'rgba(212, 165, 74, 0.5)'
    }
  }

  if (!currentOpening) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Brain size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="font-display text-2xl text-white mb-2">Select an Opening</h2>
          <p className="text-gray-500">Choose an opening from the sidebar to start training</p>
        </div>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading training session...</p>
        </div>
      </div>
    )
  }

  if (state === 'complete') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle2 size={64} className="mx-auto text-accent-emerald mb-4" />
          <h2 className="font-display text-3xl text-white mb-2">Training Complete!</h2>
          <p className="text-gray-400 mb-6">
            You've reviewed all due positions for {currentOpening.name}
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-surface-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-accent-gold">{sessionCorrect}</p>
              <p className="text-sm text-gray-500">Correct</p>
            </div>
            <div className="bg-surface-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-white">{sessionTotal}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
            <div className="bg-surface-700 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-accent-emerald">
                {sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500">Accuracy</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSessionCorrect(0)
              setSessionTotal(0)
              setStreak(0)
              loadDueReviews(currentOpening.id)
            }}
            className="btn-primary"
          >
            <RotateCcw size={18} className="inline mr-2" />
            Train Again
          </button>
        </div>
      </div>
    )
  }

  const mastery = currentReview
    ? getMasteryLevel(currentReview.repetitions, currentReview.ease_factor)
    : null

  // Calculate responsive board size


  return (
    <div className="flex-1 flex gap-4 p-4 overflow-hidden">
      {/* Board section */}
      <div className="flex-shrink-0 flex items-center">
        <div className="chess-board-container mx-auto">
          <Chessboard
            position={fen}
            onSquareClick={onSquareClick}
            onPieceDrop={onPieceDrop}
            boardOrientation={currentOpening.color}
            boardWidth={boardSize}
            customSquareStyles={customSquareStyles}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            animationDuration={200}
            arePiecesDraggable={state === 'question'}
          />
        </div>
      </div>

      {/* Training card section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 bg-surface-700 px-3 py-1.5 rounded-lg">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm text-white">
              {currentReviewIndex + 1} / {dueReviews.length}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-surface-700 px-3 py-1.5 rounded-lg">
            <Flame size={16} className={streak > 0 ? 'text-orange-500' : 'text-gray-400'} />
            <span className="text-sm text-white">{streak} streak</span>
          </div>
          {mastery && (
            <span
              className={`badge badge-${mastery.color === 'green' ? 'emerald' : mastery.color === 'yellow' ? 'gold' : 'ruby'}`}
            >
              {mastery.label}
            </span>
          )}
        </div>

        {/* Card content */}
        <div className="flex-1 bg-surface-800 rounded-xl p-6 flex flex-col card-enter">
          <div className="flex-1">
            <h3 className="font-display text-xl text-white mb-2">
              {state === 'question' && 'Find the best move'}
              {state === 'correct' && 'Correct!'}
              {state === 'incorrect' && 'Not quite'}
            </h3>

            {state === 'question' && (
              <p className="text-gray-400 mb-4">What is the correct move in this position?</p>
            )}

            {(state === 'correct' || state === 'incorrect') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {state === 'correct' ? (
                    <CheckCircle2 size={24} className="text-accent-emerald" />
                  ) : (
                    <XCircle size={24} className="text-accent-ruby" />
                  )}
                  <div>
                    <p className="text-white">
                      Correct move:{' '}
                      <span className="font-mono text-accent-gold font-bold">{correctMove}</span>
                    </p>
                    {state === 'incorrect' && userMove && (
                      <p className="text-gray-500 text-sm">
                        You played: <span className="font-mono">{userMove}</span>
                      </p>
                    )}
                  </div>
                </div>

                {currentReview?.explanation && (
                  <div className="bg-surface-700 rounded-lg p-4">
                    <p className="text-gray-300 leading-relaxed">{currentReview.explanation.coach}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6">
            {state === 'question' && (
              <button onClick={handleShowAnswer} className="btn-secondary w-full">
                Show Answer
              </button>
            )}

            {(state === 'correct' || state === 'incorrect') && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">How difficult was this?</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleRating('again')}
                    className="flex flex-col items-center gap-1 p-3 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition-colors"
                  >
                    <span className="text-red-400 font-medium">Again</span>
                    <span className="text-xs text-gray-500">
                      {formatInterval(projectedIntervals.again)}
                    </span>
                  </button>
                  <button
                    onClick={() => handleRating('hard')}
                    className="flex flex-col items-center gap-1 p-3 bg-orange-900/30 hover:bg-orange-900/50 rounded-lg transition-colors"
                  >
                    <span className="text-orange-400 font-medium">Hard</span>
                    <span className="text-xs text-gray-500">
                      {formatInterval(projectedIntervals.hard)}
                    </span>
                  </button>
                  <button
                    onClick={() => handleRating('good')}
                    className="flex flex-col items-center gap-1 p-3 bg-green-900/30 hover:bg-green-900/50 rounded-lg transition-colors"
                  >
                    <span className="text-green-400 font-medium">Good</span>
                    <span className="text-xs text-gray-500">
                      {formatInterval(projectedIntervals.good)}
                    </span>
                  </button>
                  <button
                    onClick={() => handleRating('easy')}
                    className="flex flex-col items-center gap-1 p-3 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors"
                  >
                    <span className="text-blue-400 font-medium">Easy</span>
                    <span className="text-xs text-gray-500">
                      {formatInterval(projectedIntervals.easy)}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
