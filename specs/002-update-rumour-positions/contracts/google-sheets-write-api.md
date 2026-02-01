# API Contract: Google Sheets Write API (batchUpdate)

**Feature**: [spec.md](../spec.md)  
**Date**: 2026-02-01  
**API Version**: Google Sheets API v4  
**Endpoint**: `spreadsheets.values.batchUpdate`

## Overview

This contract defines the Google Sheets API v4 `spreadsheets.values.batchUpdate` method used to update rumour X,Y positions in batch operations. The API allows updating multiple cell ranges in a single request, which is essential for efficiently syncing multiple rumour position changes.

---

## Authentication

**Method**: OAuth 2.0 with access token in Authorization header

**Required Scope**:
```
https://www.googleapis.com/auth/spreadsheets
```

**Authorization Header**:
```
Authorization: Bearer <access_token>
```

**Token Source**: Obtained via Google Identity Services (GIS) token client, managed by `useGoogleAuth` composable.

---

## Endpoint

**Base URL**: `https://sheets.googleapis.com/v4`

**Full Path**: `/spreadsheets/{spreadsheetId}/values:batchUpdate`

**HTTP Method**: `POST`

**Path Parameters**:
- `spreadsheetId` (required): The ID of the spreadsheet to update (from `GOOGLE_CONFIG.spreadsheetId`)

---

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body

```json
{
  "valueInputOption": "USER_ENTERED",
  "data": [
    {
      "range": "Sheet1!E5:F5",
      "values": [[1234, 567]]
    }
  ],
  "includeValuesInResponse": false,
  "responseValueRenderOption": "FORMATTED_VALUE"
}
```

### Request Schema

```typescript
{
  valueInputOption: 'USER_ENTERED' | 'RAW'
  // USER_ENTERED: Parses values as if typed by user (numbers as numbers, dates as dates)
  // RAW: Treats all values as strings
  // USE: USER_ENTERED for coordinate updates
  
  data: Array<{
    range: string
    // A1 notation: "SheetName!StartCell:EndCell"
    // Format: "Sheet1!E5:F5" (columns E=X, F=Y, row 5)
    // Row numbers are 1-indexed (row 1 = header, row 2 = first data row)
    
    values: any[][]
    // 2D array: rows then columns
    // For single row: [[x, y]]
    // For multiple rows: [[x1, y1], [x2, y2], ...]
  }>
  
  includeValuesInResponse?: boolean
  // Optional: If true, returns updated values in response
  // USE: false (we already know the values we're setting)
  
  responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA'
  // Optional: How to render values in response (if includeValuesInResponse=true)
  // USE: Default or omit
}
```

### Example: Update Single Rumour

```json
{
  "valueInputOption": "USER_ENTERED",
  "data": [
    {
      "range": "Sheet1!E5:F5",
      "values": [[1234.5, 567.8]]
    }
  ]
}
```

### Example: Update Multiple Rumours (Batch)

```json
{
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
```

### Range Format Rules

**A1 Notation**:
- Format: `SheetName!StartCell:EndCell`
- Sheet name: Must match exactly (case-sensitive), quote if contains spaces: `'My Sheet'!E5:F5`
- Cell references: Column letter + row number (1-indexed)
- Range: Two cells separated by `:` (start:end)

**For Rumour Position Updates**:
- Column E: X coordinate
- Column F: Y coordinate
- Row N: Rumour at row N in Google Sheets (row 2 = first data row)
- Pattern: `Sheet1!E{rowNumber}:F{rowNumber}`

**Examples**:
- `Sheet1!E5:F5` - Row 5, columns E and F (X and Y)
- `Rumours!E10:F10` - Row 10 in sheet named "Rumours"
- `'My Rumours'!E3:F3` - Row 3 in sheet with space in name

---

## Response Format

### Success Response (200 OK)

```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "totalUpdatedRows": 3,
  "totalUpdatedColumns": 2,
  "totalUpdatedCells": 6,
  "totalUpdatedSheets": 1,
  "responses": [
    {
      "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "updatedRange": "Sheet1!E5:F5",
      "updatedRows": 1,
      "updatedColumns": 2,
      "updatedCells": 2
    },
    {
      "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "updatedRange": "Sheet1!E12:F12",
      "updatedRows": 1,
      "updatedColumns": 2,
      "updatedCells": 2
    },
    {
      "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      "updatedRange": "Sheet1!E20:F20",
      "updatedRows": 1,
      "updatedColumns": 2,
      "updatedCells": 2
    }
  ]
}
```

