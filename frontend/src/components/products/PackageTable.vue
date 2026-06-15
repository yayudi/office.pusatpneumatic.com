<script setup>
import { computed, ref } from 'vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import { formatCurrency } from '@/utils/formatters.js'
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
])

// --- COLLAPSIBLE ROW STATE ---
const expandedRows = ref(new Set())

const toggleExpand = (id) => {
  if (expandedRows.value.has(id)) {
    expandedRows.value.delete(id)
  } else {
    expandedRows.value.add(id)
  }
}

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
    class="flex-1 bg-background rounded-2xl shadow-sm border border-secondary/20 overflow-hidden flex flex-col relative h-full"
  >
    <!-- Table Scroll Area -->
    <div class="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar">
      <table
        class="w-full text-left border-collapse"
        :class="isMobile ? 'block' : 'min-w-[1000px]'"
      >
        <!-- HEADER (Sticky) -->
        <thead
          class="bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5"
          :class="isMobile ? 'hidden' : 'sticky top-0 z-30'"
        >
          <tr class="text-text/60 text-xs font-bold uppercase tracking-wider">
            <!-- CHECKBOX ALL (Sticky Left) -->
            <th
              class="px-4 py-3 w-12 text-center sticky left-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10"
            >
              <div class="flex items-center justify-center">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-secondary/30 text-primary focus:ring-primary bg-background cursor-pointer transition-all"
                  :checked="isAllSelected"
                  @change="emit('toggleSelectAll')"
                />
              </div>
            </th>

            <!-- NAMA PAKET (Sortable, Sticky Left) -->
            <th
              class="px-4 py-3 cursor-pointer hover:bg-secondary/5 transition-colors group select-none sticky left-12 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
              @click="handleSort('name')"
            >
              <div class="flex items-center gap-2">
                Nama Paket
                <font-awesome-icon
                  :icon="getSortIcon('name')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'name' }"
                />
              </div>
            </th>

            <!-- SKU (Sortable) -->
            <th
              class="px-4 py-3 cursor-pointer hover:bg-secondary/10 transition-colors group select-none"
              @click="handleSort('sku')"
            >
              <div class="flex items-center gap-2">
                SKU Paket
                <font-awesome-icon
                  :icon="getSortIcon('sku')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'sku' }"
                />
              </div>
            </th>

            <!-- KOMPONEN (New Column) -->
            <th class="px-4 py-3 w-1/3">Komponen</th>

            <!-- HARGA (Sortable) -->
            <th
              class="px-4 py-3 text-right cursor-pointer hover:bg-secondary/10 transition-colors group select-none"
              @click="handleSort('price')"
            >
              <div class="flex items-center justify-end gap-2">
                Harga
                <font-awesome-icon
                  :icon="getSortIcon('price')"
                  class="text-text/30 group-hover:text-primary transition-colors"
                  :class="{ 'text-primary': sortBy === 'price' }"
                />
              </div>
            </th>

            <th class="px-4 py-3 text-center">Status</th>
            <th
              class="px-4 py-3 text-center w-32 sticky right-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"
            >
              Aksi
            </th>
          </tr>
        </thead>

        <!-- BODY (Animated) -->
        <TransitionGroup
          tag="tbody"
          name="list"
          class="relative"
          :class="isMobile ? 'block' : 'divide-y divide-secondary/5'"
        >
          <!-- Loading State -->
          <template v-if="loading">
            <tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-secondary/20 animate-pulse">
              <td v-for="i in 7" :key="i" class="px-6 py-4">
                <BaseSkeleton :shape="i === 7 ? 'rect' : 'text'" :className="i === 1 ? 'w-8 h-4 mx-auto' : i === 7 ? 'w-16 h-6 mx-auto rounded-md' : 'w-full h-4'" />
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="!products || products.length === 0" key="empty">
            <td colspan="7" class="py-32 text-center">
              <div class="flex flex-col items-center gap-4">
                <div
                  class="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center text-3xl text-text/30"
                >
                  <font-awesome-icon icon="fa-solid fa-box-open" />
                </div>
                <div>
                  <h3 class="text-lg font-bold mb-1">Tidak ada paket ditemukan</h3>
                  <p class="text-sm text-text/50">
                    Coba ubah kata kunci pencarian atau filter Anda.
                  </p>
                </div>
              </div>
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-else>
            <template v-for="product in products" :key="product.id">
              <!-- Main Row -->
              <tr
                class="transition-colors group relative"
                :class="[
                  isMobile
                    ? 'block mb-4 p-4 bg-background/50 rounded-xl border border-secondary/20 shadow-sm mx-4 mt-4'
                    : 'hover:bg-secondary/5 border-b border-secondary/10 last:border-0',
                  { 'bg-secondary/5': expandedRows.has(product.id) },
                ]"
              >
                <!-- Checkbox (Sticky Left) -->
                <td
                  class="bg-background group-hover:bg-secondary/5 transition-colors"
                  :class="
                    isMobile
                      ? 'absolute top-4 right-4 z-10 border-0'
                      : 'px-4 py-3 text-center sticky left-0 z-20 border-b border-secondary/10'
                  "
                >
                  <input
                    type="checkbox"
                    class="w-4 h-4 rounded border-secondary/30 text-primary focus:ring-primary bg-background cursor-pointer"
                    :checked="selectedIds && selectedIds.has(product.id)"
                    @change="emit('toggleSelection', product.id)"
                  />
                </td>

                <!-- Name (Sticky Left) -->
                <td
                  class="bg-background group-hover:bg-secondary/5 transition-colors"
                  :class="
                    isMobile
                      ? 'block pb-4 mb-2 border-b border-secondary/10'
                      : 'px-4 py-3 sticky left-12 z-20 border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]'
                  "
                >
                  <div class="font-bold text-text" :class="isMobile ? 'text-base' : 'text-sm'">
                    {{ product.name }}
                  </div>
                </td>

                <!-- SKU -->
                <td
                  :class="
                    isMobile
                      ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                      : 'px-4 py-3'
                  "
                >
                  <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold"
                    >SKU</span
                  >
                  <span class="font-mono text-xs text-text/70 bg-secondary/10 px-2 py-1 rounded">{{
                    product.sku
                  }}</span>
                </td>

                <!-- Components Summary (Toggle) -->
                <td
                  :class="
                    isMobile
                      ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                      : 'px-4 py-3'
                  "
                >
                  <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold"
                    >Komponen</span
                  >
                  <button
                    @click="toggleExpand(product.id)"
                    class="flex items-center justify-end gap-2 text-xs font-medium px-2 py-1.5 rounded transition-colors hover:bg-secondary/10 md:w-auto"
                    :class="
                      product.components?.length
                        ? 'text-primary'
                        : 'text-text/40 italic cursor-default'
                    "
                    :disabled="!product.components?.length"
                  >
                    <font-awesome-icon
                      v-if="product.components?.length"
                      :icon="
                        expandedRows.has(product.id)
                          ? 'fa-solid fa-chevron-down'
                          : 'fa-solid fa-chevron-right'
                      "
                      class="text-[10px]"
                    />
                    <span v-if="product.components?.length">
                      {{ product.components.length }} Komponen
                    </span>
                    <span v-else>Tanpa Komponen</span>
                  </button>
                </td>

                <!-- Price -->
                <td
                  class="font-mono text-sm"
                  :class="
                    isMobile
                      ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                      : 'px-4 py-3 text-right'
                  "
                >
                  <span
                    v-if="isMobile"
                    class="text-text/60 text-xs uppercase font-semibold font-sans"
                    >Harga</span
                  >
                  <span>{{ formatCurrency(product.price) }}</span>
                </td>

                <!-- Status -->
                <td
                  :class="
                    isMobile
                      ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                      : 'px-4 py-3 text-center'
                  "
                >
                  <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold"
                    >Status</span
                  >
                  <span
                    class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
                    :class="
                      product.is_active
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-secondary/20 text-text/50 border-secondary/30'
                    "
                  >
                    {{ product.is_active ? 'Aktif' : 'Arsip' }}
                  </span>
                </td>

                <!-- Actions (Sticky Right) -->
                <td
                  class="bg-background group-hover:bg-secondary/5 transition-colors"
                  :class="
                    isMobile
                      ? 'flex justify-end items-center pt-4'
                      : 'px-4 py-3 text-center sticky right-0 z-20 border-b border-secondary/10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]'
                  "
                >
                  <div
                    class="flex items-center justify-center gap-2 transition-opacity"
                    :class="isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
                  >
                    <button
                      @click="emit('edit', product)"
                      class="flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary transition-colors"
                      :class="
                        isMobile
                          ? 'px-3 py-1.5 bg-primary/10 font-semibold text-xs gap-2'
                          : 'w-8 h-8'
                      "
                      title="Edit Paket"
                    >
                      <font-awesome-icon icon="fa-solid fa-pen-to-square" />
                      <span v-if="isMobile">Edit</span>
                    </button>
                    <button
                      v-if="product.is_active"
                      @click="emit('delete', product)"
                      class="flex items-center justify-center rounded-lg hover:bg-danger/10 text-danger transition-colors"
                      :class="
                        isMobile
                          ? 'px-3 py-1.5 bg-danger/10 font-semibold text-xs gap-2'
                          : 'w-8 h-8'
                      "
                      title="Arsipkan"
                    >
                      <font-awesome-icon icon="fa-solid fa-box-archive" />
                      <span v-if="isMobile">Arsip</span>
                    </button>
                    <button
                      v-else
                      @click="emit('restore', product)"
                      class="flex items-center justify-center rounded-lg hover:bg-success/10 text-success transition-colors"
                      :class="
                        isMobile
                          ? 'px-3 py-1.5 bg-success/10 font-semibold text-xs gap-2'
                          : 'w-8 h-8'
                      "
                      title="Pulihkan"
                    >
                      <font-awesome-icon icon="fa-solid fa-rotate-left" />
                      <span v-if="isMobile">Pulihkan</span>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Detail Row (Expanded) -->
              <tr
                v-if="expandedRows.has(product.id)"
                class="bg-secondary/5 border-b border-secondary/10"
                :class="isMobile ? 'block mx-4 mb-4 rounded-xl overflow-hidden' : ''"
              >
                <td colspan="7" class="p-0">
                  <div
                    class="py-4 flex flex-col md:flex-row gap-6"
                    :class="isMobile ? 'px-4' : 'px-12'"
                  >
                    <!-- Component List -->
                    <div class="flex-1 max-w-2xl">
                      <p
                        class="text-xs font-bold text-text/50 uppercase mb-3 flex items-center gap-2"
                      >
                        <font-awesome-icon icon="fa-solid fa-layer-group" />
                        Rincian Komponen
                      </p>
                      <div
                        class="bg-background border border-secondary/20 rounded-lg overflow-hidden shadow-sm"
                      >
                        <table class="w-full text-sm text-left">
                          <thead class="bg-secondary/10 text-xs font-semibold text-text/70">
                            <tr>
                              <th class="px-4 py-2">SKU</th>
                              <th class="px-4 py-2">Nama Barang</th>
                              <th class="px-4 py-2 text-center">Qty / Paket</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-secondary/10">
                            <tr
                              v-for="comp in product.components"
                              :key="comp.id"
                              class="hover:bg-secondary/5"
                            >
                              <td class="px-4 py-2 font-mono text-xs">{{ comp.sku }}</td>
                              <td class="px-4 py-2">{{ comp.name }}</td>
                              <td
                                class="px-4 py-2 text-center font-mono font-medium bg-primary/5 text-primary"
                              >
                                {{ comp.quantity }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <!-- Extra Info / Actions -->
                    <div
                      class="w-64 shrink-0 flex flex-col gap-3 border-l border-secondary/10 pl-6 border-dashed"
                    >
                      <div>
                        <span class="text-xs text-text/50 block mb-1">Berat Total (Est.)</span>
                        <div class="font-mono text-sm font-medium">{{ product.weight }} kg</div>
                      </div>
                      <div>
                        <span class="text-xs text-text/50 block mb-1">Update Terakhir</span>
                        <div class="text-xs text-text/80">
                          <!-- Fallback if updated_at is missing -->
                          {{ new Date().toLocaleDateString('id-ID') }}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </template>
        </TransitionGroup>
      </table>
    </div>

    <!-- PAGINATION FOOTER -->
    <div
      class="shrink-0 border-t border-secondary/10 bg-secondary/5 flex flex-col sm:flex-row items-center justify-between"
    >
      <BasePagination
        :pagination="pagination"
        @changePage="changePage"
        @update:limit="(l) => emit('update:limit', l)"
      />
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
  transition: all 0.3s ease;
}
</style>
