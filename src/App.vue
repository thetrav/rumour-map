<script setup lang="ts">
import { computed, ref, watch } from "vue";
import PanZoomMap from "./components/PanZoomMap.vue";
import PushUpdatesButton from "./components/PushUpdatesButton.vue";
import AddRumourForm from "./components/AddRumourForm.vue";
import SetupDialog from "./components/SetupDialog.vue";
import { useRumours } from "./composables/useRumours";
import { useRumourFilter } from "./composables/useRumourFilter";
import { useAddRumour } from "./composables/useAddRumour";
import { useAddRumourToSheets } from "./composables/useAddRumourToSheets";
import { useConfig } from "./composables/useConfig";

const { rumours, isLoading, error, isAuthenticated, loadRumours, refresh, getHeaderMapping } = useRumours();
const { mapImageUrl, isConfigured } = useConfig();

// Apply filtering to rumours
const { filteredRumours, filterState, setFilter, filterMode, searchText, setSearchText } = useRumourFilter(rumours);

// Filter out hidden rumours from the filtered set
const visibleRumours = computed(() => {
  return filteredRumours?.value?.filter((rumour) => !rumour.isHidden) ?? [];
});

// Add rumour state
const { isAddMode, pendingCoordinates, showForm, startAddMode, captureCoordinates, cancelAdd, completeAdd } = useAddRumour();
const { isAdding, addError, addRumour } = useAddRumourToSheets();

const needsSetup = computed(() => {
  return !isAuthenticated.value || !isConfigured.value;
});

const showDialog = ref(false);

watch(needsSetup, (newVal) => {
  if (newVal) {
    showDialog.value = true;
  }
});

const updateShowDialog = (val: boolean) => {
  showDialog.value = val;
};

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
      <div class="Header-item">
        <button @click="showDialog = true" class="btn-setup" title="Setup">
          ⚙️ Setup
        </button>
      </div>
      <div class="Header-item">
        <div class="legal-links">
          <a href="privacy.html">Privacy Policy</a><br/>
          <a href="tos.html">Terms of Service</a>
        </div>
      </div>
      <div class="Header-item Header-item--full"></div>

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

      <!-- Search Filter (when authenticated and have rumours) -->
      <div v-if="isAuthenticated && rumours.length > 0" class="Header-item search-filter">
        <input 
          v-model="searchText"
          type="text"
          placeholder="Search rumours..."
          class="search-input"
          aria-label="Search rumours by title, details, or location"
        />
        <button 
          v-if="searchText"
          @click="setSearchText('')"
          class="search-clear"
          title="Clear search"
          aria-label="Clear search"
        >
          ✕
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
    </header>

    <main class="main-content">
      <!-- Show setup dialog if not authenticated -->
      <SetupDialog v-if="!isAuthenticated" :show="true" />

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

    <SetupDialog
      :show="showDialog"
      @update:show="updateShowDialog"
      @saved="loadRumours"
    />
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

.btn-setup {
  background-color: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-setup:hover {
  background-color: #30363d;
  border-color: #484f58;
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

.search-filter {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  background-color: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 0.75rem;
  width: 200px;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1f6feb;
  box-shadow: 0 0 0 2px rgba(31, 111, 235, 0.2);
}

.search-input::placeholder {
  color: #6e7681;
}

.search-clear {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem;
  line-height: 1;
  transition: color 0.2s;
}

.search-clear:hover {
  color: #c9d1d9;
}

.legal-links a {
  color: #c9d1d9;
  text-decoration: underline;
}
</style>
