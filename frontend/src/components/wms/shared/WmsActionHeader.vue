<script setup>
import { useMobile } from '@/composables/useMobile.js'

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

const { isMobile } = useMobile()
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
    <div :class="isMobile ? 'text-center' : ''">
      <h2
        class="text-2xl font-bold text-text flex items-center gap-3"
        :class="isMobile ? 'text-center items-center justify-center w-full' : 'text-left items-center gap-4'"
      >
        <font-awesome-icon v-if="icon" :icon="icon" :class="iconClass" />
        <span v-html="title"></span>
      </h2>
      <p v-if="description" class="text-text/60 text-xs mt-1">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2" :class="isMobile ? 'w-full justify-center' : ''">
      <slot name="actions"></slot>
      <div id="header-actions" class="flex items-center gap-2 empty:hidden"></div>
    </div>
  </div>
</template>
