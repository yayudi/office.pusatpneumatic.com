<!-- frontend/src/views/wms/StockRequests.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useToast } from '@/composables/useToast'
import {
  fetchStockRequests,
  approveStockRequest,
  rejectStockRequest,
  completeStockRequest
} from '@/api/helpers/stockRequest'
import StockRequestModal from '@/components/wms/StockRequestModal.vue'

const { toast } = useToast()

const requests = ref([])
const isLoading = ref(false)
const isModalOpen = ref(false)
const currentFilter = ref('ALL')

async function loadRequests() {
  isLoading.value = true
  try {
    const params = {}
    if (currentFilter.value !== 'ALL') {
      params.status = currentFilter.value
    }
    requests.value = await fetchStockRequests(params)
  } catch (error) {
    console.error(error)
    toast(error.message || 'Gagal memuat permintaan stok', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadRequests()
})

const filteredRequests = computed(() => requests.value)

async function handleApprove(id) {
  if (!confirm('Apakah Anda yakin menyetujui permintaan ini?')) return
  try {
    await approveStockRequest(id)
    toast('Permintaan disetujui', 'success')
    loadRequests()
  } catch (e) {
    toast(e.message || 'Gagal menyetujui', 'error')
  }
}

async function handleReject(id) {
  if (!confirm('Apakah Anda yakin menolak permintaan ini?')) return
  try {
    await rejectStockRequest(id)
    toast('Permintaan ditolak', 'success')
    loadRequests()
  } catch (e) {
    toast(e.message || 'Gagal menolak', 'error')
  }
}

async function handleComplete(id, items) {
  if (!confirm('Tandai telah diterima? Pastikan barang fisik sudah sesuai.')) return
  try {
    // Sebagai MVP: Terima full quantity.
    // Bisa dikembangkan dgn modal partial receive nantinya.
    const receivedItems = items.map(item => ({
      productId: item.product_id,
      receivedQuantity: item.quantity
    }))

    await completeStockRequest(id, receivedItems)
    toast('Barang diterima dan stok ditransfer', 'success')
    loadRequests()
  } catch (e) {
    toast(e.message || 'Gagal memproses penerimaan', 'error')
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'PENDING':
      return 'bg-warning/20 text-warning border-warning/30'
    case 'APPROVED':
      return 'bg-primary/20 text-primary border-primary/30'
    case 'REJECTED':
      return 'bg-danger/20 text-danger border-danger/30'
    case 'COMPLETED':
      return 'bg-success/20 text-success border-success/30'
    default:
      return 'bg-secondary/20 text-text border-secondary/30'
  }
}

// Fitur Expand Row
const expandedRows = ref([])
function toggleRow(id) {
  if (expandedRows.value.includes(id)) {
    expandedRows.value = expandedRows.value.filter(r => r !== id)
  } else {
    expandedRows.value.push(id)
  }
}
</script>

<template>
  <div class="animate-fade-in text-text">
    <!-- Filters -->
    <div class="bg-secondary/75 rounded-xl border border-secondary p-4 shadow-sm flex gap-2 overflow-x-auto">
      <button
        v-for="filter in ['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED']"
        :key="filter"
        @click="((currentFilter = filter), loadRequests())"
        class="px-4 py-1.5 rounded-full text-xs font-bold transition-all border border-secondary shadow-sm whitespace-nowrap"
        :class="
          currentFilter === filter
            ? 'bg-primary text-secondary border-primary shadow-sm'
            : 'bg-background text-text/60 hover:bg-primary/10 shadow-sm'
        "
      >
        {{ filter }}
      </button>

      <button
        @click="isModalOpen = true"
        class="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary hover:text-background flex items-center gap-2 transition-all shadow-sm ml-auto"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span>Buat Permintaan</span>
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-secondary/10 border-b border-secondary/20">
            <th class="p-3 text-xs font-bold text-text/60 uppercase">No. Request</th>
            <th class="p-3 text-xs font-bold text-text/60 uppercase">Tanggal</th>
            <th class="p-3 text-xs font-bold text-text/60 uppercase">Dari &gt; Tujuan</th>
            <th class="p-3 text-xs font-bold text-text/60 uppercase">Peminta</th>
            <th class="p-3 text-xs font-bold text-text/60 uppercase">Status</th>
            <th class="p-3 text-xs font-bold text-text/60 uppercase text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary/10">
          <tr v-if="isLoading">
            <td colspan="6" class="p-8 text-center text-text/50">
              <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-2xl mb-2" />
              <p>Memuat data...</p>
            </td>
          </tr>
          <tr v-else-if="filteredRequests.length === 0">
            <td colspan="6" class="p-8 text-center text-text/50 italic">Tidak ada permintaan stok.</td>
          </tr>
          <template v-for="req in filteredRequests" :key="req.id">
            <tr class="hover:bg-secondary/5 transition-colors group">
              <td class="p-3">
                <button
                  @click="toggleRow(req.id)"
                  class="text-primary font-bold hover:underline flex items-center gap-2"
                >
                  <font-awesome-icon
                    :icon="expandedRows.includes(req.id) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"
                    class="text-xs"
                  />
                  {{ req.request_number }}
                </button>
              </td>
              <td class="p-3 text-sm">{{ new Date(req.created_at).toLocaleDateString('id-ID') }}</td>
              <td class="p-3 text-sm">
                <div class="font-bold">
                  {{ req.from_location_code }}
                  <font-awesome-icon icon="fa-solid fa-arrow-right" class="text-text/40 text-xs mx-1" />
                  {{ req.to_location_code }}
                </div>
              </td>
              <td class="p-3 text-sm">{{ req.requester_name }}</td>
              <td class="p-3">
                <span
                  :class="['px-2.5 py-1 rounded-full text-[10px] font-bold border', getStatusBadgeClass(req.status)]"
                >
                  {{ req.status }}
                </span>
              </td>
              <td class="p-3 flex justify-center gap-2">
                <template v-if="req.status === 'PENDING'">
                  <button
                    @click="handleApprove(req.id)"
                    class="px-2 py-1 bg-primary text-secondary rounded text-xs font-bold hover:bg-primary/90"
                    title="Setujui"
                  >
                    <font-awesome-icon icon="fa-solid fa-check" />
                  </button>
                  <button
                    @click="handleReject(req.id)"
                    class="px-2 py-1 bg-danger text-secondary rounded text-xs font-bold hover:bg-danger/90"
                    title="Tolak"
                  >
                    <font-awesome-icon icon="fa-solid fa-xmark" />
                  </button>
                </template>
                <template v-if="req.status === 'APPROVED'">
                  <button
                    @click="handleComplete(req.id, req.items)"
                    class="px-3 py-1 bg-success text-secondary rounded text-xs font-bold hover:bg-success/90"
                    title="Terima Barang"
                  >
                    <font-awesome-icon icon="fa-solid fa-box-open" class="mr-1" /> Terima
                  </button>
                </template>
              </td>
            </tr>
            <!-- Expanded Items Row -->
            <tr v-if="expandedRows.includes(req.id)" class="bg-secondary/5 border-t-0">
              <td colspan="6" class="p-4">
                <div class="bg-background rounded-lg border border-secondary/20 p-4">
                  <p class="text-sm font-bold mb-2">Daftar Barang (Catatan: {{ req.notes || '-' }})</p>
                  <table class="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr class="border-b border-secondary/20 text-text/60">
                        <th class="py-1">SKU</th>
                        <th class="py-1">Nama Produk</th>
                        <th class="py-1 text-right">Diminta</th>
                        <th class="py-1 text-right">Diterima</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary/10">
                      <tr v-for="item in req.items" :key="item.id">
                        <td class="py-2 font-mono text-xs">{{ item.sku }}</td>
                        <td class="py-2">{{ item.product_name }}</td>
                        <td class="py-2 text-right font-bold">{{ item.quantity }}</td>
                        <td class="py-2 text-right text-text/60">{{ item.received_quantity }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Modal Form -->
  <StockRequestModal :is-open="isModalOpen" @close="isModalOpen = false" @request-created="loadRequests" />
</template>

<style scoped></style>
