// frontend/src/composables/useProductSearch.js
import { ref, watch, onUnmounted } from 'vue'
import debounce from 'lodash/debounce'
import { searchProducts } from '@/api/helpers/products.js'

/**
 * Composable for debounced product search.
 * Reusable across any component that needs SKU/product name autocomplete.
 * @param {object} options
 * @param {number} [options.debounceMs=300] - Debounce delay in milliseconds
 * @param {number} [options.minChars=2] - Minimum characters before triggering search
 * @param {number} [options.maxResults=20] - Maximum number of results to return
 * @param {import('vue').Ref<string|number|null>} [options.locationId] - Reactive locationId filter
 * @returns {{ query: import('vue').Ref<string>, results: import('vue').Ref<Array>, isSearching: import('vue').Ref<boolean>, clear: () => void, selectProduct: (product: object) => object, performSearch: (searchTerm: string) => Promise<void> }}
 */
export const useProductSearch = (options = {}) => {
  const {
    debounceMs = 300,
    minChars = 2,
    maxResults = 20,
    locationId = ref(null)
  } = options

  const query = ref('')
  const results = ref([])
  const isSearching = ref(false)
  const selectedProduct = ref(null)

  const performSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < minChars) {
      results.value = []
      return
    }

    isSearching.value = true
    try {
      const locationVal = typeof locationId === 'object' && 'value' in locationId
        ? locationId.value
        : locationId

      const res = await searchProducts(searchTerm.trim(), locationVal)
      const data = Array.isArray(res) ? res : (res?.data || [])
      results.value = data.slice(0, maxResults)
    } catch (err) {
      console.error('[useProductSearch] Search failed:', err)
      results.value = []
    } finally {
      isSearching.value = false
    }
  }

  const debouncedSearch = debounce((term) => {
    performSearch(term)
  }, debounceMs)

  watch(query, (newVal) => {
    // When selectedProduct is set and query matches the display text, skip search entirely
    if (selectedProduct.value) {
      const displayText = `${selectedProduct.value.sku} - ${selectedProduct.value.name}`
      if (newVal === displayText) {
        // Query was set programmatically by selectProduct, no need to search
        debouncedSearch.cancel()
        return
      }
      // User typed something different, deselect
      selectedProduct.value = null
    }

    if (!newVal || newVal.trim().length < minChars) {
      debouncedSearch.cancel()
      results.value = []
      return
    }

    debouncedSearch(newVal)
  })

  /**
   * Select a product from results and populate query field.
   * @param {object} product - The product object with at least { id, sku, name }
   * @returns {object} The selected product
   */
  const selectProduct = (product) => {
    selectedProduct.value = product
    query.value = `${product.sku} - ${product.name}`
    results.value = []
    return product
  }

  /** Clear all search state */
  const clear = () => {
    query.value = ''
    results.value = []
    selectedProduct.value = null
    isSearching.value = false
    debouncedSearch.cancel()
  }

  onUnmounted(() => {
    debouncedSearch.cancel()
  })

  return {
    query,
    results,
    isSearching,
    selectedProduct,
    selectProduct,
    clear,
    performSearch
  }
}
