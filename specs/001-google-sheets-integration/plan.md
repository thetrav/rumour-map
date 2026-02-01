# Implementation Plan: Google Sheets Rumour Repository

**Branch**: `001-google-sheets-integration` | **Date**: 2026-02-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-google-sheets-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace static PSV file data source with Google Sheets integration using OAuth2 authentication. Users sign in with their Google account to fetch rumour data with extended schema including session dates, game dates, locations, ratings, and resolution status. Includes filtering by resolution status and manual refresh capability.

## Technical Context

**Language/Version**: TypeScript (via Vue 3 with TypeScript support), JavaScript ES2020+ (gradual migration)
**Primary Dependencies**: Vue 3.5.24, gapi-script 1.2.0 (Google Sheets API), Google Identity Services (OAuth2), Vite 7.2.4, Tailwind CSS 3.4.19
**Storage**: Google Sheets (external API), browser memory (OAuth tokens), sessionStorage (auth state flags), localStorage (filter preferences)
**Testing**: Vitest 1.2+ with @vue/test-utils 2.4+ and happy-dom (see research.md for setup details)
**Target Platform**: Web browsers (Chrome, Firefox, Safari - last 2 versions per constitution Section 5.2), HTTPS required for OAuth2
**Project Type**: Single-page web application (Vue.js SPA)
**Performance Goals**: 60fps during interactions, <3 seconds data fetch from Google Sheets, <500ms filter updates (per spec success criteria)
**Constraints**: <200KB bundle size (gzipped per constitution Section 4.1), OAuth2 integration complexity, read-only Google Sheets access, 100 requests/100 seconds API rate limit
**Scale/Scope**: Up to 500 rumours without performance degradation (per spec SC-004), single sheet data source, 10 fields per rumour

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (with action items)

| Requirement | Status | Notes |
|-------------|--------|-------|
| TypeScript (Section 8) | ⚠️ ACTION | Current codebase uses JavaScript. Must convert composables to TypeScript as part of this feature |
| Vue 3 Composition API (Section 1.2) | ✅ PASS | Already using `<script setup>` consistently |
| Tailwind CSS (Section 8) | ✅ PASS | Already configured and in use |
| Component <300 lines (Section 1.3) | ✅ PASS | Existing components comply, new components will follow |
| Vitest Testing (Section 2.2) | ⚠️ ACTION | Not currently configured. Must add Vitest setup for this feature |
| 60fps Performance (Section 4.2) | ✅ PASS | Design maintains existing pan/zoom performance, filters optimized |
| Browser Support (Section 5.2) | ✅ PASS | OAuth2 and Google Sheets API supported in target browsers |
| <200KB Bundle (Section 4.1) | ⚠️ MONITOR | gapi-script adds ~50KB. Must verify total bundle stays under limit |

**Action Items Before Implementation**:
1. Set up Vitest testing framework and write tests for OAuth2 flow and data fetching
2. Convert existing useRumours.js to TypeScript (.ts extension with proper types)
3. Create TypeScript interfaces for new Google Sheets data schema
4. Verify bundle size after adding gapi-script dependency

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── PanZoomMap.vue              # Existing: map container
│   ├── RumourMarker.vue            # Existing: individual marker display
│   ├── RumourOverlay.vue           # Existing: marker container
│   └── GoogleAuthButton.vue        # NEW: OAuth2 sign-in UI
├── composables/
│   ├── useRumours.ts               # MODIFIED: refactored from .js, now fetches from Google Sheets
│   ├── useRumoursFromGoogle.ts     # NEW: Google Sheets API integration
│   ├── useGoogleAuth.ts            # NEW: OAuth2 authentication flow
│   ├── useRumourDrag.js            # Existing: drag-and-drop logic
│   └── useRumourFilter.ts          # NEW: filter rumours by resolution status
├── types/
│   └── rumour.ts                   # NEW: TypeScript interfaces for rumour data
├── config/
│   └── google.ts                   # NEW: Google API configuration (client ID, scopes)
├── App.vue                         # MODIFIED: add auth state management
├── main.js                         # Existing: app entry point
└── style.css                       # Existing: global styles

