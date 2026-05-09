<script setup>
import { ref, onMounted, watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import { fetchShifts } from '@/api/helpers/admin.js'
import ShiftFormModal from '@/components/shifts/ShiftFormModal.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import axios from '@/api/axios'

const shifts = ref([])
const loading = ref(true)
const isModalOpen = ref(false)
const selectedShift = ref(null)

const { toast } = useToast()

const getShifts = async () => {
  loading.value = true
  try {
    const data = await fetchShifts()
    shifts.value = data
  } catch (error) {
    toast('Gagal memuat data shift', 'error')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  selectedShift.value = null
  isModalOpen.value = true
}

const openEdit = (shift) => {
  selectedShift.value = shift
  isModalOpen.value = true
}

const deleteShift = async (id) => {
  if (!confirm('Hapus shift ini? User yang menggunakan shift ini akan kembali ke default.')) return

  try {
    await axios.delete(`/shifts/${id}`)
    toast('Shift dihapus', 'success')
    getShifts()
  } catch (error) {
    toast('Gagal menghapus shift', 'error')
  }
}

const getWorkDaysLabel = (daysStr) => {
  if (!daysStr) return '-'
  const days = daysStr.split(',')
  if (days.length === 5 && !days.includes('6') && !days.includes('7')) return 'Senin - Jumat'
  if (days.length === 6 && !days.includes('7')) return 'Senin - Sabtu'
  return days.length + ' Hari Kerja'
}

onMounted(getShifts)

// --- LOCAL HOTKEYS ---
const { Alt_N } = useMagicKeys()

watch(Alt_N, (pressed) => {
  if (pressed && !isModalOpen.value) {
    openCreate()
  }
})
</script>

<template>
  <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
    <h2 class="text-2xl font-bold text-text flex items-center gap-3">
      <font-awesome-icon icon="fa-solid fa-clock" />
      <span>Manajemen Shift</span>
    </h2>
    <button @click="openCreate"
      class="bg-primary text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
      <font-awesome-icon icon="fa-solid fa-plus" />
      <span>Tambah Shift</span>
    </button>
  </div>

  <!-- Shift Cards Grid -->
  <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <!-- Simple Skeleton -->
    <div v-for="n in 3" :key="n" class="h-32 bg-secondary/10 rounded-xl animate-pulse"></div>
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div v-for="shift in shifts" :key="shift.id"
      class="bg-secondary/10 border border-secondary/20 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">

      <!-- Default Badge -->
      <div v-if="shift.is_default"
        class="absolute top-0 right-0 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-bl-lg">
        DEFAULT
      </div>

      <div class="flex items-start justify-between mb-4">
        <div>
          <h3 class="text-xl font-bold text-text">{{ shift.name }}</h3>
          <p class="text-sm text-text/60 mt-1 flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-calendar-day" />
            {{ getWorkDaysLabel(shift.work_days) }}
          </p>
        </div>

        <div class="flex gap-2">
          <button @click="openEdit(shift)" class="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors"
            title="Edit Shift">
            <font-awesome-icon icon="fa-solid fa-pen" />
          </button>
          <button @click="deleteShift(shift.id)" class="p-2 text-danger hover:bg-danger/5 rounded-lg transition-colors"
            title="Hapus Shift">
            <font-awesome-icon icon="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4 bg-secondary/20 p-3 rounded-lg border border-secondary/10">
        <div class="text-center">
          <div class="text-xs text-text/60 uppercase font-semibold">Masuk</div>
          <div class="text-lg font-mono font-bold text-primary">{{ shift.start_time.slice(0, 5) }}</div>
        </div>
        <div class="h-8 w-px bg-secondary/20"></div>
        <div class="text-center">
          <div class="text-xs text-text/60 uppercase font-semibold">Pulang</div>
          <div class="text-lg font-mono font-bold text-primary">{{ shift.end_time.slice(0, 5) }}</div>
        </div>
        <div class="flex-1 text-right">
          <span v-if="shift.flexible_minutes > 0"
            class="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded">
            Flex {{ shift.flexible_minutes }}m
          </span>
          <span v-else class="text-xs font-medium text-text/60 bg-secondary/10 px-2 py-1 rounded">
            Fixed
          </span>
        </div>
      </div>

    </div>
  </div>

  <div v-if="!loading && shifts.length === 0" class="text-center py-20 text-text/40 italic">
    Belum ada shift yang dibuat.
  </div>

  <!-- Modal -->
  <ShiftFormModal :show="isModalOpen" :shift="selectedShift" @close="isModalOpen = false" @updated="getShifts" />
</template>
