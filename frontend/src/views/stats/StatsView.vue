<!-- frontend\src\views\stats\StatsView.vue -->
<script setup>
import { ref, onMounted, computed, watch, defineAsyncComponent } from 'vue'
import { fetchKpiSummary, requestExportStock, getUserExportJobs } from '@/api/helpers/stats.js'
import { useMasterDataStore } from '@/stores/masterData'
import { useToast } from '@/composables/useToast.js'
import SearchInput from '@/components/ui/SearchInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import TriStateSelect from '@/components/ui/TriStateSelect.vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import { formatNumber, formatCurrency } from '@/utils/formatters.js'
import { useDownloadStore } from '@/stores/downloadStore.js'

// Lazy load heavy chart components based on active tab
const StockMovementStats = defineAsyncComponent(() => import('@/components/stats/StockMovementStats.vue'))
const StockTimelineFull = defineAsyncComponent(() => import('@/components/stats/StockTimelineFull.vue'))
const InventoryValueStats = defineAsyncComponent(() => import('@/components/stats/InventoryValueStats.vue'))
const TimePerformanceStats = defineAsyncComponent(() => import('@/components/stats/TimePerformanceStats.vue'))
const ShopPerformanceStats = defineAsyncComponent(() => import('@/components/stats/ShopPerformanceStats.vue'))

const masterData = useMasterDataStore()
const downloadStore = useDownloadStore()

const { toast } = useToast()
const isSidebarOpen = ref(false)

// State untuk data KPI
const kpiData = ref(null)
const isLoading = ref(true)
const errorMessage = ref(null)
const isRequesting = ref(false)
const jobHistory = ref([])
const isHistoryLoading = ref(false)

// State untuk filter
const selectedFilters = ref({
  searchQuery: '',
  building: { include: [], exclude: [] },
  purpose: { include: [], exclude: [] },
  isPackage: '',
  stockStatus: ''
})
const reportFilters = ref({
  allBuildings: [],
  purposes: [],
  buildingsByPurpose: {}
})

const activeReport = ref('overview')
const reportsMenu = [
  { key: 'overview', label: 'Overview', group: 'Overview', icon: 'fa-solid fa-chart-pie' },
  {
    key: 'sales',
    label: 'Laporan Penjualan',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-chart-line'
  },
  {
    key: 'stock-movement',
    label: 'Pergerakan Stok',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-boxes-stacked'
  },
  {
    key: 'stock-timeline',
    label: 'Timeline Stok',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-clock-rotate-left'
  },
  {
    key: 'dead-stock',
    label: 'Laporan Stok Mati',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-skull'
  },
  {
    key: 'inventory-value',
    label: 'Laporan Nilai Inventaris',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-dollar-sign'
  },
  {
    key: 'time-performance',
    label: 'Performa Waktu',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-chart-line'
  },
  {
    key: 'channel-performance',
    label: 'Performa Toko & Saluran',
    group: 'Laporan Utama',
    icon: 'fa-solid fa-store'
  },
  {
    key: 'sku-audit',
    label: 'Audit SKU',
    group: 'Audit & Lainnya',
    icon: 'fa-solid fa-search'
  },
  {
    key: 'export-stock',
    label: 'Ekspor Laporan Stok',
    group: 'Audit & Lainnya',
    icon: 'fa-solid fa-file-excel'
  }
]

async function loadKpiData() {
  isLoading.value = true
  errorMessage.value = null
  try {
    const data = await fetchKpiSummary()
    kpiData.value = data
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
    errorMessage.value = error.message || 'Gagal terhubung ke server.'
//     toast(errorMessage.value, 'error') // Removed to prevent double-toast
  } finally {
    isLoading.value = false
  }
}

async function loadReportFilters() {
  try {
    const response = await masterData.getReportFilters()
    if (response) {
      reportFilters.value.allBuildings = response.allBuildings || []
      reportFilters.value.purposes = response.purposes || []
      reportFilters.value.buildingsByPurpose = response.buildingsByPurpose || {}
    }
  } catch (error) {
    console.error('Gagal memuat filter:', error)
  }
}

async function loadHistory() {
  isHistoryLoading.value = true
  try {
    const response = await getUserExportJobs()
    if (response.success) {
      jobHistory.value = response.data.filter(job => job.type === 'STOCK_REPORT')
    }
  } catch (error) {
    console.error('Gagal memuat riwayat:', error)
//     toast('Gagal memuat riwayat laporan', 'error') // Removed to prevent double-toast
  } finally {
    isHistoryLoading.value = false
  }
}

