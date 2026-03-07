<!-- frontend\src\views\hr\AttendanceView.vue -->
<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import Tabs from '@/components/ui/Tabs.vue'
import FilterBar from '@/components/ui/FilterBar.vue'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import SummaryView from '@/components/hr/SummaryView.vue'
import DetailView from '@/components/hr/DetailView.vue'
import AttendanceStats from '@/components/stats/AttendanceStats.vue'
import Modal from '@/components/ui/Modal.vue'
import UploadForm from '@/components/ui/UploadForm.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import AttendanceExclusionsModal from '@/components/hr/AttendanceExclusionsModal.vue'
import { useToast } from '@/composables/useToast.js'
import { getAbsensiRange, uploadAbsensiFile } from '@/api/helpers/attendance.js'
import { fetchAllUsers } from '@/api/helpers/admin.js'

// --- STATE ---
const authStore = useAuthStore()
const { show } = useToast()
const isUploadModalOpen = ref(false)
const isExclusionsModalOpen = ref(false)
const isUploading = ref(false)
const isHeaderExpanded = ref(true)
const activeTab = ref('statistik')
const summary = ref(null)
const users = ref([])
// const availableIndexes = ref({}) // Deprecated
const filters = ref([])
const filterValues = ref({
  startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  name: [],
})
const allUsersForFilter = ref([])
const dataNotFoundForCurrentUser = ref(false)
// const isLoadingIndexes = ref(true) // Deprecated
const isLoadingUsers = ref(false)
const isDataLoading = ref(false)
const mobileLayout = ref('card') // 'card' | 'compact'
const canViewAll = computed(() => authStore.user?.permissions?.includes('view-other-attendance'))

const displayedUsers = computed(() => {
  if (canViewAll.value && filterValues.value.name && filterValues.value.name.length > 0) {
    const selectedIds = filterValues.value.name.map((n) => n.value)
    return users.value.filter((u) => selectedIds.includes(u.id))
  }
  return users.value
})

const currentYear = computed(() => new Date(filterValues.value.startDate).getFullYear())
const currentMonth = computed(() => new Date(filterValues.value.startDate).getMonth() + 1)

// --- FETCH DATA ---
async function fetchAttendanceData() {
  const startDate = filterValues.value.startDate
  const endDate = filterValues.value.endDate
  const user = authStore.user

  if (!startDate || !endDate || !user) return

  dataNotFoundForCurrentUser.value = false
  isDataLoading.value = true

  try {
    // Use new Range API
    const data = await getAbsensiRange(startDate, endDate)
    summary.value = data.summary || null
    let fetchedUsers = data.users || []

    // Logika RBAC (Role Based Access Control)
    if (!canViewAll.value) {
      const currentUserData = fetchedUsers.find(
        (u) => u.nama.toLowerCase() === authStore.user.username.toLowerCase(),
      )
      users.value = currentUserData ? [currentUserData] : []
      dataNotFoundForCurrentUser.value = !currentUserData
    } else {
      users.value = fetchedUsers
    }
  } catch (err) {
    show('Gagal memuat data absensi.', 'error')
    console.error('Fetch absensi error:', err)
    users.value = []
    summary.value = null
  } finally {
    isDataLoading.value = false
  }
}

// --- WATCHERS & LIFECYCLE ---
watch(
  [() => filterValues.value.startDate, () => filterValues.value.endDate, () => authStore.user],
  (newVals, oldVals) => {
    // Basic debounce or check if valid
    fetchAttendanceData()
  }
)

function handleRefresh() {
  fetchAttendanceData()
  show('Data berhasil diperbarui', 'success')
}

// 3. Watcher User Login: Init Data Awal
watch(
  () => authStore.user,
  async (user) => {
    if (user) {
      fetchAttendanceData() // Fetch initial

      if (canViewAll.value) {
        isLoadingUsers.value = true
        try {
          const usersList = await fetchAllUsers()
          allUsersForFilter.value = usersList.map((u) => ({
            label: u.nickname || u.username,
            value: u.id,
          }))
        } catch (err) {
          show('Gagal memuat daftar nama user untuk filter.', 'error')
          console.error('Gagal mengambil daftar user:', err)
        } finally {
          isLoadingUsers.value = false
        }
      }
    }
  },
  { immediate: true },
)

