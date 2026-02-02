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
  
  // Sync state (for position updates - 002-update-rumour-positions)
  sheetRowNumber: number        // 1-indexed row number in Google Sheets (e.g., 5 for row 5)
  originalX: number             // X coordinate when last fetched/saved from Sheets
  originalY: number             // Y coordinate when last fetched/saved from Sheets
  isModified: boolean           // True if any field differs from original
  modifiedFields?: Set<string>  // Set of field names that have been modified
  originalValues?: Record<string, any> // Original values for all fields
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

/**
 * Push error types for rumour position updates (002-update-rumour-positions)
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

export interface PushError {
  type: PushErrorType
  message: string              // Technical error message (for logging)
  userMessage: string          // User-friendly explanation
  retryable: boolean           // Whether user can retry the operation
  failedRumourIds?: string[]   // IDs of rumours that failed (for partial failures)
  httpStatus?: number          // HTTP status code if applicable
}
