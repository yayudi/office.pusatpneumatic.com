<!-- frontend\src\components\picking\PickingFilterBar.vue -->
<script setup>
import { watch } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { usePickingFilters } from '@/composables/usePickingFilters.js'

const sourceOptions = [
  { id: 'Tokopedia', label: 'Tokopedia' },
  { id: 'Shopee', label: 'Shopee' },
  { id: 'Offline', label: 'Offline' },
]

const purposeOptions = [
  { id: 'DISPLAY', label: 'Utama (DISPLAY)' },
  { id: 'BRANCH', label: 'Cabang (BRANCH)' },
]

const stockStatusOptions = [
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
      return {}
    },
  },
})

const emit = defineEmits(['update:modelValue'])

const { filterState: localValues, hasActiveFilters, clearFilters, onSearchInput, onSelectChange } = usePickingFilters(props.modelValue, (newVal) => emit('update:modelValue', newVal))

// Sync from parent to local
watch(
  () => props.modelValue,
  (val) => {
    Object.assign(localValues, val)
  },
  { deep: true },
)

</script>

<template>
  <BaseFilterPanel title="Filter Picking">
    <!-- Search & Date -->
    <template #search>
      <div class="flex flex-col sm:flex-row gap-3">
        <!-- Search -->
        <div class="relative flex-grow group">
          <input :value="localValues.search" @input="onSearchInput" type="text" placeholder="Cari Invoice, SKU..."
            class="w-full pl-9 pr-8 py-2 rounded-lg bg-secondary/5 border border-transparent hover:border-secondary/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium h-[42px]"
            :class="{ '!bg-primary/5 !border-primary/30': localValues.search }" />
          <font-awesome-icon icon="fa-solid fa-search"
            class="absolute left-3 top-3 text-text/40 text-sm transition-colors group-focus-within:text-primary" />
          <button v-if="localValues.search" @click="onSearchInput({ target: { value: '' } })"
            class="absolute right-2 top-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-secondary/20 text-text/40 hover:text-danger transition-all mt-0.5"
            title="Hapus pencarian">
            <font-awesome-icon icon="fa-solid fa-times" class="text-xs" />
          </button>
        </div>

        <DateRangeFilter v-model:startDate="localValues.startDate" v-model:endDate="localValues.endDate"
          class="shrink-0" />
      </div>
    </template>

    <!-- Dropdowns & Actions -->
    <template #filters>
      <!-- Filter Source -->
      <div class="w-full sm:w-1/3 md:w-40">
        <BaseSelect :model-value="localValues.source" @update:model-value="(v) => onSelectChange('source', v)"
          :options="sourceOptions" label="label" track-by="id" placeholder="Semua Sumber" :searchable="false" emit-value
          clearable clear-value="ALL" />
      </div>

      <!-- Filter Location Purpose -->
      <div v-if="localValues.source === 'Offline'" class="w-full sm:w-1/4 md:w-41 animate-fade-in origin-left">
        <BaseSelect :model-value="localValues.locationPurpose"
          @update:model-value="(v) => onSelectChange('locationPurpose', v)" :options="purposeOptions" label="label"
          track-by="id" placeholder="Semua Lokasi" :searchable="false" emit-value clearable clear-value="ALL" />
      </div>

      <!-- Filter Stock Status -->
      <div class="w-full sm:w-1/3 md:w-40">
        <BaseSelect :model-value="localValues.stockStatus" @update:model-value="(v) => onSelectChange('stockStatus', v)"
          :options="stockStatusOptions" label="label" track-by="id" placeholder="Semua Status" :searchable="false"
          emit-value clearable clear-value="ALL" />
      </div>

      <!-- Sorting -->
      <div class="w-full sm:w-1/3 md:w-36">
        <BaseSelect :model-value="localValues.sortBy" @update:model-value="(v) => onSelectChange('sortBy', v)"
          :options="sortOptions" label="label" track-by="id" :searchable="false" emit-value />
      </div>
    </template>

    <template #filter-actions>
      <!-- Mode View (List vs Grid vs Compact) -->
      <div class="flex bg-secondary/10 rounded-lg p-1 border border-secondary/20 h-[42px]">
        <button @click="onSelectChange('viewMode', 'grid')"
          class="px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
          :class="localValues.viewMode === 'grid' ? 'bg-background text-primary shadow-sm font-bold' : 'text-text/50 hover:text-text'"
          title="Tampilan Grid (Kartu)">
          <font-awesome-icon icon="fa-solid fa-grip" />
        </button>
        <button @click="onSelectChange('viewMode', 'compact')"
          class="px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
          :class="localValues.viewMode === 'compact' ? 'bg-background text-primary shadow-sm font-bold' : 'text-text/50 hover:text-text'"
          title="Tampilan List (Tumpuk)">
          <font-awesome-icon icon="fa-solid fa-list" />
        </button>
      </div>
      <!-- Tombol Clear Filters -->
      <transition name="fade">
        <button v-if="hasActiveFilters" @click="clearFilters"
          class="h-[42px] px-4 text-sm font-bold text-danger border border-danger/20 hover:bg-danger/5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap"
          title="Reset semua filter">
          <font-awesome-icon icon="fa-solid fa-eraser" />
          <span class="hidden lg:inline">Reset</span>
        </button>
      </transition>
    </template>
  </BaseFilterPanel>
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
