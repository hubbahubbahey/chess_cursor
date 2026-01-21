# Chess Opening Trainer — Task-Level Jira Board

Project key: COT
Sprint length: 2 weeks
Ticket format: COT-###

## Board Overview

### Epic COT-1 — Core Application Foundation

Owner: Engineering
Goal: Build the foundational chess application with board, openings, and basic navigation.

| Ticket  | Type  | Summary                                        | Priority | Estimate | Status  | Acceptance Criteria                                   |
| ------- | ----- | ---------------------------------------------- | -------- | -------- | ------- | ----------------------------------------------------- |
| COT-101 | Story | Implement chess board with drag-and-drop       | P0       | 5        | ✅ Done | Board renders correctly, pieces move, moves validated |
| COT-102 | Story | Create opening selection and navigation        | P0       | 3        | ✅ Done | Users can select openings, navigate positions         |
| COT-103 | Story | Implement sidebar navigation                   | P0       | 2        | ✅ Done | Sidebar with Explore/Train/Quiz/Stats views           |
| COT-104 | Task  | Set up Electron + React + TypeScript structure | P0       | 3        | ✅ Done | App builds and runs on desktop                        |

### Epic COT-2 — AI Opponent & Engine Integration

Owner: Engineering
Goal: Add Stockfish integration for AI opponent with difficulty levels and move variety.

| Ticket  | Type  | Summary                                  | Priority | Estimate | Status  | Acceptance Criteria                              |
| ------- | ----- | ---------------------------------------- | -------- | -------- | ------- | ------------------------------------------------ |
| COT-201 | Story | Integrate Stockfish engine (WASM)        | P0       | 4        | ✅ Done | Engine initializes, calculates moves             |
| COT-202 | Story | Add AI opponent with difficulty levels   | P0       | 3        | ✅ Done | Easy/Medium/Hard/Expert presets work             |
| COT-203 | Story | Implement move variety feature (multipv) | P0       | 5        | ✅ Done | AI selects from top N moves randomly             |
| COT-204 | Bug   | Fix multipv timeout error                | P0       | 2        | ✅ Done | Timeout handler saves reject reference correctly |
| COT-205 | Task  | Optimize multipv performance             | P1       | 2        | ✅ Done | Depth reduced by 2 for multipv calculations      |

### Epic COT-3 — AI Coach Integration

Owner: Engineering
Goal: Integrate LLM coach via LM Studio for position analysis and guidance.

| Ticket  | Type  | Summary                                 | Priority | Estimate | Status  | Acceptance Criteria                                  |
| ------- | ----- | --------------------------------------- | -------- | -------- | ------- | ---------------------------------------------------- |
| COT-301 | Story | Integrate LM Studio API connection      | P0       | 3        | ✅ Done | Coach connects to LM Studio endpoint                 |
| COT-302 | Story | Add Stockfish analysis to coach prompts | P0       | 4        | ✅ Done | Position analysis includes engine eval and best move |
| COT-303 | Story | Implement coach chat interface          | P0       | 3        | ✅ Done | Chat panel with message history                      |
| COT-304 | Story | Add quick analysis buttons              | P0       | 2        | ✅ Done | Position/Moves/Mistakes/Plan buttons work            |

### Epic COT-4 — Training & Quiz Modes

Owner: Engineering
Goal: Implement spaced repetition training and quiz functionality.

| Ticket  | Type  | Summary                                    | Priority | Estimate | Status  | Acceptance Criteria                                |
| ------- | ----- | ------------------------------------------ | -------- | -------- | ------- | -------------------------------------------------- |
| COT-401 | Story | Implement SM-2 spaced repetition algorithm | P0       | 5        | ✅ Done | Positions scheduled with ease factor and intervals |
| COT-402 | Story | Build training mode UI                     | P0       | 4        | ✅ Done | Training session with difficulty rating            |
| COT-403 | Story | Implement quiz mode                        | P0       | 4        | ✅ Done | Random positions, scoring, hints                   |
| COT-404 | Story | Add statistics panel                       | P0       | 3        | ✅ Done | Mastery breakdown and accuracy tracking            |

