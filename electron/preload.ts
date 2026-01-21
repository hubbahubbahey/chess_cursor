import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Positions
  getPositions: (openingId?: number) => ipcRenderer.invoke('db:getPositions', openingId),
  getPosition: (id: number) => ipcRenderer.invoke('db:getPosition', id),
  getPositionByFen: (fen: string) => ipcRenderer.invoke('db:getPositionByFen', fen),
  getChildPositions: (parentId: number) => ipcRenderer.invoke('db:getChildPositions', parentId),

  // Openings
  getOpenings: () => ipcRenderer.invoke('db:getOpenings'),

  // Reviews (Spaced Repetition)
  getReview: (positionId: number) => ipcRenderer.invoke('db:getReview', positionId),
  getDueReviews: (openingId?: number) => ipcRenderer.invoke('db:getDueReviews', openingId),
  updateReview: (
    positionId: number,
    easeFactor: number,
    interval: number,
    repetitions: number,
    nextReview: string
  ) =>
    ipcRenderer.invoke(
      'db:updateReview',
      positionId,
      easeFactor,
      interval,
      repetitions,
      nextReview
    ),

  // Stats
  getStats: (positionId: number) => ipcRenderer.invoke('db:getStats', positionId),
  updateStats: (positionId: number, correct: boolean) =>
    ipcRenderer.invoke('db:updateStats', positionId, correct),
  getAllStats: () => ipcRenderer.invoke('db:getAllStats'),

  // AI Coach (LLM)
  coachChat: (messages: CoachChatMessage[]) => ipcRenderer.invoke('llm:chat', messages),
  checkCoachStatus: () => ipcRenderer.invoke('llm:checkStatus'),
  getCoachSettings: () => ipcRenderer.invoke('llm:getSettings'),
  saveCoachSettings: (settings: Partial<CoachSettings>) =>
    ipcRenderer.invoke('llm:saveSettings', settings),
  buildCoachPrompt: (analysisType: string, context: CoachContext) =>
    ipcRenderer.invoke('llm:buildPrompt', analysisType, context),

  // Stockfish Analysis
  analyzePosition: (fen: string, depth?: number) =>
    ipcRenderer.invoke('stockfish:analyze', fen, depth)
})

// Coach-related types
export interface CoachChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CoachSettings {
  endpoint: string
  model: string
}

export interface CoachContext {
  fen: string
  moveHistory: string[]
  playerColor?: 'white' | 'black'
  openingName?: string
  customQuestion?: string
  stockfishAnalysis?: StockfishAnalysis
}

export interface CoachChatResponse {
  success: boolean
  content?: string
  error?: string
}

export interface CoachStatusResponse {
  connected: boolean
  error?: string
}

// Type declarations for the exposed API
export interface ElectronAPI {
  getPositions: (openingId?: number) => Promise<Position[]>
  getPosition: (id: number) => Promise<Position | undefined>
  getPositionByFen: (fen: string) => Promise<Position | undefined>
  getChildPositions: (parentId: number) => Promise<Position[]>
  getOpenings: () => Promise<Opening[]>
  getReview: (positionId: number) => Promise<Review | undefined>
  getDueReviews: (openingId?: number) => Promise<ReviewWithPosition[]>
  updateReview: (
    positionId: number,
    easeFactor: number,
    interval: number,
    repetitions: number,
    nextReview: string
  ) => Promise<boolean>
  getStats: (positionId: number) => Promise<Stats | undefined>
  updateStats: (positionId: number, correct: boolean) => Promise<boolean>
  getAllStats: () => Promise<Stats[]>
  // AI Coach
  coachChat: (messages: CoachChatMessage[]) => Promise<CoachChatResponse>
  checkCoachStatus: () => Promise<CoachStatusResponse>
  getCoachSettings: () => Promise<CoachSettings>
  saveCoachSettings: (settings: Partial<CoachSettings>) => Promise<CoachSettings>
  buildCoachPrompt: (analysisType: string, context: CoachContext) => Promise<string>
  // Stockfish Analysis
  analyzePosition: (fen: string, depth?: number) => Promise<StockfishAnalysis>
}

export interface Position {
  id: number
  fen: string
  opening_id: number
  parent_id: number | null
  move_san: string | null
  explanation: string | null
}

export interface Opening {
  id: number
  name: string
  color: 'white' | 'black'
  description: string
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
  explanation: string | null
}

export interface Stats {
  id: number
  position_id: number
  attempts: number
  correct: number
  last_attempt: string | null
}

export interface StockfishAnalysis {
  evalText: string
  bestMove: string
  bestMoveSan: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
