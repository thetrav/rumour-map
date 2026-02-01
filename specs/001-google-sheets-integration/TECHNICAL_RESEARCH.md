# Technical Research: Google Sheets Integration

**Research Date**: 2026-02-01  
**Purpose**: Inform implementation decisions for Google Sheets integration with OAuth2 authentication

---

## 1. Vitest Setup for Vue 3 + TypeScript

### Decision: Use Vitest with @vue/test-utils

**Rationale**: Vitest is specifically designed for Vite-based projects, offers native TypeScript support, and is officially recommended by the Vue team. It's faster than Jest and integrates seamlessly with existing Vite configuration.

### Implementation Details

#### Package Dependencies

```json
{
  "devDependencies": {
    "vitest": "^2.1.8",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^15.11.7"
  }
}
```

**Alternatives Considered**:
- `jsdom`: More mature DOM implementation but slower than happy-dom
- `@vitest/ui`: Optional UI for test visualization (recommended for debugging)

#### Vite Configuration Changes

**File**: `vite.config.js` → rename to `vite.config.ts`

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/rumour-map/',
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.spec.ts',
        'src/**/*.test.ts'
      ]
    }
  }
})
```

**Key Configuration Options**:
- `globals: true` - Makes test functions (`describe`, `it`, `expect`) available globally without imports
- `environment: 'happy-dom'` - Lightweight DOM implementation for component testing
- `coverage.provider: 'v8'` - Built-in V8 coverage (faster than Istanbul)

**Alternative**: Create separate `vitest.config.ts` for isolated test configuration, but official docs recommend using same file for simplicity.

#### Test File Patterns

**Location**: Place tests alongside source files or in `src/__tests__/` directory

**Naming Convention**: `*.spec.ts` or `*.test.ts`

**Example Test Structure**:

```typescript
// src/composables/useRumoursFromGoogle.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRumoursFromGoogle } from './useRumoursFromGoogle'

describe('useRumoursFromGoogle', () => {
  beforeEach(() => {
    // Mock Google API calls
    vi.clearAllMocks()
  })

  it('should fetch rumours from Google Sheets', async () => {
    // Test implementation
  })
})
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:once": "vitest run"
  }
}
```

### TypeScript Configuration

No special `tsconfig.json` changes required for basic Vitest setup. Existing Vue 3 TypeScript config works. However, if globals are disabled:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

---

## 2. Google Sheets API Best Practices

### Decision: Use Google Identity Services (GIS) + gapi-script

**Rationale**: Google's official JavaScript quickstart uses this hybrid approach. The project already has `gapi-script` installed. GIS handles modern OAuth2 with PKCE, while gapi provides the Sheets API client.

### API Architecture

#### Modern Approach (Recommended)

1. **Google Identity Services (GIS)** - For OAuth2 authentication
2. **Google API JavaScript Client (gapi)** - For API requests

**Why Not `@google-cloud` libraries?**
- `@google-cloud` packages are designed for server-side Node.js applications
- They require service account credentials, not suitable for client-side apps
- GIS + gapi is the official pattern for browser-based applications

#### OAuth2 Flow Structure

```typescript
// Initialize gapi client
await gapi.client.init({
  apiKey: API_KEY,
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
})

// Initialize GIS token client
const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  callback: '', // defined later
})

// Request access token
tokenClient.requestAccessToken({ prompt: 'consent' })
```

**Key Points**:
- Read-only scope: `https://www.googleapis.com/auth/spreadsheets.readonly`
- API key for public data (optional, but recommended for rate limiting)
- Client ID from Google Cloud Console OAuth2 credentials

### Data Fetching Pattern

#### Type-Safe API Calls

