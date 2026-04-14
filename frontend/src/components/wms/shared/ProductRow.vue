<!-- frontend\src\components\wms\shared\ProductRow.vue -->
<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { formatCurrency } from '@/utils/formatters.js'
import { fetchProductById } from '@/api/helpers/products.js'
import { formatNumber } from '@/api/helpers/format'
import FloatingTooltip from '@/components/ui/FloatingTooltip.vue'

const PPN_RATE = 0.11

const props = defineProps({
  product: { type: Object, required: true },
  activeView: { type: String, required: true },
  isUpdated: { type: Boolean, default: false },
  mobileLayout: { type: String, default: 'card' },
  visibleColumns: { type: Object, required: true },
})

const emit = defineEmits([
  'copy',
  'openAdjust',
  'openTransfer',
  'openHistory',
  'openEdit',
  'delete',
  'view-image',
])
const auth = useAuthStore()

// --- STATE ---
const tooltipContainer = ref(null)
const packageTriggerRef = ref(null) // Ref untuk tombol PAKET spesifik baris ini

// Location Tooltip State
const isTooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)

// Package Tooltip State
const isPackageTooltipVisible = ref(false)
const packageTooltipX = ref(0)
const packageTooltipY = ref(0)
const localComponents = ref([])
const isLoadingComponents = ref(false)
const hasFetchedComponents = ref(false)

// Menu State
const isMenuVisible = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// Price Tooltip State
const isPriceTooltipVisible = ref(false)
const priceTooltipX = ref(0)
const priceTooltipY = ref(0)

function handlePriceMouseEnter(event) {
  const rect = event.target.getBoundingClientRect()
  priceTooltipX.value = rect.left + rect.width / 2
  priceTooltipY.value = rect.top
  isPriceTooltipVisible.value = true
}

function handlePriceMouseLeave() {
  isPriceTooltipVisible.value = false
}

// --- TOOLTIP LOGIC ---
const locationsForTooltip = computed(() => {
  const allLocations = props.product.stock_locations || []
  let filtered = []
  if (props.activeView === 'all') {
    filtered = allLocations.filter((loc) => loc.quantity !== 0)
  } else if (props.activeView === 'gudang') {
    filtered = allLocations.filter((loc) => loc.purpose === 'WAREHOUSE' && loc.quantity !== 0)
  } else if (props.activeView === 'pajangan') {
    filtered = allLocations.filter((loc) => loc.purpose === 'DISPLAY' && loc.quantity !== 0)
  }
  return filtered
})

const showTooltip = computed(() => {
  return locationsForTooltip.value.length > 1
})

function handleToggleTooltip() {
  if (showTooltip.value) {
    isMenuVisible.value = false
    isPackageTooltipVisible.value = false

    if (isTooltipVisible.value) {
      isTooltipVisible.value = false
      return
    }
    const targetElement = tooltipContainer.value.querySelector('.location-cell')
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      tooltipX.value = rect.left + rect.width / 2
      tooltipY.value = rect.top
    }
    isTooltipVisible.value = true
  }
}

// --- PACKAGE TOOLTIP LOGIC ---
const fetchPackageComponents = async () => {
  isLoadingComponents.value = true
  try {
    const productData = await fetchProductById(props.product.id)
    if (productData) {
      localComponents.value = productData.components || []
    }
    hasFetchedComponents.value = true
  } catch (error) {
    console.error('Gagal mengambil komponen paket:', error)
    localComponents.value = []
  } finally {
    isLoadingComponents.value = false
  }
}

const handleTogglePackageTooltip = async (event) => {
  // Tutup yang lain (menu & tooltip lokasi)
  isMenuVisible.value = false
  isTooltipVisible.value = false

  // Logic Toggle: Jika sedang terbuka, tutup
  if (isPackageTooltipVisible.value) {
    isPackageTooltipVisible.value = false
    return
  }

  // Buka tooltip
  const rect = event.currentTarget.getBoundingClientRect()
  packageTooltipX.value = rect.left + rect.width / 2
  packageTooltipY.value = rect.top
  isPackageTooltipVisible.value = true

  // Fetch data jika belum ada
  if (
    !hasFetchedComponents.value &&
    (!props.product.components || props.product.components.length === 0)
  ) {
    await fetchPackageComponents()
  } else if (
    props.product.components &&
    props.product.components.length > 0 &&
    !hasFetchedComponents.value
  ) {
    localComponents.value = props.product.components
    hasFetchedComponents.value = true
  }
}

