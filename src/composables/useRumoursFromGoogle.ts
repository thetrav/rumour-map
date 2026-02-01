import { ref, type Ref } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'
import type { Rumour, SheetsApiError } from '@/types/rumour'
import { useGoogleAuth } from './useGoogleAuth'

// In-memory cache
let cachedData: Rumour[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute

/**
 * Composable for fetching and parsing rumours from Google Sheets
 */
export function useRumoursFromGoogle() {
  const rumours: Ref<Rumour[]> = ref([])
  const isLoading = ref(false)
  const error: Ref<SheetsApiError | null> = ref(null)
  const lastFetchTime: Ref<number | null> = ref(null)

  const { getAccessToken, hasValidToken } = useGoogleAuth()

  /**
   * Initialize gapi client
   */
  const initializeGapi = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if gapi is already loaded and initialized
      if (window.gapi?.client?.sheets) {
        resolve()
        return
      }

      // Wait for gapi to be available
      const checkGapi = setInterval(() => {
        if (window.gapi) {
          clearInterval(checkGapi)
          
          // Load the client library
          window.gapi.load('client', () => {
            window.gapi.client.init({
              discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
            }).then(() => {
              resolve()
            }).catch((err: any) => {
              reject(err)
            })
          })
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkGapi)
        reject(new Error('Timeout waiting for gapi library'))
      }, 10000)
    })
  }

  /**
   * Parse a single row from Google Sheets into a Rumour object
   */
  const parseSheetRow = (row: string[], index: number): Rumour | null => {
    // Skip rows with missing required fields (title, X, Y)
    if (!row[6] || !row[4] || !row[5]) {
      console.warn(`Skipping row ${index + 2}: missing required fields (title, X, or Y)`)
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

    // Clamp to map bounds (0-6500, 0-3600)
    const clampedX = Math.max(0, Math.min(6500, x))
    const clampedY = Math.max(0, Math.min(3600, y))

    // Log if clamping occurred
    if (clampedX !== x || clampedY !== y) {
      console.warn(`Row ${index + 2}: coordinates clamped from (${x}, ${y}) to (${clampedX}, ${clampedY})`)
    }

    // Parse rating (optional)
    const rating = row[7] ? parseFloat(row[7]) : null
    const validRating = rating !== null && !isNaN(rating) 
      ? Math.max(0, Math.min(10, rating)) 
      : null

    // Parse resolved status
    const resolvedStr = (row[8] || '').toLowerCase().trim()
    const resolved = ['true', 'yes', '1'].includes(resolvedStr)

    return {
      id: `rumour_${index + 2}`, // Row number as ID (row 1 is header)
      session_date: row[0]?.trim() || null,
      game_date: row[1]?.trim() || null,
      location_heard: row[2]?.trim() || null,
      location_targetted: row[3]?.trim() || null,
      x: clampedX,
      y: clampedY,
      title: row[6].trim(),
      rating: validRating,
      resolved: resolved,
      details: row[9]?.trim() || null,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false
    }
  }

  /**
   * Fetch rumours from Google Sheets
   */
  const fetchRumours = async (useCache = true): Promise<void> => {
    // Check cache
    const now = Date.now()
    if (useCache && cachedData && (now - cacheTimestamp) < CACHE_TTL) {
      rumours.value = cachedData
      lastFetchTime.value = cacheTimestamp
      return
    }

    // Check authentication
    if (!hasValidToken()) {
      error.value = {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        userMessage: 'Restoring session...',
        retryable: true
      }
      return
    }

    isLoading.value = true
    error.value = null

    try {
      // Ensure gapi is initialized
      if (!window.gapi?.client?.sheets) {
        await initializeGapi()
      }

      // Set access token
      window.gapi.client.setToken({ access_token: getAccessToken() })

      // Build range string
      const range = `${GOOGLE_CONFIG.sheetName}!${GOOGLE_CONFIG.sheetRange}`

      // Fetch data
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
        range: range,
      })

      const rows = response.result.values || []

      // Parse rows
      const parsedRumours = rows
        .map((row: string[], index: number) => parseSheetRow(row, index))
        .filter((rumour: Rumour | null): rumour is Rumour => rumour !== null)

      rumours.value = parsedRumours
      cachedData = parsedRumours
      cacheTimestamp = Date.now()
      lastFetchTime.value = cacheTimestamp

      console.log(`Loaded ${parsedRumours.length} rumours from Google Sheets`)

    } catch (err: any) {
      console.error('Error fetching rumours:', err)
      
      const statusCode = err.status || err.result?.error?.code

      switch (statusCode) {
        case 401:
          error.value = {
            code: 'UNAUTHORIZED',
            message: err.message,
            userMessage: 'Your session has expired. Please sign in again.',
            retryable: true,
            details: err
          }
          break
          
        case 403:
          error.value = {
            code: 'FORBIDDEN',
            message: err.message,
            userMessage: "You don't have access to this spreadsheet. Please ask the owner to share it with you.",
            retryable: false,
            details: err
          }
          break
          
        case 404:
          error.value = {
            code: 'NOT_FOUND',
            message: err.message,
            userMessage: 'Spreadsheet not found. Please check the configuration.',
            retryable: false,
            details: err
          }
          break
          
        case 429:
          error.value = {
            code: 'RATE_LIMIT',
            message: err.message,
            userMessage: 'Too many requests. Showing cached data. Try again in a minute.',
            retryable: true,
            details: err
          }
          // Use cached data if available
          if (cachedData) {
            rumours.value = cachedData
          }
          break
          
        default:
          error.value = {
            code: 'UNKNOWN',
            message: err.message || 'Unknown error',
            userMessage: 'Failed to load rumours. Please try again.',
            retryable: true,
            details: err
          }
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear cache and force refresh
   */
  const refresh = async (): Promise<void> => {
    cachedData = null
    cacheTimestamp = 0
    await fetchRumours(false)
  }

  return {
    rumours,
    isLoading,
    error,
    lastFetchTime,
    fetchRumours,
    refresh
  }
}
