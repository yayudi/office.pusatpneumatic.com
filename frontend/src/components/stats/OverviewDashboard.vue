<!-- src/components/stats/OverviewDashboard.vue -->
<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { formatNumber, formatCurrency } from '@/utils/formatters.js'

const auth = useAuthStore()

const props = defineProps({
  kpiData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['navigate'])

const todayDateString = computed(() => {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const quickLinks = computed(() => {
  const links = [
    {
      key: 'stock-movement',
      title: 'Pergerakan Stok',
      desc: 'Analisis In/Out & Fast-Moving Product',
      icon: 'fa-solid fa-arrow-right-arrow-left',
      colorClass: 'text-primary bg-primary/10 border-primary/20 group-hover:bg-primary group-hover:text-white'
    },
    {
      key: 'time-performance',
      title: 'Performa Waktu',
      desc: 'Kecepatan Proses Order Fulfillment',
      icon: 'fa-solid fa-stopwatch',
      colorClass: 'text-warning bg-warning/10 border-warning/20 group-hover:bg-warning group-hover:text-black'
    }
  ]

  if (auth.hasPermission('statistic.finance.view')) {
    links.splice(1, 0, {
      key: 'inventory-value',
      title: 'Nilai Inventaris',
      desc: 'Valuasi Modal & Aset Gudang',
      icon: 'fa-solid fa-sack-dollar',
      colorClass: 'text-success bg-success/10 border-success/20 group-hover:bg-success group-hover:text-white'
    })
    links.push({
      key: 'channel-performance',
      title: 'Performa Toko',
      desc: 'Omset & Tren Penjualan per Saluran',
      icon: 'fa-solid fa-store',
      colorClass: 'text-accent bg-accent/10 border-accent/20 group-hover:bg-accent group-hover:text-white'
    })
  }

  return links
})
</script>

<template>
  <div class="space-y-8 animate-fade-in">
    <!-- Header Section -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-secondary/20 pb-6"
    >
      <div>
        <h2 class="text-2xl font-black text-text mb-1 tracking-tight">Executive Summary</h2>
        <p class="text-sm text-text/60">Ringkasan performa gudang dan analitik WMS secara keseluruhan.</p>
      </div>
      <div class="bg-background border border-secondary/30 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
        <font-awesome-icon icon="fa-solid fa-calendar-day" class="text-primary text-sm" />
        <span class="text-xs font-bold text-text/80 uppercase tracking-wider">{{ todayDateString }}</span>
      </div>
    </div>

    <!-- 4 KPI Cards (Glassmorphism & Gradients) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- KPI 1 -->
      <div class="group relative overflow-hidden bg-background border border-secondary/20 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-success/10 rounded-full blur-2xl group-hover:bg-success/20 transition-all"></div>
        <div class="relative z-10 flex flex-col h-full justify-between">
          <div class="flex justify-between items-start mb-3 gap-2">
            <p class="text-[11px] font-extrabold text-text/50 uppercase tracking-widest leading-tight">List Selesai Hari Ini</p>
            <div class="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shrink-0 group-hover:scale-110 transition-transform">
              <font-awesome-icon icon="fa-solid fa-check-double" class="text-lg" />
            </div>
          </div>
          <p class="text-3xl font-black text-text w-full truncate" :title="formatNumber(props.kpiData.listsCompletedToday)">
            {{ formatNumber(props.kpiData.listsCompletedToday) }}
          </p>
        </div>
      </div>

      <!-- KPI 2 -->
      <div class="group relative overflow-hidden bg-background border border-secondary/20 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
        <div class="relative z-10 flex flex-col h-full justify-between">
          <div class="flex justify-between items-start mb-3 gap-2">
            <p class="text-[11px] font-extrabold text-text/50 uppercase tracking-widest leading-tight">Item Terambil (PCS)</p>
            <div class="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
              <font-awesome-icon icon="fa-solid fa-box-open" class="text-lg" />
            </div>
          </div>
          <p class="text-3xl font-black text-text w-full truncate" :title="formatNumber(props.kpiData.itemsPickedToday)">
            {{ formatNumber(props.kpiData.itemsPickedToday) }}
          </p>
        </div>
      </div>

      <!-- KPI 3 -->
      <div class="group relative overflow-hidden bg-background border border-secondary/20 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-warning/10 rounded-full blur-2xl group-hover:bg-warning/20 transition-all"></div>
        <div class="relative z-10 flex flex-col h-full justify-between">
          <div class="flex justify-between items-start mb-3 gap-2">
            <p class="text-[11px] font-extrabold text-text/50 uppercase tracking-widest leading-tight">User Aktif Gudang</p>
            <div class="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0 group-hover:scale-110 transition-transform">
              <font-awesome-icon icon="fa-solid fa-users" class="text-lg" />
            </div>
          </div>
          <p class="text-3xl font-black text-text w-full truncate" :title="formatNumber(props.kpiData.usersActiveToday)">
            {{ formatNumber(props.kpiData.usersActiveToday) }}
          </p>
        </div>
      </div>

      <!-- KPI 4 -->
      <div v-if="auth.hasPermission('statistic.finance.view')" class="group relative overflow-hidden bg-background border border-secondary/20 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div class="absolute -right-6 -top-6 w-24 h-24 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-all"></div>
        <div class="relative z-10 flex flex-col h-full justify-between">
          <div class="flex justify-between items-start mb-3 gap-2">
            <p class="text-[11px] font-extrabold text-text/50 uppercase tracking-widest leading-tight">Total Nilai Inventaris</p>
            <div class="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0 group-hover:scale-110 transition-transform">
              <font-awesome-icon icon="fa-solid fa-vault" class="text-lg" />
            </div>
          </div>
          <p class="text-2xl font-black text-text w-full truncate" :title="formatCurrency(props.kpiData.totalInventoryValue)">
            {{ formatCurrency(props.kpiData.totalInventoryValue) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Bento Box Navigation (Quick Insights & Shortcuts) -->
    <div>
      <h3 class="text-lg font-bold text-text mb-4">Navigasi Laporan Analitik</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          v-for="link in quickLinks"
          :key="link.key"
          @click="emit('navigate', link.key)"
          class="group text-left bg-background border border-secondary/30 rounded-2xl p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-36 relative overflow-hidden"
        >
          <div
            :class="[
              'w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-300',
              link.colorClass
            ]"
          >
            <font-awesome-icon :icon="link.icon" class="text-lg" />
          </div>
          <div class="mt-4 relative z-10">
            <h4 class="font-bold text-text mb-1 group-hover:text-primary transition-colors">{{ link.title }}</h4>
            <p class="text-[11px] text-text/50 leading-tight">{{ link.desc }}</p>
          </div>
          <!-- Decorative Background Arrow -->
          <font-awesome-icon
            icon="fa-solid fa-arrow-right"
            class="absolute -right-4 -bottom-4 text-6xl opacity-0 group-hover:opacity-5 text-primary transition-all duration-500 group-hover:-translate-x-2 group-hover:-translate-y-2"
          />
        </button>
      </div>
    </div>
  </div>
</template>