// --- MENU LOGIC ---
function handleToggleMenu(event) {
  isTooltipVisible.value = false
  isPackageTooltipVisible.value = false

  if (isMenuVisible.value) {
    isMenuVisible.value = false
    return
  }

  const rect = event.currentTarget.getBoundingClientRect()
  menuX.value = rect.left - 120
  menuY.value = rect.bottom + 5
  isMenuVisible.value = true
}

// Handle Klik Luar
function handleClickOutside(event) {
  // Handle Location Tooltip
  if (
    tooltipContainer.value &&
    !tooltipContainer.value.contains(event.target) &&
    !event.target.closest('.tooltip-teleported')
  ) {
    isTooltipVisible.value = false
  }

  // Handle Package Tooltip
  // Cek apakah klik terjadi pada TOMBOL paket milik baris INI
  const isClickOnTrigger = packageTriggerRef.value && packageTriggerRef.value.contains(event.target)
  // Cek apakah klik terjadi di dalam TOOLTIP yang muncul
  const isClickOnTooltip = event.target.closest('.package-tooltip-teleported')

  // Jika klik BUKAN di tombol ini DAN BUKAN di tooltip -> Tutup
  if (!isClickOnTrigger && !isClickOnTooltip) {
    isPackageTooltipVisible.value = false
  }

  // Handle Menu
  if (!event.target.closest('.action-btn') && !event.target.closest('.menu-teleported')) {
    isMenuVisible.value = false
  }
}

function handleMenuAction(action) {
  emit(action, props.product)
  isMenuVisible.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

function copyToClipboard(text, fieldName) {
  emit('copy', { text, fieldName })
}

// --- COMPUTED DATA ---
// Replaced by separate computed property above to support Virtual Stock
// const currentStock = computed(() => { ... })

const currentLocation = computed(() => {
  if (props.activeView === 'all') return props.product.allLocationsCode || '-'
  if (props.activeView === 'gudang') return props.product.lokasiGudang || '-'
  if (props.activeView === 'pajangan') return props.product.lokasiPajangan || '-'
  if (props.activeView === 'ltc') return props.product.lokasiLTC
  if (props.activeView === 'ltc') return props.product.lokasiLTC
  return '-'
})

// [NEW] Virtual Stock Logic
const virtualStock = computed(() => {
  if (props.product.is_package && props.product.components && props.product.components.length > 0) {
    const possiblePackages = props.product.components.map(c => {
      const stockAvail = c.stock_available || 0
      const needed = c.quantity || 1
      return Math.floor(stockAvail / needed)
    })
    return Math.min(...possiblePackages)
  }
  return 0
})

const currentStock = computed(() => {
  let physicalStock = 0
  if (props.activeView === 'all') physicalStock = props.product.totalStock
  else if (props.activeView === 'gudang') physicalStock = props.product.stockGudang
  else if (props.activeView === 'pajangan') physicalStock = props.product.stockPajangan
  else if (props.activeView === 'ltc') physicalStock = props.product.stockLTC

  // Return physical stock if exists, otherwise virtual
  return (physicalStock !== 0 && physicalStock !== null) ? physicalStock : virtualStock.value
})

// [NEW] Calculated Weight Logic
const displayWeight = computed(() => {
  // Jika berat manual sudah diisi (> 0), pakai itu
  if (props.product.weight && props.product.weight > 0) {
    return props.product.weight
  }

  // Jika berat 0 & Paket -> Hitung dari total komponen
  if (props.product.is_package && props.product.components && props.product.components.length > 0) {
    // [UPDATE] Rule: Jika ada SATU SAJA komponen yang beratnya 0, maka total berat paket dianggap 0 (belum valid)
    const hasUnweighedComponent = props.product.components.some(c => !c.weight || c.weight <= 0)

    if (hasUnweighedComponent) return 0

    return props.product.components.reduce((sum, c) => {
      return sum + ((c.weight || 0) * (c.quantity || 1))
    }, 0)
  }

  return 0
})

const imageUrl = computed(() => {
  const targetPath = props.product.thumbnail_path || props.product.image_path

  if (!targetPath) return null
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '')

  const cleanPath = targetPath.replace(/^\/+/, '')
  const uploadPrefix = cleanPath.startsWith('uploads/') ? '' : 'uploads/'
  return `${baseUrl}/${uploadPrefix}${cleanPath}`
})
</script>

