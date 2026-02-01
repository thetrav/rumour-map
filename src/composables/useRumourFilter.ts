import { ref, computed } from 'vue'
import type { Rumour, RumourFilterState } from '@/types/rumour'

/**
 * Filter mode types
 */
export type FilterMode = 'all' | 'resolved' | 'unresolved'

/**
 * Composable for filtering rumours by resolution status
 * Provides filter state management and filtered rumour computation
 * 
 * @param rumours - Reactive array of rumours to filter
 * @returns Filter state and methods
 */
export function useRumourFilter(rumours: { value: Rumour[] }) {
  // Filter mode state (all/resolved/unresolved)
  const filterMode = ref<FilterMode>('all')

  /**
   * Set the current filter mode
   * @param mode - The filter mode to apply
   */
  const setFilter = (mode: FilterMode) => {
    filterMode.value = mode
  }

  /**
   * Compute filtered rumours based on current filter mode
   */
  const filteredRumours = computed(() => {
    if (filterMode.value === 'all') {
      return rumours.value
    }

    return rumours.value.filter(rumour => {
      const isResolved = rumour.resolved === true
      
      if (filterMode.value === 'resolved') {
        return isResolved
      } else {
        return !isResolved
      }
    })
  })

  /**
   * Compute filter state with counts
   */
  const filterState = computed<RumourFilterState>(() => {
    const total = rumours.value.length
    
    // Count resolved rumours
    const resolvedCount = rumours.value.filter(rumour => rumour.resolved === true).length
    
    const unresolvedCount = total - resolvedCount

    return {
      currentMode: filterMode.value,
      totalCount: total,
      resolvedCount,
      unresolvedCount
    }
  })

  return {
    filterMode,
    setFilter,
    filteredRumours,
    filterState
  }
}
