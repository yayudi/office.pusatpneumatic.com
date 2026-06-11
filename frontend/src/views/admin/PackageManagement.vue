<script setup>
import { swalConfirm } from '@/composables/useSweetAlert'
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import axios from '@/api/axios.js'
import debounce from 'lodash/debounce'
import ProductFormModal from '@/components/wms/shared/ProductFormModal.vue'
import ConnectionStatus from '@/components/wms/shared/ConnectionStatus.vue'
import PackageTable from '@/components/products/PackageTable.vue'
import PackageBatchEditModal from '@/components/products/PackageBatchEditModal.vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import WmsActionHeader from '@/components/wms/shared/WmsActionHeader.vue'
import { useDownloadStore } from '@/stores/downloadStore.js'
import { useMobile } from '@/composables/useMobile.js'

const { toast } = useToast()
const { isMobile } = useMobile()

// --- STATE ---
const products = ref([])
const loading = ref(false)
const searchQuery = ref('')
const searchBy = ref('name')
const filterStatus = ref('active')
const sortBy = ref('name')
const sortOrder = ref('asc')

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'archived', label: 'Diarsipkan' }
]

// Modal State
const showBatchEditModal = ref(false)
const showProductForm = ref(false)
const productFormMode = ref('create')
const selectedProduct = ref({})

// Bulk Action State
const selectedIds = ref(new Set())
const isProcessingBulk = ref(false)

// Pagination State
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
})

const selectionCount = computed(() => selectedIds.value.size)
const downloadStore = useDownloadStore()

// Export State
const isExporting = ref(false)

// --- API ACTIONS ---

const fetchProducts = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      search: searchQuery.value,
      searchBy: searchBy.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      is_package: true, // HARDCODED: Hanya Paket
      packageOnly: true, // Explicit flag for backend if needed
      status: filterStatus.value
    }
    const response = await axios.get('/products', { params })
    const resData = response.data
    const items = resData.data || resData.products || []

    if (Array.isArray(items)) {
      products.value = items
      pagination.total = resData.meta?.total || resData.total || 0
      pagination.totalPages = resData.meta?.last_page || Math.ceil(pagination.total / pagination.limit) || 1
    } else {
      products.value = []
      pagination.total = 0
      pagination.totalPages = 1
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

// --- HANDLERS ---

// Pagination & Sorting
const handleChangePage = async page => {
  pagination.page = page
  fetchProducts()
}
const handleUpdateLimit = limit => {
  pagination.limit = limit
  pagination.page = 1
  fetchProducts()
}
const handleSort = field => {
  if (sortBy.value === field) sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  fetchProducts()
}

// Search & Filter (Debounce)
const handleFilterChange = debounce(() => {
  pagination.page = 1
  selectedIds.value.clear()
  fetchProducts()
}, 300)

watch([searchQuery, searchBy, filterStatus], handleFilterChange)

// Selection
const toggleSelection = id => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}

const toggleSelectAll = () => {
  const allSelected = products.value.length > 0 && products.value.every(p => selectedIds.value.has(p.id))
  if (allSelected) products.value.forEach(p => selectedIds.value.delete(p.id))
  else products.value.forEach(p => selectedIds.value.add(p.id))
}

// CRUD
const handleDelete = async product => {
  if (!await swalConfirm(`Arsipkan paket "${product.name}"?`)) return
  try {
    await axios.delete(`/products/${product.id}`)
    toast('Paket berhasil diarsipkan.', 'success')
    if (selectedIds.value.has(product.id)) selectedIds.value.delete(product.id)
    fetchProducts()
  } catch (err) {
    console.error(err)
  }
}

const handleRestore = async product => {
  if (!await swalConfirm(`Pulihkan paket "${product.name}"?`)) return
  try {
    await axios.put(`/products/${product.id}`, { is_active: true })
    toast('Paket dipulihkan.', 'success')
    if (selectedIds.value.has(product.id)) selectedIds.value.delete(product.id)
    fetchProducts()
  } catch (err) {
    console.error(err)
  }
}

