<template>
  <div class="overflow-x-auto max-h-[80vh] border rounded-lg shadow border-gray-300">
    <!-- Tabel ringkasan -->
    <table class="min-w-full bg-white text-sm text-gray-700 w-full text-left border-collapse">
      <thead class="bg-blue-100 text-gray-700 font-semibold sticky top-0">
        <tr>
          <th class="px-4 py-2 border">Metode</th>
          <th class="px-4 py-2 border">Nilai</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(val, key) in displaySummary"
          :key="key"
          class="hover:bg-gray-50"
        >
          <td class="px-4 py-2 border font-medium">
            {{ labelMap[key] || key }}
          </td>
          <td class="px-4 py-2 border">
            {{ formatValue(key, val) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Detail per hari -->
    <div v-if="summary.dendaPerHari?.length" class="mt-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-2">📌 Denda per Hari</h3>
      <ul class="space-y-1">
        <li
          v-for="d in summary.dendaPerHari"
          :key="d.tanggal"
          class="flex justify-between bg-gray-50 p-2 rounded-md border"
        >
          <span>Hari ke-{{ d.tanggal }}: Telat {{ formatJamMenit(d.telat) }}</span>
          <span class="font-semibold text-red-600">
            Rp {{ formatNumber(d.denda) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { formatJamMenit } from "@/api/helpers/time.js"

const props = defineProps({
  summary: { type: Object, required: true }
})

// Mapping label biar lebih manusiawi
const labelMap = {
  workHours: "Jam Kerja",
  lemburHours: "Lembur (jam)",
  uangLembur: "Uang Lembur",
  telatHours: "Telat (jam)",
  earlyOutHours: "Pulang Cepat (jam)",
  absenceDays: "Hari Absen",
  breakHours: "Jam Istirahat",
}

// Tampilkan hanya field yang relevan (exclude dendaPerHari)
const displaySummary = computed(() => {
  const { dendaPerHari, ...rest } = props.summary
  return rest
})

// Formatter universal
function formatValue(key, val) {
  if (val == null || val === "") return "-"
  if (typeof val === "number") {
    // uangLembur → tampilkan Rp
    if (key.toLowerCase().includes("uang")) {
      return `Rp ${formatNumber(val)}`
    }
    return formatNumber(val)
  }
  return val
}

function formatNumber(n) {
  return new Intl.NumberFormat("id-ID").format(n)
}
</script>
