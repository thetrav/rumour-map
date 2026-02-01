<template>
  <div
    ref="markerRef"
    class="rumour-marker"
    :class="{
      'is-pinned': rumour.isPinned,
      'is-unpinned': !rumour.isPinned,
      'is-hovered': rumour.isHovered,
      'is-dragging': rumour.isDragging
    }"
    :style="markerStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchMove"
    @keydown="handleKeyDown"
    :tabindex="0"
    :aria-label="`Rumour: ${rumour.title}`"
    :aria-expanded="rumour.isHovered"
    role="article"
  >
    <!-- Header with pin icon and title -->
    <div class="marker-header">
      <button
        class="pin-button"
        @click.stop="togglePin"
        :aria-label="rumour.isPinned ? 'Unpin this rumour to move it' : 'Pin this rumour'"
        :title="rumour.isPinned ? 'Click to unpin and drag' : 'Click to pin in place'"
      >
        <span v-if="rumour.isPinned">📍</span>
        <span v-else>⋮⋮</span>
      </button>
      <div class="marker-title">{{ rumour.title }}</div>
    </div>

    <!-- Description (shown on hover or mobile tap) -->
    <transition name="expand">
      <div 
        v-if="rumour.isHovered" 
        class="marker-description"
        :id="`description-${rumour.id}`"
        role="region"
        :aria-label="`Description for ${rumour.title}`"
      >
        <!-- Metadata Section -->
        <div v-if="hasMetadata" class="metadata-section">
          <div v-if="rumour.session_date" class="metadata-item">
            <span class="metadata-label">Session:</span>
            <span class="metadata-value">{{ formatDate(rumour.session_date) }}</span>
          </div>
          <div v-if="rumour.game_date" class="metadata-item">
            <span class="metadata-label">Game Date:</span>
            <span class="metadata-value">{{ rumour.game_date }}</span>
          </div>
          <div v-if="rumour.location_heard" class="metadata-item">
            <span class="metadata-label">Heard at:</span>
            <span class="metadata-value">{{ rumour.location_heard }}</span>
          </div>
          <div v-if="rumour.location_targetted" class="metadata-item">
            <span class="metadata-label">About:</span>
            <span class="metadata-value">{{ rumour.location_targetted }}</span>
          </div>
          <div v-if="rumour.rating !== null && rumour.rating !== undefined" class="metadata-item">
            <span class="metadata-label">Rating:</span>
            <span class="metadata-value">⭐ {{ rumour.rating }}/10</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Status:</span>
            <span :class="['metadata-value', rumour.resolved ? 'status-resolved' : 'status-unresolved']">
              {{ rumour.resolved ? '✓ Resolved' : '○ Unresolved' }}
            </span>
          </div>
        </div>

        <!-- Details Section -->
        <div v-if="rumour.details" class="details-section">
          {{ rumour.details }}
        </div>
        <div v-else class="details-section empty">
          <em>No details provided</em>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  rumour: {
    type: Object,
    required: true
  },
  mapTransform: {
    type: Object,
    required: true
  },
  isPanning: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-pin', 'drag-start'])

const markerRef = ref(null)

// Check if rumour has any metadata to display
const hasMetadata = computed(() => {
  return !!(
    props.rumour.session_date ||
    props.rumour.game_date ||
    props.rumour.location_heard ||
    props.rumour.location_targetted ||
    (props.rumour.rating !== null && props.rumour.rating !== undefined)
  )
})

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'Not specified'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // Return original if parsing fails
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (e) {
    return dateString // Return original on error
  }
}

// Calculate screen position from map coordinates
const markerStyle = computed(() => {
  const { scale, translateX, translateY } = props.mapTransform
  const screenX = (props.rumour.x * scale) + translateX
  const screenY = (props.rumour.y * scale) + translateY

  return {
    left: `${screenX}px`,
    top: `${screenY}px`,
    zIndex: props.rumour.isDragging ? 102 : (props.rumour.isHovered ? 101 : 100)
  }
})

const hoverTimeout = ref(null)
const collapseTimeout = ref(null)
const longPressTimeout = ref(null)

const handleMouseEnter = () => {
  // Don't expand markers while panning the map
  if (props.isPanning) return
  
  // Clear any pending collapse
  if (collapseTimeout.value) {
    clearTimeout(collapseTimeout.value)
    collapseTimeout.value = null
  }
  
  // Delay expansion by 300ms
  hoverTimeout.value = setTimeout(() => {
    props.rumour.isHovered = true
  }, 300)
}

const handleMouseLeave = () => {
  // Clear timeout if mouse leaves before expansion
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  
  // Collapse after 200ms delay
  collapseTimeout.value = setTimeout(() => {
    props.rumour.isHovered = false
  }, 200)
}

