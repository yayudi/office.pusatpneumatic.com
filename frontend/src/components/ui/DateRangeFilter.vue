<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { useMobile } from '@/composables/useMobile'

const props = defineProps({
  startDate: { type: String, default: null },
  endDate: { type: String, default: null },
  align: { type: String, default: 'left' }
})

const emit = defineEmits(['update:startDate', 'update:endDate', 'change'])

const isOpen = ref(false)
const containerRef = ref(null)
const popoverStyle = ref({})
const { isMobile } = useMobile()

// Local state for the picker
const tempStart = ref('')
const tempEnd = ref('')

const presets = [
  { label: 'Hari Ini', getValue: () => [new Date(), new Date()] },
  { label: 'Kemarin', getValue: () => [subDays(new Date(), 1), subDays(new Date(), 1)] },
  { label: '7 Hari Terakhir', getValue: () => [subDays(new Date(), 6), new Date()] },
  { label: '30 Hari Terakhir', getValue: () => [subDays(new Date(), 29), new Date()] },
  { label: 'Bulan Ini', getValue: () => [startOfMonth(new Date()), new Date()] },
]

// Formatting helper
const formatDateYMD = (date) => format(date, 'yyyy-MM-dd')
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return ''
  return format(parseISO(dateStr), 'dd MMM yyyy', { locale: id })
}

// Button label display
const displayLabel = computed(() => {
  if (!props.startDate && !props.endDate) return 'Filter Tanggal'
  if (props.startDate && !props.endDate) return `${formatDateDisplay(props.startDate)} - ...`
  if (!props.startDate && props.endDate) return `... - ${formatDateDisplay(props.endDate)}`

  if (props.startDate === props.endDate) {
    return formatDateDisplay(props.startDate)
  }
  return `${formatDateDisplay(props.startDate)} - ${formatDateDisplay(props.endDate)}`
})

const updatePosition = () => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()

  const style = {
    top: `${rect.bottom + 8}px`,
  }

  // Get popover width if rendered, otherwise use safe estimate
  let popoverWidth = 460
  const popoverEl = document.querySelector('.date-range-popover')
  if (popoverEl) {
    popoverWidth = popoverEl.getBoundingClientRect().width
  }

  // Collision logic
  let useRight = props.align === 'right'

  if (!useRight && (rect.left + popoverWidth > window.innerWidth - 16)) {
    // If left-aligned but overflows right edge
    useRight = true
  }

  if (useRight && (rect.right - popoverWidth < 16)) {
    // If right-aligned but overflows left edge
    useRight = false
  }

  // Apply final position with safe margins
  if (useRight) {
    let rightPos = window.innerWidth - rect.right
    // Prevent cut off on the right
    if (rightPos < 16) rightPos = 16

    style.right = `${rightPos}px`
    style.left = 'auto'
  } else {
    let leftPos = rect.left
    // Prevent cut off on the left
    if (leftPos < 16) leftPos = 16

    style.left = `${leftPos}px`
    style.right = 'auto'
  }

  popoverStyle.value = style
}

const toggleDropdown = async () => {
  if (!isOpen.value) {
    tempStart.value = props.startDate || ''
    tempEnd.value = props.endDate || ''
    isOpen.value = true
    await nextTick()
    updatePosition()
  } else {
    isOpen.value = false
  }
}

const selectPreset = (preset) => {
  const [start, end] = preset.getValue()
  tempStart.value = formatDateYMD(start)
  tempEnd.value = formatDateYMD(end)
}

const applyFilter = () => {
  emit('update:startDate', tempStart.value || undefined)
  emit('update:endDate', tempEnd.value || undefined)
  emit('change', { startDate: tempStart.value || undefined, endDate: tempEnd.value || undefined })
  isOpen.value = false
}

const clearFilter = () => {
  tempStart.value = ''
  tempEnd.value = ''
  applyFilter()
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (containerRef.value && containerRef.value.contains(event.target)) return
  if (event.target.closest('.date-range-popover')) return
  isOpen.value = false
}