```typescript
interface RumourRow {
  session_date: string
  game_date: string
  location_heard: string
  location_targetted: string
  X: number
  Y: number
  title: string
  rating: number
  resolved: boolean
  details: string
}

async function fetchRumours(spreadsheetId: string): Promise<RumourRow[]> {
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A2:J', // Adjust based on actual sheet name and columns
    })

    const rows = response.result.values || []
    return rows.map(parseRumourRow).filter(Boolean)
  } catch (error) {
    console.error('Failed to fetch rumours:', error)
    throw new Error('Unable to fetch rumours from Google Sheets')
  }
}

function parseRumourRow(row: any[]): RumourRow | null {
  if (row.length < 10) return null
  
  const [session_date, game_date, location_heard, location_targetted, 
         x, y, title, rating, resolved, details] = row
  
  // Validate required fields
  if (!title || isNaN(Number(x)) || isNaN(Number(y))) {
    console.warn('Skipping invalid row:', row)
    return null
  }

  return {
    session_date: session_date || '',
    game_date: game_date || '',
    location_heard: location_heard || '',
    location_targetted: location_targetted || '',
    X: Number(x),
    Y: Number(y),
    title,
    rating: Number(rating) || 0,
    resolved: resolved === 'TRUE' || resolved === 'true' || resolved === true,
    details: details || ''
  }
}
```

### Rate Limiting & Error Handling

#### Rate Limits (Google Sheets API v4)
- **Read requests**: 100 requests per 100 seconds per user
- **Per-project quota**: 500 requests per 100 seconds

**Mitigation Strategy**:
1. Cache responses in memory
2. Implement manual refresh instead of polling
3. Use batch API calls for multiple ranges if needed

#### Error Handling Pattern

```typescript
interface FetchState {
  data: RumourRow[]
  loading: boolean
  error: string | null
}

async function loadRumours(state: FetchState) {
  state.loading = true
  state.error = null
  
  try {
    state.data = await fetchRumours(SPREADSHEET_ID)
  } catch (err) {
    if (err instanceof Error) {
      // Network errors
      if (err.message.includes('fetch')) {
        state.error = 'Network error. Please check your connection.'
      }
      // Permission errors (401, 403)
      else if (err.message.includes('403')) {
        state.error = 'Permission denied. Please authorize access.'
      }
      // Not found (404)
      else if (err.message.includes('404')) {
        state.error = 'Spreadsheet not found. Please check configuration.'
      }
      else {
        state.error = 'Unable to load rumours. Please try again.'
      }
    }
  } finally {
    state.loading = false
  }
}
```

### Configuration Management

**Approach**: Use environment variables for sensitive data

```typescript
// vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_API_KEY: string
  readonly VITE_SPREADSHEET_ID: string
}

// Usage
const config = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
}
```

**Environment Files**:
- `.env.local` (gitignored) - for development credentials
- `.env.production` - for production credentials (stored in CI/CD secrets)

---

## 3. OAuth2 Client-Side Security

### Decision: Memory + sessionStorage with PKCE

**Rationale**: Balance security with user experience. Access tokens in memory (most secure), refresh tokens in sessionStorage (convenience), and PKCE for security without client secrets.

### Token Storage Strategy

#### Access Tokens: Store in Memory Only

```typescript
class TokenManager {
  private accessToken: string | null = null
  private tokenExpiry: number | null = null

  setToken(token: string, expiresIn: number) {
    this.accessToken = token
    this.tokenExpiry = Date.now() + (expiresIn * 1000)
  }

  getToken(): string | null {
    if (this.tokenExpiry && Date.now() > this.tokenExpiry) {
      this.clearToken()
      return null
    }
    return this.accessToken
  }

  clearToken() {
    this.accessToken = null
    this.tokenExpiry = null
  }

  isExpired(): boolean {
    return this.tokenExpiry ? Date.now() > this.tokenExpiry : true
  }
}
```

**Why Not localStorage?**
- ❌ Vulnerable to XSS attacks
- ❌ Persists after browser close (privacy concern)
- ❌ Accessible by all scripts on same origin

