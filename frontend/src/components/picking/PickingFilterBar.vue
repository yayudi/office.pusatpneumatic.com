<script setup>
import { reactive, watch, computed } from 'vue'
import FilterContainer from '@/components/ui/FilterContainer.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const sourceOptions = [
  { id: 'ALL', label: 'Semua Sumber' },
  { id: 'Tokopedia', label: 'Tokopedia' },
  { id: 'Shopee', label: 'Shopee' },
  { id: 'Offline', label: 'Offline' },
]

const purposeOptions = [
  { id: 'ALL', label: 'Semua Lokasi' },
  { id: 'DISPLAY', label: 'Utama (DISPLAY)' },
  { id: 'BRANCH', label: 'Cabang (BRANCH)' },
]

const stockStatusOptions = [
  { id: 'ALL', label: 'Semua Status' },
  { id: 'READY', label: 'Siap Pick' },
  { id: 'ISSUE', label: 'Bermasalah' },
  { id: 'EMPTY', label: 'Stok Kosong' },
]

const sortOptions = [
  { id: 'newest', label: 'Terbaru' },
  { id: 'oldest', label: 'Terlama' },
  { id: 'invoice_asc', label: 'A-Z' },
  { id: 'invoice_desc', label: 'Z-A' },
]

const props = defineProps({
  modelValue: {
    type: Object,
    default() {
      return {
        search: '',
        source: 'ALL',
        locationPurpose: 'ALL',
        stockStatus: 'ALL',
        sortBy: 'newest',
        viewMode: 'grid',
        startDate: '',
        endDate: '',
      }
    },
  },
})

const emit = defineEmits(['update:modelValue'])

// Local reactive state synced with props
const localValues = reactive({ ...props.modelValue })
let debounceTimer = null

// Sync from parent to local
watch(
  () => props.modelValue,
  (val) => {
    Object.assign(localValues, val)
  },
  { deep: true },
)

// Sync from local to parent (Immediate)
function emitChange() {
  emit('update:modelValue', { ...localValues })
}

// Debounced Search Input Handler
function onSearchInput(event) {
  const val = event.target.value
  localValues.search = val

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emitChange()
  }, 300) // Delay 300ms
}

// Helper to detect if any filter is active
const hasActiveFilters = computed(() => {
  return (
    localValues.source !== 'ALL' ||
    localValues.locationPurpose !== 'ALL' ||
    localValues.stockStatus !== 'ALL' ||
    localValues.search !== '' ||
    localValues.startDate !== '' ||
    localValues.endDate !== ''
  )
})

function clearFilters() {
  localValues.search = ''
  localValues.source = 'ALL'
  localValues.locationPurpose = 'ALL'
  localValues.stockStatus = 'ALL'
  localValues.startDate = ''
  localValues.endDate = ''
  emitChange()
}

function onSelectChange(field, option) {
  localValues[field] = typeof option === 'object' ? option.id : option

  if (field === 'source' && localValues.source !== 'Offline') {
    localValues.locationPurpose = 'ALL'
  }

  emitChange()
}
</script>

