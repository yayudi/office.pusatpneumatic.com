<!-- frontend\src\views\WMSBatchMovement.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { fetchMyLocations } from '@/api/helpers/user.js'
import { useMasterDataStore } from '@/stores/masterData'

const masterData = useMasterDataStore()
import { processBatchMovement } from '@/api/helpers/stock.js'

// Impor komponen anak
import BatchMovementHeader from '@/components/wms/transfer/BatchMovementHeader.vue'
import ProductSearchAddForm from '@/components/wms/transfer/ProductSearchAddForm.vue'
import BatchItemList from '@/components/wms/transfer/BatchItemList.vue'
import MultiLocationTransferTab from '@/components/wms/transfer/MultiLocationTransferTab.vue'
import BatchInboundModal from '@/components/stock/BatchInboundModal.vue'
import { defineAsyncComponent } from 'vue'

const StickerGeneratorModal = defineAsyncComponent(() => import('@/components/utilities/StickerGeneratorModal.vue'))

const { toast } = useToast()

// --- STATE UTAMA ---
const myLocations = ref([])
const allLocations = ref([])
const isLoading = ref(false)
const activeTab = ref('TRANSFER') // Tab default
const batchList = ref([])
const isBatchInboundModalOpen = ref(false)
const isStickerModalOpen = ref(false)

// --- STATE FORM BATCH (untuk header) ---
const fromLocation = ref(null)
const toLocation = ref(null)
const notes = ref('')

// Ambil data lokasi
onMounted(async () => {
  isLoading.value = true
  try {
    const [myLocs, allLocs] = await Promise.all([fetchMyLocations(), masterData.getLocations(true)])
    myLocations.value = myLocs
    allLocations.value = allLocs
  } catch (e) { console.error(e) } finally {
    isLoading.value = false
  }
})

// --- Computed & Handler ---
const isBatchLocationSelected = computed(() => {
  switch (activeTab.value) {
    case 'TRANSFER':
      return fromLocation.value && toLocation.value
    case 'INBOUND':
    case 'RETURN':
      return toLocation.value
    default:
      return false
  }
})

const batchSearchLocationId = computed(() => {
  if (activeTab.value === 'TRANSFER') return fromLocation.value?.id
  return null
})

function handleAddProduct({ product, quantity }) {
  if (!product || !quantity) {
    toast('Pilih produk dan masukkan kuantitas yang valid.', 'warning')
    return
  }

  const existing = batchList.value.find(item => item.sku === product.sku)
  if (existing) {
    existing.quantity += quantity
  } else {
    batchList.value.push({
      sku: product.sku,
      name: product.name,
      current_stock: product.current_stock,
      price: product.price,
      quantity: quantity
    })
  }
}

async function copyFromSku() {
  const text = batchList.value
    .map(item => `${item.sku}\t${item.name}\t${fromLocation.value.code}\t${toLocation.value.code}\t${item.quantity}`)
    .join('\n')

  try {
    await navigator.clipboard.writeText(text)
    toast('Daftar transfer berhasil disalin ke clipboard.', 'success')
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

function removeFromBatch(sku) {
  batchList.value = batchList.value.filter(item => item.sku !== sku)
}

async function submitBatch() {
  if (!isBatchLocationSelected.value || batchList.value.length === 0) {
    return
  }

  isLoading.value = true
  try {
    const payload = {
      type: activeTab.value,
      fromLocationId: fromLocation.value?.id || null,
      toLocationId: toLocation.value?.id || null,
      notes: notes.value,
      movements: batchList.value.map(({ sku, quantity }) => ({ sku, quantity }))
    }

    const response = await processBatchMovement(payload)

    if (response.success) {
      toast(response.message, 'success')
      // Reset form
      batchList.value = []
      fromLocation.value = null
      toLocation.value = null
      notes.value = ''
    }
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="animate-fade-in text-text">
    <Teleport to="#header-actions">
      <button
        v-if="activeTab === 'INBOUND'"
        @click="isBatchInboundModalOpen = true"
        class="bg-success/20 text-success border border-success/30 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-success hover:text-background flex items-center gap-2 transition-all"
      >
        <font-awesome-icon icon="fa-solid fa-file-import" />
        <span>Import Massal</span>
      </button>
    </Teleport>

    <!-- Komponen Header (Tabs + Form Lokasi Batch) -->
    <BatchMovementHeader
      v-model:activeTab="activeTab"
      v-model:fromLocation="fromLocation"
      v-model:toLocation="toLocation"
      v-model:notes="notes"
      :my-locations="myLocations"
      :all-locations="allLocations"
      :is-loading="isLoading"
      :allow-adjustment="false"
    />

    <!-- Panel Konten -->
    <MultiLocationTransferTab
      v-if="activeTab === 'DETAILED_TRANSFER'"
      :all-locations="allLocations"
      :is-loading-locations="isLoading"
    />

    <!-- Panel untuk semua mode 'BATCH' ('TRANSFER', 'INBOUND') -->
    <template v-else>
      <!-- Form Penambahan Item Batch -->
      <ProductSearchAddForm
        :active-tab="activeTab"
        :search-location-id="batchSearchLocationId"
        :disabled="!isBatchLocationSelected || isLoading"
        @add-product="handleAddProduct"
      />

      <!-- Tabel Daftar Batch -->
      <BatchItemList :items="batchList" :active-tab="activeTab" @remove-item="removeFromBatch" />

      <!-- Tombol Aksi Final Batch -->
      <div class="flex justify-end pt-6 border-t border-secondary/20 gap-2">
        <button
          v-if="activeTab === 'INBOUND'"
          @click="isStickerModalOpen = true"
          :disabled="batchList.length === 0"
          class="px-6 py-3 bg-secondary text-text rounded-lg font-bold disabled:opacity-50 border border-primary/20 hover:border-primary flex items-center gap-2"
        >
          <font-awesome-icon icon="fa-solid fa-print" />
          <span>Cetak Label Barang Masuk</span>
        </button>
        <button
          @click="copyFromSku()"
          :disabled="isLoading || batchList.length === 0"
          class="px-6 py-3 bg-accent text-secondary rounded-lg font-bold disabled:opacity-50"
        >
          <font-awesome-icon icon="fa-solid fa-copy" />
          <span>Salin Daftar</span>
        </button>
        <button
          @click="submitBatch"
          :disabled="!isBatchLocationSelected || batchList.length === 0 || isLoading"
          class="px-6 py-3 bg-primary text-secondary rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
        >
          <font-awesome-icon v-if="isLoading" icon="fa-solid fa-spinner" class="animate-spin" />
          <span>{{ isLoading ? 'Memproses...' : 'Submit Batch' }}</span>
        </button>
      </div>
    </template>
  </div>

  <BatchInboundModal
    :isOpen="isBatchInboundModalOpen"
    @close="isBatchInboundModalOpen = false"
    @success="() => toast('Batch Inbound diproses!', 'success')"
  />

  <StickerGeneratorModal :show="isStickerModalOpen" @close="isStickerModalOpen = false" :initial-batch="batchList" />
</template>
