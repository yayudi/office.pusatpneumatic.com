<script setup>
/**
 * A reusable KPI card for top-level metrics.
 */
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: [String, Array],
    default: ''
  },
  colorClass: {
    type: String,
    default: 'text-text'
  },
  bgClass: {
    type: String,
    default: 'bg-secondary/5'
  },
  // For the icon background
  iconBgClass: {
    type: String,
    default: 'bg-primary/10'
  },
  iconColorClass: {
    type: String,
    default: 'text-primary'
  }
});
</script>

<template>
  <div 
    class="border border-secondary/20 rounded-xl p-4 shadow-sm transition-all hover:border-primary/20"
    :class="bgClass"
  >
    <div class="flex justify-between items-start mb-2">
      <span class="text-[10px] font-bold text-text/50 uppercase tracking-wider">{{ label }}</span>
      <div v-if="icon" :class="`w-8 h-8 rounded-full flex items-center justify-center ${iconBgClass} ${iconColorClass}`">
        <font-awesome-icon :icon="icon" />
      </div>
    </div>
    
    <div class="flex flex-col">
      <span class="text-2xl font-black tracking-tight" :class="colorClass">{{ value }}</span>
      <span v-if="subtitle" class="text-xs text-text/40 font-medium">{{ subtitle }}</span>
    </div>
  </div>
</template>
