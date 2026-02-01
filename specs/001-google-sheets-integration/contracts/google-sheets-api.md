# API Contract: Google Sheets API Integration

**Feature**: [spec.md](../spec.md)  
**Date**: 2026-02-01  
**Version**: 1.0

## Overview

This contract defines the integration points with Google Sheets API v4 and Google Identity Services for OAuth2 authentication. It specifies request/response formats, error codes, and rate limits.

---

## Authentication API

### OAuth2 Flow (Google Identity Services)

**Provider**: Google Identity Services (GIS)  
**Documentation**: https://developers.google.com/identity/oauth2/web/guides/overview

#### Initialize Token Client

**Method**: Client-side JavaScript initialization

**Request**:
```javascript
google.accounts.oauth2.initTokenClient({
  client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  callback: (tokenResponse) => {
    // Handle token response
  },
})
```

**Response** (TokenResponse):
```typescript
{
  access_token: string      // OAuth2 access token
  expires_in: number        // Token lifetime in seconds (typically 3600)
  scope: string             // Granted scopes
  token_type: 'Bearer'      // Token type
  error?: string            // Error code if auth failed
  error_description?: string // Human-readable error
}
```

**Success Criteria**:
- User grants permission
- `access_token` is non-empty
- No `error` field present

**Error Codes**:
| Code | Description | User Action |
|------|-------------|-------------|
| `access_denied` | User denied permission | Prompt to grant access again |
| `invalid_client` | Invalid client ID | Configuration error - contact admin |
| `temporarily_unavailable` | Google service issue | Retry in a few minutes |

---

## Google Sheets API v4

**Base URL**: `https://sheets.googleapis.com/v4/spreadsheets`  
**Documentation**: https://developers.google.com/sheets/api/reference/rest

### Get Spreadsheet Values

**Endpoint**: `GET /spreadsheets/{spreadsheetId}/values/{range}`

**Purpose**: Fetch rumour data from Google Sheets

**Request**:
```http
GET /spreadsheets/{spreadsheetId}/values/Sheet1!A2:J
Authorization: Bearer {access_token}
```

**Parameters**:
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `spreadsheetId` | string | Yes | Google Sheets document ID | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `range` | string | Yes | A1 notation range | `Sheet1!A2:J` (skip header row) |
| `access_token` | string | Yes | OAuth2 token (in header) | `ya29.a0AfH6SMBx...` |

**Success Response** (200 OK):
```json
{
  "range": "Sheet1!A2:J",
  "majorDimension": "ROWS",
  "values": [
    [
      "2025-12-15",
      "3rd Leaffall, 1247",
      "Broken Tavern, Westport",
      "Northern Peaks",
      "1200",
      "800",
      "Dragon Sighting",
      "7",
      "FALSE",
      "Locals report seeing a large winged creature..."
    ],
    [
      "2025-12-15",
      "3rd Leaffall, 1247",
      "Merchant Guild",
      "Eastern Trade Road",
      "3400",
      "1500",
      "Trade Route Closed",
      "9",
      "TRUE",
      "Merchant caravans report bandits. Route cleared."
    ]
  ]
}
```

**Response Schema**:
```typescript
interface SpreadsheetValuesResponse {
  range: string              // Actual range returned
  majorDimension: 'ROWS' | 'COLUMNS'
  values: string[][]         // 2D array: rows × columns
}
```

**Empty Sheet Response** (200 OK):
```json
{
  "range": "Sheet1!A2:J",
  "majorDimension": "ROWS"
  // Note: 'values' field is absent when no data
}
```

---

## Error Responses

### 401 Unauthorized

**Cause**: Invalid or expired access token

