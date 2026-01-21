import { useMemo } from 'react'
import { useAppStore, Position } from '../stores/useAppStore'

interface MovePair {
  moveNumber: number
  white: Position | null
  black: Position | null
}

export default function OpeningTree() {
  const { 
    positions, 
    currentPosition, 
    setCurrentPosition,
    currentOpening 
  } = useAppStore()

  // Flatten positions into move pairs for two-column display
  const { startingPosition, movePairs } = useMemo(() => {
    if (positions.length === 0) return { startingPosition: null, movePairs: [] }

    // Build parent-child map
    const childrenMap = new Map<number | null, Position[]>()
    let startPos: Position | null = null

    positions.forEach(pos => {
      if (pos.parent_id === null) {
        startPos = pos
      } else {
        const siblings = childrenMap.get(pos.parent_id) || []
        siblings.push(pos)
        childrenMap.set(pos.parent_id, siblings)
      }
    })

    // Walk the main line (first child at each level)
    const mainLine: Position[] = []
    let current = startPos
    while (current) {
      const children = childrenMap.get(current.id)
      if (children && children.length > 0) {
        mainLine.push(children[0])
        current = children[0]
      } else {
        current = null
      }
    }

    // Group into move pairs
    const pairs: MovePair[] = []
    for (let i = 0; i < mainLine.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: mainLine[i] || null,
        black: mainLine[i + 1] || null
      })
    }

    return { startingPosition: startPos, movePairs: pairs }
  }, [positions])

  if (!currentOpening) {
    return (
      <div className="flex-1 bg-surface-800 rounded-xl p-4 flex items-center justify-center">
        <p className="text-gray-500">Select an opening to explore</p>
      </div>
    )
  }

  if (!startingPosition) {
    return (
      <div className="flex-1 bg-surface-800 rounded-xl p-4 flex items-center justify-center">
        <p className="text-gray-500">Loading opening...</p>
      </div>
    )
  }

  return (
    <div className="scrollable-panel flex-1 min-h-0 p-4">
        {/* Starting position row */}
        <button
          onClick={() => setCurrentPosition(startingPosition)}
          className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition-colors ${
            currentPosition?.id === startingPosition.id
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'text-gray-400 hover:bg-surface-700'
          }`}
        >
          Starting Position
        </button>

        {/* Two-column move table */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1">
          {/* Header */}
          <div className="text-xs text-gray-500 font-medium px-2 py-1">#</div>
          <div className="text-xs text-gray-500 font-medium px-2 py-1">White</div>
          <div className="text-xs text-gray-500 font-medium px-2 py-1">Black</div>

          {/* Move rows */}
          {movePairs.map(pair => (
            <MoveRow
              key={pair.moveNumber}
              pair={pair}
              currentPosition={currentPosition}
              onSelect={setCurrentPosition}
            />
          ))}
        </div>
    </div>
  )
}

interface MoveRowProps {
  pair: MovePair
  currentPosition: Position | null
  onSelect: (position: Position) => void
}

function MoveRow({ pair, currentPosition, onSelect }: MoveRowProps) {
  return (
    <>
      {/* Move number */}
      <div className="text-xs text-gray-500 px-2 py-1.5 flex items-center">
        {pair.moveNumber}.
      </div>

      {/* White's move */}
      {pair.white ? (
        <button
          onClick={() => onSelect(pair.white!)}
          className={`text-left px-2 py-1.5 rounded font-mono text-sm transition-colors ${
            currentPosition?.id === pair.white.id
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'text-white hover:bg-surface-700'
          }`}
        >
          {pair.white.move_san}
        </button>
      ) : (
        <div className="px-2 py-1.5" />
      )}

      {/* Black's move */}
      {pair.black ? (
        <button
          onClick={() => onSelect(pair.black!)}
          className={`text-left px-2 py-1.5 rounded font-mono text-sm transition-colors ${
            currentPosition?.id === pair.black.id
              ? 'bg-accent-gold/20 text-accent-gold'
              : 'text-white hover:bg-surface-700'
          }`}
        >
          {pair.black.move_san}
        </button>
      ) : (
        <div className="px-2 py-1.5" />
      )}
    </>
  )
}