**Why Not sessionStorage?**
- ⚠️ Still vulnerable to XSS (better than localStorage)
- ✅ Cleared on tab close (better privacy)
- ❌ Accessible by all scripts on same origin

**Why Memory?**
- ✅ Most secure - not accessible via JavaScript injection
- ✅ Cleared on page refresh (user must re-authenticate)
- ✅ XSS-proof
- ⚠️ Requires re-authentication on refresh

#### User Authentication State: sessionStorage

For user convenience, store non-sensitive authentication state:

```typescript
interface AuthState {
  isAuthenticated: boolean
  userEmail: string | null
  lastAuthTime: number
}

function saveAuthState(state: AuthState) {
  sessionStorage.setItem('auth_state', JSON.stringify(state))
}

function loadAuthState(): AuthState | null {
  const stored = sessionStorage.getItem('auth_state')
  return stored ? JSON.parse(stored) : null
}
```

**What to Store**:
- ✅ User email (for display)
- ✅ Authentication timestamp
- ✅ Selected scopes
- ❌ Access tokens
- ❌ Refresh tokens (Google GIS handles this internally)

### PKCE (Proof Key for Code Exchange)

**Required**: Yes, Google Identity Services implements PKCE automatically

**How GIS Handles PKCE**:
```typescript
// PKCE is built into google.accounts.oauth2.initTokenClient
// No manual implementation needed
const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: CLIENT_ID,
  scope: SCOPES,
  callback: handleTokenResponse,
})

// When requestAccessToken is called, GIS:
// 1. Generates code_verifier (random string)
// 2. Creates code_challenge (SHA256 hash of verifier)
// 3. Sends code_challenge to auth endpoint
// 4. Receives auth code
// 5. Sends code_verifier to token endpoint
// 6. Receives access token
```

**Manual PKCE Implementation** (if not using GIS):
```typescript
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64URLEncode(array)
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64URLEncode(new Uint8Array(hash))
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
```

### Token Refresh Pattern

**Google Identity Services Approach**:
```typescript
function refreshAccessToken() {
  // GIS handles token refresh automatically
  // Use silent refresh (no user interaction)
  tokenClient.requestAccessToken({ prompt: '' })
}

// Check token expiry before API calls
async function makeAuthenticatedRequest() {
  const token = tokenManager.getToken()
  
  if (!token || tokenManager.isExpired()) {
    await new Promise((resolve) => {
      tokenClient.callback = resolve
      tokenClient.requestAccessToken({ prompt: '' })
    })
  }
  
  // Proceed with API call
  return gapi.client.sheets.spreadsheets.values.get({...})
}
```

### Security Checklist

- ✅ Use HTTPS in production (required for OAuth2)
- ✅ Implement PKCE (handled by GIS)
- ✅ Store access tokens in memory only
- ✅ Use read-only OAuth scopes
- ✅ Implement proper CORS headers on API endpoints
- ✅ Add Content Security Policy headers
- ✅ Validate redirect URIs in Google Cloud Console
- ✅ Sanitize user input before rendering
- ✅ Use SameSite cookies if using cookie-based sessions
- ✅ Implement rate limiting awareness

**CSP Headers for Production**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://apis.google.com https://accounts.google.com; 
               connect-src 'self' https://sheets.googleapis.com https://oauth2.googleapis.com;
               frame-src https://accounts.google.com;">
```

---

## 4. TypeScript Migration Strategy

### Decision: Gradual Migration with Co-existing .js and .ts Files

**Rationale**: Minimize risk by allowing incremental migration. TypeScript and JavaScript can coexist in Vue 3 projects using Vite without issues.

### File Coexistence Strategy

#### ✅ Supported: Mixed .js and .ts in src/composables/

Vite + Vue 3 fully supports this pattern:

```
src/composables/
├── useRumours.js           (existing, stays as-is)
├── useRumoursFromGoogle.ts (new, TypeScript)
├── useRumourDrag.js        (existing, stays as-is)
└── useGoogleAuth.ts        (new, TypeScript)
```

**Import Compatibility**:
```typescript
// TypeScript file can import JavaScript
import { useRumours } from './useRumours.js' // Works fine