**Response**:
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials.",
    "status": "UNAUTHENTICATED"
  }
}
```

**Client Action**:
1. Clear in-memory access token
2. Trigger OAuth2 re-authentication flow
3. Retry request with new token

---

### 403 Forbidden

**Cause**: User lacks permission to access spreadsheet

**Response**:
```json
{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```

**Client Action**:
1. Display user-friendly error: "You don't have access to this spreadsheet. Please ask the owner to share it with you."
2. Do not retry (permission issue, not transient)

---

### 404 Not Found

**Cause**: Spreadsheet ID does not exist or is inaccessible

**Response**:
```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

**Client Action**:
1. Display error: "Spreadsheet not found. Please check configuration."
2. Log error with spreadsheet ID for debugging
3. Do not retry (configuration issue)

---

### 429 Rate Limit Exceeded

**Cause**: Exceeded 100 requests per 100 seconds quota

**Response**:
```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded for quota metric 'Read requests' and limit 'Read requests per 100 seconds per user'",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**Client Action**:
1. Use cached data if available
2. Display message: "Too many requests. Showing cached data. Refresh available in 60 seconds."
3. Implement exponential backoff (wait 60s, then retry)

---

### 500 Internal Server Error

**Cause**: Google Sheets service error

**Response**:
```json
{
  "error": {
    "code": 500,
    "message": "Internal error encountered.",
    "status": "INTERNAL"
  }
}
```

**Client Action**:
1. Retry with exponential backoff (2s, 4s, 8s)
2. After 3 failures, display: "Google Sheets service unavailable. Please try again later."

---

## Rate Limits

| Quota | Limit | Scope | Reset Period |
|-------|-------|-------|--------------|
| Read requests | 100 requests | Per user | 100 seconds |
| Project quota | 500 requests | Per project | 100 seconds |

**Client Mitigation Strategy**:
- Implement 60-second cache (prevents repeated fetches)
- Debounce manual refresh button (2-second cooldown)
- Display last fetch time to users
- Use cached data when rate limit hit

---

## Request/Response Examples

### Successful Authentication + Data Fetch

**Step 1: Initialize OAuth2**
```typescript
const tokenClient = google.accounts.oauth2.initTokenClient({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  callback: async (tokenResponse) => {
    if (tokenResponse.error) {
      handleAuthError(tokenResponse.error)
      return
    }
    
    // Store token in memory
    accessToken = tokenResponse.access_token
    
    // Fetch sheet data
    await fetchRumoursFromSheet()
  }
})

tokenClient.requestAccessToken()
```

**Step 2: Fetch Data**
```typescript
const response = await gapi.client.sheets.spreadsheets.values.get({
  spreadsheetId: import.meta.env.VITE_SPREADSHEET_ID,
  range: 'Sheet1!A2:J',
})

const rows = response.result.values || []
// Parse rows into Rumour objects
```

---

### Error Handling Example

```typescript
try {
  const response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:J',
  })
  return response.result.values || []
  
} catch (err: any) {
  const statusCode = err.status
  
  switch (statusCode) {
    case 401:
      // Trigger re-auth
      await refreshAuthToken()
      return fetchRumoursFromSheet() // Retry
      
    case 403:
      throw {
        code: 'FORBIDDEN',
        message: 'Permission denied',
        userMessage: "You don't have access to this spreadsheet.",
        retryable: false
      }
      
    case 404:
      throw {
        code: 'NOT_FOUND',
        message: 'Spreadsheet not found',
        userMessage: 'Spreadsheet not found. Check configuration.',
        retryable: false
      }
      
    case 429:
      throw {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests. Try again in 60 seconds.',
        retryable: true
      }
      
    default:
      throw {
        code: 'UNKNOWN',
        message: err.message,
        userMessage: 'Failed to load rumours. Please try again.',
        retryable: true
      }
  }
}
```

---

## Security Requirements

### OAuth2 Token Handling

**Storage**: 
- ✅ In-memory only (JavaScript variable)
- ❌ Do not store in localStorage/sessionStorage
- ❌ Do not store in cookies

**Transmission**:
- ✅ HTTPS required for all API calls
- ✅ Bearer token in Authorization header
- ❌ Never include token in URL query parameters

**Expiry**:
- Tokens expire in ~3600 seconds (1 hour)
- Implement token refresh before expiry
- Clear token on user sign-out

### CORS and CSP

**Content Security Policy** (production):
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://accounts.google.com https://apis.google.com;
  connect-src 'self' https://sheets.googleapis.com https://oauth2.googleapis.com;
  frame-src https://accounts.google.com;
  style-src 'self' 'unsafe-inline';
```

**CORS**: Google APIs handle CORS automatically; no client configuration needed.

---

## Testing Contract

### Mock API Responses

For unit tests, mock the following responses:

**Successful Fetch**:
```typescript
const mockSuccessResponse = {
  result: {
    range: 'Sheet1!A2:J',
    majorDimension: 'ROWS',
    values: [
      ['2025-12-15', '3rd Leaffall', 'Tavern', 'Peaks', '1200', '800', 'Dragon', '7', 'FALSE', 'Details']
    ]
  }
}
```

**Empty Sheet**:
```typescript
const mockEmptyResponse = {
  result: {
    range: 'Sheet1!A2:J',
    majorDimension: 'ROWS'
    // No 'values' field
  }
}
```

**401 Error**:
```typescript
const mock401Error = {
  status: 401,
  result: {
    error: {
      code: 401,
      message: 'Invalid credentials',
      status: 'UNAUTHENTICATED'
    }
  }
}
```

---

## Configuration

### Environment Variables

Required in `.env.local` (not committed to git):

```bash
# Google OAuth2 Client ID (from Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com

# Google API Key (from Google Cloud Console)
VITE_GOOGLE_API_KEY=AIzaSyABC123DEF456GHI789JKL012MNO345PQR

# Target Google Sheets ID (from sheet URL)
VITE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms

# Optional: Sheet name and range
VITE_SHEET_NAME=Sheet1
VITE_SHEET_RANGE=A2:J
```

### Google Cloud Console Setup

1. Create project in Google Cloud Console
2. Enable Google Sheets API
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized JavaScript origins:
   - `http://localhost:5173` (development)
   - `https://yourdomain.github.io` (production)
5. Create API key with Sheets API restriction
6. Copy credentials to `.env.local`

---

## Versioning

- **API Version**: Google Sheets API v4 (stable, no major changes expected)
- **OAuth Version**: OAuth 2.0 with PKCE (Google Identity Services)
- **Breaking Changes**: Monitor Google Cloud announcements for deprecation notices

**Deprecation Policy**: Google provides minimum 12-month notice for breaking changes to stable APIs.
