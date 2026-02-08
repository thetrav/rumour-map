<template>
  <div class="pan-zoom-container" ref="container">
    <div
      class="pan-zoom-content"
      ref="content"
      :style="contentStyle"
      @mousedown="startPan"
      @wheel="handleWheel"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <img
        :src="imageUrl"
        alt="High Resolution Map"
        draggable="false"
        @load="onImageLoad"
        class="map-image"
      />
    </div>

    <!-- Controls overlay -->
    <div class="controls-overlay">
      <div class="btn-group d-flex flex-column gap-2">
        <button class="btn btn-primary" @click="zoomIn" title="Zoom In">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"
            />
          </svg>
        </button>
        <button class="btn btn-primary" @click="zoomOut" title="Zoom Out">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.5 7.5a.5.5 0 000 1h7a.5.5 0 000-1h-7z" />
          </svg>
        </button>
        <button class="btn btn-primary" @click="resetView" title="Reset View">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path
              d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4a.5.5 0 000-1zm3.854.146a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708l3-3a.5.5 0 01.708 0z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Info overlay -->
    <div class="info-overlay">
      <span class="Label Label--primary"
        >Zoom: {{ Math.round(scale * 100) }}%</span
      >
    </div>

    <!-- Rumour overlay -->
    <RumourOverlay :map-transform="mapTransform" :rumours="rumours" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import RumourOverlay from "./RumourOverlay.vue";

const props = defineProps({
  rumours: {
    type: Array,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  minScale: {
    type: Number,
    default: 0.1,
  },
  maxScale: {
    type: Number,
    default: 5,
  },
  zoomSpeed: {
    type: Number,
    default: 0.05,
  },
  isAddMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['map-click']);

const container = ref(null);
const content = ref(null);
const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPanning = ref(false);
const startPoint = ref({ x: 0, y: 0 });
const imageLoaded = ref(false);

// Touch handling
const touchStartDistance = ref(0);
const touchStartScale = ref(1);
const touches = ref([]);

// Transformation state tracking
const isTransforming = ref(false);
let transformDebounceTimer = null;

const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: "0 0",
  cursor: props.isAddMode ? "crosshair" : (isPanning.value ? "grabbing" : "grab"),
  transition: isPanning.value ? "none" : "transform 0.1s ease-out",
}));

// Expose map transform for rumour positioning
const mapTransform = computed(() => ({
  scale: scale.value,
  translateX: translateX.value,
  translateY: translateY.value,
  isPanning: isPanning.value,
  isTransforming: isTransforming.value,
}));

/**
 * Mark map as transforming and set up debounce timer
 * to detect when transformation stops
 */
const markTransforming = () => {
  isTransforming.value = true;
  
  // Clear existing timer
  if (transformDebounceTimer) {
    clearTimeout(transformDebounceTimer);
  }
  
  // Set new timer to mark transformation as stopped after 100ms
  transformDebounceTimer = setTimeout(() => {
    isTransforming.value = false;
  }, 100);
};

const onImageLoad = () => {
  imageLoaded.value = true;
  fitToScreen();
};

const fitToScreen = () => {
  if (!container.value || !content.value) return;

  const containerRect = container.value.getBoundingClientRect();
  const img = content.value.querySelector("img");
  if (!img) return;

  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;

  // Calculate scale to fit image in viewport
  const scaleX = containerRect.width / imgWidth;
  const scaleY = containerRect.height / imgHeight;
  const fitScale = Math.min(scaleX, scaleY, 1);

  scale.value = fitScale;

  // Center the image
  translateX.value = (containerRect.width - imgWidth * fitScale) / 2;
  translateY.value = (containerRect.height - imgHeight * fitScale) / 2;
};

const startPan = (e) => {
  if (e.button !== 0) return; // Only left mouse button

  // If in add mode, handle map click instead of panning
  if (props.isAddMode) {
    handleMapClick(e);
    return;
  }

  isPanning.value = true;
  startPoint.value = {
    x: e.clientX - translateX.value,
    y: e.clientY - translateY.value,
  };

  document.addEventListener("mousemove", handlePan);
  document.addEventListener("mouseup", endPan);
  e.preventDefault();
};

const handlePan = (e) => {
  if (!isPanning.value) return;

  translateX.value = e.clientX - startPoint.value.x;
  translateY.value = e.clientY - startPoint.value.y;
  markTransforming();
};

const endPan = () => {
  isPanning.value = false;
  document.removeEventListener("mousemove", handlePan);
  document.removeEventListener("mouseup", endPan);
};