onMounted(() => {
  if (activeReport.value === 'overview') {
    loadKpiData()
  }
  loadReportFilters()
  loadHistory()
})

const purposeOptions = computed(() => {
  return (reportFilters.value?.purposes || []).map(p => ({ value: p, label: p }))
})

const typeOptions = [
  { id: '0', label: 'Tunggal' },
  { id: '1', label: 'Paket' }
]

const stockStatusOptions = [
  { id: 'positive', label: 'Positif' },
  { id: 'negative', label: 'Minus' }
]

const availableBuildings = computed(() => {
  const includedPurposes = selectedFilters.value.purpose?.include || []
  if (!includedPurposes || includedPurposes.length === 0) {
    return reportFilters.value.allBuildings.map(b => ({ value: b, label: b }))
  }
  let buildings = new Set()
  includedPurposes.forEach(p => {
    const blds = reportFilters.value.buildingsByPurpose[p] || []
    blds.forEach(b => buildings.add(b))
  })
  return Array.from(buildings).map(b => ({ value: b, label: b }))
})

watch(
  () => selectedFilters.value.purpose,
  () => {
    // Reset building when purpose changes
    selectedFilters.value.building = { include: [], exclude: [] }
  },
  { deep: true }
)

async function handleRequestExport() {
  const filters = {
    searchQuery: selectedFilters.value.searchQuery || null,
    building: selectedFilters.value.building,
    purpose: selectedFilters.value.purpose,
    isPackage: selectedFilters.value.isPackage,
    stockStatus: selectedFilters.value.stockStatus || 'all',
    exportType: 'STOCK_REPORT'
  }

  isRequesting.value = true
  try {
    // Panggil API baru (POST) yang hanya mengirim permintaan
    const response = await requestExportStock(filters)

    // Tampilkan pesan sukses dari API
    toast(response.message || 'Permintaan diterima!', 'success')

    // Muat ulang riwayat untuk melihat status PENDING
    loadHistory()

    // Mulai polling di Global Download Manager
    downloadStore.startPolling()
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
//     toast(error.message || 'Gagal membuat permintaan.', 'error') // Removed to prevent double-toast
  } finally {
    isRequesting.value = false
  }
}

