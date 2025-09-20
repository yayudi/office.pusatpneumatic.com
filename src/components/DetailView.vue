<!-- components\DetailView.vue -->
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

const props = defineProps({
  user: { type: Object, default: null },   // { id, nama, logs[] }
  users: { type: Array, default: null },   // array of { id, nama, logs[] }
  year: { type: Number, required: true },
  month: { type: Number, required: true }
})

const formattedRows = computed(() => {
  if (props.user) {
    // mode 1 user
    return (props.user.logs || []).map(log => formatRow(log, props.user.nama))
  } else if (props.users) {
    // multi-user mode
    return props.users.flatMap(u =>
      (u.logs || []).map(log => formatRow(log, u.nama))
    )
  }
  return []
})

function formatRow(log, nama) {
  let ket = ""
  if (log.status === 1) ket = "Tidak hadir"
  else if (log.status === 2) ket = "Libur"

  if (log.breaks && log.breaks.length > 0) {
    console.log(`Log tanggal ${log.tanggal} untuk ${nama}, data breaks:`, log.breaks);
  }

  return {
    nama,
    tanggal: log.tanggal,
    jamMasuk: formatJamMenit(log.jamMasuk),
    breakOut: log.breaks?.[0] ? formatJamMenit(log.breaks[0].start) : "-",
    breakIn: log.breaks?.[0] ? formatJamMenit(log.breaks.at(-1).end) : "-",
    jamKeluar: formatJamMenit(log.jamKeluar),
    ket
  }
}
</script>
