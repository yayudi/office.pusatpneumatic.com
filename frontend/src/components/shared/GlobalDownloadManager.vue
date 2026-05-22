<script setup>
import { computed, onMounted } from 'vue'
import { useDownloadStore } from '@/stores/downloadStore.js'
import dayjs from 'dayjs'

const downloadStore = useDownloadStore()

onMounted(() => {
  // Fetch initial jobs just to know if we have any pending
  downloadStore.fetchJobs()
})

const formatStatus = (status) => {
  const map = {
    'PENDING': 'Menunggu',
    'PROCESSING': 'Memproses',
    'COMPLETED': 'Selesai',
    'FAILED': 'Gagal'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    'PENDING': 'text-warning bg-warning/10',
    'PROCESSING': 'text-accent bg-accent/10',
    'COMPLETED': 'text-success bg-success/10',
    'FAILED': 'text-danger bg-danger/10'
  }
  return map[status] || 'text-text/60 bg-secondary/10'
}

const formatDate = (date) => dayjs(date).format('DD MMM YYYY, HH:mm')

// Only show recent 5 jobs in the widget to save space
const recentJobs = computed(() => {
  // Filter for export jobs only (assuming all are export jobs, but let's be safe)
  return downloadStore.jobs.slice(0, 5)
})
</script>

<template>
  <div class="fixed bottom-6 right-6 z-[6000] flex flex-col items-end pointer-events-none">
    
    <!-- Expanded Panel -->
    <transition
      enter-active-class="transition ease-out duration-300 transform origin-bottom-right"
      enter-from-class="opacity-0 scale-90 translate-y-4"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-200 transform origin-bottom-right"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-90 translate-y-4"
    >
      <div v-if="downloadStore.isExpanded" class="w-80 md:w-96 bg-background rounded-2xl shadow-2xl border border-secondary/20 mb-4 overflow-hidden pointer-events-auto flex flex-col max-h-[400px]">
        
        <!-- Header -->
        <div class="px-4 py-3 bg-secondary/5 border-b border-secondary/10 flex justify-between items-center shrink-0">
          <div class="flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-cloud-arrow-down" class="text-primary" />
            <h3 class="font-bold text-sm text-text">Pusat Unduhan</h3>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="downloadStore.isPolling" class="flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <button @click="downloadStore.toggleWidget()" class="text-text/50 hover:text-text transition-colors p-1 rounded hover:bg-secondary/10">
              <font-awesome-icon icon="fa-solid fa-minus" />
            </button>
          </div>
        </div>

        <!-- Job List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div v-if="recentJobs.length === 0" class="py-8 text-center text-text/40">
            <font-awesome-icon icon="fa-solid fa-folder-open" class="text-3xl mb-2 opacity-50" />
            <p class="text-xs font-medium">Belum ada riwayat unduhan.</p>
          </div>

          <div v-else class="space-y-1">
            <div v-for="job in recentJobs" :key="job.id" class="p-3 rounded-xl hover:bg-secondary/5 transition-colors border border-transparent hover:border-secondary/10 group">
              <div class="flex justify-between items-start mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" :class="getStatusClass(job.status)">
                    {{ formatStatus(job.status) }}
                  </span>
                </div>
                <span class="text-[10px] text-text/40 font-medium">{{ formatDate(job.created_at) }}</span>
              </div>
              
              <div class="text-xs font-bold text-text truncate mb-2">
                {{ job.file_path || 'Memproses file...' }}
              </div>

              <div class="flex justify-between items-center">
                <span class="text-[10px] text-text/50 capitalize">{{ job.type.replace(/_/g, ' ').toLowerCase() }}</span>
                
                <a v-if="job.status === 'COMPLETED' && job.download_url" :href="job.download_url" target="_blank"
                  class="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-secondary rounded-lg text-xs font-bold transition-all flex items-center gap-1.5">
                  <font-awesome-icon icon="fa-solid fa-download" /> Unduh
                </a>
                <span v-else-if="job.status === 'FAILED'" class="text-[10px] text-danger font-medium truncate max-w-[120px]" :title="job.error_message">
                  {{ job.error_message || 'Gagal' }}
                </span>
                <span v-else-if="job.status === 'PROCESSING' || job.status === 'PENDING'" class="text-xs text-text/40">
                  <font-awesome-icon icon="fa-solid fa-circle-notch" spin />
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Footer link to reports maybe? -->
        <div class="px-4 py-2 bg-secondary/5 border-t border-secondary/10 text-center shrink-0">
          <span class="text-[10px] text-text/50 font-medium">Menampilkan 5 unduhan terakhir.</span>
        </div>
      </div>
    </transition>

    <!-- Floating Bubble Button -->
    <button 
      @click="downloadStore.toggleWidget()"
      class="pointer-events-auto w-14 h-14 bg-background border-2 border-secondary/20 rounded-full shadow-xl flex items-center justify-center text-text hover:border-primary/50 hover:text-primary transition-all relative group"
      :class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-background': downloadStore.isExpanded }"
    >
      <font-awesome-icon icon="fa-solid fa-download" class="text-xl" />
      
      <!-- Badge for active downloads -->
      <span v-if="downloadStore.pendingCount > 0" class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-secondary text-[10px] font-bold border-2 border-background shadow-sm">
        {{ downloadStore.pendingCount }}
      </span>
      
      <!-- Tooltip -->
      <div v-if="!downloadStore.isExpanded" class="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-text text-background text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Pusat Unduhan
      </div>
    </button>
  </div>
</template>
