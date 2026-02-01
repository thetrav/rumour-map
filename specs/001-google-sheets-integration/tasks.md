# Tasks: Google Sheets Rumour Repository

**Input**: Design documents from `/specs/001-google-sheets-integration/`  
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/google-sheets-api.md](contracts/google-sheets-api.md)

**Tests**: Tests are NOT explicitly requested in the specification but are required per constitution Section 2.2. Test tasks are included but marked as foundation work.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, TypeScript setup, and testing infrastructure

- [X] T001 Install production dependencies (gapi-script@1.2.0) per quickstart.md
- [X] T002 [P] Install development dependencies (vitest@1.2.0, @vue/test-utils@2.4.3, happy-dom@13.3.0, typescript, @types/node) per research.md
- [X] T003 [P] Create tsconfig.json with allowJs:true for gradual migration per research.md
- [X] T004 [P] Create src/shims-vue.d.ts for Vue component type declarations
- [X] T005 Rename vite.config.js to vite.config.ts and add Vitest test configuration per research.md
- [X] T006 [P] Add test script to package.json (test, test:ui, test:coverage)
- [X] T007 [P] Add Google Identity Services and gapi-script tags to index.html per quickstart.md Step 8
- [X] T008 [P] Create .env.local with VITE_GOOGLE_CLIENT_ID, VITE_SPREADSHEET_ID placeholders per quickstart.md Step 7

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create src/types/rumour.ts with Rumour, GoogleSheetsRow, RumourFilterState, AuthState, SheetsApiError interfaces from data-model.md
- [X] T010 [P] Create src/types/google.d.ts with global window.google and window.gapi type declarations per research.md troubleshooting
- [X] T011 [P] Create src/config/google.ts with GOOGLE_CONFIG export (clientId, apiKey, spreadsheetId, scope, discoveryDocs) per research.md Section 2
- [X] T012 Create src/composables/useGoogleAuth.ts with OAuth2 initialization, sign-in, sign-out, in-memory token storage per research.md Section 3
- [X] T013 Create tests/unit/useGoogleAuth.spec.ts to test authentication state and token handling
- [X] T014 Create src/composables/useRumoursFromGoogle.ts with gapi client initialization, spreadsheet fetch, row parsing, caching logic per data-model.md transformation rules
- [X] T015 Create tests/unit/useRumoursFromGoogle.spec.ts to test data fetching, parsing, validation, and error handling
- [X] T016 Run tests to verify foundation: npm run test (all foundational tests must pass)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Rumours from Google Sheets (Priority: P1) 🎯 MVP

**Goal**: Replace PSV data source with Google Sheets. Users sign in with Google account and see rumours loaded from configured spreadsheet displayed as markers on map.

**Independent Test**: Configure Google Sheets URL, load application, verify markers appear at correct X,Y positions with titles. Hover to see details. Tests OAuth flow, data fetch, parsing, and rendering.

### Implementation for User Story 1

- [X] T017 [P] [US1] Create src/components/GoogleAuthButton.vue with sign-in button, loading state, error display per quickstart.md Phase 2 Step 2
- [X] T018 [P] [US1] Add Tailwind styling to GoogleAuthButton.vue (button, hover states, loading spinner)
- [X] T019 [US1] Modify src/composables/useRumours.ts to use useRumoursFromGoogle instead of PSV fetch, maintain same return interface for backward compatibility
- [X] T020 [US1] Convert src/composables/useRumours.js to useRumours.ts with TypeScript types from rumour.ts
- [X] T021 [US1] Update src/App.vue to import and render GoogleAuthButton component, handle auth state display
- [X] T022 [US1] Add error boundary/display in App.vue for Google Sheets fetch errors (401, 403, 404, 429) with user-friendly messages per contracts/google-sheets-api.md
- [X] T023 [US1] Add loading indicator in RumourOverlay.vue or App.vue while fetching Google Sheets data
- [X] T024 [US1] Test empty Google Sheets scenario (no data rows) - verify no errors, no markers displayed
- [X] T025 [US1] Create tests/integration/google-sheets-integration.spec.ts to test full OAuth + fetch + render flow with mocked gapi responses

**Checkpoint**: User Story 1 complete. Users can sign in with Google, rumours load from Google Sheets, markers display correctly on map. All FR-001 through FR-008 satisfied.

---

## Phase 4: User Story 2 - Filter Rumours by Resolution Status (Priority: P2)

**Goal**: Add filter controls to toggle between all/resolved/unresolved rumours. Helps users manage growing rumour lists by focusing on active rumours.

**Independent Test**: Load application with mixed resolved/unresolved rumours. Toggle filter controls. Verify markers appear/disappear based on resolved field. Reset to "show all" and verify all markers visible.

### Implementation for User Story 2

