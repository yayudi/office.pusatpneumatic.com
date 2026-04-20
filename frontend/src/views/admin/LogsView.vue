<!-- frontend/src/views/admin/LogsView.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from '@/api/axios.js'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import DateRangeFilter from '@/components/ui/DateRangeFilter.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { computed } from 'vue'

const logs = ref([])
const total = ref(0)
const isLoading = ref(false)
const search = ref('')
const page = ref(1)
const limit = ref(20)

// Filters
const actionFilter = ref('all')
const targetFilter = ref('all')

const startDate = ref(null)
const endDate = ref(null)

const actionOptions = [
  { value: 'all', label: 'Semua Aksi' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
]

const targetOptions = [
  { value: 'all', label: 'Semua Tipe' },
  { value: 'PRODUCT', label: 'PRODUCT' },
  { value: 'USER', label: 'USER' },
  { value: 'ROLE', label: 'ROLE' },
  { value: 'LOCATION', label: 'LOCATION' },
  { value: 'SETTING', label: 'SETTING' },
]

const fetchLogs = async () => {
  isLoading.value = true
  try {
    const params = {
      page: page.value,
      limit: limit.value,
      search: search.value,
      action: actionFilter.value !== 'all' ? actionFilter.value : undefined,
      targetType: targetFilter.value !== 'all' ? targetFilter.value : undefined,
      startDate: startDate.value,
      endDate: endDate.value
    }

    const response = await axios.get('/logs', { params })
    logs.value = response.data.data
    total.value = response.data.total
  } catch (error) {
    console.error("Error fetching logs:", error)
  } finally {
    isLoading.value = false
  }
}

// Helpers
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: id })
}

const formatChanges = (changesJson) => {
  if (!changesJson) return '-'
  try {
    const changes = typeof changesJson === 'string' ? JSON.parse(changesJson) : changesJson
    return changes
  } catch (e) {
    return changesJson
  }
}

// Computed Pagination
const paginationData = computed(() => ({
  page: page.value,
  limit: limit.value,
  total: total.value,
  totalPages: Math.ceil(total.value / limit.value) || 1
}))

const onChangePage = (p) => { page.value = p }
const onUpdateLimit = (l) => {
  limit.value = l
  page.value = 1
}

// Watchers
watch([page, limit, search, actionFilter, targetFilter, startDate, endDate], () => {
  if (search.value || actionFilter.value !== 'all' || targetFilter.value !== 'all' || startDate.value || endDate.value) {
  }
  fetchLogs()
})