const handleWheel = (e) => {
  e.preventDefault();

  // Detect trackpad gesture (smoother deltaY values and ctrlKey indicates pinch-zoom)
  const isTrackpad = Math.abs(e.deltaY) < 100 && !e.ctrlKey;
  const isPinchZoom = e.ctrlKey;

  if (isPinchZoom) {
    // Pinch zoom gesture (Command + scroll on trackpad)
    const rect = container.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Use multiplicative zoom for pinch gestures
    // Convert deltaY to a zoom factor: positive deltaY = zoom out, negative = zoom in
    // A full pinch gesture (deltaY ~= 100) should result in ~40% change
    // Factor calculation: 1.0 + (deltaY * sensitivity)
    // For 40% change with deltaY=100: sensitivity = 0.4/100 = 0.004
    const zoomFactor = 1.0 + (e.deltaY * -0.004);
    zoomMultiplicative(zoomFactor, mouseX, mouseY);
  } else if (isTrackpad) {
    // Two-finger scroll on trackpad - pan the map
    // Natural scrolling: scroll up moves content up, scroll down moves content down
    translateX.value -= e.deltaX;
    translateY.value -= e.deltaY;
    markTransforming();
  } else {
    // Mouse wheel - zoom in/out
    const rect = container.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? -props.zoomSpeed : props.zoomSpeed;
    zoom(delta, mouseX, mouseY);
  }
};

const zoomMultiplicative = (factor, originX, originY) => {
  const oldScale = scale.value;
  const newScale = Math.max(
    props.minScale,
    Math.min(props.maxScale, oldScale * factor),
  );

  if (newScale === oldScale) return;

  const scaleDiff = newScale - oldScale;

  // Adjust translation to zoom towards the origin point
  translateX.value -= (originX - translateX.value) * (scaleDiff / oldScale);
  translateY.value -= (originY - translateY.value) * (scaleDiff / oldScale);

  scale.value = newScale;
  markTransforming();
};

const zoom = (delta, originX, originY) => {
  const oldScale = scale.value;
  
  // Adaptive zoom rate: slower when zoomed in, faster when zoomed out
  // At scale 0.25, use full delta; at scale 1.0 use ~40% of delta; at scale 5.0 use ~10% of delta
  const adaptiveFactor = 0.25 / Math.max(0.25, oldScale);
  const adjustedDelta = delta * adaptiveFactor;
  
  const newScale = Math.max(
    props.minScale,
    Math.min(props.maxScale, oldScale + adjustedDelta),
  );

  if (newScale === oldScale) return;

  const scaleDiff = newScale - oldScale;

  // Adjust translation to zoom towards the origin point
  translateX.value -= (originX - translateX.value) * (scaleDiff / oldScale);
  translateY.value -= (originY - translateY.value) * (scaleDiff / oldScale);

  scale.value = newScale;
  markTransforming();
};

const zoomIn = () => {
  const rect = container.value.getBoundingClientRect();
  // Use multiplicative zoom with 40% increase (factor 1.4)
  zoomMultiplicative(1.4, rect.width / 2, rect.height / 2);
};

const zoomOut = () => {
  const rect = container.value.getBoundingClientRect();
  // Use multiplicative zoom with 40% decrease (factor ~0.714)
  zoomMultiplicative(1 / 1.4, rect.width / 2, rect.height / 2);
};

const resetView = () => {
  fitToScreen();
};

/**
 * Set zoom to a specific percentage
 */
const setZoomPercent = (percent) => {
  if (!container.value) return;
  
  const targetScale = percent / 100;
  const rect = container.value.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const oldScale = scale.value;
  const newScale = Math.max(
    props.minScale,
    Math.min(props.maxScale, targetScale)
  );
  
  if (newScale === oldScale) return;
  
  const scaleDiff = newScale - oldScale;
  
  // Adjust translation to zoom towards the center
  translateX.value -= (centerX - translateX.value) * (scaleDiff / oldScale);
  translateY.value -= (centerY - translateY.value) * (scaleDiff / oldScale);
  
  scale.value = newScale;
  markTransforming();
};

/**
 * Pan the map by a fixed amount in pixels
 */
const panBy = (deltaX, deltaY) => {
  translateX.value += deltaX;
  translateY.value += deltaY;
  markTransforming();
};

/**
 * Handle keyboard shortcuts
 */
