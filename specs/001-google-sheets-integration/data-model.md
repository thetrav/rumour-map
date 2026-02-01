# Data Model: Google Sheets Rumour Repository

**Feature**: [spec.md](spec.md)  
**Date**: 2026-02-01  
**Status**: Draft

## Overview

This document defines the data structures for rumours loaded from Google Sheets, including the external schema (how data appears in Google Sheets), internal representation (TypeScript interfaces), and transformation rules.

---

## External Schema: Google Sheets

### Sheet Structure

**Sheet Name**: `Sheet1` (configurable via environment variable)  
**Header Row**: Row 1  
**Data Rows**: Row 2 onwards

| Column | Field Name | Data Type | Required | Constraints | Example |
|--------|------------|-----------|----------|-------------|---------|
| A | session_date | Date/String | No | ISO 8601 or regional format | "2025-12-15" or "15/12/2025" |
| B | game_date | String | No | Free text (in-game date) | "3rd of Leaffall, Year 1247" |
| C | location_heard | String | No | Max 200 chars | "The Broken Tavern, Westport" |
| D | location_targetted | String | No | Max 200 chars | "Ancient Tower, Northern Peaks" |
| E | X | Number | Yes | 0-6500 (pixel coordinate) | 1200 |
| F | Y | Number | Yes | 0-3600 (pixel coordinate) | 800 |
| G | title | String | Yes | 1-100 chars | "Dragon Sighting" |
| H | rating | Number | No | 0-10 | 7 |
| I | resolved | Boolean/String | No | TRUE/FALSE, Yes/No, 1/0 | TRUE or "Yes" or 1 |
| J | details | String | No | 1-500 chars | "Locals report seeing a large winged creature..." |

### Data Validation Rules

**Required Fields**:
- `title` (Column G) - Cannot be empty
- `X` (Column E) - Must be numeric, 0-6500
- `Y` (Column F) - Must be numeric, 0-3600

**Optional Fields**:
- All other fields can be empty/null
- Empty cells are treated as null in parsing

**Type Coercion**:
- `X`, `Y`, `rating`: Parsed as numbers, invalid values → skip row with warning
- `resolved`: "TRUE", "true", "Yes", "yes", "1" → `true`; "FALSE", "false", "No", "no", "0", empty → `false`
- Dates: Accepted as-is (string format), no strict validation

**Coordinate Clamping**:
- X values <0 or >6500 → clamp to 0 or 6500, log warning
- Y values <0 or >3600 → clamp to 0 or 3600, log warning

---

## Internal Schema: TypeScript Interfaces

### Core Data Interface

```typescript
/**
 * Rumour data structure loaded from Google Sheets
 * Includes both source data and UI state
 */
export interface Rumour {
  // Google Sheets source data
  id: string                  // Generated: row index or hash of data
  session_date: string | null // When rumour was recorded (session date)
  game_date: string | null    // In-game date/time
  location_heard: string | null // Where players heard the rumour
  location_targetted: string | null // Location rumour refers to
  x: number                   // Map X coordinate (0-6500)
  y: number                   // Map Y coordinate (0-3600)
  title: string               // Rumour title/summary
  rating: number | null       // Quality/importance rating (0-10)
  resolved: boolean           // Whether rumour is resolved
  details: string | null      // Full rumour description
  
  // UI state (not persisted)
  isPinned: boolean           // Whether marker is pinned
  isHovered: boolean          // Whether marker is being hovered
  isHidden: boolean           // Whether marker is hidden from view
  isDragging: boolean         // Whether marker is being dragged
}
```

### Google Sheets API Response

```typescript
/**
 * Raw row data from Google Sheets API
 * All values are strings until parsed
 */
export interface GoogleSheetsRow {
  session_date?: string       // Column A
  game_date?: string          // Column B
  location_heard?: string     // Column C
  location_targetted?: string // Column D
  X: string                   // Column E - parsed to number
  Y: string                   // Column F - parsed to number
  title: string               // Column G
  rating?: string             // Column H - parsed to number
  resolved?: string           // Column I - parsed to boolean
  details?: string            // Column J
}
```

### Filter State

```typescript
/**
 * Filter state for rumour display
 */
export interface RumourFilterState {
  mode: 'all' | 'resolved' | 'unresolved'
  count: {
    total: number
    resolved: number
    unresolved: number
  }
}
```

### Authentication State

```typescript
/**
 * OAuth2 authentication state
 */
export interface AuthState {
  isAuthenticated: boolean
  isInitializing: boolean
  error: string | null
  user: {
    email: string | null
    name: string | null
  } | null
}
```

### API Error Types

```typescript
/**
 * Google Sheets API error types
 */
export type SheetsApiErrorCode = 
  | 'UNAUTHORIZED'      // 401 - Auth token invalid/expired
  | 'FORBIDDEN'         // 403 - User lacks permission
  | 'NOT_FOUND'         // 404 - Spreadsheet not found
  | 'RATE_LIMIT'        // 429 - Too many requests
  | 'NETWORK_ERROR'     // Network/connection failure
  | 'PARSE_ERROR'       // Data parsing failure
  | 'UNKNOWN'           // Unexpected error

export interface SheetsApiError {
  code: SheetsApiErrorCode
  message: string
  userMessage: string      // User-friendly error description
  retryable: boolean       // Whether operation can be retried
  details?: any            // Original error object
}
```

---

## Data Transformation

### Parsing Pipeline

```
Google Sheets API Response
    ↓
Raw Values (string arrays)
    ↓
Type Conversion & Validation
    ↓
Rumour Objects with UI State
    ↓
Reactive Vue Refs
```

### Transformation Rules

