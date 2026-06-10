// frontend\src\composables\useInfiniteScroll.js
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

export function useInfiniteScroll(sourceArray, options = {}) {
  const { step = 24, rootMargin = '600px' } = options

  const displayedCount = ref(step)
  const loaderRef = ref(null)
  let observer = null

  const displayedItems = computed(() => {
    if (!sourceArray.value) return []
    return sourceArray.value.slice(0, displayedCount.value)
  })

  const hasMore = computed(() => {
    if (!sourceArray.value) return false
    return displayedCount.value < sourceArray.value.length
  })

  const loadMore = () => {
    if (hasMore.value) {
      console.log(
        `[InfiniteScroll] loadMore dipanggil. Menambah dari ${displayedCount.value} ke ${displayedCount.value + step}`
      )
      displayedCount.value += step
    } else {
      console.log(`[InfiniteScroll] loadMore dipanggil, tapi hasMore = false.`)
    }
  }

  const reset = () => {
    displayedCount.value = step
  }

  const setupObserver = () => {
    if (observer) observer.disconnect()

    observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        console.log(
          `[InfiniteScroll] Sensor berstatus isIntersecting: ${entry.isIntersecting}, hasMore: ${hasMore.value}`
        )
        if (entry.isIntersecting && hasMore.value) {
          loadMore()
        }
      },
      {
        rootMargin,
        threshold: 0 // Trigger sedini mungkin
      }
    )

    if (loaderRef.value) {
      observer.observe(loaderRef.value)
    }
  }

  watch(loaderRef, el => {
    if (el) setupObserver()
  })

  watch(sourceArray, () => {
    nextTick(() => {
      if (loaderRef.value && observer) {
        observer.unobserve(loaderRef.value)
        observer.observe(loaderRef.value)
      }
    })
  })

  watch(displayedCount, () => {
    setTimeout(() => {
      if (loaderRef.value && observer) {
        console.log(`[InfiniteScroll] Re-observe sensor setelah displayedCount berubah.`)
        observer.unobserve(loaderRef.value)
        observer.observe(loaderRef.value)
      }
    }, 100)
  })

  onUnmounted(() => {
    if (observer) observer.disconnect()
  })

  return {
    displayedItems,
    hasMore,
    reset,
    loaderRef
  }
}
