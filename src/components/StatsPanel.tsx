import { useEffect, useState } from 'react'
import { useAppStore, Stats, Position } from '../stores/useAppStore'
import { getMasteryLevel } from '../lib/srs'
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react'

interface PositionStats extends Stats {
  position?: Position
  mastery?: ReturnType<typeof getMasteryLevel>
}

export default function StatsPanel() {
  const { currentOpening, positions } = useAppStore()
  const [stats, setStats] = useState<PositionStats[]>([])
  const [reviews, setReviews] = useState<{ position_id: number; repetitions: number; ease_factor: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      try {
        const allStats = await window.electronAPI.getAllStats()
        
        // Get review data for mastery levels
        const reviewPromises = allStats.map(s => 
          window.electronAPI.getReview(s.position_id)
        )
        const reviewResults = await Promise.all(reviewPromises)
        
        // Combine stats with position data and mastery
        const enrichedStats = allStats.map((s, i) => {
          const position = positions.find(p => p.id === s.position_id)
          const review = reviewResults[i]
          const mastery = review ? getMasteryLevel(review.repetitions, review.ease_factor) : undefined
          return {
            ...s,
            position,
            mastery
          }
        }).filter(s => 
          !currentOpening || s.position?.opening_id === currentOpening.id
        )

        setStats(enrichedStats)
        setReviews(reviewResults.filter(r => r) as typeof reviews)
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
      setLoading(false)
    }

    loadStats()
  }, [currentOpening, positions])

  // Calculate aggregate statistics
  const totalAttempts = stats.reduce((sum, s) => sum + s.attempts, 0)
  const totalCorrect = stats.reduce((sum, s) => sum + s.correct, 0)
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  const masteryBreakdown = {
    new: stats.filter(s => s.mastery?.level === 'new').length,
    learning: stats.filter(s => s.mastery?.level === 'learning').length,
    reviewing: stats.filter(s => s.mastery?.level === 'reviewing').length,
    mastered: stats.filter(s => s.mastery?.level === 'mastered').length
  }

  const totalPositions = currentOpening 
    ? positions.filter(p => p.opening_id === currentOpening.id).length
    : positions.length

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-display text-3xl text-white mb-2">
            {currentOpening ? `${currentOpening.name} Statistics` : 'Overall Statistics'}
          </h2>
          <p className="text-gray-500">
            Track your progress and identify areas for improvement
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-gold/20 flex items-center justify-center">
                <Target size={20} className="text-accent-gold" />
              </div>
              <span className="text-gray-400 text-sm">Accuracy</span>
            </div>
            <p className="text-3xl font-bold text-white">{accuracy}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {totalCorrect} / {totalAttempts} correct
            </p>
          </div>

          <div className="bg-surface-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent-emerald/20 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-accent-emerald" />
              </div>
              <span className="text-gray-400 text-sm">Mastered</span>
            </div>
            <p className="text-3xl font-bold text-white">{masteryBreakdown.mastered}</p>
            <p className="text-sm text-gray-500 mt-1">
              of {totalPositions} positions
            </p>
          </div>

          <div className="bg-surface-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-blue-400" />
              </div>
              <span className="text-gray-400 text-sm">Learning</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {masteryBreakdown.learning + masteryBreakdown.reviewing}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              positions in progress
            </p>
          </div>

          <div className="bg-surface-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
                <Clock size={20} className="text-gray-400" />
              </div>
              <span className="text-gray-400 text-sm">New</span>
            </div>
            <p className="text-3xl font-bold text-white">{masteryBreakdown.new}</p>
            <p className="text-sm text-gray-500 mt-1">
              positions to learn
            </p>
          </div>
        </div>

        {/* Mastery breakdown */}
        <div className="bg-surface-800 rounded-xl p-6 mb-8">
          <h3 className="font-display text-lg text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-accent-gold" />
            Mastery Breakdown
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">New</span>
                <span className="text-white">{masteryBreakdown.new}</span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-500 transition-all duration-500"
                  style={{ width: `${totalPositions > 0 ? (masteryBreakdown.new / totalPositions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Learning</span>
                <span className="text-white">{masteryBreakdown.learning}</span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${totalPositions > 0 ? (masteryBreakdown.learning / totalPositions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Reviewing</span>
                <span className="text-white">{masteryBreakdown.reviewing}</span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${totalPositions > 0 ? (masteryBreakdown.reviewing / totalPositions) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">Mastered</span>
                <span className="text-white">{masteryBreakdown.mastered}</span>
              </div>
              <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${totalPositions > 0 ? (masteryBreakdown.mastered / totalPositions) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Position details table */}
        {stats.length > 0 && (
          <div className="bg-surface-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-surface-700">
              <h3 className="font-display text-lg text-white flex items-center gap-2">
                <Calendar size={20} className="text-accent-gold" />
                Position Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-700">
                    <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Move</th>
                    <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Status</th>
                    <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Attempts</th>
                    <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Correct</th>
                    <th className="text-right text-sm text-gray-400 font-medium px-4 py-3">Accuracy</th>
                    <th className="text-left text-sm text-gray-400 font-medium px-4 py-3">Last Practice</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.slice(0, 20).map((stat) => {
                    const posAccuracy = stat.attempts > 0 
                      ? Math.round((stat.correct / stat.attempts) * 100) 
                      : 0
                    return (
                      <tr key={stat.id} className="border-t border-surface-700 hover:bg-surface-700/50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-accent-gold">
                            {stat.position?.move_san || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {stat.mastery && (
                            <span className={`badge ${
                              stat.mastery.level === 'mastered' ? 'badge-emerald' :
                              stat.mastery.level === 'reviewing' ? 'bg-blue-500/20 text-blue-400' :
                              stat.mastery.level === 'learning' ? 'badge-gold' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {stat.mastery.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {stat.attempts}
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          {stat.correct}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={
                            posAccuracy >= 80 ? 'text-accent-emerald' :
                            posAccuracy >= 50 ? 'text-accent-gold' :
                            'text-accent-ruby'
                          }>
                            {posAccuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">
                          {stat.last_attempt 
                            ? new Date(stat.last_attempt).toLocaleDateString()
                            : '—'
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {stats.length > 20 && (
              <div className="p-4 text-center text-gray-500 text-sm border-t border-surface-700">
                Showing 20 of {stats.length} positions
              </div>
            )}
          </div>
        )}

        {stats.length === 0 && (
          <div className="bg-surface-800 rounded-xl p-12 text-center">
            <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="font-display text-xl text-white mb-2">No training data yet</h3>
            <p className="text-gray-500">
              Start training or take quizzes to see your statistics here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
