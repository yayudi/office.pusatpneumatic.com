<!-- frontend/src/views/wms/StockRequests.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
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

async function loadRequests(silent = false) {
  if (!silent) isLoading.value = true
  try {
    const params = {}
    if (currentFilter.value !== 'ALL') {
      params.status = currentFilter.value
    }
    requests.value = await fetchStockRequests(params)
  } catch (error) {
    console.error(error)
    if (!silent) toast(error.message || 'Gagal memuat permintaan stok', 'error')
  } finally {
    if (!silent) isLoading.value = false
  }
}

let pollingInterval = null

onUnmounted(() => {
  if (pollingInterval) clearInterval(pollingInterval)
})

onMounted(() => {
  loadRequests()
  // Auto-polling default setiap 30 detik
  pollingInterval = setInterval(() => {
    loadRequests(true)
  }, 30000)
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
    const safeItems = Array.isArray(items) ? items : []
    const receivedItems = safeItems.map(item => ({
      productId: item.product_id,
      receivedQuantity: item.input_received !== undefined ? Number(item.input_received) : item.quantity
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
function toggleRow(id, forceOpen = false) {
  if (forceOpen) {
    if (!expandedRows.value.includes(id)) expandedRows.value.push(id)
    return
  }
  if (expandedRows.value.includes(id)) {
    expandedRows.value = expandedRows.value.filter(r => r !== id)
  } else {
    expandedRows.value.push(id)
  }
}

function openReceiveForm(req) {
  req.items.forEach(item => {
    if (item.input_received === undefined) {
      item.input_received = item.quantity
    }
  })
  toggleRow(req.id, true)
}

function printRequest(req) {
  const printWindow = window.open('', '_blank')

  const dateStr = new Date(req.created_at).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const itemsHtml = req.items
    .map(
      (item, index) => `
    <tr>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: center;">${index + 1}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.sku}</td>
      <td style="border: 1px solid #ccc; padding: 8px;">${item.product_name}</td>
      <td style="border: 1px solid #ccc; padding: 8px; text-align: right;">${item.quantity}</td>
    </tr>
  `
    )
    .join('')

  const html = `
    <html>
      <head>
        <title>Dokumen Permintaan Stok - ${req.request_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .info-table { width: 100%; margin-bottom: 20px; }
          .info-table td { padding: 4px; vertical-align: top; }
          .info-table .label { font-weight: bold; width: 150px; }
          .item-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .item-table th { border: 1px solid #ccc; padding: 10px; background-color: #f5f5f5; text-align: left; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-bottom: 1px solid #333; margin-top: 60px; margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">DOKUMEN PERMINTAAN STOK</h1>
          <p class="subtitle">Nomor Dokumen: ${req.request_number}</p>
        </div>

        <table class="info-table">
          <tr>
            <td class="label">Tanggal</td>
            <td>: ${dateStr}</td>
            <td class="label">Status</td>
            <td>: <strong>${req.status}</strong></td>
          </tr>
          <tr>
            <td class="label">Dari Lokasi (Asal)</td>
            <td>: ${req.from_location_code} - ${req.from_location_name}</td>
            <td class="label">Peminta</td>
            <td>: ${req.requester_name}</td>
          </tr>
          <tr>
            <td class="label">Ke Lokasi (Tujuan)</td>
            <td>: ${req.to_location_code} - ${req.to_location_name}</td>
            <td class="label">Catatan</td>
            <td>: ${req.notes || '-'}</td>
          </tr>
        </table>

        <table class="item-table">
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">No</th>
              <th style="width: 150px;">SKU</th>
              <th>Nama Barang</th>
              <th style="width: 100px; text-align: right;">Kuantitas</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="signature-section">
          <div class="signature-box">
            <p>Dibuat Oleh,</p>
            <div class="signature-line"></div>
            <p>(${req.requester_name})</p>
          </div>
          <div class="signature-box">
            <p>Disetujui Oleh,</p>
            <div class="signature-line"></div>
            <p>(...................................)</p>
          </div>
          <div class="signature-box">
            <p>Penerima Barang,</p>
            <div class="signature-line"></div>
            <p>(...................................)</p>
          </div>
        </div>
      </body>
    </html>
  `
  printWindow.document.write(html)
  printWindow.document.close()

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 250)
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

      <div class="flex-1 min-w-[1rem]"></div>

      <button
        @click="loadRequests()"
        :class="isLoading ? 'animate-spin' : ''"
        class="px-3 py-2 bg-background text-text/60 border border-secondary hover:bg-secondary/20 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all shadow-sm"
        title="Muat Ulang / Paksa Polling"
      >
        <font-awesome-icon :icon="isLoading ? 'fa-solid fa-spinner' : 'fa-solid fa-refresh'" />
      </button>

      <button
        @click="isModalOpen = true"
        class="bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary hover:text-background flex items-center gap-2 transition-all shadow-sm"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span class="hidden sm:inline">Buat Permintaan</span>
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
                    @click="openReceiveForm(req)"
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
                  <div class="flex justify-between items-center mb-2">
                    <p class="text-sm font-bold">
                      Daftar Barang <span class="text-text/60 font-normal">(Catatan: {{ req.notes || '-' }})</span>
                    </p>
                    <button
                      @click="printRequest(req)"
                      class="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-background rounded-md text-xs font-bold flex items-center gap-2 transition-colors"
                      title="Cetak Dokumen"
                    >
                      <font-awesome-icon icon="fa-solid fa-print" /> Cetak Dokumen
                    </button>
                  </div>
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
                        <td class="py-2 text-right">
                          <input
                            v-if="req.status === 'APPROVED'"
                            type="number"
                            min="0"
                            :max="item.quantity"
                            v-model="item.input_received"
                            class="w-20 p-1 text-right bg-background border border-secondary/30 rounded focus:ring-1 focus:ring-primary outline-none"
                          />
                          <span v-else class="text-text/60">{{ item.received_quantity }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="req.status === 'APPROVED'" class="mt-4 flex justify-end">
                    <button
                      @click="handleComplete(req.id, req.items)"
                      class="px-4 py-2 bg-success text-secondary rounded-lg text-sm font-bold hover:bg-success/90 flex items-center gap-2 transition-all shadow-sm"
                    >
                      <font-awesome-icon icon="fa-solid fa-check-double" />
                      Konfirmasi Terima Barang
                    </button>
                  </div>
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
