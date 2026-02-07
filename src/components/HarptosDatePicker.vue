<template>
  <div class="harptos-date-picker">
    <div class="picker-type-selector">
      <label class="radio-label">
        <input 
          type="radio" 
          value="month-day" 
          v-model="dateType" 
          @change="handleTypeChange"
        />
        <span>Month & Day</span>
      </label>
      <label class="radio-label">
        <input 
          type="radio" 
          value="special" 
          v-model="dateType"
          @change="handleTypeChange"
        />
        <span>Special Day/Festival</span>
      </label>
      <label class="radio-label">
        <input 
          type="radio" 
          value="none" 
          v-model="dateType"
          @change="handleTypeChange"
        />
        <span>None</span>
      </label>
    </div>

    <div v-if="dateType === 'month-day'" class="date-fields">
      <div class="field-group">
        <label class="field-label">Day:</label>
        <select v-model.number="selectedDay" @change="emitDate" class="field-select">
          <option :value="null">-</option>
          <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Month:</label>
        <select v-model.number="selectedMonth" @change="emitDate" class="field-select">
          <option :value="null">-</option>
          <option 
            v-for="(month, index) in months" 
            :key="index" 
            :value="index"
          >
            {{ month.name }} ({{ month.commonName }})
          </option>
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Year DR:</label>
        <input
          v-model.number="selectedYear"
          @input="emitDate"
          type="number"
          min="1"
          max="9999"
          class="field-input"
          placeholder="e.g., 1492"
        />
      </div>
    </div>

    <div v-else-if="dateType === 'special'" class="special-day-fields">
      <div class="field-group">
        <label class="field-label">Festival/Special Day:</label>
        <select v-model="selectedSpecialDay" @change="emitDate" class="field-select">
          <option :value="null">-</option>
          <option 
            v-for="day in specialDays" 
            :key="day.name" 
            :value="day.name"
          >
            {{ day.name }}
          </option>
        </select>
      </div>

      <div class="field-group">
        <label class="field-label">Year DR:</label>
        <input
          v-model.number="selectedYear"
          @input="emitDate"
          type="number"
          min="1"
          max="9999"
          class="field-input"
          placeholder="e.g., 1492"
        />
      </div>
    </div>

    <div v-if="formattedDate && dateType !== 'none'" class="preview">
      <span class="preview-label">Preview:</span>
      <span class="preview-value">{{ formattedDate }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { 
  HARPTOS_MONTHS, 
  HARPTOS_SPECIAL_DAYS, 
  getMonthDays,
  parseHarptosDate,
  isLeapYear
} from '@/config/harptos-calendar'

interface Props {
  modelValue: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const dateType = ref<'month-day' | 'special' | 'none'>('none')
const selectedDay = ref<number | null>(null)
const selectedMonth = ref<number | null>(null)
const selectedYear = ref<number | null>(null)
const selectedSpecialDay = ref<string | null>(null)

const months = HARPTOS_MONTHS
const days = getMonthDays()
const specialDays = computed(() => {
  // Filter out Shieldmeet if not a leap year
  if (selectedYear.value && !isLeapYear(selectedYear.value)) {
    return HARPTOS_SPECIAL_DAYS.filter(day => day.name !== 'Shieldmeet')
  }
  return HARPTOS_SPECIAL_DAYS
})

const formattedDate = computed(() => {
  if (dateType.value === 'none') {
    return null
  }
  
  if (dateType.value === 'special') {
    if (selectedSpecialDay.value && selectedYear.value) {
      return `${selectedSpecialDay.value}, ${selectedYear.value} DR`
    }
    return null
  }
  
  // month-day type
  if (selectedMonth.value !== null && selectedYear.value) {
    const month = months[selectedMonth.value]
    if (!month) return null // Safety check
    if (selectedDay.value) {
      return `${selectedDay.value} ${month.name}, ${selectedYear.value} DR`
    } else {
      return `${month.name}, ${selectedYear.value} DR`
    }
  }
  
  return null
})

function handleTypeChange() {
  // Reset fields when changing type
  selectedDay.value = null
  selectedMonth.value = null
  selectedSpecialDay.value = null
  emitDate()
}

function emitDate() {
  emit('update:modelValue', formattedDate.value)
}

// Parse initial value
onMounted(() => {
  if (props.modelValue) {
    const parsed = parseHarptosDate(props.modelValue)
    if (parsed) {
      if (parsed.specialDay) {
        dateType.value = 'special'
        selectedSpecialDay.value = parsed.specialDay
        selectedYear.value = parsed.year
      } else if (parsed.monthIndex !== null) {
        dateType.value = 'month-day'
        selectedDay.value = parsed.day
        selectedMonth.value = parsed.monthIndex
        selectedYear.value = parsed.year
      }
    }
  }
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    dateType.value = 'none'
    selectedDay.value = null
    selectedMonth.value = null
    selectedYear.value = null
    selectedSpecialDay.value = null
  }
})
</script>

<style scoped>
.harptos-date-picker {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.picker-type-selector {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  color: #c9d1d9;
  font-size: 0.875rem;
}

.radio-label input[type="radio"] {
  cursor: pointer;
}

.date-fields,
.special-day-fields {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 140px;
  flex: 1;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #8b949e;
}

.field-select,
.field-input {
  padding: 0.375rem 0.5rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  color: #c9d1d9;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.field-select:focus,
.field-input:focus {
  outline: none;
  border-color: #1f6feb;
  box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.1);
}

.field-select option {
  background: #161b22;
  color: #c9d1d9;
}

.preview {
  padding: 0.5rem 0.75rem;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  font-size: 0.875rem;
}

.preview-label {
  color: #8b949e;
  margin-right: 0.5rem;
}

.preview-value {
  color: #58a6ff;
  font-weight: 500;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .date-fields,
  .special-day-fields {
    flex-direction: column;
  }
  
  .field-group {
    min-width: 100%;
  }
}
</style>
