import { ref, computed, type Ref } from 'vue'
import { gapi } from 'gapi-script'
import { GOOGLE_CONFIG } from '@/config/google'
import { useGoogleAuth } from './useGoogleAuth'
import type { Rumour, PushError, PushErrorType } from '@/types/rumour'

// Shared state across all instances
const modifiedRumours: Ref<Set<string>> = ref(new Set())

/**
 * Composable for managing rumour position updates to Google Sheets
 * 
 * Provides functionality to track position changes, validate coordinates,
 * and batch update rumour positions back to Google Sheets via the Sheets API.
 * 
 * Features:
 * - Tracks which rumours have pending position changes
 * - Validates coordinates are within map bounds (0-6500 x 0-3600)
 * - Batches multiple updates into a single API call for efficiency
 * - Comprehensive error handling with user-friendly messages
 * - Automatic state synchronization after successful pushes
 * 
 * @example
 * ```typescript
 * const { hasPendingChanges, pendingCount, markAsModified, pushUpdates } = useRumourUpdates()
 * 
 * // Mark rumour as modified after drag
 * markAsModified('rumour_2')
 * 
 * // Push all pending changes
 * await pushUpdates(rumours)
 * ```
 * 
 * @returns {Object} Composable interface with state and methods
 */
export function useRumourUpdates() {
  const { getAccessToken } = useGoogleAuth()
  const isPushing = ref(false)
  const pushError: Ref<PushError | null> = ref(null)
  const lastPushTime: Ref<number | null> = ref(null)

  /**
   * Check if there are any pending changes
   */
  const hasPendingChanges = computed(() => modifiedRumours.value.size > 0)

  /**
   * Get count of pending changes
   */
  const pendingCount = computed(() => modifiedRumours.value.size)

  /**
   * Mark a rumour as modified (has pending changes)
   * 
   * Adds the rumour ID to the internal Set of modified rumours,
   * which enables the Push Updates button and tracks pending changes.
   * 
   * @param rumourId - Unique identifier of the rumour (e.g., 'rumour_2')
   */
  const markAsModified = (rumourId: string) => {
    modifiedRumours.value.add(rumourId)
  }

  /**
   * Clear modified state for a single rumour
   */
  const clearModified = (rumourId: string) => {
    modifiedRumours.value.delete(rumourId)
  }

  /**
   * Clear all modified states
   */
  const clearAllModified = () => {
    modifiedRumours.value.clear()
  }

  /**
   * Validate rumour coordinates are within map bounds
   * 
   * Checks that X coordinates are within 0-6500 and Y coordinates
   * are within 0-3600. Invalid rumours are logged as warnings.
   * 
   * @param rumours - Array of rumours to validate
   * @returns Object with valid and invalid rumour arrays
   */
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

  /**
   * Map API errors to PushError with user-friendly messages
   * 
   * Converts technical API error responses into structured errors
   * with appropriate error types, user messages, and retry hints.
   * 
   * Handles the following error scenarios:
   * - 401: Authentication expired (retryable)
   * - 403: Permission denied (not retryable)
   * - 429: Rate limit exceeded (retryable)
   * - 400: Invalid range/configuration (not retryable)
   * - Network: Connection issues (retryable)
   * - Unknown: Unexpected errors (retryable)
   * 
   * @param error - Error object from API call
   * @returns Structured PushError with type and user message
   */
  const handleApiError = (error: any): PushError => {
    const status = error.status || error.code

    if (status === 401) {
      return {
        type: 'AUTH_ERROR',
        message: error.result?.error?.message || 'Unauthorized',
        userMessage: 'Your authentication has expired. Please sign in again.',
        retryable: true,
        httpStatus: 401
      }
    }

    if (status === 403) {
      return {
        type: 'PERMISSION_ERROR',
        message: error.result?.error?.message || 'Forbidden',
        userMessage: 'You do not have permission to edit this Google Sheet. Please check sharing settings.',
        retryable: false,
        httpStatus: 403
      }
    }

    if (status === 429) {
      return {
        type: 'RATE_LIMIT_ERROR',
        message: 'Rate limit exceeded',
        userMessage: 'Too many requests. Please wait a moment and try again.',
        retryable: true,
        httpStatus: 429
      }
    }

    if (status === 400) {
      return {
        type: 'INVALID_RANGE_ERROR',
        message: error.result?.error?.message || 'Bad Request',
        userMessage: 'Sheet configuration error. Please check that the sheet name matches your Google Sheets document.',
        retryable: false,
        httpStatus: 400
      }
    }

    if (!navigator.onLine || error.message?.toLowerCase().includes('network')) {
      return {
        type: 'NETWORK_ERROR',
        message: error.message || 'Network error',
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

  /**
   * Push position updates to Google Sheets
   * 
   * Batches all pending position changes into a single Google Sheets API
   * batchUpdate call for efficiency. Updates columns E (X) and F (Y) for
   * each modified rumour's corresponding row.
   * 
   * Process:
   * 1. Filters rumours to only those marked as modified
   * 2. Validates coordinates are within map bounds
   * 3. Builds batch update request with ranges like "Sheet!E2:F2"
   * 4. Calls Google Sheets API batchUpdate endpoint
   * 5. On success: Updates originalX/Y, clears modified flags
   * 6. On error: Preserves state and provides user-friendly error
   * 
   * @param rumours - Array of all rumours (modified ones will be pushed)
   * @returns Promise that resolves when push completes (success or error)
   * 
   * @example
   * ```typescript
   * await pushUpdates(rumours)
   * if (pushError.value) {
   *   console.error(pushError.value.userMessage)
   * }
   * ```
   */
  const pushUpdates = async (rumours: Rumour[]): Promise<void> => {
    isPushing.value = true
    pushError.value = null

    try {
      // Filter to only modified rumours
      const toUpdate = rumours.filter(r => modifiedRumours.value.has(r.id))

      if (toUpdate.length === 0) {
        pushError.value = {
          type: 'VALIDATION_ERROR',
          message: 'No changes to push',
          userMessage: 'No position changes to update.',
          retryable: false
        }
        isPushing.value = false
        return
      }

      // Validate coordinates
      const { valid, invalid } = validateUpdates(toUpdate)

      if (invalid.length > 0) {
        console.warn(`Skipping ${invalid.length} rumours with invalid coordinates`)
      }

      if (valid.length === 0) {
        pushError.value = {
          type: 'VALIDATION_ERROR',
          message: 'All rumours have invalid coordinates',
          userMessage: 'Cannot update: all positions are outside map bounds.',
          retryable: false
        }
        isPushing.value = false
        return
      }

      // Build batch update request
      // Columns E and F contain X and Y coordinates respectively
      const updates = valid.map(rumour => ({
        range: `${GOOGLE_CONFIG.sheetName}!E${rumour.sheetRowNumber}:F${rumour.sheetRowNumber}`,
        values: [[rumour.x, rumour.y]]
      }))

      // Make API call
      const response = await gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      })

      // Success: update rumour state
      valid.forEach(rumour => {
        rumour.originalX = rumour.x
        rumour.originalY = rumour.y
        rumour.isModified = false
        modifiedRumours.value.delete(rumour.id)
      })

      lastPushTime.value = Date.now()
      console.log(`✅ Updated ${response.result.totalUpdatedCells} cells (${valid.length} rumours)`)

      // Check for partial failures
      if (invalid.length > 0) {
        pushError.value = {
          type: 'PARTIAL_FAILURE',
          message: `${valid.length} succeeded, ${invalid.length} failed validation`,
          userMessage: `${valid.length} of ${toUpdate.length} rumours updated. ${invalid.length} had invalid coordinates.`,
          retryable: false,
          failedRumourIds: invalid.map(r => r.id)
        }
      }

    } catch (error: any) {
      console.error('Push failed:', error)
      pushError.value = handleApiError(error)
    } finally {
      isPushing.value = false
    }
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
