<script setup>
import { computed } from 'vue'
import FilterContainer from '@/components/ui/FilterContainer.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const statusOptions = [
  { id: 'active', label: 'Produk Aktif' },
  { id: 'archived', label: 'Diarsipkan (Hapus)' },
  { id: 'all', label: 'Semua Status' },
]

const searchByOptions = [
  { id: 'name', label: 'Nama' },
  { id: 'sku', label: 'SKU' },
]

const props = defineProps({
  filterType: String,
  filterStatus: String,
  searchBy: String,
  searchQuery: String,
})

const emit = defineEmits([
  'update:filterType',
  'update:filterStatus',
  'update:searchBy',
  'update:searchQuery',
])

// Wrapper computed untuk v-model agar kode template lebih bersih
const typeModel = computed({
  get: () => props.filterType,
  set: (val) => emit('update:filterType', val),
})

const statusModel = computed({
  get: () => props.filterStatus,
  set: (val) => emit('update:filterStatus', val),
})

const searchByModel = computed({
  get: () => props.searchBy,
  set: (val) => emit('update:searchBy', val),
})

const queryModel = computed({
  get: () => props.searchQuery,
  set: (val) => emit('update:searchQuery', val),
})
</script>

<template>
  <FilterContainer title="Filter & Pencarian">
    <!-- Filter Tipe Produk -->
    <div class="flex bg-background rounded-xl p-1 border border-secondary/10 shrink-0 overflow-x-auto">
      <button @click="typeModel = 'all'"
        class="px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2" :class="typeModel === 'all'
            ? 'bg-secondary/10 text-text shadow-sm'
            : 'text-text/50 hover:text-text hover:bg-secondary/5'
          ">
        <font-awesome-icon icon="fa-solid fa-layer-group" />
        <span>Semua Tipe</span>
      </button>
      <button @click="typeModel = 'single'"
        class="px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2" :class="typeModel === 'single'
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-text/50 hover:text-primary hover:bg-primary/5'
          ">
        <font-awesome-icon icon="fa-solid fa-box" />
        <span>Satuan</span>
      </button>
      <button @click="typeModel = 'package'"
        class="px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2" :class="typeModel === 'package'
            ? 'bg-accent/10 text-accent shadow-sm'
            : 'text-text/50 hover:text-accent hover:bg-accent/5'
          ">
        <font-awesome-icon icon="fa-solid fa-boxes-stacked" />
        <span>Paket</span>
      </button>
    </div>

    <div class="h-px w-full lg:h-auto lg:w-px bg-secondary/10 mx-1 hidden lg:block"></div>

    <!-- Filter Status -->
    <div class="shrink-0 w-full sm:w-44">
      <BaseSelect
        :model-value="statusModel"
        @update:model-value="(v) => statusModel = typeof v === 'object' ? v.id : v"
        :options="statusOptions"
        label="label"
        track-by="id"
        placeholder="Status"
        :searchable="false"
        emit-value
      />
    </div>

    <div class="h-px w-full lg:h-auto lg:w-px bg-secondary/10 mx-1 hidden lg:block"></div>

    <!-- Search Group -->
    <div class="flex flex-col sm:flex-row flex-1 gap-2">
      <div class="shrink-0 w-full sm:w-28">
        <BaseSelect
          :model-value="searchByModel"
          @update:model-value="(v) => searchByModel = typeof v === 'object' ? v.id : v"
          :options="searchByOptions"
          label="label"
          track-by="id"
          placeholder="Cari"
          :searchable="false"
          emit-value
        />
      </div>

      <div class="relative flex-1">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-text/40">
          <font-awesome-icon icon="fa-solid fa-search" />
        </span>
        <input v-model="queryModel" type="text" :placeholder="`Cari ${searchBy === 'sku' ? 'SKU' : 'Nama'}...`"
          class="w-full pl-9 pr-4 py-2.5 bg-background border border-transparent rounded-xl focus:outline-none focus:border-primary text-text text-sm placeholder-text/30 transition-all shadow-sm" />
      </div>
    </div>
  </FilterContainer>
</template>
