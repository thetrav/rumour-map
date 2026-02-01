# Technical Research: Google Sheets Integration

**Date**: 2026-02-01  
**Feature**: [spec.md](spec.md)  
**Status**: Complete

## Overview

This document captures research findings for four critical technical decisions needed to implement Google Sheets integration with OAuth2 authentication in the Vue 3 rumour-map application.

---

## 1. Vitest Setup for Vue 3 + TypeScript

### Decision
Use Vitest with `@vue/test-utils` and `happy-dom` as the testing environment.

### Rationale
- **Native Vite Integration**: Vitest is built by the Vite team and shares the same configuration, reducing setup complexity
- **Fast Execution**: Leverages Vite's transformation pipeline for instant test startup
- **TypeScript Support**: Zero-config TypeScript support, no additional ts-jest required
- **Vue 3 Compatible**: `@vue/test-utils` v2 designed specifically for Vue 3 Composition API
- **Constitution Compliance**: Matches constitution Section 2.2 requirement

### Alternatives Considered
- **Jest**: Rejected - requires additional babel/ts-jest configuration, slower startup, ESM module issues with Vue 3
- **Cypress Component Testing**: Rejected - overkill for unit tests, requires Chromium, slower feedback loop
- **No testing framework**: Rejected - violates constitution Section 2.2

### Implementation

**Dependencies to add**:
```json
{
  "devDependencies": {
    "vitest": "^1.2.0",
    "@vue/test-utils": "^2.4.3",
    "happy-dom": "^13.3.0"
  }
}
```

**Rename `vite.config.js` to `vite.config.ts`** and add test configuration:
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/rumour-map/',
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'], // optional
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
```

**Add test script to package.json**:
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

**Example test structure** (`tests/unit/useGoogleAuth.spec.ts`):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useGoogleAuth } from '@/composables/useGoogleAuth'

describe('useGoogleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with unauthenticated state', () => {
    const { isAuthenticated } = useGoogleAuth()
    expect(isAuthenticated.value).toBe(false)
  })
})
```

---

## 2. Google Sheets API Best Practices

### Decision
Use **Google Identity Services (GIS)** for OAuth2 + **gapi-script** for Sheets API calls, with memory-based response caching.

### Rationale
- **GIS (Token Client)**: Modern OAuth2 library with automatic PKCE, replaces deprecated Google Sign-In
- **gapi-script**: Still required for actual Sheets API calls (GIS only handles auth)
- **Read-Only Scope**: Minimal permissions (`https://www.googleapis.com/auth/spreadsheets.readonly`)
- **Client-Side Appropriate**: Designed for browser-based apps, no backend proxy needed
- **Rate Limit Mitigation**: Google Sheets API allows 100 requests per 100 seconds per user - caching prevents repeated fetches

### Alternatives Considered
- **@google-cloud/sheets**: Rejected - designed for Node.js server-side, not browser
- **Direct CSV export URL**: Rejected - doesn't support private sheets or OAuth2, less structured data
- **Service Account**: Rejected - requires backend proxy to hide credentials, violates "single-page app" constraint

### Implementation

**Load GIS library** (in `index.html`):
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

**Configuration** (`src/config/google.ts`):
```typescript
export const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
}
```

**Environment variables** (`.env.local` - not committed):
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_SPREADSHEET_ID=your-sheet-id
```

**Fetching data pattern**:
```typescript
const response = await gapi.client.sheets.spreadsheets.values.get({
  spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
  range: 'Sheet1!A2:J', // Skip header row, all columns
})

const rows = response.result.values || []
```

**Error handling**:
- 401 Unauthorized → trigger re-authentication
- 403 Forbidden → user lacks sheet access, show permission error
- 429 Rate Limit → use cached data, show "refresh in X seconds" message
- 404 Not Found → spreadsheet ID invalid, configuration error

**Caching strategy**:
```typescript
// In-memory cache with timestamp
let cachedData: Rumour[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute

const fetchRumours = async () => {
  const now = Date.now()
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedData
  }
  
  // Fetch fresh data
  const data = await fetchFromGoogleSheets()
  cachedData = data
  cacheTimestamp = now
  return data
}
```

---

## 3. OAuth2 Client-Side Security

### Decision
Store access tokens **in memory only** (JavaScript variable). Use `sessionStorage` for non-sensitive auth state (e.g., "user has authenticated this session").

### Rationale
- **XSS Protection**: Tokens in memory cannot be stolen by injected scripts accessing localStorage/sessionStorage
- **Short-Lived**: Access tokens expire in ~1 hour, limiting exposure window
- **PKCE Automatic**: GIS implements PKCE by default, preventing authorization code interception
- **Session-Scoped**: User must re-authenticate per browser session (security > convenience)

### Alternatives Considered
- **localStorage**: Rejected - vulnerable to XSS attacks, tokens persist across sessions
- **sessionStorage**: Rejected - still accessible to XSS, though better than localStorage
- **Secure Cookie**: Rejected - requires backend server to set HttpOnly flag
- **IndexedDB**: Rejected - same XSS vulnerability as localStorage

### Implementation

**Token storage** (`src/composables/useGoogleAuth.ts`):
```typescript
// In-memory only - no persistence
let accessToken: string | null = null

