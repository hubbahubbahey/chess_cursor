# Narrative Saga System — Task-Level Jira Board

Project key: NS (example)
Sprint length: 2 weeks
Ticket format: NS-###

## Board Overview

### Epic NS-1 — Phase 0: Define the Contract
Owner: Product
Goal: lock scope, inputs, and outputs so narrative remains focused.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-101 | Story | Freeze saga length and output modes | P0 | 1 | — | Documented decision: 5 Acts + Closing Reflection; output modes = Full/Condensed/One-Line; decision circulated in repo notes. |
| NS-102 | Story | Confirm PGN-only input policy | P0 | 1 | — | Decision recorded that initial pipeline uses PGN only; no engine evals, no suggestions. |
| NS-103 | Task | Validate JSON schema + renderer template alignment | P1 | 1 | NS-101, NS-102 | Checklist confirming schema fields map to template; gaps logged. |

### Epic NS-2 — Phase 1: Core Pipeline (MVP)
Owner: Engineering
Goal: parse PGN and produce rule-based structural outputs without evaluation.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-201 | Story | Implement PGN ingestion module | P0 | 3 | — | Given a PGN, system outputs moves, result, focus_color, optional opening/ECO, player ELOs. |
| NS-202 | Task | Define PGN ingestion interface + data contracts | P0 | 1 | NS-201 | Interface documented; sample input/output JSON present. |
| NS-203 | Story | Build turning-point detector v1 (rule-based) | P0 | 4 | NS-201 | For a PGN, system flags turning points with move_number + reason. |
| NS-204 | Task | Add pawn-structure detection rules | P1 | 2 | NS-203 | Detect doubled/isolated/backward pawns and emit structured reasons. |
| NS-205 | Task | Add king-safety compromise rules | P1 | 2 | NS-203 | Detect king pawn cover loss + forced displacement triggers. |
| NS-206 | Task | Add activity-based rules | P1 | 2 | NS-203 | Detect declined queen trade in open center + rook 7th/2nd penetration. |
| NS-207 | Story | Implement act classifier heuristics | P0 | 3 | NS-201, NS-203 | Acts I–V labeled with phase boundaries and summary inputs. |
| NS-208 | Task | Define act transition heuristics doc | P1 | 1 | NS-207 | Rules documented with examples for each act transition. |

### Epic NS-3 — Phase 2: Narrative Generator
Owner: Engineering / AI
Goal: produce saga JSON and renderable prose without suggestions.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-301 | Story | Implement saga writer integration | P0 | 4 | NS-201, NS-203, NS-207 | Input = structured act + turning point data; output = saga JSON. |
| NS-302 | Task | Add prompt template + safety constraints | P0 | 2 | NS-301 | Prompt ensures no suggestions, no alternative moves, no engine numbers. |
| NS-303 | Story | Implement renderer layer (full/condensed/one-line) | P0 | 3 | NS-301 | renderSaga(json, verbosity) returns prose for all modes. |
| NS-304 | Task | Add renderer formatting tests (snapshot strings) | P2 | 2 | NS-303 | Sample saga JSON returns deterministic prose outputs. |

### Epic NS-4 — Phase 3: UX Integration
Owner: Product + Engineering
Goal: surface the narrative in a reflection-first UI.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-401 | Story | Build Post-Game Reflection screen | P0 | 5 | NS-303 | Layout includes title, collapsible acts, highlighted turning point, closing reflection, sticky one-line lesson; no board. |
| NS-402 | Task | Add collapsible act UI states | P1 | 2 | NS-401 | Acts default to collapsed; expand/collapse interactions logged. |
| NS-403 | Story | Add memory anchoring prompt | P0 | 3 | NS-401 | UI includes “This reminds me of…” field and stores taggable patterns. |
| NS-404 | Task | Implement recurring pattern tagging storage | P1 | 2 | NS-403 | Saves recurring_pattern_id (e.g., early_king_exposure_v1). |

### Epic NS-5 — Phase 4: Training Loop
Owner: Product + Engineering
Goal: close feedback loop with light, theme-focused guidance.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-501 | Story | Build saga-driven training suggestions | P1 | 4 | NS-403, NS-404 | After 3+ similar sagas, suggest one theme with 1 study position, 1 mantra, 1 question. |
| NS-502 | Task | Define similarity rules for recurring patterns | P1 | 2 | NS-501 | Similarity rules documented and encoded in logic. |
| NS-503 | Story | Implement pre-game reminder injection | P1 | 3 | NS-501 | Next game screen shows concise reminder derived from recurring pattern. |

### Epic NS-6 — Phase 5: Iteration & Depth (Later)
Owner: Product
Goal: optional enhancements, behind toggles.

| Ticket | Type | Summary | Priority | Estimate | Dependencies | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- |
| NS-601 | Story | Add engine-augmented hidden moment detection (toggle) | P3 | 5 | NS-203 | Optional toggle; clearly labeled; does not affect default output. |
| NS-602 | Story | Add player-voice + coach-voice modes | P3 | 4 | NS-301 | Toggle between voice styles without changing factual content. |
| NS-603 | Story | Export saga as Markdown/Obsidian note | P3 | 3 | NS-303 | Export creates formatted Markdown with metadata. |

## Sprint Proposal (2-week cadence)

### Sprint 1 (MVP foundations)
- NS-101, NS-102, NS-103
- NS-201, NS-202
- NS-203, NS-204, NS-205
- NS-207, NS-208

### Sprint 2 (MVP completion + narrative)
- NS-206
- NS-301, NS-302
- NS-303, NS-304
- NS-401 (scaffold only)

### Sprint 3 (UX + memory anchoring)
- NS-401 (final)
- NS-402
- NS-403
- NS-404

### Sprint 4 (training loop)
- NS-501, NS-502, NS-503

## Risks & Notes
- Avoid drift into analysis or engine-like output; keep prompt constraints explicit.
- Ensure every UI surface reinforces reflection (no board, no move suggestions).
- Similarity logic should be explainable and stable to avoid user confusion.
