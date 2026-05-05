<script setup>
import { computed } from 'vue'
import ProductRow from './ProductRow.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()

const props = defineProps({
  products: { type: Array, required: true, default: () => [] },
  loading: Boolean,
  pagination: Object,
  selectedIds: Set,
  sortBy: String,
  sortOrder: String,
})

const emit = defineEmits([
  'sort',
  'changePage',
  'update:limit',
  'toggleSelection',
  'toggleSelectAll',
  'edit',
  'restore',
  'delete',
  'view-image',
])

const limitOptions = [10, 20, 50, 100]

// Logic Pagination Visible Pages moved to BasePagination

const isAllSelected = computed(() => {
  const productsList = props.products || []
  return (
    productsList.length > 0 &&
    productsList.every((p) => props.selectedIds && props.selectedIds.has(p.id))
  )
})

// Handlers wrapper
const handleSort = (field) => emit('sort', field)
const changePage = (p) => {
  if (p !== '...' && p >= 1 && props.pagination && p <= props.pagination.totalPages)
    emit('changePage', p)
}

// Icon Helper untuk Header
function getSortIcon(field) {
  if (props.sortBy !== field) return 'fa-solid fa-sort'
  return props.sortOrder === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'
}
</script>

<template>
  <div
    class="flex-1 bg-background rounded-2xl shadow-sm border border-secondary/20 overflow-hidden flex flex-col relative h-full">
    <!-- Table Scroll Area -->
    <div class="flex-1 overflow-auto relative custom-scrollbar">
      <table class="w-full text-left border-collapse" :class="isMobile ? 'block' : 'min-w-[1000px]'">
        <!-- HEADER (Sticky) -->
        <thead class="bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5"
          :class="isMobile ? 'hidden' : 'sticky top-0 z-30'">
          <tr class="text-text/60 text-xs font-bold uppercase tracking-wider">
            <!-- CHECKBOX ALL (Sticky Left) -->
            <th
              class="px-4 py-3 w-12 text-center sticky left-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10">
              <div class="flex items-center justify-center">
                <input type="checkbox"
                  class="w-4 h-4 rounded border-secondary/30 text-primary focus:ring-primary bg-background cursor-pointer transition-all"
                  :checked="isAllSelected" @change="emit('toggleSelectAll')" />
              </div>
            </th>

            <!-- NAMA PRODUK (Sortable, Sticky Left) -->
            <th
              class="px-4 py-3 cursor-pointer hover:bg-secondary/5 transition-colors group select-none sticky left-12 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
              @click="handleSort('name')">
              <div class="flex items-center gap-2">
                Nama Produk
                <font-awesome-icon :icon="getSortIcon('name')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'name' }" />
              </div>
            </th>

            <!-- SKU (Sortable) -->
            <th
              class="px-4 py-3 cursor-pointer hover:bg-secondary/5 transition-colors group select-none border-b border-secondary/10"
              @click="handleSort('sku')">
              <div class="flex items-center gap-2">
                SKU
                <font-awesome-icon :icon="getSortIcon('sku')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'sku' }" />
              </div>
            </th>

            <!-- BERAT -->
            <th class="px-4 py-3 text-right border-b border-secondary/10">Berat</th>

            <!-- HARGA (Sortable) -->
            <th
              class="px-4 py-3 text-right cursor-pointer hover:bg-secondary/5 transition-colors group select-none border-b border-secondary/10"
              @click="handleSort('price')">
              <div class="flex items-center justify-end gap-2">
                Harga
                <font-awesome-icon :icon="getSortIcon('price')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'price' }" />
              </div>
            </th>

            <!-- STATUS -->
            <th class="px-4 py-3 text-center border-b border-secondary/10">Status</th>

            <!-- AKSI (Sticky Right) -->
            <th
              class="px-4 py-3 text-center w-32 sticky right-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">
              Aksi</th>
          </tr>
        </thead>

        <!-- BODY (Animated) -->
        <TransitionGroup tag="tbody" name="list" class="relative"
          :class="isMobile ? 'block' : 'divide-y divide-secondary/5'">
          <!-- Loading State -->
          <template v-if="loading">
            <TableSkeleton v-for="n in 5" :key="n" />
          </template>

          <!-- Empty State -->
          <tr v-else-if="!products || products.length === 0" key="empty">
            <td colspan="7" class="py-24 text-center">
              <div
                class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-secondary/20 rounded-2xl max-w-md mx-auto bg-secondary/5">
                <div
                  class="w-20 h-20 bg-background rounded-full flex items-center justify-center text-4xl text-primary/40 shadow-sm mb-4">
                  <font-awesome-icon icon="fa-solid fa-box-open" />
                </div>
                <h3 class="text-lg font-bold text-text mb-2">Tidak ada produk ditemukan</h3>
                <p class="text-sm text-text/60 max-w-xs mx-auto">
                  Coba sesuaikan kata kunci pencarian atau filter untuk menemukan produk yang Anda cari.
                </p>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-else>
            <ProductRow v-for="product in products" :key="product.id" :product="product"
              :is-selected="selectedIds && selectedIds.has(product.id)"
              @toggle-selection="(id) => emit('toggleSelection', id)" @edit="(p) => emit('edit', p)"
              @restore="(p) => emit('restore', p)" @delete="(p) => emit('delete', p)"
              @view-image="(p) => emit('view-image', p)" />
          </template>
        </TransitionGroup>
      </table>
    </div>

    <!-- PAGINATION FOOTER -->
    <div
      class="shrink-0 border-t border-secondary/10 bg-secondary/5 flex flex-col sm:flex-row items-center justify-between">
      <BasePagination :pagination="pagination" @changePage="changePage"
        @update:limit="(l) => emit('update:limit', l)" />
    </div>
  </div>
</template>

<style scoped>
/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
  /* This might break table layout during exit, but prevents layout jumps */
  /* For tables, fade out is safer than translate/absolute */
}
</style>