// Modals
const openAddModal = async () => {
  productFormMode.value = 'create'
  selectedProduct.value = {}
  showProductForm.value = true
}
const openEditModal = p => {
  productFormMode.value = 'edit'
  selectedProduct.value = p
  showProductForm.value = true
}

// Bulk Actions
const performBulkAction = async actionType => {
  if (!selectedIds.value.size) return

  const msg = actionType === 'archive' ? 'Arsipkan' : 'Pulihkan'
  if (!await swalConfirm(`${msg} ${selectionCount.value} paket terpilih?`)) return

  isProcessingBulk.value = true
  const ids = [...selectedIds.value]
  const promises = []

  try {
    ids.forEach(id => {
      if (actionType === 'archive') promises.push(axios.delete(`/products/${id}`))
      else promises.push(axios.put(`/products/${id}`, { is_active: true, is_package: true }))
    })
    await Promise.all(promises)
    toast(`Berhasil memproses ${ids.length} paket.`, 'success')
    selectedIds.value.clear()
    fetchProducts()
  } catch {
  } finally {
    isProcessingBulk.value = false
  }
}

// Exports / Imports (Package Phase 2)
const handleExport = async ({ format }) => {
  isExporting.value = true
  try {
    const params = {
      search: searchQuery.value,
      searchBy: searchBy.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      status: filterStatus.value,
      format: format // 'xlsx' or 'csv'
    }

    // Request Job Creation
    const response = await axios.get('/packages/export', { params })

    if (response.data.success) {
      toast('Permintaan export paket diterima.', 'success')
      downloadStore.startPolling()
    }
  } catch (err) {
    console.error(err)
  } finally {
    isExporting.value = false
  }
}

