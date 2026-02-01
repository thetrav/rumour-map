# Technical Research: Update Rumour Positions to Google Sheets

**Date**: 2026-02-01  
**Feature**: [spec.md](spec.md)  
**Status**: Complete

## Overview

This document captures research findings for extending the read-only Google Sheets integration (001) to support write operations. Key decisions include: OAuth write scope configuration, Google Sheets API v4 batch update patterns, row identification strategies, error handling for write operations, and UI patterns for tracking pending changes.

---

## 1. Google Sheets API Write Scope

### Decision
Add `https://www.googleapis.com/auth/spreadsheets` scope to OAuth configuration. This replaces the read-only scope from 001-google-sheets-integration.

### Rationale
- **Full Read/Write Access**: Required for `spreadsheets.values.batchUpdate` API method
- **No Granular Write-Only**: Google Sheets API doesn't offer "write X,Y columns only" scope
- **Backward Compatible**: Read operations continue working with full scope
- **User Consent**: OAuth dialog clearly shows "See, edit, create, and delete all your Google Sheets spreadsheets" permission

### Alternatives Considered
- **Keep read-only + separate write scope**: Rejected - no such scope exists in Google Sheets API v4
- **Service account with domain-wide delegation**: Rejected - requires G Suite admin access, adds backend dependency
- **Google Apps Script as proxy**: Rejected - adds deployment complexity, violates single-page app constraint

### Implementation

**Update `src/config/google.ts`**:
```typescript
export const GOOGLE_CONFIG = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
  sheetName: import.meta.env.VITE_SHEET_NAME || 'Sheet1',
  sheetRange: import.meta.env.VITE_SHEET_RANGE || 'A2:J',
  scope: 'https://www.googleapis.com/auth/spreadsheets', // Changed from .readonly
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
}
```

**Migration Note**: Users previously authenticated with read-only scope will be prompted to re-consent when write scope is detected. Clear the `sessionStorage` auth flag on scope change to force re-authentication.

---

## 2. Google Sheets API Batch Update Pattern

### Decision
Use `spreadsheets.values.batchUpdate` method with `ValueRange` objects targeting specific cells. Update only X (column E) and Y (column F) columns for modified rumours.

### Rationale
- **Efficient**: Single API call updates multiple rumours (vs. individual requests per rumour)
- **Targeted**: Only modified cells are touched, preserving other data
- **Atomic**: Batch operations succeed or fail together (partial failures reported per-range)
- **Rate Limit Friendly**: 1 batch request instead of N individual requests
- **Type Safety**: ValueRange objects support both A1 notation and row/column indices

### Alternatives Considered
- **`spreadsheets.batchUpdate`**: Rejected - designed for formatting/structure changes, not cell values
- **Individual `values.update` calls**: Rejected - hits rate limits faster, slower, more error-prone
- **`append` + delete old rows**: Rejected - changes row numbers (breaks rumour IDs), complex logic

### Implementation

**API Method**: `gapi.client.sheets.spreadsheets.values.batchUpdate`

**Request Structure**:
```typescript
{
  spreadsheetId: string,
  resource: {
    valueInputOption: 'USER_ENTERED' | 'RAW',
    data: ValueRange[],
    includeValuesInResponse?: boolean,
    responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE'
  }
}
```

**ValueRange for single rumour**:
```typescript
{
  range: 'Sheet1!E5:F5',  // E = X, F = Y, row 5 (data row 3, header is row 1)
  values: [[1234, 567]]   // [X, Y] as 2D array (1 row, 2 columns)
}
```

**Example batch update**:
```typescript
const updates = modifiedRumours.map(rumour => ({
  range: `${sheetName}!E${rumour.rowNumber}:F${rumour.rowNumber}`,
  values: [[rumour.x, rumour.y]]
}))

const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
  resource: {
    valueInputOption: 'USER_ENTERED', // Parses numbers correctly
    data: updates
  }
})

// Response: { totalUpdatedCells, totalUpdatedRows, responses: [...] }
```

**Error Handling**:
- **200 OK with partial failures**: Check `response.responses` array for individual errors
- **403 Forbidden**: User lacks edit permission
- **429 Rate Limit**: Retry with exponential backoff (1s, 2s, 4s)
- **400 Bad Request**: Invalid range format or sheet name mismatch

