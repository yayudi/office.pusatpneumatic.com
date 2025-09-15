<!-- src/views/Absensi.vue -->
<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">🕒 Absensi</h2>
      <UploadForm @submit="handleUpload" />
    </div>

    <!-- Filter -->
    <FilterBar
      :filters="filters"
      v-model="filterValues"
      @change="applyFilter"
    />

    <!-- Tabs -->
    <Tabs
      :tabs="[
        { label: 'Ringkasan', value: 'summary' },
        { label: 'Detail Log', value: 'detail' }
      ]"
      v-model="activeTab"
    />

    <!-- Content -->
    <div v-if="activeTab === 'summary'">
      <SummaryView v-if="summary" :summary="summary" />
      <p v-else class="text-gray-500">Belum ada data.</p>
    </div>

    <div v-else>
      <DetailView
        v-if="logs.length"
        :user="{ n: filterValues.name || 'Semua', d: logs }"
        :year="parseInt(filterValues.year)"
        :month="parseInt(filterValues.month)"
      />
      <p v-else class="text-gray-500">
        Belum ada log detail. (logs length: {{ logs.length }})
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import FilterBar from "@/components/FilterBar.vue"
import UploadForm from "@/components/UploadForm.vue"
import Tabs from "@/components/Tabs.vue"
import SummaryView from "@/components/SummaryView.vue"
import DetailView from "@/components/DetailView.vue"

// State
const activeTab = ref("summary")
const summary = ref(null)
const logs = ref([])

const filterValues = ref({
  year: "2025",
  month: "09", // default September
  name: ""
})

const filters = ref([
  { type: "text", key: "name", label: "Nama", placeholder: "Cari nama..." },
  {
    type: "select",
    key: "year",
    label: "Tahun",
    options: [
      { label: "2025", value: "2025" },
      { label: "2024", value: "2024" }
    ]
  },
  { type: "select", key: "month", label: "Bulan", options: [] }
])

// 🚀 Mock data pas mounted
onMounted(() => {
  summary.value = {
    workHours: 160,
    lemburHours: 12,
    uangLembur: 240000,
    telatHours: 5,
    earlyOutHours: 3,
    absenceDays: 1,
    breakHours: 10,
    dendaPerHari: [
      { tanggal: 3, telat: 45, denda: 20000 },
      { tanggal: 10, telat: 30, denda: 15000 }
    ]
  }

  logs.value = [
    { tanggal: 1, jamMasuk: 480, jamKeluar: 1020, breaks: [], status: 0 },
    { tanggal: 2, jamMasuk: 500, jamKeluar: 1080, breaks: [720, 780], status: 0 },
    { tanggal: 3, status: 1 }
  ]

  console.log("🔥 Mock logs injected:", logs.value)
})

// Event handlers
function applyFilter(values) {
  console.log("Filter berubah:", values)
}

function handleUpload(formData) {
  console.log("Upload formData:", formData)
}
</script>