function formatJobType(type) {
  if (!type) return '-'
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Removed locale formatters as they are now imported from utils
</script>

<template>
  <div class="flex font-sans text-text">
    <!-- Mobile Backdrop -->
    <div
      v-if="isSidebarOpen"
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
    ></div>

    <!-- Sidebar -->
    <aside
      class="fixed md:sticky top-12 bottom-0 left-0 md:h-[calc(100vh-3rem)] z-50 w-64 bg-background border-r border-secondary/20 transform transition-transform duration-300 ease-in-out flex flex-col shadow-lg md:shadow-none overflow-y-auto"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <!-- Logo / Header -->
      <div class="p-6 border-b border-secondary/20 flex justify-between items-center bg-secondary/5">
        <h2 class="text-xl font-bold text-text flex items-center gap-3">
          <font-awesome-icon icon="fa-solid fa-chart-simple" class="text-primary" />
          <span>Statistik</span>
        </h2>
        <!-- Close button for mobile -->
        <button
          @click="isSidebarOpen = false"
          class="md:hidden text-text/60 hover:text-danger p-1 rounded-md transition-colors"
        >
          <font-awesome-icon icon="fa-solid fa-xmark" size="lg" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto space-y-1">
        <div
          v-for="groupName in ['Overview', 'Laporan Utama', 'Audit & Lainnya']"
          :key="groupName"
          class="py-4 px-4 pr-6 border-t border-secondary"
        >
          <span class="text-xs font-bold text-text/40 uppercase tracking-wider block mb-2">
            {{ groupName }}
          </span>
          <div class="space-y-1">
            <a
              v-for="item in reportsMenu.filter(m => m.group === groupName)"
              :key="item.key"
              href="#"
              @click.prevent="((activeReport = item.key), (isSidebarOpen = false))"
              class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200"
              :class="
                activeReport === item.key
                  ? 'bg-primary/10 text-primary font-semibold shadow-sm ring-1 ring-primary/20'
                  : 'text-text/70 hover:bg-secondary/20 hover:text-primary'
              "
            >
              <font-awesome-icon :icon="item.icon" class="w-5" />
              <span>{{ item.label }}</span>
            </a>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 transition-all duration-300">
      <!-- Mobile Header -->
      <header
        class="md:hidden bg-background border-t border-secondary/20 flex items-center justify-between sticky top-12 z-10 shadow-sm p-4"
      >
        <button
          @click="isSidebarOpen = !isSidebarOpen"
          class="p-2 -ml-2 text-text/70 hover:text-primary rounded-lg hover:bg-secondary/10 transition-colors"
        >
          <font-awesome-icon icon="fa-solid fa-bars" size="lg" />
        </button>
        <span class="font-bold text-text truncate">Statistik & Laporan</span>
        <div class="w-8"></div>
        <!-- Spacer -->
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-4 lg:p-6 overflow-x-hidden w-full">
        <div class="max-w-7xl mx-auto">
          <div
            class="bg-background rounded-xl shadow-md border border-secondary/20 p-6 min-h-[calc(50vh+20rem)] relative overflow-visible animate-fade-in"
          >
            <div v-if="isLoading" class="flex flex-col items-center justify-center h-80">
              <font-awesome-icon icon="fa-solid fa-circle-notch" spin class="text-primary text-4xl mb-3" />
              <span class="text-text/50 font-medium">Memuat Data...</span>
            </div>

            <div v-else-if="errorMessage" class="flex flex-col items-center justify-center h-80 text-danger">
              <div class="bg-danger/10 p-4 rounded-full mb-3">
                <font-awesome-icon icon="fa-solid fa-triangle-exclamation" class="text-3xl" />
              </div>
              <h3 class="font-bold text-lg">Gagal Memuat Data</h3>
              <p class="text-sm opacity-80 mt-1">{{ errorMessage }}</p>
            </div>

            <template v-else>
              <div v-if="activeReport === 'overview' && kpiData" class="animate-fade-in">
                <div class="flex justify-between items-center mb-6">
                  <h3 class="text-lg font-bold text-text">Overall Summary</h3>
                  <span class="text-xs text-text/40 font-mono">{{
                    new Date().toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  }}</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div class="kpi-card">
                    <div class="kpi-label">List Selesai</div>
                    <div class="kpi-value text-success">
                      {{ formatNumber(kpiData.listsCompletedToday) }}
                    </div>
                    <div class="kpi-icon">
                      <font-awesome-icon icon="fa-solid fa-check-double" />
                    </div>
                  </div>

                  <div class="kpi-card">
                    <div class="kpi-label">Item Terambil</div>
                    <div class="kpi-value text-primary">
                      {{ formatNumber(kpiData.itemsPickedToday) }}
                    </div>
                    <div class="kpi-icon">
                      <font-awesome-icon icon="fa-solid fa-box-open" />
                    </div>
                  </div>

                  <div class="kpi-card">
                    <div class="kpi-label">User Aktif</div>
                    <div class="kpi-value text-warning">
                      {{ formatNumber(kpiData.usersActiveToday) }}
                    </div>
                    <div class="kpi-icon">
                      <font-awesome-icon icon="fa-solid fa-users" />
                    </div>
                  </div>

                  <div class="kpi-card">
                    <div class="kpi-label">Total Nilai Inventaris</div>
                    <div class="kpi-value text-text text-xl md:text-2xl mt-3">
                      {{ formatCurrency(kpiData.totalInventoryValue) }}
                    </div>
                    <div class="kpi-icon">
                      <font-awesome-icon icon="fa-solid fa-vault" />
                    </div>
                  </div>
                </div>
              </div>

              <KeepAlive>
                <StockMovementStats v-if="activeReport === 'stock-movement'" class="animate-fade-in" />
                <StockTimelineFull v-else-if="activeReport === 'stock-timeline'" class="animate-fade-in" />
                <InventoryValueStats v-else-if="activeReport === 'inventory-value'" class="animate-fade-in" />
                <TimePerformanceStats v-else-if="activeReport === 'time-performance'" class="animate-fade-in" />
                <ShopPerformanceStats v-else-if="activeReport === 'channel-performance'" class="animate-fade-in" />
              </KeepAlive>

              <div v-if="activeReport === 'export-stock'" class="animate-fade-in">
                <div class="mb-6 border-b border-secondary pb-4">
                  <h3 class="text-lg font-bold text-text">Ekspor Laporan Stok</h3>
                  <p class="text-sm text-text/50 mt-1">Filter dan unduh data stok gudang dalam format Excel.</p>
                </div>

                <div class="grid lg:grid-cols-3 gap-8">
                  <div class="lg:col-span-1">
                    <BaseFilterPanel title="Filter Export">
                      <template #filters>
                        <div class="space-y-5 w-full">
                          <div>
                            <label class="label-input">Cari Produk</label>
                            <SearchInput
                              id="search-filter"
                              v-model="selectedFilters.searchQuery"
                              placeholder="Cari SKU atau Nama Produk..."
                            />
                          </div>

                          <div>
                            <label class="label-input">Gedung</label>
                            <TriStateSelect
                              v-model="selectedFilters.building"
                              :options="availableBuildings"
                              label="label"
                              track-by="value"
                              placeholder="Semua Gedung"
                            />
                          </div>

                          <div>
                            <label class="label-input">Tujuan</label>
                            <TriStateSelect
                              v-model="selectedFilters.purpose"
                              :options="purposeOptions"
                              label="label"
                              track-by="value"
                              placeholder="Semua Tujuan"
                            />
                          </div>

                          <div class="grid grid-cols-2 gap-3">
                            <div>
                              <label class="label-input">Tipe</label>
                              <BaseSelect
                                v-model="selectedFilters.isPackage"
                                :options="typeOptions"
                                emitValue
                                clearable
                                clear-value="all"
                                placeholder="Semua Tipe"
                                :searchable="false"
                              />
                            </div>
                            <div>
                              <label class="label-input">Status Stok</label>
                              <BaseSelect
                                v-model="selectedFilters.stockStatus"
                                :options="stockStatusOptions"
                                emitValue
                                clearable
                                clear-value="all"
                                placeholder="Semua Status"
                                :searchable="false"
                              />
                            </div>
                          </div>

                          <button
                            @click="handleRequestExport"
                            :disabled="isRequesting"
                            class="w-full py-3 bg-primary text-secondary rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                          >
                            <font-awesome-icon v-if="isRequesting" icon="fa-solid fa-circle-notch" spin />
                            <font-awesome-icon v-else icon="fa-solid fa-file-export" />
                            <span>{{ isRequesting ? 'Memproses...' : 'Generate Laporan' }}</span>
                          </button>
                        </div>
                      </template>
                    </BaseFilterPanel>
                  </div>

                  <div class="lg:col-span-2">
                    <div class="flex justify-between items-center mb-4">
                      <h4 class="text-sm font-bold text-text/70 uppercase tracking-wide">Riwayat Generate</h4>
                      <button
                        @click="loadHistory"
                        :disabled="isHistoryLoading"
                        class="text-xs text-primary font-bold hover:text-primary/80 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                      >
                        <font-awesome-icon icon="fa-solid fa-rotate" :class="{ 'animate-spin': isHistoryLoading }" />
                        Refresh
                      </button>
                    </div>

                    <div
                      class="bg-background border border-secondary/20 rounded-xl overflow-hidden shadow-md overflow-x-auto overflow-y-auto relative custom-scrollbar max-h-[400px]"
                    >
                      <table class="w-full text-left text-sm min-w-[500px] border-collapse">
                        <thead
                          class="sticky top-0 z-50 bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary"
                        >
                          <tr>
                            <th
                              class="px-3 py-3 font-bold text-xs text-text/60 uppercase sticky left-0 z-10 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              Nama File
                            </th>
                            <th
                              class="px-3 py-3 font-bold text-xs text-text/60 uppercase sticky left-0 z-10 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              Waktu
                            </th>
                            <th
                              class="px-3 py-3 font-bold text-xs text-text/60 uppercase sticky left-0 z-10 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              Tipe
                            </th>
                            <th class="px-3 py-3 font-bold text-xs text-text/60 uppercase border-b border-secondary/10">
                              Status
                            </th>
                            <th
                              class="px-3 py-3 font-bold text-xs text-text/60 uppercase text-right border-b border-secondary/10 sticky right-0 z-30 bg-background/95 backdrop-blur-md shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <TransitionGroup tag="tbody" name="list" class="divide-y divide-secondary/5 relative">
                          <template v-if="isHistoryLoading && jobHistory.length === 0">
                            <TableSkeleton v-for="n in 3" :key="`skeleton-${n}`" />
                          </template>

                          <tr v-else-if="jobHistory.length === 0" key="empty">
                            <td colspan="3" class="px-6 py-12 text-sm text-text/40 text-center italic">
                              <font-awesome-icon
                                icon="fa-solid fa-clock-rotate-left"
                                class="mb-3 text-3xl opacity-20 block mx-auto"
                              />
                              Belum ada riwayat permintaan.
                            </td>
                          </tr>

                          <tr
                            v-else
                            v-for="job in jobHistory"
                            :key="job.id"
                            class="hover:bg-secondary/5 transition-colors group relative"
                          >
                            <td
                              class="px-2 py-1 text-text text-xs sticky left-0 bg-background group-hover:bg-secondary/5 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              <div class="flex flex-col">
                                <span class="font-bold text-sm">{{ job.file_path }}</span>
                              </div>
                            </td>
                            <td
                              class="px-2 py-1 text-text text-xs sticky left-0 bg-background group-hover:bg-secondary/5 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              <div class="flex flex-col">
                                <span class="font-bold text-sm">{{
                                  new Date(job.created_at).toLocaleDateString('id-ID')
                                }}</span>
                                <span class="text-text/40 text-[10px]">{{
                                  new Date(job.created_at).toLocaleTimeString('id-ID')
                                }}</span>
                              </div>
                            </td>
                            <td class="px-2 py-1">
                              <div class="flex flex-col">
                                <span class="font-bold text-sm">{{ formatJobType(job.type) }}</span>
                              </div>
                            </td>
                            <td class="px-2 py-1">
                              <span
                                v-if="job.status === 'PENDING'"
                                class="inline-flex items-center gap-1.5 justify-center align-center w-full py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20"
                                title="Menunggu"
                              >
                                <font-awesome-icon icon="fa-solid fa-clock" class="animate-ping" />
                              </span>
                              <span
                                v-if="job.status === 'COMPLETED'"
                                class="inline-flex items-center gap-1.5 justify-center align-center w-full py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20"
                                title="Selesai"
                              >
                                <font-awesome-icon icon="fa-solid fa-check" />
                              </span>
                              <span
                                v-else-if="job.status === 'FAILED'"
                                class="inline-flex items-center gap-1.5 justify-center align-center w-full py-1 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20"
                                :title="job.error_message || Gagal"
                              >
                                <font-awesome-icon icon="fa-solid fa-xmark" />
                              </span>
                              <span
                                v-else-if="job.status === 'PROCESSING'"
                                class="inline-flex items-center gap-1.5 justify-center align-center w-full py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/20"
                                title="Proses"
                              >
                                <span class="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
                              </span>
                            </td>
                            <td
                              class="px-2 py-1 text-right sticky right-0 bg-background group-hover:bg-secondary/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                              <a
                                v-if="job.status === 'COMPLETED'"
                                :href="job.download_url"
                                download
                                class="inline-flex items-center align-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold w-full hover:bg-primary hover:text-secondary transition-all shadow-sm"
                              >
                                <font-awesome-icon icon="fa-solid fa-download" />
                              </a>
                              <span
                                v-else-if="job.status === 'FAILED'"
                                class="text-xs text-danger/60 bg-re align-center justify-center italic cursor-help underline decoration-dotted"
                                :title="job.error_message"
                              >
                                Error
                              </span>
                              <span v-else class="text-xs text-text/30 align-center justify-center italic">
                                Menunggu...
                              </span>
                            </td>
                          </tr>
                        </TransitionGroup>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Attendance Stats Section -->
              <div
                v-if="
                  ![
                    'overview',
                    'stock-movement',
                    'stock-timeline',
                    'inventory-value',
                    'time-performance',
                    'export-stock',
                    'channel-performance'
                  ].includes(activeReport)
                "
                class="flex flex-col items-center justify-center h-80 text-text/30"
              >
                <font-awesome-icon icon="fa-solid fa-screwdriver-wrench" class="text-4xl mb-3 opacity-20" />
                <h3 class="text-lg font-medium italic">Laporan ini sedang dalam pengembangan.</h3>
                <p class="text-sm">Silakan kembali lagi nanti.</p>
              </div>
            </template>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.label-input {
  @apply block text-xs font-bold text-text/60 uppercase mb-1.5;
}

.input-select {
  @apply w-full bg-background border border-secondary/30 text-text text-sm rounded-lg focus:ring-1 focus:ring-primary/20 focus:border-primary block p-2.5 transition-colors outline-none;
}

.kpi-card {
  @apply bg-secondary/5 border border-secondary/20 p-5 rounded-xl relative overflow-hidden transition-all hover:border-primary/30 hover:bg-secondary/10;
}

.kpi-label {
  @apply text-xs font-bold uppercase text-text/50 tracking-wider mb-2 relative z-10;
}

.kpi-value {
  @apply text-3xl font-bold relative z-10 font-mono tracking-tight;
}

.kpi-icon {
  @apply absolute -bottom-3 -right-3 text-6xl text-text/5 opacity-[0.03] transform rotate-[-15deg] pointer-events-none;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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
}
</style>
