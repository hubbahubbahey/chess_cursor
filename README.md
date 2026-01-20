# Chess Opening Trainer

An interactive desktop application for mastering chess openings through spaced repetition, guided lessons, quizzes, an AI opponent, and an optional LLM coach.

## Features

### 📚 Explore Mode
- Interactive chessboard with drag-and-drop piece movement
- Visual opening tree showing all variations
- Structured coaching notes for each move (concepts, insights, common mistakes)
- Navigate through positions by clicking moves or playing on the board
- **AI Opponent** – Play through the opening against Stockfish (easy/medium/hard/expert) with move list and engine analysis
- **LLM Coach** (optional) – Chat with a local model via [LM Studio](https://lmstudio.ai/) for position analysis, move suggestions, mistake review, and strategic plans

### 🎓 Training Mode (Spaced Repetition)
- SM-2 algorithm for optimal review scheduling
- Track individual positions with ease factor and intervals
- Difficulty rating after each attempt (Again/Hard/Good/Easy)
- Session statistics and streak tracking

### ❓ Quiz Mode
- Random position testing from your opening
- Multiple attempts with hints
- Score tracking and accuracy statistics
- Skip option for difficult positions

### 📊 Statistics
- Mastery breakdown (New/Learning/Reviewing/Mastered)
- Per-position accuracy tracking
- Visual progress indicators
- Historical data on training sessions

### 🎯 Built-in Openings
- **King's Pawn** (1.e4) – Direct central control
- **Queen's Pawn** (1.d4) – Flexible, solid development
- **London System** (1.d4 2.Bf4) – Simple, reliable setup

## Tech Stack

- **Electron** – Desktop application framework
- **React + TypeScript** – UI framework
- **Vite** – Build tool and dev server
- **react-chessboard** – Chess board visualization
- **chess.js** – Chess move validation and logic
- **stockfish.js** (WASM) – AI opponent and engine analysis
- **Zustand** – State management
- **Tailwind CSS** – Styling
- **react-markdown** – Rendered coach and LLM content
- **lucide-react** – Icons

Data is stored as JSON in the Electron user data directory.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run in development mode (Vite dev server; Electron loads from localhost)
npm run electron:dev

# Build for production (output in release/)
npm run electron:build

# Preview production renderer build (no Electron)
npm run preview
```

For the **LLM Coach**, install [LM Studio](https://lmstudio.ai/), load a model, and start the local server. The app uses the OpenAI-compatible API at `http://localhost:1234` by default (configurable in the coach panel).

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← | Go back one move |
| F | Flip board |
| R | Reset to starting position |

## Project Structure

```
cursor_chess/
├── electron/           # Electron main process
│   ├── main.ts        # App entry point and IPC
│   ├── preload.ts     # IPC bridge
│   ├── database.ts    # JSON data store and seed
│   └── llmService.ts  # LM Studio / LLM coach API
├── src/
│   ├── components/    # React components
│   ├── stores/        # Zustand state
│   ├── lib/           # chess, engine, srs, coachContext
│   ├── App.tsx
│   └── main.tsx
├── dist/              # Renderer build output
├── dist-electron/     # Main process build output
├── release/           # Packaged app (electron-builder)
└── package.json
```

## How It Works

### Spaced Repetition (SM-2 Algorithm)

The training system uses the SuperMemo 2 algorithm to schedule reviews:

1. **New positions** start with an ease factor of 2.5
2. **Successful reviews** increase the interval exponentially
3. **Failed reviews** reset the position to be learned again
4. **Ease factor** adjusts based on difficulty ratings

### Position Tracking

Each position in the opening is tracked independently:
- FEN (board position)
- Parent position (for tree structure)
- Move in SAN notation
- Structured explanation (coach, insight, concept, warning)
- Review statistics

## License

MIT
