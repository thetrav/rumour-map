<template>
  <div class="rumour-overlay">
    <!-- Clustered rumour markers -->
    <template v-for="cluster in clusters" :key="cluster.id">
      <!-- Single rumour (no cluster) -->
      <RumourMarker
        v-if="!cluster.isCluster"
        :rumour="cluster.rumours[0]"
        :map-transform="mapTransform"
        :is-panning="mapTransform.isPanning"
        @toggle-pin="handleTogglePin"
        @drag-start="handleDragStart"
      />
      <!-- Cluster marker -->
      <ClusterMarker
        v-else
        :cluster="cluster"
        :map-transform="mapTransform"
        :is-panning="mapTransform.isPanning"
        @toggle-pin="handleTogglePin"
        @drag-start="handleDragStart"
      />
    </template>
  </div>
</template>

<script setup>
import { toRef } from 'vue';
import { useRumourDrag } from '../composables/useRumourDrag';
import { useRumourClustering } from '../composables/useRumourClustering';
import RumourMarker from './RumourMarker.vue';
import ClusterMarker from './ClusterMarker.vue';

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

// Use clustering with 100px radius
const { clusters } = useRumourClustering(
  toRef(props, "rumours"),
  toRef(props, "mapTransform"),
  100
);

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
