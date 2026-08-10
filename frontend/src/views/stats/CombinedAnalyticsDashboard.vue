<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import {
  getStockMovementStatistics,
  getInventoryValueStatistics,
  fetchLocationAnalysis
} from '@/api/helpers/statistics.js'
import { fetchShopPerformance, fetchPackageAnalysis } from '@/api/helpers/stats.js'
import { useMasterDataStore } from '@/stores/masterData'
import { useToast } from '@/composables/useToast'
import { dayjs } from '@/api/helpers/time.js'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import FilterBar from '@/components/ui/FilterBar.vue'

const masterData = useMasterDataStore()
const { toast } = useToast()

const isLoading = ref(true)

// Global Filters
const buildingOptions = ref([])

const filters = ref({
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  building: { include: [], exclude: [] }
})

const mainFilters = computed(() => [
  { type: 'daterange', keyStart: 'startDate', keyEnd: 'endDate', class: 'md:col-span-1 lg:col-span-2' },
  {
    type: 'triselect',
    key: 'building',
    label: 'Lokasi / Gedung',
    options: buildingOptions.value,
    placeholder: 'Semua Gedung',
    searchable: true,
    class: 'md:col-span-2 lg:col-span-1'
  }
])

// Data state
const kpi = ref({
  totalInventoryValue: 0,
  totalSales: 0,
  totalMovements: 0
})

// Charts Configuration
const shopPerformanceChartOptions = ref({
  chart: { type: 'area', height: 350, toolbar: { show: false }, background: 'transparent' },
  xaxis: { categories: [] },
  colors: ['#3b82f6', '#ef4444'], // Blue for sales, Red for out movements
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth' },
  theme: { mode: 'light' },
  title: { text: 'Performa Toko vs Stok Keluar', align: 'left', style: { color: '#64748b' } }
})
const shopPerformanceSeries = ref([])

const inventoryValueChartOptions = ref({
  chart: { type: 'donut', height: 350, background: 'transparent' },
  labels: [],
  colors: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'],
  theme: { mode: 'light' },
  title: { text: 'Distribusi Nilai Inventaris', align: 'left', style: { color: '#64748b' } }
})
const inventoryValueSeries = ref([])

const packageAnalysisChartOptions = ref({
  chart: { type: 'bar', height: 350, toolbar: { show: false }, background: 'transparent' },
  plotOptions: {
    bar: { horizontal: true, columnWidth: '55%', borderRadius: 4 }
  },
  xaxis: { categories: [] },
  colors: ['#8b5cf6'],
  dataLabels: { enabled: false },
  theme: { mode: 'light' },
  title: { text: 'Top Paket Paling Laku', align: 'left', style: { color: '#64748b' } }
})
const packageAnalysisSeries = ref([])

