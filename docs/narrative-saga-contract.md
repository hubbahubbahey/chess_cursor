# Narrative Saga Contract (Phase 0)

Status:
- Phase 0 decisions locked for implementation.
- Repo notes: docs/narrative-saga-phase-0-notes.md.

## NS-101 — Saga Length + Output Modes

**Decision**
- Saga length: **5 Acts + Closing Reflection**
- Output modes:
  - **Full** (all acts + turning points + closing reflection)
  - **Condensed** (short act summaries + closing reflection)
  - **One-Line** (single takeaway sentence)

## NS-102 — Input Policy

**Decision**
- Input is **PGN-only**.
- The pipeline must **not** include engine evaluations, alternative moves, or suggestions.

## NS-103 — JSON Schema ↔ Renderer Template Alignment

### Draft Saga JSON Schema (v0)
```json
{
  "meta": {
    "game_id": "string",
    "event": "string",
    "date": "YYYY.MM.DD",
    "white": "string",
    "black": "string",
    "result": "1-0|0-1|1/2-1/2",
    "focus_color": "white|black",
    "opening": "string?",
    "eco": "string?",
    "pgn_source": "string?"
  },
  "acts": [
    {
      "act_number": 1,
      "title": "string",
      "summary": "string",
      "phase": "opening|middlegame|endgame",
      "turning_points": [
        {
          "move_number": 1,
          "ply": 1,
          "reason": "string",
          "impact": "string"
        }
      ]
    }
  ],
  "closing_reflection": "string",
  "one_line_lesson": "string"
}
```

### Renderer Template Targets
- **Full**: title + meta context, per-act headers, act summaries, turning points, closing reflection, one-line lesson.
- **Condensed**: title + per-act short summaries, closing reflection, one-line lesson.
- **One-Line**: one-line lesson only.

### Field ↔ Template Checklist

| Field | Used in Full | Used in Condensed | Used in One-Line | Notes |
| --- | --- | --- | --- | --- |
| meta.game_id | ⬜ | ⬜ | ⬜ | Identifier only; optional display. |
| meta.event/date | ⬜ | ⬜ | ⬜ | Optional context header. |
| meta.white/black | ✅ | ✅ | ⬜ | Show players in header. |
| meta.result | ✅ | ✅ | ⬜ | Show result in header. |
| meta.focus_color | ✅ | ✅ | ⬜ | Used for POV labeling. |
| meta.opening/eco | ✅ | ✅ | ⬜ | Optional header line. |
| meta.pgn_source | ⬜ | ⬜ | ⬜ | Internal trace only. |
| acts[].act_number/title | ✅ | ✅ | ⬜ | Act headings. |
| acts[].summary | ✅ | ✅ | ⬜ | Core narrative. |
| acts[].phase | ✅ | ✅ | ⬜ | Optional inline tag. |
| acts[].turning_points[] | ✅ | ⬜ | ⬜ | Full mode highlight only. |
| turning_points[].move_number/ply | ✅ | ⬜ | ⬜ | For referencing the moment. |
| turning_points[].reason/impact | ✅ | ⬜ | ⬜ | Narrative explanation. |
| closing_reflection | ✅ | ✅ | ⬜ | Closing paragraph. |
| one_line_lesson | ✅ | ✅ | ✅ | Required for all modes. |

### Validation Summary
- [x] Every field renders in at least one mode or is explicitly optional/internal.
- [x] Renderer targets do not require fields missing from the schema.
- [x] One-Line mode depends only on one_line_lesson.

### Gaps / Decisions Needed
- **None identified** in the draft mapping. All fields either render or are explicitly marked as optional/internal.
