import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from '@/api/axios.js'

export const useDownloadStore = defineStore('download', () => {
  const jobs = ref([])
  const isPolling = ref(false)
  const pollInterval = ref(null)

  const pendingCount = ref(0)
  const isExpanded = ref(false) // For the UI widget

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/reports/my-jobs')
      if (res.data && res.data.success) {
        jobs.value = res.data.data
        
        // Count active jobs
        const activeJobs = jobs.value.filter(j => j.status === 'PENDING' || j.status === 'PROCESSING')
        pendingCount.value = activeJobs.length

        // Stop polling if no active jobs
        if (activeJobs.length === 0 && isPolling.value) {
          stopPolling()
        }
      }
    } catch (error) {
      console.error('Failed to fetch download jobs:', error)
      stopPolling()
    }
  }

  const startPolling = () => {
    if (isPolling.value) return
    isPolling.value = true
    isExpanded.value = true // Auto expand when new download starts
    fetchJobs() // Fetch immediately
    pollInterval.value = setInterval(fetchJobs, 5000) // Poll every 5 seconds
  }

  const stopPolling = () => {
    isPolling.value = false
    if (pollInterval.value) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }
  }

  const toggleWidget = () => {
    isExpanded.value = !isExpanded.value
  }

  return {
    jobs,
    isPolling,
    pendingCount,
    isExpanded,
    fetchJobs,
    startPolling,
    stopPolling,
    toggleWidget
  }
})
