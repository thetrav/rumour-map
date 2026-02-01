# Tasks: Update Rumour Positions to Google Sheets

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Branch**: `002-update-rumour-positions`  
**Prerequisites**: 001-google-sheets-integration must be fully implemented and working

**Task Format**: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- **[P]**: Task can run in parallel with others (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3) for user story phase tasks only
- **TaskID**: Sequential execution order (T001, T002, T003...)

## Implementation Strategy

This feature extends the existing Google Sheets integration with bidirectional sync. Implementation follows an MVP-first approach where User Story 1 (Push Position Updates) delivers immediate value. Stories 2 and 3 enhance UX and robustness but are not blocking for basic functionality.

**MVP Scope**: User Story 1 only (Push Updates with basic success/error feedback)  
**Enhanced**: Add User Stories 2 & 3 (Visual indicators + comprehensive error handling)

---

## Phase 1: Setup (OAuth Scope Migration)

**Purpose**: Update authentication scope from read-only to full read/write access

- [X] T001 Update OAuth scope in src/config/google.ts from 'spreadsheets.readonly' to 'spreadsheets'
- [X] T002 Add scope migration logic in src/composables/useGoogleAuth.ts to detect scope changes and clear stale auth state
- [X] T003 Update environment variables documentation in README.md to note OAuth re-consent requirement

---

## Phase 2: Foundational (Core Type Extensions)

**Purpose**: Extend data model to support sync state tracking - MUST complete before user story implementation

**⚠️ CRITICAL**: All user stories depend on these type definitions

- [X] T004 [P] Extend Rumour interface in src/types/rumour.ts with sheetRowNumber field (number, 1-indexed)
- [X] T005 [P] Extend Rumour interface in src/types/rumour.ts with originalX and originalY fields (number)
- [X] T006 [P] Extend Rumour interface in src/types/rumour.ts with isModified field (boolean)
- [X] T007 [P] Add PushError interface to src/types/rumour.ts with type, message, userMessage, retryable fields
- [X] T008 [P] Add PushErrorType enum to src/types/rumour.ts (AUTH_ERROR, PERMISSION_ERROR, NETWORK_ERROR, RATE_LIMIT_ERROR, VALIDATION_ERROR, UNKNOWN_ERROR)
- [X] T009 Modify parseSheetRow function in src/composables/useRumoursFromGoogle.ts to populate sheetRowNumber (index + 2), originalX, originalY, and initialize isModified to false

**Checkpoint**: Type extensions complete - user story implementation can now begin

---

## Phase 3: User Story 1 - Push Position Updates to Google Sheets (Priority: P1) 🎯 MVP

**Goal**: Enable users to drag rumours to new positions and save X,Y coordinates back to Google Sheets via "Push Updates" button

**Independent Test**: Drag a rumour marker to a new position, click "Push Updates", verify X,Y values in Google Sheets are updated

### Implementation for User Story 1