### Epic COT-5 — UI/UX Improvements

Owner: Product + Engineering
Goal: Improve usability, visual hierarchy, and eliminate clutter.

| Ticket  | Type  | Summary                                     | Priority | Estimate | Status  | Acceptance Criteria                            |
| ------- | ----- | ------------------------------------------- | -------- | -------- | ------- | ---------------------------------------------- |
| COT-501 | Story | Fix chess board overlap issue               | P0       | 3        | ✅ Done | Board fully visible, no panel overlap          |
| COT-502 | Story | Create accordion component system           | P0       | 2        | ✅ Done | Reusable accordion with animations             |
| COT-503 | Story | Improve layout spacing and responsiveness   | P0       | 3        | ✅ Done | Better spacing, max-heights, responsive design |
| COT-504 | Bug   | Remove redundant connection status messages | P1       | 1        | ✅ Done | Single source of truth for connection status   |
| COT-505 | Task  | Improve connection status UI                | P1       | 1        | ✅ Done | Better visual hierarchy, colored containers    |
| COT-506 | Task  | Improve opening badge clarity               | P1       | 1        | ✅ Done | Better tooltips for White/Black badges         |
| COT-507 | Task  | Consolidate refresh buttons                 | P1       | 1        | ✅ Done | Single refresh button in coach panel           |

### Epic COT-6 — Data & Storage

Owner: Engineering
Goal: Implement local data storage and management.

| Ticket  | Type  | Summary                                 | Priority | Estimate | Status  | Acceptance Criteria                               |
| ------- | ----- | --------------------------------------- | -------- | -------- | ------- | ------------------------------------------------- |
| COT-601 | Story | Implement JSON database layer           | P0       | 3        | ✅ Done | Data stored in Electron user data directory       |
| COT-602 | Story | Add opening and position seed data      | P0       | 2        | ✅ Done | King's Pawn, Queen's Pawn, London System included |
| COT-603 | Task  | Implement review scheduling persistence | P0       | 2        | ✅ Done | Reviews saved and loaded correctly                |

## Sprint History

### Sprint 1 — Foundation (Completed)

- COT-101, COT-102, COT-103, COT-104
- COT-201, COT-202
- COT-301, COT-303

### Sprint 2 — AI Features (Completed)

- COT-203, COT-204, COT-205
- COT-302, COT-304
- COT-401, COT-402

### Sprint 3 — Training & UI Polish (Completed)

- COT-403, COT-404
- COT-501, COT-502, COT-503
- COT-504, COT-505, COT-506, COT-507

### Sprint 4 — Data & Refinement (Completed)

- COT-601, COT-602, COT-603

## Current Status Summary

**Total Tickets**: 27

- ✅ **Completed**: 27
- 🔄 **In Progress**: 0
- 📋 **Backlog**: 0

**Epic Status**:

- ✅ Epic COT-1: Core Application Foundation — Complete
- ✅ Epic COT-2: AI Opponent & Engine Integration — Complete
- ✅ Epic COT-3: AI Coach Integration — Complete
- ✅ Epic COT-4: Training & Quiz Modes — Complete
- ✅ Epic COT-5: UI/UX Improvements — Complete
- ✅ Epic COT-6: Data & Storage — Complete

## Future Enhancements (Backlog)

| Ticket  | Type  | Summary                                           | Priority | Estimate |
| ------- | ----- | ------------------------------------------------- | -------- | -------- |
| COT-701 | Story | Add more opening variations                       | P2       | 3        |
| COT-702 | Story | Implement opening tree visualization improvements | P2       | 2        |
| COT-703 | Story | Add export/import functionality                   | P2       | 2        |
| COT-704 | Story | Implement game replay feature                     | P2       | 4        |
| COT-705 | Story | Add theme customization                           | P3       | 3        |
| COT-706 | Story | Implement cloud sync (optional)                   | P3       | 5        |

## Notes

- All core features are implemented and functional
- UI/UX improvements completed in latest sprint
- Performance optimizations applied to multipv calculations
- Connection status UI improved for better user experience
- Board overlap issues resolved with proper layout constraints
