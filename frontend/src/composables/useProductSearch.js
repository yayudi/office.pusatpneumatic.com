// frontend/src/composables/useProductSearch.js
import { ref, watch, computed } from 'vue'
import debounce from 'lodash/debounce'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { searchProducts } from '@/api/helpers/products.js'

/**
 * Composable for debounced product search.
 * Reusable across any component that needs SKU/product name autocomplete.
 * @param {object} options
 * @param {number} [options.debounceMs=300] - Debounce delay in milliseconds
 * @param {number} [options.minChars=2] - Minimum characters before triggering search
 * @param {number} [options.maxResults=20] - Maximum number of results to return
 * @param {import('vue').Ref<string|number|null>} [options.locationId] - Reactive locationId filter
 */
export const useProductSearch = (options = {}) => {
  const { debounceMs = 300, minChars = 2, maxResults = 20, locationId = ref(null) } = options

  const query = ref('')
  const debouncedQuery = ref('')
  const selectedProduct = ref(null)

  // Location id helper
  const resolvedLocationId = computed(() => {
    return typeof locationId === 'object' && locationId !== null && 'value' in locationId
      ? locationId.value
      : locationId
  })

  // Setup Infinite Query
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } = useInfiniteQuery({
    queryKey: computed(() => ['productSearch', debouncedQuery.value, resolvedLocationId.value]),
    queryFn: async ({ pageParam = 1 }) => {
      if (!debouncedQuery.value || debouncedQuery.value.trim().length < minChars) {
        return { data: [], nextCursor: null }
      }
      const res = await searchProducts(debouncedQuery.value.trim(), resolvedLocationId.value, pageParam, maxResults)
      // If res is array (backward compat), wrap it. Else it is { data, nextCursor }
      return Array.isArray(res) ? { data: res, nextCursor: null } : res
    },
    getNextPageParam: lastPage => lastPage.nextCursor || undefined,
    enabled: computed(() => !!debouncedQuery.value && debouncedQuery.value.trim().length >= minChars),
    staleTime: 60 * 1000 // Cache for 1 minute to prevent rapid refetching of the same search
  })

  // Flatten pages into a single array
  const results = computed(() => {
    if (!data.value) return []
    return data.value.pages.flatMap(page => page.data || [])
  })

  // isSearching flag backward compatibility
  const isSearching = computed(() => isFetching.value && !isFetchingNextPage.value)

  const debouncedUpdate = debounce(term => {
    debouncedQuery.value = term
  }, debounceMs)

  watch(query, newVal => {
    // When selectedProduct is set and query matches the display text, skip search entirely
    if (selectedProduct.value) {
      const displayText = `${selectedProduct.value.sku} - ${selectedProduct.value.name}`
      if (newVal === displayText) {
        // Query was set programmatically by selectProduct, no need to search
        debouncedUpdate.cancel()
        debouncedQuery.value = '' // Clear query so it doesn't fetch
        return
      }
      // User typed something different, deselect
      selectedProduct.value = null
    }

    if (!newVal || newVal.trim().length < minChars) {
      debouncedUpdate.cancel()
      debouncedQuery.value = ''
      return
    }

    debouncedUpdate(newVal)
  })

  /**
   * Select a product from results and populate query field.
   * @param {object} product - The product object with at least { id, sku, name }
   * @returns {object} The selected product
   */
  const selectProduct = product => {
    selectedProduct.value = product
    query.value = `${product.sku} - ${product.name}`
    debouncedQuery.value = '' // Clear query to stop fetching
    return product
  }

  /** Clear all search state */
  const clear = () => {
    query.value = ''
    debouncedQuery.value = ''
    selectedProduct.value = null
    debouncedUpdate.cancel()
  }

  // Fallback for manual trigger (some components might still call this directly)
  const performSearch = async searchTerm => {
    query.value = searchTerm
    // The watch will pick this up and debounce it, but if they await it, it won't resolve exactly when data is ready.
    // That's fine because it's mostly a UI reactive trigger.
  }

  return {
    query,
    results,
    isSearching,
    selectedProduct,
    selectProduct,
    clear,
    performSearch,

    // New Infinite Scroll variables
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  }
}