const fetchData = async () => {
  isLoading.value = true
  try {
    const filterParams = { ...filters.value }

    // Fetch all in parallel, catch individually so one failure doesn't break all
    const [movementsRes, inventoryRes, shopRes, packageRes] = await Promise.allSettled([
      getStockMovementStatistics(filterParams),
      getInventoryValueStatistics(filterParams),
      fetchShopPerformance({ startDate: filterParams.startDate, endDate: filterParams.endDate }),
      fetchPackageAnalysis({ startDate: filterParams.startDate, endDate: filterParams.endDate })
    ])

    // movementsRes.data = { summary: [...] } → perlu .data.summary
    // inventoryRes.data = [...] → langsung array
    // shopRes = { summary, dailyTrend, topProducts, ... } → perlu .summary untuk KPI
    // packageRes = [...] → langsung array
    const movementsRaw = movementsRes.status === 'fulfilled' ? movementsRes.value : {}
    const inventoryData = inventoryRes.status === 'fulfilled' ? inventoryRes.value?.data || [] : []
    const shopRaw = shopRes.status === 'fulfilled' ? shopRes.value || {} : {}
    const packageData = packageRes.status === 'fulfilled' ? packageRes.value || [] : []

    const movementsSummary = movementsRaw?.data?.summary || []
    const shopSummary = shopRaw?.summary || []
    const shopDailyTrend = shopRaw?.dailyTrend || []

    processKpi(movementsSummary, inventoryData, shopSummary)
    processShopVsMovementChart(shopDailyTrend, movementsSummary)
    processInventoryValueChart(inventoryData)
    processPackageAnalysisChart(packageData)
  } catch (error) {
    toast('Gagal memuat data dashboard analitik', 'error')
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const processKpi = (movements, inventory, shop) => {
  kpi.value.totalInventoryValue = inventory?.reduce((acc, curr) => acc + (Number(curr.total_value) || 0), 0) || 0
  kpi.value.totalSales = shop?.reduce((acc, curr) => acc + (Number(curr.total_items_sold) || 0), 0) || 0
  kpi.value.totalMovements = movements?.reduce((acc, curr) => acc + (Number(curr.total_sold) || 0), 0) || 0
}

const processShopVsMovementChart = (shop, movements) => {
  // Aggregate data by date
  const dateMap = {}

  shop?.forEach(item => {
    const d = item.date?.split('T')[0] || item.created_at?.split('T')[0]
    if (d) {
      if (!dateMap[d]) dateMap[d] = { sales: 0, out: 0 }
      dateMap[d].sales += Number(item.total_qty || item.quantity || 0)
    }
  })

  movements?.forEach(item => {
    const d = item.date || item.created_at?.split('T')[0]
    if (d) {
      if (!dateMap[d]) dateMap[d] = { sales: 0, out: 0 }
      dateMap[d].out += Number(item.out_qty || 0)
    }
  })

  const sortedDates = Object.keys(dateMap).sort()
  shopPerformanceChartOptions.value = {
    ...shopPerformanceChartOptions.value,
    xaxis: { categories: sortedDates }
  }

  shopPerformanceSeries.value = [
    { name: 'Penjualan Toko (Qty)', data: sortedDates.map(d => dateMap[d].sales) },
    { name: 'Stok Keluar (Qty)', data: sortedDates.map(d => dateMap[d].out) }
  ]
}

const processInventoryValueChart = inventory => {
  const categoriesMap = {}
  inventory?.forEach(item => {
    const cat = item.category_name || item.building || 'Lainnya'
    if (!categoriesMap[cat]) categoriesMap[cat] = 0
    categoriesMap[cat] += Number(item.total_value || 0)
  })

  inventoryValueChartOptions.value = {
    ...inventoryValueChartOptions.value,
    labels: Object.keys(categoriesMap)
  }
  inventoryValueSeries.value = Object.values(categoriesMap)
}

const processPackageAnalysisChart = packages => {
  // Sort by highest quantity
  const sorted = (packages || [])
    .sort((a, b) => (Number(b.total_qty || b.usage_count) || 0) - (Number(a.total_qty || a.usage_count) || 0))
    .slice(0, 10)

  packageAnalysisChartOptions.value = {
    ...packageAnalysisChartOptions.value,
    xaxis: { categories: sorted.map(p => p.package_name || p.name || 'Paket') }
  }
  packageAnalysisSeries.value = [
    {
      name: 'Jumlah Terjual',
      data: sorted.map(p => Number(p.total_qty || p.usage_count) || 0)
    }
  ]
}

const formatCurrency = val => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)
}

const formatNumber = val => {
  return new Intl.NumberFormat('id-ID').format(val)
}

