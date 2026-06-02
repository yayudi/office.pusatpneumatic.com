<!-- frontend\src\layouts\WMSActionsLayout.vue -->
<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import WmsActionHeader from '@/components/wms/shared/WmsActionHeader.vue'

const route = useRoute()

const actionRoutes = [
  { name: 'Batch Movement', path: '/wms/actions/batch-movement', icon: 'fa-solid fa-truck-ramp-box' },
  { name: 'Retur', path: '/wms/actions/return', icon: 'fa-solid fa-rotate-left' },
  { name: 'Picking List', path: '/wms/actions/picking-list', icon: 'fa-solid fa-boxes-packing' },
  { name: 'Request Stok', path: '/wms/actions/stock-requests', icon: 'fa-solid fa-file-import' },
  { name: 'Opname', path: '/wms/actions/batch-adjustment', icon: 'fa-solid fa-clipboard-list' },
  { name: 'Batch Log', path: '/wms/actions/batch-log', icon: 'fa-solid fa-clock-rotate-left' }
]

const routeMetaMap = {
  '/wms/actions/batch-movement': {
    title: "Batch <span class='text-primary'>Movement</span>",
    iconClass: 'text-primary',
    description: 'Kelola pemindahan stok & mutasi barang antar lokasi di dalam gudang.'
  },
  '/wms/actions/return': {
    title: "Retur <span class='text-danger'>Penjualan</span>",
    iconClass: 'text-danger',
    description: 'Kelola barang masuk dari retur customer (Marketplace/Offline).'
  },
  '/wms/actions/picking-list': {
    title: "Picking <span class='text-success'>Gudang</span>",
    iconClass: 'text-success',
    description: 'Kelola tugas pengambilan barang & laporan penjualan.'
  },
  '/wms/actions/stock-requests': {
    title: "Permintaan <span class='text-accent'>Stok</span>",
    iconClass: 'text-accent',
    description: 'Buat & tinjau permohonan transfer stok antar departemen atau cabang.'
  },
  '/wms/actions/batch-adjustment': {
    title: "Stock <span class='text-danger'>Adjustment</span>",
    iconClass: 'text-danger',
    description: 'Lakukan penyesuaian kuantitas stok fisik (opname) & koreksi selisih barang.'
  },
  '/wms/actions/batch-log': {
    title: "Batch <span class='text-warning'>Log</span>",
    iconClass: 'text-warning',
    description: 'Pantau riwayat aktivitas transaksi & mutasi log untuk setiap batch barang.'
  }
}

const currentHeader = computed(() => {
  const currentPath = route.path
  const baseRoute = actionRoutes.find(r => currentPath.includes(r.path))
  const meta = routeMetaMap[baseRoute?.path] || {}

  return {
    title: meta.title || baseRoute?.name || 'Manajemen Stok',
    icon: baseRoute?.icon || 'fa-solid fa-boxes-stacked',
    iconClass: meta.iconClass || 'text-text',
    description: meta.description || ''
  }
})
</script>

<template>
  <div class="mb-4 w-full">
    <!-- Header Utama (Reaktif via Route) & Back Button -->
    <WmsActionHeader
      :title="currentHeader.title"
      :icon="currentHeader.icon"
      :iconClass="currentHeader.iconClass"
      :description="currentHeader.description"
      class="mb-[1vh]"
    >
      <template #actions>
        <router-link
          to="/wms"
          class="text-sm text-primary border border-primary/20 hover:bg-primary/10 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-bold whitespace-nowrap shadow-sm bg-background w-full sm:w-auto"
        >
          <font-awesome-icon icon="fa-solid fa-arrow-left" />
          <span>Kembali</span>
        </router-link>
      </template>
    </WmsActionHeader>

    <!-- Navigasi Sekunder (Tabs) -->
    <nav class="mt-2 w-full overflow-x-auto custom-scrollbar pb-1">
      <div class="flex border-b border-secondary/30 justify-center w-max md:w-full">
        <router-link
          v-for="route in actionRoutes"
          :key="route.path"
          :to="route.path"
          class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
          active-class="border-primary text-primary"
          exact-active-class="border-primary text-primary"
        >
          <font-awesome-icon :icon="route.icon" class="mr-2" />
          <span>{{ route.name }}</span>
        </router-link>
      </div>
    </nav>
  </div>

  <!-- Area Konten Dinamis (diisi oleh child route) -->
  <main class="w-full">
    <RouterView />
  </main>
</template>

<style lang="postcss" scoped>
/* Styling untuk link yang tidak aktif */
a:not(.border-primary) {
  @apply text-text/60 border-transparent hover:border-secondary/50 hover:text-text;
}
</style>
