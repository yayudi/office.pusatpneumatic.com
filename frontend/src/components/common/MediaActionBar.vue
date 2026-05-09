<script setup>
import { useImageActions } from '@/composables/useImageActions'

const props = defineProps({
  imageUrl: { type: String, default: null },
  filename: { type: String, default: null },
})

const { copyLinkToClipboard, copyImageToClipboard, downloadImage } = useImageActions()
</script>

<template>
  <div class="flex items-center justify-center flex-wrap gap-2">
    <button v-if="imageUrl" @click.stop="copyLinkToClipboard(imageUrl)"
      class="flex h-8 w-8 items-center justify-center rounded-full bg-success text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-lg"
      title="Salin Tautan">
      <font-awesome-icon icon="fa-solid fa-link" />
    </button>
    <button v-if="imageUrl" @click.stop="copyImageToClipboard(imageUrl)"
      class="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-lg"
      title="Salin Gambar">
      <font-awesome-icon icon="fa-solid fa-copy" />
    </button>
    <button v-if="imageUrl" @click.stop="downloadImage(imageUrl, filename)"
      class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-secondary hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-lg"
      title="Unduh Gambar">
      <font-awesome-icon icon="fa-solid fa-download" />
    </button>
    <!-- Extra actions from parent -->
    <slot />
  </div>
</template>
