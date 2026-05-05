<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, default: '' },
})

</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Header (Optional Title) -->
    <div v-if="title || $slots.header" class="flex justify-between items-center px-1">
      <h3 v-if="title" class="text-sm font-bold text-text/80 uppercase tracking-wider">{{ title }}</h3>
      <slot name="header"></slot>
    </div>

    <!-- TOP ROW (Search, Tabs, Main Actions) -->
    <div v-if="$slots.search || $slots.tabs || $slots.actions"
      class="flex flex-col lg:flex-row flex-wrap justify-between items-start lg:items-center gap-3">
      <!-- Search Area -->
      <slot name="search" v-if="$slots.search" class="bg-red-500 w-full lg:w-auto flex-grow lg:max-w-md xl:max-w-lg">
      </slot>
      <!-- Tabs Area -->
      <slot name="tabs" v-if="$slots.tabs"
        class="bg-background w-full lg:w-auto overflow-x-auto no-scrollbar flex-grow"></slot>
      <!-- Quick Actions (Add, Export, View Toggle) -->
      <slot name="actions" v-if="$slots.actions"
        class="bg-background w-full xl:w-auto flex flex-wrap gap-2 lg:justify-end xl:ml-auto"></slot>
    </div>

    <!-- DIVIDER -->
    <div v-if="($slots.search || $slots.tabs || $slots.actions) && ($slots.filters || $slots['filter-actions'])"
      class="h-px w-full bg-secondary/10 hidden lg:block"></div>

    <!-- BOTTOM ROW (Filters) -->
    <div v-if="$slots.filters || $slots['filter-actions']"
      class="flex flex-col lg:flex-row gap-3 items-center justify-between">
      <!-- Dropdowns / Multi-selects -->
      <div v-if="$slots.filters" class="flex flex-wrap gap-2 items-center w-full lg:w-auto flex-grow">
        <slot name="filters"></slot>
      </div>

      <!-- Filter Specific Actions (Clear, Apply, Column Toggle) -->
      <div v-if="$slots['filter-actions']"
        class="flex gap-2 shrink-0 lg:ml-auto w-full lg:w-auto justify-end items-end h-full">
        <slot name="filter-actions"></slot>
      </div>
    </div>

    <!-- ADVANCED FILTERS ROW -->
    <div v-if="$slots.advanced" class="w-full">
      <slot name="advanced"></slot>
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