---

## 3. Row Identification Strategy

### Decision
Store Google Sheets row number (1-indexed, including header) in the Rumour object during fetch. Use this row number to construct update ranges (e.g., `E5:F5` for row 5).

### Rationale
- **Reliable**: Row number doesn't change unless user manually inserts/deletes rows in Sheets
- **Simple**: No complex hashing or title matching logic
- **Efficient**: Direct O(1) lookup for update target
- **Existing Pattern**: Rumour ID already uses row number (`rumour_${index + 2}`)

### Alternatives Considered
- **Title as unique identifier**: Rejected - titles can be duplicated or changed, requires full scan to match
- **Hash of all fields**: Rejected - any field change breaks match, complex collision handling
- **UUID column in Sheets**: Rejected - requires users to modify sheet structure, adds setup burden

### Implementation

**Extend Rumour interface** (`src/types/rumour.ts`):
```typescript
export interface Rumour {
  // Existing fields...
  id: string
  x: number
  y: number
  title: string
  // ... other fields
  
  // NEW: Row tracking for updates
  sheetRowNumber: number  // 1-indexed row number (e.g., 5 for row 5)
  originalX: number       // X coordinate when last fetched/saved
  originalY: number       // Y coordinate when last fetched/saved
  isModified: boolean     // True if x !== originalX || y !== originalY
}
```

**During fetch** (`useRumoursFromGoogle.ts`):
```typescript
const parseSheetRow = (row: string[], index: number): Rumour | null => {
  // ... existing parsing logic
  
  return {
    id: `rumour_${index + 2}`,
    sheetRowNumber: index + 2, // Row 2 = first data row (index 0 + 2)
    x: clampedX,
    y: clampedY,
    originalX: clampedX,
    originalY: clampedY,
    isModified: false,
    // ... other fields
  }
}
```

**On drag end** (`useRumourDrag.js`):
```typescript
const onDragEnd = () => {
  rumour.isDragging = false
  rumour.isModified = (rumour.x !== rumour.originalX || rumour.y !== rumour.originalY)
}
```

**Limitation**: If users manually insert/delete rows in Google Sheets while the app is open, row numbers become stale. Mitigation: Refresh from Sheets clears pending changes and re-syncs row numbers.

---

## 4. Pending Changes Tracking

### Decision
Track modified rumours in a reactive Set (or Map) within a new `useRumourUpdates` composable. Provide computed properties for "has pending changes" and "pending count" to drive UI updates.

### Rationale
- **Reactive**: Vue's reactivity system automatically updates UI when Set changes
- **Efficient**: Set provides O(1) add/remove/has operations
- **Composable Pattern**: Matches existing architecture (`useRumours`, `useGoogleAuth`)
- **Centralized**: Single source of truth for sync state across all components

### Alternatives Considered
- **Flag on each Rumour object**: Implemented (see `isModified` field) - works in conjunction with Set
- **Array of modified IDs**: Rejected - slower lookups (O(n) vs O(1)), more complex to deduplicate
- **Vuex/Pinia store**: Rejected - overkill for this feature, constitution favors simplicity

### Implementation

**Composable** (`src/composables/useRumourUpdates.ts`):
```typescript
import { ref, computed, type Ref } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'
import { useGoogleAuth } from './useGoogleAuth'
import type { Rumour } from '@/types/rumour'

const modifiedRumours: Ref<Set<string>> = ref(new Set()) // Set of rumour IDs

export function useRumourUpdates() {
  const { getAccessToken } = useGoogleAuth()
  const isPushing = ref(false)
  const pushError: Ref<string | null> = ref(null)
  const lastPushTime: Ref<number | null> = ref(null)

  const hasPendingChanges = computed(() => modifiedRumours.value.size > 0)
  const pendingCount = computed(() => modifiedRumours.value.size)

  const markAsModified = (rumourId: string) => {
    modifiedRumours.value.add(rumourId)
  }

  const clearModified = (rumourId: string) => {
    modifiedRumours.value.delete(rumourId)
  }

  const clearAllModified = () => {
    modifiedRumours.value.clear()
  }

  const pushUpdates = async (rumours: Rumour[]) => {
    // Implementation in next section...
  }

  return {
    hasPendingChanges,
    pendingCount,
    isPushing,
    pushError,
    lastPushTime,
    markAsModified,
    clearModified,
    clearAllModified,
    pushUpdates
  }
}
```