**Row to Rumour Mapping**:
```typescript
function parseSheetRow(row: string[], index: number): Rumour | null {
  // Skip rows with missing required fields
  if (!row[6] || !row[4] || !row[5]) {
    console.warn(`Skipping row ${index + 2}: missing required fields`)
    return null
  }
  
  // Parse coordinates
  const x = parseFloat(row[4])
  const y = parseFloat(row[5])
  
  // Validate numeric coordinates
  if (isNaN(x) || isNaN(y)) {
    console.warn(`Skipping row ${index + 2}: invalid coordinates`)
    return null
  }
  
  // Clamp to map bounds
  const clampedX = Math.max(0, Math.min(6500, x))
  const clampedY = Math.max(0, Math.min(3600, y))
  
  // Parse rating (optional)
  const rating = row[7] ? parseFloat(row[7]) : null
  const validRating = rating !== null && !isNaN(rating) 
    ? Math.max(0, Math.min(10, rating)) 
    : null
  
  // Parse resolved status
  const resolvedStr = (row[8] || '').toLowerCase()
  const resolved = ['true', 'yes', '1'].includes(resolvedStr)
  
  return {
    id: `rumour_${index + 2}`, // Row number as ID
    session_date: row[0] || null,
    game_date: row[1] || null,
    location_heard: row[2] || null,
    location_targetted: row[3] || null,
    x: clampedX,
    y: clampedY,
    title: row[6].trim(),
    rating: validRating,
    resolved: resolved,
    details: row[9] || null,
    isPinned: true,
    isHovered: false,
    isHidden: false,
    isDragging: false
  }
}
```

---

## Entity Relationships

```
Google Sheets Document (1)
    │
    └─── Contains many ──→ Rumour Rows (N)
                               │
                               ├─ References ──→ Location Heard (implicit)
                               ├─ References ──→ Location Targetted (implicit)
                               └─ Belongs to ──→ Game Session (via session_date)
```

**No Explicit Foreign Keys**: Relationships are implicit through shared string values (location names, session dates). No referential integrity enforced.

---

## State Management

### Reactive State

```typescript
// Global rumour state (composable)
const rumours = ref<Rumour[]>([])
const isLoading = ref(false)
const error = ref<SheetsApiError | null>(null)
const lastFetchTime = ref<number | null>(null)

// Filter state (composable)
const filterMode = ref<'all' | 'resolved' | 'unresolved'>('all')

// Auth state (composable)
const isAuthenticated = ref(false)
const authError = ref<string | null>(null)
```

### Cache Strategy

**In-Memory Cache**:
- Cache duration: 60 seconds (configurable)
- Cache key: Spreadsheet ID
- Invalidation: Manual refresh or TTL expiry
- No persistent storage (fresh fetch on page reload)

---

## Validation Summary

| Field | Validation | Error Handling |
|-------|-----------|----------------|
| `title` | Required, non-empty | Skip row, log warning |
| `X` | Required, numeric, 0-6500 | Skip if invalid, clamp if out of bounds |
| `Y` | Required, numeric, 0-3600 | Skip if invalid, clamp if out of bounds |
| `rating` | Optional, numeric, 0-10 | Set to null if invalid, clamp if out of bounds |
| `resolved` | Optional, boolean-like | Default to false if invalid/empty |
| `session_date` | Optional, string | Accept any format, no validation |
| `game_date` | Optional, string | Accept any format, no validation |
| `location_heard` | Optional, string | Trim whitespace |
| `location_targetted` | Optional, string | Trim whitespace |
| `details` | Optional, string | Trim whitespace |

---

## Sample Data

### Google Sheets Example

| session_date | game_date | location_heard | location_targetted | X | Y | title | rating | resolved | details |
|-------------|-----------|----------------|-------------------|---|---|-------|--------|----------|---------|
| 2025-12-15 | 3rd Leaffall, 1247 | Broken Tavern, Westport | Northern Peaks | 1200 | 800 | Dragon Sighting | 7 | FALSE | Locals report seeing a large winged creature near the northern peaks. Unconfirmed but concerning. |
| 2025-12-15 | 3rd Leaffall, 1247 | Merchant Guild | Eastern Trade Road | 3400 | 1500 | Trade Route Closed | 9 | TRUE | Merchant caravans report bandits. Authorities cleared the route. |

### Parsed TypeScript Objects

```typescript
[
  {
    id: "rumour_2",
    session_date: "2025-12-15",
    game_date: "3rd Leaffall, 1247",
    location_heard: "Broken Tavern, Westport",
    location_targetted: "Northern Peaks",
    x: 1200,
    y: 800,
    title: "Dragon Sighting",
    rating: 7,
    resolved: false,
    details: "Locals report seeing a large winged creature near the northern peaks. Unconfirmed but concerning.",
    isPinned: true,
    isHovered: false,
    isHidden: false,
    isDragging: false
  },
  {
    id: "rumour_3",
    session_date: "2025-12-15",
    game_date: "3rd Leaffall, 1247",
    location_heard: "Merchant Guild",
    location_targetted: "Eastern Trade Road",
    x: 3400,
    y: 1500,
    title: "Trade Route Closed",
    rating: 9,
    resolved: true,
    details: "Merchant caravans report bandits. Authorities cleared the route.",
    isPinned: true,
    isHovered: false,
    isHidden: false,
    isDragging: false
  }
]
```

---

## Performance Considerations

- **Batch Parsing**: Parse all rows in single pass, filter invalid rows
- **Lazy Rendering**: Use virtual scrolling if >100 rumours (future enhancement)
- **Computed Filters**: Use Vue computed properties for filtered lists (reactive + cached)
- **Debounced Refresh**: Prevent rapid repeated API calls with 2-second debounce
- **Memory Limit**: Assume max 500 rumours × ~1KB each = ~500KB in memory (acceptable)