- [X] T010 [P] [US1] Create useRumourUpdates composable in src/composables/useRumourUpdates.ts with reactive Set for modifiedRumours
- [X] T011 [P] [US1] Implement hasPendingChanges computed property in src/composables/useRumourUpdates.ts (modifiedRumours.size > 0)
- [X] T012 [P] [US1] Implement pendingCount computed property in src/composables/useRumourUpdates.ts (modifiedRumours.size)
- [X] T013 [P] [US1] Implement markAsModified function in src/composables/useRumourUpdates.ts to add rumour ID to Set
- [X] T014 [P] [US1] Implement clearModified function in src/composables/useRumourUpdates.ts to remove rumour ID from Set
- [X] T015 [P] [US1] Implement clearAllModified function in src/composables/useRumourUpdates.ts to clear entire Set
- [X] T016 [US1] Implement pushUpdates function in src/composables/useRumourUpdates.ts to filter modified rumours and build batch update request
- [X] T017 [US1] Add Google Sheets API batchUpdate call in pushUpdates function using gapi.client.sheets.spreadsheets.values.batchUpdate
- [X] T018 [US1] Add success handler in pushUpdates to update originalX, originalY, clear isModified flag, and remove from modifiedRumours Set
- [X] T019 [US1] Add basic error handler in pushUpdates to set isPushing=false and capture error message
- [X] T020 [US1] Modify useRumourDrag.js onDragEnd handler to compare x,y with originalX,originalY and call markAsModified if changed
- [X] T021 [P] [US1] Create PushUpdatesButton component in src/components/PushUpdatesButton.vue with button element
- [X] T022 [P] [US1] Add disabled state binding in PushUpdatesButton.vue (!hasPendingChanges || isPushing)
- [X] T023 [P] [US1] Add click handler in PushUpdatesButton.vue to call pushUpdates with rumours array
- [X] T024 [P] [US1] Add loading state UI in PushUpdatesButton.vue (spinner when isPushing=true)
- [X] T025 [P] [US1] Add pending count badge in PushUpdatesButton.vue showing pendingCount value
- [X] T026 [P] [US1] Add button styles in PushUpdatesButton.vue (fixed position bottom-right, 44x44px minimum, Primer blue background)
- [X] T027 [P] [US1] Add basic error message display in PushUpdatesButton.vue (red notification if pushError exists)
- [X] T028 [US1] Import and add PushUpdatesButton component to src/App.vue template

**Checkpoint**: User Story 1 complete - users can drag rumours and push position updates to Google Sheets

---

## Phase 4: User Story 2 - Track Local Changes Before Push (Priority: P2)

**Goal**: Provide visual feedback showing which rumours have been moved locally but not yet pushed to Google Sheets

**Independent Test**: Move a rumour marker, verify it displays a visual indicator (border/icon), click "Push Updates", verify indicator disappears

### Implementation for User Story 2

- [X] T029 [P] [US2] Add modified class binding to RumourMarker.vue based on rumour.isModified prop
- [X] T030 [P] [US2] Add CSS styles for .rumour-marker.modified class in RumourMarker.vue (amber border, box-shadow)
- [X] T031 [P] [US2] Add visual indicator icon (⚠️) to RumourMarker.vue template when rumour.isModified is true
- [X] T032 [P] [US2] Add aria-label for modified indicator in RumourMarker.vue ("Position modified, pending push")
- [X] T033 [US2] Add warning dialog to useRumoursFromGoogle.ts fetchRumours function when hasPendingChanges is true
- [X] T034 [US2] Add user confirmation prompt before clearing pending changes on refresh in useRumoursFromGoogle.ts

**Checkpoint**: User Story 2 complete - users can see which rumours have unpushed changes

---

## Phase 5: User Story 3 - Handle Update Conflicts and Errors (Priority: P2)

**Goal**: Provide clear, actionable feedback when position updates fail due to network, permissions, or other errors

**Independent Test**: Simulate network failure or permission denial during push, verify appropriate error messages are displayed and local changes are preserved

### Implementation for User Story 3

- [X] T035 [P] [US3] Implement validateUpdates function in src/composables/useRumourUpdates.ts to check coordinates within bounds (0-6500 for X, 0-3600 for Y)
- [X] T036 [P] [US3] Add pre-push validation call in pushUpdates function to filter out invalid coordinates
- [X] T037 [P] [US3] Implement handleApiError function in src/composables/useRumourUpdates.ts to map HTTP status codes to PushErrorType
- [X] T038 [P] [US3] Add 401 error handler in handleApiError mapping to AUTH_ERROR with "authentication expired" message
- [X] T039 [P] [US3] Add 403 error handler in handleApiError mapping to PERMISSION_ERROR with "no edit permission" message
- [X] T040 [P] [US3] Add 429 error handler in handleApiError mapping to RATE_LIMIT_ERROR with "too many requests" message
- [X] T041 [P] [US3] Add network error handler in handleApiError checking navigator.onLine for NETWORK_ERROR
- [X] T042 [P] [US3] Add generic error handler in handleApiError for UNKNOWN_ERROR fallback
- [X] T043 [US3] Update pushUpdates error handler to use handleApiError and create PushError object with user-friendly messages
- [X] T044 [US3] Add retry button to PushUpdatesButton.vue error display (only shown if error.retryable is true)
- [X] T045 [US3] Add retry button click handler in PushUpdatesButton.vue to clear error and call pushUpdates again
- [X] T046 [US3] Enhance error message display in PushUpdatesButton.vue to show specific error types with appropriate styling
- [X] T047 [US3] Add partial failure detection in pushUpdates by checking response.responses array length vs request data length
- [X] T048 [US3] Add partial failure UI in PushUpdatesButton.vue showing "N of M rumours updated" with expandable failed items list

