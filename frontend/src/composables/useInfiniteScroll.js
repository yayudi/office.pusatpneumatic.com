// frontend\src\composables\useInfiniteScroll.js
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

export function useInfiniteScroll(sourceArray, options = {}) {
  const { step = 12, rootMargin = '200px' } = options

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
      displayedCount.value += step
    }
  }

  const reset = () => {
    displayedCount.value = step
  }

  const setupObserver = () => {
    if (observer) observer.disconnect()

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore.value) {
          setTimeout(() => {
            loadMore()
          }, 300)
        }
      },
      {
        rootMargin,
        threshold: 0.1,
      },
    )

    if (loaderRef.value) {
      observer.observe(loaderRef.value)
    }
  }

  watch(loaderRef, (el) => {
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

  onUnmounted(() => {
    if (observer) observer.disconnect()
  })

  return {
    displayedItems,
    hasMore,
    reset,
    loaderRef,
  }
}
