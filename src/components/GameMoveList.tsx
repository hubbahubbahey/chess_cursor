import { useMemo } from 'react'
import { useAppStore } from '../stores/useAppStore'
import { Swords, Flag, Crown, Scale, RotateCcw, Loader2 } from 'lucide-react'

interface MovePair {
  moveNumber: number
  white: string | null
  black: string | null
}

export default function GameMoveList() {
  const { moveHistory, game, aiColor, aiThinking, resetGame, goBack } = useAppStore()

  // Group moves into pairs for two-column display
  const movePairs = useMemo(() => {
    const pairs: MovePair[] = []
    for (let i = 0; i < moveHistory.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: moveHistory[i] || null,
        black: moveHistory[i + 1] || null
      })
    }
    return pairs
  }, [moveHistory])

  // Game status
  const isGameOver = game.isGameOver()
  const isCheck = game.isCheck()
  const isCheckmate = game.isCheckmate()
  const isDraw = game.isDraw()
  const isStalemate = game.isStalemate()
  const currentTurn = game.turn() === 'w' ? 'white' : 'black'
  const playerColor = aiColor === 'white' ? 'black' : 'white'

  // Determine game result
  const getGameResult = () => {
    if (isCheckmate) {
      const winner = currentTurn === 'white' ? 'Black' : 'White'
      const isPlayerWin = winner.toLowerCase() === playerColor
      return {
        text: `Checkmate! ${winner} wins`,
        isWin: isPlayerWin,
        icon: Crown
      }
    }
    if (isStalemate) {
      return { text: 'Stalemate - Draw', isWin: null, icon: Scale }
    }
    if (isDraw) {
      return { text: 'Draw', isWin: null, icon: Scale }
    }
    return null
  }

  const gameResult = getGameResult()

  return (
    <div className="flex-1 overflow-hidden flex flex-col max-h-[60vh]">
      {/* Controls and turn indicator */}
      <div className="p-4 border-b border-surface-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goBack}
              disabled={moveHistory.length === 0}
              className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Undo last move"
            >
              <RotateCcw size={16} className="text-gray-400" />
            </button>
            <button
              onClick={resetGame}
              className="p-2 rounded-lg bg-surface-700 hover:bg-surface-600 transition-colors"
              title="New game"
            >
              <Flag size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Turn indicator */}
        {!isGameOver && (
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                currentTurn === 'white' ? 'bg-white' : 'bg-gray-800 border border-gray-600'
              }`}
            />
            <span className="text-sm text-gray-400">
              {currentTurn === playerColor ? (
                'Your turn'
              ) : aiThinking ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  AI is thinking...
                </span>
              ) : (
                "AI's turn"
              )}
            </span>
            {isCheck && (
              <span className="text-xs text-red-400 font-medium bg-red-400/10 px-2 py-0.5 rounded">
                Check!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Game result banner */}
      {gameResult && (
        <div
          className={`px-4 py-3 flex items-center gap-3 ${
            gameResult.isWin === true
              ? 'bg-green-500/20 border-b border-green-500/30'
              : gameResult.isWin === false
                ? 'bg-red-500/20 border-b border-red-500/30'
                : 'bg-blue-500/20 border-b border-blue-500/30'
          }`}
        >
          <gameResult.icon
            size={20}
            className={
              gameResult.isWin === true
                ? 'text-green-400'
                : gameResult.isWin === false
                  ? 'text-red-400'
                  : 'text-blue-400'
            }
          />
          <span
            className={`font-medium ${
              gameResult.isWin === true
                ? 'text-green-400'
                : gameResult.isWin === false
                  ? 'text-red-400'
                  : 'text-blue-400'
            }`}
          >
            {gameResult.text}
          </span>
        </div>
      )}

      {/* Move list */}
      <div className="flex-1 scrollable-panel p-4 min-h-0">
        {movePairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Swords size={32} className="mb-3 opacity-50" />
            <p className="text-sm">No moves yet</p>
            <p className="text-xs mt-1">
              {playerColor === 'white' ? 'Make your first move!' : 'AI will move first...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1">
            {/* Header */}
            <div className="text-xs text-gray-500 font-medium px-2 py-1">#</div>
            <div className="text-xs text-gray-500 font-medium px-2 py-1">White</div>
            <div className="text-xs text-gray-500 font-medium px-2 py-1">Black</div>

            {/* Move rows */}
            {movePairs.map((pair, index) => (
              <MoveRow
                key={pair.moveNumber}
                pair={pair}
                isLatest={index === movePairs.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Game info footer */}
      <div className="px-4 py-3 border-t border-surface-700 bg-surface-700/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>You play as {playerColor === 'white' ? 'White' : 'Black'}</span>
          <span>{moveHistory.length} moves</span>
        </div>
      </div>
    </div>
  )
}

interface MoveRowProps {
  pair: MovePair
  isLatest: boolean
}

function MoveRow({ pair, isLatest }: MoveRowProps) {
  return (
    <>
      {/* Move number */}
      <div className="text-xs text-gray-500 px-2 py-1.5 flex items-center">{pair.moveNumber}.</div>

      {/* White's move */}
      {pair.white ? (
        <div
          className={`px-2 py-1.5 rounded font-mono text-sm ${
            isLatest && !pair.black ? 'bg-accent-gold/20 text-accent-gold' : 'text-white'
          }`}
        >
          {pair.white}
        </div>
      ) : (
        <div className="px-2 py-1.5" />
      )}

      {/* Black's move */}
      {pair.black ? (
        <div
          className={`px-2 py-1.5 rounded font-mono text-sm ${
            isLatest ? 'bg-accent-gold/20 text-accent-gold' : 'text-white'
          }`}
        >
          {pair.black}
        </div>
      ) : (
        <div className="px-2 py-1.5" />
      )}
    </>
  )
}