- [X] T026 [P] [US2] Create src/composables/useRumourFilter.ts with filterMode state (all/resolved/unresolved), filteredRumours computed property, setFilter function per data-model.md
- [X] T027 [P] [US2] Create tests/unit/useRumourFilter.spec.ts to test filtering logic with sample rumour data
- [X] T028 [US2] Add filter toggle UI to src/components/RumourOverlay.vue (three buttons: All, Resolved, Unresolved) with Tailwind styling
- [X] T029 [US2] Integrate useRumourFilter in RumourOverlay.vue, pass filtered rumours to marker rendering
- [X] T030 [US2] Add filter count display showing total/resolved/unresolved counts from RumourFilterState
- [X] T031 [US2] Handle edge case: rumours with empty/null resolved values treated as unresolved per data-model.md validation rules
- [X] T032 [US2] Test filter performance with 500 rumours - verify <500ms update time per spec SC-003

**Checkpoint**: User Story 2 complete. Users can filter rumours by resolution status. FR-009 satisfied.

---

## Phase 5: User Story 3 - View Rumour Metadata (Priority: P2)

**Goal**: Display extended rumour metadata (session_date, game_date, location_heard, location_targetted, rating) in rumour details overlay.

**Independent Test**: Hover or click on rumour marker. Verify all metadata fields displayed with proper labels. Test with rumours having null/empty metadata fields to verify graceful handling.

### Implementation for User Story 3

- [X] T033 [P] [US3] Modify src/components/RumourMarker.vue to include metadata fields in hover/expanded view
- [X] T034 [P] [US3] Add metadata field rendering: session_date and game_date with readable format
- [X] T035 [P] [US3] Add location_heard and location_targetted fields with clear labels ("Heard at:", "About:")
- [X] T036 [P] [US3] Add rating display formatted as "X/10" or "Rating: ⭐ X/10" per data-model.md
- [X] T037 [US3] Handle null/empty metadata fields: hide field or show "Not specified" per spec User Story 3 acceptance scenario 4
- [X] T038 [US3] Apply Tailwind styling to metadata display (spacing, typography, subtle colors for labels)
- [X] T039 [US3] Test with rumours having partial metadata (some fields null) to verify graceful degradation

**Checkpoint**: User Story 3 complete. Users can view all rumour metadata in details overlay. FR-010, FR-011, FR-012 satisfied.

---

## Phase 6: User Story 4 - Refresh Data from Google Sheets (Priority: P3)

**Goal**: Add manual refresh button to re-fetch Google Sheets data without full page reload. Convenience feature for workflow improvement.

**Independent Test**: Load application, modify Google Sheets data (add/edit rumours), click refresh button in app, verify markers update to reflect changes without page reload. Test loading indicator during refresh.

### Implementation for User Story 4

- [X] T040 [P] [US4] Add refresh function to src/composables/useRumoursFromGoogle.ts that clears cache and re-fetches data
- [X] T041 [P] [US4] Add refresh button UI component in App.vue or RumourOverlay.vue with Tailwind styling (icon + text)
- [ ] T042 [US4] Implement 2-second debounce on refresh button to prevent rapid repeated API calls per contracts rate limit mitigation
- [ ] T043 [US4] Display last fetch timestamp in UI ("Last updated: X minutes ago") using lastFetchTime from data-model.md state
- [X] T044 [US4] Show loading indicator during refresh operation (reuse loading state from US1)
- [X] T045 [US4] Handle refresh errors gracefully: network errors, rate limiting (use cached data if 429), permission errors
- [X] T046 [US4] Test refresh with new rumours added to Google Sheets - verify new markers appear
- [X] T047 [US4] Test refresh with modified rumours in Google Sheets - verify existing markers update
- [X] T048 [US4] Test refresh rate limit scenario (>100 requests per 100 seconds) - verify cached data shown with appropriate message

**Checkpoint**: User Story 4 complete. Users can manually refresh rumour data. FR-013 satisfied.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements, documentation, and deployment preparation

- [X] T049 [P] Add Content Security Policy meta tag to index.html per contracts/google-sheets-api.md security section
- [X] T050 [P] Verify bundle size is <200KB gzipped using npm run build and checking dist/ folder size
- [ ] T051 [P] Test cross-browser compatibility (Chrome, Firefox, Safari) per constitution Section 5.2
- [ ] T052 [P] Test responsive design on mobile devices (320px to 4K) per constitution Section 3.3
- [ ] T053 [P] Add keyboard accessibility to GoogleAuthButton and filter controls per constitution Section 3.4
- [ ] T054 [P] Verify ARIA labels on all interactive controls per constitution Section 3.4
- [ ] T055 Test 60fps performance during pan/zoom with 500 rumours loaded per constitution Section 4.2 and spec SC-004
- [X] T056 [P] Update README.md with Google Sheets setup instructions (link to quickstart.md)
- [X] T057 [P] Add .env.local.example file with placeholder environment variable templates
- [X] T058 [P] Document deprecation of public/rumours.psv file (add README note about migration to Google Sheets)
- [X] T059 Run full test suite: npm run test -- verify all tests pass
- [X] T060 Run build and verify no TypeScript errors: npm run build
- [ ] T061 Test deployment to staging environment (GitHub Pages or similar) with production Google OAuth origins configured

