<!-- frontend\src\views\WMSBatchLogView.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { fetchBatchLogs, fetchAllLocations } from '@/api/helpers/stock.js'
import { useToast } from '@/composables/useToast.js'
import FilterContainer from '@/components/ui/FilterContainer.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'

const { show } = useToast()

// State Filter
const startDate = ref('')
const endDate = ref('')
const searchProduct = ref('')
const searchType = ref('')
const searchLocation = ref('')
const searchUser = ref('')

// Data & UI
const logs = ref([])
const locations = ref([])
const loading = ref(false)
const hasSearched = ref(false)

// Options
const movementTypes = [
  'TRANSFER',
  'INBOUND',
  'RETURN',
  'ADJUSTMENT',
  'PICKING'
]

onMounted(async () => {
  // Set Default Date: Hari Ini
  const today = new Date().toISOString().split('T')[0]
  startDate.value = today
  endDate.value = today

  // Load Locations untuk Dropdown
  try {
    locations.value = await fetchAllLocations()
  } catch (e) {
    console.error("Gagal load lokasi", e)
  }

  // Auto load hari ini
  handleSearch()
})

async function handleSearch() {
  if (!startDate.value || !endDate.value) {
    show('Silakan pilih tanggal mulai dan selesai.', 'warning')
    return
  }

  loading.value = true
  hasSearched.value = true

  try {
    const filters = {
      productName: searchProduct.value,
      movementType: searchType.value,
      locationId: searchLocation.value,
      user: searchUser.value
    }

    logs.value = await fetchBatchLogs(startDate.value, endDate.value, filters)
  } catch (err) {
    show('Gagal memuat data log.', 'error')
  } finally {
    loading.value = false
  }
}

