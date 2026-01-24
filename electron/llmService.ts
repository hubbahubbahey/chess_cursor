/**
 * LLM Service for communicating with LM Studio's OpenAI-compatible API
 */

import { Chess } from 'chess.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CoachSettings {
  endpoint: string
  model: string
}

interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Default settings
const DEFAULT_SETTINGS: CoachSettings = {
  endpoint: 'http://192.168.1.155:1234/v1/chat/completions',
  model: 'local-model'
}

let currentSettings: CoachSettings = { ...DEFAULT_SETTINGS }

// Chess coach system prompt
const SYSTEM_PROMPT = `You are an expert chess coach with a friendly, encouraging teaching style. Your role is to help players improve their chess understanding.

CRITICAL: Always focus your advice ONLY on the side the player is playing. If the player is playing White, only give advice for White moves, plans, and positions. If the player is playing Black, only give advice for Black moves, plans, and positions. Do NOT provide advice for the opponent's side unless specifically asked about what the opponent might do in response.

When analyzing positions:
- Use standard algebraic notation (e.g., e4, Nf3, O-O)
- Be specific about piece placements and pawn structures
- Explain the "why" behind moves and plans
- Point out tactical and strategic themes
- Focus ONLY on the player's side (White or Black as specified)

When suggesting moves:
- Provide your top 1-2 recommendations with clear explanations
- Only suggest moves for the player's side
- Consider the player's skill level (assume intermediate)
- You may mention what the opponent might try in response, but keep the focus on the player's moves

When reviewing for mistakes:
- Be constructive and educational, not critical
- Explain what went wrong and why
- Suggest what the player should look for next time
- Only analyze mistakes made by the player's side

Keep responses concise but educational. Use bullet points for clarity when appropriate.`

/**
 * Get current coach settings
 */
export function getSettings(): CoachSettings {
  return { ...currentSettings }
}

/**
 * Update coach settings
 */
export function saveSettings(settings: Partial<CoachSettings>): CoachSettings {
  currentSettings = { ...currentSettings, ...settings }
  return { ...currentSettings }
}

/**
 * Check if LM Studio is running and accessible
 */
export async function checkConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    // Try a simple request to check if the server is up
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(currentSettings.endpoint.replace('/chat/completions', '/models'), {
      method: 'GET',
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { connected: true }
    } else {
      return { connected: false, error: `Server returned status ${response.status}` }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { connected: false, error: 'Connection timed out' }
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return {
          connected: false,
          error: 'LM Studio is not running. Please start LM Studio and load a model.'
        }
      }
      return { connected: false, error: error.message }
    }
    return { connected: false, error: 'Unknown error occurred' }
  }
}

/**
 * Send a chat completion request to LM Studio
 */
export async function sendChatCompletion(
  messages: ChatMessage[],
  options?: {
    temperature?: number
    maxTokens?: number
  }
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // Add system prompt as the first message if not already present
    const messagesWithSystem: ChatMessage[] =
      messages[0]?.role === 'system'
        ? messages
        : [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for responses

    const response = await fetch(currentSettings.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: currentSettings.model,
        messages: messagesWithSystem,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
        stream: false
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `LM Studio error (${response.status}): ${errorText}`
      }
    }

    const data: ChatCompletionResponse = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      return { success: false, error: 'No response content received' }
    }

    return { success: true, content }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out. The model may be processing a complex request.'
        }
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        return {
          success: false,
          error: 'Cannot connect to LM Studio. Please ensure it is running and a model is loaded.'
        }
      }
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Unknown error occurred' }
  }
}

/**
 * Build a coaching prompt with chess context
 */
