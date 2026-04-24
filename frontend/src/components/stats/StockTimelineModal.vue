<script setup>
import StockTimelineSlider from './StockTimelineSlider.vue';

defineProps({
  show: {
    type: Boolean,
    required: true
  },
  productId: {
    type: String,
    required: false
  }
});

defineEmits(['close']);
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      @click.self="$emit('close')">
      <div class="bg-background w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[70vh] border border-secondary/20">
        
        <!-- Compact Header -->
        <div class="px-4 py-3 border-b border-secondary/10 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-clock-rotate-left" class="text-primary text-sm" />
            <span class="font-bold text-sm text-text">Timeline Stok</span>
          </div>
          <button @click="$emit('close')"
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary/20 text-text/40 hover:text-text transition-colors text-xs">
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <StockTimelineSlider v-if="productId" :productId="productId" :buildings="[]" />
        </div>

      </div>
    </div>
  </Teleport>
</template>
