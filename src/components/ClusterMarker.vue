<template>
  <div
    ref="clusterRef"
    class="cluster-marker"
    :class="{
      'is-expanded': isExpanded,
      'is-hovered': isHovered
    }"
    :style="clusterStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="toggleExpand"
    :tabindex="0"
    :aria-label="`Cluster of ${cluster.rumours.length} rumours`"
    :aria-expanded="isExpanded"
    role="button"
  >
    <!-- Cluster count indicator -->
    <div v-if="!isExpanded" class="cluster-count">
      {{ cluster.rumours.length }}
    </div>

    <!-- Expanded cluster - show individual pins -->
    <div v-if="isExpanded" class="cluster-expanded">
      <div
        v-for="rumour in cluster.rumours"
        :key="rumour.id"
        class="cluster-pin-item"
        :title="rumour.title"
        @click.stop="handlePinClick(rumour)"
      >
        <span v-if="rumour.isPinned">📍</span>
        <span v-else>⋮⋮</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ClusteredRumour, MapTransform } from '../composables/useRumourClustering'

const props = defineProps<{
  cluster: ClusteredRumour
  mapTransform: MapTransform
  isPanning: boolean
}>()

defineEmits<{
  'toggle-pin': [rumour: any]
  'drag-start': [data: any]
}>()

const clusterRef = ref<HTMLElement | null>(null)
const isExpanded = ref(false)
const isHovered = ref(false)

const clusterStyle = computed(() => {
  return {
    left: `${props.cluster.screenX}px`,
    top: `${props.cluster.screenY}px`,
    zIndex: isExpanded.value ? 103 : (isHovered.value ? 101 : 100)
  }
})

const handleMouseEnter = () => {
  if (!props.isPanning) {
    isHovered.value = true
  }
}

const handleMouseLeave = () => {
  isHovered.value = false
}

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const handlePinClick = (rumour: any) => {
  // Set the rumour as hovered to show details
  rumour.isHovered = !rumour.isHovered
}
</script>

<style scoped>
:root {
  --pin-size: 35px;
}

.cluster-marker {
  position: absolute;
  background-color: rgba(88, 166, 255, 0.9);
  border: 2px solid #58a6ff;
  border-radius: 50%;
  width: var(--pin-size);
  height: var(--pin-size);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease-out;
  transform-origin: center;
  pointer-events: auto;
  cursor: pointer;
  transform: translate(-50%, -50%);
}

.cluster-marker:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

.cluster-marker:focus {
  outline: 2px solid #58a6ff;
  outline-offset: 2px;
}

.cluster-count {
  color: #0d1117;
  font-size: 0.875rem;
  font-weight: bold;
  user-select: none;
}

.cluster-marker.is-expanded {
  background: transparent;
  border: none;
  box-shadow: none;
  width: auto;
  height: auto;
  border-radius: 0;
}

.cluster-marker.is-expanded:hover {
  transform: translate(-50%, -50%);
}

.cluster-expanded {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, var(--pin-size));
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(22, 27, 34, 0.95);
  border: 1px solid #58a6ff;
  border-radius: 6px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
  max-width: 300px;
}

.cluster-pin-item {
  width: var(--pin-size);
  height: var(--pin-size);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(22, 27, 34, 0.9);
  border: 1px solid #58a6ff;
  border-radius: 6px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease-out;
}

.cluster-pin-item:hover {
  transform: scale(1.1);
  background-color: rgba(22, 27, 34, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
