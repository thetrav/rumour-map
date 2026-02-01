# Implementation Plan: Update Rumour Positions to Google Sheets

**Branch**: `002-update-rumour-positions` | **Date**: 2026-02-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-update-rumour-positions/spec.md`

**Note**: This plan follows the existing architecture from 001-google-sheets-integration and extends it with bidirectional write capabilities.

## Summary

Enable users to update rumour positions on the map by dragging markers, then push X,Y coordinate changes back to Google Sheets via a "Push Updates" button. The system tracks pending changes, validates coordinates, handles errors gracefully, and uses the Google Sheets API v4 batch update capabilities. This extends the existing read-only integration (001) to support write operations while maintaining the established patterns of in-memory token storage, composable-based architecture, and Vue 3 Composition API.

## Technical Context

**Language/Version**: TypeScript 5.9, Vue 3.5, Vite 7.2  
**Primary Dependencies**: Vue 3, gapi-script 1.2, Google Identity Services (GIS), Tailwind CSS 3.4, @primer/css 22.1  
**Storage**: Google Sheets API v4 (external), in-memory state for pending changes  
**Testing**: Vitest 1.2, @vue/test-utils 2.4, happy-dom 13.3  
**Target Platform**: Modern browsers (Chrome/Firefox/Safari, last 2 versions), desktop and mobile web  
**Project Type**: Single-page web application  
**Performance Goals**: Push updates complete in <10 seconds, batch support for 50+ rumours, maintain 60fps during drag operations  
**Constraints**: <200KB bundle size (current), client-side only (no backend), Google Sheets API rate limits (100 req/100s/user)  
**Scale/Scope**: ~50-200 rumours per sheet, manual updates (not real-time), single user editing at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Simplicity First (1.1)
✅ **PASS**: Solution adds write capability using existing patterns (composables, Google Sheets API). No new abstractions or frameworks required. Reuses established `useGoogleAuth`, follows same error handling patterns as read operations.

### Composition API Standards (1.2)
✅ **PASS**: New composable `useRumourUpdates` follows existing conventions. Uses `<script setup>` syntax, extracts reusable logic for tracking changes and batch updates. Consistent with `useRumoursFromGoogle`, `useGoogleAuth`, and `useRumourDrag` patterns.

### Code Style (1.3)
✅ **PASS**: Follows established naming:
- Composable: `useRumourUpdates.ts` (camelCase with `use` prefix)
- Component: `PushUpdatesButton.vue` (PascalCase)
- Types: extends existing `rumour.ts` interface
- No files exceed 300 lines; update logic isolated in composable

### Dependency Management (1.4)
✅ **PASS**: Zero new dependencies. Uses existing `gapi-script` for write API calls. Google Sheets API v4 supports batch updates natively. Leverages existing Google Identity Services token management.

### Testing Standards (2.1-2.3)
✅ **PASS**: Test plan includes:
- Unit tests for `useRumourUpdates` composable (mocked API calls)
- Integration tests for drag → push → verify workflow
- Edge case tests (network failure, permission errors, batch operations)
- Uses existing Vitest + @vue/test-utils setup

### User Experience Consistency (3.1-3.4)
✅ **PASS**:
- "Push Updates" button follows Primer CSS design system (existing pattern)
- Visual indicators (modified markers) use Tailwind utilities consistently
- Button placement accessible (44x44px minimum touch target)
- Keyboard accessible (button, not div)
- Success/error messages use existing toast/notification pattern

### Performance Requirements (4.1-4.4)
✅ **PASS**:
- Batch updates minimize API calls (single request for multiple rumours)
- No impact on drag performance (60fps maintained, updates deferred until push)
- Pending changes tracked in memory (minimal overhead)
- No new assets or bundle size impact (<200KB maintained)

**GATE RESULT**: ✅ **ALL CHECKS PASS** - Proceed to Phase 0 research.

## Project Structure

### Documentation (this feature)

```text
specs/002-update-rumour-positions/
├── plan.md              # This file
├── research.md          # Google Sheets write API patterns, batch updates, error handling
├── data-model.md        # Extended Rumour interface with sync state, Update Batch structure
├── quickstart.md        # Setup OAuth write scope, test push updates flow
├── contracts/           # Google Sheets API v4 batchUpdate contract
│   └── google-sheets-write-api.md
└── checklists/
    └── requirements.md  # Already created
```

### Source Code (repository root)

```text
src/
├── composables/
│   ├── useGoogleAuth.ts        # MODIFY: Add write scope to existing auth
│   ├── useRumoursFromGoogle.ts # MODIFY: Track row numbers for update targeting
│   ├── useRumourDrag.js        # MODIFY: Mark rumours as modified on drag end
│   └── useRumourUpdates.ts     # NEW: Batch update logic, API calls
├── components/
│   ├── RumourMarker.vue        # MODIFY: Visual indicator for pending changes
│   └── PushUpdatesButton.vue   # NEW: Button component with loading/error states
├── config/
│   └── google.ts               # MODIFY: Add write scope to config
├── types/
│   └── rumour.ts               # EXTEND: Add sync state fields (isModified, originalX, originalY)
└── App.vue                     # MODIFY: Add PushUpdatesButton component

