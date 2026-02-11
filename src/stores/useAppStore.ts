import { create } from 'zustand'
import { Chess } from 'chess.js'
import {
  initEngine,
  getBestMove,
  getTopMoves,
  parseUciMove,
  stopCalculation,
  isEngineReady,
  DifficultyLevel,
  DIFFICULTY_PRESETS
} from '../lib/engine'

export type ViewType = 'explore' | 'train' | 'quiz' | 'stats'

export interface Opening {
  id: number
  name: string
  color: 'white' | 'black'
  description: string
}

export interface PositionExplanation {
  coach: string // Main coaching point in conversational tone
  insight?: string // General chess wisdom/principle
  concept?: string // Strategic or tactical concept name
  warning?: string // Common mistake to avoid
}

export interface Position {
  id: number
  fen: string
  opening_id: number
  parent_id: number | null
  move_san: string | null
  explanation: PositionExplanation | null
}

export interface Review {
  id: number
  position_id: number
  ease_factor: number
  interval: number
  repetitions: number
  next_review: string | null
  last_review: string | null
}

export interface ReviewWithPosition extends Review {
  fen: string
  move_san: string | null
  explanation: PositionExplanation | null
}

export interface Stats {
  id: number
  position_id: number
  attempts: number
  correct: number
  last_attempt: string | null
}

// Coach-related types
export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  analysisType?: 'position' | 'moves' | 'mistakes' | 'plan' | 'custom'
}

// Move analysis types
export interface MoveAnalysis {
  moveNumber: number
  moveSan: string
  from: string
  to: string
  evalBefore: { type: 'cp' | 'mate'; value: number }
  evalAfter: { type: 'cp' | 'mate'; value: number }
  quality: 'blunder' | 'mistake' | 'inaccuracy' | 'good'
  bestMove: string
  bestMoveSan: string
  evalDelta: number
}

export interface ToastMessage {
  type: 'blunder' | 'mistake' | 'inaccuracy' | 'info'
  message: string
  id: string
}

export interface CoachSettings {
  endpoint: string
  model: string
}

interface AppState {
  // Navigation
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Chess game state
  game: Chess
  fen: string
  setFen: (fen: string) => void
  makeMove: (from: string, to: string, promotion?: string) => boolean
  resetGame: () => void
  loadPosition: (fen: string) => void

  // Openings
  openings: Opening[]
  currentOpening: Opening | null
  openingsLoading: boolean
  openingsError: string | null
  loadOpenings: () => Promise<void>
  selectOpening: (opening: Opening) => Promise<void>

  // Positions
  positions: Position[]
  currentPosition: Position | null
  childPositions: Position[]
  setCurrentPosition: (position: Position | null) => void
  loadChildPositions: (parentId: number) => Promise<void>

  // Training
  dueReviews: ReviewWithPosition[]
  currentReviewIndex: number
  loadDueReviews: (openingId?: number) => Promise<void>
  nextReview: () => void

  // Quiz
  quizScore: number
  quizStreak: number
  incrementQuizScore: (correct: boolean) => void
  resetQuiz: () => void

  // Board orientation
  boardOrientation: 'white' | 'black'
  flipBoard: () => void

  // Move history for current exploration
  moveHistory: string[]
  addToHistory: (move: string) => void
  goBack: () => void
  clearHistory: () => void

  // AI opponent
  aiEnabled: boolean
  aiColor: 'white' | 'black'
  aiDifficulty: DifficultyLevel
  aiVariety: number
  aiThinking: boolean
  setAiEnabled: (enabled: boolean) => void
  setAiColor: (color: 'white' | 'black') => void
  setAiDifficulty: (difficulty: DifficultyLevel) => void
  setAiVariety: (variety: number) => void
  triggerAiMove: () => Promise<void>

