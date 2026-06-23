<script setup>
import { ref, onMounted, computed } from 'vue'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useTheme } from '@/composables/useTheme.js'
import FilterBar from '@/components/ui/FilterBar.vue'
import { fetchPackageAnalysis } from '@/api/helpers/stats.js'
import { formatNumber } from '@/utils/formatters.js'

const { themeColors, isDarkTheme } = useTheme()
const isDataLoading = ref(false)
const analysisData = ref([])
const expandedRows = ref([])

const filterValues = ref({
  reportType: 'monthly',
  year: new Date().getFullYear(),
  selectedMonth: ('0' + (new Date().getMonth() + 1)).slice(-2),
  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  searchQuery: ''
})

const reportTypeOptions = [
  { value: 'monthly', label: 'Bulan', icon: 'fa-solid fa-calendar' },
  { value: 'annual', label: 'Tahun', icon: 'fa-solid fa-calendar-days' },
  { value: 'custom', label: 'Kustom', icon: 'fa-solid fa-calendar-plus' }
]

const availableMonths = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
]

const availableYears = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 7 }, (_, i) => current - 5 + i)
})

const getApiPayload = () => {
  let startDate, endDate
  if (filterValues.value.reportType === 'annual') {
    startDate = `${filterValues.value.year}-01-01`
    endDate = `${filterValues.value.year}-12-31`
  } else if (filterValues.value.reportType === 'monthly') {
    const d = new Date(`${filterValues.value.year}-${filterValues.value.selectedMonth}-02`)
    startDate = format(startOfMonth(d), 'yyyy-MM-dd')
    endDate = format(endOfMonth(d), 'yyyy-MM-dd')
  } else {
    startDate = filterValues.value.startDate
    endDate = filterValues.value.endDate
  }
  return {
    startDate,
    endDate,
    searchQuery: filterValues.value.searchQuery
  }
}

const mainFilters = computed(() => {
  const filters = [{ type: 'segmented', key: 'reportType', label: 'Tipe Laporan', options: reportTypeOptions }]

  if (filterValues.value.reportType === 'annual') {
    filters.push({
      type: 'select',
      key: 'year',
      label: 'Tahun',
      options: availableYears.value.map(y => ({ id: y, label: y })),
      clearable: false,
      searchable: false
    })
  } else if (filterValues.value.reportType === 'monthly') {
    filters.push({
      type: 'select',
      key: 'selectedMonth',
      label: 'Bulan',
      options: availableMonths,
      trackBy: 'value',
      clearable: false,
      searchable: false,
      placeholder: 'Pilih Bulan'
    })
    filters.push({
      type: 'select',
      key: 'year',
      label: 'Tahun',
      options: availableYears.value.map(y => ({ id: y, label: y })),
      clearable: false,
      searchable: false
    })
  } else {
    filters.push({ type: 'daterange', keyStart: 'startDate', keyEnd: 'endDate', label: 'Rentang Waktu' })
  }
  return filters
})

const fetchStatistics = async () => {
  const payload = getApiPayload()
  if (!payload.startDate || !payload.endDate) return
  isDataLoading.value = true
  try {
    const data = await fetchPackageAnalysis(payload)
    analysisData.value = data || []
    expandedRows.value = []
  } catch (error) {
    console.error(error)
  } finally {
    isDataLoading.value = false
  }
}

onMounted(() => {
  fetchStatistics()
})

const applyFilters = () => fetchStatistics()

const toggleRow = (id) => {
  const index = expandedRows.value.indexOf(id)
  if (index === -1) {
    expandedRows.value.push(id)
  } else {
    expandedRows.value.splice(index, 1)
  }
}

const getStatusBadge = (status) => {
  if (status === 'SAFE') return 'bg-success/10 text-success border-success/20'
  if (status === 'WARNING') return 'bg-warning/10 text-warning border-warning/20'
  if (status === 'DEFICIT') return 'bg-danger/10 text-danger border-danger/20'
  return 'bg-secondary/10 text-text/50 border-secondary/20'
}

const getStatusText = (status) => {
  if (status === 'SAFE') return 'Aman'
  if (status === 'WARNING') return 'Peringatan'
  if (status === 'DEFICIT') return 'Perlu Beli'
  return status
}
</script>

