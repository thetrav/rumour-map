<template>
  <teleport to="body">
    <div 
      v-if="show" 
      :class="['setup-overlay', { 'modal-mode': isModalMode }]"
      @click.self="handleOverlayClick"
    >
      <div class="setup-dialog" @click.stop>
        <div class="dialog-header">
          <h3>Setup Configuration</h3>
          <button 
            @click="handleClose" 
            class="close-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div class="dialog-body">
          <div class="config-section">
            <div class="form-group">
              <label for="mapUrl">Map Image URL</label>
              <input
                id="mapUrl"
                v-model="localMapUrl"
                type="text"
                placeholder="https://example.com/map.png"
                class="form-input"
              />
              <p class="form-help">Enter the URL of the background map image</p>
            </div>
            
            <div class="form-group">
              <label for="spreadsheetId">Spreadsheet ID</label>
              <input
                id="spreadsheetId"
                v-model="localSpreadsheetId"
                type="text"
                placeholder="abc123..."
                class="form-input"
              />
              <p class="form-help">Enter the Google Sheets spreadsheet ID</p>
            </div>

            <div v-if="isAuthenticated && localMapUrl.trim() && localSpreadsheetId.trim()" class="save-hint">
              <span class="check-icon">✓</span> Signed in
            </div>
            <div v-else-if="!localMapUrl.trim() || !localSpreadsheetId.trim()" class="auth-hint">
              <p>Enter both values above to enable sign in</p>
            </div>
            <div v-else class="auth-hint">
              <p>Sign in with Google to save your configuration</p>
              <GoogleAuthButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import GoogleAuthButton from './GoogleAuthButton.vue'
import { useConfig } from '@/composables/useConfig'
import { useGoogleAuth } from '@/composables/useGoogleAuth'

interface Props {
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'saved': []
}>()

const { mapImageUrl, spreadsheetId, setConfig } = useConfig()
const { authState } = useGoogleAuth()

const localMapUrl = ref(mapImageUrl.value)
const localSpreadsheetId = ref(spreadsheetId.value)

watch(() => props.show, (newVal) => {
  if (newVal) {
    localMapUrl.value = mapImageUrl.value
    localSpreadsheetId.value = spreadsheetId.value
  }
})

watch([localMapUrl, localSpreadsheetId], () => {
  if (localMapUrl.value.trim() && localSpreadsheetId.value.trim()) {
    setConfig(localMapUrl.value, localSpreadsheetId.value)
    emit('saved')
  }
})

watch([mapImageUrl, spreadsheetId], () => {
  localMapUrl.value = mapImageUrl.value
  localSpreadsheetId.value = spreadsheetId.value
})

const isAuthenticated = computed(() => authState.value.isAuthenticated)

const isModalMode = computed(() => {
  if (!isAuthenticated.value) return true
  if (!localMapUrl.value.trim()) return true
  if (!localSpreadsheetId.value.trim()) return true
  return false
})

const handleOverlayClick = () => {
  if (!isModalMode.value) {
    emit('update:show', false)
  }
}

const handleClose = () => {
  emit('update:show', false)
}
</script>

<style scoped>
.setup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 1rem;
}

.setup-overlay.modal-mode {
  background: rgba(0, 0, 0, 0.7);
}

.setup-dialog {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #30363d;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #c9d1d9;
}

.close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #30363d;
  color: #c9d1d9;
}

.dialog-body {
  padding: 1.5rem;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #21262d;
  border-radius: 8px;
}

.auth-hint p {
  color: #8b949e;
  margin: 0;
  font-size: 0.875rem;
}

.save-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #238636;
  font-size: 0.875rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #c9d1d9;
}

.form-input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  padding: 0.75rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1f6feb;
  box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.1);
}

.form-input::placeholder {
  color: #6e7681;
}

.form-help {
  font-size: 0.75rem;
  color: #6e7681;
  margin: 0;
}

.dialog-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #30363d;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #21262d;
  color: #c9d1d9;
  border-color: #30363d;
}

.btn-secondary:hover:not(:disabled) {
  background: #30363d;
}

.btn-primary {
  background: #238636;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2ea043;
}
</style>
