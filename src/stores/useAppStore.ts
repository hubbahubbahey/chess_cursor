import { create } from 'zustand'
import { Chess } from 'chess.js'
import { initEngine, getBestMove, getTopMoves, parseUciMove, stopCalculation, isEngineReady, DifficultyLevel, DIFFICULTY_PRESETS } from '../lib/engine'

export type ViewType = 'explore' | 'train' | 'quiz' | 'stats'

export interface Opening {
  id: number
  name: string
  color: 'white' | 'black'
  description: string
}

export interface PositionExplanation {
  coach: string        // Main coaching point in conversational tone
  insight?: string     // General chess wisdom/principle
  concept?: string     // Strategic or tactical concept name
  warning?: string     // Common mistake to avoid
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

export interface CoachSettings {
  endpoint: string
  model: string
}

interface AppState {
  // Navigation
  currentView: ViewType
  setCurrentView: (view: ViewType) => void

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
  toggleCoachPanel: () => void
  clearCoachHistory: () => void
  checkCoachConnection: () => Promise<void>
  updateCoachSettings: (settings: Partial<CoachSettings>) => Promise<void>
  askCoach: (analysisType: 'position' | 'moves' | 'mistakes' | 'plan' | 'custom', customQuestion?: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentView: 'explore',
  setCurrentView: (view) => set({ currentView: view }),

  // Chess game state
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  
  setFen: (fen) => {
    const game = new Chess(fen)
    set({ fen, game })
  },

  makeMove: (from, to, promotion) => {
    const { game } = get()
    try {
      const move = game.move({ from, to, promotion: promotion || 'q' })
      if (move) {
        set({ fen: game.fen(), game })
        get().addToHistory(move.san)
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

  loadOpenings: async () => {
    try {
      const openings = await window.electronAPI.getOpenings()
      set({ openings })
    } catch (error) {
      console.error('Failed to load openings:', error)
    }
  },

  selectOpening: async (opening) => {
    try {
      const positions = await window.electronAPI.getPositions(opening.id)
      const rootPosition = positions.find(p => p.parent_id === null) || null
      
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
      set(state => ({
        quizScore: state.quizScore + 1,
        quizStreak: state.quizStreak + 1
      }))
    } else {
      set(state => ({
        quizScore: state.quizScore,
        quizStreak: 0
      }))
    }
  },

  resetQuiz: () => set({ quizScore: 0, quizStreak: 0 }),

  // Board orientation
  boardOrientation: 'white',
  flipBoard: () => set(state => ({ 
    boardOrientation: state.boardOrientation === 'white' ? 'black' : 'white' 
  })),

  // Move history
  moveHistory: [],
  
  addToHistory: (move) => set(state => ({
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
      const parentPosition = positions.find(p => p.id === currentPosition.parent_id)
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
      initEngine().catch(err => console.error('Failed to init engine:', err))
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
            console.log(`AI selected move ${randomIndex + 1} of ${topMoves.length} top moves:`, bestMove)
            console.log('All top moves:', topMoves)
          } else {
            // Fallback to best move if no moves found
            console.warn('No moves from multipv, falling back to best move')
            bestMove = await getBestMove(currentFen, depth)
          }
        } catch (error) {
          // Fallback to best move if multipv fails
          console.warn('Multipv failed, falling back to best move:', error)
          bestMove = await getBestMove(currentFen, depth)
        }
      } else {
        bestMove = await getBestMove(currentFen, depth)
      }
      
      console.log('AI received move from Stockfish:', bestMove)
      
      // Parse and execute the move
      const { from, to, promotion } = parseUciMove(bestMove)
      console.log('Parsed move:', { from, to, promotion })
      
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
    endpoint: 'http://192.168.1.155:1234/v1/chat/completions',
    model: 'local-model'
  },

  toggleCoachPanel: () => set(state => ({ coachPanelOpen: !state.coachPanelOpen })),

  clearCoachHistory: () => set({ coachMessages: [] }),

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

  askCoach: async (analysisType, customQuestion) => {
    const { fen, moveHistory, currentOpening, aiColor, aiEnabled, coachMessages } = get()

    // Determine player color
    const playerColor = aiEnabled ? (aiColor === 'white' ? 'black' : 'white') : undefined

    // Create user message immediately
    const userMessage: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: analysisType === 'custom' && customQuestion 
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
        set(state => ({ 
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
      const result = await window.electronAPI.coachChat([
        { role: 'user', content: prompt }
      ])

      if (result.success && result.content) {
        const assistantMessage: CoachMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.content,
          timestamp: Date.now()
        }
        set(state => ({ 
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
        set(state => ({ 
          coachMessages: [...state.coachMessages, errorMessage],
          coachLoading: false 
        }))
      }
    } catch (error) {
      console.error('Coach request failed:', error)
      const errorMessage: CoachMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure LM Studio is running and try again.',
        timestamp: Date.now()
      }
      set(state => ({ 
        coachMessages: [...state.coachMessages, errorMessage],
        coachLoading: false 
      }))
    }
  }
}))

// Helper function to get readable labels for analysis types
function getAnalysisTypeLabel(type: string): string {
  switch (type) {
    case 'position': return 'Analyze this position'
    case 'moves': return 'What move should I play?'
    case 'mistakes': return 'Did I make any mistakes?'
    case 'plan': return 'What\'s the plan here?'
    default: return 'Help me understand this position'
  }
}
