<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast.js';
import { useTheme } from '@/composables/useTheme.js';
import FilterBar from '@/components/ui/FilterBar.vue';
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue';
import { getStockMovementStatistics } from '@/api/helpers/statistics.js';
import { requestStatisticExport } from '@/api/helpers/exportStats.js';
import { fetchReportFilters } from '@/api/helpers/stats.js';
import SearchInput from '@/components/ui/SearchInput.vue';
import Tabs from '@/components/ui/Tabs.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import VueApexCharts from 'vue3-apexcharts';

const authStore = useAuthStore();
const { toast } = useToast();

const isDataLoading = ref(false);
const isExporting = ref(false);
const showAdvancedFilters = ref(false);
const statisticsList = ref([]);
const sortKey = ref('total_sold');
const sortDesc = ref(true);
const viewMode = ref('table');
const chartMaxCap = ref(10);

const filterValues = ref({
  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  searchQuery: '',
  status: 'all',
  movement: 'all',
  building: []
});

const reportFilters = ref({
  allBuildings: []
});

const stockStatusOptions = [
  { id: 'all', label: 'Semua' },
  { id: 'safe', label: 'Aman' },
  { id: 'warning', label: 'Warning' },
  { id: 'critical', label: 'Kritis (Restock)' },
  { id: 'overstock', label: 'Overstock' }
];

const movementOptions = [
  { id: 'all', label: 'Semua' },
  { id: 'active', label: 'Satu / Lebih Transaksi' },
  { id: 'dead', label: 'Dead Stock (Tidak ada transaksi)' }
];

const chartMaxCapOptions = [
  { id: 5, label: 'Top 5' },
  { id: 10, label: 'Top 10' },
  { id: 25, label: 'Top 25' },
  { id: 50, label: 'Top 50' }
];

const { themeColors, isDarkTheme } = useTheme();

onMounted(async () => {
  try {
    const res = await fetchReportFilters();
    if (res && res.allBuildings) {
      reportFilters.value.allBuildings = res.allBuildings;
    }
  } catch (error) {
    console.error("Gagal memuat filter laporan lokasi", error);
  }

  fetchStatistics();
});

const canView = computed(() => authStore.user?.permissions?.includes('statistic.stock.view') || authStore.user?.permissions?.includes('manage-all'));
const canExport = computed(() => authStore.user?.permissions?.includes('statistic.stock.export') || authStore.user?.permissions?.includes('manage-all'));

const displayedData = computed(() => {
  return [...statisticsList.value].sort((a, b) => {
    let valA = a[sortKey.value];
    let valB = b[sortKey.value];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortDesc.value ? 1 : -1;
    if (valA > valB) return sortDesc.value ? -1 : 1;
    return 0;
  });
});

const fetchStatistics = async () => {
  if (!filterValues.value.startDate || !filterValues.value.endDate) return;
  isDataLoading.value = true;
  try {
    const response = await getStockMovementStatistics(filterValues.value);
    const payload = response?.data || response; // Ambil properti data asli dari Controller
    
    if (payload && !Array.isArray(payload) && payload.summary) {
      statisticsList.value = payload.summary || [];
    } else {
      statisticsList.value = Array.isArray(payload) ? payload : [];
    }
  } catch (error) {
    toast(error.message || 'Gagal mengambil data statistik', 'error');
  } finally {
    isDataLoading.value = false;
  }
};

const handleExport = async () => {
  if (!filterValues.value.startDate || !filterValues.value.endDate) return;
  isExporting.value = true;
  try {
    const data = await requestStatisticExport(filterValues.value);
    if (data.success) {
      toast(data.message || 'Sedang memproses export ke background', 'success');
    }
  } catch (error) {
    toast(error.message || 'Gagal request export', 'error');
  } finally {
    isExporting.value = false;
  }
};

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
  } else {
    sortKey.value = key;
    sortDesc.value = true;
  }
  // Reset lazy load table agar pengguna kembali melihat data teratas dari hasil sorting
  visibleCount.value = 50;
};

const getSortIcon = (key) => {
  if (sortKey.value !== key) return 'fa-solid fa-sort';
  return sortDesc.value ? 'fa-solid fa-sort-down' : 'fa-solid fa-sort-up';
};