const handleSearch = () => {
  page.value = 1
  fetchLogs()
}

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-text">Audit Logs</h2>
      <button @click="fetchLogs"
        class="bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors">
        <font-awesome-icon icon="fa-solid fa-rotate-right" :spin="isLoading" />
        Refresh
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-background rounded-xl shadow-sm border border-secondary/20 p-4 mb-6 flex flex-wrap gap-4">
      <div class="flex-1 min-w-[200px]">
        <input v-model="search" @input="handleSearch" placeholder="Cari ID Target..."
          class="w-full px-4 py-2 bg-background border border-secondary/30 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-text">
      </div>

      <DateRangeFilter v-model:startDate="startDate" v-model:endDate="endDate" />

      <BaseSelect v-model="actionFilter" :options="actionOptions" track-by="value" emit-value :searchable="false" class="min-w-[150px]" />
      <BaseSelect v-model="targetFilter" :options="targetOptions" track-by="value" emit-value :searchable="false" class="min-w-[150px]" />
    </div>

    <!-- Table & Pagination Card -->
    <div class="bg-background shadow-md rounded-xl border border-secondary/20 flex flex-col h-[calc(100vh-250px)]">
      <!-- Scrollable Table -->
      <div class="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative rounded-t-xl">
        <table class="w-full text-sm text-left text-text border-collapse">
          <thead class="sticky top-0 z-30 bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5">
            <tr class="text-xs text-text/80 uppercase">
              <th
                class="px-6 py-3 sticky left-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] w-[180px]">
                Waktu</th>
              <th class="px-6 py-3 border-b border-secondary/10 w-[200px]">User</th>
              <th class="px-6 py-3 border-b border-secondary/10 w-[120px]">Aksi</th>
              <th class="px-6 py-3 border-b border-secondary/10 w-[180px]">Target</th>
              <th class="px-6 py-3 border-b border-secondary/10">Perubahan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary/5 relative">
            <template v-if="isLoading">
              <TableSkeleton v-for="n in 5" :key="`skeleton-${n}`" />
            </template>

            <tr v-else-if="logs.length === 0" key="empty">
              <td colspan="5" class="py-12 text-center text-text/50 italic">Tidak ada log aktivitas ditemukan.</td>
            </tr>

            <tr v-else v-for="log in logs" :key="log.id"
              class="border-b border-secondary/20 hover:bg-secondary/5 transition-colors group relative">
              <td
                class="px-6 py-4 whitespace-nowrap sticky left-0 z-20 bg-background group-hover:bg-secondary/5 transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                <div class="flex flex-col">
                  <span class="font-bold text-sm text-text">{{ formatDate(log.created_at) }}</span>
                  <span class="text-[10px] text-text/40">{{ log.ip_address || '-' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-bold text-sm">{{ log.nickname || log.username || 'System' }}</span>
                  <span class="text-xs text-text/50">{{ log.role || 'N/A' }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border" :class="{
                  'bg-success/10 text-success border-success/20': log.action === 'CREATE',
                  'bg-warning/10 text-warning border-warning/20': log.action === 'UPDATE',
                  'bg-danger/10 text-danger border-danger/20': log.action === 'DELETE',
                  'bg-accent/10 text-accent border-accent/20': log.action === 'LOGIN',
                  'bg-secondary/10 text-secondary border-secondary/20': log.action === 'OTHER'
                }">
                  {{ log.action }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-bold text-xs text-primary bg-primary/5 px-2 py-0.5 rounded w-fit mb-1">{{
                    log.target_type
                    }}</span>
                  <span class="text-xs text-text/60 font-mono tracking-tight text-ellipsis overflow-hidden">{{
                    log.target_id
                    }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm">
                <div v-if="log.changes" class="space-y-1">
                  <div v-for="(val, key) in formatChanges(log.changes)" :key="key"
                    class="grid grid-cols-[100px_1fr] gap-2 text-xs">
                    <span class="font-mono text-text/50 text-right truncate" :title="key">{{ key }}:</span>
                    <div v-if="val && typeof val === 'object'" class="font-mono flex items-center gap-2 flex-wrap">
                      <span
                        class="bg-danger/5 text-danger px-1.5 py-0.5 rounded decoration-auto line-through opacity-70 break-all">{{
                          val.old !== undefined ? val.old : 'NULL' }}</span>
                      <font-awesome-icon icon="fa-solid fa-arrow-right" class="text-text/20 text-[10px]" />
                      <span class="bg-success/5 text-success px-1.5 py-0.5 rounded font-bold break-all">{{ val.new !==
                        undefined ?
                        val.new :
                        'NULL'
                      }}</span>
                    </div>

                    <!-- Handle if val is a primitive (e.g. note: "User Logged in") -->
                    <div v-else class="font-mono flex items-center gap-2 flex-wrap">
                      <span class="text-text/80 break-all">{{ val !== null && val !== undefined ? val : 'NULL' }}</span>
                    </div>
                  </div>
                </div>
                <span v-else class="text-text/30 italic text-xs">- No details -</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination (Sticky Bottom) -->
      <div class="border-t border-secondary/20 flex justify-between items-center bg-background rounded-b-xl shrink-0">
        <BasePagination 
          :pagination="paginationData" 
          @changePage="onChangePage" 
          @update:limit="onUpdateLimit" 
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: hsl(var(--color-secondary) / 0.3);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--color-secondary) / 0.5);
}
</style>
