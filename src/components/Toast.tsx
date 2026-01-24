import { useEffect } from 'react'
import { useAppStore } from '../stores/useAppStore'

export default function Toast() {
  const toastMessage = useAppStore((state) => state.toastMessage)
  const clearToast = useAppStore((state) => state.clearToast)

  useEffect(() => {
    if (toastMessage) {
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        clearToast()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [toastMessage, clearToast])

  if (!toastMessage) return null

  const typeColors = {
    blunder: 'bg-red-500/90 border-red-600',
    mistake: 'bg-orange-500/90 border-orange-600',
    inaccuracy: 'bg-yellow-500/90 border-yellow-600',
    info: 'bg-blue-500/90 border-blue-600'
  }

  const typeIcons = {
    blunder: '⚠️',
    mistake: '⚠️',
    inaccuracy: '⚠️',
    info: 'ℹ️'
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideIn">
      <div
        className={`${typeColors[toastMessage.type]} text-white px-4 py-3 rounded-lg shadow-lg border-2 flex items-center gap-3 min-w-[300px] max-w-[500px] cursor-pointer transition-opacity hover:opacity-90`}
        onClick={clearToast}
        role="alert"
      >
        <span className="text-2xl flex-shrink-0">{typeIcons[toastMessage.type]}</span>
        <div className="flex-1">
          <p className="text-sm font-medium leading-tight">{toastMessage.message}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            clearToast()
          }}
          className="text-white/80 hover:text-white flex-shrink-0 text-xl font-bold leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
