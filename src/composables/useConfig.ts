import { ref, computed, watch } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'

const STORAGE_KEY = 'rumour_map_config'

interface MapConfig {
  mapImageUrl: string
  spreadsheetId: string
}

const DEFAULT_CONFIG: MapConfig = {
  mapImageUrl: '',
  spreadsheetId: ''
}

function loadFromStorage(): MapConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as MapConfig
    }
  } catch (e) {
    console.error('Failed to load config from localStorage:', e)
  }
  return { ...DEFAULT_CONFIG }
}

function saveToStorage(config: MapConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save config to localStorage:', e)
  }
}

const storedConfig = loadFromStorage()

const mapImageUrl = ref<string>(storedConfig.mapImageUrl)
const spreadsheetId = ref<string>(storedConfig.spreadsheetId)

if (storedConfig.spreadsheetId) {
  GOOGLE_CONFIG.spreadsheetId = storedConfig.spreadsheetId
}

watch([mapImageUrl, spreadsheetId], () => {
  saveToStorage({
    mapImageUrl: mapImageUrl.value,
    spreadsheetId: spreadsheetId.value
  })
})

export function useConfig() {
  const isConfigured = computed(() => {
    return mapImageUrl.value.trim() !== '' && spreadsheetId.value.trim() !== ''
  })

  const needsSetup = computed(() => {
    return mapImageUrl.value.trim() === '' || spreadsheetId.value.trim() === ''
  })

  const setConfig = (url: string, id: string) => {
    mapImageUrl.value = url.trim()
    spreadsheetId.value = id.trim()
    GOOGLE_CONFIG.spreadsheetId = id.trim()
  }

  return {
    mapImageUrl,
    spreadsheetId,
    isConfigured,
    needsSetup,
    setConfig
  }
}
