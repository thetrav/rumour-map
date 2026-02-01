/**
 * Core data types for Google Sheets Rumour Repository
 */

/**
 * Rumour data structure loaded from Google Sheets
 * Includes both source data and UI state
 */
export interface Rumour {
  // Google Sheets source data
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
  
  // UI state (not persisted)
  isPinned: boolean             // Whether marker is pinned
  isHovered: boolean            // Whether marker is being hovered
  isHidden: boolean             // Whether marker is hidden from view
  isDragging: boolean           // Whether marker is being dragged
}

/**
 * Raw row data from Google Sheets API
 * All values are strings until parsed
 */
export interface GoogleSheetsRow {
  session_date?: string         // Column A
  game_date?: string            // Column B
  location_heard?: string       // Column C
  location_targetted?: string   // Column D
  X: string                     // Column E - parsed to number
  Y: string                     // Column F - parsed to number
  title: string                 // Column G
  rating?: string               // Column H - parsed to number
  resolved?: string             // Column I - parsed to boolean
  details?: string              // Column J
}

/**
 * Filter state for rumour display
 */
export interface RumourFilterState {
  currentMode: 'all' | 'resolved' | 'unresolved'
  totalCount: number
  resolvedCount: number
  unresolvedCount: number
}

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
  userMessage: string           // User-friendly error description
  retryable: boolean            // Whether operation can be retried
  details?: any                 // Original error object
}
