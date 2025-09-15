<template>
  <div class="overflow-x-auto max-h-[80vh] border rounded-lg shadow border-gray-300">
    <table class="min-w-full bg-white text-sm text-gray-700 border-collapse">
      <thead class="bg-blue-100 text-gray-700 font-semibold sticky top-0">
        <tr>
          <th class="px-4 py-2 border">Nama</th>
          <th class="px-4 py-2 border">Tanggal</th>
          <th class="px-4 py-2 border">Jam Masuk</th>
          <th class="px-4 py-2 border">Break-Out</th>
          <th class="px-4 py-2 border">Break-In</th>
          <th class="px-4 py-2 border">Jam Keluar</th>
          <th class="px-4 py-2 border">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, idx) in formattedRows"
          :key="idx"
          class="hover:bg-gray-50"
        >
          <td class="px-4 py-2 border">{{ row.nama }}</td>
          <td class="px-4 py-2 border">{{ row.tanggal }}</td>
          <td class="px-4 py-2 border">{{ row.jamMasuk }}</td>
          <td class="px-4 py-2 border">{{ row.breakOut }}</td>
          <td class="px-4 py-2 border">{{ row.breakIn }}</td>
          <td class="px-4 py-2 border">{{ row.jamKeluar }}</td>
          <td class="px-4 py-2 border">{{ row.ket }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from "vue"
import { formatJamMenit } from "@/api/helpers/time.js"

// Props dari Absensi.vue
const props = defineProps({
  user: { type: Object, required: true },   // { n: nama, d: logs }
  year: { type: Number, required: true },
  month: { type: Number, required: true }
})

const formattedRows = computed(() => {
  return (props.user.d || []).map(log => {
    let ket = ""
    if (log.status === 1) ket = "Tidak hadir"
    else if (log.status === 2) ket = "Libur"
    else ket = ""

    return {
      nama: props.user.n,
      tanggal: log.tanggal,
      jamMasuk: formatJamMenit(log.jamMasuk),
      breakOut: log.breaks?.[0] ? formatJamMenit(log.breaks[0]) : "-",
      breakIn: log.breaks?.[1] ? formatJamMenit(log.breaks.at(-1)) : "-",
      jamKeluar: formatJamMenit(log.jamKeluar),
      ket
    }
  })
})
</script>
