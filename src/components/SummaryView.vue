<!-- components\SummaryView.vue -->
<script setup>
import { useSummary } from "@/composables/UseSummary.js"
import { formatJamMenit } from "@/api/helpers/time.js"

const props = defineProps({
  users: { type: Array, required: true }, // hasil normalizeLogs
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  globalInfo: { type: Object, default: () => ({}) }
})

const { summaries, totalUangLembur } = useSummary(props)

// watch(() => props.users, (newUsers) => {
//   if (newUsers && newUsers.length > 0) {
//     console.log("Data 'users' berubah, menjalankan ulang generate()...");
//     generate();
//   }
// }, {
//   immediate: true
// });
</script>

<template>
  <div>
    <h3 class="text-lg font-bold mb-2">Ringkasan Bulanan</h3>

    <div v-if="globalInfo && globalInfo.m" class="text-sm text-gray-600 mb-4">
      <span>Waktu Kerja Ideal Bulan Ini: </span>
      <strong class="font-semibold text-gray-800">{{ formatJamMenit(globalInfo.m) }}</strong>
    </div>

    <table class="table-auto w-full border">
      <thead>
        <tr class="bg-gray-100">
          <th class="px-2 py-1">Nama</th>
          <th class="px-2 py-1">Jam Kerja</th>
          <th class="px-2 py-1">Lembur</th>
          <th class="px-2 py-1">Telat</th>
          <th class="px-2 py-1">Early Out</th>
          <th class="px-2 py-1">Absensi</th>
          <th class="px-2 py-1">Denda</th>
          <th class="px-2 py-1">Uang Lembur</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in summaries" :key="s.id">
          <td class="border px-2 py-1">{{ s.nama }}</td>
          <td class="border px-2 py-1">{{ s.workHours }}</td>
          <td class="border px-2 py-1">{{ s.lemburHours }}</td>
          <td class="border px-2 py-1">{{ s.telatHours }}</td>
          <td class="border px-2 py-1">{{ s.earlyOutHours }}</td>
          <td class="border px-2 py-1">{{ s.absenceDays }}</td>
          <td class="border px-2 py-1">Rp {{ s.dendaTelat }}</td>
          <td class="border px-2 py-1">Rp {{ s.uangLembur }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="font-bold bg-gray-50">
          <td class="border px-2 py-1 text-right" colspan="7">Total Uang Lembur:</td>
          <td class="border px-2 py-1">Rp {{ totalUangLembur }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
