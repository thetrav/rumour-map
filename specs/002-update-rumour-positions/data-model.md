# Data Model: Update Rumour Positions to Google Sheets

**Feature**: [spec.md](spec.md)  
**Date**: 2026-02-01  
**Status**: Draft

## Overview

This document extends the data model from 001-google-sheets-integration to support tracking rumour position changes and pushing updates back to Google Sheets. It defines: extended Rumour interface with sync state fields, Update Batch structure for API requests, and error response types.

---

## Extended Rumour Interface

### Changes to Existing Rumour Type

**File**: `src/types/rumour.ts`

```typescript
/**
 * Rumour data structure loaded from Google Sheets
 * Includes both source data and UI state
 * 
 * EXTENDED in 002: Added sync state fields for position tracking
 */
export interface Rumour {
  // Google Sheets source data (existing)
  id: string                    // Generated: row index or hash of data
  session_date: string | null   // When rumour was recorded (session date)
  game_date: string | null      // In-game date/time
  location_heard: string | null // Where players heard the rumour
  location_targetted: string | null // Location rumour refers to
  x: number                     // Map X coordinate (0-6500)
  y: number                     // Map Y coordinate (0-3600)
  title: string                 // Rumour title/summary
  rating: number | null         // Quality/importance rating (0-10)
  resolved: boolean             // Whether rumour is resolved
  details: string | null        // Full rumour description
  
  // UI state (not persisted) - existing
  isPinned: boolean             // Whether marker is pinned
  isHovered: boolean            // Whether marker is being hovered
  isHidden: boolean             // Whether marker is hidden from view
  isDragging: boolean           // Whether marker is being dragged
  
  // NEW in 002: Sync state for update tracking
  sheetRowNumber: number        // 1-indexed row number in Google Sheets (e.g., 5 for row 5)
  originalX: number             // X coordinate when last fetched/saved from Sheets
  originalY: number             // Y coordinate when last fetched/saved from Sheets
  isModified: boolean           // True if current x,y differs from originalX,originalY
}
```

### Field Details

| Field | Type | Purpose | Set When | Reset When |
|-------|------|---------|----------|------------|
| `sheetRowNumber` | number | Identifies the Google Sheets row for this rumour (1-indexed, includes header) | During fetch from Sheets | On refresh from Sheets |
| `originalX` | number | Last saved X coordinate in Sheets | During fetch OR after successful push | On refresh from Sheets OR after push succeeds |
| `originalY` | number | Last saved Y coordinate in Sheets | During fetch OR after successful push | On refresh from Sheets OR after push succeeds |
| `isModified` | boolean | Whether current position differs from original | On drag end (compare x,y to originalX,originalY) | After successful push OR on refresh |

### State Transitions

```
SYNCED (isModified=false, x===originalX, y===originalY)
  ↓ [user drags marker to new position]
MODIFIED (isModified=true, x!==originalX || y!==originalY)
  ↓ [user clicks "Push Updates"]
PUSHING (isPushing=true globally)
  ↓ [API call succeeds]
SYNCED (isModified=false, originalX=x, originalY=y)
  OR ↓ [API call fails]
MODIFIED (isModified=true, position unchanged, allow retry)
```

---

## Update Batch Structure

### Batch Update Request

**Purpose**: Represents a batch of position updates to send to Google Sheets API

```typescript
/**
 * Batch update request for Google Sheets API v4
 * Sent to spreadsheets.values.batchUpdate endpoint
 */
export interface SheetsBatchUpdateRequest {
  spreadsheetId: string
  resource: {
    valueInputOption: 'USER_ENTERED' | 'RAW'  // USER_ENTERED for number parsing
    data: SheetValueRange[]                    // Array of ranges to update
    includeValuesInResponse?: boolean          // Return updated values (optional)
    responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE'
  }
}

/**
 * Single value range within a batch update
 * Represents one rumour's X,Y update
 */
export interface SheetValueRange {
  range: string        // A1 notation, e.g., "Sheet1!E5:F5" (columns E=X, F=Y, row 5)
  values: number[][]   // 2D array: [[x, y]] for single row update
}
```

### Batch Update Response

