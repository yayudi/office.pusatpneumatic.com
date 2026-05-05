<!-- frontend\src\components\ui\FilterBar.vue -->
<script setup>
import { reactive, watch } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  filters: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'change', 'clear'])

// local copy so it's reactive
const localValues = reactive({ ...props.modelValue })

// sync with parent
watch(
  () => props.modelValue,
  (val) => {
    Object.assign(localValues, val)
  },
  { deep: true },
)

function emitChange() {
  emit('update:modelValue', { ...localValues })
  emit('change', { ...localValues })
}

function emitClear() {
  emit('clear')
}
</script>

<template>
  <BaseFilterPanel :title="title || 'Filter Data'">
    <template #filters>
      <slot name="prepend"></slot>
      <!-- Loop through filters -->
      <template v-for="(filter, index) in filters" :key="index">
        <!-- Date Range Filter -->
        <div v-if="filter.type === 'daterange'"
          class="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full md:w-auto">
          <label v-if="filter.label" class="text-sm font-medium text-text/80 whitespace-nowrap">
            {{ filter.label }}:
          </label>
          <DateRangeFilter :startDate="localValues[filter.keyStart]" :endDate="localValues[filter.keyEnd]"
            @update:startDate="localValues[filter.keyStart] = $event; emitChange()"
            @update:endDate="localValues[filter.keyEnd] = $event; emitChange()" class="w-full md:w-auto" />
        </div>

        <!-- Select Input -->
        <div v-else-if="filter.type === 'select'"
          class="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 w-full md:w-auto">
          <label v-if="filter.label" :for="filter.key" class="text-sm font-medium text-text/80 whitespace-nowrap">
            {{ filter.label }}:
          </label>
          <BaseSelect v-model="localValues[filter.key]" :options="filter.options" track-by="value" emit-value
            :multiple="filter.multiple || false" :searchable="filter.searchable || false"
            :clearable="filter.clearable !== undefined ? filter.clearable : true"
            :clear-value="filter.clearValue !== undefined ? filter.clearValue : 'all'"
            :placeholder="filter.placeholder || ('Semua ' + filter.label)" @update:modelValue="emitChange"
            class="min-w-[150px] w-full" />
        </div>
      </template>
    </template>

    <template #filter-actions>
      <!-- Clear Button -->
      <button type="button"
        class="h-[42px] px-4 bg-secondary/10 hover:bg-danger/10 text-text/80 hover:text-danger text-sm font-bold border border-secondary/20 hover:border-danger/20 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
        @click="emitClear">
        <font-awesome-icon icon="fa-solid fa-eraser" />
        <span class="hidden lg:inline">Reset</span>
      </button>

      <slot name="actions"></slot>
    </template>
  </BaseFilterPanel>
</template>
