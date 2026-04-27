<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Filter & Pencarian',
  },
  icon: {
    type: String,
    default: 'fa-solid fa-filter',
  },
})

const isExpanded = ref(false)
</script>

<template>
  <div
    class="flex flex-col bg-secondary/5 rounded-2xl border border-secondary/20 transition-all duration-300 hover:border-secondary/30">
    <!-- Mobile Header / Toggle -->
    <div
      class="md:hidden flex items-center justify-between px-4 py-2 bg-background border-b border-secondary/10 cursor-pointer select-none rounded-lg"
      @click="isExpanded = !isExpanded">
      <div class="flex items-center gap-2 text-text font-bold text-sm">
        <font-awesome-icon :icon="icon" class="text-primary" />
        <span>{{ title }}</span>
      </div>
      <button class="text-text/60 hover:text-primary transition-colors">
        <font-awesome-icon :icon="isExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" />
      </button>
    </div>

    <!-- Main Content Wrapper -->
    <div class="transition-all duration-300 ease-in-out" :class="isExpanded
      ? 'opacity-100 max-h-[1000px]'
      : 'max-h-0 md:max-h-full opacity-0 md:opacity-100 overflow-hidden md:overflow-visible'
      ">
      <div class="p-2 md:p-0 flex flex-col md:flex-row gap-3">
        <slot></slot>
      </div>
    </div>
  </div>
</template>
