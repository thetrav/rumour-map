<script setup lang="ts">
import { computed } from "vue";
import PanZoomMap from "./components/PanZoomMap.vue";
import GoogleAuthButton from "./components/GoogleAuthButton.vue";
import PushUpdatesButton from "./components/PushUpdatesButton.vue";
import AddRumourForm from "./components/AddRumourForm.vue";
import { useRumours } from "./composables/useRumours";
import { useRumourFilter } from "./composables/useRumourFilter";
import { useAddRumour } from "./composables/useAddRumour";
import { useAddRumourToSheets } from "./composables/useAddRumourToSheets";

const { rumours, isLoading, error, isAuthenticated, loadRumours, refresh, getHeaderMapping } = useRumours();

// Apply filtering to rumours
const { filteredRumours, filterState, setFilter, filterMode } = useRumourFilter(rumours);

// Filter out hidden rumours from the filtered set
const visibleRumours = computed(() => {
  return filteredRumours?.value?.filter((rumour) => !rumour.isHidden) ?? [];
});

// Add rumour state
const { isAddMode, pendingCoordinates, showForm, startAddMode, captureCoordinates, cancelAdd, completeAdd } = useAddRumour();
const { isAdding, addError, addRumour } = useAddRumourToSheets();

const mapImageUrl =
  "https://forum.sablewyvern.com/Image/the_savage_frontier_by_yora_player_map_v2.png";

// Handle map click in add mode
const handleMapClick = (coords: { x: number; y: number }) => {
  captureCoordinates(coords.x, coords.y);
};

// Handle save from form
const handleSaveRumour = async (formData: any) => {
  if (!pendingCoordinates.value) return;

  const newRumourData = {
    ...formData,
    x: pendingCoordinates.value.x,
    y: pendingCoordinates.value.y
  };

  const success = await addRumour(newRumourData, getHeaderMapping());
  
  if (success) {
    completeAdd();
    // Refresh to show the new rumour
    await refresh();
  }
};

// Handle cancel from form
const handleCancelAdd = () => {
  cancelAdd();
};
</script>

<template>
  <div class="app-container">
    <header class="Header">
      <div class="Header-item">
        <h1 class="Header-title">Rumour Map</h1>
      </div>
      <div class="Header-item Header-item--full"></div>

      <!-- Authentication Status -->
      <div v-if="!isAuthenticated" class="Header-item">
        <GoogleAuthButton />
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="Header-item">
        <span class="Label Label--primary">Loading rumours...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="Header-item error">
        <span class="Label Label--danger">{{ error }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="rumours.length === 0" class="Header-item">
        <span class="Label Label--secondary">No rumours available</span>
      </div>

      <!-- Filter Controls (when authenticated and have rumours) -->
      <div v-if="isAuthenticated && rumours.length > 0" class="Header-item filter-controls">
        <button 
          @click="setFilter('all')" 
          :class="['filter-btn', { 'active': filterMode === 'all' }]"
          :title="`Show all ${filterState.totalCount} rumours`"
        >
          All ({{ filterState.totalCount }})
        </button>
        <button 
          @click="setFilter('resolved')" 
          :class="['filter-btn', { 'active': filterMode === 'resolved' }]"
          :title="`Show ${filterState.resolvedCount} resolved rumours`"
        >
          Resolved ({{ filterState.resolvedCount }})
        </button>
        <button 
          @click="setFilter('unresolved')" 
          :class="['filter-btn', { 'active': filterMode === 'unresolved' }]"
          :title="`Show ${filterState.unresolvedCount} unresolved rumours`"
        >
          Unresolved ({{ filterState.unresolvedCount }})
        </button>
      </div>

      <!-- Authenticated Actions -->
      <div v-if="isAuthenticated" class="Header-item">
        <button 
          @click="startAddMode" 
          :class="['btn-add-rumour', { 'active': isAddMode }]" 
          :disabled="isLoading"
          :title="isAddMode ? 'Click on map to place rumour' : 'Add new rumour'"
        >
          {{ isAddMode ? '📍 Click Map' : '➕ Add Rumour' }}
        </button>
      </div>

      <div v-if="isAuthenticated" class="Header-item">
        <button @click="refresh" class="btn-refresh" :disabled="isLoading">
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="isAuthenticated" class="Header-item">
        <GoogleAuthButton />
      </div>

      <div class="Header-item">
        <span class="Label">High Resolution Map Viewer</span>
      </div>
    </header>

    <main class="main-content">
      <!-- Show authentication prompt if not authenticated -->
      <div v-if="!isAuthenticated" class="auth-prompt">
        <div class="auth-prompt-content">
          <h2>Welcome to Rumour Map</h2>
          <p>Please sign in with Google to view rumours from Google Sheets</p>
          <GoogleAuthButton />
        </div>
      </div>

      <!-- Show map when authenticated -->
      <PanZoomMap 
        v-else 
        :image-url="mapImageUrl" 
        :rumours="visibleRumours" 
        :is-add-mode="isAddMode"
        @map-click="handleMapClick"
      />
      
      <!-- Push Updates Button (shown when authenticated) -->
      <PushUpdatesButton v-if="isAuthenticated" :rumours="rumours" :get-header-mapping="getHeaderMapping" />

      <!-- Add Rumour Form -->
      <AddRumourForm
        v-if="pendingCoordinates"
        :show="showForm"
        :coordinates="pendingCoordinates"
        @save="handleSaveRumour"
        @cancel="handleCancelAdd"
      />
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
  gap: 0.5rem;
}

.Header-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #c9d1d9;
}

.Header-item {
  display: flex;
  align-items: center;
}

.Header-item--full {
  flex: 1;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.auth-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #0d1117;
}

.auth-prompt-content {
  text-align: center;
  padding: 2rem;
  max-width: 500px;
}

.auth-prompt-content h2 {
  color: #c9d1d9;
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

.auth-prompt-content p {
  color: #8b949e;
  font-size: 1rem;
  margin-bottom: 2rem;
}

.btn-refresh {
  background-color: #238636;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background-color: #2ea043;
}

.btn-refresh:disabled {
  background-color: #1f6feb;
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add-rumour {
  background-color: #1f6feb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-add-rumour:hover:not(:disabled) {
  background-color: #388bfd;
}

.btn-add-rumour:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-add-rumour.active {
  background-color: #238636;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(35, 134, 54, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(35, 134, 54, 0);
  }
}

.Label {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.Label--primary {
  background-color: #1f6feb;
  color: white;
}

.Label--danger {
  background-color: #da3633;
  color: white;
}

.Label--secondary {
  background-color: #6e7681;
  color: white;
}

.error {
  color: #f85149;
}

.filter-controls {
  display: flex;
  gap: 0.25rem;
  background-color: #21262d;
  padding: 0.25rem;
  border-radius: 6px;
}

.filter-btn {
  background-color: transparent;
  color: #8b949e;
  border: none;
  border-radius: 4px;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background-color: #30363d;
  color: #c9d1d9;
}

.filter-btn.active {
  background-color: #1f6feb;
  color: white;
}

.filter-btn.active:hover {
  background-color: #388bfd;
}
</style>
