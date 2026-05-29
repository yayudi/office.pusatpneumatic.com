<!-- frontend\src\components\wms\shared\WmsActionHeader.vue -->
<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  iconClass: {
    type: String,
    default: 'text-primary'
  }
})
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
    <div>
      <h2 class="text-2xl font-bold text-text flex items-center gap-3">
        <font-awesome-icon v-if="icon" :icon="icon" :class="iconClass" />
        <span v-html="title"></span>
      </h2>
      <p v-if="description" class="text-text/60 text-xs mt-1">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions"></slot>
      <div id="header-actions" class="flex items-center gap-2 empty:hidden"></div>
    </div>
  </div>
</template>
