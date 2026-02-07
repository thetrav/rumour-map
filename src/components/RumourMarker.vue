<template>
  <div
    ref="markerRef"
    class="rumour-marker"
    :class="{
      'is-pinned': rumour.isPinned,
      'is-unpinned': !rumour.isPinned,
      'is-hovered': rumour.isHovered,
      'is-dragging': rumour.isDragging,
      'is-modified': rumour.isModified,
      'is-editing': isEditing
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
    :aria-label="rumour.isModified ? `Rumour: ${rumour.title} (Modified, pending push)` : `Rumour: ${rumour.title}`"
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
        :disabled="isEditing"
      >
        <span v-if="rumour.isPinned">📍</span>
        <span v-else>🔀</span>
      </button>
      <div v-if="rumour.isHovered && !isEditing" class="marker-title">{{ rumour.title }}</div>
      <input
        v-if="rumour.isHovered && isEditing"
        v-model="editData.title"
        class="edit-input edit-title"
        type="text"
        placeholder="Title"
        @click.stop
      />
      <span 
        v-if="rumour.isModified" 
        class="modified-indicator" 
        aria-label="Modified, pending push"
        :title="getModifiedFieldsText()"
      >
        ⚠️
      </span>
      <button
        v-if="rumour.isHovered && !isEditing"
        class="edit-button"
        @click.stop="startEditing"
        aria-label="Edit rumour details"
        title="Edit rumour details"
      >
        ✏️
      </button>
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
        <!-- Edit Mode -->
        <div v-if="isEditing" class="edit-form">
          <div class="edit-field">
            <label class="edit-label">Session Date:</label>
            <input
              v-model="editData.session_date"
              class="edit-input"
              type="text"
              placeholder="Session date"
              @click.stop
            />
          </div>
          <div class="edit-field">
            <label class="edit-label">Game Date:</label>
            <input
              v-model="editData.game_date"
              class="edit-input"
              type="text"
              placeholder="Game date"
              @click.stop
            />
          </div>
          <div class="edit-field">
            <label class="edit-label">Heard at:</label>
            <input
              v-model="editData.location_heard"
              class="edit-input"
              type="text"
              placeholder="Location where heard"
              @click.stop
            />
          </div>
          <div class="edit-field">
            <label class="edit-label">About:</label>
            <input
              v-model="editData.location_targetted"
              class="edit-input"
              type="text"
              placeholder="Location being referred to"
              @click.stop
            />
          </div>
          <div class="edit-field">
            <label class="edit-label">Rating (0-10):</label>
            <input
              v-model.number="editData.rating"
              class="edit-input"
              type="number"
              min="0"
              max="10"
              step="0.1"
              placeholder="Rating"
              @click.stop
            />
          </div>
          <div class="edit-field">
            <label class="edit-label">Status:</label>
            <select
              v-model="editData.resolved"
              class="edit-input"
              @click.stop
            >
              <option :value="false">○ Unresolved</option>
              <option :value="true">✓ Resolved</option>
            </select>
          </div>
          <div class="edit-field">
            <label class="edit-label">Details:</label>
            <textarea
              v-model="editData.details"
              class="edit-input edit-textarea"
              placeholder="Details"
              rows="3"
              @click.stop
            ></textarea>
          </div>
          
          <div class="edit-actions">
            <button
              class="save-button"
              @click.stop="saveEdits"
              title="Save changes"
            >
              💾 Save
            </button>
            <button
              class="cancel-button"
              @click.stop="cancelEditing"
              title="Cancel editing"
            >
              ✕ Cancel
            </button>
          </div>
        </div>

        <!-- View Mode -->
        <template v-else>
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
        </template>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRumourUpdates } from '@/composables/useRumourUpdates'

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

const { markFieldAsModified } = useRumourUpdates()