const getStatusClass = (status) => {
  switch (status) {
    case 'CRITICAL': return 'bg-danger/50 border-danger';
    case 'WARNING': return 'bg-warning/50 border-warning';
    case 'SAFE': return 'bg-success/50 border-success';
    case 'OVERSTOCK': return 'bg-info/50 border-info';
    default: return 'bg-secondary/50 border-secondary';
  }
};

const visibleCount = ref(50);

const loadMore = () => {
  if (visibleCount.value < displayedData.value.length) {
    visibleCount.value += 50;
  }
};

const handleTableScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  if (scrollTop + clientHeight >= scrollHeight - 50) {
    loadMore();
  }
};

const visibleData = computed(() => {
  return displayedData.value.slice(0, visibleCount.value);
});

const applyFilters = () => {
  visibleCount.value = 50;
  fetchStatistics();
};

const chartStatusSeries = computed(() => {
  let safe = 0, warning = 0, critical = 0, overstock = 0;
  statisticsList.value.forEach(item => {
    if (item.status === 'SAFE') safe++;
    else if (item.status === 'WARNING') warning++;
    else if (item.status === 'CRITICAL') critical++;
    else if (item.status === 'OVERSTOCK') overstock++;
  });
  return [safe, warning, critical, overstock];
});

const labelColor = computed(() => themeColors.value.text);

const chartStatusOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  labels: ['Aman', 'Warning', 'Kritis', 'Overstock'],
  colors: [themeColors.value.success, themeColors.value.warning, themeColors.value.danger, themeColors.value.primary],
  theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
  plotOptions: { pie: { donut: { size: '70%' }, expandOnClick: false } },
  dataLabels: { enabled: false },
  legend: { position: 'bottom', labels: { colors: labelColor.value } },
  stroke: { show: false }
}));