export function buildCoachPrompt(
  analysisType: 'position' | 'moves' | 'mistakes' | 'plan' | 'custom',
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
): string {
  const { fen, moveHistory, playerColor, openingName, customQuestion, stockfishAnalysis } = context

  // Build move history string in PGN-like format
  const movesStr =
    moveHistory.length > 0
      ? moveHistory
        .reduce((acc, move, i) => {
          if (i % 2 === 0) {
            return acc + `${Math.floor(i / 2) + 1}. ${move} `
          }
          return acc + `${move} `
        }, '')
        .trim()
      : 'No moves played yet'

  const positionContext = `
Current position (FEN): ${fen}
Moves played: ${movesStr}
${playerColor ? `Player is playing as: ${playerColor}` : ''}
${openingName ? `Opening: ${openingName}` : ''}
`.trim()

  // Generate board visualization if Stockfish analysis is provided
  let boardVisualization = ''
  if (stockfishAnalysis) {
    try {
      const game = new Chess(fen)
      boardVisualization = game.ascii()
    } catch {
      // If board generation fails, continue without it
    }
  }

  // Build Stockfish data section if available
  const stockfishData = stockfishAnalysis
    ? `
Data:
- Position (FEN): ${fen}
- Engine Eval: ${stockfishAnalysis.evalText} (Positive=White adv, Negative=Black adv)
- Best Engine Move: ${stockfishAnalysis.bestMoveSan}
${boardVisualization ? `\nBoard Visual:\n${boardVisualization}` : ''}
`.trim()
    : ''

  // Add explicit instruction about player's side
  const playerSideInstruction = playerColor
    ? `\n\nIMPORTANT: The player is playing as ${playerColor}. Only provide advice, moves, and analysis for ${playerColor}. Do NOT give advice for ${playerColor === 'white' ? 'Black' : 'White'}. Focus exclusively on what ${playerColor} should do.`
    : ''

  switch (analysisType) {
    case 'position':
      return `${stockfishData ? stockfishData + '\n\n' : ''}${positionContext}${playerSideInstruction}

Please analyze this position from the player's perspective.${playerColor ? ` Focus on ${playerColor}'s position, pieces, and opportunities.` : ''} What are the key features of this position (pawn structure, piece activity, king safety, etc.)?${stockfishAnalysis ? ` The engine evaluation suggests ${stockfishAnalysis.evalText}. Explain the strategic reason for this evaluation in 2-3 sentences from the player's perspective. Focus on concepts like outpost, development, or pawn structure.` : ''}`

    case 'moves':
      return `${stockfishData ? stockfishData + '\n\n' : ''}${positionContext}${playerSideInstruction}

What is the best move for the player in this position?${playerColor ? ` Suggest moves only for ${playerColor}.` : ''} Please explain your recommendation and what the main ideas are behind it.${stockfishAnalysis ? ` The engine suggests ${stockfishAnalysis.bestMoveSan} with an evaluation of ${stockfishAnalysis.evalText}. Explain the strategic reason for this move in 2-3 sentences.` : ''}`

    case 'mistakes':
      return `${positionContext}${playerSideInstruction}

Please review the moves played so far.${playerColor ? ` Focus only on mistakes made by ${playerColor}.` : ''} Were there any mistakes or inaccuracies? What could have been played better and why?`

    case 'plan':
      return `${positionContext}${playerSideInstruction}

What should be the strategic plan for the player in this position?${playerColor ? ` Focus exclusively on ${playerColor}'s plans and ideas.` : ''} What are the key ideas${playerColor ? ` for ${playerColor}` : ''}?`

    case 'custom':
      return `${positionContext}${playerSideInstruction}

${customQuestion || 'What do you think about this position?'}`

    default:
      return positionContext + playerSideInstruction
  }
}

/**
 * Build a prompt for explaining blunders, mistakes, and inaccuracies
 */
export function buildBlunderExplanationPrompt(context: {
  fen: string
  playedMove: string
  bestMove: string
  evalDelta: number
  quality: 'blunder' | 'mistake' | 'inaccuracy'
  playerColor: 'white' | 'black'
}): string {
  const { fen, playedMove, bestMove, evalDelta, quality, playerColor } = context
  
  // Calculate eval loss (positive number)
  const evalLoss = Math.abs(evalDelta)
  const evalLossPawns = (evalLoss / 100).toFixed(1)
  
  const qualityLabel = quality.charAt(0).toUpperCase() + quality.slice(1)
  
  return `You are a chess coach. The player (playing as ${playerColor}) just played ${playedMove} which is a ${quality}.

Position (FEN): ${fen}
The best move was ${bestMove}.
Evaluation dropped by ${evalLossPawns} pawns (${evalLoss} centipawns).

In 2-3 concise sentences, explain:
1. Why ${playedMove} was a ${quality} (what does it lose or allow?)
2. What ${bestMove} achieves instead (what's the key tactical or strategic point?)

Be encouraging but educational. Focus on the key tactical or strategic point the player missed.`
}
