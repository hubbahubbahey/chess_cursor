import { useAppStore } from '../stores/useAppStore'
import { Bot, Loader2 } from 'lucide-react'
import { DifficultyLevel } from '../lib/engine'

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
}

export default function AiControlPanel() {
  const {
    aiEnabled,
    aiColor,
    aiDifficulty,
    aiVariety,
    aiThinking,
    setAiEnabled,
    setAiColor,
    setAiDifficulty,
    setAiVariety,
    boardOrientation,
    resetGame
  } = useAppStore()

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot size={20} className={aiEnabled ? 'text-accent-gold' : 'text-gray-500'} />
          <span className="font-display text-white">AI Opponent</span>
        </div>
        
        {/* Toggle switch */}
        <button
          onClick={() => {
            const newEnabled = !aiEnabled
            setAiEnabled(newEnabled)
            if (newEnabled) {
              resetGame()
            }
          }}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            aiEnabled ? 'bg-accent-gold' : 'bg-surface-600'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              aiEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {aiEnabled && (
        <div className="space-y-4">
          {/* AI thinking indicator */}
          {aiThinking && (
            <div className="flex items-center gap-2 text-accent-gold bg-surface-700 rounded-lg px-3 py-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}

          {/* Play as color */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">You play as</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setAiColor('black') // If you play white, AI plays black
                  resetGame()
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  aiColor === 'black'
                    ? 'bg-white text-surface-900'
                    : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
                }`}
              >
                White
              </button>
              <button
                onClick={() => {
                  setAiColor('white') // If you play black, AI plays white
                  resetGame()
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  aiColor === 'white'
                    ? 'bg-surface-900 text-white border border-gray-600'
                    : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
                }`}
              >
                Black
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI plays as {aiColor === 'white' ? 'White' : 'Black'}
            </p>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Difficulty</label>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setAiDifficulty(level)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                    aiDifficulty === level
                      ? 'bg-accent-gold text-surface-900'
                      : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
                  }`}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              ))}
            </div>
          </div>

          {/* Move Variety */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Move Variety
              <span className="ml-2 text-xs text-gray-500">({aiVariety === 1 ? 'Best only' : `Top ${aiVariety}`})</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                value={aiVariety}
                onChange={(e) => setAiVariety(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-accent-gold"
              />
              <span className="text-sm text-gray-300 w-8 text-center">{aiVariety}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {aiVariety === 1 
                ? 'Always plays the best move' 
                : `Randomly selects from top ${aiVariety} moves`}
            </p>
          </div>

          {/* Hint about board orientation */}
          {aiEnabled && boardOrientation !== (aiColor === 'black' ? 'white' : 'black') && (
            <p className="text-xs text-yellow-500/80">
              Tip: Flip the board to match your playing color
            </p>
          )}
        </div>
      )}
    </div>
  )
}