function clearFilters() {
  filterValues.value.name = []
  // Reset date to current month
  filterValues.value.startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  filterValues.value.endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd')
}

// --- UPLOAD ---
async function handleUpload(formData) {
  isUploading.value = true
  show('Mengupload file...', 'info')
  try {
    const response = await uploadAbsensiFile(formData)

    if (response.success) {
      isUploadModalOpen.value = false

      // CASE 1: Job Queue (Async)
      if (response.jobId) {
        show(response.message || 'File masuk antrian background.', 'success')
      }
      // CASE 2: Direct Processing (Sync - Legacy Support)
      else if (response.processed) {
        show('Upload berhasil! Menampilkan data terbaru.', 'success')

        const { year, month } = response.processed || {}
        if (year && month) {
          // Set range to that month
          const d = new Date(year, month - 1, 1)
          filterValues.value.startDate = format(startOfMonth(d), 'yyyy-MM-dd')
          filterValues.value.endDate = format(endOfMonth(d), 'yyyy-MM-dd')
        }
      }
    } else {
      throw new Error(response.message || 'Terjadi kesalahan di server.')
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Gagal mengupload file.'
    show(errorMessage, 'error')
    console.error('Upload error:', error)
  } finally {
    isUploading.value = false
  }
}
</script>
<template>
  <div class="min-h-screen">
    <header
      class="bg-background/80 backdrop-blur-sm sticky top-[65px] z-30 border-b border-secondary/20 transition-all duration-300">
      <transition enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0 max-h-0"
        enter-to-class="transform translate-y-0 opacity-100 max-h-[500px]"
        leave-active-class="transition-all duration-300 ease-in"
        leave-from-class="transform translate-y-0 opacity-100 max-h-[500px]"
        leave-to-class="transform -translate-y-4 opacity-0 max-h-0">
        <div v-show="isHeaderExpanded" class="overflow-hidden">
          <div class="py-3 px-4 md:px-6 flex flex-col md:flex-row items-stretch md:items-center gap-4">
            <Tabs :tabs="[
              { label: 'Statistik', value: 'statistik' },
              { label: 'Ringkasan', value: 'summary' },
              { label: 'Detail Log', value: 'detail' },
            ]" v-model="activeTab" class="w-full md:w-auto overflow-x-auto" />

            <div class="flex flex-col md:flex-row gap-4 flex-1 items-stretch md:items-center">
              <FilterBar :filters="[]" v-model="filterValues" @clear="clearFilters" class="w-full md:w-auto">
                <template #prepend>
                  <DateRangeFilter v-model:startDate="filterValues.startDate" v-model:endDate="filterValues.endDate"
                    align="left" />
                </template>
                <template #actions>
                  <div class="flex items-center bg-secondary/20 rounded-lg p-1 border border-secondary/20 lg:hidden">
                    <button @click="mobileLayout = 'card'"
                      class="p-2 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                      :class="mobileLayout === 'card' ? 'bg-primary text-secondary shadow-sm' : 'text-text/60 hover:text-primary'"
                      title="Tampilan Card">
                      <font-awesome-icon icon="fa-solid fa-grip" />
                    </button>
                    <button @click="mobileLayout = 'compact'"
                      class="p-2 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                      :class="mobileLayout === 'compact' ? 'bg-primary text-secondary shadow-sm' : 'text-text/60 hover:text-primary'"
                      title="Tampilan Compact">
                      <font-awesome-icon icon="fa-solid fa-list" />
                    </button>
                  </div>
                </template>
              </FilterBar>

              <div v-if="canViewAll" class="w-full md:flex-1 min-w-[200px]">
                <BaseSelect v-model="filterValues.name" :options="allUsersForFilter" :multiple="true"
                  :loading="isLoadingUsers" :disabled="isLoadingUsers" label="label" track-by="value"
                  placeholder="Pilih satu atau beberapa nama..." class="w-full" />
              </div>

              <button v-if="canViewAll" @click="isExclusionsModalOpen = true"
                class="bg-accent/10 border border-accent/30 text-accent hover:bg-accent/30 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto">
                <font-awesome-icon icon="fa-solid fa-user-shield" />
                <span>Pengecualian Absen</span>
              </button>

              <button v-if="canViewAll" @click="isUploadModalOpen = true"
                class="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/30 text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap w-full md:w-auto">
                <font-awesome-icon icon="fa-solid fa-file-import" />
                <span>Import Data</span>
              </button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Toggle Handle -->
      <div @click="isHeaderExpanded = !isHeaderExpanded"
        class="lg:hidden flex justify-center items-center py-1 cursor-pointer hover:bg-secondary/10 text-text/40 hover:text-primary transition-colors border-t border-secondary/10"
        title="Toggle Header">
        <font-awesome-icon :icon="isHeaderExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" />
      </div>
    </header>

    <main class="mt-6">
      <div class="bg-secondary/20 rounded-xl shadow-md border border-secondary/20 p-6 space-y-6">
        <div v-if="activeTab === 'summary'">
          <p v-if="dataNotFoundForCurrentUser" class="text-center text-text/60 py-10">
            Data absensi Anda untuk periode ini tidak ditemukan.
          </p>
          <SummaryView v-else-if="displayedUsers.length > 0 || isDataLoading" :users="displayedUsers"
            :start-date="filterValues.startDate" :end-date="filterValues.endDate" :year="currentYear"
            :month="currentMonth" :global-info="summary" :loading="isDataLoading" :mobile-layout="mobileLayout" />
          <p v-else class="text-center text-text/60 py-10">
            Pilih tanggal untuk menampilkan data, atau tidak ada data yang cocok dengan
            filter.
          </p>
        </div>

        <div v-else-if="activeTab === 'statistik'">
          <AttendanceStats :users="displayedUsers" :summary-info="summary || {}" :start-date="filterValues.startDate"
            :end-date="filterValues.endDate" :year="currentYear" :month="currentMonth" :loading="isDataLoading"
            :mobile-layout="mobileLayout" />
        </div>

        <div v-else>
          <p v-if="dataNotFoundForCurrentUser" class="text-center text-text/60 py-10">
            Data absensi Anda untuk periode ini tidak ditemukan.
          </p>
          <DetailView v-else-if="displayedUsers.length > 0" :user="filterValues.name.length === 1
            ? displayedUsers[0]
            : !canViewAll
              ? displayedUsers[0]
              : null
            " :users="filterValues.name.length > 1
              ? displayedUsers
              : canViewAll && filterValues.name.length === 0
                ? users
                : !canViewAll
                  ? displayedUsers
                  : null
              " :start-date="filterValues.startDate" :end-date="filterValues.endDate" :year="currentYear"
            :month="currentMonth" :loading="isDataLoading" @refresh="handleRefresh" :mobile-layout="mobileLayout" />
          <p v-else class="text-center text-text/60 py-10">Belum ada log detail.</p>
        </div>
      </div>
    </main>

    <!-- MODAL UPLOAD -->
    <Modal :show="isUploadModalOpen" @close="isUploadModalOpen = false" title="Upload File Absensi">
      <!-- Menggunakan Component UploadForm Baru dengan Drag Drop & Dry Run -->
      <UploadForm @submit="handleUpload" :loading="isUploading" accept=".csv" submit-label="Mulai Import"
        :show-dry-run="true" />

      <template #footer>
        <button @click="isUploadModalOpen = false"
          class="bg-background border border-secondary/30 text-text/80 hover:bg-secondary/20 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          Tutup
        </button>
      </template>
    </Modal>

    <!-- MODAL PENGECUALIAN ABSEN -->
    <AttendanceExclusionsModal :is-open="isExclusionsModalOpen" @close="isExclusionsModalOpen = false"
      @updated="handleRefresh" />
  </div>
</template>
