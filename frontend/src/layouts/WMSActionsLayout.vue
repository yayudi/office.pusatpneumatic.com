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
  <div class="mb-2">
    <!-- Area Navigasi & Back Button -->
    <div class="flex justify-between items-center w-full">
      <!-- Header Utama (Reaktif via Route) -->
      <WmsActionHeader
        :title="currentHeader.title"
        :icon="currentHeader.icon"
        :iconClass="currentHeader.iconClass"
        :description="currentHeader.description"
        class="w-[420px]"
      />
      <!-- Navigasi Sekunder (Tabs) -->
      <nav>
        <div class="flex justify-center border-b border-secondary items-center">
          <router-link
            v-for="route in actionRoutes"
            :key="route.path"
            :to="route.path"
            class="px-4 py-3 text-sm font-semibold border-b-2 transition-colors"
            active-class="border-primary text-primary"
            exact-active-class="border-primary text-background"
          >
            <font-awesome-icon :icon="route.icon" class="mr-2" />
            {{ route.name }}
          </router-link>
        </div>
      </nav>
      <router-link to="/wms" class="text-sm text-primary hover:underline flex items-center gap-2">
        <font-awesome-icon icon="fa-solid fa-arrow-left" />
        <span>Kembali ke Dasbor WMS</span>
      </router-link>
    </div>
  </div>

  <!-- Area Konten Dinamis (diisi oleh child route) -->
  <main>
    <RouterView />
  </main>
</template>

<style lang="postcss" scoped>
/* Styling untuk link yang tidak aktif */
a:not(.border-primary) {
  @apply text-text/60 border-transparent hover:border-secondary/50 hover:text-text;
}
</style>
