import { ref, computed, onMounted, watch } from 'vue'
import { useGoogleAuth } from '@/composables/useGoogleAuth'
import { useRumoursFromGoogle } from '@/composables/useRumoursFromGoogle'
import type { Rumour } from '@/types/rumour'

/**
 * Extended Rumour type with UI state properties for map interaction
 */
export interface RumourWithUIState extends Rumour {
  isPinned: boolean
  isHovered: boolean
  isHidden: boolean
  isDragging: boolean
}

/**
 * Composable for loading and managing rumour data from Google Sheets
 * Provides backward-compatible interface with PSV-based useRumours
 * 
 * @returns {Object} - Contains rumours array, loading state, error state, auth state, and refresh method
 */
export function useRumours() {
  // Initialize Google authentication
  const { authState, hadPreviousSession, initializeAuth } = useGoogleAuth()
  
  // Initialize Google Sheets rumour fetching
  const { 
    rumours: googleRumours, 
    isLoading: googleLoading, 
    error: googleError,
    fetchRumours,
    refresh: refreshFromGoogle
  } = useRumoursFromGoogle()

  // Local state for UI-enhanced rumours
  const rumours = ref<RumourWithUIState[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed property for authentication status
  const isAuthenticated = computed(() => authState.value.isAuthenticated)

  /**
   * Transform Google Sheets rumour data to include UI state properties
   * @param googleRumour - Rumour from Google Sheets
   * @returns RumourWithUIState - Rumour with added UI properties
   */
  const transformToUIRumour = (googleRumour: Rumour): RumourWithUIState => {
    return {
      ...googleRumour,
      isPinned: true,
      isHovered: false,
      isHidden: false,
      isDragging: false
    }
  }

  /**
   * Load rumours from Google Sheets
   * Requires user to be authenticated first
   */
  const loadRumours = async () => {
    if (!isAuthenticated.value) {
      error.value = 'Please sign in with Google to load rumours'
      rumours.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await fetchRumours()
      
      // Transform Google rumours to include UI state
      rumours.value = googleRumours.value.map(transformToUIRumour)
      
      // Sync error state from Google composable
      if (googleError.value) {
        error.value = googleError.value.message || 'Failed to load rumours'
      } else if (rumours.value.length === 0) {
        console.warn('No valid rumours found in Google Sheet')
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error loading rumours'
      error.value = errorMessage
      console.error('Error loading rumours:', e)
      rumours.value = []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Refresh rumours from Google Sheets (bypass cache)
   */
  const refresh = async () => {
    if (!isAuthenticated.value) {
      error.value = 'Please sign in with Google to refresh rumours'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await refreshFromGoogle()
      
      // Transform refreshed Google rumours to include UI state
      rumours.value = googleRumours.value.map(transformToUIRumour)
      
      // Sync error state from Google composable
      if (googleError.value) {
        error.value = googleError.value.message || 'Failed to refresh rumours'
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error refreshing rumours'
      error.value = errorMessage
      console.error('Error refreshing rumours:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Computed property combining loading states
   */
  const combinedLoading = computed(() => isLoading.value || googleLoading.value)

  // Initialize Google Auth on mount
  onMounted(async () => {
    try {
      await initializeAuth()
      
      // Auto-load rumours if already authenticated
      if (isAuthenticated.value) {
        await loadRumours()
      }
    } catch (e) {
      console.error('Error initializing Google Auth:', e)
      error.value = 'Failed to initialize Google authentication'
    }
  })

  // Watch for authentication state changes and auto-load rumours
  watch(isAuthenticated, async (newValue, oldValue) => {
    // When authentication becomes true (e.g., after session restoration or manual sign-in)
    if (newValue === true && oldValue === false) {
      await loadRumours()
    }
  })

  return {
    rumours,
    isLoading: combinedLoading,
    error,
    isAuthenticated,
    loadRumours,
    refresh
  }
}
