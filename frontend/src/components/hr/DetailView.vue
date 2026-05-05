<!-- components\DetailView.vue -->
<script setup>
import { computed, ref, watch } from 'vue'
import { formatJamMenit } from '@/api/helpers/time.js'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import AttendanceEditModal from '@/components/hr/AttendanceEditModal.vue'

const props = defineProps({
  user: { type: Object, default: null }, // For single user mode { id, nama, logs[] }
  users: { type: Array, default: null }, // For multi-user mode, array of { id, nama, logs[] }
  year: { type: Number, default: null },
  month: { type: Number, default: null },
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  loading: { type: Boolean, default: false },
  mobileLayout: { type: String, default: 'card' },
})

const emit = defineEmits(['refresh'])

const isEditModalOpen = ref(false)
const selectedLog = ref(null) // Defined correctly now
const visibleLimit = ref(50)
const tableContainer = ref(null)

// HELPER FUNCTIONS (Moved up before usage)
function getStatusText(status) {
  switch (status) {
    case 1:
      return 'Tidak Hadir'
    case 2:
      return 'Libur'
    case 3:
      return 'Data Tidak Lengkap'
    default:
      return ''
  }
}

function formatRow(log, nama) {
  let ket = ''
  if (log.status === 1) ket = 'Tidak hadir'
  else if (log.status === 2) ket = 'Libur'
  else if (log.status === 4) ket = 'Sakit'
  else if (log.status === 5) ket = 'Izin'

  // Fallback for Partial Data
  if (!ket && log.status === 3) ket = 'Data Tidak Lengkap'

  let fullDate = ''
  let displayDate = ''

  if (log.fullDate) {
    fullDate = log.fullDate
    const d = new Date(log.fullDate)
    displayDate = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } else if (props.year && props.month) {
    fullDate = `${props.year}-${String(props.month).padStart(2, '0')}-${String(log.tanggal).padStart(2, '0')}`
    displayDate = `${log.tanggal}/${props.month}/${props.year}`
  }

  return {
    nama,
    tanggal: log.tanggal,
    displayDate,
    fullDate,
    username: nama,

    jamMasuk: log.jamMasuk,
    jamKeluar: log.jamKeluar,
    status: log.status,
    dbStatus: log.dbStatus,
    notes: log.notes,

    jamMasukStr: formatJamMenit(log.jamMasuk),
    breakOut: log.breaks?.[0] ? formatJamMenit(log.breaks[0].start) : '-',
    breakIn: log.breaks?.[0] ? formatJamMenit(log.breaks.at(-1).end) : '-',
    jamKeluarStr: formatJamMenit(log.jamKeluar),
    ket,
  }
}

function openEditModal(row) {
  selectedLog.value = row
  isEditModalOpen.value = true
}

function handleUpdateSuccess() {
  emit('refresh')
}

// Computed for ALL formatted rows
// Rename original computed to allFormattedRows, then use it to slice
const allFormattedRows = computed(() => {
  if (props.user) {
    return (props.user.logs || []).map((log) => formatRow(log, props.user.nama))
  } else if (props.users) {
    return props.users.flatMap((u) => (u.logs || []).map((log) => formatRow(log, u.nama)))
  }
  return []
})

const visibleRows = computed(() => {
  return allFormattedRows.value.slice(0, visibleLimit.value)
})

const hasMore = computed(() => {
  return visibleLimit.value < allFormattedRows.value.length
})

watch(
  () => [props.user, props.users, props.year, props.month, props.startDate, props.endDate],
  () => {
    visibleLimit.value = 50
    if (tableContainer.value) tableContainer.value.scrollTop = 0
  }
)

function handleScroll(e) {
  const { scrollTop, clientHeight, scrollHeight } = e.target
  // Load more when near bottom (100px threshold)
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    if (hasMore.value) {
      visibleLimit.value += 50
    }
  }
}