**Checkpoint**: User Story 3 complete - comprehensive error handling with user-friendly messages and retry capability

---

## Phase 6: Testing

**Purpose**: Verify functionality across all user stories

### Unit Tests

- [X] T049 [P] Create tests/unit/useRumourUpdates.spec.ts with basic test structure and mocked gapi-script
- [X] T050 [P] Add test in useRumourUpdates.spec.ts: "tracks pending changes count when markAsModified is called"
- [X] T051 [P] Add test in useRumourUpdates.spec.ts: "hasPendingChanges is false initially and true after markAsModified"
- [X] T052 [P] Add test in useRumourUpdates.spec.ts: "pushUpdates clears modified state and updates originalX,originalY on success"
- [X] T053 [P] Add test in useRumourUpdates.spec.ts: "pushUpdates preserves modified state on error"
- [X] T054 [P] Add test in useRumourUpdates.spec.ts: "validateUpdates filters out coordinates outside bounds"
- [X] T055 [P] Add test in useRumourUpdates.spec.ts: "handleApiError maps 401 to AUTH_ERROR"
- [X] T056 [P] Add test in useRumourUpdates.spec.ts: "handleApiError maps 403 to PERMISSION_ERROR"
- [X] T057 [P] Extend tests/unit/useGoogleAuth.spec.ts with test: "uses spreadsheets scope not readonly"
- [X] T058 [P] Extend tests/unit/useGoogleAuth.spec.ts with test: "detects scope change and clears auth state"

### Integration Tests

- [X] T059 Create tests/integration/push-updates.spec.ts with mock rumours data and components
- [X] T060 Add integration test: "drag rumour, verify isModified flag set, verify pending count increases"
- [X] T061 Add integration test: "click Push Updates with modified rumours, verify API called with correct ranges"
- [X] T062 Add integration test: "successful push clears modified state and pending count"
- [X] T063 Add integration test: "failed push preserves modified state and shows error message"
- [X] T064 Add integration test: "button is disabled when no pending changes"
- [X] T065 Add integration test: "button is disabled during push operation"

---

## Phase 7: Polish & Documentation

**Purpose**: Final refinements and documentation updates

- [X] T066 [P] Add JSDoc comments to useRumourUpdates.ts functions documenting parameters and return types
- [X] T067 [P] Add JSDoc comments to PushUpdatesButton.vue documenting component purpose and props
- [X] T068 [P] Update README.md with OAuth scope change instructions and re-consent requirement
- [X] T069 [P] Add feature documentation to README.md describing drag-to-update workflow
- [X] T070 [P] Add troubleshooting section to README.md for common push update errors (permissions, network, rate limits)
- [X] T071 Run npm test to verify all tests pass
- [X] T072 Run npm run build to verify production build succeeds and bundle size remains under 200KB
- [ ] T073 Manual test: drag single rumour, push updates, verify in Google Sheets
- [ ] T074 Manual test: drag multiple rumours, push updates, verify batch operation
- [ ] T075 Manual test: simulate permission error (remove edit access), verify error message
- [ ] T076 Manual test: simulate network error (offline mode), verify error message and retry

---

## Dependencies

### User Story Completion Order

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← MUST complete before ANY user story
    ↓
Phase 3 (US1: Push Updates) ← MVP - can be deployed independently
    ↓
Phase 4 (US2: Visual Indicators) ← Independent, depends only on US1 + Foundational
    ↓
Phase 5 (US3: Error Handling) ← Independent, depends only on US1 + Foundational
    ↓
Phase 6 (Testing) ← Tests all stories
    ↓
