import { ref, type Ref } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'
import type { Rumour, SheetsApiError } from '@/types/rumour'
import { useGoogleAuth } from './useGoogleAuth'
import { useRumourUpdates } from './useRumourUpdates'

// In-memory cache
let cachedData: Rumour[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60000 // 1 minute

// Header mapping cache
let headerMapping: Map<string, number> | null = null

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
   * Build header mapping from the first row of the sheet
   */
  const buildHeaderMapping = (headerRow: string[]): Map<string, number> => {
    const mapping = new Map<string, number>()
    headerRow.forEach((header, index) => {
      // Normalize header: trim and lowercase
      const normalizedHeader = header.trim().toLowerCase()
      mapping.set(normalizedHeader, index)
    })
    return mapping
  }

  /**
   * Get column index from header mapping with fallback
   */
  const getColumnIndex = (headers: Map<string, number>, ...possibleNames: string[]): number | null => {
    for (const name of possibleNames) {
      const index = headers.get(name.toLowerCase())
      if (index !== undefined) return index
    }
    return null
  }

  /**
   * Build a rumour data object from parsed row values
   */
  const buildRumourData = (
    row: string[],
    index: number,
    headers: Map<string, number>,
    titleIdx: number,
    sessionDateIdx: number | null,
    gameDateIdx: number | null,
    locationHeardIdx: number | null,
    locationTargettedIdx: number | null,
    ratingIdx: number | null,
    resolvedIdx: number | null,
    detailsIdx: number | null,
    clampedX: number,
    clampedY: number,
    validRating: number | null,
    resolved: boolean
  ) => {
    return {
      session_date: sessionDateIdx !== null ? (row[sessionDateIdx]?.trim() || null) : null,
      game_date: gameDateIdx !== null ? (row[gameDateIdx]?.trim() || null) : null,
      location_heard: locationHeardIdx !== null ? (row[locationHeardIdx]?.trim() || null) : null,
      location_targetted: locationTargettedIdx !== null ? (row[locationTargettedIdx]?.trim() || null) : null,
      x: clampedX,
      y: clampedY,
      title: row[titleIdx].trim(),
      rating: validRating,
      resolved: resolved,
      details: detailsIdx !== null ? (row[detailsIdx]?.trim() || null) : null
    }
  }

  /**
   * Parse a single row from Google Sheets into a Rumour object
   * Uses dynamic header mapping instead of hardcoded column indices
   */
  const parseSheetRow = (row: string[], index: number, headers: Map<string, number>): Rumour | null => {
    // Get column indices from headers
    const titleIdx = getColumnIndex(headers, 'title', 'rumour', 'name')
    const xIdx = getColumnIndex(headers, 'x', 'x coordinate', 'x_coordinate')
    const yIdx = getColumnIndex(headers, 'y', 'y coordinate', 'y_coordinate')

    // Skip rows with missing required fields (title column is required)
    if (titleIdx === null) {
      console.warn(`Cannot find required column (title) in header`)
      return null
    }

    if (!row[titleIdx]) {
      console.warn(`Skipping row ${index + 2}: missing required field (title)`)
      return null
    }

    // Parse coordinates - allow blank/undefined for auto-placement
    let x = 0
    let y = 0
    let hasValidCoordinates = false

    if (xIdx !== null && yIdx !== null && row[xIdx] && row[yIdx]) {
      const parsedX = parseFloat(row[xIdx])
      const parsedY = parseFloat(row[yIdx])
      
      if (!isNaN(parsedX) && !isNaN(parsedY)) {
        x = parsedX
        y = parsedY
        hasValidCoordinates = true
      }
    }

    // If no valid coordinates, log for potential auto-placement
    if (!hasValidCoordinates) {
      console.log(`Row ${index + 2}: no valid coordinates, will attempt auto-placement`)
    }

    // Clamp to map bounds (0-6500, 0-3600)
    const clampedX = Math.max(0, Math.min(6500, x))
    const clampedY = Math.max(0, Math.min(3600, y))

    // Log if clamping occurred
    if (clampedX !== x || clampedY !== y) {
      console.warn(`Row ${index + 2}: coordinates clamped from (${x}, ${y}) to (${clampedX}, ${clampedY})`)
    }

    // Get optional field indices
    const sessionDateIdx = getColumnIndex(headers, 'session_date', 'session date', 'session')
    const gameDateIdx = getColumnIndex(headers, 'game_date', 'game date', 'date')
    const locationHeardIdx = getColumnIndex(headers, 'location_heard', 'location heard', 'heard at')
    const locationTargettedIdx = getColumnIndex(headers, 'location_targetted', 'location targetted', 'location targeted', 'about', 'target')
    const ratingIdx = getColumnIndex(headers, 'rating', 'quality', 'importance')
    const resolvedIdx = getColumnIndex(headers, 'resolved', 'status', 'complete')
    const detailsIdx = getColumnIndex(headers, 'details', 'description', 'notes')

    // Parse rating (optional)
    const ratingStr = ratingIdx !== null ? row[ratingIdx] : null
    const rating = ratingStr ? parseFloat(ratingStr) : null
    const validRating = rating !== null && !isNaN(rating) 
      ? Math.max(0, Math.min(10, rating)) 
      : null

    // Parse resolved status
    const resolvedStr = resolvedIdx !== null ? (row[resolvedIdx] || '').toLowerCase().trim() : ''
    const resolved = ['true', 'yes', '1'].includes(resolvedStr)

    // Build rumour data (used for both the rumour object and originalValues)
    const rumourData = buildRumourData(
      row, index, headers, titleIdx, sessionDateIdx, gameDateIdx,
      locationHeardIdx, locationTargettedIdx, ratingIdx, resolvedIdx,
      detailsIdx, clampedX, clampedY, validRating, resolved
    )

    return {
      id: `rumour_${index + 2}`, // Row number as ID (row 1 is header)
      ...rumourData,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false,
      // Sync state fields (002-update-rumour-positions)
      sheetRowNumber: index + 2,  // 1-indexed row number (row 1 = header, row 2 = first data row)
      originalX: clampedX,        // Store original coordinates for change detection
      originalY: clampedY,
      isModified: false,          // No modifications yet
      modifiedFields: new Set(),  // Track which fields are modified
      originalValues: { ...rumourData } // Store original values for all editable fields
    }
  }

  /**
   * Auto-place rumours based on location_targetted
   * If a rumour has x=0, y=0 (no coordinates) but has a location_targetted value,
   * find another rumour with the same location_targetted that has defined coordinates
   * and copy those coordinates
   */
  const autoPlaceRumours = (rumours: Rumour[]): void => {
    const { markFieldAsModified } = useRumourUpdates()
    
    // Create a map of location_targetted to rumours with valid coordinates
    const locationToCoordinates = new Map<string, { x: number; y: number }>()
    
    // First pass: collect all rumours with valid coordinates and location_targetted
    rumours.forEach(rumour => {
      if (rumour.location_targetted && 
          (rumour.x !== 0 || rumour.y !== 0) && 
          !locationToCoordinates.has(rumour.location_targetted)) {
        locationToCoordinates.set(rumour.location_targetted, {
          x: rumour.x,
          y: rumour.y
        })
      }
    })
    
    // Second pass: auto-place rumours with no coordinates but matching location_targetted
    let autoPlacedCount = 0
    rumours.forEach(rumour => {
      // Check if rumour has no coordinates (0,0) but has a location_targetted
      if ((rumour.x === 0 && rumour.y === 0) && rumour.location_targetted) {
        const coordinates = locationToCoordinates.get(rumour.location_targetted)
        if (coordinates) {
          // Set the coordinates
          rumour.x = coordinates.x
          rumour.y = coordinates.y
          
          // Mark as modified so it gets saved
          markFieldAsModified(rumour, 'x')
          markFieldAsModified(rumour, 'y')
          
          autoPlacedCount++
          console.log(`Auto-placed rumour ${rumour.id} at (${coordinates.x}, ${coordinates.y}) based on location_targetted: "${rumour.location_targetted}"`)
        }
      }
    })
    
    if (autoPlacedCount > 0) {
      console.log(`✅ Auto-placed ${autoPlacedCount} rumour${autoPlacedCount > 1 ? 's' : ''} based on location_targetted`)
    }
  }

  /**
   * Fetch rumours from Google Sheets
   * @param useCache - Whether to use cached data if available
   * @param bypassWarning - Skip pending changes warning (for forced refresh)
   */
  const fetchRumours = async (useCache = true, bypassWarning = false): Promise<void> => {
    const { hasPendingChanges, pendingCount, clearAllModified } = useRumourUpdates()

    // Warn if there are pending changes (T033-T034)
    if (!bypassWarning && hasPendingChanges.value) {
      const confirmRefresh = confirm(
        `You have ${pendingCount.value} unsaved position change${pendingCount.value > 1 ? 's' : ''}.\n\n` +
        `Refreshing will discard these changes. Are you sure you want to continue?`
      )
      
      if (!confirmRefresh) {
        // User cancelled - don't refresh
        return
      }
      
      // User confirmed - clear pending changes
      clearAllModified()
    }

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

      // Build range string to include header row (starting from A1)
      const range = `${GOOGLE_CONFIG.sheetName}!A1:Z`

      // Fetch data
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
        range: range,
      })

      const rows = response.result.values || []

      if (rows.length === 0) {
        console.warn('No data found in sheet')
        rumours.value = []
        cachedData = []
        cacheTimestamp = Date.now()
        lastFetchTime.value = cacheTimestamp
        return
      }

      // First row is the header
      const headerRow = rows[0]
      headerMapping = buildHeaderMapping(headerRow)
      console.log('Header mapping:', Object.fromEntries(headerMapping))

      // Parse data rows (skip header)
      const dataRows = rows.slice(1)
      const parsedRumours = dataRows
        .map((row: string[], index: number) => parseSheetRow(row, index, headerMapping!))
        .filter((rumour: Rumour | null): rumour is Rumour => rumour !== null)

      // Auto-place rumours based on location_targetted
      autoPlaceRumours(parsedRumours)

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

  /**
   * Get the current header mapping (for write operations)
   */
  const getHeaderMapping = (): Map<string, number> | null => {
    return headerMapping
  }

  return {
    rumours,
    isLoading,
    error,
    lastFetchTime,
    fetchRumours,
    refresh,
    getHeaderMapping
  }
}