const handleScrollOrResize = () => {
  if (isOpen.value && !isMobile.value) isOpen.value = false
  if (isOpen.value && isMobile.value) updatePosition()
}

const handleWindowResize = () => {
  if (isOpen.value) updatePosition()
}

watch(isOpen, (val) => {
  if (val) {
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleWindowResize)
    nextTick(updatePosition)
  } else {
    document.removeEventListener('click', handleClickOutside)
    window.removeEventListener('scroll', handleScrollOrResize, true)
    window.removeEventListener('resize', handleWindowResize)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="relative inline-block" ref="containerRef">
    <!-- Trigger Button -->
    <button @click.stop="toggleDropdown"
      class="w-full flex items-center gap-2 px-4 py-2 bg-background border border-secondary/30 rounded-lg hover:border-primary/50 hover:bg-secondary/5 transition-all text-sm font-medium text-text group whitespace-nowrap"
      :class="{ 'border-primary ring-1 ring-primary/20': isOpen || startDate }">
      <font-awesome-icon icon="fa-solid fa-calendar" class="text-text/50 group-hover:text-primary transition-colors" />
      <span class="whitespace-nowrap w-full">{{ displayLabel }}</span>
      <font-awesome-icon icon="fa-solid fa-chevron-down" class="text-xs text-text/30 ml-1 transition-transform"
        :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Popover via Teleport -->
    <Teleport to="body">
      <div v-if="isOpen"
        class="date-range-popover fixed z-50 w-auto min-w-[320px] max-w-[calc(100vw-32px)] md:max-w-[600px] bg-background border border-secondary/20 shadow-xl rounded-xl overflow-hidden flex flex-col md:flex-row ml-[-5vw] md:m-0"
        :style="popoverStyle">

        <!-- Sidebar / Presets -->
        <div
          class="bg-secondary/5 border-b md:border-b-0 md:border-r border-secondary/20 p-2 grid grid-cols-2 gap-4 md:flex md:justify-start md:flex-col md:gap-1 w-full md:w-[140px] overflow-x-auto md:overflow-visible">
          <button v-for="(preset, idx) in presets" :key="idx" @click="selectPreset(preset)"
            class="px-3 py-2 text-left text-primary text-xs font-medium rounded hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap">
            {{ preset.label }}
          </button>
        </div>

        <!-- Custom Range Inputs -->
        <div class="p-4 flex-1">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text/50 mb-3">Custom Range</h4>
          <div class="flex flex-col gap-3 mb-4">
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <label class="text-[10px] uppercase text-text/60 font-semibold tracking-wider">Dari</label>
              </div>
              <input type="date" v-model="tempStart"
                class="w-full px-3 py-2 bg-background border border-secondary/30 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-text/30 text-text" />
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <label class="text-[10px] uppercase text-text/60 font-semibold tracking-wider">Sampai</label>
              </div>
              <input type="date" v-model="tempEnd" :min="tempStart"
                class="w-full px-3 py-2 bg-background border border-secondary/30 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-text/30 text-text" />
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-between items-center pt-3 border-t border-secondary/10">
            <button @click="clearFilter"
              class="text-xs text-danger/80 hover:text-danger font-medium px-2 py-1 rounded hover:bg-danger/5 transition-colors">
              Reset
            </button>
            <div class="flex gap-2">
              <button @click="closeDropdown"
                class="px-3 py-1.5 text-xs font-medium text-text/70 hover:bg-secondary/10 rounded-lg transition-colors border border-transparent">
                Batal
              </button>
              <button @click="applyFilter"
                class="px-3 py-1.5 text-xs font-bold text-background bg-primary hover:bg-primary-dark rounded-lg shadow-sm shadow-primary/30 transition-all hover:scale-[1.02]">
                Terapkan
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
