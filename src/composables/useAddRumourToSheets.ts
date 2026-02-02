import { ref } from 'vue'
import { gapi } from 'gapi-script'
import { GOOGLE_CONFIG } from '@/config/google'
import { useGoogleAuth } from './useGoogleAuth'

interface NewRumourData {
  title: string
  details: string | null
  session_date: string | null
  game_date: string | null
  location_heard: string | null
  location_targetted: string | null
  rating: number | null
  resolved: boolean
  x: number
  y: number
}

/**
 * Composable for adding new rumours to Google Sheets
 */
export function useAddRumourToSheets() {
  const { getAccessToken, hasValidToken } = useGoogleAuth()
  const isAdding = ref(false)
  const addError = ref<string | null>(null)

  /**
   * Add a new rumour to Google Sheets
   * Appends a new row to the sheet with the rumour data
   */
  const addRumour = async (
    data: NewRumourData,
    headerMapping: Map<string, number> | null
  ): Promise<boolean> => {
    if (!hasValidToken()) {
      addError.value = 'Not authenticated. Please sign in again.'
      return false
    }

    isAdding.value = true
    addError.value = null

    try {
      // Set access token
      gapi.client.setToken({ access_token: getAccessToken() })

      // If we have header mapping, construct row in correct order
      let values: any[]
      
      if (headerMapping) {
        // Create array with correct size based on header count
        const rowSize = Math.max(...Array.from(headerMapping.values())) + 1
        values = new Array(rowSize).fill('')
        
        // Map each field to its column index
        const fieldMapping: Record<string, any> = {
          'session_date': data.session_date || '',
          'session date': data.session_date || '',
          'game_date': data.game_date || '',
          'game date': data.game_date || '',
          'location_heard': data.location_heard || '',
          'location heard': data.location_heard || '',
          'location_targetted': data.location_targetted || '',
          'location targetted': data.location_targetted || '',
          'location targeted': data.location_targetted || '',
          'x': data.x,
          'y': data.y,
          'title': data.title,
          'rating': data.rating !== null ? data.rating : '',
          'resolved': data.resolved ? 'TRUE' : 'FALSE',
          'details': data.details || '',
          'description': data.details || '',
          'notes': data.details || ''
        }
        
        // Fill in values based on header mapping
        for (const [header, index] of headerMapping.entries()) {
          const normalizedHeader = header.toLowerCase()
          if (fieldMapping[normalizedHeader] !== undefined) {
            values[index] = fieldMapping[normalizedHeader]
          }
        }
      } else {
        // Fallback: use hardcoded column order (A-J)
        // A: session_date, B: game_date, C: location_heard, D: location_targetted
        // E: X, F: Y, G: title, H: rating, I: resolved, J: details
        values = [
          data.session_date || '',
          data.game_date || '',
          data.location_heard || '',
          data.location_targetted || '',
          data.x,
          data.y,
          data.title,
          data.rating !== null ? data.rating : '',
          data.resolved ? 'TRUE' : 'FALSE',
          data.details || ''
        ]
      }

      // Append the new row
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
        range: `${GOOGLE_CONFIG.sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [values]
        }
      })

      console.log('✅ Added new rumour:', response.result)
      return true

    } catch (error: any) {
      console.error('Failed to add rumour:', error)
      
      const status = error.status || error.code
      
      if (status === 401) {
        addError.value = 'Your session has expired. Please sign in again.'
      } else if (status === 403) {
        addError.value = "You don't have permission to edit this spreadsheet."
      } else if (status === 429) {
        addError.value = 'Too many requests. Please wait a moment and try again.'
      } else {
        addError.value = 'Failed to add rumour. Please try again.'
      }
      
      return false
    } finally {
      isAdding.value = false
    }
  }

  return {
    isAdding,
    addError,
    addRumour
  }
}
