import { useEffect, useState, useCallback, useMemo } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, Square } from 'chess.js'
import { useAppStore, Position } from '../stores/useAppStore'
import { getLegalMovesFromSquare, moveToSAN } from '../lib/chess'
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  SkipForward,
  RotateCcw,
  Lightbulb
} from 'lucide-react'

type QuizState = 'loading' | 'question' | 'correct' | 'incorrect'

export default function QuizMode() {
  const { currentOpening, positions, quizScore, quizStreak, incrementQuizScore, resetQuiz } =
    useAppStore()

  const [state, setState] = useState<QuizState>('loading')
  const [currentQuestion, setCurrentQuestion] = useState<Position | null>(null)
  const [fen, setFen] = useState('')
  const [correctMove, setCorrectMove] = useState('')
  const [userMove, setUserMove] = useState('')
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const [attempts, setAttempts] = useState(0)
  const [showHint, setShowHint] = useState(false)
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

  const [questionsAnswered, setQuestionsAnswered] = useState(0)

  // Get positions that have moves (not root positions)
  const quizPositions = useMemo(() => {
    return positions.filter((p) => p.move_san !== null && p.parent_id !== null)
  }, [positions])

  // Pick a random question
  const pickRandomQuestion = useCallback(() => {
    if (quizPositions.length === 0) {
      setState('loading')
      return
    }

    const randomIndex = Math.floor(Math.random() * quizPositions.length)
    const question = quizPositions[randomIndex]

    // Find parent position to show
    const parent = positions.find((p) => p.id === question.parent_id)
    if (parent) {
      setFen(parent.fen)
    }

    setCurrentQuestion(question)
    setCorrectMove(question.move_san || '')
    setState('question')
    setUserMove('')
    setSelectedSquare(null)
    setLegalMoves([])
    setAttempts(0)
    setShowHint(false)
    setShowHint(false)
  }, [quizPositions, positions])

  // Check the user's move
  const handleMoveAttempt = useCallback((moveSan: string) => {
    setUserMove(moveSan)
    setAttempts((prev) => prev + 1)

    if (moveSan === correctMove) {
      setState('correct')
      incrementQuizScore(true)
      setQuestionsAnswered((prev) => prev + 1)
      // Show the correct position
      const game = new Chess(fen)
      game.move(moveSan)
      setFen(game.fen())
    } else {
      // Wrong answer - allow retry unless too many attempts
      if (attempts >= 2) {
        setState('incorrect')
        incrementQuizScore(false)
        setQuestionsAnswered((prev) => prev + 1)
        // Show the correct move
        const game = new Chess(fen)
        try {
          game.move(correctMove)
          setFen(game.fen())
        } catch {
          // ignore
        }
      }
    }
  }, [correctMove, attempts, fen, incrementQuizScore])

  // Initialize first question
  useEffect(() => {
    if (currentOpening && quizPositions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      pickRandomQuestion()
    }
  }, [currentOpening, quizPositions.length, pickRandomQuestion])

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



  // Show hint (first letter of the move)
  const handleShowHint = () => {
    setShowHint(true)
  }

  // Skip to next question
  const handleSkip = () => {
    incrementQuizScore(false)
    setQuestionsAnswered((prev) => prev + 1)
    pickRandomQuestion()
  }

  // Next question after answer
  const handleNext = () => {
    pickRandomQuestion()
  }

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
          <HelpCircle size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="font-display text-2xl text-white mb-2">Select an Opening</h2>
          <p className="text-gray-500">Choose an opening from the sidebar to start the quiz</p>
        </div>
      </div>
    )
  }

  if (quizPositions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <HelpCircle size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="font-display text-2xl text-white mb-2">No Positions Available</h2>
          <p className="text-gray-500">This opening doesn't have any positions to quiz on yet</p>
        </div>
      </div>
    )
  }

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

      {/* Quiz panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Score bar */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 bg-surface-700 px-3 py-1.5 rounded-lg">
            <Trophy size={16} className="text-accent-gold" />
            <span className="text-sm text-white">{quizScore} points</span>
          </div>
          <div className="flex items-center gap-2 bg-surface-700 px-3 py-1.5 rounded-lg">
            <Flame size={16} className={quizStreak > 0 ? 'text-orange-500' : 'text-gray-400'} />
            <span className="text-sm text-white">{quizStreak} streak</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              resetQuiz()
              setQuestionsAnswered(0)
              pickRandomQuestion()
            }}
            className="btn-ghost text-sm"
          >
            <RotateCcw size={14} className="mr-1" />
            Reset
          </button>
        </div>

        {/* Quiz card */}
        <div className="flex-1 bg-surface-800 rounded-xl p-6 flex flex-col card-enter">
          <div className="flex-1">
            {state === 'question' && (
              <>
                <h3 className="font-display text-xl text-white mb-2">Find the correct move</h3>
                <p className="text-gray-400 mb-4">{currentOpening.name} opening</p>

                {attempts > 0 && state === 'question' && (
                  <div className="bg-orange-900/30 text-orange-400 px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                    <XCircle size={18} />
                    <span>
                      <span className="font-mono">{userMove}</span> is not correct.
                      {attempts < 3 ? ` Try again! (${3 - attempts} attempts left)` : ''}
                    </span>
                  </div>
                )}

                {showHint && (
                  <div className="bg-accent-gold/20 text-accent-gold px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
                    <Lightbulb size={18} />
                    <span>
                      Hint: The move starts with{' '}
                      <span className="font-mono font-bold">{correctMove[0]}</span>
                    </span>
                  </div>
                )}
              </>
            )}

            {state === 'correct' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={32} className="text-accent-emerald" />
                  <div>
                    <h3 className="font-display text-xl text-white">Correct!</h3>
                    <p className="text-accent-gold font-mono">{correctMove}</p>
                  </div>
                </div>

                {currentQuestion?.explanation && (
                  <div className="bg-surface-700 rounded-lg p-4">
                    <p className="text-gray-300 leading-relaxed">{currentQuestion.explanation.coach}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Answered in {attempts} {attempts === 1 ? 'attempt' : 'attempts'}
                  </span>
                  {!showHint && attempts === 1 && (
                    <span className="badge badge-emerald">Perfect!</span>
                  )}
                </div>
              </div>
            )}

            {state === 'incorrect' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <XCircle size={32} className="text-accent-ruby" />
                  <div>
                    <h3 className="font-display text-xl text-white">Not quite</h3>
                    <p className="text-gray-400">
                      The correct move was{' '}
                      <span className="font-mono text-accent-gold">{correctMove}</span>
                    </p>
                  </div>
                </div>

                {currentQuestion?.explanation && (
                  <div className="bg-surface-700 rounded-lg p-4">
                    <p className="text-gray-300 leading-relaxed">{currentQuestion.explanation.coach}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            {state === 'question' && (
              <>
                {!showHint && (
                  <button onClick={handleShowHint} className="btn-secondary flex-1">
                    <Lightbulb size={18} className="mr-2" />
                    Hint
                  </button>
                )}
                <button onClick={handleSkip} className="btn-ghost flex-1">
                  <SkipForward size={18} className="mr-2" />
                  Skip
                </button>
              </>
            )}

            {(state === 'correct' || state === 'incorrect') && (
              <button onClick={handleNext} className="btn-primary flex-1">
                Next Question
              </button>
            )}
          </div>
        </div>

        {/* Session stats */}
        {questionsAnswered > 0 && (
          <div className="mt-4 bg-surface-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Session accuracy</span>
              <span className="text-white font-medium">
                {quizScore} / {questionsAnswered} (
                {Math.round((quizScore / questionsAnswered) * 100)}%)
              </span>
            </div>
            <div className="progress-bar mt-2">
              <div
                className="progress-fill"
                style={{ width: `${(quizScore / questionsAnswered) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