// Watch for dark mode changes (assuming standard tailwind 'dark' class on html)
const updateChartTheme = () => {
  const isDark = document.documentElement.classList.contains('dark')
  const theme = isDark ? 'dark' : 'light'
  const textColor = isDark ? '#cbd5e1' : '#64748b'

  shopPerformanceChartOptions.value = {
    ...shopPerformanceChartOptions.value,
    theme: { mode: theme },
    title: { ...shopPerformanceChartOptions.value.title, style: { color: textColor } }
  }
  inventoryValueChartOptions.value = {
    ...inventoryValueChartOptions.value,
    theme: { mode: theme },
    title: { ...inventoryValueChartOptions.value.title, style: { color: textColor } }
  }
  packageAnalysisChartOptions.value = {
    ...packageAnalysisChartOptions.value,
    theme: { mode: theme },
    title: { ...packageAnalysisChartOptions.value.title, style: { color: textColor } }
  }
}

onMounted(async () => {
  try {
    const res = await masterData.getReportFilters()
    buildingOptions.value = (res.allBuildings || []).map(b => b.value || b)
  } catch (err) {
    console.error('Gagal mengambil filter lokasi', err)
  }

  updateChartTheme()
  // Create an observer to watch for theme changes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'class') {
        updateChartTheme()
      }
    })
  })
  observer.observe(document.documentElement, { attributes: true })

  fetchData()
})

watch(
  filters,
  () => {
    fetchData()
  },
  { deep: true }
)
</script>

<template>
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
    <h1 class="text-2xl font-bold text-text">Dashboard Analitik Terpadu</h1>

    <!-- Global Filters -->
    <FilterBar v-model="filters" :filters="mainFilters" @change="fetchData" />
  </div>

  <div v-if="isLoading" class="grid grid-cols-1 gap-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <BaseSkeleton class="h-28 w-full rounded-xl" />
      <BaseSkeleton class="h-28 w-full rounded-xl" />
      <BaseSkeleton class="h-28 w-full rounded-xl" />
    </div>
    <BaseSkeleton class="h-96 w-full rounded-xl" />
  </div>

  <div v-else class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div
        class="bg-background p-6 rounded-xl shadow-sm border border-secondary/20 flex flex-col justify-center transform transition duration-300 hover:scale-105 hover:shadow-lg"
      >
        <p class="text-sm font-medium text-text/60 mb-1">Total Nilai Inventaris</p>
        <h3 class="text-2xl font-bold text-text">
          {{ formatCurrency(kpi.totalInventoryValue) }}
        </h3>
      </div>
      <div
        class="bg-background p-6 rounded-xl shadow-sm border border-secondary/20 flex flex-col justify-center transform transition duration-300 hover:scale-105 hover:shadow-lg"
      >
        <p class="text-sm font-medium text-text/60 mb-1">Total Penjualan (Qty)</p>
        <h3 class="text-2xl font-bold text-primary">{{ formatNumber(kpi.totalSales) }}</h3>
      </div>
      <div
        class="bg-background p-6 rounded-xl shadow-sm border border-secondary/20 flex flex-col justify-center transform transition duration-300 hover:scale-105 hover:shadow-lg"
      >
        <p class="text-sm font-medium text-text/60 mb-1">Total Stok Keluar (Qty)</p>
        <h3 class="text-2xl font-bold text-danger">{{ formatNumber(kpi.totalMovements) }}</h3>
      </div>
    </div>

    <!-- Charts Area -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Line Chart: Shop vs Movement -->
      <div class="lg:col-span-2 bg-background p-6 rounded-xl shadow-sm border border-secondary/20">
        <VueApexCharts
          type="area"
          height="350"
          :options="shopPerformanceChartOptions"
          :series="shopPerformanceSeries"
        />
      </div>

      <!-- Donut Chart: Inventory Value -->
      <div class="bg-background p-6 rounded-xl shadow-sm border border-secondary/20">
        <VueApexCharts type="donut" height="350" :options="inventoryValueChartOptions" :series="inventoryValueSeries" />
      </div>
    </div>

    <div class="">
      <!-- Bar Chart: Package Analysis -->
      <div class="bg-background p-6 rounded-xl shadow-sm border border-secondary/20">
        <VueApexCharts type="bar" height="350" :options="packageAnalysisChartOptions" :series="packageAnalysisSeries" />
      </div>
    </div>
  </div>
</template>
