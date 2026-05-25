<!-- frontend/src/components/stats/shared/StatsFilterBar.vue -->
<script setup>
import { ref } from 'vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'

/**
 * A standardized layout for filters in statistics pages.
 */
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  showAdvancedToggle: {
    type: Boolean,
    default: true,
  },
  hasActiveAdvancedFilters: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['apply', 'toggle-advanced'])
const showAdvanced = ref(false)

const handleToggle = () => {
  showAdvanced.value = !showAdvanced.value
  emit('toggle-advanced', showAdvanced.value)
}
</script>

<template>
  <BaseFilterPanel title="Filter Statistik" class="mb-6">
    <template #filters>
      <!-- Main Filters Slot (Search, etc.) -->
      <slot name="main" />
    </template>

    <template #filter-actions>
      <!-- Action Buttons -->
      <button
        v-if="showAdvancedToggle"
        @click="handleToggle"
        class="h-[42px] px-4 flex items-center justify-center gap-2 border rounded-lg text-sm font-semibold transition-colors bg-background flex-1 lg:flex-none mt-auto"
        :class="
          showAdvanced || hasActiveAdvancedFilters
            ? 'border-primary text-primary bg-primary/5'
            : 'border-secondary text-text/70 hover:bg-secondary/10'
        "
      >
        <font-awesome-icon icon="fa-solid fa-sliders" />
        <span>Filter Lanjutan</span>
        <font-awesome-icon
          :icon="showAdvanced ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"
          class="text-[10px] ml-1 opacity-50"
        />
      </button>

      <slot name="actions" />

      <button
        @click="emit('apply')"
        :disabled="loading"
        class="h-[42px] px-6 bg-primary text-secondary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex-1 lg:flex-none flex justify-center items-center mt-auto"
      >
        <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" spin class="mr-2" />
        Terapkan
      </button>
    </template>

    <template #advanced>
      <!-- Advanced Filters Slot -->
      <div
        v-show="showAdvanced"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 animate-fade-in border-t border-secondary/10 mt-2"
      >
        <slot name="advanced" />
      </div>
    </template>
  </BaseFilterPanel>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
