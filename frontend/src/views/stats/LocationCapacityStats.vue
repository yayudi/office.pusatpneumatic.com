<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold leading-7 text-text sm:truncate sm:text-3xl sm:tracking-tight">Statistik Kapasitas Lokasi</h2>
      <div class="flex space-x-3">
        <button
          @click="fetchData"
          type="button"
          class="inline-flex items-center rounded-md bg-background px-3 py-2 text-sm font-semibold text-text shadow-sm border border-secondary/30 hover:bg-secondary/5"
          :disabled="loading"
        >
          <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" class="animate-spin -ml-1 mr-2 text-text/50" />
          <font-awesome-icon v-else icon="fa-solid fa-rotate" class="-ml-0.5 mr-1.5 text-text/40" />
          Refresh Data
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-background p-4 rounded-lg shadow-sm border border-secondary/20">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label class="block text-sm font-medium leading-6 text-text mb-1">Purpose</label>
          <TriStateSelect
            v-model="filters.purpose"
            :options="purposeOptions"
            label="label"
            track-by="value"
            placeholder="Semua Purpose"
            @update:model-value="fetchData"
          />
        </div>
        <div>
          <label class="block text-sm font-medium leading-6 text-text mb-1">Gedung</label>
          <TriStateSelect
            v-model="filters.building"
            :options="buildingOptions"
            label="label"
            track-by="value"
            placeholder="Semua Gedung"
            @update:model-value="fetchData"
            :disabled="!filters.purpose.include.length && !filters.purpose.exclude.length && uniquePurposes.length > 0"
          />
        </div>
        <div>
          <label class="block text-sm font-medium leading-6 text-text mb-1">Lantai</label>
          <TriStateSelect
            v-model="filters.floor"
            :options="floorOptions"
            label="label"
            track-by="value"
            placeholder="Semua Lantai"
            @update:model-value="fetchData"
            :disabled="!filters.building.include.length && !filters.building.exclude.length"
          />
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div class="overflow-hidden rounded-lg bg-background px-4 py-5 shadow-sm border border-secondary/20 sm:p-6">
        <dt class="truncate text-sm font-medium text-text/60">Total Lokasi Aktif</dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-text">{{ locationLoads.length }}</dd>
      </div>
      <div class="overflow-hidden rounded-lg bg-background px-4 py-5 shadow-sm border border-secondary/20 sm:p-6">
        <dt class="truncate text-sm font-medium text-text/60">Total Beban Berat</dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-text">
          {{ formatNumber(totalWeight / 1000) }} <span class="text-lg font-normal text-text/50">kg</span>
        </dd>
      </div>
      <div class="overflow-hidden rounded-lg bg-background px-4 py-5 shadow-sm border border-secondary/20 sm:p-6">
        <dt class="truncate text-sm font-medium text-text/60">Total Kubikasi</dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-text">
          {{ formatNumber(totalCBM, 2) }} <span class="text-lg font-normal text-text/50">m³</span>
        </dd>
      </div>
      <div class="overflow-hidden rounded-lg bg-background px-4 py-5 shadow-sm border border-secondary/20 sm:p-6">
        <dt class="truncate text-sm font-medium text-text/60">Rata-rata Berat per Lokasi</dt>
        <dd class="mt-1 text-3xl font-semibold tracking-tight text-text">
          {{ formatNumber(avgWeightPerLocation, 2) }} <span class="text-lg font-normal text-text/50">kg</span>
        </dd>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Data Table: Beban Lokasi -->
      <div class="bg-background rounded-lg shadow-sm border border-secondary/20 overflow-hidden flex flex-col">
        <div class="px-4 py-5 sm:px-6 border-b border-secondary/20 flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h3 class="text-base font-semibold leading-6 text-text">Detail Beban Kapasitas Lokasi</h3>
            <p class="mt-1 text-sm text-text/60">Informasi berat (kg) dan kubikasi (CBM) di setiap lokasi.</p>
          </div>
        </div>
        <div class="overflow-x-auto flex-1 max-h-[800px]">
          <table class="min-w-full divide-y divide-secondary/20">
            <thead class="bg-secondary/5 sticky top-0 z-10">
              <tr>
                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-text sm:pl-6" title="Kode unik lokasi penyimpanan">Kode Lokasi</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-text" title="Gedung dan lantai tempat lokasi berada">Gedung / Lantai</th>
                <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-text" title="Tujuan penggunaan atau fungsi lokasi">Purpose</th>
                <th scope="col" class="px-3 py-3.5 text-right text-sm font-semibold text-text" title="Jumlah jenis produk/SKU berbeda yang ada di lokasi ini">Jml Produk</th>
                <th scope="col" class="px-3 py-3.5 text-right text-sm font-semibold text-text" title="Total keseluruhan barang (kuantitas) di lokasi ini">Kuantitas</th>
                <th scope="col" class="px-3 py-3.5 text-right text-sm font-semibold text-text" title="Estimasi total berat barang di lokasi ini dalam kilogram (kg)">Berat (kg)</th>
                <th scope="col" class="px-3 py-3.5 text-right text-sm font-semibold text-text" title="Estimasi total volume/kubikasi barang di lokasi ini dalam meter kubik (m³)">Kubikasi (m³)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-secondary/20 bg-background">
              <tr v-for="loc in locationLoads" :key="loc.location_id" class="hover:bg-secondary/5">
                <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-text sm:pl-6">{{ loc.code }}</td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-text/60">
                  {{ loc.building }} <span v-if="loc.floor">- Lt {{ loc.floor }}</span>
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-text/60">
                  <span
                    class="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                    >{{ loc.purpose || 'N/A' }}</span
                  >
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-text/60 text-right">
                  {{ formatNumber(loc.total_products) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm text-text/60 text-right">
                  {{ formatNumber(loc.total_quantity) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-text text-right">
                  {{ formatNumber(loc.total_weight / 1000, 2) }}
                </td>
                <td class="whitespace-nowrap px-3 py-4 text-sm font-medium text-text text-right">
                  {{ formatNumber(loc.total_cbm, 4) }}
                </td>
              </tr>
              <tr v-if="locationLoads.length === 0">
                <td colspan="7" class="px-3 py-8 text-sm text-text/50 text-center">Tidak ada data kapasitas lokasi yang ditemukan</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast.js'
import api from '@/api/axios.js'
import TriStateSelect from '@/components/ui/TriStateSelect.vue'
import { formatNumber } from '@/utils/formatters.js'

const { toast } = useToast()
const loading = ref(false)
const locationLoads = ref([])
const uniquePurposes = ref([])
const uniqueBuildingsByPurpose = ref({})
const uniqueFloorsByBuilding = ref({})
const initialLoaded = ref(false)
const filters = ref({
  purpose: { include: [], exclude: [] },
  building: { include: [], exclude: [] },
  floor: { include: [], exclude: [] }
})

// Metrics
const totalWeight = computed(() => {
  return locationLoads.value.reduce((sum, loc) => sum + (loc.total_weight || 0), 0)
})

const totalCBM = computed(() => {
  return locationLoads.value.reduce((sum, loc) => sum + (loc.total_cbm || 0), 0)
})

const avgWeightPerLocation = computed(() => {
  if (locationLoads.value.length === 0) return 0
  return (totalWeight.value / 1000) / locationLoads.value.length
})

const fetchData = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.purpose.include.length || filters.value.purpose.exclude.length) {
      params.purpose = JSON.stringify(filters.value.purpose)
    }
    if (filters.value.building.include.length || filters.value.building.exclude.length) {
      params.building = JSON.stringify(filters.value.building)
    }
    if (filters.value.floor.include.length || filters.value.floor.exclude.length) {
      params.floor = JSON.stringify(filters.value.floor)
    }

    const response = await api.get('/statistics/location-analysis', { params })
    if (response.data.success) {
      locationLoads.value = response.data.data.locationLoads || []

      // Update filter options only on initial load
      if (!initialLoaded.value) {
        const purposes = new Set()
        const buildingsByPurposeMap = {}
        const floorsByBuildingMap = {}

        locationLoads.value.forEach(loc => {
          const p = loc.purpose || 'N/A'
          purposes.add(p)

          if (!buildingsByPurposeMap[p]) buildingsByPurposeMap[p] = new Set()
          if (loc.building) {
            buildingsByPurposeMap[p].add(loc.building)
            if (!floorsByBuildingMap[loc.building]) floorsByBuildingMap[loc.building] = new Set()
            if (loc.floor) floorsByBuildingMap[loc.building].add(loc.floor)
          }
        })

        uniquePurposes.value = Array.from(purposes).sort()
        for (const p in buildingsByPurposeMap) buildingsByPurposeMap[p] = Array.from(buildingsByPurposeMap[p]).sort()
        for (const b in floorsByBuildingMap) floorsByBuildingMap[b] = Array.from(floorsByBuildingMap[b]).sort()

        uniqueBuildingsByPurpose.value = buildingsByPurposeMap
        uniqueFloorsByBuilding.value = floorsByBuildingMap
        initialLoaded.value = true
      }
    }
  } catch (error) {
    console.error('Failed to fetch location capacity analysis:', error)
    toast(error.response?.data?.message || 'Gagal memuat data statistik lokasi', 'error')
  } finally {
    loading.value = false
  }
}

const purposeOptions = computed(() => {
  return uniquePurposes.value.map(p => ({ value: p, label: p }))
})

const buildingOptions = computed(() => {
  const inc = filters.value.purpose.include
  if (inc.length > 0) {
    const blds = new Set()
    inc.forEach(p => {
      if (uniqueBuildingsByPurpose.value[p]) {
        uniqueBuildingsByPurpose.value[p].forEach(b => blds.add(b))
      }
    })
    return Array.from(blds).sort().map(b => ({ value: b, label: b }))
  }
  
  const allBlds = new Set()
  Object.values(uniqueBuildingsByPurpose.value).forEach(list => list.forEach(b => allBlds.add(b)))
  return Array.from(allBlds).sort().map(b => ({ value: b, label: b }))
})

const floorOptions = computed(() => {
  const inc = filters.value.building.include
  if (inc.length > 0) {
    const flrs = new Set()
    inc.forEach(b => {
      if (uniqueFloorsByBuilding.value[b]) {
        uniqueFloorsByBuilding.value[b].forEach(f => flrs.add(f))
      }
    })
    return Array.from(flrs).sort().map(f => ({ value: f, label: f }))
  }
  
  const allFlrs = new Set()
  Object.values(uniqueFloorsByBuilding.value).forEach(list => list.forEach(f => allFlrs.add(f)))
  return Array.from(allFlrs).sort().map(f => ({ value: f, label: f }))
})

watch(() => filters.value.purpose, () => {
  filters.value.building = { include: [], exclude: [] }
}, { deep: true })

watch(() => filters.value.building, () => {
  filters.value.floor = { include: [], exclude: [] }
}, { deep: true })

onMounted(() => {
  fetchData()
})
</script>
