<template>
  <div v-if="show" class="form-overlay" @click.self="handleCancel">
    <div class="form-container">
      <div class="form-header">
        <h2 class="form-title">Add New Rumour</h2>
        <button @click="handleCancel" class="close-btn" aria-label="Close">✕</button>
      </div>

      <form @submit.prevent="handleSubmit" class="rumour-form">
        <div class="form-group">
          <label for="title" class="form-label">Title *</label>
          <input
            id="title"
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="Enter rumour title"
            required
            maxlength="100"
          />
        </div>

        <div class="form-group">
          <label for="details" class="form-label">Details</label>
          <textarea
            id="details"
            v-model="formData.details"
            class="form-textarea"
            placeholder="Enter rumour details"
            rows="4"
            maxlength="500"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="session_date" class="form-label">Session Date</label>
            <input
              id="session_date"
              v-model="formData.session_date"
              type="text"
              class="form-input"
              placeholder="e.g., 2024-01-15"
            />
          </div>

          <div class="form-group">
            <label for="game_date" class="form-label">Game Date</label>
            <input
              id="game_date"
              v-model="formData.game_date"
              type="text"
              class="form-input"
              placeholder="e.g., Spring, Year 3"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="location_heard" class="form-label">Location Heard</label>
            <input
              id="location_heard"
              v-model="formData.location_heard"
              type="text"
              class="form-input"
              placeholder="Where did you hear this?"
            />
          </div>

          <div class="form-group">
            <label for="location_targetted" class="form-label">Location Targetted</label>
            <input
              id="location_targetted"
              v-model="formData.location_targetted"
              type="text"
              class="form-input"
              placeholder="What location is this about?"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="rating" class="form-label">Rating (0-10)</label>
            <input
              id="rating"
              v-model.number="formData.rating"
              type="number"
              class="form-input"
              min="0"
              max="10"
              step="1"
            />
          </div>

          <div class="form-group form-checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="formData.resolved"
                type="checkbox"
                class="form-checkbox"
              />
              <span>Resolved</span>
            </label>
          </div>
        </div>

        <div class="form-info">
          <span class="coordinates-label">Coordinates:</span>
          <span class="coordinates-value">X: {{ coordinates.x }}, Y: {{ coordinates.y }}</span>
        </div>

        <div v-if="error" class="error-message" role="alert">
          {{ error }}
        </div>

        <div class="form-actions">
          <button type="button" @click="handleCancel" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" :disabled="isSaving || !formData.title" class="btn btn-primary">
            {{ isSaving ? 'Saving...' : 'Save Rumour' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface RumourFormData {
  title: string
  details: string | null
  session_date: string | null
  game_date: string | null
  location_heard: string | null
  location_targetted: string | null
  rating: number | null
  resolved: boolean
}

const props = defineProps<{
  show: boolean
  coordinates: { x: number; y: number }
}>()

const emit = defineEmits<{
  save: [data: RumourFormData]
  cancel: []
}>()

const formData = ref<RumourFormData>({
  title: '',
  details: null,
  session_date: null,
  game_date: null,
  location_heard: null,
  location_targetted: null,
  rating: null,
  resolved: false
})

const isSaving = ref(false)
const error = ref<string | null>(null)

// Reset form when show changes
watch(() => props.show, (newShow) => {
  if (newShow) {
    formData.value = {
      title: '',
      details: null,
      session_date: null,
      game_date: null,
      location_heard: null,
      location_targetted: null,
      rating: null,
      resolved: false
    }
    error.value = null
  }
})

const handleSubmit = () => {
  if (!formData.value.title.trim()) {
    error.value = 'Title is required'
    return
  }

  error.value = null
  isSaving.value = true
  
  // Clean up empty strings to null
  const cleanData: RumourFormData = {
    title: formData.value.title.trim(),
    details: formData.value.details?.trim() || null,
    session_date: formData.value.session_date?.trim() || null,
    game_date: formData.value.game_date?.trim() || null,
    location_heard: formData.value.location_heard?.trim() || null,
    location_targetted: formData.value.location_targetted?.trim() || null,
    rating: formData.value.rating,
    resolved: formData.value.resolved
  }

  emit('save', cleanData)
  
  // Reset saving state after emit (parent will handle actual save)
  setTimeout(() => {
    isSaving.value = false
  }, 500)
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<style scoped>
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.form-container {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #30363d;
}

.form-title {
  margin: 0;
  font-size: 1.5rem;
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

.rumour-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #c9d1d9;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #1f6feb;
  box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-checkbox-group {
  display: flex;
  align-items: center;
  padding-top: 1.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: #c9d1d9;
  font-size: 0.875rem;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.form-info {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  font-size: 0.875rem;
}

.coordinates-label {
  color: #8b949e;
  margin-right: 0.5rem;
}

.coordinates-value {
  color: #58a6ff;
  font-weight: 500;
}

.error-message {
  padding: 0.75rem;
  background: #da3633;
  color: white;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
  padding-top: 1rem;
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

/* Mobile responsiveness */
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-container {
    max-width: 100%;
    margin: 0.5rem;
  }
}
</style>
