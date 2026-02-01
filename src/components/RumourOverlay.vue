<template>
  <div class="rumour-overlay">
    <!-- Rumour markers -->
    <RumourMarker
      v-for="rumour in rumours"
      :key="rumour.id"
      :rumour="rumour"
      :map-transform="mapTransform"
      :is-panning="mapTransform.isPanning"
      @toggle-pin="handleTogglePin"
      @drag-start="handleDragStart"
    />
  </div>
</template>

<script setup>
import { useRumourDrag } from "../composables/useRumourDrag";
import RumourMarker from "./RumourMarker.vue";

const props = defineProps({
  rumours: {
    type: Array,
    required: true,
  },
  mapTransform: {
    type: Object,
    required: true,
    default: () => ({
      scale: 1,
      translateX: 0,
      translateY: 0,
    }),
  },
});

const { startDrag } = useRumourDrag(props.mapTransform);

const handleTogglePin = (rumour) => {
  rumour.isPinned = !rumour.isPinned;
};

const handleDragStart = ({ rumour, event }) => {
  startDrag(rumour, event);
};
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