  // AI Coach
  coachMessages: CoachMessage[]
  coachLoading: boolean
  coachConnected: boolean
  coachPanelOpen: boolean
  coachSettings: CoachSettings
  coachHighlightSquares: string[]
  toggleCoachPanel: () => void
  clearCoachHistory: () => void
  setCoachHighlightSquares: (squares: string[]) => void
  deleteCoachMessage: (messageId: string) => void
  checkCoachConnection: () => Promise<void>
  updateCoachSettings: (settings: Partial<CoachSettings>) => Promise<void>
  askCoach: (
    analysisType: 'position' | 'moves' | 'mistakes' | 'plan' | 'custom',
    customQuestion?: string
  ) => Promise<void>

  // Move analysis
  moveAnalysisEnabled: boolean
  currentMoveAnalysis: MoveAnalysis | null
  moveAnalysisHistory: MoveAnalysis[]
  toastMessage: ToastMessage | null
  setMoveAnalysisEnabled: (enabled: boolean) => void
  analyzeMoveQuality: (fenBefore: string, fenAfter: string, move: { from: string; to: string; san: string }) => Promise<void>
  clearToast: () => void
  showToast: (type: ToastMessage['type'], message: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'explore',
  setCurrentView: (view) => set({ currentView: view }),

  // Sidebar
  sidebarCollapsed: true,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Chess game state
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  setFen: (fen) => {
    const game = new Chess(fen)
    set({ fen, game })
  },

  makeMove: (from, to, promotion) => {
    const { game, moveAnalysisEnabled, fen: fenBefore } = get()
    try {
      const move = game.move({ from, to, promotion: promotion || 'q' })
      if (move) {
        const fenAfter = game.fen()
        set({ fen: fenAfter, game })
        get().addToHistory(move.san)
        
        // Trigger async analysis if enabled (both human and AI moves)
        if (moveAnalysisEnabled) {
          get().analyzeMoveQuality(fenBefore, fenAfter, {
            from,
            to,
            san: move.san
          }).catch((error) => {
            console.error('Move analysis failed:', error)
          })
        }
        
        return true
      }
      return false
    } catch {
      return false
    }
  },

  resetGame: () => {
    // Stop any ongoing AI calculation
    stopCalculation()
    const game = new Chess()
    set({
      fen: game.fen(),
      game,
      moveHistory: [],
      currentPosition: null,
      aiThinking: false
    })
  },

  loadPosition: (fen) => {
    const game = new Chess(fen)
    set({ fen, game })
  },

  // Openings
  openings: [],
  currentOpening: null,
  openingsLoading: false,
  openingsError: null,

  loadOpenings: async () => {
    set({ openingsLoading: true, openingsError: null })
    try {
      const openings = await window.electronAPI.getOpenings()
      set({ openings, openingsLoading: false, openingsError: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load openings'
      console.error('Failed to load openings:', error)
      set({ openingsLoading: false, openingsError: message })
    }
  },

  selectOpening: async (opening) => {
    try {
      const positions = await window.electronAPI.getPositions(opening.id)
      const rootPosition = positions.find((p: Position) => p.parent_id === null) || null

      set({
        currentOpening: opening,
        positions,
        currentPosition: rootPosition,
        boardOrientation: opening.color,
        moveHistory: []
      })

      if (rootPosition) {
        get().loadPosition(rootPosition.fen)
        get().loadChildPositions(rootPosition.id)
      }
    } catch (error) {
      console.error('Failed to load opening positions:', error)
    }
  },

  // Positions
  positions: [],
  currentPosition: null,
  childPositions: [],

  setCurrentPosition: (position) => {
    set({ currentPosition: position })
    if (position) {
      get().loadPosition(position.fen)
      get().loadChildPositions(position.id)
    }
  },

  loadChildPositions: async (parentId) => {
    try {
      const children = await window.electronAPI.getChildPositions(parentId)
      set({ childPositions: children })
    } catch (error) {
      console.error('Failed to load child positions:', error)
      set({ childPositions: [] })
    }
  },

  // Training
  dueReviews: [],
  currentReviewIndex: 0,

  loadDueReviews: async (openingId) => {
    try {
      const reviews = await window.electronAPI.getDueReviews(openingId)
      set({ dueReviews: reviews, currentReviewIndex: 0 })
    } catch (error) {
      console.error('Failed to load due reviews:', error)
    }
  },

  nextReview: () => {
    const { currentReviewIndex, dueReviews } = get()
    if (currentReviewIndex < dueReviews.length - 1) {
      set({ currentReviewIndex: currentReviewIndex + 1 })
    }
  },

  // Quiz
  quizScore: 0,
  quizStreak: 0,

  incrementQuizScore: (correct) => {
    if (correct) {
      set((state) => ({
        quizScore: state.quizScore + 1,
        quizStreak: state.quizStreak + 1
      }))
    } else {
      set((state) => ({
        quizScore: state.quizScore,
        quizStreak: 0
      }))
    }
  },

  resetQuiz: () => set({ quizScore: 0, quizStreak: 0 }),

  // Board orientation
  boardOrientation: 'white',
  flipBoard: () =>
    set((state) => ({
      boardOrientation: state.boardOrientation === 'white' ? 'black' : 'white'
    })),

  // Move history
  moveHistory: [],

  addToHistory: (move) =>
    set((state) => ({
      moveHistory: [...state.moveHistory, move]
    })),

  goBack: () => {
    // Stop any ongoing AI calculation
    stopCalculation()
    set({ aiThinking: false })

    const { moveHistory, currentPosition, positions, game } = get()

    // If there's move history, undo the last move
    if (moveHistory.length > 0) {
      game.undo()
      set({
        fen: game.fen(),
        game,
        moveHistory: moveHistory.slice(0, -1)
      })
    }

    // Also handle position tracking if we're in an opening
    if (currentPosition?.parent_id) {
      const parentPosition = positions.find((p) => p.id === currentPosition.parent_id)
      if (parentPosition) {
        set({ currentPosition: parentPosition })
        get().loadChildPositions(parentPosition.id)
      }
    }
  },

  clearHistory: () => set({ moveHistory: [] }),

  // AI opponent
  aiEnabled: false,
  aiColor: 'black',
  aiDifficulty: 'medium',
  aiVariety: 3,
  aiThinking: false,

  setAiEnabled: (enabled) => {
    set({ aiEnabled: enabled })
    if (enabled) {
      // Initialize engine when AI is enabled
      initEngine().catch((err) => console.error('Failed to init engine:', err))
    }
  },

  setAiColor: (color) => set({ aiColor: color }),

  setAiDifficulty: (difficulty) => set({ aiDifficulty: difficulty }),

  setAiVariety: (variety) => set({ aiVariety: Math.max(1, Math.min(5, variety)) }),

  triggerAiMove: async () => {
    const { aiEnabled, aiColor, aiDifficulty, aiVariety, game } = get()

    // Check if it's actually the AI's turn
    const currentTurn = game.turn() === 'w' ? 'white' : 'black'
    if (!aiEnabled || currentTurn !== aiColor) {
      return
    }

    // Check if game is over
    if (game.isGameOver()) {
      return
    }

    // Get the current FEN from the game state (not a captured variable)
    const currentFen = game.fen()
    console.log('AI analyzing position:', currentFen, 'for color:', aiColor, 'variety:', aiVariety)

    // Ensure engine is ready
    if (!isEngineReady()) {
      console.warn('Engine not ready, initializing...')
      try {
        await initEngine()
      } catch (error) {
        console.error('Failed to initialize engine:', error)
        return
      }
    }

    set({ aiThinking: true })

    try {
      const depth = DIFFICULTY_PRESETS[aiDifficulty]
      let bestMove: string

      // Use variety if > 1, otherwise use best move only
      if (aiVariety > 1) {
        try {
          // Reduce depth by 2 for multipv to compensate for extra calculation time
          // This keeps response time similar to single best move while still getting strong moves
          const multipvDepth = Math.max(1, depth - 2)
          console.log(`Using reduced depth ${multipvDepth} for multipv (original: ${depth})`)
          const topMoves = await getTopMoves(currentFen, multipvDepth, aiVariety)
          if (topMoves.length > 0) {
            // Randomly select from top moves
            const randomIndex = Math.floor(Math.random() * topMoves.length)
            bestMove = topMoves[randomIndex]
            console.log(
              `AI selected move ${randomIndex + 1} of ${topMoves.length} top moves:`,
              bestMove
            )
            console.log('All top moves:', topMoves)
          } else {
            // Fallback to best move if no moves found
            console.warn('No moves from multipv, falling back to best move')
            bestMove = await getBestMove(currentFen, depth)
          }
        } catch (error) {
          // Fallback to best move if multipv fails
          // Check if this was an intentional cancellation (e.g., user reset/go back)
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (errorMessage === 'Calculation stopped') {
            // Intentional cancellation - don't log as warning, just fall back silently
            console.log('Multipv calculation was cancelled, falling back to best move')
          } else {
            // Actual error - log as warning
            console.warn('Multipv failed, falling back to best move:', error)
          }
          bestMove = await getBestMove(currentFen, depth)
        }
      } else {
        bestMove = await getBestMove(currentFen, depth)
      }

      console.log('AI received move from Stockfish:', bestMove)

      // Parse the move
      const { from, to, promotion } = parseUciMove(bestMove)
      console.log('Parsed move:', { from, to, promotion })

      // Add a delay before executing the move to make it feel less rushed
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Get the current state again (in case it changed while thinking)
      const currentState = get()
      const stateFen = currentState.game.fen()
      if (!currentState.aiEnabled || stateFen !== currentFen) {
        // State changed, don't apply the move
        console.warn('Game state changed during AI thinking, aborting move')
        set({ aiThinking: false })
        return
      }

      // Make the move
      currentState.makeMove(from, to, promotion)
    } catch (error) {
      console.error('AI move failed:', error)

      // Fallback: make a random legal move so the AI always responds.
      const fallbackState = get()
      const fallbackTurn = fallbackState.game.turn() === 'w' ? 'white' : 'black'
      if (
        fallbackState.aiEnabled &&
        fallbackTurn === fallbackState.aiColor &&
        !fallbackState.game.isGameOver()
      ) {
        const legalMoves = fallbackState.game.moves({ verbose: true })
        if (legalMoves.length > 0) {
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)]
          console.warn('Using fallback random AI move:', randomMove)
          fallbackState.makeMove(randomMove.from, randomMove.to, randomMove.promotion)
        }
      }
    } finally {
      set({ aiThinking: false })
    }
  },

  // AI Coach
  coachMessages: [],
  coachLoading: false,
  coachConnected: false,
  coachPanelOpen: false,
  coachSettings: {
    endpoint: 'http://192.168.68.60:1234/v1/chat/completions',
    model: 'local-model'
  },
  coachHighlightSquares: [],

  toggleCoachPanel: () => set((state) => ({ coachPanelOpen: !state.coachPanelOpen })),

  clearCoachHistory: () => set({ coachMessages: [] }),

  setCoachHighlightSquares: (squares) => set({ coachHighlightSquares: squares }),

  deleteCoachMessage: (messageId) =>
    set((state) => ({
      coachMessages: state.coachMessages.filter((msg) => msg.id !== messageId)
    })),

  checkCoachConnection: async () => {
    try {
      const result = await window.electronAPI.checkCoachStatus()
      set({ coachConnected: result.connected })
    } catch (error) {
      console.error('Failed to check coach connection:', error)
      set({ coachConnected: false })
    }
  },

  updateCoachSettings: async (settings) => {
    try {
      const updated = await window.electronAPI.saveCoachSettings(settings)
      set({ coachSettings: updated })
      // Re-check connection with new settings
      get().checkCoachConnection()
    } catch (error) {
      console.error('Failed to update coach settings:', error)
    }
  },

  // Move analysis state
  moveAnalysisEnabled: false,
  currentMoveAnalysis: null,
  moveAnalysisHistory: [],
  toastMessage: null,

  setMoveAnalysisEnabled: (enabled) => set({ moveAnalysisEnabled: enabled }),

  clearToast: () => set({ toastMessage: null, currentMoveAnalysis: null }),

  showToast: (type, message) =>
    set({
      toastMessage: { type, message, id: `toast-${Date.now()}` }
    }),

  analyzeMoveQuality: async (fenBefore, fenAfter, move) => {
    try {
      const result = await window.electronAPI.analyzeMoveQuality(fenBefore, fenAfter, 15)
      
      const moveAnalysis: MoveAnalysis = {
        moveNumber: Math.floor(get().moveHistory.length / 2) + 1,
        moveSan: move.san,
        from: move.from,
        to: move.to,
        evalBefore: result.evalBefore,
        evalAfter: result.evalAfter,
        quality: result.quality,
        bestMove: result.bestMove,
        bestMoveSan: result.bestMoveSan,
        evalDelta: result.evalDelta
      }
      
      // Helper function to format evaluation for display
      const formatEvaluation = (evaluation: { type: 'cp' | 'mate'; value: number }): string => {
        if (evaluation.type === 'mate') {
          if (evaluation.value > 0) {
            return `Mate in ${evaluation.value}`
          } else {
            return `Mated in ${Math.abs(evaluation.value)}`
          }
        } else {
          // Convert centipawns to pawns
          const pawns = evaluation.value / 100
          const sign = pawns >= 0 ? '+' : ''
          return `${sign}${pawns.toFixed(1)}`
        }
      }
      
      // Determine player color for perspective
      const state = get()
      let playerColor: 'white' | 'black' = 'white'
      if (state.aiEnabled) {
        playerColor = state.aiColor === 'white' ? 'black' : 'white'
      } else if (state.currentOpening) {
        playerColor = state.currentOpening.color
      }
      
      // Convert evaluation to player's perspective
      // evalAfter is from the opponent's perspective (since it's now their turn)
      // Flip it to show from the player's perspective
      let displayEval = result.evalAfter
      if (displayEval.type === 'cp') {
        displayEval = { type: 'cp', value: -displayEval.value }
      } else {
        displayEval = { type: 'mate', value: -displayEval.value }
      }
      
      // Always show toast with engine rating
      let toastMessage: ToastMessage
      
      if (result.quality !== 'good') {
        // For suboptimal moves, show quality warning with rating
        const qualityLabels: Record<'blunder' | 'mistake' | 'inaccuracy', string> = {
          blunder: 'Blunder',
          mistake: 'Mistake',
          inaccuracy: 'Inaccuracy'
        }
        
        const quality = result.quality as 'blunder' | 'mistake' | 'inaccuracy'
        const evalStr = formatEvaluation(displayEval)
        
        toastMessage = {
          type: quality,
          message: `${qualityLabels[quality]}: ${move.san} (${evalStr}) - Best: ${result.bestMoveSan}`,
          id: `toast-${Date.now()}`
        }
      } else {
        // For good moves, show just the rating
        const evalStr = formatEvaluation(displayEval)
        toastMessage = {
          type: 'info',
          message: `${move.san}: ${evalStr}`,
          id: `toast-${Date.now()}`
        }
      }
      
      set({
        currentMoveAnalysis: moveAnalysis,
        moveAnalysisHistory: [...get().moveAnalysisHistory, moveAnalysis],
        toastMessage
      })
      
      // Only trigger LLM/coach for the human player's suboptimal moves (not AI's)
      const moveMadeBy = fenBefore.split(' ')[1] === 'w' ? 'white' : 'black'
      const isHumanMove = moveMadeBy === playerColor
      if (
        isHumanMove &&
        (result.quality === 'blunder' || result.quality === 'mistake' || result.quality === 'inaccuracy')
      ) {
        if (result.quality === 'blunder' && !state.coachPanelOpen) {
          set({ coachPanelOpen: true })
        }
        if (state.coachConnected) {
          window.electronAPI.explainBlunder({
            fen: fenBefore,
            playedMove: move.san,
            bestMove: result.bestMoveSan,
            evalDelta: result.evalDelta,
            quality: result.quality,
            playerColor
          }).then((response: { success: boolean; content?: string; error?: string }) => {
            if (response.success && response.content) {
              const assistantMessage: CoachMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.content,
                timestamp: Date.now(),
                analysisType: 'mistakes'
              }
              set((state) => ({
                coachMessages: [...state.coachMessages, assistantMessage]
              }))
            }
          }).catch((error: unknown) => {
            console.error('Failed to get move explanation:', error)
          })
        }
      }
    } catch (error) {
      console.error('Move analysis failed:', error)
    }
  },