const togglePin = () => {
  emit('toggle-pin', props.rumour)
}

const handleMouseDown = (e) => {
  if (!props.rumour.isPinned && e.button === 0) {
    emit('drag-start', { rumour: props.rumour, event: e })
  }
}

// Touch handling
const handleTouchStart = (e) => {
  // For pinned rumours, implement long-press to unpin (mobile UX)
  if (props.rumour.isPinned) {
    longPressTimeout.value = setTimeout(() => {
      // Toggle expansion on tap (mobile behavior)
      props.rumour.isHovered = !props.rumour.isHovered
      longPressTimeout.value = null
    }, 150)
  } else {
    // For unpinned rumours, start drag immediately
    emit('drag-start', { rumour: props.rumour, event: e })
  }
}

const handleTouchEnd = (e) => {
  if (longPressTimeout.value) {
    clearTimeout(longPressTimeout.value)
    longPressTimeout.value = null
  }
}

const handleTouchMove = (e) => {
  // Cancel long-press if user starts moving
  if (longPressTimeout.value) {
    clearTimeout(longPressTimeout.value)
    longPressTimeout.value = null
  }
}

// Keyboard navigation
const handleKeyDown = (e) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      // Toggle pin state
      e.preventDefault()
      togglePin()
      break
    case 'Escape':
      // Re-pin if unpinned
      if (!props.rumour.isPinned) {
        props.rumour.isPinned = true
      }
      break
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      // Move unpinned rumours with arrow keys
      if (!props.rumour.isPinned) {
        e.preventDefault()
        const step = 10 // pixels in map coordinates
        
        switch (e.key) {
          case 'ArrowUp':
            props.rumour.y = Math.max(0, props.rumour.y - step)
            break
          case 'ArrowDown':
            props.rumour.y = Math.min(3600, props.rumour.y + step)
            break
          case 'ArrowLeft':
            props.rumour.x = Math.max(0, props.rumour.x - step)
            break
          case 'ArrowRight':
            props.rumour.x = Math.min(6500, props.rumour.x + step)
            break
        }
      }
      break
  }
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
  }
  if (collapseTimeout.value) {
    clearTimeout(collapseTimeout.value)
  }
  if (longPressTimeout.value) {
    clearTimeout(longPressTimeout.value)
  }
})
</script>

<style scoped>
.rumour-marker {
  position: absolute;
  background-color: rgba(22, 27, 34, 0.9);
  border: 1px solid #58a6ff;
  border-radius: 6px;
  padding: 0.5rem;
  max-width: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease-out;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  touch-action: none; /* Prevent default touch behaviors */
}

.rumour-marker:focus {
  outline: 2px solid #58a6ff;
  outline-offset: 2px;
}

.rumour-marker.is-pinned {
  cursor: pointer;
  border-color: #58a6ff;
}

.rumour-marker.is-unpinned {
  cursor: grab;
  border-color: #f78166;
}

.rumour-marker.is-dragging {
  cursor: grabbing;
  opacity: 0.8;
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.5);
}

.rumour-marker.is-hovered {
  background-color: rgba(22, 27, 34, 0.95);
  max-width: 300px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.marker-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pin-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.1s;
  flex-shrink: 0;
}

.pin-button:hover {
  transform: scale(1.2);
}

.pin-button:active {
  transform: scale(0.9);
}

.marker-title {
  color: #c9d1d9;
  font-size: 0.875rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.marker-description {
  color: #8b949e;
  font-size: 0.75rem;
  line-height: 1.4;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #30363d;
}

.metadata-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #21262d;
}

.metadata-item {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
}

.metadata-label {
  color: #6e7681;
  font-size: 0.7rem;
  font-weight: 500;
  min-width: 60px;
  flex-shrink: 0;
}

.metadata-value {
  color: #c9d1d9;
  font-size: 0.75rem;
  flex: 1;
}

.status-resolved {
  color: #3fb950 !important;
  font-weight: 500;
}

.status-unresolved {
  color: #f85149 !important;
  font-weight: 500;
}

.details-section {
  color: #8b949e;
  font-size: 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.details-section.empty {
  color: #6e7681;
  font-style: italic;
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease-out;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* Responsive sizing */
@media (max-width: 1023px) {
  .rumour-marker {
    max-width: 180px;
    font-size: 0.875rem;
  }

  .rumour-marker.is-hovered {
    max-width: 250px;
  }
}

@media (max-width: 767px) {
  .rumour-marker {
    max-width: 150px;
    font-size: 0.75rem;
    padding: 0.375rem;
  }

  .rumour-marker.is-hovered {
    max-width: 200px;
  }

  .marker-description {
    font-size: 0.7rem;
  }
}
</style>
