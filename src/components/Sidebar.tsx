import { useAppStore, ViewType } from '../stores/useAppStore'
import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Crown,
  Loader2,
  AlertCircle,
  RotateCcw,
  Download,
  Upload
} from 'lucide-react'

const navItems: { id: ViewType; label: string; icon: typeof BookOpen }[] = [
  { id: 'explore', label: 'Explore', icon: BookOpen },
  { id: 'train', label: 'Train', icon: GraduationCap },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  { id: 'stats', label: 'Statistics', icon: BarChart3 }
]

export default function Sidebar() {
  const {
    currentView,
    setCurrentView,
    openings,
    currentOpening,
    selectOpening,
    sidebarCollapsed,
    toggleSidebar,
    openingsLoading,
    openingsError,
    loadOpenings,
    showToast
  } = useAppStore()

  const handleExportBackup = async () => {
    const result = await window.electronAPI.exportToFile()
    if (!result.canceled && result.path) {
      showToast('info', 'Backup saved')
    }
  }

  const handleImportBackup = async () => {
    if (!window.confirm('Importing will replace all current data. Continue?')) return
    const result = await window.electronAPI.importFromFile()
    if (result.canceled) return
    if (result.success) {
      showToast('info', 'Backup restored')
      loadOpenings()
    } else {
      showToast('info', result.error ?? 'Import failed')
    }
  }

  // Collapsed state - show icon-only navigation
  if (sidebarCollapsed) {
    return (
      <aside className="w-12 bg-surface-800 border-r border-surface-700 flex flex-col min-h-0 overflow-hidden transition-all duration-300">
        {/* Toggle button */}
        <div className="p-2 border-b border-surface-700 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-surface-700 transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Icon-only navigation */}
        <nav className="p-2 flex-1 min-h-0 overflow-hidden flex flex-col">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full flex items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-accent-gold/20 text-accent-gold'
                        : 'text-gray-400 hover:bg-surface-600 hover:text-white'
                    }`}
                    title={item.label}
                  >
                    <Icon size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    )
  }

  // Expanded state - show full sidebar
  return (
    <aside className="w-64 bg-surface-800 border-r border-surface-700 flex flex-col min-h-0 overflow-hidden transition-all duration-300">
      {/* Toggle button */}
      <div className="p-3 border-b border-surface-700 flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu</span>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft size={16} className="text-gray-400" />
        </button>
      </div>

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
          {openingsLoading ? (
            <div className="flex items-center gap-2 py-4 text-gray-400">
              <Loader2 size={18} className="animate-spin flex-shrink-0" />
              <span className="text-sm">Loading openings…</span>
            </div>
          ) : openingsError ? (
            <div className="py-4 space-y-3">
              <div className="flex items-start gap-2 text-red-400">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm">{openingsError}</span>
              </div>
              <button
                onClick={() => loadOpenings()}
                className="flex items-center gap-2 px-3 py-2 bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg text-sm font-medium transition-colors"
              >
                <RotateCcw size={14} />
                Retry
              </button>
            </div>
          ) : (
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
                            className={
                              opening.color === 'white' ? 'text-gray-300' : 'text-gray-600'
                            }
                          />
                          <span
                            className={`font-medium truncate ${
                              isSelected ? 'text-accent-gold' : 'text-white'
                            }`}
                          >
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
                          opening.color === 'white'
                            ? 'bg-white/10 text-white'
                            : 'bg-black/30 text-gray-300'
                        }`}
                        title={`You play as ${opening.color === 'white' ? 'White' : 'Black'} in this opening`}
                      >
                        Play as {opening.color === 'white' ? 'White' : 'Black'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-surface-700 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleExportBackup}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            title="Export backup"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={handleImportBackup}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-lg text-xs font-medium transition-colors"
            title="Import backup"
          >
            <Upload size={14} />
            Import
          </button>
        </div>
        <p className="text-center text-xs text-gray-600">Chess Opening Trainer v1.0</p>
      </div>
    </aside>
  )
}
