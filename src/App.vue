<script setup>
import { computed } from "vue";
import PanZoomMap from "./components/PanZoomMap.vue";
import { useRumoursFromGoogle } from "./composables/useRumoursFromGoogle";
const { rumours, loading, error, loadRumours } = useRumoursFromGoogle();

// Filter out hidden rumours
const visibleRumours = computed(() => {
  return rumours?.value?.filter((rumour) => !rumour.isHidden) ?? [];
});

const mapImageUrl =
  "https://forum.sablewyvern.com/Image/the_savage_frontier_by_yora_player_map_v2.png";
</script>

<template>
  <div class="app-container">
    <header class="Header">
      <div class="Header-item">
        <h1 class="Header-title">Rumour Map</h1>
      </div>
      <div class="Header-item Header-item--full"></div>

      <div v-if="loading" class="Header-item">
        <span class="Label Label--primary">Loading rumours...</span>
      </div>

      <div v-else-if="error" class="Header-item error">
        <span class="Label Label--danger"
          >Failed to load rumours: {{ error }}</span
        >
      </div>

      <div v-else-if="rumours.length === 0" class="Header-item">
        <span class="Label Label--secondary">No rumours available</span>
      </div>
      <div class="Header-item">
        <button @click="loadRumours">Refresh</button>
      </div>
      <div class="Header-item">
        <span class="Label">High Resolution Map Viewer</span>
      </div>
    </header>

    <main class="main-content">
      <PanZoomMap :image-url="mapImageUrl" :rumours="visibleRumours" />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #0d1117;
}

.Header {
  background-color: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
}

.Header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #c9d1d9;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
