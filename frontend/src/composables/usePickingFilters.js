// frontend/src/composables/usePickingFilters.js
import { reactive, computed } from 'vue'
import debounce from 'lodash/debounce'

export function usePickingFilters(initialState = {}, emitChangeFn = null) {
  const defaultState = {
    search: '',
    source: 'ALL',
    locationPurpose: 'ALL',
    stockStatus: 'ALL',
    shopName: 'ALL',
    sortBy: 'newest',
    viewMode: 'grid',
    startDate: '',
    endDate: '',
  }

  const filterState = reactive({ ...defaultState, ...initialState })

  const hasActiveFilters = computed(() => {
    return (
      filterState.source !== 'ALL' ||
      filterState.locationPurpose !== 'ALL' ||
      filterState.stockStatus !== 'ALL' ||
      filterState.shopName !== 'ALL' ||
      filterState.search !== '' ||
      filterState.startDate !== '' ||
      filterState.endDate !== ''
    )
  })

  function clearFilters() {
    filterState.search = ''
    filterState.source = 'ALL'
    filterState.locationPurpose = 'ALL'
    filterState.stockStatus = 'ALL'
    filterState.shopName = 'ALL'
    filterState.startDate = ''
    filterState.endDate = ''
    if (emitChangeFn) emitChangeFn({ ...filterState })
  }

  const emitDebouncedSearch = debounce(() => {
    if (emitChangeFn) emitChangeFn({ ...filterState })
  }, 300)

  function onSearchInput(event) {
    filterState.search = event.target.value
    emitDebouncedSearch()
  }

  function onSelectChange(field, option) {
    filterState[field] = typeof option === 'object' ? option.id : option

    if (field === 'source' && filterState.source !== 'Offline') {
      filterState.locationPurpose = 'ALL'
    }

    if (emitChangeFn) emitChangeFn({ ...filterState })
  }

  return {
    filterState,
    hasActiveFilters,
    clearFilters,
    onSearchInput,
    onSelectChange,
  }
}
