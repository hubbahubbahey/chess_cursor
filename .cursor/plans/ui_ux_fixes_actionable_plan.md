---
name: UI/UX Fixes - Actionable Plan
overview: Fix specific UI/UX issues identified from the application interface including redundant messages, unclear labels, visual artifacts, and improved information hierarchy.
todos:
  - id: remove-redundant-lm-status
    content: Remove redundant "LM Studio not connected" message from CoachChatPanel empty state when CoachPanel is open
    status: completed
  - id: improve-white-tag-clarity
    content: Improve clarity of "White"/"Black" tags in openings list with better labels and tooltips
    status: completed
  - id: fix-visual-artifacts
    content: Fix overlapping text and floating dropdown arrows behind chess board
    status: completed
  - id: consolidate-refresh-buttons
    content: Review and consolidate refresh buttons in AI Coach panel to avoid redundancy
    status: completed
  - id: improve-connection-status-ui
    content: Improve connection status display with better visual hierarchy and actionable buttons
    status: completed
  - id: add-dismissible-notification
    content: Create dismissible notification system for connection status instead of persistent popups
    status: cancelled
isProject: false
---

# UI/UX Fixes - Actionable Plan

## Issues Identified

Based on the application interface analysis, the following UI/UX issues need to be addressed:

### 1. Redundant "LM Studio not connected" Messages
**Problem:** The connection status message appears in multiple places:
- AI Coach panel header (CoachPanel.tsx line 116)
- CoachChatPanel empty state message (CoachChatPanel.tsx line 47)
- Potentially a bottom pop-up/toast notification (needs verification)

**Impact:** Visual clutter, redundant information, poor user experience

**Solution:**
- Keep connection status only in the AI Coach panel header
- Remove the message from CoachChatPanel empty state (show generic helpful message instead)
- If a bottom pop-up exists, make it dismissible and only show when CoachPanel is closed
- Use a single source of truth for connection status display

### 2. Unclear "White"/"Black" Tags in Openings List
**Problem:** The badges showing "White" or "Black" (Sidebar.tsx lines 96-101) don't clearly indicate their purpose. Users may not understand if this means:
- Playing as White/Black
- Filtering by color
- Opening color preference

**Impact:** Confusion about what the tags represent, reduced usability

**Solution:**
- Change label to "Play as White" or "Play as Black" for clarity
- Add tooltip on hover: "This opening is played as [White/Black]"
- Consider using icons (chess piece icons) alongside or instead of text
- Improve visual distinction between White and Black badges

### 3. Overlapping Text and Visual Artifacts
**Problem:** 
- "explore" text visible behind the chess board
- Floating dropdown arrow icons above the board
- Potential z-index or positioning issues

**Impact:** Visual clutter, unprofessional appearance, potential interaction issues

**Solution:**
- Review z-index values for all board-related components
- Ensure chess board container has proper background and z-index
- Check for any absolute/fixed positioned elements that might overlap
- Remove or properly position any debug/development text
- Ensure proper layering: board > controls > overlays

### 4. Redundant Refresh Buttons
**Problem:** Multiple refresh icons/buttons in the AI Coach panel may confuse users about which one to use

**Impact:** UI inconsistency, potential confusion

**Solution:**
- Audit all refresh buttons in CoachPanel
- Consolidate to a single, clearly labeled refresh action
- Ensure refresh button is properly positioned and styled consistently
- Add loading state during refresh operation

### 5. Connection Status UI Improvements
**Problem:** Connection status display could be more informative and actionable

**Impact:** Users may not know how to fix connection issues

**Solution:**
- Improve visual hierarchy of connection status
- Add actionable button/link when disconnected (e.g., "Open Settings" or "Check Connection")
- Show connection status with appropriate icons and colors
- Add tooltip with troubleshooting information
- Consider auto-retry mechanism with visual feedback

### 6. Notification System
**Problem:** If bottom pop-up exists, it should be dismissible and context-aware

**Impact:** Persistent notifications can be annoying and block content

**Solution:**
- Create a dismissible toast/notification component
- Only show when CoachPanel is closed (if connection is needed)
- Auto-dismiss after a few seconds or allow manual dismiss
- Use appropriate notification types (info, warning, error)

## Implementation Plan

### Phase 1: Remove Redundancy (High Priority)
**Files to modify:**
- `src/components/CoachChatPanel.tsx`
- `src/components/CoachPanel.tsx`

**Changes:**
1. Remove connection status message from CoachChatPanel empty state
2. Replace with generic helpful message that doesn't duplicate connection status
3. Ensure CoachPanel header is the single source of truth for connection status

### Phase 2: Improve Clarity (High Priority)
**Files to modify:**
- `src/components/Sidebar.tsx`

**Changes:**
1. Update badge text from "White"/"Black" to "Play as White"/"Play as Black"
2. Add tooltip with explanation
3. Improve visual styling for better distinction
4. Consider adding chess piece icons

### Phase 3: Fix Visual Artifacts (High Priority)
**Files to modify:**
- `src/components/ChessBoard.tsx`
- `src/index.css`
- `src/App.tsx`

**Changes:**
1. Review and fix z-index values
2. Ensure proper background colors and opacity
3. Remove any debug/development text
4. Fix positioning of any floating elements
5. Test layering of all board-related components

### Phase 4: Consolidate Controls (Medium Priority)
**Files to modify:**
- `src/components/CoachPanel.tsx`

**Changes:**
1. Audit all refresh/action buttons
2. Consolidate redundant controls
3. Improve button placement and styling
4. Add loading states

### Phase 5: Enhanced Connection Status (Medium Priority)
**Files to modify:**
- `src/components/CoachPanel.tsx`

**Changes:**
1. Improve connection status visual design
2. Add actionable buttons when disconnected
3. Add tooltips with troubleshooting info
4. Improve icon and color usage

### Phase 6: Notification System (Low Priority)
**Files to create/modify:**
- `src/components/Toast.tsx` (new)
- `src/components/CoachPanel.tsx`
- `src/App.tsx`

**Changes:**
1. Create reusable Toast/Notification component
2. Implement dismissible notifications
3. Add context-aware display logic
4. Style appropriately

## Testing Checklist

- [ ] Connection status appears only once when CoachPanel is open
- [ ] Opening tags clearly indicate "Play as White/Black"
- [ ] No overlapping text or visual artifacts around chess board
- [ ] Only one refresh button in AI Coach panel
- [ ] Connection status is visually clear and actionable
- [ ] Notifications (if any) are dismissible and context-aware
- [ ] All tooltips work correctly
- [ ] UI is responsive at different window sizes
- [ ] No console errors or warnings
- [ ] Visual hierarchy is clear and consistent

## Success Criteria

1. ✅ No redundant connection status messages
2. ✅ Opening color tags are clear and informative
3. ✅ No visual artifacts or overlapping elements
4. ✅ Single, clear refresh action in AI Coach
5. ✅ Connection status is informative and actionable
6. ✅ Clean, professional UI appearance
7. ✅ Improved user understanding of interface elements
