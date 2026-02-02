<template>
  <div class="push-updates-container">
    <button
      :disabled="!hasPendingChanges || isPushing"
      @click="handlePush"
      class="push-updates-btn"
      :aria-label="`Push ${pendingCount} rumour position updates to Google Sheets`"
      type="button"
    >
      <span v-if="isPushing" class="loading-content">
        <span class="spinner" aria-hidden="true"></span>
        <span class="loading-text">Pushing...</span>
      </span>
      <span v-else class="button-content">
        <span class="icon" aria-hidden="true">📤</span>
        <span class="button-text">Push Updates</span>
      </span>
      <span 
        v-if="hasPendingChanges && !isPushing" 
        class="badge"
        :aria-label="`${pendingCount} pending changes`"
      >
        {{ pendingCount }}
      </span>
    </button>
    
    <div 
      v-if="pushError" 
      class="error-message"
      :class="getErrorClass(pushError.type)"
      role="alert"
    >
      <div class="error-content">
        <span class="error-icon" aria-hidden="true">
          {{ getErrorIcon(pushError.type) }}
        </span>
        <span class="error-text">{{ pushError.userMessage }}</span>
      </div>
      
      <!-- Partial failure: expandable failed items list (T047-T048) -->
      <div v-if="pushError.type === 'PARTIAL_FAILURE' && pushError.failedRumourIds && pushError.failedRumourIds.length > 0" class="failed-items">
        <button 
          @click="toggleFailedItems"
          class="toggle-failed-btn"
          type="button"
        >
          {{ showFailedItems ? '▼' : '▶' }} View failed items ({{ pushError.failedRumourIds.length }})
        </button>
        <ul v-if="showFailedItems" class="failed-items-list">
          <li v-for="id in pushError.failedRumourIds" :key="id">
            {{ getRumourTitle(id) }}
          </li>
        </ul>
      </div>
      
      <div class="error-actions">
        <button 
          v-if="pushError.retryable" 
          @click="handleRetry"
          class="retry-btn"
          type="button"
        >
          Retry
        </button>
        <button 
          @click="dismissError"
          class="dismiss-btn"
          type="button"
          aria-label="Dismiss error"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRumourUpdates } from '@/composables/useRumourUpdates'
import type { PushErrorType } from '@/types/rumour'
import type { Rumour } from '@/types/rumour'

const props = defineProps<{
  rumours: Rumour[]
  getHeaderMapping?: () => Map<string, number> | null
}>()

const { hasPendingChanges, pendingCount, isPushing, pushError, pushUpdates } = useRumourUpdates()

const showFailedItems = ref(false)

const handlePush = async () => {
  showFailedItems.value = false
  const headerMapping = props.getHeaderMapping ? props.getHeaderMapping() : null
  await pushUpdates(props.rumours, headerMapping)
}

const handleRetry = async () => {
  showFailedItems.value = false
  const headerMapping = props.getHeaderMapping ? props.getHeaderMapping() : null
  await pushUpdates(props.rumours, headerMapping)
}

const dismissError = () => {
  pushError.value = null
  showFailedItems.value = false
}

const toggleFailedItems = () => {
  showFailedItems.value = !showFailedItems.value
}

const getRumourTitle = (id: string) => {
  const rumour = props.rumours.find(r => r.id === id)
  return rumour ? rumour.title : id
}

// T046: Map error types to CSS classes for specific styling
const getErrorClass = (errorType: PushErrorType): string => {
  switch (errorType) {
    case 'PARTIAL_FAILURE':
      return 'warning'
    case 'VALIDATION_ERROR':
      return 'warning'
    case 'NETWORK_ERROR':
      return 'error-network'
    case 'AUTH_ERROR':
      return 'error-auth'
    case 'PERMISSION_ERROR':
      return 'error-permission'
    case 'RATE_LIMIT_ERROR':
      return 'error-rate-limit'
    default:
      return 'error'
  }
}

// T046: Map error types to appropriate icons
const getErrorIcon = (errorType: PushErrorType): string => {
  switch (errorType) {
    case 'PARTIAL_FAILURE':
      return '⚠️'
    case 'VALIDATION_ERROR':
      return '⚠️'
    case 'NETWORK_ERROR':
      return '📡'
    case 'AUTH_ERROR':
      return '🔐'
    case 'PERMISSION_ERROR':
      return '🚫'
    case 'RATE_LIMIT_ERROR':
      return '⏱️'
    case 'INVALID_RANGE_ERROR':
      return '📊'
    default:
      return '❌'
  }
}
</script>

<style scoped>
.push-updates-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.push-updates-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 44px;
  min-height: 44px;
  padding: 12px 20px;
  background: #0969da;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.push-updates-btn:hover:not(:disabled) {
  background: #0860ca;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.push-updates-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.push-updates-btn:disabled {
  background: #6e7781;
  cursor: not-allowed;
  opacity: 0.6;
}

.button-content,
.loading-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  font-size: 18px;
  line-height: 1;
}

.button-text,
.loading-text {
  font-size: 16px;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #cf222e;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.error-message {
  max-width: 320px;
  padding: 12px;
  background: #cf222e;
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  line-height: 1.5;
}

.error-message.warning {
  background: #fb8500;
}

.error-message.error-network {
  background: #6e7781;
}

.error-message.error-auth {
  background: #8250df;
}

.error-message.error-permission {
  background: #cf222e;
}

.error-message.error-rate-limit {
  background: #d29922;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.error-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.error-text {
  flex: 1;
}

.failed-items {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.toggle-failed-btn {
  width: 100%;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s ease;
}

.toggle-failed-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.failed-items-list {
  margin: 8px 0 0 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  list-style: none;
  max-height: 150px;
  overflow-y: auto;
}

.failed-items-list li {
  padding: 4px 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.failed-items-list li:last-child {
  border-bottom: none;
}

.error-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.retry-btn,
.dismiss-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.retry-btn:hover,
.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.dismiss-btn {
  padding: 4px 8px;
  font-size: 16px;
  min-width: 28px;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .push-updates-container {
    bottom: 16px;
    right: 16px;
  }

  .push-updates-btn {
    padding: 10px 16px;
    font-size: 14px;
  }

  .button-text {
    display: none;
  }

  .loading-text {
    font-size: 14px;
  }

  .error-message {
    max-width: 280px;
    font-size: 13px;
  }
}
</style>
