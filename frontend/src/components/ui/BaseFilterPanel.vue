<script setup>
import { ref, computed, useSlots } from 'vue'
import { useMobile } from '@/composables/useMobile.js'

const props = defineProps({
  title: { type: String, default: '' },
  /** Number of active filters to show as badge on mobile toggle */
  activeFilterCount: { type: Number, default: 0 },
  /** Whether the filter panel should collapse on mobile */
  collapsible: { type: Boolean, default: true },
})

const { isMobile } = useMobile()
const slots = useSlots()
const isExpanded = ref(false)

const shouldCollapse = computed(() => isMobile.value && props.collapsible)

const hasCollapsibleContent = computed(() => {
  return !!(slots.tabs || slots.actions || slots.filters || slots['filter-actions'] || slots.advanced)
})

/** True when collapse has NO search slot — needs a standalone toggle row */
const needsStandaloneToggle = computed(() => {
  return shouldCollapse.value && hasCollapsibleContent.value && !slots.search
})
</script>

<template>
  <div class="flex flex-col gap-3">

    <!-- ================================================================ -->
    <!-- CASE A: Mobile + has #search → search stays visible, toggle next -->
    <!-- ================================================================ -->
    <div v-if="shouldCollapse && $slots.search" class="flex gap-2 items-start">
      <div class="flex-grow min-w-0">
        <slot name="search" />
      </div>
      <button v-if="hasCollapsibleContent" @click="isExpanded = !isExpanded"
        class="shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-lg border transition-all relative"
        :class="isExpanded || activeFilterCount > 0
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-background border-secondary text-text/60'" :title="isExpanded ? 'Tutup Filter' : 'Buka Filter'">
        <font-awesome-icon icon="fa-solid fa-sliders" />
        <span v-if="activeFilterCount > 0"
          class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-accent text-secondary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- ================================================================ -->
    <!-- CASE B: Mobile + NO #search → standalone toggle bar              -->
    <!-- ================================================================ -->
    <button v-if="needsStandaloneToggle" @click="isExpanded = !isExpanded"
      class="flex items-center justify-between w-full px-3 py-2 rounded-lg border transition-all" :class="isExpanded || activeFilterCount > 0
        ? 'bg-primary/10 border-primary text-primary'
        : 'bg-secondary/5 border-secondary/20 text-text/70'">
      <div class="flex items-center gap-2 text-sm font-bold">
        <font-awesome-icon icon="fa-solid fa-sliders" />
        <span>{{ title || 'Filter' }}</span>
        <span v-if="activeFilterCount > 0"
          class="min-w-[20px] h-[20px] bg-accent text-secondary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {{ activeFilterCount }}
        </span>
      </div>
      <font-awesome-icon :icon="isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
        class="text-xs opacity-60" />
    </button>

    <!-- ================================================================ -->
    <!-- CASE C: Desktop → original layout (search + tabs + actions row)  -->
    <!-- ================================================================ -->
    <template v-if="!shouldCollapse">
      <!-- Header (Optional Title) -->
      <div v-if="title || $slots.header" class="flex justify-between items-center px-1">
        <h3 v-if="title" class="text-sm font-bold text-text/80 uppercase tracking-wider">{{ title }}</h3>
        <slot name="header"></slot>
      </div>

      <!-- TOP ROW (Search, Tabs, Main Actions) -->
      <div v-if="$slots.search || $slots.tabs || $slots.actions"
        class="flex flex-col lg:flex-row flex-wrap justify-between items-start lg:items-center gap-3">
        <slot name="search" v-if="$slots.search" />
        <slot name="tabs" v-if="$slots.tabs" />
        <slot name="actions" v-if="$slots.actions" />
      </div>

      <!-- DIVIDER -->
      <div v-if="($slots.search || $slots.tabs || $slots.actions) && ($slots.filters || $slots['filter-actions'])"
        class="h-px w-full bg-secondary/10 hidden lg:block"></div>

      <!-- BOTTOM ROW (Filters) -->
      <div v-if="$slots.filters || $slots['filter-actions']"
        class="flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div v-if="$slots.filters" class="flex flex-wrap gap-2 items-center w-full lg:w-auto flex-grow">
          <slot name="filters"></slot>
        </div>
        <div v-if="$slots['filter-actions']"
          class="flex gap-2 shrink-0 lg:ml-auto w-full lg:w-auto justify-end items-end h-full">
          <slot name="filter-actions"></slot>
        </div>
      </div>

      <!-- ADVANCED FILTERS ROW -->
      <div v-if="$slots.advanced" class="w-full">
        <slot name="advanced"></slot>
      </div>
    </template>

    <!-- ================================================================ -->
    <!-- MOBILE COLLAPSIBLE WRAPPER                                       -->
    <!-- ================================================================ -->
    <div v-if="shouldCollapse" class="transition-all duration-300 ease-in-out origin-top" :class="isExpanded
      ? 'max-h-[2000px] opacity-100'
      : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'">

      <!-- Header inside collapsible (only if title exists & standalone toggle didn't already show it) -->
      <div v-if="title && !needsStandaloneToggle" class="flex justify-between items-center px-1 mb-3">
        <h3 class="text-sm font-bold text-text/80 uppercase tracking-wider">{{ title }}</h3>
        <slot name="header"></slot>
      </div>

      <!-- Tabs -->
      <div v-if="$slots.tabs" class="mb-3">
        <slot name="tabs" />
      </div>

      <!-- Actions -->
      <div v-if="$slots.actions" class="mb-3">
        <slot name="actions" />
      </div>

      <!-- Divider -->
      <div v-if="($slots.tabs || $slots.actions) && ($slots.filters || $slots['filter-actions'])"
        class="h-px w-full bg-secondary/10 mb-3"></div>

      <!-- Filters -->
      <div v-if="$slots.filters || $slots['filter-actions']" class="flex flex-col gap-3">
        <div v-if="$slots.filters" class="flex flex-col gap-2 w-full">
          <slot name="filters"></slot>
        </div>
        <div v-if="$slots['filter-actions']" class="flex gap-2 w-full justify-end">
          <slot name="filter-actions"></slot>
        </div>
      </div>

      <!-- Advanced -->
      <div v-if="$slots.advanced" class="w-full mt-3">
        <slot name="advanced"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
