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
    default: 0.1,
  },
});

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

const contentStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  transformOrigin: "0 0",
  cursor: isPanning.value ? "grabbing" : "grab",
  transition: isPanning.value ? "none" : "transform 0.1s ease-out",
}));

// Expose map transform for rumour positioning
const mapTransform = computed(() => ({
  scale: scale.value,
  translateX: translateX.value,
  translateY: translateY.value,
}));

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
};

const endPan = () => {
  isPanning.value = false;
  document.removeEventListener("mousemove", handlePan);
  document.removeEventListener("mouseup", endPan);
};

const handleWheel = (e) => {
  e.preventDefault();

  const rect = container.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const delta = e.deltaY > 0 ? -props.zoomSpeed : props.zoomSpeed;
  zoom(delta, mouseX, mouseY);
};

const zoom = (delta, originX, originY) => {
  const oldScale = scale.value;
  const newScale = Math.max(
    props.minScale,
    Math.min(props.maxScale, oldScale + delta),
  );

  if (newScale === oldScale) return;

  const scaleDiff = newScale - oldScale;

  // Adjust translation to zoom towards the origin point
  translateX.value -= (originX - translateX.value) * (scaleDiff / oldScale);
  translateY.value -= (originY - translateY.value) * (scaleDiff / oldScale);

  scale.value = newScale;
};

const zoomIn = () => {
  const rect = container.value.getBoundingClientRect();
  zoom(props.zoomSpeed, rect.width / 2, rect.height / 2);
};

const zoomOut = () => {
  const rect = container.value.getBoundingClientRect();
  zoom(-props.zoomSpeed, rect.width / 2, rect.height / 2);
};

const resetView = () => {
  fitToScreen();
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
  } else if (e.touches.length === 2) {
    // Pinch zoom
    const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
    const scaleDelta = (currentDistance - touchStartDistance.value) * 0.01;

    const rect = container.value.getBoundingClientRect();
    const centerX =
      (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
    const centerY =
      (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

    const newScale = Math.max(
      props.minScale,
      Math.min(props.maxScale, touchStartScale.value + scaleDelta),
    );
    const scaleDiff = newScale - scale.value;

    if (scaleDiff !== 0) {
      translateX.value -=
        (centerX - translateX.value) * (scaleDiff / scale.value);
      translateY.value -=
        (centerY - translateY.value) * (scaleDiff / scale.value);
      scale.value = newScale;
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

onMounted(() => {
  window.addEventListener("resize", fitToScreen);
});

onUnmounted(() => {
  window.removeEventListener("resize", fitToScreen);
  document.removeEventListener("mousemove", handlePan);
  document.removeEventListener("mouseup", endPan);
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