### Response Schema

```typescript
{
  spreadsheetId: string
  totalUpdatedRows: number      // Total rows affected across all ranges
  totalUpdatedColumns: number   // Total columns affected
  totalUpdatedCells: number     // Total individual cells updated
  totalUpdatedSheets: number    // Number of distinct sheets touched
  responses: Array<{
    spreadsheetId: string
    updatedRange: string        // A1 notation of the range that was updated
    updatedRows: number
    updatedColumns: number
    updatedCells: number
    updatedData?: {             // Only if includeValuesInResponse=true
      range: string
      majorDimension: 'ROWS' | 'COLUMNS'
      values: any[][]
    }
  }>
}
```

### Interpreting Response

**Success Indicators**:
- HTTP 200 status
- `totalUpdatedCells > 0`
- `responses.length` matches number of ranges in request
- Each response has `updatedCells > 0`

**Partial Success Detection**:
- If `responses.length < request.data.length`, some ranges failed
- Check individual responses for which ranges succeeded
- Missing responses indicate failed updates (e.g., invalid range format)

---

## Error Responses

### 400 Bad Request - Invalid Range

```json
{
  "error": {
    "code": 400,
    "message": "Unable to parse range: Sheet2!E5:F5",
    "status": "INVALID_ARGUMENT",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.BadRequest",
        "fieldViolations": [
          {
            "field": "data[0].range",
            "description": "Sheet not found: Sheet2"
          }
        ]
      }
    ]
  }
}
```

