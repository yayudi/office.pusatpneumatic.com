<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useFloating, autoUpdate, offset, flip, shift, size } from '@floating-ui/vue'

const props = defineProps({
  modelValue: {
    type: [Object, String, Number, Array, null],
    default: null,
  },
  options: {
    type: Array,
    default: () => [],
  },
  label: {
    type: String,
    default: 'label',
  },
  trackBy: {
    type: String,
    default: 'id',
  },
  placeholder: {
    type: String,
    default: 'Pilih opsi...',
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  internalSearch: {
    type: Boolean,
    default: true,
  },
  emitValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'search-change'])

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref(null)
const triggerRef = ref(null)
const dropdownRef = ref(null)
const inputRef = ref(null)

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

// --- COMPUTED ---
const displayValue = computed(() => {
  if (props.multiple) return ''
  if (props.modelValue == null || props.modelValue === '') return ''
  if (typeof props.modelValue === 'object') {
    return props.modelValue[props.label]
  }
  if (props.emitValue) {
    const matched = props.options.find(opt => {
      if (typeof opt === 'object') return opt[props.trackBy] === props.modelValue
      return opt === props.modelValue
    })
    if (matched && typeof matched === 'object') return matched[props.label]
    if (matched) return matched
  }
  return props.modelValue
})

const filteredOptions = computed(() => {
  if (!props.internalSearch) return props.options
  if (!props.searchable || !searchQuery.value) {
    return props.options
  }
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((option) => {
    const text = typeof option === 'object' ? option[props.label] : String(option)
    return String(text).toLowerCase().includes(query)
  })
})

const selectedItems = computed(() => {
  if (!props.multiple) return []
  return Array.isArray(props.modelValue) ? props.modelValue : []
})

// --- WATCHERS ---
watch(searchQuery, (newQuery) => {
  if (props.searchable) {
    emit('search-change', newQuery)
  }
})

// --- METHODS ---
function toggle() {
  if (props.disabled) return
  if (isOpen.value) {
    close()
  } else {
    open()
  }
}

function open() {
  isOpen.value = true
  if (!props.internalSearch) {
  } else {
    searchQuery.value = ''
  }
  nextTick(() => {
    if (props.searchable && inputRef.value) {
      inputRef.value.focus()
    }
  })
}

function close() {
  isOpen.value = false
  if (props.internalSearch) {
    searchQuery.value = ''
  }
}

function getOptionValue(option) {
  if (props.emitValue && typeof option === 'object') {
    return option[props.trackBy]
  }
  return option
}

function select(option) {
  const valueToEmit = getOptionValue(option)

  if (props.multiple) {
    const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const index = findIndex(current, valueToEmit)
    if (index === -1) {
      current.push(valueToEmit)
    } else {
      current.splice(index, 1)
    }
    emit('update:modelValue', current)
  } else {
    emit('update:modelValue', valueToEmit)
    close()
  }
}

function removeTag(item, event) {
  event.stopPropagation()
  if (!props.multiple) return
  const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  const index = findIndex(current, item)
  if (index !== -1) {
    current.splice(index, 1)
    emit('update:modelValue', current)
  }
}

function findIndex(array, val) {
  return array.findIndex(item => {
    if (typeof item === 'object' && typeof val === 'object' && props.trackBy) {
      if (item[props.trackBy] !== undefined) {
        return item[props.trackBy] === val[props.trackBy]
      }
    }
    return item === val
  })
}

function isSelected(option) {
  const val = getOptionValue(option)
  if (props.multiple) {
    return findIndex(selectedItems.value, val) !== -1
  }
  if (props.modelValue == null || props.modelValue === '') return false
  if (typeof props.modelValue === 'object' && typeof val === 'object' && props.trackBy) {
    if (props.modelValue[props.trackBy] !== undefined) {
      return props.modelValue[props.trackBy] === val[props.trackBy]
    }
  }
  return props.modelValue === val
}

function selectAll() {
  if (!props.multiple) return
  const current = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  filteredOptions.value.forEach(opt => {
    const val = getOptionValue(opt)
    if (findIndex(current, val) === -1) {
      current.push(val)
    }
  })
  emit('update:modelValue', current)
}

function clearSelection() {
  if (!props.multiple) return
  emit('update:modelValue', [])
}

// Click Outside Handler
const handleClickOutside = (event) => {
  const isClickInsideContainer = containerRef.value && containerRef.value.contains(event.target)
  const isClickInsideDropdown = dropdownRef.value && dropdownRef.value.contains(event.target)

  if (!isClickInsideContainer && !isClickInsideDropdown) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="containerRef" class="relativ text-left font-sans">
    <!-- TRIGGER AREA -->
    <div ref="triggerRef" @click="toggle"
      class="w-full min-h-[42px] px-2 bg-background border rounded-lg cursor-pointer flex flex-wrap gap-1.5 items-center transition-all shadow-sm"
      :class="[
        isOpen ? 'border-primary ring-1 ring-primary' : 'border-secondary/50 hover:border-primary/50',
        disabled ? 'opacity-50 cursor-not-allowed bg-secondary/10' : ''
      ]">
      <!-- Loading Indicator -->
      <div v-if="loading" class="absolute right-8 top-1/2 -translate-y-1/2">
        <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-primary text-xs" />
      </div>

      <!-- Multiple: Tags -->
      <template v-if="multiple && selectedItems.length > 0">
        <div v-for="item in selectedItems" :key="typeof item === 'object' ? item[trackBy] : item"
          class="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
          <span>{{
            (typeof item === 'object') ? item[label] :
              (props.emitValue ? (options.find(o => (typeof o === 'object' ? o[trackBy] === item : o === item))?.[label]
                || item) : item)
          }}</span>
          <span @click="(e) => removeTag(item, e)" class="cursor-pointer hover:text-primary/70 font-bold">&times;</span>
        </div>
      </template>

      <!-- Single: Display Value -->
      <span v-else-if="!multiple && modelValue" class="text-sm text-text font-medium truncate pr-2 flex-grow">
        {{ displayValue }}
      </span>

      <!-- Placeholder -->
      <span v-if="(modelValue == null || modelValue === '') && !multiple || (multiple && selectedItems.length === 0)"
        class="text-sm text-text/40 truncate pr-2 flex-grow">
        {{ placeholder }}
      </span>

      <!-- Icon Chevron -->
      <div class="ml-auto pl-2">
        <font-awesome-icon icon="fa-solid fa-chevron-down"
          class="text-xs text-text/40 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
      </div>
    </div>

    <!-- DROPDOWN MENU (TELEPORTED) -->
    <Teleport to="body">
      <transition enter-active-class="transition-opacity duration-150 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition-opacity duration-100 ease-in"
        leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isOpen" ref="dropdownRef" :style="floatingStyles"
          class="z-[9999] bg-background border border-secondary/20 rounded-lg shadow-xl overflow-hidden text-sm">
          <!-- Search Input -->
          <div v-if="searchable" class="p-2 border-b border-secondary/10 bg-secondary/5">
            <div class="relative">
              <font-awesome-icon icon="fa-solid fa-magnifying-glass"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-text/30 text-xs" />
              <input ref="inputRef" v-model="searchQuery" type="text" placeholder="Cari..."
                class="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-secondary/20 rounded-md focus:outline-none focus:border-primary text-text placeholder:text-text/30"
                @keydown.esc="close" />
            </div>
          </div>

          <!-- Multiple Selection Action Buttons -->
          <div v-if="multiple"
            class="p-2 border-b border-secondary/10 bg-background flex flex-wrap gap-2 justify-between items-center text-xs">
            <button @click.stop="selectAll"
              class="text-primary hover:text-primary/80 font-semibold px-2 py-1 rounded hover:bg-primary/10 transition-colors">
              <font-awesome-icon icon="fa-solid fa-check-double" class="mr-1" /> Pilih Semua
            </button>
            <button @click.stop="clearSelection"
              class="text-danger hover:text-danger/80 font-semibold px-2 py-1 rounded hover:bg-danger/10 transition-colors">
              <font-awesome-icon icon="fa-solid fa-eraser" class="mr-1" /> Bersihkan
            </button>
          </div>

          <!-- Options List (Multiple as Chip Cloud) -->
          <div v-if="multiple"
            class="max-h-[300px] overflow-y-auto custom-scrollbar p-3 flex flex-wrap gap-2 items-start content-start">
            <div v-if="loading" class="w-full text-center text-text/60 italic text-xs py-2">
              Memuat data...
            </div>
            <div v-else-if="filteredOptions.length === 0" class="w-full text-center text-text/40 italic text-xs py-2">
              <slot name="noResult">Tidak ada opsi ditemukan.</slot>
            </div>
            <button v-else v-for="(option, index) in filteredOptions"
              :key="typeof option === 'object' ? option[trackBy] : index" @click.stop="select(option)"
              class="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              :class="[
                isSelected(option)
                  ? 'bg-primary text-secondary border border-transparent hover:brightness-110'
                  : 'bg-secondary/10 text-text border border-secondary/30 hover:bg-secondary/20'
              ]">
              <span class="truncate max-w-[200px] text-left">
                <slot name="option" :option="option" :selected="isSelected(option)">
                  {{ typeof option === 'object' ? option[label] : option }}
                </slot>
              </span>
              <font-awesome-icon v-if="isSelected(option)" icon="fa-solid fa-check" class="text-[10px]" />
              <font-awesome-icon v-else icon="fa-solid fa-plus" class="text-[10px]" />
            </button>
          </div>

          <!-- Options List (Single mode) -->
          <ul v-else class="max-h-60 overflow-y-auto custom-scrollbar p-1">
            <li v-if="loading" class="px-3 py-4 text-center text-text/60 italic text-xs">
              Memuat data...
            </li>
            <li v-else-if="filteredOptions.length === 0" class="px-3 py-4 text-center text-text/40 italic text-xs">
              <slot name="noResult">Tidak ada opsi ditemukan.</slot>
            </li>

            <li v-else v-for="(option, index) in filteredOptions"
              :key="typeof option === 'object' ? option[trackBy] : index" @mousedown.prevent.stop="select(option)"
              class="px-3 py-2 rounded-md cursor-pointer flex justify-between items-center transition-colors group"
              :class="[
                isSelected(option)
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-text hover:bg-secondary/10'
              ]">
              <!-- Slot for Custom Option Content -->
              <div class="flex-1 w-full truncate text-left">
                <slot name="option" :option="option" :selected="isSelected(option)">
                  {{ typeof option === 'object' ? option[label] : option }}
                </slot>
              </div>

              <!-- Checkmark for Selected -->
              <font-awesome-icon v-if="isSelected(option)" icon="fa-solid fa-check" class="text-xs ml-2" />
            </li>
          </ul>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(var(--color-secondary), 0.2);
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--color-secondary), 0.4);
}
</style>