  askCoach: async (analysisType, customQuestion) => {
    const { fen, moveHistory, currentOpening, aiColor, aiEnabled, coachMessages } = get()

    // Determine player color
    // If AI is enabled, player is opposite of AI
    // If AI is not enabled, use opening color if available, otherwise default to white
    let playerColor: 'white' | 'black' | undefined
    if (aiEnabled) {
      playerColor = aiColor === 'white' ? 'black' : 'white'
    } else if (currentOpening) {
      playerColor = currentOpening.color
    } else {
      // Default to white when no other indication is available
      playerColor = 'white'
    }

    // Create user message immediately
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content:
        analysisType === 'custom' && customQuestion
          ? customQuestion
          : getAnalysisTypeLabel(analysisType),
      timestamp: Date.now(),
      analysisType
    }

    set({
      coachMessages: [...coachMessages, userMessage],
      coachLoading: true
    })

    // For position and moves analysis, get Stockfish analysis first
    let stockfishAnalysis = null
    if (analysisType === 'position' || analysisType === 'moves') {
      try {
        stockfishAnalysis = await window.electronAPI.analyzePosition(fen, 15)
      } catch (error) {
        console.error('Stockfish analysis failed:', error)
        const errorMessage: CoachMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I couldn't analyze the position with Stockfish. ${error instanceof Error ? error.message : 'Please ensure Stockfish is available and try again.'}`,
          timestamp: Date.now()
        }
        set((state) => ({
          coachMessages: [...state.coachMessages, errorMessage],
          coachLoading: false
        }))
        return // Stop here if Stockfish fails
      }
    }

    // Build the prompt with context
    const prompt = await window.electronAPI.buildCoachPrompt(analysisType, {
      fen,
      moveHistory,
      playerColor,
      openingName: currentOpening?.name,
      customQuestion,
      stockfishAnalysis: stockfishAnalysis || undefined
    })

    try {
      // Send to LLM
      const result = await window.electronAPI.coachChat([{ role: 'user', content: prompt }])

      if (result.success && result.content) {
        const assistantMessage: CoachMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.content,
          timestamp: Date.now()
        }
        set((state) => ({
          coachMessages: [...state.coachMessages, assistantMessage],
          coachLoading: false
        }))
      } else {
        // Add error message
        const errorMessage: CoachMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I couldn't process that request. ${result.error || 'Please try again.'}`,
          timestamp: Date.now()
        }
        set((state) => ({
          coachMessages: [...state.coachMessages, errorMessage],
          coachLoading: false
        }))
      }
    } catch (error) {
      console.error('Coach request failed:', error)
      const errorMessage: CoachMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content:
          'Sorry, I encountered an error. Please make sure LM Studio is running and try again.',
        timestamp: Date.now()
      }
      set((state) => ({
        coachMessages: [...state.coachMessages, errorMessage],
        coachLoading: false
      }))
    }
  }
}))

// Helper function to get readable labels for analysis types
function getAnalysisTypeLabel(type: string): string {
  switch (type) {
    case 'position':
      return 'Analyze this position'
    case 'moves':
      return 'What move should I play?'
    case 'mistakes':
      return 'Did I make any mistakes?'
    case 'plan':
      return "What's the plan here?"
    default:
      return 'Help me understand this position'
  }
}