tests/
├── unit/
│   ├── useRumourUpdates.spec.ts  # NEW: Unit tests for update composable
│   └── useGoogleAuth.spec.ts     # MODIFY: Test write scope inclusion
└── integration/
    └── push-updates.spec.ts      # NEW: Integration test for drag → push → verify
```

**Structure Decision**: Single-page web application architecture maintained. All new files follow existing Vue 3 Composition API patterns. Modifications extend existing composables rather than creating new abstractions. Components remain under 300 lines per constitution. Tests colocated by type (unit vs integration) per existing structure.

---

## Phase 0: Research ✅ COMPLETE

All research questions resolved:

1. **OAuth Write Scope**: Full `spreadsheets` scope required (no granular write-only option)
2. **Batch Update API**: `spreadsheets.values.batchUpdate` method with ValueRange arrays
3. **Row Identification**: Store 1-indexed row numbers during fetch for reliable targeting
4. **Pending Changes**: Reactive Set in composable for O(1) tracking, computed properties for UI
5. **Error Handling**: Three-tier validation (pre-push, API mapping, user-friendly messages)
6. **UI Patterns**: Modified marker indicators + FAB-style push button (bottom-right)
7. **Button Interaction**: Fixed position, badge with count, disabled when no changes

**Output**: [research.md](research.md) - 7 technical decisions documented with rationale and implementation guidance.

---

## Phase 1: Design & Contracts ✅ COMPLETE

### Data Model

Extended existing Rumour interface with 4 new fields for sync state:
- `sheetRowNumber`: Row position in Sheets for update targeting
- `originalX`, `originalY`: Last saved coordinates for change detection
- `isModified`: Boolean flag for UI indicators and pending change tracking

Defined batch update request/response types matching Google Sheets API v4 schema. Categorized 8 error types with user-friendly messages and retry logic.

**Output**: [data-model.md](data-model.md)

### API Contracts

Documented Google Sheets API v4 `batchUpdate` endpoint:
- Request format: ValueRange arrays with A1 notation
- Response structure: Per-range update counts
- Error responses: 401, 403, 429, 400, 500+ with causes and handling
- Rate limits: 100 req/100s per user (batch updates count as 1)
- Security: OAuth 2.0, scope, token handling

**Output**: [contracts/google-sheets-write-api.md](contracts/google-sheets-write-api.md)

### Developer Quickstart

Step-by-step guide covering:
1. OAuth scope update (read-only → full access)
2. Core file implementation (5 files to create/modify)
3. Testing workflow (basic, batch, error cases)
4. Troubleshooting common issues
5. Development workflow and debugging tips

**Output**: [quickstart.md](quickstart.md)

### Agent Context Update

Updated GitHub Copilot context with:
- Technology: TypeScript 5.9, Vue 3.5, Vite 7.2
- Frameworks: gapi-script 1.2, Google Identity Services, Tailwind CSS 3.4
- Storage: Google Sheets API v4, in-memory sync state

**Output**: `.github/agents/copilot-instructions.md` updated

---

## Phase 1: Constitution Re-Check ✅ PASS

Re-evaluated all constitution gates after design phase:

### Code Quality (1.1-1.4)
✅ **PASS**: No new abstractions, reuses existing patterns, zero new dependencies, all files <300 lines

### Testing (2.1-2.3)
✅ **PASS**: Unit tests for composable, integration tests for workflows, uses existing Vitest setup

### UX Consistency (3.1-3.4)
✅ **PASS**: Primer CSS button, Tailwind utilities, 44x44px touch targets, keyboard accessible

### Performance (4.1-4.4)
✅ **PASS**: Batch API minimizes calls, no drag performance impact, <200KB bundle maintained

**GATE RESULT**: ✅ **ALL CHECKS PASS** - Design phase complete, ready for Phase 2 (tasks).

---

## Next Steps

**Phase 2: Task Generation** (not part of this plan command)

Run `/speckit.tasks` to generate implementation tasks from this plan:
- Task ordering based on dependencies (auth scope → composable → UI components)
- Acceptance criteria derived from spec.md user stories
- Testing tasks for each component
- Documentation updates

**Implementation Readiness**:
- ✅ All technical unknowns resolved
- ✅ API contracts documented with examples
- ✅ Data model extends existing types cleanly
- ✅ Zero breaking changes to existing features
- ✅ Constitution compliance verified twice

---

## Summary

**Planning Complete**: All Phase 0 and Phase 1 artifacts generated.

**Key Decisions**:
1. OAuth scope upgrade to full read/write (`spreadsheets`)
2. Google Sheets API v4 batch update for efficiency
3. Row number tracking for reliable update targeting
4. Composable-based change tracking (Vue 3 pattern)
5. FAB-style push button with pending count badge

**Files Modified**: 6 (google.ts, useGoogleAuth.ts, useRumoursFromGoogle.ts, useRumourDrag.js, rumour.ts, App.vue)  
**Files Created**: 3 (useRumourUpdates.ts, PushUpdatesButton.vue, tests)  
**Dependencies Added**: 0 (uses existing gapi-script)

**Ready for**: `/speckit.tasks` command to generate implementation task list.