```typescript
/**
 * Response from Google Sheets API batchUpdate
 */
export interface SheetsBatchUpdateResponse {
  spreadsheetId: string
  totalUpdatedRows: number
  totalUpdatedColumns: number
  totalUpdatedCells: number
  totalUpdatedSheets: number
  responses: SheetUpdateResponse[]  // One per ValueRange in request
}

/**
 * Response for a single ValueRange update
 */
export interface SheetUpdateResponse {
  spreadsheetId: string
  updatedRange: string       // A1 notation of updated range
  updatedRows: number
  updatedColumns: number
  updatedCells: number
  updatedData?: {            // If includeValuesInResponse=true
    range: string
    values: any[][]
  }
}
```

### Example Request/Response

**Request to update 3 rumours**:
```json
{
  "spreadsheetId": "1abc...",
  "resource": {
    "valueInputOption": "USER_ENTERED",
    "data": [
      {
        "range": "Sheet1!E5:F5",
        "values": [[1234, 567]]
      },
      {
        "range": "Sheet1!E12:F12",
        "values": [[2345, 890]]
      },
      {
        "range": "Sheet1!E20:F20",
        "values": [[3456, 1234]]
      }
    ]
  }
}
```

**Response**:
```json
{
  "spreadsheetId": "1abc...",
  "totalUpdatedRows": 3,
  "totalUpdatedColumns": 2,
  "totalUpdatedCells": 6,
  "totalUpdatedSheets": 1,
  "responses": [
    {
      "spreadsheetId": "1abc...",
      "updatedRange": "Sheet1!E5:F5",
      "updatedRows": 1,
      "updatedColumns": 2,
      "updatedCells": 2
    },
    // ... 2 more responses
  ]
}
```

---

## Error Response Types

### Push Error Structure

```typescript
/**
 * Categorized error from push operation
 * Used for user-friendly error messages and retry logic
 */
export interface PushError {
  type: PushErrorType
  message: string              // Technical error message (for logging)
  userMessage: string          // User-friendly explanation
  retryable: boolean           // Whether user can retry the operation
  failedRumourIds?: string[]   // IDs of rumours that failed (for partial failures)
  httpStatus?: number          // HTTP status code if applicable
}

/**
 * Error type classification
 */
export type PushErrorType =
  | 'VALIDATION_ERROR'     // Pre-push coordinate validation failed
  | 'AUTH_ERROR'           // Not authenticated or token expired
  | 'PERMISSION_ERROR'     // User lacks edit permission on sheet
  | 'NETWORK_ERROR'        // Network unreachable or timeout
  | 'RATE_LIMIT_ERROR'     // Google Sheets API rate limit hit (429)
  | 'PARTIAL_FAILURE'      // Some rumours updated, others failed
  | 'INVALID_RANGE_ERROR'  // Sheet name or range format invalid (400)
  | 'UNKNOWN_ERROR'        // Unexpected error

/**
 * Google Sheets API error response structure
 */
export interface SheetsApiError {
  error: {
    code: number           // HTTP status code
    message: string        // Error description
    status: string         // Error type (e.g., "PERMISSION_DENIED")
    details?: any[]        // Additional error details
  }
}
```

### Error Mapping

| HTTP Status | PushErrorType | User Message | Retryable |
|-------------|---------------|--------------|-----------|
| 401 | AUTH_ERROR | "Your authentication has expired. Please sign in again." | Yes |
| 403 | PERMISSION_ERROR | "You do not have permission to edit this Google Sheet." | No |
| 429 | RATE_LIMIT_ERROR | "Too many requests. Please wait a moment and try again." | Yes |
| 400 | INVALID_RANGE_ERROR | "Sheet configuration error. Please check sheet name and range." | No |
| Network Failure | NETWORK_ERROR | "Network connection lost. Check your internet and try again." | Yes |
| Other | UNKNOWN_ERROR | "An unexpected error occurred. Please try again." | Yes |

---

## Sync State Management

### Modified Rumours Tracking

**Purpose**: Global state to track which rumours have pending changes