const chartTopSalesSeries = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_sold - a.total_sold).slice(0, chartMaxCap.value);
  return [{ name: 'Keluar (Out)', data: sorted.map(i => i.total_sold) }];
});
const chartTopSalesOptions = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_sold - a.total_sold).slice(0, chartMaxCap.value);
  return {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    xaxis: { categories: sorted.map(i => i.sku), labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    yaxis: { labels: { style: { colors: labelColor.value } } },
    colors: [themeColors.value.primary],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      x: {
        formatter: function (val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartSlowMovingSeries = computed(() => {
  const validData = statisticsList.value.filter(i => i.current_stock > 0);
  const sorted = validData.sort((a, b) => b.current_stock - a.current_stock).slice(0, chartMaxCap.value);
  return [{ name: 'Sisa Stok Aktual', data: sorted.map(i => i.current_stock) }];
});
const chartSlowMovingOptions = computed(() => {
  const validData = statisticsList.value.filter(i => i.current_stock > 0);
  const sorted = validData.sort((a, b) => b.current_stock - a.current_stock).slice(0, chartMaxCap.value);
  return {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: sorted.map(i => i.sku), labels: { style: { colors: labelColor.value } } },
    yaxis: { labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    colors: [themeColors.value.warning],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      x: {
        formatter: function (val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartActivitySeries = computed(() => {
  const sorted = [...statisticsList.value]
    .sort((a, b) => (b.total_sold + b.total_inbound) - (a.total_sold + a.total_inbound))
    .slice(0, chartMaxCap.value);
  return [
    { name: 'Mutasi Keluar', data: sorted.map(i => i.total_sold) },
    { name: 'Mutasi Masuk', data: sorted.map(i => i.total_inbound) }
  ];
});
const chartActivityOptions = computed(() => {
  const sorted = [...statisticsList.value]
    .sort((a, b) => (b.total_sold + b.total_inbound) - (a.total_sold + a.total_inbound))
    .slice(0, chartMaxCap.value);
  return {
    chart: { type: 'area', background: 'transparent', stacked: false, toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: sorted.map(i => i.sku), labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    yaxis: { labels: { style: { colors: labelColor.value } } },
    colors: [themeColors.value.danger, themeColors.value.success],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    legend: { labels: { colors: labelColor.value } },
    dataLabels: { enabled: false },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      x: {
        formatter: function (val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartFastMovingSeries = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).slice(0, chartMaxCap.value);
  return [{ name: 'Rata-rata Keluar', data: sorted.map(i => i.avg_daily_sales) }];
});
const chartFastMovingOptions = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.avg_daily_sales - a.avg_daily_sales).slice(0, chartMaxCap.value);
  return {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    xaxis: { categories: sorted.map(i => i.sku), labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    yaxis: { labels: { style: { colors: labelColor.value } } },
    colors: [themeColors.value.accent],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      x: {
        formatter: function(val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartUrgentRestockSeries = computed(() => {
  const validData = statisticsList.value.filter(i => i.days_of_inventory !== null && i.days_of_inventory > 0 && i.days_of_inventory < 90);
  const sorted = validData.sort((a, b) => a.days_of_inventory - b.days_of_inventory).slice(0, chartMaxCap.value);
  return [{ name: 'Sisa Umur Stok (Hari)', data: sorted.map(i => i.days_of_inventory) }];
});
const chartUrgentRestockOptions = computed(() => {
  const validData = statisticsList.value.filter(i => i.days_of_inventory !== null && i.days_of_inventory > 0 && i.days_of_inventory < 90);
  const sorted = validData.sort((a, b) => a.days_of_inventory - b.days_of_inventory).slice(0, chartMaxCap.value);
  return {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: sorted.map(i => i.sku), labels: { style: { colors: labelColor.value } } },
    yaxis: { labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    colors: [themeColors.value.danger],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      x: {
        formatter: function(val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartFlowBalanceSeries = computed(() => {
  let totalIn = 0;
  let totalOut = 0;
  statisticsList.value.forEach(item => {
    totalIn += Number(item.total_inbound) || 0;
    totalOut += Number(item.total_sold) || 0;
  });
  return [totalIn, totalOut];
});
const chartFlowBalanceOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  labels: ['Total Mutasi Masuk (Inbound)', 'Total Mutasi Keluar (Out/Terjual)'],
  colors: [themeColors.value.success, themeColors.value.danger],
  theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
  plotOptions: { pie: { donut: { size: '70%' }, expandOnClick: false } },
  dataLabels: { enabled: false },
  legend: { position: 'bottom', labels: { colors: labelColor.value } },
  stroke: { show: false }
}));

const chartScatterSeries = computed(() => {
  const safeData = [];
  const warningData = [];
  const criticalData = [];
  const overstockData = [];

  const source = statisticsList.value.slice(0, chartMaxCap.value > 25 ? chartMaxCap.value : 50);

  source.forEach(item => {
    const point = { x: item.current_stock, y: parseFloat(item.avg_daily_sales) || 0, sku: item.sku, name: item.name };
    if (item.status === 'SAFE') safeData.push(point);
    else if (item.status === 'WARNING') warningData.push(point);
    else if (item.status === 'CRITICAL') criticalData.push(point);
    else if (item.status === 'OVERSTOCK') overstockData.push(point);
  });

  return [
    { name: 'Kritis', data: criticalData },
    { name: 'Aman', data: safeData },
    { name: 'Warning', data: warningData },
    { name: 'Overstock', data: overstockData }
  ];
});

const chartScatterOptions = computed(() => ({
  chart: { type: 'scatter', background: 'transparent', toolbar: { show: false }, zoom: { type: 'xy' } },
  colors: [themeColors.value.danger, themeColors.value.success, themeColors.value.warning, themeColors.value.primary],
  xaxis: { 
    title: { text: 'Sisa Stok Faktual (Pcs)', style: { color: labelColor.value, fontSize: '12px' } },
    labels: { style: { colors: labelColor.value } }
  },
  yaxis: { 
    title: { text: 'Rata-Rata Keluar per Hari', style: { color: labelColor.value, fontSize: '12px' } },
    labels: { style: { colors: labelColor.value } }
  },
  theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
  legend: { position: 'top', labels: { colors: labelColor.value } },
  tooltip: {
    theme: isDarkTheme.value ? 'dark' : 'light',
    custom: function({series, seriesIndex, dataPointIndex, w}) {
      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
      return `<div class="p-3 bg-background border border-secondary text-text text-xs rounded shadow-lg min-w-[200px]">
        <strong class="text-sm border-b border-secondary pb-1 mb-2 block">${data.sku}</strong>
        <span class="text-text/70 mb-2 block whitespace-normal leading-tight">${data.name}</span>
        <div class="flex justify-between items-center bg-secondary/20 p-1.5 rounded">
           <span>Sisa Stok Fisik:</span> <b>${data.x}</b>
        </div>
        <div class="flex justify-between items-center bg-primary/10 p-1.5 mt-1 rounded">
           <span class="text-primary">Laju Keluar Harian:</span> <b class="text-primary">${data.y}</b>
        </div>
      </div>`;
    }
  }
}));
</script>

<template>
  <div class="space-y-6">
    <div
      class="mb-6 border-b border-secondary/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 class="text-lg font-bold text-text">Pergerakan Stok</h3>
        <p class="text-sm text-text/50 mt-1">Data penjualan, inbound, dan estimasi waktu sisa stok berdasarkan rata-rata
          harian.</p>
      </div>

      <Tabs v-model="viewMode"
        :tabs="[{ label: 'Tabel Data', value: 'table' }, { label: 'Grafik & Insight', value: 'chart' }]" />
    </div>
    <!-- Filter Controls -->
    <div class="bg-background border border-secondary p-4 rounded-xl flex flex-col gap-4 shadow-sm mb-6">
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

        <div class="flex flex-wrap gap-4 items-center flex-1 w-full">
          <div class="w-full sm:w-auto">
            <DateRangeFilter v-model:startDate="filterValues.startDate" v-model:endDate="filterValues.endDate"
              align="left" />
          </div>

          <div class="flex-1 w-full sm:w-auto min-w-[200px]">
            <SearchInput v-model="filterValues.searchQuery" placeholder="Cari SKU atau Nama Produk..." />
          </div>
        </div>

        <div class="flex flex-wrap gap-2 w-full lg:w-auto align-middle">
          <button @click="showAdvancedFilters = !showAdvancedFilters"
            class="h-[42px] px-4 flex items-center justify-center gap-2 border rounded-lg text-sm font-semibold transition-colors bg-background flex-1 sm:flex-none whitespace-nowrap"
            :class="showAdvancedFilters || filterValues.building.length || filterValues.status !== 'all' || filterValues.movement !== 'all' ? 'border-primary text-primary bg-primary/5' : 'border-secondary text-text/70 hover:bg-secondary/10'">
            <font-awesome-icon icon="fa-solid fa-sliders" />
            <span class="hidden sm:inline">Filter Lanjutan</span>
            <font-awesome-icon :icon="showAdvancedFilters ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
              class="text-[10px] ml-1 opacity-50" />
          </button>

          <button v-if="canExport" @click="handleExport" :disabled="isExporting || isDataLoading"
            class="h-[42px] px-4 bg-accent text-secondary border border-accent rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-50 whitespace-nowrap">
            <font-awesome-icon v-if="isExporting" icon="fa-solid fa-spinner" spin />
            <font-awesome-icon v-else icon="fa-solid fa-file-excel" />
            <span class="hidden sm:inline">Export Excel</span>
          </button>

          <button @click="applyFilters" :disabled="isDataLoading"
            class="h-[42px] px-6 bg-primary text-secondary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex-1 sm:flex-none flex justify-center items-center whitespace-nowrap">
            <font-awesome-icon v-if="isDataLoading" icon="fa-solid fa-spinner" spin class="mr-2" />
            Terapkan
          </button>
        </div>
      </div>

      <div v-show="showAdvancedFilters"
        class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-secondary/20 pt-4 mt-2 animate-fade-in">
        <!-- Gedung -->
        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Lokasi / Gedung</label>
          <BaseSelect
            v-model="filterValues.building"
            :options="reportFilters.allBuildings"
            :multiple="true"
            placeholder="Semua Gedung"
          />
        </div>

        <!-- Status -->
        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Status Stok</label>
          <BaseSelect
            v-model="filterValues.status"
            :options="stockStatusOptions"
            emitValue
            :searchable="false"
          />
        </div>

        <!-- Aktivitas -->
        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Aktivitas Transaksi</label>
          <BaseSelect
            v-model="filterValues.movement"
            :options="movementOptions"
            emitValue
            :searchable="false"
          />
        </div>
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="flex flex-col lg:flex-row gap-6 items-start">
      <!-- Table Section -->
      <main class="flex-1 w-full min-w-0 bg-background border border-secondary rounded-xl overflow-hidden shadow-sm"
        v-if="viewMode === 'table'">
        <div class="overflow-auto max-h-[650px]" @scroll="handleTableScroll">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead
              class="bg-background border-b border-secondary sticky top-0 z-10 after:absolute after:inset-0 after:bg-secondary/20 after:-z-10">
              <tr>
                <th @click="sortBy('sku')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 relative">
                  <div class="flex items-center gap-2">SKU <font-awesome-icon :icon="getSortIcon('sku')"
                      class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('name')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 w-full min-w-[250px]">
                  <div class="flex items-center gap-2">Nama Produk <font-awesome-icon :icon="getSortIcon('name')"
                      class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('total_sold')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40">
                  <div class="flex items-center gap-2">Out <font-awesome-icon :icon="getSortIcon('total_sold')"
                      class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('total_inbound')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40">
                  <div class="flex items-center gap-2">Inbound <font-awesome-icon :icon="getSortIcon('total_inbound')"
                      class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('current_stock')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40">
                  <div class="flex items-center gap-2">Sisa Stok <font-awesome-icon :icon="getSortIcon('current_stock')"
                      class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('avg_daily_sales')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40">
                  <div class="flex items-center gap-2">Avg. Out <font-awesome-icon
                      :icon="getSortIcon('avg_daily_sales')" class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('days_of_inventory')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40">
                  <div class="flex items-center gap-2">Ketahanan <font-awesome-icon
                      :icon="getSortIcon('days_of_inventory')" class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('status')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 text-center">
                  <div class="flex justify-center items-center gap-2">Stat <font-awesome-icon
                      :icon="getSortIcon('status')" class="text-xs opacity-50" /></div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary/20">
              <template v-if="isDataLoading">
                <tr>
                  <td colspan="8" class="text-center py-16 text-text/60">
                    <font-awesome-icon icon="fa-solid fa-circle-notch" spin class="text-3xl mb-4 text-primary" />
                    <p class="font-medium">Memuat data statistik...</p>
                  </td>
                </tr>
              </template>
              <template v-else-if="displayedData.length === 0">
                <tr>
                  <td colspan="8" class="text-center py-16 text-text/60">
                    <font-awesome-icon icon="fa-solid fa-folder-open" class="text-3xl mb-4 opacity-50" />
                    <p class="font-medium">Tidak ada data untuk saringan ini.</p>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="item in visibleData" :key="item.sku" class="hover:bg-secondary/10 transition-colors">
                  <td class="px-4 py-2 font-medium text-text bg-background/50 border-r border-secondary/10 w-auto">{{
                    item.sku
                    }}</td>
                  <td class="px-4 py-2 w-full">
                    <div class="whitespace-normal leading-relaxed pr-4 text-text/90" :title="item.name">{{ item.name }}
                    </div>
                  </td>
                  <td class="px-4 py-2 text-text/90 font-medium whitespace-nowrap">
                    {{ item.total_sold }} <span v-if="item.total_sold > 0" class="text-danger text-[10px] ml-1"></span>
                  </td>
                  <td class="px-4 py-2 text-success font-medium whitespace-nowrap">
                    {{ item.total_inbound }} <span v-if="item.total_inbound > 0"
                      class="text-success text-[10px] ml-1"></span>
                  </td>
                  <td class="px-4 py-2 font-bold" :class="item.current_stock < 0 ? 'text-danger' : 'text-text'">
                    {{ item.current_stock }}
                  </td>
                  <td class="px-4 py-2 text-text/80 font-medium tracking-wide whitespace-nowrap">{{ item.avg_daily_sales
                  }} /hr</td>
                  <td class="px-4 py-2 font-medium whitespace-nowrap">
                    <span v-if="item.days_of_inventory === null || item.days_of_inventory < 0"
                      class="text-text/30 font-bold tracking-widest">---</span>
                    <span v-else>{{ item.days_of_inventory }} Hari</span>
                  </td>
                  <td class="px-4 py-2 text-center min-w-[120px]">
                    <span
                      class="px-3 py-1.5 rounded-full text-[10px] font-bold border block text-center uppercase tracking-wider"
                      :class="getStatusClass(item.status)">
                    </span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </main>

      <main class="flex-1 w-full min-w-0" v-else>
        <!-- Chart Controls -->
        <div class="flex justify-end mb-4 animate-fade-in" v-if="statisticsList.length > 0">
          <div class="flex items-center gap-3 w-48">
            <span class="text-sm font-semibold text-text/70 whitespace-nowrap">Data Teratas:</span>
            <BaseSelect
              v-model="chartMaxCap"
              :options="chartMaxCapOptions"
              emitValue
              :searchable="false"
            />
          </div>
        </div>

        <!-- Chart Dashboard -->
        <div class="grid grid-cols-1 gap-6 animate-fade-in md:pb-12" v-if="statisticsList.length > 0">

          <!-- Card: Status Distribusi -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Distribusi Status Stok</h4>
            <div class="flex-1 flex items-center justify-center">
              <VueApexCharts width="100%" height="300" type="donut" :options="chartStatusOptions"
                :series="chartStatusSeries" />
            </div>
          </div>

          <!-- Card: Top Sales -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Top {{ chartMaxCap }} Barang Paling Sering Keluar (Mutasi Out)
            </h4>
            <div class="flex-1">
              <VueApexCharts width="100%" height="300" type="bar" :options="chartTopSalesOptions"
                :series="chartTopSalesSeries" />
            </div>
          </div>

          <!-- Card: Aktivitas Tertinggi -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Volume Aktivitas: Masuk VS Keluar (Top {{ chartMaxCap }})</h4>
            <div class="flex-1 border-b border-transparent">
              <VueApexCharts width="100%" height="300" type="area" :options="chartActivityOptions"
                :series="chartActivitySeries" />
            </div>
          </div>

          <!-- Card: Dead / Slow Stock -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Top {{ chartMaxCap }} Sisa Stok Menumpuk Terbanyak (Overstock /
              Slow)
            </h4>
            <div class="flex-1">
              <VueApexCharts width="100%" height="300" type="bar" :options="chartSlowMovingOptions"
                :series="chartSlowMovingSeries" />
            </div>
          </div>

          <!-- Card: Fast Moving -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Top {{ chartMaxCap }} Laju Penjualan Terkencang (Fast-Moving)</h4>
            <p class="text-xs text-text/50 mb-2">Mengurutkan barang berdasarkan rata-rata mutasi keluar harian tertinggi.</p>
            <div class="flex-1">
              <VueApexCharts width="100%" height="300" type="bar" :options="chartFastMovingOptions" :series="chartFastMovingSeries" />
            </div>
          </div>

          <!-- Card: Urgent Restock -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-danger text-sm mb-4">Top {{ chartMaxCap }} Prioritas Restock Darurat (Kritis)</h4>
            <p class="text-xs text-text/50 mb-2">Mengurutkan barang berdasarkan sisa "hari" stok terpendek sebelum habis sepenuhnya.</p>
            <div class="flex-1">
              <VueApexCharts width="100%" height="300" type="bar" :options="chartUrgentRestockOptions" :series="chartUrgentRestockSeries" />
            </div>
          </div>

          <!-- Card: Flow Balance -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[400px]">
            <h4 class="font-bold text-text text-sm mb-4">Rasio Volume Mutasi Gudang Total (In vs Out)</h4>
            <p class="text-xs text-text/50 mb-2 text-center">Menjumlahkan seluruh kuantitas Inbound vs Pengeluaran dalam periode filter ini.</p>
            <div class="flex-1 flex items-center justify-center">
              <VueApexCharts width="100%" height="300" type="donut" :options="chartFlowBalanceOptions" :series="chartFlowBalanceSeries" />
            </div>
          </div>

          <!-- Card: Scatter Plot -->
          <div class="bg-background border border-secondary p-5 rounded-xl shadow-sm flex flex-col min-h-[500px]">
            <h4 class="font-bold text-text text-sm mb-4">Kuadran Analisis Gudang (Sisa Stok vs Laju Penjualan)</h4>
            <p class="text-xs text-text/50 mb-2">Titik di kanan bawah berarti Kritis (Stok sedikit, keluar sangat kencang). Titik di kiri atas berarti Dead Stock (Terlalu banyak stok, tidak bergerak).</p>
            <div class="flex-1 items-stretch">
              <VueApexCharts width="100%" height="400" type="scatter" :options="chartScatterOptions" :series="chartScatterSeries" />
            </div>
          </div>

        </div>

        <div v-else
          class="bg-background border border-secondary rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <font-awesome-icon icon="fa-solid fa-chart-pie" class="text-4xl mb-4 text-text/30" />
          <h4 class="font-bold text-text text-lg">Tidak ada data visualisasi</h4>
          <p class="text-text/60 mt-2 text-sm max-w-sm">Jalankan filter dan dapatkan hasil pencarian untuk mulai melihat
            dan
            menganalisis statistik berbentuk grafik.</p>
        </div>
      </main>
    </div>
  </div>
</template>