function handleReset() {
  const today = new Date().toISOString().split('T')[0]
  startDate.value = today
  endDate.value = today

  searchProduct.value = ''
  searchType.value = ''
  searchLocation.value = ''
  searchUser.value = ''

  logs.value = []
  hasSearched.value = false
  handleSearch()
}
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-text">Batch Movement Log</h2>
    </div>

    <!-- Filter Section -->
    <FilterContainer title="Filter Log" class="mb-6">
      <div class="px-4 py-5">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
          <!-- Product Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Produk / SKU</label>
            <div class="relative group">
              <font-awesome-icon icon="fa-solid fa-search"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-text/40 group-focus-within:text-primary transition-colors text-sm" />
              <input v-model="searchProduct" type="text" placeholder="Cari nama/kode..."
                class="w-full h-[42px] pl-9 pr-3 bg-background border border-secondary rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-text/30"
                @keyup.enter="handleSearch" />
            </div>
          </div>

          <!-- Movement Type -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Tipe</label>
            <div class="relative">
              <select v-model="searchType"
                class="w-full h-[42px] pl-3 pr-8 bg-background border border-secondary rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none appearance-none cursor-pointer transition-all">
                <option value="">- Tipe -</option>
                <option v-for="type in movementTypes" :key="type" :value="type">{{ type }}</option>
              </select>
              <font-awesome-icon icon="fa-solid fa-chevron-down"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 text-xs pointer-events-none" />
            </div>
          </div>

          <!-- Location -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Lokasi</label>
            <div class="relative">
              <select v-model="searchLocation"
                class="w-full h-[42px] pl-3 pr-8 bg-background border border-secondary rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none appearance-none cursor-pointer transition-all">
                <option value="">- Lokasi -</option>
                <option v-for="loc in locations" :key="loc.id" :value="loc.id">
                  {{ loc.code }}
                </option>
              </select>
              <font-awesome-icon icon="fa-solid fa-chevron-down"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 text-xs pointer-events-none" />
            </div>
          </div>

          <!-- User -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">User</label>
            <div class="relative group">
              <font-awesome-icon icon="fa-solid fa-user"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-text/40 group-focus-within:text-primary transition-colors text-sm" />
              <input v-model="searchUser" type="text" placeholder="Cari user..."
                class="w-full h-[42px] pl-9 pr-3 bg-background border border-secondary rounded-lg text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-text/30"
                @keyup.enter="handleSearch" />
            </div>
          </div>

          <!-- Date Filter -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Rentang Waktu</label>
            <DateRangeFilter v-model:startDate="startDate" v-model:endDate="endDate" class="w-full" />
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button @click="handleReset"
              class="h-[42px] px-4 bg-secondary/10 text-text/70 ring-1 ring-danger/20 hover:text-danger hover:bg-danger/10 rounded-lg text-sm font-bold transition-all flex-1 xl:flex-none">
              Reset
            </button>
            <button @click="handleSearch" :disabled="loading"
              class="h-[42px] px-6 bg-primary text-secondary rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 flex-[2] xl:flex-1">
              <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" spin />
              <span>{{ loading ? '...' : 'Cari' }}</span>
            </button>
          </div>
        </div>
      </div>
    </FilterContainer>

    <!-- Hasil Log -->
    <div class="bg-background rounded-xl shadow-md border border-secondary/20 overflow-hidden">
      <div class="max-h-[70vh] overflow-y-auto">
        <div v-if="loading" class="text-center p-12">
          <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-primary text-3xl mb-3" />
          <p class="text-text/50">Mengambil data...</p>
        </div>

        <div v-else-if="logs.length === 0 && hasSearched" class="text-center p-12">
          <div class="bg-secondary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <font-awesome-icon icon="fa-solid fa-box-open" class="text-2xl text-text/40" />
          </div>
          <p class="text-text font-medium">Tidak ada data ditemukan.</p>
          <p class="text-text/50 text-sm">Coba sesuaikan filter pencarian.</p>
        </div>

        <table v-else class="min-w-full text-xs">
          <thead class="bg-secondary uppercase text-text/70 sticky top-0 backdrop-blur-sm z-10">
            <tr>
              <th class="p-3 text-left font-bold border-b border-secondary/20">Waktu</th>
              <th class="p-3 text-left font-bold border-b border-secondary/20">Produk</th>
              <th class="p-3 text-center font-bold border-b border-secondary/20">Qty</th>
              <th class="p-3 text-left font-bold border-b border-secondary/20">Tipe</th>
              <th class="p-3 text-left font-bold border-b border-secondary/20">Route</th>
              <th class="p-3 text-left font-bold border-b border-secondary/20">User</th>
              <th class="p-3 text-left font-bold border-b border-secondary/20">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary/10">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-primary/5 transition-colors">
              <td class="p-3 whitespace-nowrap align-top text-text/80">
                <div class="font-medium">
                  {{ new Date(log.created_at).toLocaleDateString('id-ID') }}
                </div>
                <div class="text-[10px] opacity-60">
                  {{ new Date(log.created_at).toLocaleTimeString('id-ID') }}
                </div>
              </td>
              <td class="p-3 align-top">
                <div class="font-bold text-primary">{{ log.product_name }}</div>
                <div class="font-mono text-[10px] text-text/50 bg-secondary/10 inline-block px-1 rounded">{{ log.sku }}
                </div>
              </td>
              <td class="p-3 text-center align-top">
                <span class="font-bold text-sm" :class="log.quantity > 0 ? 'text-text' : 'text-accent'">
                  {{ log.quantity }}
                </span>
              </td>
              <td class="p-3 align-top">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" :class="{
                  'bg-primary/10 text-primary': log.movement_type === 'TRANSFER',
                  'bg-success/10 text-success': log.movement_type === 'INBOUND' || log.movement_type === 'RETURN',
                  'bg-warning/10 text-warning': log.movement_type === 'ADJUSTMENT'
                }">
                  {{ log.movement_type }}
                </span>
              </td>
              <td class="p-3 align-top text-text/80">
                <div v-if="log.from_location" class="flex items-center gap-1 text-[10px]">
                  <span class="text-text/50 w-8">Dari:</span>
                  <span class="font-mono font-bold">{{ log.from_location }}</span>
                </div>
                <div v-if="log.to_location" class="flex items-center gap-1 text-[10px]">
                  <span class="text-text/50 w-8">Ke:</span>
                  <span class="font-mono font-bold">{{ log.to_location }}</span>
                </div>
              </td>
              <td class="p-3 align-top text-text/80">{{ log.user }}</td>
              <td class="p-3 align-top text-text/60 italic max-w-[200px] truncate" :title="log.notes">
                {{ log.notes || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