const handleImport = async formData => {
  // Use new endpoint for packages
  try {
    await axios.post('/packages/batch/update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    toast('File paket diunggah. Cek menu Logs/Laporan untuk status.', 'info')
    showBatchEditModal.value = false
    fetchProducts()
  } catch (err) {
    console.error(err)
  }
}
const handleProductSaved = () => {
  fetchProducts()
}

// Init
onMounted(() => {
  fetchProducts()
})

// --- LOCAL HOTKEYS ---
const { Alt_N, Alt_A, Alt_R, Slash } = useMagicKeys()

watch(Alt_N, pressed => {
  if (pressed && !showProductForm.value && !showBatchEditModal.value) {
    openAddModal()
  }
})

watch(Alt_A, pressed => {
  if (pressed && !showProductForm.value && !showBatchEditModal.value) {
    toggleSelectAll()
  }
})

watch(Alt_R, pressed => {
  if (pressed && !showProductForm.value && !showBatchEditModal.value) {
    fetchProducts()
  }
})

watch(Slash, pressed => {
  if (pressed && !showProductForm.value && !showBatchEditModal.value) {
    setTimeout(() => {
      const el = document.getElementById('global-search-input')
      if (el) el.focus()
    }, 10)
  }
})
</script>

<template>
  <div class="bg-background min-h-screen px-6 text-text flex flex-col h-screen overflow-hidden">
    <div class="w-full max-w-7xl mx-auto flex flex-col h-full relative">
      <!-- HEADER -->
      <div class="shrink-0">
        <WmsActionHeader title="Manajemen Paket" icon="fa-solid fa-boxes-stacked">
          <template #actions>
            <div class="flex flex-wrap gap-3">
              <!-- Tombol Batch Edit -->
              <button
                @click="showBatchEditModal = true"
                class="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-text rounded-xl shadow-md font-medium flex items-center gap-2 transition-all border border-secondary/30"
                title="Edit paket secara massal (Export & Import)"
              >
                <font-awesome-icon icon="fa-solid fa-pen-to-square" />
                <span class="hidden sm:inline">Batch Edit</span>
              </button>

              <!-- Tombol Tambah Paket -->
              <button
                @click="openAddModal"
                class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-secondary rounded-xl shadow-lg font-bold flex items-center gap-2 transition-transform hover:-translate-y-0.5"
              >
                <font-awesome-icon icon="fa-solid fa-plus" />
                <span>Buat Paket</span>
              </button>
            </div>
          </template>
        </WmsActionHeader>

        <!-- FILTER BAR SIMPLIFIED -->
        <BaseFilterPanel class="mb-4">
          <template #search>
            <div class="relative flex-1 w-full">
              <input
                id="global-search-input"
                v-model="searchQuery"
                type="text"
                placeholder="Cari nama paket atau SKU..."
                class="w-full h-[40px] pl-10 pr-4 py-2 bg-background border border-secondary rounded-lg focus:outline-none focus:border-primary text-sm shadow-sm"
                :class="isMobile ? 'mb-4 mr-4' : 'm-0'"
              />
              <font-awesome-icon icon="fa-solid fa-search" class="absolute left-3 top-2.5 text-text/40" />
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <label class="text-xs font-bold text-text/60 whitespace-nowrap">Status:</label>
              <BaseSelect
                v-model="filterStatus"
                :options="statusOptions"
                track-by="value"
                emit-value
                clearable
                clearValue="all"
                :searchable="false"
                class="w-full sm:w-[150px]"
              />
            </div>
          </template>
        </BaseFilterPanel>
      </div>

      <!-- TABLE COMPONENT -->
      <PackageTable
        :products="products"
        :loading="loading"
        :pagination="pagination"
        :selectedIds="selectedIds"
        :sortBy="sortBy"
        :sortOrder="sortOrder"
        @sort="handleSort"
        @changePage="handleChangePage"
        @update:limit="handleUpdateLimit"
        @toggleSelection="toggleSelection"
        @toggleSelectAll="toggleSelectAll"
        @edit="openEditModal"
        @restore="handleRestore"
        @delete="handleDelete"
      />

      <!-- FLOATING ACTION BAR -->
      <Transition name="slide-up">
        <div
          v-if="selectedIds.size > 0"
          class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-secondary/20 shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-6 z-40 text-sm"
        >
          <div class="flex items-center gap-2 text-text font-bold border-r border-secondary/10 pr-6">
            <span class="bg-primary/10 text-primary w-6 h-6 flex items-center justify-center rounded-full text-xs">{{
              selectionCount
            }}</span>
            <span>Dipilih</span>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="filterStatus === 'archived'"
              @click="performBulkAction('restore')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-success/10 text-success font-bold"
              :disabled="isProcessingBulk"
            >
              <font-awesome-icon icon="fa-solid fa-rotate-left" :spin="isProcessingBulk" />
              Pulihkan
            </button>
            <button
              v-else
              @click="performBulkAction('archive')"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-danger/10 text-danger font-bold"
              :disabled="isProcessingBulk"
            >
              <font-awesome-icon icon="fa-solid fa-box-archive" :spin="isProcessingBulk" />
              Arsipkan
            </button>
          </div>
          <button
            @click="selectedIds.clear()"
            class="ml-2 text-text/40 hover:text-text text-xl leading-none"
            title="Batalkan Pilihan"
          >
            &times;
          </button>
        </div>
      </Transition>

      <!-- MODALS -->
      <ProductFormModal
        :show="showProductForm"
        :mode="productFormMode"
        :product-data="selectedProduct"
        @close="showProductForm = false"
        @refresh="handleProductSaved"
      />
      <!-- Phase 2 Batch Edit Modal -->
      <PackageBatchEditModal
        :is-open="showBatchEditModal"
        :is-exporting="isExporting"
        :is-importing="false"
        @close="showBatchEditModal = false"
        @export="handleExport"
        @import="handleImport"
      />
    </div>
    <ConnectionStatus />
  </div>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