export function useGoogleAuth() {
  const isAuthenticated = ref(false)
  
  const handleCredentialResponse = (response: any) => {
    accessToken = response.access_token // Store in memory
    isAuthenticated.value = true
    sessionStorage.setItem('auth_state', 'authenticated') // Non-sensitive flag
  }
  
  const getAccessToken = (): string | null => {
    return accessToken // Never stored in localStorage/sessionStorage
  }
  
  const signOut = () => {
    accessToken = null
    isAuthenticated.value = false
    sessionStorage.removeItem('auth_state')
  }
  
  return { isAuthenticated, getAccessToken, signOut }
}
```

**Security checklist**:
- ✅ Tokens stored in memory (JavaScript closure)
- ✅ No sensitive data in localStorage/sessionStorage
- ✅ PKCE enabled (automatic with GIS)
- ✅ HTTPS required in production
- ⚠️ Add Content Security Policy headers (prevents XSS injection)
- ⚠️ Implement token refresh before expiry (Google tokens expire in ~1 hour)

**CSP headers** (for production deployment):
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://accounts.google.com https://apis.google.com;
  connect-src 'self' https://sheets.googleapis.com;
  frame-src https://accounts.google.com;
```

**Token refresh pattern**:
```typescript
// Check token expiry before API calls
if (isTokenExpired()) {
  await refreshToken() // Triggers re-auth flow
}
```

---

## 4. TypeScript Migration Strategy

### Decision
Allow **.js and .ts files to coexist** in `src/composables/`. Start with new features in TypeScript, gradually migrate existing composables as they're touched.

### Rationale
- **Low Risk**: TypeScript compiler handles mixed codebases gracefully
- **Incremental Progress**: No "big bang" migration, reduces merge conflicts
- **Constitution Compliance**: Section 8 requires TypeScript, gradual adoption is acceptable path
- **Developer Productivity**: Team can learn TypeScript patterns while delivering features

### Alternatives Considered
- **All-at-once migration**: Rejected - high risk, blocks feature development
- **Maintain JavaScript**: Rejected - violates constitution Section 8
- **Separate TypeScript branch**: Rejected - creates long-lived divergence, merge complexity

### Implementation

**Add TypeScript support** (install if not present):
```bash
npm install -D typescript @types/node
```

**Create `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "strict": false,  // Start permissive, enable later
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowJs": true,  // Critical: allows .js files
    "checkJs": false, // Don't type-check .js files yet
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

**Vue shim** (`src/shims-vue.d.ts`):
```typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

**Typed composable pattern**:
```typescript
// src/composables/useRumourFilter.ts
import { ref, computed, type Ref } from 'vue'
import type { Rumour } from '@/types/rumour'

export function useRumourFilter(rumours: Ref<Rumour[]>) {
  const filterMode = ref<'all' | 'resolved' | 'unresolved'>('all')
  
  const filteredRumours = computed<Rumour[]>(() => {
    if (filterMode.value === 'all') return rumours.value
    const isResolved = filterMode.value === 'resolved'
    return rumours.value.filter(r => r.resolved === isResolved)
  })
  
  const setFilter = (mode: 'all' | 'resolved' | 'unresolved'): void => {
    filterMode.value = mode
  }
  
  return {
    filterMode,
    filteredRumours,
    setFilter
  }
}
```

**Type definitions** (`src/types/rumour.ts`):
```typescript
export interface Rumour {
  id: string
  session_date: string
  game_date: string
  location_heard: string
  location_targetted: string
  x: number
  y: number
  title: string
  rating: number
  resolved: boolean
  details: string
  // Existing fields for UI state
  isPinned: boolean
  isHovered: boolean
  isHidden: boolean
  isDragging: boolean
}

export interface GoogleSheetsRow {
  session_date: string
  game_date: string
  location_heard: string
  location_targetted: string
  X: string // Parsed to number
  Y: string // Parsed to number
  title: string
  rating: string // Parsed to number
  resolved: string // Parsed to boolean
  details: string
}
```

**Migration phases**:
1. **Phase 1** (this feature): Create new composables in TypeScript (`useGoogleAuth.ts`, `useRumoursFromGoogle.ts`, `useRumourFilter.ts`)
2. **Phase 2**: Migrate `useRumours.js` → `useRumours.ts` when modifying for Google Sheets integration
3. **Phase 3**: Migrate `useRumourDrag.js` → `useRumourDrag.ts` when touched in future features
4. **Phase 4**: Enable `strict: true` in tsconfig.json once all files migrated

**Import compatibility**:
```typescript
// TypeScript files can import JavaScript files
import { useRumourDrag } from './useRumourDrag' // .js file, works fine

// JavaScript files can import TypeScript files
import { useGoogleAuth } from './useGoogleAuth' // .ts file, Vite handles it
```

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| **Testing** | Vitest + @vue/test-utils + happy-dom | Native Vite integration, fast, TypeScript ready |
| **Google API** | GIS (OAuth2) + gapi-script (Sheets) | Modern auth, read-only access, client-side compatible |
| **Token Storage** | In-memory only, sessionStorage for flags | XSS protection, PKCE automatic, session-scoped |
| **TypeScript** | Coexist .js/.ts, new features in TS | Low risk, incremental, constitution compliant |

---

## Next Steps

1. ✅ Update Technical Context in plan.md to remove "NEEDS CLARIFICATION" for testing
2. ✅ Proceed to Phase 1: Generate data-model.md, contracts/, quickstart.md
3. Install dependencies identified in this research
4. Set up Vitest configuration
5. Create TypeScript type definitions
6. Implement OAuth2 flow with GIS + gapi-script