```typescript
/**
 * Global sync state (in useRumourUpdates composable)
 */
interface SyncState {
  modifiedRumours: Set<string>     // Set of rumour IDs with pending changes
  isPushing: boolean               // Whether push operation is in progress
  pushError: PushError | null      // Last error from push operation (null if success)
  lastPushTime: number | null      // Timestamp of last successful push
}

/**
 * Computed properties derived from sync state
 */
interface SyncStatus {
  hasPendingChanges: boolean       // true if modifiedRumours.size > 0
  pendingCount: number             // modifiedRumours.size
  canPush: boolean                 // hasPendingChanges && !isPushing
}
```

### Update Lifecycle

1. **Rumour Dragged**:
   - User drags marker to new position
   - `useRumourDrag` updates `rumour.x`, `rumour.y`
   - On drag end: check if `x !== originalX || y !== originalY`
   - If changed: set `rumour.isModified = true`, call `markAsModified(rumour.id)`

2. **Push Initiated**:
   - User clicks "Push Updates" button
   - Filter rumours: `rumours.filter(r => modifiedRumours.has(r.id))`
   - Validate coordinates (0-6500 for X, 0-3600 for Y)
   - Set `isPushing = true`, disable button

3. **API Call**:
   - Build `SheetsBatchUpdateRequest` with ValueRanges for each modified rumour
   - Call `gapi.client.sheets.spreadsheets.values.batchUpdate`
   - Handle response or error

4. **Success**:
   - For each rumour in response: set `originalX = x`, `originalY = y`, `isModified = false`
   - Clear rumour IDs from `modifiedRumours` Set
   - Set `isPushing = false`, `pushError = null`, `lastPushTime = Date.now()`
   - Show success toast: "N rumour positions updated successfully"

5. **Failure**:
   - Map error to `PushError` type
   - Set `isPushing = false`, `pushError = <error>`
   - Keep rumours in `modifiedRumours` Set (allow retry)
   - Show error alert with retry button (if retryable)

6. **Partial Failure**:
   - Check `response.responses` array for individual failures
   - Clear only successful rumour IDs from `modifiedRumours`
   - Set `pushError` with `failedRumourIds` list
   - Show warning: "N of M rumours updated. View failed items"

---

## Data Validation Rules

### Pre-Push Validation

**Coordinate Bounds**:
- X: 0 ≤ x ≤ 6500 (map width in pixels)
- Y: 0 ≤ y ≤ 3600 (map height in pixels)
- Invalid coordinates → skip rumour, log warning, include in validation error

**Required Fields**:
- `sheetRowNumber`: Must be ≥ 2 (row 1 is header)
- `x`, `y`: Must be valid numbers (not NaN or null)

**Sheet Configuration**:
- `GOOGLE_CONFIG.spreadsheetId`: Must be non-empty
- `GOOGLE_CONFIG.sheetName`: Must match actual sheet name in document
- If mismatch → 400 error from API

### Post-Fetch Validation

When rumours are fetched from Sheets, validate:
- Row numbers are sequential (no gaps suggest missing data)
- X,Y values are within bounds (already clamped during parse)
- Required fields (title, X, Y) are present (rows without these are skipped)

---

## Schema Compatibility

### Backward Compatibility

**With 001-google-sheets-integration**:
- All existing Rumour fields remain unchanged (except additions)
- Existing `useRumoursFromGoogle` fetch logic extended, not replaced
- New fields (`sheetRowNumber`, `originalX`, `originalY`, `isModified`) default to:
  - `sheetRowNumber`: Set during fetch (index + 2)
  - `originalX`, `originalY`: Copy from parsed `x`, `y`
  - `isModified`: Initialize to `false`

**Google Sheets Schema**:
- No changes to sheet structure required
- Still uses columns A-J with same data types
- Update operations only touch columns E (X) and F (Y)
- Other columns (title, details, rating, etc.) remain untouched

### Migration Notes

**Existing Users**:
- Need to re-consent OAuth (scope changes from read-only to full)
- No data migration required
- Existing rumours work immediately after scope upgrade

**New Users**:
- Single OAuth consent flow with write scope
- No additional setup beyond 001 configuration

---

## Summary

This data model extends 001-google-sheets-integration with minimal changes:
- **3 new Rumour fields** for sync state tracking
- **Batch update request/response types** for Google Sheets API v4
- **Error type system** for categorized error handling
- **Sync state management** pattern for pending changes

All additions follow existing TypeScript patterns and Vue 3 reactivity conventions. Zero breaking changes to existing functionality.
