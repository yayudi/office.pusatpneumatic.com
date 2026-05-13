<script setup>
import { ref, watch, onMounted, computed, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast.js';
import { useTheme } from '@/composables/useTheme.js';
import { getInventoryValueStatistics } from '@/api/helpers/statistics.js';
import SearchInput from '@/components/ui/SearchInput.vue';
import { useMasterDataStore } from '@/stores/masterData';

const masterData = useMasterDataStore();
import BaseSelect from '@/components/ui/BaseSelect.vue';
import Tabs from '@/components/ui/Tabs.vue';
import VueApexCharts from 'vue3-apexcharts';
import { formatCurrency, formatNumber } from '@/utils/formatters.js';

import { useStatsTable } from '@/composables/useStatsTable.js';
import StatsChartCard from './shared/StatsChartCard.vue';
import StatsFilterBar from './shared/StatsFilterBar.vue';

const authStore = useAuthStore();
const { toast } = useToast();

const isDataLoading = ref(false);
const showAdvancedFilters = ref(false);
const statisticsList = ref([]);
const viewMode = ref('table');
const chartMaxCap = ref(10);

const {
  sortKey,
  sortDesc,
  displayedData,
  visibleData,
  sortBy,
  getSortIcon,
  handleTableScroll
} = useStatsTable(statisticsList, { initialSortKey: 'total_value' });
const fetchStatistics = async () => {
  isDataLoading.value = true;
  try {
    const data = await getInventoryValueStatistics(filterValues.value);
    statisticsList.value = data.data || [];
  } catch (error) {
    toast(error.message || 'Gagal mengambil data statistik', 'error');
  } finally {
    isDataLoading.value = false;
  }
};

const applyFilters = () => {
  fetchStatistics();
};


const filterValues = ref({
  searchQuery: '',
  stockStatus: 'all',
  building: [],
  purpose: '',
  isPackage: '',
  categoryId: 'all'
});

const reportFilters = ref({
  allBuildings: [],
  purposes: [],
  allCategories: []
});

const purposeOptions = computed(() => [
  { id: '', label: 'Semua Tujuan' },
  ...(reportFilters.value.purposes || []).map(p => ({ id: p, label: p }))
]);

const stockStatusOptions = [
  { id: 'all', label: 'Semua' },
  { id: 'positive', label: 'Positif (Berstok)' },
  { id: 'negative', label: 'Minus / Error' },
  { id: 'zero', label: 'Kosong (Nol)' }
];

const isPackageOptions = [
  { id: '', label: 'Semua Komponen' },
  { id: '0', label: 'Tunggal (Part)' },
  { id: '1', label: 'Paket Bundle' }
];

const chartMaxCapOptions = [
  { id: 10, label: 'Top 10 Kontributor' },
  { id: 20, label: 'Top 20 Kontributor' },
  { id: 50, label: 'Top 50 Kontributor' }
];

const { themeColors, isDarkTheme } = useTheme();

onMounted(async () => {
  try {
    const res = await masterData.getReportFilters();
    if (res) {
      reportFilters.value.allBuildings = res.allBuildings || [];
      reportFilters.value.purposes = res.purposes || [];
    }

    const categories = await masterData.getCategories();
    reportFilters.value.allCategories = [
      { id: 'all', label: 'Semua Kategori' },
      ...categories.map(c => ({ id: c.id, label: c.name }))
    ];
  } catch (error) {
    console.error("Gagal memuat filter laporan", error);
  }

  fetchStatistics();
});

// Formatters removed (using utility)

const labelColor = computed(() => themeColors.value.text);

const chartTopAssetsSeries = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_value - a.total_value).slice(0, chartMaxCap.value);
  return [{ name: 'Total Nilai (Rp)', data: sorted.map(i => i.total_value) }];
});
const chartTopAssetsOptions = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_value - a.total_value).slice(0, chartMaxCap.value);
  return {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: {
      categories: sorted.map(i => i.sku),
      labels: {
        style: { colors: labelColor.value },
        formatter: function (val) {
          return "Rp " + val / 1000000 + "M"; // Simplification for ticks
        }
      }
    },
    yaxis: { labels: { style: { colors: labelColor.value, cssClass: 'text-[10px]' } } },
    colors: [themeColors.value.primary],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    dataLabels: { enabled: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      y: {
        formatter: function (val) { return formatCurrency(val); }
      },
      x: {
        formatter: function (val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});

const chartTopAssetProportionSeries = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_value - a.total_value).slice(0, 5); // Hanya Top 5 untuk Pie Chart
  return sorted.map(i => i.total_value);
});
const chartTopAssetProportionOptions = computed(() => {
  const sorted = [...statisticsList.value].sort((a, b) => b.total_value - a.total_value).slice(0, 5);
  return {
    chart: { type: 'donut', background: 'transparent' },
    labels: sorted.map(i => i.sku),
    colors: [themeColors.value.primary, themeColors.value.accent, themeColors.value.warning, themeColors.value.success, themeColors.value.danger],
    theme: { mode: isDarkTheme.value ? 'dark' : 'light' },
    plotOptions: { pie: { donut: { size: '65%' }, expandOnClick: false } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom', labels: { colors: labelColor.value } },
    stroke: { show: false },
    tooltip: {
      theme: isDarkTheme.value ? 'dark' : 'light',
      y: { formatter: function (val) { return formatCurrency(val); } },
      x: {
        formatter: function (val) {
          const product = statisticsList.value.find(p => p.sku === val);
          return product ? product.name : val;
        }
      }
    }
  };
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div
      class="mb-6 border-b border-secondary/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h3 class="text-lg font-bold text-text">Laporan Nilai Inventaris</h3>
        <p class="text-sm text-text/50 mt-1">Data sebaran aset gudang, valuasi barang, dan top kontributor aset.</p>
      </div>

      <Tabs v-model="viewMode"
        :tabs="[{ label: 'Tabel Data', value: 'table' }, { label: 'Grafik & Insight', value: 'chart' }]" />
    </div>

    <!-- Filter Controls -->
    <StatsFilterBar :loading="isDataLoading" @apply="applyFilters"
      :hasActiveAdvancedFilters="!!filterValues.building.length || filterValues.stockStatus !== 'all' || filterValues.purpose">
      <template #main>
        <div class="flex-1 w-full sm:w-auto min-w-[300px]">
          <SearchInput v-model="filterValues.searchQuery" placeholder="Cari SKU atau Nama Produk..." />
        </div>
      </template>

      <template #advanced>
        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Lokasi / Gedung</label>
          <BaseSelect v-model="filterValues.building" :options="reportFilters.allBuildings" :multiple="true"
            placeholder="Semua Gedung" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Tujuan Rak</label>
          <BaseSelect v-model="filterValues.purpose" :options="purposeOptions" emitValue :searchable="false" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Status Stok</label>
          <BaseSelect v-model="filterValues.stockStatus" :options="stockStatusOptions" emitValue :searchable="false" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Tipe Barang</label>
          <BaseSelect v-model="filterValues.isPackage" :options="isPackageOptions" emitValue :searchable="false" />
        </div>

        <div>
          <label class="block text-xs font-semibold text-text/60 mb-2">Kategori Produk</label>
          <BaseSelect v-model="filterValues.categoryId" :options="reportFilters.allCategories" emitValue
            :searchable="true" />
        </div>
      </template>
    </StatsFilterBar>

    <!-- Main Content Layout -->
    <div class="flex flex-col lg:flex-row gap-6 items-start">
      <!-- Table Section -->
      <main class="flex-1 w-full min-w-0 bg-background border border-secondary rounded-xl overflow-hidden shadow-sm"
        v-if="viewMode === 'table'">
        <!-- Stat Summary Bars -->
        <div
          class="grid grid-cols-2 md:grid-cols-4 border-b border-secondary/20 divide-x divide-y md:divide-y-0 divide-secondary/20">
          <div class="p-4 bg-secondary/5">
            <span class="text-xs font-bold text-text/50 uppercase block mb-1">Total SKU Tampil</span>
            <span class="text-2xl font-black">{{ formatNumber(statisticsList.length) }}</span>
          </div>
          <div class="p-4 bg-secondary/5">
            <span class="text-xs font-bold text-text/50 uppercase block mb-1">Total Unit (Pcs)</span>
            <span class="text-2xl font-black text-warning">{{formatNumber(statisticsList.reduce((acc, curr) => acc +
              curr.total_quantity, 0))}}</span>
          </div>
          <div class="p-4 bg-primary/5 col-span-2 md:col-span-2 items-center flex justify-between">
            <div>
              <span class="text-xs font-bold text-primary/70 uppercase block mb-1">Total Nilai Keseluruhan</span>
              <span class="text-2xl font-black text-text">{{formatCurrency(statisticsList.reduce((acc, curr) => acc +
                curr.total_value, 0))}}</span>
            </div>
            <div class="text-4xl text-primary/80"><font-awesome-icon icon="fa-solid fa-vault" /></div>
          </div>
        </div>

        <div class="overflow-auto max-h-[600px] custom-scrollbar" @scroll="handleTableScroll">
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
                <th @click="sortBy('price')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 text-right">
                  <div class="flex items-center justify-end gap-2">HPP (Modal) <font-awesome-icon
                      :icon="getSortIcon('price')" class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('total_quantity')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 text-center">
                  <div class="flex items-center justify-center gap-2">Total Stok <font-awesome-icon
                      :icon="getSortIcon('total_quantity')" class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('total_value')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 text-right">
                  <div class="flex items-center justify-end gap-2">Gross Value <font-awesome-icon
                      :icon="getSortIcon('total_value')" class="text-xs opacity-50" /></div>
                </th>
                <th @click="sortBy('percentage')"
                  class="px-4 py-4 font-semibold text-text/80 cursor-pointer hover:bg-secondary/40 text-center">
                  <div class="flex justify-center items-center gap-2">Share % <font-awesome-icon
                      :icon="getSortIcon('percentage')" class="text-xs opacity-50" /></div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary/20">
              <template v-if="isDataLoading">
                <tr>
                  <td colspan="6" class="text-center py-16 text-text/60">
                    <font-awesome-icon icon="fa-solid fa-circle-notch" spin class="text-3xl mb-4 text-primary" />
                    <p class="font-medium">Memuat data valuasi...</p>
                  </td>
                </tr>
              </template>
              <template v-else-if="displayedData.length === 0">
                <tr>
                  <td colspan="6" class="text-center py-16 text-text/60">
                    <font-awesome-icon icon="fa-solid fa-folder-open" class="text-3xl mb-4 opacity-50" />
                    <p class="font-medium">Tidak ada data untuk saringan ini.</p>
                  </td>
                </tr>
              </template>
              <template v-else>
                <tr v-for="item in visibleData" :key="item.sku" class="hover:bg-secondary/10 transition-colors">
                  <td class="px-4 py-3 font-medium text-text bg-background/50 border-r border-secondary/10 w-auto">{{
                    item.sku
                  }}</td>
                  <td class="px-4 py-3 w-full">
                    <div class="whitespace-normal leading-tight font-medium text-text/90" :title="item.name">{{
                      item.name }}
                    </div>
                    <div class="text-[10px] text-text/40 font-bold uppercase tracking-wider mt-1">{{ item.category ||
                      'NO-CATEGORY' }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono text-sm text-right whitespace-nowrap opacity-80">
                    {{ formatCurrency(item.price) }}
                  </td>
                  <td class="px-4 py-3 font-black text-center text-base"
                    :class="item.total_quantity < 0 ? 'text-danger' : (item.total_quantity === 0 ? 'text-text/30' : 'text-primary')">
                    {{ formatNumber(item.total_quantity) }}
                  </td>
                  <td class="px-4 py-3 font-mono text-sm text-right whitespace-nowrap font-bold"
                    :class="item.total_value > 10000000 ? 'text-text' : 'text-text/70'">
                    {{ formatCurrency(item.total_value) }}
                  </td>
                  <td class="px-4 py-3 font-bold whitespace-nowrap text-center text-xs">
                    <span class="inline-block w-12 text-right">{{ item.percentage }}%</span>
                    <!-- Mini progress bar -->
                    <div class="w-20 h-1.5 bg-secondary/30 rounded-full inline-block ml-2 align-middle overflow-hidden">
                      <div class="h-full bg-primary"
                        :style="{ width: `${item.percentage}%`, minWidth: item.percentage > 0 ? '2px' : '0' }"></div>
                    </div>
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
          <div class="flex items-center gap-3 w-64">
            <span class="text-sm font-semibold text-text/70 whitespace-nowrap">Tampilkan Peringkat:</span>
            <BaseSelect v-model="chartMaxCap" :options="chartMaxCapOptions" emitValue :searchable="false" />
          </div>
        </div>

        <!-- Chart Dashboard -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in md:pb-12" v-if="statisticsList.length > 0">

          <!-- Card: Top Assets Proportion -->
          <StatsChartCard title="Porsi Kekayaan Top 5 Produk vs Lainnya">
            <div class="flex-1 flex items-center justify-center -ml-4">
              <VueApexCharts width="110%" height="320" type="donut" :options="chartTopAssetProportionOptions"
                :series="chartTopAssetProportionSeries" />
            </div>
          </StatsChartCard>

          <!-- Card: Top Assets -->
          <StatsChartCard :title="`Top ${chartMaxCap} Penahan Nilai Modal (Aset Mengendap Tertinggi)`"
            class="md:col-span-2">
            <VueApexCharts width="100%" height="500" type="bar" :options="chartTopAssetsOptions"
              :series="chartTopAssetsSeries" />
          </StatsChartCard>
        </div>

        <div v-else
          class="bg-background border border-secondary rounded-xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <font-awesome-icon icon="fa-solid fa-chart-pie" class="text-4xl mb-4 text-text/30" />
          <h4 class="font-bold text-text text-lg">Tidak ada data visualisasi</h4>
          <p class="text-text/60 mt-2 text-sm max-w-sm">Jalankan filter untuk memuat ulang tabel komputasi valuasi.</p>
        </div>
      </main>
    </div>
  </div>
</template>
