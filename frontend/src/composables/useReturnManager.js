import { ref, reactive, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import api from '@/api/axios'
import { useToast } from '@/composables/useToast'
import { usePagination } from '@/composables/usePagination'
import { useMasterDataStore } from '@/stores/masterData'

export function useReturnManager() {
  const { toast } = useToast()

  const activeTab = ref('pending')
  const items = ref([])
  const isLoading = ref(false)
  const searchQuery = ref('')
  const filterState = reactive({
    source: { include: [], exclude: [] },
    condition: '',
    locationId: '',
    startDate: '',
    endDate: '',
    sortOrder: 'desc'
  })
  
  const totalItems = ref(0)
  const {
    currentPage,
    currentLimit,
    meta: pagination,
    changePage: doChangePage,
    changePageSize: doChangeLimit
  } = usePagination({
    totalItems,
    initialLimit: 10,
    storageKey: 'returnManagerLimit'
  })
  
  const locations = ref([])

  // State Modal Process (Enhanced)
  const showProcessModal = ref(false)
  const processForm = ref({
    itemData: null,
    // Kita pisahkan state untuk Good dan Bad
    good: {
      qty: 0,
      locationId: '',
    },
    bad: {
      qty: 0,
      locationId: '', // Default ke lokasi Z-BAD jika ada
    },
    notes: '',
  })

  // Fetch Data Lokasi
  const fetchLocations = async () => {
    try {
      const masterData = useMasterDataStore()
      locations.value = await masterData.getLocations()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchData = async () => {
    isLoading.value = true
    try {
      const endpoint = activeTab.value === 'pending' ? '/return/pending' : '/return/history'
      const response = await api.get(endpoint, {
        params: {
          page: currentPage.value,
          limit: currentLimit.value,
          search: searchQuery.value,
          ...filterState
        }
      })
      items.value = response.data.data
      if (response.data.pagination) {
        totalItems.value = response.data.pagination.total
      }

      // Load locations jika belum ada
      if (locations.value.length === 0) {
        await fetchLocations()
      }
    } catch (e) {
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  // Reload data ketika tab atau filter diubah
  watch([activeTab, filterState], () => {
    currentPage.value = 1
    fetchData()
  }, { deep: true })

  // Pencarian dengan debounce agar tidak spam server
  watchDebounced(searchQuery, () => {
    currentPage.value = 1
    fetchData()
  }, { debounce: 300 })

  const changePage = (p) => {
    doChangePage(p)
    fetchData()
  }

  const changeLimit = (l) => {
    doChangeLimit(l)
    fetchData()
  }

  // Buka Modal
  const openProcessModal = (item) => {
    processForm.value = {
      itemData: item,
      good: { qty: 0, locationId: '' },
      bad: { qty: 0, locationId: '' }, // Nanti bisa auto-select lokasi 'RETUR-RUSAK' disini jika mau
      notes: '',
    }
    showProcessModal.value = true
  }

  // Submit Logic (Smart Split)
  const submitProcess = async () => {
    const { itemData, good, bad, notes } = processForm.value
    const totalQtyInput = parseInt(good.qty || 0) + parseInt(bad.qty || 0)

    // Validasi Total
    if (totalQtyInput === 0) {
      toast('Mohon isi jumlah barang yang diterima (Bagus atau Rusak)', 'warning')
      return
    }
    if (totalQtyInput > itemData.quantity) {
      return
    }

    // Validasi Lokasi
    if (good.qty > 0 && !good.locationId) {
      toast('Pilih lokasi rak untuk barang kondisi Bagus', 'warning')
      return
    }
    if (bad.qty > 0 && !bad.locationId) {
      toast('Pilih lokasi rak untuk barang kondisi Rusak', 'warning')
      return
    }

    isLoading.value = true
    try {
      // Skenario A: Ada barang Bagus
      if (good.qty > 0) {
        await api.post('/return/approve', {
          itemId: itemData.id,
          qtyAccepted: good.qty,
          condition: 'GOOD',
          locationId: good.locationId,
          notes: notes,
        })
      }

      // Skenario B: Ada barang Rusak
      // Note: Jika skenario A jalan, backend otomatis mengurangi qty item utama.
      // Jadi request kedua aman dilakukan selama ID item sama.
      if (bad.qty > 0) {
        await api.post('/return/approve', {
          itemId: itemData.id,
          qtyAccepted: bad.qty,
          condition: 'BAD',
          locationId: bad.locationId,
          notes: notes ? `${notes} (Rusak)` : '',
        })
      }

      toast('Retur berhasil divalidasi', 'success')
      showProcessModal.value = false
      fetchData() // Refresh list
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
    }
  }

  return {
    activeTab,
    locations,
    isLoading,
    searchQuery,
    filterState,
    pagination,
    items,
    showProcessModal,
    processForm,
    fetchData,
    openProcessModal,
    submitProcess,
    changePage,
    changeLimit
  }
}
