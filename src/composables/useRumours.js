import { ref, onMounted } from 'vue'

/**
 * Composable for loading and managing rumour data from PSV file
 * @returns {Object} - Contains rumours array, loading state, and error state
 */
export function useRumours() {
  const rumours = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * Parse PSV (Pipe-Separated Values) file content
   * @param {string} text - Raw PSV file content
   * @returns {Array} - Parsed rumour objects
   */
  const parsePSV = (text) => {
    try {
      return text
        .split('\n')
        .filter(line => line.trim())
        .map((line, index) => {
          const parts = line.split('|')
          
          if (parts.length !== 5) {
            console.warn(`Skipping malformed line ${index + 1}: expected 5 fields, got ${parts.length}`)
            return null
          }

          const [id, x, y, title, description] = parts
          const parsedX = parseFloat(x)
          const parsedY = parseFloat(y)

          // Validate coordinates
          if (isNaN(parsedX) || isNaN(parsedY)) {
            console.warn(`Skipping line ${index + 1}: invalid coordinates`)
            return null
          }

          // Clamp coordinates to map bounds (0-6500, 0-3600)
          const clampedX = Math.max(0, Math.min(6500, parsedX))
          const clampedY = Math.max(0, Math.min(3600, parsedY))

          return {
            id: id.trim(),
            x: clampedX,
            y: clampedY,
            title: title.trim(),
            description: description.trim(),
            isPinned: true,
            isHovered: false,
            isHidden: false,
            isDragging: false
          }
        })
        .filter(rumour => rumour !== null)
    } catch (e) {
      console.error('Error parsing PSV:', e)
      throw new Error('Failed to parse rumours file')
    }
  }

  /**
   * Load rumours from PSV file
   */
  const loadRumours = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Use BASE_URL to respect Vite's base path configuration
      const baseUrl = import.meta.env.BASE_URL
      const response = await fetch(`${baseUrl}rumours.psv`)
      
      if (!response.ok) {
        throw new Error(`Failed to load rumours: ${response.status} ${response.statusText}`)
      }

      const text = await response.text()
      rumours.value = parsePSV(text)
      
      if (rumours.value.length === 0) {
        console.warn('No valid rumours found in file')
      }
    } catch (e) {
      error.value = e.message
      console.error('Error loading rumours:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Load rumours on mount
  onMounted(() => {
    loadRumours()
  })

  return {
    rumours,
    isLoading,
    error,
    loadRumours
  }
}