const markerRef = ref(null)
const isEditing = ref(false)
const editData = ref({
  title: '',
  session_date: '',
  game_date: '',
  location_heard: '',
  location_targetted: '',
  rating: null,
  resolved: false,
  details: ''
})

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
  // Don't collapse when in edit mode
  if (isEditing.value) {
    return
  }
  
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
  // Don't start drag when in edit mode
  if (isEditing.value) {
    return
  }
  
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
  // Don't handle keyboard shortcuts when in edit mode (except Escape)
  // This allows inputs to handle Enter, Space, and Arrow keys naturally
  if (isEditing.value && e.key !== 'Escape') {
    return
  }
  
  switch (e.key) {
    case 'Enter':
    case ' ':
      // Toggle pin state
      e.preventDefault()
      togglePin()
      break
    case 'Escape':
      // Cancel editing or re-pin if unpinned
      if (isEditing.value) {
        cancelEditing()
      } else if (!props.rumour.isPinned) {
        props.rumour.isPinned = true
      }
      break
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      // Move unpinned rumours with arrow keys
      if (!props.rumour.isPinned && !isEditing.value) {
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

// Edit mode functions
const startEditing = () => {
  isEditing.value = true
  // Copy current values to edit data
  editData.value = {
    title: props.rumour.title,
    session_date: props.rumour.session_date || '',
    game_date: props.rumour.game_date || '',
    location_heard: props.rumour.location_heard || '',
    location_targetted: props.rumour.location_targetted || '',
    rating: props.rumour.rating,
    resolved: props.rumour.resolved,
    details: props.rumour.details || ''
  }
}

const saveEdits = () => {
  // Check what fields have changed and mark them as modified
  const editableFields = ['title', 'session_date', 'game_date', 'location_heard', 'location_targetted', 'rating', 'resolved', 'details']
  
  editableFields.forEach(fieldName => {
    const newValue = editData.value[fieldName]
    const oldValue = props.rumour.originalValues?.[fieldName]
    
    // Handle null/empty string equivalence and type coercion
    const normalizedNew = (newValue === '' || newValue === null || newValue === undefined) ? null : newValue
    const normalizedOld = (oldValue === '' || oldValue === null || oldValue === undefined) ? null : oldValue
    
    // Use loose equality (!=) intentionally for type coercion between null/undefined
    // This handles cases where Google Sheets may return undefined vs null vs empty string
    // eslint-disable-next-line eqeqeq
    if (normalizedNew != normalizedOld) {
      // Update the rumour object (note: direct mutation is acceptable here as rumour is a reactive object)
      props.rumour[fieldName] = normalizedNew
      
      // Mark field as modified
      markFieldAsModified(props.rumour, fieldName)
    }
  })
  
  isEditing.value = false
}

const cancelEditing = () => {
  isEditing.value = false
  editData.value = {
    title: '',
    session_date: '',
    game_date: '',
    location_heard: '',
    location_targetted: '',
    rating: null,
    resolved: false,
    details: ''
  }
}

// Get a text description of modified fields
const getModifiedFieldsText = () => {
  if (!props.rumour.modifiedFields || props.rumour.modifiedFields.size === 0) {
    return 'Position changed - click Push Updates to save'
  }
  const fields = Array.from(props.rumour.modifiedFields).join(', ')
  return `Modified fields: ${fields} - click Push Updates to save`
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
:root {
  --pin-size: 35px;
}

.rumour-marker {
  position: absolute;
  background-color: rgba(22, 27, 34, 0.9);
  border: 1px solid #58a6ff;
  border-radius: 6px;
  padding: 0.25rem;
  width: var(--pin-size);
  height: var(--pin-size);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease-out;
  transform-origin: top left;
  pointer-events: auto;
  touch-action: none; /* Prevent default touch behaviors */
  display: flex;
  align-items: center;
  justify-content: center;
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

.rumour-marker.is-modified {
  border-color: #d29922;
  border-width: 2px;
  box-shadow: 0 0 0 2px rgba(210, 153, 34, 0.2), 0 4px 6px rgba(0, 0, 0, 0.3);
}

.rumour-marker.is-editing {
  background-color: rgba(22, 27, 34, 0.98);
  width: auto;
  max-width: 350px;
  min-width: 300px;
  height: auto;
  padding: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  display: block;
  border-color: #1f6feb;
}

.rumour-marker.is-dragging {
  cursor: grabbing;
  opacity: 0.8;
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.5);
}

.rumour-marker.is-hovered {
  background-color: rgba(22, 27, 34, 0.95);
  width: auto;
  height: auto;
  max-width: 300px;
  padding: 0.5rem;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  display: block;
}

.marker-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rumour-marker:not(.is-hovered) .marker-header {
  justify-content: center;
}

.pin-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1.2rem;
  line-height: 1;
  transition: transform 0.1s;
  flex-shrink: 0;
}

.rumour-marker.is-hovered .pin-button {
  font-size: 1rem;
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

.modified-indicator {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
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

/* Edit button */
.edit-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  transition: transform 0.1s;
  flex-shrink: 0;
  margin-left: auto;
}

.edit-button:hover {
  transform: scale(1.2);
}

.edit-button:active {
  transform: scale(0.9);
}

.pin-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Edit form */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edit-label {
  color: #8b949e;
  font-size: 0.7rem;
  font-weight: 500;
}

.edit-input {
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #c9d1d9;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-family: inherit;
  width: 100%;
  transition: border-color 0.2s;
}

.edit-input:focus {
  outline: none;
  border-color: #1f6feb;
}

.edit-input::placeholder {
  color: #6e7681;
}

.edit-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.edit-textarea {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
  line-height: 1.5;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #30363d;
}

.save-button,
.cancel-button {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.save-button {
  background-color: #238636;
  color: white;
}

.save-button:hover {
  background-color: #2ea043;
}

.cancel-button {
  background-color: #6e7681;
  color: white;
}

.cancel-button:hover {
  background-color: #8b949e;
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
  .rumour-marker:not(.is-hovered) {
    width: 32px;
    height: 32px;
  }

  .rumour-marker.is-hovered {
    max-width: 250px;
    font-size: 0.875rem;
  }
}

@media (max-width: 767px) {
  .rumour-marker:not(.is-hovered) {
    width: 28px;
    height: 28px;
  }

  .rumour-marker.is-hovered {
    max-width: 200px;
    font-size: 0.75rem;
    padding: 0.375rem;
  }

  .marker-description {
    font-size: 0.7rem;
  }
}
</style>