// JavaScript file can import TypeScript
import { useRumoursFromGoogle } from './useRumoursFromGoogle.ts' // Works fine
```

**Note**: Include `.js` extension when importing JavaScript from TypeScript for better IDE support.

### Typing Vue Composables with Reactive Refs

#### Pattern 1: Explicit Return Types

```typescript
import { ref, Ref, ComputedRef, computed } from 'vue'

interface Rumour {
  id: string
  x: number
  y: number
  title: string
  description: string
  isPinned: boolean
}

interface UseRumoursReturn {
  rumours: Ref<Rumour[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  loadRumours: () => Promise<void>
  totalCount: ComputedRef<number>
}

export function useRumoursFromGoogle(): UseRumoursReturn {
  const rumours = ref<Rumour[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const loadRumours = async () => {
    isLoading.value = true
    error.value = null
    try {
      const data = await fetchFromGoogleSheets()
      rumours.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  const totalCount = computed(() => rumours.value.length)

  return {
    rumours,
    isLoading,
    error,
    loadRumours,
    totalCount,
  }
}
```

#### Pattern 2: Generic Ref Typing

```typescript
// When type inference is sufficient
const count = ref(0) // Ref<number> inferred
const name = ref('') // Ref<string> inferred

// When explicit generic is needed
const data = ref<Rumour[]>([]) // Explicit Ref<Rumour[]>
const user = ref<User | null>(null) // Union types require explicit

// Avoid `undefined` unless necessary
const maybeNumber = ref<number>() // Ref<number | undefined>
const definiteNumber = ref<number>(0) // Ref<number>
```

#### Pattern 3: Readonly Refs for Encapsulation

```typescript
import { ref, readonly, Ref, DeepReadonly } from 'vue'

export function useRumoursFromGoogle() {
  const rumours = ref<Rumour[]>([])
  const isLoading = ref(false)

  // Private mutation methods
  const setRumours = (data: Rumour[]) => {
    rumours.value = data
  }

  return {
    // Expose readonly refs to prevent external mutation
    rumours: readonly(rumours),
    isLoading: readonly(isLoading),
    // Expose controlled mutation methods
    loadRumours,
    refreshRumours,
  }
}
```

### Recommended tsconfig.json for Vue 3 + Vite

```json
{
  "compilerOptions": {
    // Target modern environments
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    
    // Module resolution for Vite
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    
    // Interop with JavaScript
    "allowJs": true,
    "checkJs": false, // Don't type-check .js files initially
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Strictness (gradually enable)
    "strict": false, // Start false, enable later
    "noImplicitAny": false, // Enable once codebase is mostly typed
    "strictNullChecks": false, // Enable in phase 2
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    
    // Vue specific
    "jsx": "preserve",
    "jsxImportSource": "vue",
    
    // Vite compatibility
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    
    // Output
    "skipLibCheck": true,
    "noEmit": true,
    
    // Path aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "src/**/*.js" // Include JS files for IDE support
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### Migration Phases

#### Phase 1: New Features in TypeScript
- ✅ Write all new composables in TypeScript
- ✅ Create type definitions for existing interfaces
- ✅ Leave existing `.js` files untouched

**Files to Create**:
- `src/composables/useRumoursFromGoogle.ts`
- `src/composables/useGoogleAuth.ts`
- `src/types/rumour.ts` (shared type definitions)

#### Phase 2: Migrate Core Composables
- Convert `useRumours.js` → `useRumours.ts`
- Convert `useRumourDrag.js` → `useRumourDrag.ts`
- Enable `strict: true` in tsconfig

#### Phase 3: Migrate Components
- Convert `.vue` files to use `<script setup lang="ts">`
- Add prop types using `defineProps<PropTypes>()`
- Enable `strictNullChecks: true`

### Shared Type Definitions

**File**: `src/types/rumour.ts`

```typescript
export interface RumourBase {
  title: string
  description: string
  x: number
  y: number
}

export interface RumourFromPSV extends RumourBase {
  id: string
  isPinned: boolean
}

export interface RumourFromGoogleSheets extends RumourBase {
  session_date: string
  game_date: string
  location_heard: string
  location_targetted: string
  rating: number
  resolved: boolean
  details: string
}

// Unified type for display
export type Rumour = RumourFromPSV | RumourFromGoogleSheets

// Type guards
export function isGoogleSheetsRumour(
  rumour: Rumour
): rumour is RumourFromGoogleSheets {
  return 'resolved' in rumour
}
```

### JavaScript to TypeScript Conversion Example

**Before** (`useRumours.js`):
```javascript
import { ref, onMounted } from 'vue'

export function useRumours() {
  const rumours = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const parsePSV = (text) => {
    return text.split('\n').map(line => {
      const [id, x, y, title, description] = line.split('|')
      return { id, x: parseFloat(x), y: parseFloat(y), title, description }
    })
  }

  const loadRumours = async () => {
    isLoading.value = true
    try {
      const response = await fetch('/rumours.psv')
      const text = await response.text()
      rumours.value = parsePSV(text)
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  onMounted(loadRumours)

  return { rumours, isLoading, error }
}
```

**After** (`useRumours.ts`):
```typescript
import { ref, onMounted, Ref } from 'vue'
import type { RumourFromPSV } from '@/types/rumour'

interface UseRumoursReturn {
  rumours: Ref<RumourFromPSV[]>
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

export function useRumours(): UseRumoursReturn {
  const rumours = ref<RumourFromPSV[]>([])
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  const parsePSV = (text: string): RumourFromPSV[] => {
    return text.split('\n').map(line => {
      const [id, x, y, title, description] = line.split('|')
      return {
        id,
        x: parseFloat(x),
        y: parseFloat(y),
        title,
        description,
        isPinned: true,
      }
    })
  }

  const loadRumours = async (): Promise<void> => {
    isLoading.value = true
    try {
      const response = await fetch('/rumours.psv')
      const text = await response.text()
      rumours.value = parsePSV(text)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load rumours'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(loadRumours)

  return { rumours, isLoading, error }
}
```

---

## Summary of Decisions

| Area | Decision | Rationale | Key Dependencies |
|------|----------|-----------|------------------|
| **Testing** | Vitest + @vue/test-utils + happy-dom | Official Vue recommendation, fast, Vite-native | `vitest`, `@vue/test-utils`, `happy-dom` |
| **Google Sheets API** | GIS + gapi-script hybrid | Official Google pattern for browser apps | `gapi-script` (existing) |
| **OAuth2 Security** | Memory storage + PKCE via GIS | Best security/UX balance, XSS protection | Built into GIS |
| **TypeScript Migration** | Gradual coexistence strategy | Low risk, incremental adoption | None (Vite native support) |

## Next Steps

1. **Install Vitest dependencies**: `npm install -D vitest @vue/test-utils happy-dom`
2. **Update vite.config.js** to include test configuration
3. **Add tsconfig.json** with recommended settings
4. **Create type definitions** in `src/types/rumour.ts`
5. **Implement OAuth2 flow** using GIS pattern
6. **Create `useRumoursFromGoogle.ts`** composable
7. **Write unit tests** for data parsing and transformation logic
8. **Set up environment variables** for API credentials
9. **Configure CSP headers** for production security
10. **Document API rate limits** and error handling for users

## References

- [Vitest Guide](https://vitest.dev/guide/)
- [Google Sheets API JavaScript Quickstart](https://developers.google.com/sheets/api/quickstart/js)
- [Vue.js TypeScript Documentation](https://vuejs.org/guide/typescript/overview.html)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [@vue/test-utils Documentation](https://test-utils.vuejs.org/)
