<!-- frontend\src\components\picking\PickingFilterBar.vue -->
<script setup>
import { watch } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { usePickingFilters } from '@/composables/usePickingFilters.js'

const sourceOptions = [
  { id: 'ALL', label: 'Sumber' },
  { id: 'Tokopedia', label: 'Tokopedia' },
  { id: 'Shopee', label: 'Shopee' },
  { id: 'Offline', label: 'Offline' },
]

const purposeOptions = [
  { id: 'ALL', label: 'Lokasi' },
  { id: 'DISPLAY', label: 'DISPLAY' },
  { id: 'BRANCH', label: 'BRANCH' },
]

const stockStatusOptions = [
  { id: 'ALL', label: 'Status' },
  { id: 'READY', label: 'Siap Pick' },
  { id: 'ISSUE', label: 'Bermasalah' },
  { id: 'EMPTY', label: 'Stok Kosong' }
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
  shopOptions: {
    type: Array,
    default: () => [],
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
  <BaseFilterPanel :border="false">
    <template #filters>
      <div class="flex flex-col gap-4 w-full">
        <!-- Baris Atas: Semua Input Filter Utama -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Search -->
          <div class="w-full lg:max-w-lg relative group shrink-0 rounded-md ring-1 ring-secondary bg-background">
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

          <!-- Filter Source -->
          <div
            class="w-full md:w-auto lg:w-1/5 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <BaseSelect :model-value="localValues.source" @update:model-value="(v) => onSelectChange('source', v)"
              :options="sourceOptions" label="label" track-by="id" placeholder="Semua Sumber" :searchable="false"
              emit-value clearable clear-value="ALL" label-key="label" />
          </div>

          <!-- Filter Location Purpose -->
          <div v-if="localValues.source === 'Offline'"
            class="w-full md:w-auto lg:w-1/5 animate-fade-in origin-left shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <BaseSelect :model-value="localValues.locationPurpose"
              @update:model-value="(v) => onSelectChange('locationPurpose', v)" :options="purposeOptions" label="label"
              track-by="id" placeholder="Semua Lokasi" :searchable="false" emit-value clearable clear-value="ALL" />
          </div>

          <!-- Filter Stock Status -->
          <div
            class="w-full md:w-auto lg:w-1/6 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <BaseSelect :model-value="localValues.stockStatus"
              @update:model-value="(v) => onSelectChange('stockStatus', v)" :options="stockStatusOptions" label="label"
              track-by="id" placeholder="Semua Status" :searchable="false" emit-value clearable clear-value="ALL" />
          </div>
        </div>

        <!-- Baris Bawah: Mode View dan Clear Filters -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Filter Shop/Channel -->
          <div v-if="shopOptions && shopOptions.length > 0"
            class="w-full md:w-auto lg:w-1/5 animate-fade-in shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <BaseSelect :model-value="localValues.shopName" @update:model-value="(v) => onSelectChange('shopName', v)"
              :options="shopOptions" label="label" track-by="id" placeholder="Semua Toko" :searchable="true" emit-value
              clearable clear-value="ALL" />
          </div>

          <!-- Sorting -->
          <div
            class="w-full md:w-auto lg:w-1/5 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <BaseSelect :model-value="localValues.sortBy" @update:model-value="(v) => onSelectChange('sortBy', v)"
              :options="sortOptions" label="label" track-by="id" :searchable="false" emit-value />
          </div>

          <!-- Date Range -->
          <div
            class="w-full md:w-auto lg:w-2/5 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1 md:flex-none">
            <DateRangeFilter v-model:startDate="localValues.startDate" v-model:endDate="localValues.endDate"
              class="min-w-full sm:w-auto" />
          </div>

          <!-- Mode View (List vs Grid vs Compact) -->
          <div
            class="flex flex-1 md:flex-none bg-secondary/10 p-1 h-[42px] rounded-lg ring-1 ring-secondary bg-background shrink-0 w-full md:w-auto">
            <button @click="onSelectChange('viewMode', 'grid')"
              class="flex-1 md:flex-none px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
              :class="localValues.viewMode === 'grid' ? 'bg-background text-primary shadow-sm font-bold' : 'text-text/50 hover:text-text'"
              title="Tampilan Grid (Kartu)">
              <font-awesome-icon icon="fa-solid fa-border-all" />
            </button>
            <button @click="onSelectChange('viewMode', 'compact')"
              class="flex-1 md:flex-none px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
              :class="localValues.viewMode === 'compact' ? 'bg-background text-primary shadow-sm font-bold' : 'text-text/50 hover:text-text'"
              title="Tampilan Compact (Tumpuk)">
              <font-awesome-icon icon="fa-solid fa-table-cells" />
            </button>
            <button @click="onSelectChange('viewMode', 'list')"
              class="flex-1 md:flex-none px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
              :class="localValues.viewMode === 'list' ? 'bg-background text-primary shadow-sm font-bold' : 'text-text/50 hover:text-text'"
              title="Tampilan List (Tabel Baris)">
              <font-awesome-icon icon="fa-solid fa-list" />
            </button>
          </div>

          <!-- Tombol Clear Filters -->
          <transition name="fade">
            <button v-if="hasActiveFilters" @click="clearFilters"
              class="h-[42px] px-4 text-sm font-bold text-danger border-2 border-danger/20 hover:bg-danger/15 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 w-full md:w-auto"
              title="Reset semua filter">
              <font-awesome-icon icon="fa-solid fa-eraser" />
              <span class="md:hidden">Reset Filter</span>
            </button>
          </transition>
        </div>
      </div>
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