<template>
  <FilterContainer title="Filter Picking">
    <!-- Search & Date -->
    <div class="flex flex-col sm:flex-row gap-2 flex-grow">
      <!-- Search -->
      <div class="relative flex-grow group">
        <input :value="localValues.search" @input="onSearchInput" type="text" placeholder="Cari Invoice, SKU..."
          class="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/5 border border-transparent hover:border-secondary/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium h-[42px]"
          :class="{ '!bg-primary/5 !border-primary/30': localValues.search }" />
        <font-awesome-icon icon="fa-solid fa-search"
          class="absolute left-3 top-3 text-text/40 text-sm transition-colors group-focus-within:text-primary" />
        <button v-if="localValues.search" @click="((localValues.search = ''), emitChange())"
          class="absolute right-2 top-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-secondary/20 text-text/40 hover:text-danger transition-all mt-0.5"
          title="Hapus pencarian">
          <font-awesome-icon icon="fa-solid fa-times" class="text-xs" />
        </button>
      </div>

      <!-- Date Range (Joined) -->
      <DateRangeFilter v-model:startDate="localValues.startDate" v-model:endDate="localValues.endDate"
        class="shrink-0" />
    </div>

    <!-- Dropdowns & Actions -->
    <div class="flex flex-wrap md:flex-nowrap gap-2 items-center">
      <!-- Filter Source -->
      <div class="w-full sm:w-1/3 md:w-40">
        <BaseSelect :model-value="localValues.source" @update:model-value="(v) => onSelectChange('source', v)"
          :options="sourceOptions" label="label" track-by="id" placeholder="Sumber" :searchable="false" emit-value />
      </div>

      <!-- Filter Location Purpose -->
      <div v-if="localValues.source === 'Offline'" class="w-full sm:w-1/4 md:w-41 animate-fade-in origin-left">
        <BaseSelect :model-value="localValues.locationPurpose"
          @update:model-value="(v) => onSelectChange('locationPurpose', v)" :options="purposeOptions" label="label"
          track-by="id" placeholder="Lokasi Stok" :searchable="false" emit-value />
      </div>

      <!-- Filter Stock Status -->
      <div class="w-full sm:w-1/3 md:w-40">
        <BaseSelect :model-value="localValues.stockStatus" @update:model-value="(v) => onSelectChange('stockStatus', v)"
          :options="stockStatusOptions" label="label" track-by="id" placeholder="Status Stok" :searchable="false"
          emit-value />
      </div>

      <!-- Sort -->
      <div class="w-1/2 sm:w-32 md:w-40 flex-grow sm:flex-grow-0">
        <BaseSelect :model-value="localValues.sortBy" @update:model-value="(v) => onSelectChange('sortBy', v)"
          :options="sortOptions" label="label" track-by="id" placeholder="Urutkan" :searchable="false" emit-value />
      </div>

      <!-- View Toggle (3 Modes: List, Grid, Compact) -->
      <div class="flex bg-secondary/10 rounded-lg p-1 shrink-0 h-[42px] w-auto flex-grow sm:flex-grow-0">
        <button @click="((localValues.viewMode = 'list'), emitChange())"
          class="w-9 rounded-md transition-all text-xs flex items-center justify-center" :class="localValues.viewMode === 'list'
            ? 'bg-background text-primary shadow-sm font-bold'
            : 'text-text/40 hover:text-text'
            " title="Tampilan List">
          <font-awesome-icon icon="fa-solid fa-list" />
        </button>
        <button @click="((localValues.viewMode = 'grid'), emitChange())"
          class="w-9 rounded-md transition-all text-xs flex items-center justify-center" :class="localValues.viewMode === 'grid'
            ? 'bg-background text-primary shadow-sm font-bold'
            : 'text-text/40 hover:text-text'
            " title="Tampilan Grid (Standard Card)">
          <font-awesome-icon icon="fa-solid fa-border-all" />
        </button>
        <button @click="((localValues.viewMode = 'compact'), emitChange())"
          class="w-9 rounded-md transition-all text-xs flex items-center justify-center" :class="localValues.viewMode === 'compact'
            ? 'bg-background text-primary shadow-sm font-bold'
            : 'text-text/40 hover:text-text'
            " title="Tampilan Compact (Small Card)">
          <font-awesome-icon icon="fa-solid fa-table-cells" />
        </button>
      </div>

      <!-- Reset Button -->
      <transition name="fade">
        <button v-if="hasActiveFilters" @click="clearFilters"
          class="h-[42px] px-3 rounded-lg text-danger hover:bg-danger/10 transition-colors flex items-center justify-center border border-transparent hover:border-danger/20"
          title="Reset Filter">
          <font-awesome-icon icon="fa-solid fa-rotate-left" />
        </button>
      </transition>
    </div>
  </FilterContainer>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