**Causes**:
- Sheet name doesn't exist in spreadsheet
- Invalid A1 notation format
- Invalid cell references (e.g., column "ZZZ" doesn't exist)

**User Message**: "Sheet configuration error. Please check that the sheet name matches your Google Sheets document."

---

### 401 Unauthorized - Invalid or Expired Token

```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials.",
    "status": "UNAUTHENTICATED"
  }
}
```

**Causes**:
- Access token expired (tokens expire after ~1 hour)
- Access token revoked by user
- Access token invalid or malformed

**User Message**: "Your authentication has expired. Please sign in again."

**Action**: Call `signIn()` from `useGoogleAuth` to re-authenticate

---

### 403 Forbidden - Insufficient Permissions

```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "PERMISSION_DENIED",
        "domain": "googleapis.com",
        "metadata": {
          "service": "sheets.googleapis.com"
        }
      }
    ]
  }
}
```

**Causes**:
- User doesn't have edit access to the spreadsheet
- Spreadsheet is view-only
- OAuth scope doesn't include write permission (should not happen if configured correctly)

**User Message**: "You do not have permission to edit this Google Sheet. Please ask the owner to grant you edit access."

**Action**: No retry - user must change spreadsheet permissions

---

### 404 Not Found - Spreadsheet Not Found

```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

**Causes**:
- Spreadsheet ID is invalid
- Spreadsheet was deleted
- User doesn't have access to spreadsheet (treated as not found for security)

**User Message**: "Google Sheet not found. Please check the spreadsheet ID in your configuration."

**Action**: Verify `VITE_SPREADSHEET_ID` environment variable

---

### 429 Too Many Requests - Rate Limit Exceeded

```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per user per 100 seconds'",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**Rate Limits**:
- **Per-user limit**: 100 requests per 100 seconds
- **Per-project limit**: 500 requests per 100 seconds
- Batch updates count as 1 request regardless of number of ranges

**Causes**:
- Too many read/write operations in short time
- Multiple tabs/windows using same OAuth token
- Refresh loop (fetching repeatedly)

**User Message**: "Too many requests. Please wait a moment and try again."

**Action**: 
- Wait 10-30 seconds before retry
- Use exponential backoff: 1s, 2s, 4s, 8s
- Check for accidental request loops

---

### 500/502/503 Server Errors - Google Service Unavailable

```json
{
  "error": {
    "code": 503,
    "message": "The service is currently unavailable.",
    "status": "UNAVAILABLE"
  }
}
```

**Causes**:
- Google Sheets API temporarily down
- Google infrastructure issue
- Transient network problem

**User Message**: "Google Sheets service is temporarily unavailable. Please try again in a moment."

**Action**: Retry after short delay (5-10 seconds)

---

## Rate Limits & Quotas

### Per-User Limits (most relevant)

- **Read requests**: 100 per 100 seconds
- **Write requests**: 100 per 100 seconds
- Combined read + write count toward same limit

### Best Practices

**Batch Updates**:
- ✅ Update 50 rumours in 1 batch request = 1 API call
- ❌ Update 50 rumours individually = 50 API calls (hits limit quickly)

**Caching**:
- Cache read results for 1 minute (already implemented in `useRumoursFromGoogle`)
- Don't refresh automatically on push success (user can manually refresh if needed)

**Error Handling**:
- On 429 error: wait at least 10 seconds before retry
- Implement exponential backoff for repeated 429s
- Show user estimated wait time

---

## Implementation Example

### Using gapi-script Library

```typescript
import { gapi } from 'gapi-script'
import { GOOGLE_CONFIG } from '@/config/google'
import type { Rumour } from '@/types/rumour'

async function pushUpdates(modifiedRumours: Rumour[]): Promise<void> {
  // Build batch update request
  const updates = modifiedRumours.map(rumour => ({
    range: `${GOOGLE_CONFIG.sheetName}!E${rumour.sheetRowNumber}:F${rumour.sheetRowNumber}`,
    values: [[rumour.x, rumour.y]]
  }))

  try {
    const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    })

    // Success: response.result contains SheetsBatchUpdateResponse
    console.log(`Updated ${response.result.totalUpdatedCells} cells`)
    return response.result
    
  } catch (error: any) {
    // Error handling
    if (error.status === 401) {
      throw new Error('AUTH_ERROR')
    } else if (error.status === 403) {
      throw new Error('PERMISSION_ERROR')
    } else if (error.status === 429) {
      throw new Error('RATE_LIMIT_ERROR')
    } else {
      throw new Error('UNKNOWN_ERROR')
    }
  }
}
```

---

## Testing

### Test Cases

**Happy Path**:
1. Update single rumour position → Verify 200 response, `totalUpdatedCells: 2`
2. Update multiple rumours (batch) → Verify all ranges in `responses` array
3. Update with decimal coordinates → Verify USER_ENTERED parses as numbers

**Error Cases**:
1. Invalid sheet name → Expect 400, "Sheet not found"
2. Expired token → Expect 401, trigger re-auth
3. Read-only permission → Expect 403, show permission error
4. Invalid spreadsheet ID → Expect 404

**Rate Limiting**:
1. Simulate 100 requests in 90 seconds → Expect 429 on 101st request
2. Batch 50 updates → Verify single API call (not 50)

### Mock Response for Testing

```typescript
// Mock success response (Vitest)
import { vi } from 'vitest'

vi.mock('gapi-script', () => ({
  gapi: {
    client: {
      sheets: {
        spreadsheets: {
          values: {
            batchUpdate: vi.fn().mockResolvedValue({
              result: {
                spreadsheetId: 'test123',
                totalUpdatedRows: 1,
                totalUpdatedColumns: 2,
                totalUpdatedCells: 2,
                responses: [{
                  updatedRange: 'Sheet1!E5:F5',
                  updatedCells: 2
                }]
              }
            })
          }
        }
      }
    }
  }
}))
```

---

## Security Considerations

### Access Token Security

- **Never log access tokens** in console or error messages
- Store tokens in memory only (not localStorage)
- Tokens expire after ~1 hour (handled by GIS)

### Spreadsheet ID Exposure

- Spreadsheet ID is not sensitive (visible in URL)
- Safe to include in environment variables
- Users must have Google account access to read/write regardless of ID

### Input Validation

- Validate coordinates before API call (0-6500 for X, 0-3600 for Y)
- Validate row numbers (>= 2, integer)
- Escape sheet names with special characters (wrap in single quotes)

---

## Summary

**Endpoint**: `POST /v4/spreadsheets/{spreadsheetId}/values:batchUpdate`  
**Auth**: OAuth 2.0, scope `https://www.googleapis.com/auth/spreadsheets`  
**Request**: Batch array of ValueRanges (A1 notation + 2D values array)  
**Response**: Per-range update counts + total updated cells  
**Rate Limit**: 100 requests per 100 seconds per user  
**Key Errors**: 401 (expired token), 403 (no permission), 429 (rate limit), 400 (invalid range)

This API contract ensures consistent, efficient, and reliable position updates from the Vue 3 application to Google Sheets.
