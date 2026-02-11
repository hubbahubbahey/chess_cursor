import { useEffect } from 'react'

function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false
  const tagName = target.tagName.toLowerCase()
  const role = target.getAttribute?.('role')
  const isContentEditable = target.isContentEditable
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    role === 'textbox' ||
    isContentEditable
  )
}

export function useKeyboardShortcuts(handlers: {
  goBack: () => void
  flipBoard: () => void
  resetGame: () => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputElement(e.target)) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlers.goBack()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          handlers.flipBoard()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          handlers.resetGame()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers.goBack, handlers.flipBoard, handlers.resetGame])
}