// Update Template:
// 1. ref="tableContainer" on wrapper
// 2. @scroll="handleScroll" on wrapper
// 3. Loop over visibleRows
// 4. Add loader at bottom if hasMore
</script>
<template>
  <!-- Wrapper with themed border and background -->
  <div ref="tableContainer" @scroll="handleScroll"
    class="bg-background rounded-xl shadow-md border border-secondary/20 overflow-x-auto overflow-y-auto relative custom-scrollbar h-[calc(100vh-300px)] table-container">
    <table class="w-full bg-background text-sm text-text border-collapse block md:table">
      <!-- Themed table header -->
      <thead
        class="hidden md:table-header-group sticky top-0 z-30 bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5">
        <tr>
          <th
            class="px-6 py-3 border-b border-secondary/10 sticky left-0 z-30 bg-background/95 backdrop-blur-md shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] w-[200px] text-left uppercase text-xs font-bold text-text/60">
            Nama</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-center uppercase text-xs font-bold text-text/60">
            Tanggal</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-center uppercase text-xs font-bold text-text/60">Jam
            Masuk</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-center uppercase text-xs font-bold text-text/60">Mulai
            Istirahat</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-center uppercase text-xs font-bold text-text/60">
            Selesai Istirahat</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-center uppercase text-xs font-bold text-text/60">Jam
            Keluar</th>
          <th class="px-6 py-3 border-b border-secondary/10 text-left uppercase text-xs font-bold text-text/60">
            Keterangan</th>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="list" class="block md:table-row-group divide-y divide-secondary/5 relative">
        <template v-if="loading">
          <TableSkeleton v-for="n in 5" :key="`skeleton-${n}`" />
        </template>

        <tr v-else-if="!allFormattedRows.length" key="empty" class="block md:table-row">
          <td colspan="7" class="py-12 text-center text-text/50 italic block md:table-cell">
            Tidak ada data untuk periode ini.
          </td>
        </tr>

        <tr v-else v-for="(row, idx) in visibleRows" :key="idx" @click="openEditModal(row)"
          class="block md:table-row hover:bg-secondary/5 transition-colors group relative cursor-pointer mb-4 md:mb-0 bg-background/50 md:bg-transparent rounded-xl md:rounded-none shadow-sm md:shadow-none p-4 md:p-0 border border-secondary/20 md:border-none"
          :class="{ 'mx-4': mobileLayout === 'card' }">
          <!-- Name: Sticky on Desktop, Static on Mobile -->
          <td
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-2 md:py-4 font-bold text-text whitespace-nowrap md:sticky md:left-0 z-20 md:bg-background md:group-hover:bg-secondary/5 transition-colors md:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] border-b border-secondary/10 md:border-none mb-2 md:mb-0">
            <span class="text-base md:text-sm">{{ row.nama }}</span>
            <!-- Mobile Date (Merged into Header) -->
            <span class="md:hidden text-xs font-normal text-text/60 bg-secondary/10 px-2 py-1 rounded">{{
              row.displayDate
            }}</span>
          </td>

          <!-- Date Column (Hidden on Mobile because displayed in Name row for header effect or separate) -->
          <!-- Actually let's keep it but formatted differently or hidden if merged above. -->
          <!-- Let's show as standard key-value to be safe -->
          <td
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 text-center whitespace-nowrap hidden md:table-cell">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Tanggal</span>
            <span>{{ row.displayDate }}</span> <!-- usage of displayDate -->
          </td>

          <td
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 text-center font-mono text-xs md:text-sm">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Masuk</span>
            <span>{{ row.jamMasukStr }}</span>
          </td>

          <td v-if="mobileLayout !== 'compact'"
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 text-center font-mono text-xs md:text-sm text-text/60">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Mulai Ist</span>
            <span>{{ row.breakOut }}</span>
          </td>
          <td v-if="mobileLayout !== 'compact'"
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 text-center font-mono text-xs md:text-sm text-text/60">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Selesai Ist</span>
            <span>{{ row.breakIn }}</span>
          </td>

          <td
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 text-center font-mono text-xs md:text-sm">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Keluar</span>
            <span>{{ row.jamKeluarStr }}</span>
          </td>

          <td
            class="flex justify-between items-center md:table-cell px-2 md:px-6 py-1 md:py-4 border-t border-secondary/10 md:border-none mt-2 md:mt-0 pt-2 md:pt-4">
            <span class="md:hidden text-text/60 text-xs uppercase font-semibold">Status</span>
            <span v-if="row.ket" class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold" :class="{
              'bg-danger/10 text-danger': row.ket === 'Tidak hadir',
              'bg-warning/10 text-warning': row.ket === 'Data Tidak Lengkap',
              'bg-secondary/20 text-text/70': ['Libur'].includes(row.ket),
              'bg-accent/10 text-accent': ['Sakit', 'Izin'].includes(row.ket)
            }">
              {{ row.ket }}
            </span>
            <span v-else class="text-text/30 text-xs italic">-</span>
          </td>
        </tr>

        <!-- Loading Sentinel -->
        <tr v-if="hasMore && !loading" key="loader" class="block md:table-row">
          <td colspan="7" class="py-4 text-center text-text/40 text-xs animate-pulse block md:table-cell">
            Memuat data lainnya...
          </td>
        </tr>
      </TransitionGroup>
    </table>

    <AttendanceEditModal :is-open="isEditModalOpen" :log-data="selectedLog" @close="isEditModalOpen = false"
      @update="handleUpdateSuccess" />
  </div>
</template>

<style scoped>
/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