Phase 7 (Polish) ← Final refinements
```

**Critical Path**: Setup → Foundational → US1 (MVP)  
**Parallel After MVP**: US2 and US3 can be implemented in parallel  
**MVP Delivery**: Phases 1-3 deliver a working push updates feature

### Parallel Execution Opportunities

**Within Phase 2 (Foundational)**:
- T004-T008 (Type definitions) can all run in parallel - different interfaces

**Within Phase 3 (US1)**:
- T010-T015 (Composable structure) can run in parallel - different functions
- T021-T027 (Button component) can run in parallel with T010-T020 - different file
- After T020 complete: T028 depends on T021 being done

**Within Phase 4 (US2)**:
- T029-T032 (Visual indicators) can run in parallel - same file but different sections
- T033-T034 (Refresh warnings) can run in parallel with T029-T032 - different file

**Within Phase 5 (US3)**:
- T035-T042 (Error handling logic) can run in parallel - same composable but different functions
- T044-T046 (UI enhancements) can run in parallel - same component but different sections

**Within Phase 6 (Testing)**:
- T049-T058 (Unit tests) can all run in parallel - independent test files
- T059-T065 (Integration tests) can run in parallel after T049-T058 complete

**Within Phase 7 (Polish)**:
- T066-T070 (Documentation) can all run in parallel - independent markdown files
- T071-T076 (Manual tests) must run sequentially to verify functionality

---

## Task Summary

**Total Tasks**: 76  
**MVP Tasks (Phases 1-3)**: 28  
**Enhancement Tasks (Phases 4-5)**: 20  
**Testing Tasks (Phase 6)**: 17  
**Polish Tasks (Phase 7)**: 11

**Parallelizable Tasks**: 42 tasks marked with [P]  
**Sequential Tasks**: 34 tasks with dependencies

**Estimated Implementation Time**:
- MVP (Phases 1-3): 4-6 hours for experienced Vue 3 developer
- Full Feature (All phases): 8-12 hours including testing and polish

**Files Modified**: 6
- src/config/google.ts
- src/types/rumour.ts
- src/composables/useGoogleAuth.ts
- src/composables/useRumoursFromGoogle.ts
- src/composables/useRumourDrag.js
- src/App.vue

**Files Created**: 8
- src/composables/useRumourUpdates.ts
- src/components/PushUpdatesButton.vue
- tests/unit/useRumourUpdates.spec.ts
- tests/integration/push-updates.spec.ts
- (Plus documentation updates to existing README.md)

**Dependencies Added**: 0 (uses existing gapi-script, Vue 3, Vitest)

---

## Acceptance Criteria per User Story

### User Story 1 (P1) - Push Position Updates
✅ Single rumour drag → push → verify in Sheets  
✅ Multiple rumours drag → batch push → all update  
✅ Success message shows count of updated rumours  
✅ Button disabled when no changes pending

### User Story 2 (P2) - Track Local Changes
✅ Moved marker shows visual indicator (border/icon)  
✅ Multiple moved markers all show indicator  
✅ Indicators clear after successful push  
✅ Warning shown before refresh if pending changes exist

### User Story 3 (P2) - Handle Errors
✅ Network error → error message + retry button  
✅ Permission error → clear message, no retry  
✅ Rate limit error → error message + retry button  
✅ Loading state during push (button disabled, spinner shown)  
✅ Partial failures → show which rumours succeeded/failed

---

## Next Steps

1. Start with **Phase 1 (Setup)** - update OAuth scope
2. Complete **Phase 2 (Foundational)** - extend type definitions (BLOCKING for all stories)
3. Implement **Phase 3 (User Story 1)** for MVP functionality
4. Test MVP thoroughly before proceeding to enhancements
5. Add **Phases 4 & 5** (User Stories 2 & 3) for enhanced UX
6. Complete **Phase 6 (Testing)** to ensure quality
7. Finish with **Phase 7 (Polish)** for documentation and final refinements

**Ready for Implementation**: All tasks are specific, actionable, and include exact file paths. Each user story can be implemented and tested independently.
