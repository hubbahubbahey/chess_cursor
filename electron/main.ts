import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
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
  updateStats,
  getExportData,
  importDatabase
} from './database'
import {
  sendChatCompletion,
  checkConnection,
  getSettings,
  saveSettings,
  buildCoachPrompt,
  buildBlunderExplanationPrompt,
  ChatMessage,
  CoachSettings
} from './llmService'
import { getEngineAnalysis, analyzeMoveQuality } from './stockfishService'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // titleBarStyle: 'hiddenInset' is macOS-only; use default title bar on Windows/Linux
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0f0d0b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  }
  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset'
  }
  mainWindow = new BrowserWindow(windowOptions)

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

ipcMain.handle('db:getExportData', async () => {
  return getExportData()
})

ipcMain.handle('db:exportToFile', async () => {
  const win = mainWindow ?? BrowserWindow.getFocusedWindow()
const { filePath, canceled } = await dialog.showSaveDialog(win ?? undefined, {
    title: 'Export backup',
    defaultPath: path.join(app.getPath('documents'), 'chess-trainer-backup.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePath) return { canceled: true }
  fs.writeFileSync(filePath, getExportData(), 'utf-8')
  return { canceled: false, path: filePath }
})

ipcMain.handle('db:importFromFile', async () => {
  const win = mainWindow ?? BrowserWindow.getFocusedWindow()
const { filePaths, canceled } = await dialog.showOpenDialog(win ?? undefined, {
    title: 'Import backup',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (canceled || !filePaths?.length) return { canceled: true }
  try {
    const content = fs.readFileSync(filePaths[0], 'utf-8')
    const result = importDatabase(content)
    return { canceled: false, ...result }
  } catch (err) {
    return {
      canceled: false,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read file'
    }
  }
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

// IPC handler for move quality analysis
ipcMain.handle('stockfish:analyzeMoveQuality', async (_, fenBefore: string, fenAfter: string, depth?: number) => {
  try {
    return await analyzeMoveQuality(fenBefore, fenAfter, depth || 15)
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Move quality analysis failed')
  }
})

// IPC handler for blunder/mistake/inaccuracy explanation
ipcMain.handle(
  'llm:explainBlunder',
  async (
    _,
    context: {
      fen: string
      playedMove: string
      bestMove: string
      evalDelta: number
      quality: 'blunder' | 'mistake' | 'inaccuracy'
      playerColor: 'white' | 'black'
    }
  ) => {
    try {
      const prompt = buildBlunderExplanationPrompt(context)
      return await sendChatCompletion([{ role: 'user', content: prompt }])
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to explain move'
      }
    }
  }
)
