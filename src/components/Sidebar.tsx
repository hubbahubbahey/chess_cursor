import { useAppStore, ViewType } from '../stores/useAppStore'
import { 
  BookOpen, 
  GraduationCap, 
  HelpCircle, 
  BarChart3, 
  ChevronRight,
  Crown
} from 'lucide-react'

const navItems: { id: ViewType; label: string; icon: typeof BookOpen }[] = [
  { id: 'explore', label: 'Explore', icon: BookOpen },
  { id: 'train', label: 'Train', icon: GraduationCap },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
]

export default function Sidebar() {
  const { 
    currentView, 
    setCurrentView, 
    openings, 
    currentOpening, 
    selectOpening 
  } = useAppStore()

  return (
    <aside className="w-64 bg-surface-800 border-r border-surface-700 flex flex-col min-h-0 overflow-hidden">
      {/* Navigation */}
      <nav className="p-3 border-b border-surface-700 flex-shrink-0">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'text-gray-400 hover:bg-surface-600 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Opening selection */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3 pt-3 flex-shrink-0">
          Openings
        </h3>
        <div className="flex-1 scrollable-panel px-3 pb-3 min-h-0">
          <ul className="space-y-2">
            {openings.map((opening) => {
              const isSelected = currentOpening?.id === opening.id
              return (
                <li key={opening.id}>
                  <button
                    onClick={() => selectOpening(opening)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      isSelected
                        ? 'bg-surface-600 border border-accent-gold/30'
                        : 'bg-surface-700 hover:bg-surface-600 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Crown 
                            size={14} 
                            className={opening.color === 'white' ? 'text-gray-300' : 'text-gray-600'} 
                          />
                          <span className={`font-medium truncate ${
                            isSelected ? 'text-accent-gold' : 'text-white'
                          }`}>
                            {opening.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {opening.description}
                        </p>
                      </div>
                      <ChevronRight 
                        size={16} 
                        className={`flex-shrink-0 transition-transform ${
                          isSelected ? 'text-accent-gold rotate-90' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span 
                        className={`badge ${
                          opening.color === 'white' ? 'bg-white/10 text-white' : 'bg-black/30 text-gray-300'
                        }`}
                        title={`This opening is played as ${opening.color === 'white' ? 'White' : 'Black'}`}
                      >
                        Play as {opening.color === 'white' ? 'White' : 'Black'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-surface-700">
        <div className="text-center">
          <p className="text-xs text-gray-600">
            Chess Opening Trainer v1.0
          </p>
        </div>
      </div>
    </aside>
  )
}
