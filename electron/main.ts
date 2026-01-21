import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import {
  initDatabase,
  getOpenings,
  getPositions,
  getPosition,
  getPositionByFen,
  getChildPositions,
  getReview,
  getDueReviews,
  updateReview,
  getStats,
  getAllStats,
  updateStats
} from './database'
import {
  sendChatCompletion,
  checkConnection,
  getSettings,
  saveSettings,
  buildCoachPrompt,
  ChatMessage,
  CoachSettings
} from './llmService'
import { getEngineAnalysis } from './stockfishService'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0d0b',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // In development, Vite runs on localhost:5173
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for database operations
ipcMain.handle('db:getPositions', async (_, openingId?: number) => {
  return getPositions(openingId)
})

ipcMain.handle('db:getPosition', async (_, id: number) => {
  return getPosition(id) || null
})

ipcMain.handle('db:getPositionByFen', async (_, fen: string) => {
  return getPositionByFen(fen) || null
})

ipcMain.handle('db:getChildPositions', async (_, parentId: number) => {
  return getChildPositions(parentId)
})

ipcMain.handle('db:getOpenings', async () => {
  return getOpenings()
})

ipcMain.handle('db:getReview', async (_, positionId: number) => {
  return getReview(positionId) || null
})

ipcMain.handle('db:getDueReviews', async (_, openingId?: number) => {
  return getDueReviews(openingId)
})

ipcMain.handle(
  'db:updateReview',
  async (
    _,
    positionId: number,
    easeFactor: number,
    interval: number,
    repetitions: number,
    nextReview: string
  ) => {
    updateReview(positionId, easeFactor, interval, repetitions, nextReview)
    return true
  }
)

ipcMain.handle('db:getStats', async (_, positionId: number) => {
  return getStats(positionId) || null
})

ipcMain.handle('db:updateStats', async (_, positionId: number, correct: boolean) => {
  updateStats(positionId, correct)
  return true
})

ipcMain.handle('db:getAllStats', async () => {
  return getAllStats()
})

// IPC handlers for AI Coach (LLM)
ipcMain.handle('llm:chat', async (_, messages: ChatMessage[]) => {
  return sendChatCompletion(messages)
})

ipcMain.handle('llm:checkStatus', async () => {
  return checkConnection()
})

ipcMain.handle('llm:getSettings', async () => {
  return getSettings()
})

ipcMain.handle('llm:saveSettings', async (_, settings: Partial<CoachSettings>) => {
  return saveSettings(settings)
})

ipcMain.handle(
  'llm:buildPrompt',
  async (
    _,
    analysisType: string,
    context: {
      fen: string
      moveHistory: string[]
      playerColor?: 'white' | 'black'
      openingName?: string
      customQuestion?: string
      stockfishAnalysis?: {
        evalText: string
        bestMove: string
        bestMoveSan: string
      }
    }
  ) => {
    return buildCoachPrompt(
      analysisType as 'position' | 'moves' | 'mistakes' | 'plan' | 'custom',
      context
    )
  }
)

// IPC handler for Stockfish analysis
ipcMain.handle('stockfish:analyze', async (_, fen: string, depth?: number) => {
  try {
    return await getEngineAnalysis(fen, depth || 15)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Stockfish analysis failed')
  }
})
