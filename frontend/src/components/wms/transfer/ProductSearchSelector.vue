<!-- frontend/src/components/wms/transfer/ProductSearchSelector.vue -->
<script setup>
import { ref, watch, toRef, onMounted, onUnmounted } from 'vue'
import { useProductSearch } from '@/composables/useProductSearch.js'
import { useFloating, autoUpdate, offset, flip, shift, size } from '@floating-ui/vue'

const props = defineProps({
  modelValue: { type: Object, default: null },
  placeholder: { type: String, default: 'Ketik nama / SKU...' },
  locationId: { type: [Number, String], default: null },
  disabled: { type: Boolean, default: false },
  enableScanner: { type: Boolean, default: false },
  displayField: { type: String, default: 'name' }
})

const emit = defineEmits(['update:modelValue', 'scanner-match'])

// Search logic from composable
const {
  results: searchResults,
  isSearching: isLoading,
  performSearch,
  clear: clearSearch
} = useProductSearch({ locationId: toRef(props, 'locationId') })

const searchQuery = ref('')
const showDropdown = ref(false)
const inputRef = ref(null)
const triggerRef = ref(null)
const dropdownRef = ref(null)

const { floatingStyles } = useFloating(triggerRef, dropdownRef, {
  placement: 'bottom-start',
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(4),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ rects, elements }) {
        Object.assign(elements.floating.style, {
          width: `${rects.reference.width}px`
        })
      }
    })
  ]
})

// --- LOGIC ---
watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      searchQuery.value = newVal[props.displayField] || newVal.name
    } else {
      searchQuery.value = ''
    }
  },
  { immediate: true }
)

import debounce from 'lodash/debounce'

// ... (logic above remains) ...

const debouncedSearch = debounce(async (query) => {
  if (query.length < 2) return
  await performSearch(query)
  
  if (props.enableScanner && searchResults.value.length > 0) {
    const match = searchResults.value.find(p => p.sku.toLowerCase() === query.toLowerCase())
    if (match) {
      console.log('[Scanner Auto] Exact match found:', match.sku)
      emit('scanner-match', match)
      searchQuery.value = ''
      showDropdown.value = false
      return
    }
  }

  if (searchResults.value.length > 0) {
    showDropdown.value = true
  }
}, 300)

async function handleInput() {
  const query = searchQuery.value
  if (!query) {
    emit('update:modelValue', null)
    clearSearch()
    showDropdown.value = false
    return
  }
  
  // Call the debounced function instead of immediate performSearch
  debouncedSearch(query)
}

function selectItem(item) {
  emit('update:modelValue', item)
  searchQuery.value = item[props.displayField] || item.name
  showDropdown.value = false
}

const handleKeydown = (event) => {
  if (props.enableScanner && (event.key === 'Enter' || event.key === 'Tab')) {
    event.preventDefault()
  }
}

const handleEnterKey = () => {
  if (showDropdown.value && searchResults.value.length > 0) {
    selectItem(searchResults.value[0])
  }
}

function closeDropdown() {
  showDropdown.value = false
}

const handleClickOutside = event => {
  const isClickInsideContainer = triggerRef.value && triggerRef.value.contains(event.target)
  const isClickInsideDropdown = dropdownRef.value && dropdownRef.value.contains(event.target)

  if (!isClickInsideContainer && !isClickInsideDropdown) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const getStockColor = stock => {
  if (!stock || stock <= 0) return 'text-danger bg-danger/10 border-danger/20'
  if (stock < 10) return 'text-warning bg-warning/10 border-warning/20'
  return 'text-success bg-success/10 border-success/20'
}

const focusInput = () => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

defineExpose({ focusInput })
</script>

<template>
  <div class="relative w-full h-[42px] shadow-sm rounded-lg text-left font-sans" ref="triggerRef">
    <div class="relative h-full">
      <input
        type="text"
        ref="inputRef"
        v-model="searchQuery"
        @input="handleInput"
        @keydown="handleKeydown"
        @keydown.enter="handleEnterKey"
        @focus="
          () => {
            if (searchResults.length && !disabled) {
              showDropdown = true
            }
          }
        "
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full h-full pl-9 pr-8 py-1.5 bg-background border rounded-lg text-sm text-text focus:outline-none transition-all font-medium placeholder-text/40"
        :class="[
          showDropdown ? 'border-primary ring-1 ring-primary' : 'border-secondary/50 hover:border-primary/50',
          disabled ? 'opacity-50 cursor-not-allowed bg-secondary/10' : ''
        ]"
      />

      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-text/40 text-xs">
        <font-awesome-icon v-if="isLoading" icon="fa-solid fa-circle-notch" spin class="text-primary" />
        <font-awesome-icon v-else icon="fa-solid fa-search" />
      </div>

      <button
        v-if="searchQuery"
        @click="(handleInput({ target: { value: '' } }), (searchQuery = ''), (showDropdown = false))"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-text/30 hover:text-danger transition-colors flex items-center justify-center w-5 h-5"
      >
        <font-awesome-icon icon="fa-solid fa-times" />
      </button>
    </div>

    <Teleport to="body">
      <transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showDropdown && (searchResults.length > 0 || isLoading)"
          ref="dropdownRef"
          :style="floatingStyles"
          class="z-[9999] bg-background border border-secondary/20 rounded-lg shadow-xl overflow-hidden text-sm"
        >
          <ul class="max-h-60 overflow-y-auto custom-scrollbar p-1">
            <li
              v-for="item in searchResults"
              :key="item.id || item.sku"
              @mousedown.prevent.stop="selectItem(item)"
              class="px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors group text-text hover:bg-secondary/10"
            >
              <div class="flex-1 min-w-0">
                <div class="font-bold text-sm text-text group-hover:text-primary truncate text-left">
                  {{ item.name }}
                </div>
                <div class="text-[10px] text-text/50 font-mono text-left">SKU: {{ item.sku }}</div>
              </div>

              <div
                v-if="item.current_stock !== undefined"
                class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ml-2"
                :class="getStockColor(item.current_stock)"
              >
                Stok: {{ item.current_stock }}
              </div>
            </li>

            <li
              v-if="!isLoading && searchResults.length === 0"
              class="px-3 py-4 text-center text-text/40 italic text-xs"
            >
              Tidak ada hasil.
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
