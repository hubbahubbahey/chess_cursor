import { useAppStore } from '../stores/useAppStore'
import { MessageCircle, Sparkles, Tag, AlertTriangle, ArrowRight } from 'lucide-react'

export default function LessonPanel() {
  const { currentPosition, childPositions, setCurrentPosition, currentOpening } = useAppStore()

  if (!currentOpening) {
    return null
  }

  const explanation = currentPosition?.explanation

  return (
    <div className="scrollable-panel max-h-[60vh] min-h-0">
      <div className="p-4">
        {explanation ? (
          <div className="space-y-4 leading-relaxed">
            {/* Concept badge */}
            {explanation.concept && (
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-accent-gold" />
                <span className="text-xs font-medium text-accent-gold bg-accent-gold/10 px-2 py-1 rounded-full">
                  {explanation.concept}
                </span>
              </div>
            )}

            {/* Main coach message */}
            <div className="bg-surface-700/50 rounded-lg p-4 border-l-4 border-accent-gold">
              <p className="text-gray-200 leading-relaxed">
                {explanation.coach}
              </p>
            </div>

            {/* Chess insight/wisdom */}
            {explanation.insight && (
              <div className="flex items-start gap-3 bg-blue-500/10 rounded-lg p-3">
                <Sparkles size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-400 mb-1">Chess Wisdom</p>
                  <p className="text-sm text-gray-300 italic">
                    "{explanation.insight}"
                  </p>
                </div>
              </div>
            )}

            {/* Warning about common mistakes */}
            {explanation.warning && (
              <div className="flex items-start gap-3 bg-amber-500/10 rounded-lg p-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-400 mb-1">Watch Out</p>
                  <p className="text-sm text-gray-300">
                    {explanation.warning}
                  </p>
                </div>
              </div>
            )}
            
            {/* Show next moves */}
            {childPositions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-700">
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  {childPositions.length === 1 ? 'Next Move' : 'Possible Continuations'}
                </h4>
                <div className="space-y-2">
                  {childPositions.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setCurrentPosition(child)}
                      className="w-full flex items-center gap-3 p-3 bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors group"
                    >
                      <span className="font-mono text-accent-gold font-medium">
                        {child.move_san}
                      </span>
                      <span className="text-sm text-gray-400 flex-1 text-left truncate">
                        {child.explanation?.coach.slice(0, 50)}...
                      </span>
                      <ArrowRight 
                        size={16} 
                        className="text-gray-600 group-hover:text-accent-gold transition-colors"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            Select a position to see coaching tips
          </p>
        )}
      </div>
    </div>
  )
}