**Integration with drag** (`useRumourDrag.js` modification):
```javascript
import { useRumourUpdates } from './useRumourUpdates'

export function useRumourDrag(mapTransform) {
  const { markAsModified } = useRumourUpdates()

  const startDrag = (rumour, event) => {
    // ... existing drag logic
    
    const onDragEnd = () => {
      rumour.isDragging = false
      
      // Check if position changed
      if (rumour.x !== rumour.originalX || rumour.y !== rumour.originalY) {
        rumour.isModified = true
        markAsModified(rumour.id)
      }
    }
    
    // ... attach event listeners
  }
  
  return { startDrag }
}
```

---

## 5. Error Handling and User Feedback

### Decision
Implement a three-tier error handling strategy: inline validation (pre-push), API error categorization (during push), and user-friendly messages with retry capability.

### Rationale
- **Fail Fast**: Validate coordinates before API call to avoid wasted requests
- **Specific Errors**: Different messages for network, permissions, rate limit, and data errors
- **User Control**: Always preserve pending changes on failure, allow manual retry
- **Transparency**: Show which rumours failed in batch operations

### Alternatives Considered
- **Silent retry**: Rejected - users lose control, confusing when retries fail repeatedly
- **Generic error message**: Rejected - doesn't help users understand or fix the problem
- **Auto-rollback positions**: Rejected - users may want to keep new positions despite push failure

### Implementation

**Error Categories**:
```typescript
type PushErrorType = 
  | 'VALIDATION_ERROR'     // Pre-push coordinate validation failed
  | 'AUTH_ERROR'           // Not authenticated or token expired
  | 'PERMISSION_ERROR'     // User lacks edit permission on sheet
  | 'NETWORK_ERROR'        // Network unreachable or timeout
  | 'RATE_LIMIT_ERROR'     // Google Sheets API rate limit hit
  | 'PARTIAL_FAILURE'      // Some rumours updated, others failed
  | 'UNKNOWN_ERROR'        // Unexpected error

interface PushError {
  type: PushErrorType
  message: string
  userMessage: string      // User-friendly explanation
  retryable: boolean
  failedRumourIds?: string[] // For partial failures
}
```

**Validation (pre-push)**:
```typescript
const validateUpdates = (rumours: Rumour[]): { valid: Rumour[], invalid: Rumour[] } => {
  const valid: Rumour[] = []
  const invalid: Rumour[] = []
  
  rumours.forEach(rumour => {
    if (rumour.x < 0 || rumour.x > 6500 || rumour.y < 0 || rumour.y > 3600) {
      console.warn(`Rumour ${rumour.id} has invalid coordinates: (${rumour.x}, ${rumour.y})`)
      invalid.push(rumour)
    } else {
      valid.push(rumour)
    }
  })
  
  return { valid, invalid }
}
```

**API Error Mapping**:
```typescript
const handleApiError = (error: any): PushError => {
  if (error.status === 401) {
    return {
      type: 'AUTH_ERROR',
      message: error.result?.error?.message || 'Unauthorized',
      userMessage: 'Your authentication has expired. Please sign in again.',
      retryable: true
    }
  }
  
  if (error.status === 403) {
    return {
      type: 'PERMISSION_ERROR',
      message: error.result?.error?.message || 'Forbidden',
      userMessage: 'You do not have permission to edit this Google Sheet. Please check sharing settings.',
      retryable: false
    }
  }
  
  if (error.status === 429) {
    return {
      type: 'RATE_LIMIT_ERROR',
      message: 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait a moment and try again.',
      retryable: true
    }
  }
  
  if (!navigator.onLine || error.message?.includes('network')) {
    return {
      type: 'NETWORK_ERROR',
      message: error.message,
      userMessage: 'Network connection lost. Check your internet and try again.',
      retryable: true
    }
  }
  
  return {
    type: 'UNKNOWN_ERROR',
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  }
}
```

**User Feedback Components**:
- **Loading State**: Disable "Push Updates" button, show spinner + "Updating 5 rumours..."
- **Success Toast**: Green notification, "5 rumour positions updated successfully"
- **Error Alert**: Red notification with specific message + "Retry" button if retryable
- **Partial Failure**: Yellow warning, "3 of 5 rumours updated. View failed items" + expandable list

