<!-- frontend/src/components/wms/shared/WmsControlPanel.vue -->
<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const props = defineProps({
  // Data
  searchPlaceholder: { type: String, default: 'Cari...' },
  searchTabs: { type: Array, default: () => [] },
  warehouseViews: { type: Array, default: () => [] },
  buildingFilterOptions: { type: Array, default: () => [] },
  floorFilterOptions: { type: Array, default: () => [] },
  categoryFilterOptions: { type: Array, default: () => [] },

  // Status
  isAutoRefetching: Boolean,

  // v-models
  searchBy: String,
  searchValue: String,
  activeView: String,
  productTypeFilter: { type: String, default: 'all' },
  stockStatusFilter: { type: String, default: 'all' },
  selectedBuilding: String,
  selectedFloor: String,
  selectedCategory: String,
  mobileLayout: { type: String, default: 'card' },
  availableColumns: { type: Array, default: () => [] },
  visibleColumns: { type: Object, default: () => new Set() },
})

const emit = defineEmits([
  'update:searchBy',
  'update:searchValue',
  'update:activeView',
  'update:stockStatusFilter',
  'update:productTypeFilter',
  'update:selectedBuilding',
  'update:selectedFloor',
  'update:selectedCategory',
  'update:categoryFilterOptions',
  'update:mobileLayout',
  'search',
  'toggle-column',
  'toggle-refetch'
])

function onSearchInput(e) {
  emit('update:searchValue', e.target.value)
  emit('search', e.target.value)
}

function clearSearch() {
  emit('update:searchValue', '')
  emit('search', '')
}

const typeOptions = [
  { id: 'unit', label: 'Satuan' },
  { id: 'package', label: 'Paket' },
]

const stockOptions = [
  { id: 'minus', label: 'Minus' },
  { id: 'positive', label: 'Aman' },
]

// Column Menu State
const isColumnMenuOpen = ref(false)

function toggleColumnMenu() {
  isColumnMenuOpen.value = !isColumnMenuOpen.value
  if (isColumnMenuOpen.value) {
    updateDropdownPosition()
  }
}

function handleToggleColumn(colId) {
  emit('toggle-column', colId)
}

// Close menu when clicking outside
function closeColumnMenu(e) {
  if (isColumnMenuOpen.value && !e.target.closest('.column-selector-group')) {
    isColumnMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeColumnMenu)
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
})

onUnmounted(() => {
  document.removeEventListener('click', closeColumnMenu)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})

// Validation for position
const dropdownPosition = ref({ top: '0px', left: '0px', minWidth: '125px' })
const buttonRef = ref(null)

function updateDropdownPosition() {
  if (isColumnMenuOpen.value && buttonRef.value) {
    const rect = buttonRef.value.getBoundingClientRect()
    dropdownPosition.value = {
      top: `${rect.bottom + 8}px`,
      left: `${rect.right - 125}px`, // Align right edge
      minWidth: '125px'
    }
  }
}

</script>