<template>
  <div class="space-y-6">
    <div class="mb-6 border-b border-secondary/20 pb-4">
      <h3 class="text-lg font-bold text-text">Analisa Kebutuhan Komponen Paket</h3>
      <p class="text-sm text-text/50 mt-1">Estimasi kebutuhan komponen berdasarkan histori penjualan paket.</p>
    </div>

    <!-- Filter Controls -->
    <FilterBar
      v-model="filterValues"
      :filters="mainFilters"
      @change="applyFilters"
      @clear="
        () => {
          filterValues = {
            reportType: 'monthly',
            year: new Date().getFullYear(),
            selectedMonth: ('0' + (new Date().getMonth() + 1)).slice(-2),
            startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
            endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
            searchQuery: ''
          }
          applyFilters()
        }
      "
    />

    <!-- Loading -->
    <main
      v-if="isDataLoading"
      class="bg-background border border-secondary rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm"
    >
      <font-awesome-icon icon="fa-solid fa-circle-notch" spin class="text-4xl mb-4 text-primary" />
      <p class="font-medium text-text/60">Memuat data analisa komponen...</p>
    </main>

    <!-- Empty State -->
    <main
      v-else-if="analysisData.length === 0"
      class="bg-background border border-secondary rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm"
    >
      <font-awesome-icon icon="fa-solid fa-box-open" class="text-4xl mb-4 text-text/30" />
      <h4 class="font-bold text-text text-lg">Tidak ada data paket terjual</h4>
      <p class="text-text/60 mt-2 text-sm max-w-sm">
        Pada rentang pencarian ini, belum ada data penjualan paket yang ter-record.
      </p>
    </main>

    <!-- Data Table -->
    <template v-else>
      <div class="bg-background border border-secondary rounded-xl overflow-hidden shadow-sm animate-fade-in">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="bg-secondary/5 border-b border-secondary sticky top-0 z-10">
              <tr>
                <th class="px-4 py-3 w-10"></th>
                <th class="px-4 py-3 font-semibold text-text/80">SKU Komponen</th>
                <th class="px-4 py-3 font-semibold text-text/80">Nama Komponen</th>
                <th class="px-4 py-3 font-semibold text-text/80 text-right">Stok Saat Ini</th>
                <th class="px-4 py-3 font-semibold text-text/80 text-right">Total Kebutuhan</th>
                <th class="px-4 py-3 font-semibold text-text/80 text-right">Defisit</th>
                <th class="px-4 py-3 font-semibold text-text/80 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary/20">
              <template v-for="item in analysisData" :key="item.component_product_id">
                <tr class="hover:bg-secondary/5 transition-colors cursor-pointer group" @click="toggleRow(item.component_product_id)">
                  <td class="px-4 py-3 text-center text-text/40 group-hover:text-primary transition-colors">
                    <font-awesome-icon 
                      :icon="expandedRows.includes(item.component_product_id) ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'" 
                      class="transition-transform duration-200"
                    />
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-text/70">{{ item.sku }}</td>
                  <td class="px-4 py-3 font-medium text-text">{{ item.name }}</td>
                  <td class="px-4 py-3 text-right font-mono">{{ formatNumber(item.current_stock) }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold">{{ formatNumber(item.total_needed) }}</td>
                  <td class="px-4 py-3 text-right font-mono font-bold" :class="item.deficit > 0 ? 'text-danger' : 'text-text/30'">
                    {{ item.deficit > 0 ? '-' + formatNumber(item.deficit) : '0' }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-1 border rounded-md text-xs font-bold inline-block min-w-[80px]" :class="getStatusBadge(item.status)">
                      {{ getStatusText(item.status) }}
                    </span>
                  </td>
                </tr>
                
                <!-- Expanded Row for Package Details -->
                <tr v-if="expandedRows.includes(item.component_product_id)" class="bg-secondary/5 border-t-0">
                  <td colspan="7" class="p-0">
                    <div class="px-10 py-4 border-l-4 border-primary/40">
                      <p class="text-xs font-bold text-text/50 uppercase tracking-wider mb-3">Detail Penjualan Paket yang Menggunakan Komponen Ini:</p>
                      <table class="w-full text-left text-xs bg-background rounded-lg overflow-hidden border border-secondary/20">
                        <thead class="bg-secondary/10 text-text/60 border-b border-secondary/20">
                          <tr>
                            <th class="px-3 py-2 font-semibold">SKU Paket</th>
                            <th class="px-3 py-2 font-semibold">Nama Paket</th>
                            <th class="px-3 py-2 font-semibold text-right">Terjual</th>
                            <th class="px-3 py-2 font-semibold text-right">Qty per Paket</th>
                            <th class="px-3 py-2 font-semibold text-right">Subtotal Kebutuhan</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-secondary/10">
                          <tr v-for="(pkg, idx) in item.packages" :key="idx" class="hover:bg-secondary/5">
                            <td class="px-3 py-2 font-mono text-text/70">{{ pkg.package_sku }}</td>
                            <td class="px-3 py-2">{{ pkg.package_name }}</td>
                            <td class="px-3 py-2 text-right font-mono">{{ formatNumber(pkg.sold) }}</td>
                            <td class="px-3 py-2 text-right font-mono">{{ formatNumber(pkg.qty_per_package) }}</td>
                            <td class="px-3 py-2 text-right font-mono font-bold">{{ formatNumber(pkg.subtotal_needed) }}</td>
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
    </template>
  </div>
</template>

<style scoped>
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
</style>
