<template>
  <div class="rumour-overlay">
    <!-- Loading state -->
    <div v-if="isLoading" class="overlay-message">
      <span class="Label Label--primary">Loading rumours...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="overlay-message error">
      <span class="Label Label--danger">Failed to load rumours: {{ error }}</span>
    </div>

    <!-- Empty state -->
    <div v-else-if="rumours.length === 0" class="overlay-message">
      <span class="Label Label--secondary">No rumours available</span>
    </div>

    <!-- Rumour markers -->
    <RumourMarker
      v-for="rumour in visibleRumours"
      :key="rumour.id"
      :rumour="rumour"
      :map-transform="mapTransform"
      @toggle-pin="handleTogglePin"
      @drag-start="handleDragStart"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRumours } from '../composables/useRumours'
import { useRumourDrag } from '../composables/useRumourDrag'
import RumourMarker from './RumourMarker.vue'

const props = defineProps({
  mapTransform: {
    type: Object,
    required: true,
    default: () => ({
      scale: 1,
      translateX: 0,
      translateY: 0
    })
  }
})

const { rumours, isLoading, error } = useRumours()
const { startDrag } = useRumourDrag(props.mapTransform)

// Filter out hidden rumours
const visibleRumours = computed(() => {
  return rumours.value.filter(rumour => !rumour.isHidden)
})

const handleTogglePin = (rumour) => {
  rumour.isPinned = !rumour.isPinned
}

const handleDragStart = ({ rumour, event }) => {
  startDrag(rumour, event)
}
</script>

<style scoped>
.rumour-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
}

.overlay-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.overlay-message.error .Label {
  background-color: #da3633;
}
</style>