<template>
  <BaseFilterPanel class="z-50">
    <!-- Search Row -->
    <template #search>
      <div class="relative flex-grow group w-full xl:w-auto shadow-sm rounded-lg">
        <span
          class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text/40 group-focus-within:text-primary transition-colors">
          <font-awesome-icon icon="fa-solid fa-search" />
        </span>

        <input id="global-search-input" :value="searchValue" @input="onSearchInput" type="text"
          :placeholder="searchPlaceholder"
          class="w-full pl-10 pr-10 py-2 bg-background border border-secondary rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-text transition-all placeholder-text/30 h-[42px]" />

        <button v-if="searchValue" @click="clearSearch"
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-text/40 hover:text-danger cursor-pointer transition-colors"
          title="Bersihkan pencarian">
          <font-awesome-icon icon="fa-solid fa-times-circle" />
        </button>
      </div>
    </template>

    <!-- Tabs Row -->
    <template #tabs>
      <div class="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
        <!-- Search By Tabs -->
        <div class="flex bg-background p-1 rounded-lg border border-secondary h-[42px] shrink-0 items-center shadow-sm">
          <button v-for="tab in searchTabs" :key="tab.value" @click="emit('update:searchBy', tab.value)"
            class="flex-1 md:flex-none px-3 py-1 rounded text-xs font-bold transition-all duration-200 flex items-center justify-center h-full"
            :class="[
              searchBy === tab.value
                ? 'bg-primary text-secondary shadow-sm'
                : 'text-text/60 hover:text-text',
            ]">
            {{ tab.label }}
          </button>
        </div>

        <!-- View Tabs -->
        <div
          class="flex bg-background p-1 rounded-lg border border-secondary h-[42px] overflow-x-auto no-scrollbar shrink-0 items-center shadow-sm">
          <button v-for="view in warehouseViews" :key="view.value" @click="emit('update:activeView', view.value)"
            class="flex-1 px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center h-full"
            :class="[
              activeView === view.value
                ? 'bg-primary text-secondary shadow-sm font-bold'
                : 'text-text/60 hover:text-text hover:bg-secondary/10',
            ]">
            {{ view.label }}
          </button>
        </div>
      </div>
    </template>

    <!-- Actions & Filters (Inline Right) -->
    <template #actions>
      <div class="flex flex-wrap items-center justify-between gap-2 min-w-full lg:min-w-0">
        <!-- Filter Warehouse (Hanya tampil jika view gudang) -->
        <div v-if="activeView === 'gudang'" class="flex gap-2 animate-fade-in w-full lg:w-auto lg:min-w-[160px]">
          <BaseSelect :model-value="selectedBuilding" @update:modelValue="emit('update:selectedBuilding', $event)"
            :options="buildingFilterOptions" track-by="value" emit-value :searchable="false" clearable clear-value="all"
            placeholder="Gedung" class="w-full lg:w-[100px]" />
          <BaseSelect :model-value="selectedFloor" @update:modelValue="emit('update:selectedFloor', $event)"
            :options="floorFilterOptions" track-by="value" emit-value :searchable="false" clearable clear-value="all"
            placeholder="Lantai" class="w-full lg:w-[100px]" />
        </div>

        <!-- Category Filter -->
        <div class="w-full lg:w-[160px]">
          <BaseSelect :model-value="selectedCategory" @update:modelValue="emit('update:selectedCategory', $event)"
            :options="categoryFilterOptions" track-by="id" emit-value :searchable="true" clearable clear-value="all"
            placeholder="- Kategori -" class="w-full" :class="[
              selectedCategory !== 'all'
                ? 'bg-accent/5 border-accent text-accent'
                : 'bg-background border-secondary text-text/60 hover:text-text'
            ]" />
        </div>

        <!-- Type Filter -->
        <div class="w-auto lg:w-[100px] sm:block">
          <BaseSelect :model-value="productTypeFilter" @update:modelValue="emit('update:productTypeFilter', $event)"
            :options="typeOptions" track-by="id" emit-value :searchable="false" clearable clear-value="all"
            placeholder="- Tipe -" class="w-full" :class="[
              productTypeFilter !== 'all'
                ? 'bg-accent/5 border-accent text-accent'
                : 'bg-background border-secondary text-text/60 hover:text-text'
            ]" />
        </div>

        <!-- Status Stock -->
        <div class="w-auto lg:w-[100px] sm:block">
          <BaseSelect :model-value="stockStatusFilter" @update:modelValue="emit('update:stockStatusFilter', $event)"
            :options="stockOptions" track-by="id" emit-value :searchable="false" clearable clear-value="all"
            placeholder="- Stok -" class="w-full" :class="[
              stockStatusFilter === 'minus' ? 'bg-danger/5 border-danger text-danger' :
                stockStatusFilter === 'positive' ? 'bg-success/5 border-success text-success' :
                  'bg-background border-secondary text-text/60 hover:text-text'
            ]" />
        </div>

        <!-- Column Visibility Selector -->
        <div class="relative column-selector-group shrink-0">
          <button ref="buttonRef" @click.stop="toggleColumnMenu"
            class="w-[42px] h-[42px] flex items-center justify-center rounded-lg border border-secondary/20 bg-background text-text/60 hover:text-primary transition-all shadow-sm"
            :class="{ 'bg-primary/10 text-primary border-primary': isColumnMenuOpen }" title="Pilih Kolom">
            <font-awesome-icon icon="fa-solid fa-table-columns" />
          </button>

          <!-- Dropdown Menu -->
          <Teleport to="body">
            <div v-if="isColumnMenuOpen"
              class="fixed z-[9999] bg-background border border-secondary/20 rounded-lg shadow-xl p-2 animate-fade-in-down column-selector-group"
              :style="{ top: dropdownPosition.top, left: dropdownPosition.left, minWidth: dropdownPosition.minWidth }">
              <div v-for="col in availableColumns" :key="col.id"
                class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/10 rounded"
                @click.stop="handleToggleColumn(col.id)">
                <div class="w-4 h-4 rounded border border-secondary flex items-center justify-center"
                  :class="visibleColumns.has(col.id) ? 'bg-primary border-primary' : 'bg-transparent'">
                  <font-awesome-icon v-if="visibleColumns.has(col.id)" icon="fa-solid fa-check"
                    class="text-secondary text-[10px]" />
                </div>
                <span class="text-sm font-bold text-text/80">{{ col.label }}</span>
              </div>
            </div>
          </Teleport>
        </div>

        <!-- Mobile Layout Switcher -->
        <div class="flex h-[42px] bg-secondary/10 rounded-lg p-1 md:hidden shrink-0">
          <button @click="emit('update:mobileLayout', 'card')"
            class="px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1"
            :class="mobileLayout === 'card' ? 'bg-background text-primary shadow-sm' : 'text-text/50'">
            <font-awesome-icon icon="fa-solid fa-grip-vertical" />
          </button>
          <button @click="emit('update:mobileLayout', 'compact')"
            class="px-3 rounded-md text-xs font-bold transition-all flex items-center gap-1"
            :class="mobileLayout === 'compact' ? 'bg-background text-primary shadow-sm' : 'text-text/50'">
            <font-awesome-icon icon="fa-solid fa-list" />
          </button>
        </div>
      </div>
    </template>
  </BaseFilterPanel>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-5px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in-down {
  animation: fadeInDown 0.2s ease-out;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
