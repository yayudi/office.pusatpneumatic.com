<!-- frontend\src\components\ui\FilterBar.vue -->
<script setup>
import { reactive, watch, ref } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import TriStateSelect from '@/components/ui/TriStateSelect.vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  filters: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Object,
    default: () => ({})
  },
  advancedFilters: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'clear'])
const showAdvanced = ref(false)

// local copy so it's reactive
const localValues = reactive({ ...props.modelValue })

// sync with parent
watch(
  () => props.modelValue,
  val => {
    Object.assign(localValues, val)
  },
  { deep: true }
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
  <BaseFilterPanel :title="title">
    <template #search v-if="$slots.search">
      <slot name="search"></slot>
    </template>
    <template #tabs v-if="$slots.tabs">
      <slot name="tabs"></slot>
    </template>
    <template #header v-if="$slots.header">
      <slot name="header"></slot>
    </template>
    <template #actions v-if="$slots.actions">
      <slot name="actions"></slot>
    </template>

    <template #filters>
      <slot name="prepend"></slot>
      <!-- Loop through filters -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
        <template v-for="(filter, index) in filters" :key="index">
          <div class="flex flex-col gap-1.5 w-full" :class="filter.class">
            <label
              v-if="filter.label"
              :for="filter.key"
              class="text-[10px] font-bold text-text/50 uppercase tracking-wide"
            >
              {{ filter.label }}
            </label>

            <!-- Date Range Filter -->
            <DateRangeFilter
              v-if="filter.type === 'daterange'"
              :startDate="localValues[filter.keyStart]"
              :endDate="localValues[filter.keyEnd]"
              @update:startDate="((localValues[filter.keyStart] = $event), emitChange())"
              @update:endDate="((localValues[filter.keyEnd] = $event), emitChange())"
              class="w-full"
            />

            <!-- Select Input -->
            <BaseSelect
              v-else-if="filter.type === 'select'"
              v-model="localValues[filter.key]"
              :options="filter.options"
              track-by="value"
              emit-value
              :multiple="filter.multiple || false"
              :searchable="filter.searchable || false"
              :clearable="filter.clearable !== undefined ? filter.clearable : true"
              :clear-value="filter.clearValue !== undefined ? filter.clearValue : 'all'"
              :placeholder="filter.placeholder || 'Semua ' + filter.label"
              @update:modelValue="emitChange"
              class="w-full"
            />

            <TriStateSelect
              v-else-if="filter.type === 'triselect'"
              v-model="localValues[filter.key]"
              :options="filter.options"
              :label="filter.optionLabel || 'label'"
              :track-by="filter.trackBy || 'id'"
              :placeholder="filter.placeholder || 'Pilih ' + filter.label"
              :searchable="filter.searchable || false"
              @update:modelValue="emitChange"
              class="w-full"
            />

            <!-- Text Input -->
            <div v-else-if="filter.type === 'text'" class="relative w-full group">
              <span
                v-if="filter.icon !== false"
                class="absolute inset-y-0 left-0 pl-3 flex items-center text-text/40 group-focus-within:text-primary transition-colors pointer-events-none"
              >
                <font-awesome-icon :icon="filter.icon || 'fa-solid fa-search'" />
              </span>
              <input
                v-model="localValues[filter.key]"
                type="text"
                :placeholder="filter.placeholder || filter.label"
                class="min-w-[250px] w-full h-[42px] rounded-lg bg-background border border-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm text-text placeholder:text-text/30 shadow-sm"
                :class="filter.icon !== false ? 'pl-9 pr-3' : 'px-3'"
                @input="emitChange"
              />
            </div>
          </div>
        </template>
      </div>
    </template>

    <template #filter-actions>
      <!-- Advanced Toggle -->
      <button
        v-if="advancedFilters && advancedFilters.length > 0"
        type="button"
        @click="showAdvanced = !showAdvanced"
        class="h-[42px] px-4 flex items-center justify-center gap-2 border rounded-lg text-sm font-semibold transition-colors bg-background flex-1 lg:flex-none"
        :class="
          showAdvanced
            ? 'border-primary text-primary bg-primary/5'
            : 'border-secondary/50 text-text/70 hover:bg-secondary/10'
        "
      >
        <font-awesome-icon icon="fa-solid fa-sliders" />
        <span class="hidden lg:inline">Filter Lanjutan</span>
        <font-awesome-icon
          :icon="showAdvanced ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
          class="text-[10px] ml-1 opacity-50"
        />
      </button>

      <!-- Clear Button -->
      <button
        type="button"
        class="h-[42px] px-4 bg-secondary/10 hover:bg-danger/10 text-text/80 hover:text-danger text-sm font-bold border border-secondary/20 hover:border-danger/20 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
        @click="emitClear"
      >
        <font-awesome-icon icon="fa-solid fa-eraser" />
        <span class="hidden lg:inline">Reset</span>
      </button>

      <slot name="actions"></slot>
    </template>

    <template #advanced v-if="advancedFilters && advancedFilters.length > 0 && showAdvanced">
      <div
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full pt-4 mt-2 border-t border-secondary/20 animate-fade-in"
      >
        <template v-for="(filter, index) in advancedFilters" :key="'adv-' + index">
          <div class="flex flex-col gap-1.5 w-full" :class="filter.class">
            <label
              v-if="filter.label"
              :for="filter.key"
              class="text-[10px] font-bold text-text/50 uppercase tracking-wide"
            >
              {{ filter.label }}
            </label>

            <DateRangeFilter
              v-if="filter.type === 'daterange'"
              :startDate="localValues[filter.keyStart]"
              :endDate="localValues[filter.keyEnd]"
              @update:startDate="((localValues[filter.keyStart] = $event), emitChange())"
              @update:endDate="((localValues[filter.keyEnd] = $event), emitChange())"
              class="w-full"
            />

            <BaseSelect
              v-else-if="filter.type === 'select'"
              v-model="localValues[filter.key]"
              :options="filter.options"
              track-by="value"
              emit-value
              :multiple="filter.multiple || false"
              :searchable="filter.searchable || false"
              :clearable="filter.clearable !== undefined ? filter.clearable : true"
              :clear-value="filter.clearValue !== undefined ? filter.clearValue : 'all'"
              :placeholder="filter.placeholder || 'Semua ' + filter.label"
              @update:modelValue="emitChange"
              class="w-full"
            />

            <TriStateSelect
              v-else-if="filter.type === 'triselect'"
              v-model="localValues[filter.key]"
              :options="filter.options"
              :label="filter.optionLabel || 'label'"
              :track-by="filter.trackBy || 'id'"
              :placeholder="filter.placeholder || 'Pilih ' + filter.label"
              :searchable="filter.searchable || false"
              @update:modelValue="emitChange"
              class="w-full"
            />

            <!-- Text Input -->
            <div v-else-if="filter.type === 'text'" class="relative w-full group">
              <span
                v-if="filter.icon !== false"
                class="absolute inset-y-0 left-0 pl-3 flex items-center text-text/40 group-focus-within:text-primary transition-colors pointer-events-none"
              >
                <font-awesome-icon :icon="filter.icon || 'fa-solid fa-search'" />
              </span>
              <input
                v-model="localValues[filter.key]"
                type="text"
                :placeholder="filter.placeholder || filter.label"
                class="w-full h-[42px] rounded-lg bg-background border border-secondary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all text-sm text-text placeholder:text-text/30 shadow-sm"
                :class="filter.icon !== false ? 'pl-9 pr-3' : 'px-3'"
                @input="emitChange"
              />
            </div>
          </div>
        </template>
      </div>
    </template>
  </BaseFilterPanel>
</template>