**Checkpoint**: Feature complete, tested, and ready for production deployment.
- [ ] T060 Run build and verify no TypeScript errors: npm run build
- [ ] T061 Test deployment to staging environment (GitHub Pages or similar) with production Google OAuth origins configured

**Checkpoint**: Feature complete, tested, and ready for production deployment.

---

## Dependencies & Parallelization

### User Story Dependencies

```
Foundation (Phase 2)
    ↓
User Story 1 (P1) ← MVP - Must complete first
    ↓
User Story 2 (P2) ← Can start after US1 complete
    ↓
User Story 3 (P2) ← Can start after US1 complete (independent of US2)
    ↓
User Story 4 (P3) ← Can start after US1 complete (requires refresh infrastructure)
    ↓
Polish (Phase 7)
```

**Critical Path**: Setup → Foundation → US1 → Polish

**Parallel Opportunities**:
- Phase 1 Setup: T002, T003, T004, T006, T007, T008 can run in parallel
- Phase 2 Foundation: T010, T011 can run while T009 completes; T013, T015 can run in parallel
- Phase 3 US1: T017, T018 can run in parallel; T024, T025 can run in parallel
- Phase 4 US2: T026, T027 can run first, then T028-T031 in sequence
- Phase 5 US3: T033-T036 can run in parallel (different parts of same file)
- Phase 6 US4: T040, T041 can run in parallel
- Phase 7 Polish: T049-T054, T056-T058 all parallelizable

### Parallel Execution Example for US1

**Batch 1** (after foundation complete):
- T017: Create GoogleAuthButton.vue
- T019: Modify useRumours composable
- T020: Convert useRumours to TypeScript

**Batch 2** (after Batch 1):
- T018: Style GoogleAuthButton
- T021: Update App.vue
- T022: Add error handling
- T023: Add loading indicator

**Batch 3** (after Batch 2):
- T024: Test empty sheets
- T025: Integration tests

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Deploy after completing**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)

**MVP Delivers**:
- ✅ OAuth2 authentication with Google
- ✅ Rumours load from Google Sheets
- ✅ Markers display on map with hover details
- ✅ Error handling for auth and fetch failures
- ✅ Basic loading states

**Not in MVP**:
- ❌ Filtering by resolution status (US2)
- ❌ Extended metadata display (US3)
- ❌ Manual refresh button (US4)

Users can immediately replace PSV workflow with Google Sheets, providing core value.

### Incremental Delivery

1. **MVP** (US1): ~3-5 days → Deploy to production
2. **Filtering** (US2): ~1-2 days → Deploy as enhancement
3. **Metadata** (US3): ~1 day → Deploy as enhancement
4. **Refresh** (US4): ~1-2 days → Deploy as convenience feature
5. **Polish** (Phase 7): Ongoing → Deploy quality improvements

---

## Task Summary

| Phase | Task Count | Estimated Time | Can Start After |
|-------|------------|----------------|-----------------|
| Phase 1: Setup | 8 tasks | 1-2 hours | Immediately |
| Phase 2: Foundation | 8 tasks | 3-4 hours | Phase 1 complete |
| Phase 3: US1 (MVP) | 9 tasks | 6-8 hours | Phase 2 complete |
| Phase 4: US2 (Filter) | 7 tasks | 3-4 hours | Phase 3 complete |
| Phase 5: US3 (Metadata) | 7 tasks | 2-3 hours | Phase 3 complete |
| Phase 6: US4 (Refresh) | 9 tasks | 3-4 hours | Phase 3 complete |
| Phase 7: Polish | 13 tasks | 4-6 hours | All user stories complete |
| **TOTAL** | **61 tasks** | **22-31 hours** | Incremental delivery |

### Parallel Execution Opportunities

- **19 tasks** marked with [P] can run in parallel with other tasks in same phase
- Phases 4, 5, 6 can be worked on independently after Phase 3 complete
- Maximum parallelization: ~4-5 developers working simultaneously on different user stories

---

## Format Validation

✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`  
✅ Task IDs sequential (T001-T061)  
✅ [P] markers only on parallelizable tasks  
✅ [Story] labels (US1-US4) applied correctly  
✅ File paths included in all implementation tasks  
✅ User stories ordered by priority (P1, P2, P2, P3)  
✅ Each phase independently testable  
✅ MVP scope clearly defined (Phase 3 only)  
✅ Dependencies documented  
✅ Parallel opportunities identified
