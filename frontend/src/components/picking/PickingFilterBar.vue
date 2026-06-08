<!-- frontend\src\components\picking\PickingFilterBar.vue -->
<script setup>
import { watch, ref } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import TriStateSelect from '@/components/ui/TriStateSelect.vue'
import { usePickingFilters } from '@/composables/usePickingFilters.js'

const isAdvancedFilterOpen = ref(false)

const sourceOptions = [
  { id: 'Tokopedia', label: 'Tokopedia' },
  { id: 'Shopee', label: 'Shopee' },
  { id: 'Offline', label: 'Offline' }
]

const purposeOptions = [
  { id: 'DISPLAY', label: 'DISPLAY' },
  { id: 'BRANCH', label: 'BRANCH' }
]

const stockStatusOptions = [
  { id: 'READY', label: 'Siap Pick' },
  { id: 'ISSUE', label: 'Bermasalah' },
  { id: 'EMPTY', label: 'Stok Kosong' }
]

const sortOptions = [
  { id: 'newest', label: 'Terbaru' },
  { id: 'oldest', label: 'Terlama' },
  { id: 'invoice_asc', label: 'A-Z' },
  { id: 'invoice_desc', label: 'Z-A' }
]

const props = defineProps({
  modelValue: {
    type: Object,
    default() {
      return {}
    }
  },
  shopOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const {
  filterState: localValues,
  hasActiveFilters,
  activeFilterBadges,
  isSearching,
  clearFilters,
  removeFilter,
  onSearchInput,
  onSelectChange,
  applyPreset
} = usePickingFilters(props.modelValue, newVal => emit('update:modelValue', newVal))

// Sync from parent to local
watch(
  () => props.modelValue,
  val => {
    Object.assign(localValues, val)
  },
  { deep: true }
)
</script>

<template>
  <div class="sticky top-[72px] z-10 -mx-4 px-4 sm:mx-0 sm:px-0 sm:shadow-none sm:bg-transparent">
    <BaseFilterPanel :border="false">
      <template #filters>
        <div class="flex flex-col gap-4 w-full">
          <!-- PRIMARY ROW: Search, View Mode, Clear & Toggle Advanced -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Search & Presets Group -->
            <div class="flex flex-wrap w-full lg:max-w-[50vw] items-center gap-2 flex-1 md:flex-none">
              <!-- Search -->
              <div
                class="w-[80%] lg:w-full relative group shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1"
              >
                <input
                  :value="localValues.search"
                  @input="onSearchInput"
                  type="text"
                  placeholder="Cari Invoice, SKU..."
                  class="w-full pl-9 pr-10 py-2 rounded-lg bg-secondary/5 border border-transparent hover:border-secondary/20 focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-medium h-[42px]"
                  :class="{ '!bg-primary/5 !border-primary/30': localValues.search }"
                />
                <font-awesome-icon
                  icon="fa-solid fa-search"
                  class="absolute left-3 top-3 text-text/40 text-sm transition-colors group-focus-within:text-primary"
                />

                <!-- Loading Spinner or Clear -->
                <div class="absolute right-2 top-2 h-6 flex items-center justify-center mt-0.5">
                  <font-awesome-icon
                    v-if="isSearching"
                    icon="fa-solid fa-spinner"
                    class="fa-spin text-primary text-sm"
                  />
                  <button
                    v-else-if="localValues.search"
                    @click="onSearchInput({ target: { value: '' } })"
                    class="h-6 w-6 flex items-center justify-center rounded-full hover:bg-secondary/20 text-text/40 hover:text-danger transition-all"
                    title="Hapus pencarian"
                  >
                    <font-awesome-icon icon="fa-solid fa-times" class="text-xs" />
                  </button>
                </div>
              </div>

              <!-- Presets -->
              <div class="hidden sm:flex items-center gap-2">
                <button
                  @click="applyPreset('issue')"
                  class="px-3 py-1.5 text-xs font-medium rounded-full bg-warning/10 text-warning hover:bg-warning/20 transition-colors border border-warning/20"
                >
                  <font-awesome-icon icon="fa-solid fa-triangle-exclamation" class="text-warning" /> Ada Masalah
                </button>
                <button
                  @click="applyPreset('empty')"
                  class="px-3 py-1.5 text-xs font-medium rounded-full bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20"
                >
                  <font-awesome-icon icon="fa-solid fa-box-open" class="text-danger" /> Stok Kosong
                </button>
              </div>
            </div>

            <!-- Controls Group (View Mode, Clear, Toggle Advanced) -->
            <div class="flex items-center gap-2 w-full md:w-auto">
              <!-- Mode View -->
              <div class="flex bg-secondary p-1 h-[42px] rounded-lg ring-1 ring-secondary shrink-0">
                <button
                  @click="onSelectChange('viewMode', 'grid')"
                  class="px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
                  :class="
                    localValues.viewMode === 'grid'
                      ? 'bg-background text-primary shadow-sm font-bold'
                      : 'text-text/50 hover:text-text'
                  "
                  title="Tampilan Grid"
                >
                  <font-awesome-icon icon="fa-solid fa-border-all" />
                </button>
                <button
                  @click="onSelectChange('viewMode', 'compact')"
                  class="px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
                  :class="
                    localValues.viewMode === 'compact'
                      ? 'bg-background text-primary shadow-sm font-bold'
                      : 'text-text/50 hover:text-text'
                  "
                  title="Tampilan Compact"
                >
                  <font-awesome-icon icon="fa-solid fa-table-cells" />
                </button>
                <button
                  @click="onSelectChange('viewMode', 'list')"
                  class="px-3 rounded-md text-sm transition-all flex items-center justify-center min-w-[40px]"
                  :class="
                    localValues.viewMode === 'list'
                      ? 'bg-background text-primary shadow-sm font-bold'
                      : 'text-text/50 hover:text-text'
                  "
                  title="Tampilan List"
                >
                  <font-awesome-icon icon="fa-solid fa-list" />
                </button>
              </div>

              <!-- Clear Filters -->
              <transition name="fade">
                <button
                  v-if="hasActiveFilters"
                  @click="clearFilters"
                  class="h-[42px] px-3 text-sm font-bold text-danger border border-danger/20 hover:bg-danger/10 rounded-lg flex items-center justify-center transition-all"
                  title="Reset Filter"
                >
                  <font-awesome-icon icon="fa-solid fa-eraser" />
                </button>
              </transition>

              <!-- Toggle Advanced Filters -->
              <button
                @click="isAdvancedFilterOpen = !isAdvancedFilterOpen"
                class="h-[42px] px-4 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all shrink-0 flex-1 md:flex-none border"
                :class="
                  isAdvancedFilterOpen
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-text border-secondary hover:bg-secondary/10'
                "
              >
                <font-awesome-icon icon="fa-solid fa-sliders" />
                <span class="md:hidden lg:inline">Filter Lanjutan</span>
                <font-awesome-icon
                  :icon="isAdvancedFilterOpen ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
                  class="text-xs ml-1"
                />
              </button>
            </div>
          </div>

          <!-- ACTIVE FILTER BADGES -->
          <div v-if="activeFilterBadges.length > 0" class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-text/60 font-medium mr-1">Filter Aktif:</span>
            <div
              v-for="badge in activeFilterBadges"
              :key="badge.key"
              class="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium"
            >
              <span>{{ badge.label }}</span>
              <button
                @click="removeFilter(badge.key)"
                class="hover:bg-primary/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
              >
                <font-awesome-icon icon="fa-solid fa-times" class="text-[10px]" />
              </button>
            </div>
            <button
              v-if="activeFilterBadges.length > 1"
              @click="clearFilters"
              class="text-xs text-danger hover:underline ml-1 font-medium"
            >
              Hapus Semua
            </button>
          </div>

          <!-- ADVANCED FILTERS (Collapsible) -->
          <transition name="slide-fade">
            <div v-show="isAdvancedFilterOpen" class="flex flex-col gap-3 border-t border-secondary/20">
              <div class="flex flex-wrap items-center gap-2">
                <!-- Date Range -->
                <div class="w-full md:w-auto lg:w-2/5 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1">
                  <DateRangeFilter
                    v-model:startDate="localValues.startDate"
                    v-model:endDate="localValues.endDate"
                    class="min-w-full sm:w-auto"
                  />
                </div>

                <!-- Sorting -->
                <div class="w-full md:w-auto lg:w-1/5 shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1">
                  <BaseSelect
                    :model-value="localValues.sortBy"
                    @update:model-value="v => onSelectChange('sortBy', v)"
                    :options="sortOptions"
                    label="label"
                    track-by="id"
                    :searchable="false"
                    emit-value
                  />
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <!-- Filter Source -->
                <div class="w-full md:w-auto shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1">
                  <TriStateSelect
                    :model-value="localValues.source"
                    @update:model-value="v => onSelectChange('source', v)"
                    :options="sourceOptions"
                    label="label"
                    track-by="id"
                    placeholder="Semua Sumber"
                  />
                </div>

                <!-- Filter Location Purpose -->
                <div
                  v-if="localValues.source?.include?.includes('Offline')"
                  class="w-full md:w-auto animate-fade-in shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1"
                >
                  <TriStateSelect
                    :model-value="localValues.locationPurpose"
                    @update:model-value="v => onSelectChange('locationPurpose', v)"
                    :options="purposeOptions"
                    label="label"
                    track-by="id"
                    placeholder="Semua Lokasi"
                  />
                </div>

                <!-- Filter Stock Status -->
                <div class="w-full md:w-auto shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1">
                  <TriStateSelect
                    :model-value="localValues.stockStatus"
                    @update:model-value="v => onSelectChange('stockStatus', v)"
                    :options="stockStatusOptions"
                    label="label"
                    track-by="id"
                    placeholder="Semua Status"
                  />
                </div>

                <!-- Filter Shop/Channel -->
                <div
                  v-if="shopOptions && shopOptions.length > 0"
                  class="w-full md:w-auto shrink-0 rounded-md ring-1 ring-secondary bg-background flex-1"
                >
                  <TriStateSelect
                    :model-value="localValues.shopName"
                    @update:model-value="v => onSelectChange('shopName', v)"
                    :options="shopOptions"
                    label="label"
                    track-by="id"
                    placeholder="Semua Toko"
                  />
                </div>
              </div>
            </div>
          </transition>
        </div>
      </template>
    </BaseFilterPanel>
  </div>
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
  transform: scale(0.95);
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  opacity: 1;
  overflow: hidden;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}
</style>
