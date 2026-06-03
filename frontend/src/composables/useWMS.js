// frontend/src/composables/useWMS.js
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import debounce from 'lodash/debounce'
import { useAuthStore } from '@/stores/auth'
import { fetchProducts as fetchProductsFromApi } from '@/api/helpers/wms.js'
import { useMasterDataStore } from '@/stores/masterData'

const AVAILABLE_COLUMNS = [
  { id: 'sku', label: 'SKU' },
  { id: 'category', label: 'Kategori' },
  { id: 'weight', label: 'Berat' },
  { id: 'price', label: 'Harga' },
  { id: 'location', label: 'Lokasi' },
  { id: 'stock', label: 'Stok' },
]

export function useWms() {
  const auth = useAuthStore()
  const allLocations = ref([])
  const activeView = ref('all')
  const displayedProducts = ref([])
  const currentPage = ref(1)
  const totalProducts = ref(0)
  const loading = ref(true)
  const isLoadingMore = ref(false)
  const isBackgroundLoading = ref(false)
  const error = ref(null)
  const pageSize = 30
  const loader = ref(null)
  const searchTerm = ref('')
  const searchBy = ref('name')
  const stockStatusFilter = ref('all')
  const productTypeFilter = ref('all')
  const selectedBuilding = ref({ include: [], exclude: [] })
  const selectedFloor = ref({ include: [], exclude: [] })
  const selectedCategory = ref({ include: [], exclude: [] })
  const sortBy = ref('name')
  const sortOrder = ref('asc')
  const isAutoRefetching = ref(true)
  const startDate = ref('')
  const endDate = ref('')

  let refetchIntervalId = null

  // Column Visibility State
  const visibleColumns = ref(new Set(['sku', 'weight', 'price', 'location', 'stock']))

  // Initialize from LocalStorage
  const savedColumns = localStorage.getItem('wms-visible-columns')
  const masterData = useMasterDataStore()

  // Ambil data lokasi sekali saja saat composable digunakan
  onMounted(async () => {
    try {
      allLocations.value = await masterData.getLocations()
    } catch (error) {
      console.error('Failed to fetch locations in useWMS', error)
    }
  })

  if (savedColumns) {
    try {
      visibleColumns.value = new Set(JSON.parse(savedColumns))
    } catch (e) {
      console.error('Error parsing saved columns', e)
    }
  }

  watch(visibleColumns, (newVal) => {
    localStorage.setItem('wms-visible-columns', JSON.stringify([...newVal]))
  }, { deep: true })

  function toggleColumn(columnId) {
    if (visibleColumns.value.has(columnId)) {
      visibleColumns.value.delete(columnId)
    } else {
      visibleColumns.value.add(columnId)
    }
  }
  let observer = null

  function toggleAutoRefetch() {
    isAutoRefetching.value = !isAutoRefetching.value
  }

  function matchesFilters(loc) {
    let buildingMatch = true
    if (selectedBuilding.value.include.length > 0) {
      if (loc.building) {
        buildingMatch = selectedBuilding.value.include.includes(loc.building)
      } else if (loc.location_code) {
        buildingMatch = selectedBuilding.value.include.some(b => loc.location_code.startsWith(b))
      }
    } else if (selectedBuilding.value.exclude.length > 0) {
      if (loc.building) {
        buildingMatch = !selectedBuilding.value.exclude.includes(loc.building)
      } else if (loc.location_code) {
        buildingMatch = !selectedBuilding.value.exclude.some(b => loc.location_code.startsWith(b))
      }
    }

    let floorMatch = true
    if (selectedFloor.value.include.length > 0) {
      if (loc.floor !== undefined && loc.floor !== null) {
        floorMatch = selectedFloor.value.include.includes(String(loc.floor))
      }
    } else if (selectedFloor.value.exclude.length > 0) {
      if (loc.floor !== undefined && loc.floor !== null) {
        floorMatch = !selectedFloor.value.exclude.includes(String(loc.floor))
      }
    }

    return buildingMatch && floorMatch
  }

  function transformProduct(apiProduct) {
    const locations = apiProduct.stock_locations || []

    const filteredLocations = locations.filter(matchesFilters)

    const pajanganLocations = filteredLocations.filter((loc) => loc.purpose === 'DISPLAY')
    const stockPajangan = pajanganLocations.reduce((sum, loc) => sum + loc.quantity, 0)
    const lokasiPajangan = pajanganLocations.map((loc) => loc.location_code).join(', ')

    const gudangLocations = filteredLocations.filter((loc) => loc.purpose === 'WAREHOUSE')
    const stockGudang = gudangLocations.reduce((sum, loc) => sum + loc.quantity, 0)
    const lokasiGudang = gudangLocations.map((loc) => loc.location_code).join(', ')

    const ltcLocation = filteredLocations.find((loc) => loc.purpose === 'BRANCH')
    const stockLTC = ltcLocation ? ltcLocation.quantity : 0
    const lokasiLTC = ltcLocation ? ltcLocation.location_code : 'N/A'

    const filteredTotalStock = filteredLocations.reduce((sum, loc) => sum + loc.quantity, 0)
    const filteredAllLocationsCode = filteredLocations.map((loc) => loc.location_code).join(', ')

    return {
      id: apiProduct.id,
      sku: apiProduct.sku,
      name: apiProduct.name,
      price: apiProduct.price,
      weight: apiProduct.weight,
      is_package: Boolean(apiProduct.is_package),
      category_name: apiProduct.category_name || null,
      thumbnail_path: apiProduct.thumbnail_path,
      image_path: apiProduct.image_path,

      stockPajangan,
      lokasiPajangan,
      pajanganLocations,
      stockGudang,
      lokasiGudang,
      gudangLocations,
      stockLTC,
      lokasiLTC,
      totalStock: filteredTotalStock,
      allLocationsCode: filteredAllLocationsCode,
      stock_locations: filteredLocations,
      components: apiProduct.components || [], // [FIX] Pass components for virtual stock calc
    }
  }

  async function fetchInitialData() {
    await Promise.all([
      fetchProducts('init'),
      masterData.getLocations().then((data) => {
        allLocations.value = data
      }),
    ])
  }

  /**
   * Fetch Products dengan 3 Mode:
   * 'init'     -> Loading Penuh (Spinner Besar). Reset data.
   * 'loadMore' -> Loading Bawah. Append data.
   * 'silent'   -> Tidak ada Loading Spinner. Update data in-place (Patch).
   */
  async function fetchProducts(mode = 'init') {
    if (mode === 'init') loading.value = true
    else if (mode === 'loadMore') isLoadingMore.value = true
    else if (mode === 'silent') isBackgroundLoading.value = true

    error.value = null

    try {
      const params = {
        page: currentPage.value,
        limit: pageSize,
        search: searchTerm.value,
        searchBy: searchBy.value,
        location: activeView.value,
        stockStatus: stockStatusFilter.value,
        is_package: productTypeFilter.value === 'all' ? undefined : productTypeFilter.value === 'package',
        
        buildingInclude: JSON.stringify(selectedBuilding.value.include),
        buildingExclude: JSON.stringify(selectedBuilding.value.exclude),
        floorInclude: JSON.stringify(selectedFloor.value.include),
        floorExclude: JSON.stringify(selectedFloor.value.exclude),
        categoryInclude: JSON.stringify(selectedCategory.value.include),
        categoryExclude: JSON.stringify(selectedCategory.value.exclude),
        
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
        startDate: startDate.value,
        endDate: endDate.value,
      }

      if (!params.startDate || !params.endDate) {
        delete params.startDate
        delete params.endDate
      }

      if (mode === 'silent') {
        params._t = Date.now()
      }

      const response = await fetchProductsFromApi(params)
      const newProducts = response.products || []
      const total = response.total || 0

      let transformed = newProducts.map(transformProduct)

      const isMasterView =
        activeView.value === 'all' &&
        selectedBuilding.value.include.length === 0 &&
        selectedBuilding.value.exclude.length === 0 &&
        selectedFloor.value.include.length === 0 &&
        selectedFloor.value.exclude.length === 0 &&
        selectedCategory.value.include.length === 0 &&
        selectedCategory.value.exclude.length === 0

      if (!isMasterView) {
        transformed = transformed.filter((p) => {
          let stockToCheck = 0
          if (activeView.value === 'all') stockToCheck = p.totalStock
          else if (activeView.value === 'gudang') stockToCheck = p.stockGudang
          else if (activeView.value === 'pajangan') stockToCheck = p.stockPajangan
          else if (activeView.value === 'ltc') stockToCheck = p.stockLTC
          return stockToCheck !== 0
        })
      }

      if (!auth.canViewPrices) {
        transformed.forEach((product) => delete product.price)
      }

      // --- LOGIKA UPDATE STATE ---
      if (mode === 'init') {
        displayedProducts.value = transformed
      } else if (mode === 'loadMore') {
        displayedProducts.value.push(...transformed)
      } else if (mode === 'silent') {
        console.groupCollapsed(`Silent @ ${new Date().toLocaleTimeString()}`)
        console.log(`Incoming Items: ${transformed.length}`)

        const incomingMap = new Map(transformed.map((p) => [p.id, p]))
        let patchCount = 0
        let realChangesCount = 0

        displayedProducts.value.forEach((existingProduct) => {
          const updatedData = incomingMap.get(existingProduct.id)
          if (updatedData) {
            const isTotalChanged = existingProduct.totalStock !== updatedData.totalStock
            const isGudangChanged = existingProduct.stockGudang !== updatedData.stockGudang
            const isPajanganChanged = existingProduct.stockPajangan !== updatedData.stockPajangan
            const isLTCChanged = existingProduct.stockLTC !== updatedData.stockLTC
            const isLocationCodeChanged =
              existingProduct.allLocationsCode !== updatedData.allLocationsCode

            if (
              isTotalChanged ||
              isGudangChanged ||
              isPajanganChanged ||
              isLTCChanged ||
              isLocationCodeChanged
            ) {
              console.log(
                `%c[CHANGE] ${existingProduct.name} (SKU: ${existingProduct.sku})`,
                'color: orange; font-weight: bold',
              )
              if (isTotalChanged)
                console.log(
                  `   Total Stock: ${existingProduct.totalStock} -> ${updatedData.totalStock}`,
                )
              if (isGudangChanged)
                console.log(
                  `   Gudang: ${existingProduct.stockGudang} -> ${updatedData.stockGudang}`,
                )
              if (isPajanganChanged)
                console.log(
                  `   Pajangan: ${existingProduct.stockPajangan} -> ${updatedData.stockPajangan}`,
                )
              if (isLocationCodeChanged)
                console.log(
                  `   Loc Codes: ${existingProduct.allLocationsCode} -> ${updatedData.allLocationsCode}`,
                )

              realChangesCount++
            }

            existingProduct.stock_locations = updatedData.stock_locations
            existingProduct.totalStock = updatedData.totalStock
            existingProduct.stockGudang = updatedData.stockGudang
            existingProduct.stockPajangan = updatedData.stockPajangan
            existingProduct.stockLTC = updatedData.stockLTC

            existingProduct.lokasiGudang = updatedData.lokasiGudang
            existingProduct.lokasiPajangan = updatedData.lokasiPajangan
            existingProduct.lokasiLTC = updatedData.lokasiLTC

            existingProduct.allLocationsCode = updatedData.allLocationsCode

            existingProduct.name = updatedData.name
            existingProduct.sku = updatedData.sku
            existingProduct.price = updatedData.price
            existingProduct.weight = updatedData.weight
            patchCount++
          }
        })

        console.log(`Matched Items: ${patchCount}`)

        if (realChangesCount > 0) {
          console.log(
            `%c[RESULT] Data Updated! ${realChangesCount} items changed.`,
            'color: green; font-weight: bold',
          )
        } else {
          console.log(`%c[RESULT] No data changes detected. UI will not update.`, 'color: gray')
        }
        console.groupEnd()
      }

      totalProducts.value = total
    } catch (err) {
      console.error('Error fetching WMS products from API:', err)
      if (mode === 'init') error.value = 'Gagal memuat data produk.'
    } finally {
      if (mode === 'init') loading.value = false
      isLoadingMore.value = false
      isBackgroundLoading.value = false
    }
  }

  function loadMoreProducts() {
    if (hasMoreData.value && !isLoadingMore.value) {
      currentPage.value++
      fetchProducts('loadMore')
    }
  }

  function resetAndRefetch() {
    currentPage.value = 1
    displayedProducts.value = []
    totalProducts.value = 0
    nextTick(() => {
      fetchProducts('init')
    })
  }

  const handleSearchInput = debounce((value) => {
    searchTerm.value = value
  }, 300)

  function handleSort(column) {
    if (sortBy.value === column) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = column
      sortOrder.value = 'asc'
    }
  }

  const hasMoreData = computed(() => displayedProducts.value.length < totalProducts.value)

  onMounted(() => {
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting && !loading.value) {
          loadMoreProducts()
        }
      },
      { threshold: 0.5 },
    )
  })

  onUnmounted(() => {
    clearInterval(refetchIntervalId)
    if (observer) observer.disconnect()
  })

  watch(
    isAutoRefetching,
    (newValue) => {
      if (newValue && !refetchIntervalId) {
        refetchIntervalId = setInterval(() => {
          if (currentPage.value === 1) {
            fetchProducts('silent')
          }
        }, 30000)
      } else if (!newValue && refetchIntervalId) {
        clearInterval(refetchIntervalId)
        refetchIntervalId = null
      }
    },
    { immediate: true },
  )

  watch(
    () => auth.isAuthenticated,
    (isAuth) => {
      if (isAuth) {
        if (displayedProducts.value.length === 0) fetchInitialData()
      }
    },
    { immediate: true },
  )

  watch(loader, (newLoader) => {
    if (observer && newLoader) observer.observe(newLoader)
  })

  watch(
    [
      searchTerm,
      searchBy,
      activeView,
      stockStatusFilter,
      productTypeFilter,
      selectedBuilding,
      selectedFloor,
      selectedCategory,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    ],
    () => {
      resetAndRefetch()
    },
  )

  const searchPlaceholder = computed(
    () => `Cari produk berdasarkan ${searchBy.value === 'name' ? 'Nama' : 'SKU'}...`,
  )

  return {
    activeView,
    displayedProducts,
    loading,
    error,
    loader,
    searchBy,
    stockStatusFilter,
    productTypeFilter,
    searchTerm,
    currentPage,
    totalProducts,
    isLoadingMore,
    isBackgroundLoading,
    hasMoreData,
    searchPlaceholder,
    selectedBuilding,
    selectedFloor,
    selectedCategory,
    sortBy,
    sortOrder,
    allLocations,
    isAutoRefetching,
    startDate,
    endDate,
    handleSearchInput,
    handleSort,
    toggleAutoRefetch,
    visibleColumns,
    availableColumns: AVAILABLE_COLUMNS,
    toggleColumn,
    resetAndRefetch,
    fetchProducts,
  }
}
