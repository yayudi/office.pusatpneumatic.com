<!-- views/Absensi.vue -->
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
      @clear="clearFilters"
    />

    <Multiselect
      v-model="filterValues.name"
      :options="users.map(u => ({ label: u.nama, value: u.id }))"
      :multiple="true"
      label="label"
      track-by="value"
      placeholder="Pilih nama..."
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
      <SummaryView v-if="logs.length"
        :users="users"
        :year="parseInt(filterValues.year)"
        :month="parseInt(filterValues.month)"
        :global-info="summary"
      />
      <p v-else class="text-gray-500">Belum ada data.</p>
    </div>

    <div v-else>
      <DetailView
        v-if="logs.length"
        :user="filterValues.name.length === 1
                ? users.find(u => u.id === filterValues.name[0].value)
                : null"
        :users="filterValues.name.length > 1
                ? filteredUsers
                : (filterValues.name.length === 0 ? users : null)"
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
import { ref, watch, onMounted } from "vue"
import FilterBar from "@/components/FilterBar.vue"
import { getAbsensiData } from "@/api/helpers/attendance.js"
import UploadForm from "@/components/UploadForm.vue"
import Tabs from "@/components/Tabs.vue"
import SummaryView from "@/components/SummaryView.vue"
import DetailView from "@/components/DetailView.vue"
import Multiselect from "vue-multiselect"
import { API_URL } from "@/api/config.js"
import "vue-multiselect/dist/vue-multiselect.css"

const activeTab = ref("summary")
const summary = ref(null)
const users = ref([])
const logs = ref([])
const selectedUserIndex = ref(-1)
const filteredUsers = ref([])

// data index tahun/bulan dari server
const availableIndexes = ref({})
const filters = ref([])

const filterValues = ref({
  year: '',
  month: '',
  name: []
})

onMounted(async () => {
  try {
    const res = await fetch(API_URL+"json/list_index.json")
    availableIndexes.value = await res.json()

    // ambil tahun terbaru
    const years = Object.keys(availableIndexes.value).sort((a, b) => b - a)
    const latestYear = years[0]
    const months = availableIndexes.value[latestYear].sort()
    const latestMonth = months[months.length - 1]

    // set default filter
    filterValues.value = {
      year: latestYear,
      month: latestMonth,
      name: []
    }

    // generate filter config
    filters.value = [
      { type: "text", key: "name", label: "Nama", placeholder: "Cari nama..." },
      {
        type: "select",
        key: "year",
        label: "Tahun",
        multiple: false,
        options: years.map(y => ({ label: y, value: y }))
      },
      {
        type: "select",
        key: "month",
        label: "Bulan",
        multiple: false,
        options: months.map(m => ({
          label: new Date(2000, parseInt(m) - 1).toLocaleString("id-ID", { month: "long" }),
          value: m
        }))
      }
    ]
  } catch (err) {
    console.error("Gagal fetch list_index.json:", err)
  }
})

function clearFilters() {
  const years = Object.keys(availableIndexes.value).sort((a, b) => b - a)
  const latestYear = years[0]
  const months = availableIndexes.value[latestYear].sort()
  const latestMonth = months[months.length - 1]

  filterValues.value = { year: [latestYear], month: [latestMonth], name: [] }
  selectedUserIndex.value = -1
  logs.value = users.value.flatMap(u => u.logs || [])
}

watch(
  () => ({ year: filterValues.value.year, month: filterValues.value.month }),
  async ({ year, month }) => {
    if (!year || !month) return
    try {
      const data = await getAbsensiData(year, month)

      // console.log("📥 raw server data:", data)   // ✅ cek raw
      // console.log("📥 normalized users:", data.users)  // ✅ cek hasil normalize

      summary.value = data.summary || null
      users.value = data.users || []

      if (users.value.length > 0) {
        selectedUserIndex.value = -1
        logs.value = users.value.flatMap(u => u.logs || [])
      } else {
        logs.value = []
      }
    } catch (err) {
      console.error("Fetch absensi error:", err)
      users.value = []
      logs.value = []
      summary.value = null
    }
  },
  { immediate: true }
)

function applyFilter(values) {
  let filtered = users.value

  if (Array.isArray(values.name) && values.name.length) {
    const selectedIds = values.name.map(n => n.value)
    filtered = filtered.filter(u => selectedIds.includes(u.id))
  }

  filteredUsers.value = filtered
  logs.value = filtered.flatMap(u => u.logs || [])

  // console.log("applyFilter → values:", values)
  // console.log("applyFilter → filtered:", filtered)
}


function handleUpload(formData) {
  console.log("Upload formData:", formData)
}

// watch(users, (val) => {
//   console.log("DEBUG users:", val)
// })
// watch(() => filterValues.value.name, (val) => {
//   console.log("DEBUG nama terpilih:", val)
//   applyFilter(filterValues.value)
// })
</script>