const handleKeyDown = (e) => {
  // Don't handle keyboard shortcuts if user is typing in an input field
  if (e.target.matches('input, textarea, [contenteditable]')) {
    return;
  }
  
  const panAmount = 50; // pixels to pan per keypress
  
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      panBy(panAmount, 0);
      break;
    case 'ArrowRight':
      e.preventDefault();
      panBy(-panAmount, 0);
      break;
    case 'ArrowUp':
      e.preventDefault();
      panBy(0, panAmount);
      break;
    case 'ArrowDown':
      e.preventDefault();
      panBy(0, -panAmount);
      break;
    case '+':
    case '=':
      e.preventDefault();
      zoomIn();
      break;
    case '-':
      e.preventDefault();
      zoomOut();
      break;
    case '1':
      // Fit to viewport
      e.preventDefault();
      resetView();
      break;
    case '2':
      e.preventDefault();
      setZoomPercent(40);
      break;
    case '3':
      e.preventDefault();
      setZoomPercent(75);
      break;
    case '4':
      e.preventDefault();
      setZoomPercent(100);
      break;
    case '5':
      e.preventDefault();
      setZoomPercent(200);
      break;
  }
};

// Touch handling
const handleTouchStart = (e) => {
  if (e.touches.length === 1) {
    // Single touch - pan
    isPanning.value = true;
    startPoint.value = {
      x: e.touches[0].clientX - translateX.value,
      y: e.touches[0].clientY - translateY.value,
    };
  } else if (e.touches.length === 2) {
    // Two fingers - pinch zoom
    isPanning.value = false;
    touches.value = Array.from(e.touches);
    touchStartDistance.value = getTouchDistance(e.touches[0], e.touches[1]);
    touchStartScale.value = scale.value;
  }
  e.preventDefault();
};

const handleTouchMove = (e) => {
  if (e.touches.length === 1 && isPanning.value) {
    // Pan
    translateX.value = e.touches[0].clientX - startPoint.value.x;
    translateY.value = e.touches[0].clientY - startPoint.value.y;
    markTransforming();
  } else if (e.touches.length === 2) {
    // Pinch zoom - use multiplicative scaling
    const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
    // Calculate the ratio of current distance to start distance
    // This gives us a natural multiplicative zoom factor
    const distanceRatio = currentDistance / touchStartDistance.value;
    
    const rect = container.value.getBoundingClientRect();
    const centerX =
      (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
    const centerY =
      (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

    // Apply multiplicative zoom: new scale = start scale * distance ratio
    const newScale = Math.max(
      props.minScale,
      Math.min(props.maxScale, touchStartScale.value * distanceRatio),
    );
    const scaleDiff = newScale - scale.value;

    if (scaleDiff !== 0) {
      translateX.value -=
        (centerX - translateX.value) * (scaleDiff / scale.value);
      translateY.value -=
        (centerY - translateY.value) * (scaleDiff / scale.value);
      scale.value = newScale;
      markTransforming();
    }
  }
  e.preventDefault();
};

const handleTouchEnd = (e) => {
  if (e.touches.length === 0) {
    isPanning.value = false;
  } else if (e.touches.length === 1) {
    // Switch back to pan mode
    isPanning.value = true;
    startPoint.value = {
      x: e.touches[0].clientX - translateX.value,
      y: e.touches[0].clientY - translateY.value,
    };
  }
};

const getTouchDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Handle map click in add mode
 * Converts screen coordinates to map coordinates
 */
const handleMapClick = (e) => {
  if (!props.isAddMode) return;

  const rect = container.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Convert screen coordinates to map coordinates
  const mapX = (clickX - translateX.value) / scale.value;
  const mapY = (clickY - translateY.value) / scale.value;

  // Clamp to map bounds (0-6500 x 0-3600)
  const clampedX = Math.max(0, Math.min(6500, Math.round(mapX)));
  const clampedY = Math.max(0, Math.min(3600, Math.round(mapY)));

  emit('map-click', { x: clampedX, y: clampedY });
};

onMounted(() => {
  window.addEventListener("resize", fitToScreen);
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("resize", fitToScreen);
  window.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("mousemove", handlePan);
  document.removeEventListener("mouseup", endPan);
  if (transformDebounceTimer) {
    clearTimeout(transformDebounceTimer);
  }
});
</script>

<style scoped>
.pan-zoom-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: #0d1117;
}

.pan-zoom-content {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
}

.map-image {
  display: block;
  width: auto;
  height: auto;
  max-width: none;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  pointer-events: none;
}

.controls-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
}

.info-overlay {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  z-index: 10;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  transform: scale(1.05);
}

.btn:active {
  transform: scale(0.95);
}
</style>