<template>
  <tr ref="tooltipContainer"
    class="group relative transition-colors duration-500 md:table-row mb-2 bg-background md:bg-transparent border md:border-0 border-secondary/20 rounded-xl md:rounded-none shadow-sm md:shadow-none overflow-hidden"
    :class="[
      isUpdated ? 'bg-success/20' : 'md:hover:bg-secondary/20',
      mobileLayout === 'compact' ? 'grid grid-cols-[1fr_auto] gap-x-3 p-3 items-start' : 'grid grid-cols-2 gap-x-4 gap-y-2 p-3'
    ]">

    <!-- IMAGE (Sticky Left) -->
    <td
      class="hidden md:table-cell p-0 md:px-2 md:py-2 text-center whitespace-nowrap md:border-b border-secondary/10 md:border-secondary/80 md:sticky md:left-0 z-20 group-hover:bg-secondary/5 transition-colors md:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-transparent w-16">
      <div @click.stop="$emit('view-image', product)"
        class="mx-auto w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all relative group/img">
        <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-cover" loading="lazy" />
        <font-awesome-icon v-else icon="fa-solid fa-image" class="text-text/20 text-sm" />

        <div
          class="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
          <font-awesome-icon icon="fa-solid fa-expand" class="text-secondary text-xs drop-shadow-md" />
        </div>
      </div>
    </td>

    <!-- NAME (Sticky Left next to Image) -->
    <td
      class="md:table-cell flex items-center justify-between p-0 md:px-6 md:py-2 whitespace-nowrap md:border-b border-secondary/10 md:border-secondary/80 md:sticky md:left-16 z-20 group-hover:bg-secondary/5 transition-colors md:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-transparent"
      :class="mobileLayout === 'compact' ? 'col-span-1' : 'col-span-2'">
      <div class="flex items-center gap-3 w-full overflow-hidden">
        <!-- Mobile Thumbnail (Hidden on Desktop) -->
        <div @click.stop="$emit('view-image', product)"
          class="md:hidden w-10 h-10 rounded-lg bg-secondary/10 border border-secondary/20 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer">
          <img v-if="imageUrl" :src="imageUrl" class="w-full h-full object-cover" />
          <font-awesome-icon v-else icon="fa-solid fa-image" class="text-text/20 text-sm" />
        </div>

        <div class="flex flex-col w-full overflow-hidden">
          <div class="flex items-center gap-2 w-full">
            <span @click="copyToClipboard(product.name, 'Nama Produk')"
              class="font-bold text-text cursor-pointer hover:text-primary transition-colors truncate text-sm md:text-base w-full"
              :title="product.name">
              {{ product.name }}
            </span>
            <span v-if="product.is_package" ref="packageTriggerRef" @click.stop="handleTogglePackageTooltip"
              class="package-badge-trigger shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent/10 text-accent border border-accent/20 tracking-wide cursor-pointer hover:bg-accent/20 transition-colors">
              PAKET
            </span>
          </div>
          <!-- SKU Mobile Compact -->
          <span v-if="mobileLayout === 'compact' && visibleColumns.has('sku')"
            class="md:hidden text-[11px] text-text/50 font-mono mt-0.5 truncate block">
            {{ product.sku }}
          </span>
        </div>
      </div>
      <!-- Mobile Menu Button (Card Mode Only) -->
      <button v-if="mobileLayout === 'card'" @click.stop="handleToggleMenu"
        class="md:hidden action-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/20 text-text/60 hover:text-primary transition-colors ml-auto shrink-0">
        <font-awesome-icon icon="fa-solid fa-ellipsis-vertical" />
      </button>
    </td>

    <!-- SKU -->
    <td v-if="visibleColumns.has('sku')"
      class="md:table-cell flex justify-between items-center px-4 py-2 md:px-6 md:py-2 whitespace-nowrap border-b border-secondary/10 md:border-secondary/80"
      :class="{ 'hidden md:flex': mobileLayout === 'compact' }">
      <span class="md:hidden text-[10px] font-bold text-text/50 uppercase tracking-wide">SKU</span>
      <div class="text-left text-xs text-text/70 font-mono">
        <span @click="copyToClipboard(product.sku, 'SKU')"
          class="cursor-pointer hover:text-primary bg-secondary/5 px-2 py-1 rounded border border-secondary/80 transition-colors">
          {{ product.sku }}
        </span>
      </div>
    </td>

    <!-- WEIGHT -->
    <td v-if="visibleColumns.has('weight')"
      class="md:table-cell flex justify-between items-center px-4 py-2 md:px-6 md:py-2 text-right whitespace-nowrap text-xs text-text/70 font-mono border-b border-secondary/10 md:border-secondary/80"
      :class="{ 'hidden md:flex': mobileLayout === 'compact' }">
      <span class="md:hidden text-[10px] font-bold text-text/50 uppercase tracking-wide">Berat</span>
      <span>{{ formatNumber(displayWeight) }} gr</span>
    </td>

    <!-- PRICE -->
    <td v-if="auth.canViewPrices && visibleColumns.has('price')"
      class="md:table-cell flex justify-between items-center px-4 py-2 md:px-6 md:py-2 text-right whitespace-nowrap text-sm text-text/70 font-mono border-b border-secondary/10 md:border-secondary/80"
      :class="{ 'hidden md:flex': mobileLayout === 'compact' }">
      <span class="md:hidden text-[10px] font-bold text-text/50 uppercase tracking-wide">Harga</span>
      <span @click="copyToClipboard(product.price, 'Harga')" @mouseenter="handlePriceMouseEnter"
        @mouseleave="handlePriceMouseLeave" class="cursor-pointer hover:text-primary transition-colors">
        {{ formatCurrency(product.price) }}
      </span>
    </td>

    <!-- LOCATION -->
    <td v-if="visibleColumns.has('location')"
      class="md:table-cell flex justify-between items-center px-4 py-2 md:px-6 md:py-2 text-center whitespace-nowrap location-cell relative border-b border-secondary/10 md:border-secondary/80"
      :class="[{ 'cursor-pointer hover:text-primary text-primary font-bold': showTooltip }, { 'hidden md:flex': mobileLayout === 'compact' }]"
      @click="handleToggleTooltip">
      <span class="md:hidden text-[10px] font-bold text-text/50 uppercase tracking-wide">Lokasi</span>
      <span class="text-xs text-text/70 font-mono truncate block max-w-[150px] mx-auto" :title="currentLocation">
        {{ currentLocation }}
      </span>
    </td>

    <!-- STOCK -->
    <td v-if="visibleColumns.has('stock')"
      class="md:table-cell flex flex-col justify-start items-end md:justify-center md:items-center p-0 md:px-6 md:py-2 text-center whitespace-nowrap border-b-0 md:border-b border-secondary/80"
      :class="mobileLayout === 'compact' ? 'col-span-1' : ''">
      <div class="md:hidden flex flex-col items-end gap-0.5">
        <span v-if="mobileLayout === 'card'" class="text-[10px] font-bold text-text/50 uppercase tracking-wide">Stok
          Total</span>
        <span class="text-sm font-mono font-bold" :class="{
          'text-accent': currentStock < 0,
          'text-primary': currentStock > 0,
          'text-text/50': currentStock === 0 || currentStock === null,
        }">
          {{ currentStock || 0 }}
          <!-- Virtual Stock Info (Smaller) -->
          <div v-if="product.is_package" class="text-[10px] text-text/50 font-normal leading-tight">
            (Virtual: {{ virtualStock }} <span class="text-[9px] cursor-help"
              title="Stok Virtual (Kalkulasi dari Komponen)">[V]</span>)
          </div>
        </span>
        <!-- Price for Compact Mode -->
        <span v-if="mobileLayout === 'compact' && auth.canViewPrices && visibleColumns.has('price')"
          class="text-[10px] font-mono text-text/60">
          {{ formatCurrency(product.price) }}
        </span>
      </div>

      <!-- Desktop View -->
      <span class="hidden md:inline text-sm font-mono font-bold" :class="{
        'text-accent': currentStock < 0,
        'text-primary': currentStock > 0,
        'text-text/50': currentStock === 0 || currentStock === null,
      }">
        {{ currentStock || 0 }}
        <!-- Virtual Stock Info -->
        <span v-if="product.is_package" class="text-[10px] text-text/50 font-normal ml-1">
          (Virtual: {{ virtualStock }} <span class="text-[9px] cursor-help"
            title="Stok Virtual (Kalkulasi dari Komponen)">[V]</span>)
        </span>
      </span>
    </td>

    <!-- ACTIONS (Sticky Right) -->
    <td
      class="hidden md:table-cell px-6 py-2 w-[80px] text-center md:sticky md:right-0 z-20 group-hover:bg-secondary/5 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] border-b border-secondary/80">
      <div class="flex justify-center items-center relative">
        <button @click="handleToggleMenu"
          class="action-btn w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/20 text-text/60 hover:text-primary transition-colors">
          <font-awesome-icon icon="fa-solid fa-ellipsis-vertical" />
        </button>

        <!-- Location Tooltip -->
        <FloatingTooltip :show="showTooltip && isTooltipVisible" :x="tooltipX" :y="tooltipY" title="Detail Lokasi">
          <ul class="space-y-1.5">
            <li v-for="loc in locationsForTooltip" :key="loc.location_code" class="flex justify-between items-center">
              <span class="font-mono text-primary-light">{{ loc.location_code }}</span>
              <span class="font-bold bg-primary/10 text-primary px-1.5 rounded">{{
                loc.quantity
              }}</span>
            </li>
          </ul>
        </FloatingTooltip>

        <!-- Package Components Tooltip -->
        <FloatingTooltip :show="isPackageTooltipVisible" :x="packageTooltipX" :y="packageTooltipY"
          title="Komponen Paket" :loading="isLoadingComponents">
          <div v-if="localComponents && localComponents.length > 0">
            <ul class="space-y-2">
              <li v-for="comp in localComponents" :key="comp.id || comp.component_product_id"
                class="flex items-start gap-2">
                <div class="font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded text-[10px] shrink-0 font-mono">
                  {{ comp.quantity || comp.quantity_per_package }}x
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-semibold text-text truncate leading-tight">{{ comp.name }}</span>
                  <span class="text-[10px] text-text/60 font-mono truncate">{{ comp.sku }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="text-center py-2 text-text/50 italic">Tidak ada data komponen</div>
        </FloatingTooltip>

        <!-- Price PPN Tooltip -->
        <FloatingTooltip :show="isPriceTooltipVisible" :x="priceTooltipX" :y="priceTooltipY" title="Harga + PPN">
          <div class="flex justify-between gap-4 min-w-[120px]">
            <span class="text-text/70">DPP:</span>
            <span class="font-mono">{{ formatCurrency(product.price) }}</span>
          </div>
          <div class="flex justify-between gap-4 font-bold text-primary mt-1 pt-1 border-t border-secondary/20">
            <span>Final (11%):</span>
            <span class="font-mono">{{ formatCurrency(product.price * (1 + PPN_RATE)) }}</span>
          </div>
        </FloatingTooltip>

        <!-- Action Menu -->
        <Teleport to="body">
          <div v-if="isMenuVisible"
            class="menu-teleported fixed z-[99999] bg-background text-text w-48 rounded-lg shadow-xl border border-secondary py-1 text-sm overflow-hidden animate-scale-in"
            :style="{ left: menuX + 'px', top: menuY + 'px' }">
            <button v-if="auth.hasPermission('manage-stock-adjustment')" @click="handleMenuAction('openAdjust')"
              class="w-full text-left px-4 py-2.5 hover:bg-primary/10 hover:text-primary flex items-center gap-3 transition-colors">
              <font-awesome-icon icon="fa-solid fa-calculator" class="w-4 text-center" /> Sesuaikan Stok
            </button>

            <button @click="handleMenuAction('openTransfer')"
              class="w-full text-left px-4 py-2.5 hover:bg-primary/10 hover:text-primary flex items-center gap-3 transition-colors">
              <font-awesome-icon icon="fa-solid fa-right-left" class="w-4 text-center" /> Transfer Stok
            </button>

            <div class="h-px bg-primary/10 my-1"></div>

            <button v-if="auth.hasPermission('manage-products')" @click="handleMenuAction('openEdit')"
              class="w-full text-left px-4 py-2.5 hover:bg-warning/10 hover:text-warning flex items-center gap-3 transition-colors">
              <font-awesome-icon icon="fa-solid fa-pencil" class="w-4 text-center" /> Edit Produk
            </button>

            <button @click="handleMenuAction('openHistory')"
              class="w-full text-left px-4 py-2.5 hover:bg-accent/10 hover:text-accent flex items-center gap-3 transition-colors">
              <font-awesome-icon icon="fa-solid fa-clock-rotate-left" class="w-4 text-center" /> Riwayat
            </button>

            <div v-if="auth.hasPermission('manage-products')" class="h-px bg-secondary/10 my-1"></div>

            <button v-if="auth.hasPermission('manage-products')" @click="handleMenuAction('delete')"
              class="w-full text-left px-4 py-2.5 text-danger hover:bg-danger/10 flex items-center gap-3 transition-colors">
              <font-awesome-icon icon="fa-solid fa-trash" class="w-4 text-center" /> Hapus Produk
            </button>
          </div>
        </Teleport>
      </div>
    </td>
  </tr>



</template>

<style scoped>
.animate-scale-in {
  animation: scaleIn 0.1s ease-out forwards;
  transform-origin: top right;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