tests/                              # NEW: testing infrastructure
├── unit/
│   ├── useGoogleAuth.spec.ts
│   ├── useRumoursFromGoogle.spec.ts
│   └── useRumourFilter.spec.ts
└── integration/
    └── google-sheets-integration.spec.ts

public/
├── rumours.psv                     # DEPRECATED: replaced by Google Sheets
└── privacy.html                    # Existing
```

**Structure Decision**: Single project structure maintained. New composables follow existing pattern (src/composables/). TypeScript files added alongside JavaScript files for gradual migration. Testing infrastructure added as new top-level tests/ directory per Vitest conventions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

_No constitution violations requiring justification. All action items are compliance tasks (TypeScript migration, Vitest setup) that align with existing constitution requirements._

---

## Phase 0: Research (Complete)

**Status**: ✅ Complete

**Artifacts Created**:
- [research.md](research.md) - Technical research covering Vitest setup, Google Sheets API patterns, OAuth2 security, and TypeScript migration strategy

**Key Decisions**:
1. **Testing**: Vitest + @vue/test-utils + happy-dom (native Vite integration)
2. **Google API**: Google Identity Services (OAuth2) + gapi-script (Sheets API)
3. **Token Storage**: In-memory only (XSS protection), sessionStorage for non-sensitive flags
4. **TypeScript**: Gradual migration with .js/.ts coexistence

---

## Phase 1: Design & Contracts (Complete)

**Status**: ✅ Complete

**Artifacts Created**:
- [data-model.md](data-model.md) - Data structures, transformation rules, validation logic
- [contracts/google-sheets-api.md](contracts/google-sheets-api.md) - API contracts, error codes, rate limits
- [quickstart.md](quickstart.md) - Developer setup guide with step-by-step instructions

**Key Design Decisions**:
1. **Schema**: 10-field rumour model (session_date, game_date, locations, X, Y, title, rating, resolved, details)
2. **Validation**: Required fields (title, X, Y), coordinate clamping, type coercion for booleans
3. **Caching**: 60-second in-memory cache to mitigate rate limits (100 req/100sec)
4. **Error Handling**: User-friendly messages for 401, 403, 404, 429 errors with retry logic

---

## Post-Phase 1 Constitution Re-Check

**Status**: ✅ PASS - All gates satisfied

| Requirement | Status | Phase 1 Impact |
|-------------|--------|----------------|
| TypeScript (Section 8) | ✅ READY | Type definitions created in data-model.md, implementation will use .ts files |
| Vue 3 Composition API (Section 1.2) | ✅ PASS | Design uses composables pattern consistently |
| Tailwind CSS (Section 8) | ✅ PASS | No styling changes needed, existing patterns maintained |
| Component <300 lines (Section 1.3) | ✅ PASS | GoogleAuthButton estimated <100 lines, other components remain under limit |
| Vitest Testing (Section 2.2) | ✅ READY | Research completed, quickstart includes setup steps, test structure defined |
| 60fps Performance (Section 4.2) | ✅ PASS | Caching and debouncing prevent performance degradation |
| Browser Support (Section 5.2) | ✅ PASS | Google APIs supported in all target browsers |
| <200KB Bundle (Section 4.1) | ✅ PASS | gapi-script ~50KB, total estimated ~180KB (within limits) |

**Updated Action Items** (from pre-implementation phase):
1. ✅ Vitest setup documented in quickstart.md
2. ✅ TypeScript interfaces defined in data-model.md  
3. ✅ Implementation guide provides step-by-step conversion plan
4. ⚠️ Bundle size verification must occur during implementation (estimated safe)

**Conclusion**: Design phase complete. No constitution violations. Ready to proceed to `/speckit.tasks` for task breakdown and implementation.

---

## Next Steps

1. ✅ **Phase 0 Complete**: Research document created, all NEEDS CLARIFICATION resolved
2. ✅ **Phase 1 Complete**: Data model, contracts, and quickstart guide created
3. ✅ **Agent Context Updated**: GitHub Copilot instructions updated with new technologies
4. ⏭️ **Phase 2 (Next)**: Run `/speckit.tasks` to generate implementation task breakdown

**Command to Continue**:
```
/speckit.tasks
```

This will create `tasks.md` with detailed, dependency-ordered implementation tasks based on the design artifacts created in this plan.