---

## 6. UI Pattern for Modified Markers

### Decision
Add a visual indicator (border, icon, or color change) to rumour markers that have been moved but not yet pushed. Use Tailwind utilities for styling consistency.

### Rationale
- **Discoverability**: Users can see at a glance which rumours have pending changes
- **Feedback**: Immediate visual confirmation that drag operation registered as a change
- **Status Tracking**: Clear distinction between synced vs. modified rumours
- **Accessible**: Color + icon ensures visibility for color-blind users

### Alternatives Considered
- **No visual indicator**: Rejected - users can't tell if changes are pending
- **Change opacity**: Rejected - could be confused with "hidden" or "disabled" state
- **Pulse animation**: Rejected - distracting, violates constitution's performance requirements

### Implementation

**Marker Component** (`src/components/RumourMarker.vue`):
```vue
<template>
  <div
    :class="[
      'rumour-marker',
      {
        'modified': rumour.isModified,
        'dragging': rumour.isDragging
      }
    ]"
  >
    <!-- Existing marker content -->
    <span v-if="rumour.isModified" class="modified-indicator" aria-label="Position modified">
      ⚠️
    </span>
  </div>
</template>

<style scoped>
.rumour-marker.modified {
  border: 2px solid #f59e0b; /* Tailwind amber-500 */
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
}

.modified-indicator {
  position: absolute;
  top: -8px;
  right: -8px;
  font-size: 14px;
}
</style>
```

**Primer CSS Integration**: Use Primer's `Label--warning` or `Label--attention` classes if marker uses label components.

---

## 7. Button Placement and Interaction

### Decision
Add a fixed-position "Push Updates" button in the bottom-right corner (similar to floating action button pattern). Button shows pending count badge and is disabled when no changes exist.

### Rationale
- **Always Accessible**: Fixed position ensures button is reachable regardless of map pan/zoom
- **Non-Obtrusive**: Bottom-right doesn't block map center where users focus
- **Touch-Friendly**: 44x44px minimum size (constitution 3.1)
- **Status Aware**: Badge shows pending count, disabled state prevents empty pushes

### Alternatives Considered
- **Top toolbar**: Rejected - may be hidden during full-screen map use
- **Context menu on marker**: Rejected - requires extra clicks, not discoverable for batch updates
- **Auto-push on drag end**: Rejected - users may want to position multiple rumours before saving

### Implementation

**Component** (`src/components/PushUpdatesButton.vue`):
```vue
<template>
  <button
    :disabled="!hasPendingChanges || isPushing"
    @click="handlePush"
    class="push-updates-btn"
    :aria-label="`Push ${pendingCount} rumour position updates to Google Sheets`"
  >
    <span v-if="isPushing" class="spinner" aria-hidden="true"></span>
    <span v-else>📤 Push Updates</span>
    <span v-if="hasPendingChanges && !isPushing" class="badge">{{ pendingCount }}</span>
  </button>
</template>

<script setup lang="ts">
import { useRumourUpdates } from '@/composables/useRumourUpdates'
import { useRumours } from '@/composables/useRumours'

const { hasPendingChanges, pendingCount, isPushing, pushUpdates } = useRumourUpdates()
const { rumours } = useRumours()

const handlePush = async () => {
  await pushUpdates(rumours.value)
}
</script>

<style scoped>
.push-updates-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  min-width: 44px;
  min-height: 44px;
  padding: 12px 20px;
  background: #0969da; /* Primer blue */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.push-updates-btn:disabled {
  background: #6e7781;
  cursor: not-allowed;
  opacity: 0.5;
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #cf222e; /* Primer red */
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: bold;
}
</style>
```

---

## Summary

All technical decisions are based on extending the established 001-google-sheets-integration patterns:
1. **Scope Change**: Full read/write scope required for batch updates
2. **Batch API**: Single `batchUpdate` call for efficiency
3. **Row Tracking**: Store row numbers during fetch for reliable update targeting
4. **Reactive State**: Composable-based change tracking (Vue 3 pattern)
5. **Error Handling**: Three-tier validation with user-friendly messages
6. **Visual Feedback**: Modified marker indicators + FAB-style push button

No new dependencies required. Zero constitution violations. Ready for Phase 1 design.
