import { ref, computed } from 'vue'
import type { Rumour } from '@/types/rumour'

/**
 * Composable for managing the "add new rumour" workflow
 * Handles state for clicking on map to add rumour and form display
 */
export function useAddRumour() {
  // State for add mode
  const isAddMode = ref(false)
  const pendingCoordinates = ref<{ x: number; y: number } | null>(null)
  const showForm = ref(false)

  /**
   * Start add rumour mode - user can click on map
   */
  const startAddMode = () => {
    isAddMode.value = true
    pendingCoordinates.value = null
    showForm.value = false
  }

  /**
   * Capture map coordinates when user clicks
   */
  const captureCoordinates = (x: number, y: number) => {
    if (!isAddMode.value) return false
    
    pendingCoordinates.value = { x, y }
    showForm.value = true
    return true
  }

  /**
   * Cancel add mode - reset all state
   */
  const cancelAdd = () => {
    isAddMode.value = false
    pendingCoordinates.value = null
    showForm.value = false
  }

  /**
   * Complete add - called after successful save
   */
  const completeAdd = () => {
    isAddMode.value = false
    pendingCoordinates.value = null
    showForm.value = false
  }

  return {
    isAddMode,
    pendingCoordinates,
    showForm,
    startAddMode,
    captureCoordinates,
    cancelAdd,
    completeAdd
  }
}
