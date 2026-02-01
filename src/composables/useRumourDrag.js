import { ref, unref } from 'vue'
import { useRumourUpdates } from './useRumourUpdates'

/**
 * Composable for handling rumour drag-and-drop functionality
 * @param {Object|Ref} mapTransform - Reactive map transform object or ref with scale, translateX, translateY
 * @returns {Object} - Drag handling functions
 */
export function useRumourDrag(mapTransform) {
  const dragState = ref(null)
  const { markAsModified } = useRumourUpdates()

  /**
   * Get the current transform values, handling both refs and plain objects
   */
  const getTransform = () => {
    const transform = unref(mapTransform)
    return {
      scale: transform.scale,
      translateX: transform.translateX,
      translateY: transform.translateY
    }
  }

  /**
   * Start dragging a rumour
   * @param {Object} rumour - The rumour object to drag
   * @param {Event} event - The mouse or touch event
   */
  const startDrag = (rumour, event) => {
    if (rumour.isPinned) return

    // Prevent default to avoid text selection or page scroll
    event.preventDefault()

    rumour.isDragging = true

    // Get initial position (works for both mouse and touch events)
    const clientX = event.touches ? event.touches[0].clientX : event.clientX
    const clientY = event.touches ? event.touches[0].clientY : event.clientY

    const startX = clientX
    const startY = clientY
    const initialMapX = rumour.x
    const initialMapY = rumour.y
    
    // Capture the current transform values at drag start to use consistently during the drag
    const transform = getTransform()
    const dragScale = transform.scale

    /**
     * Handle drag movement
     */
    const onMove = (e) => {
      const moveClientX = e.touches ? e.touches[0].clientX : e.clientX
      const moveClientY = e.touches ? e.touches[0].clientY : e.clientY

      // Calculate delta in screen space
      const screenDx = moveClientX - startX
      const screenDy = moveClientY - startY

      // Convert screen delta to map space by dividing by scale
      // This accounts for the zoom level - when zoomed in (scale > 1), 
      // screen movement represents less map distance
      const mapDx = screenDx / dragScale
      const mapDy = screenDy / dragScale

      // Update position, clamping to map bounds (0-6500, 0-3600)
      rumour.x = Math.max(0, Math.min(6500, initialMapX + mapDx))
      rumour.y = Math.max(0, Math.min(3600, initialMapY + mapDy))

      e.preventDefault()
    }

    /**
     * Handle drag end
     */
    const onEnd = (e) => {
      rumour.isDragging = false

      // Check if position changed
      if (rumour.x !== rumour.originalX || rumour.y !== rumour.originalY) {
        rumour.isModified = true
        markAsModified(rumour.id)
      }

      // Remove event listeners
      if (e.type.startsWith('touch')) {
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
        document.removeEventListener('touchcancel', onEnd)
      } else {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onEnd)
      }

      dragState.value = null
    }

    // Add event listeners based on input type
    if (event.type.startsWith('touch')) {
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
      document.addEventListener('touchcancel', onEnd)
    } else {
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onEnd)
    }

    dragState.value = { rumour, onMove, onEnd }
  }

  /**
   * Stop any ongoing drag operation
   */
  const stopDrag = () => {
    if (dragState.value) {
      const { rumour, onMove, onEnd } = dragState.value
      rumour.isDragging = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onEnd)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
      dragState.value = null
    }
  }

  return {
    startDrag,
    stopDrag,
    dragState
  }
}
