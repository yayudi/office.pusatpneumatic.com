<script setup>
import { useImageActions } from '@/composables/useImageActions'

defineProps({
  imageUrl: { type: String, default: null },
  filename: { type: String, default: null },
  showInfo: { type: Boolean, default: false },
  showDelete: { type: Boolean, default: false },
  disableDelete: { type: Boolean, default: false },
})

defineEmits(['info', 'delete'])

const { copyLinkToClipboard, copyImageToClipboard, downloadImage } = useImageActions()
</script>
<template>
  <div class="grid grid-cols-5 md:grid-cols-3 items-center justify-center flex-wrap gap-1">
    <button
      v-if="showDelete"
      @click.stop="$emit('delete')"
      class="px-2 py-1 md:px-4 md:py-3 items-center justify-center rounded-md md:text-base lg:text-lg xl:text-xl bg-danger text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      title="Hapus Media"
      :disabled="disableDelete"
    >
      <font-awesome-icon icon="fa-solid fa-trash" class="text-xs" />
    </button>
    <button
      v-if="showInfo"
      @click.stop="$emit('info')"
      class="px-2 py-1 md:px-4 md:py-3 items-center justify-center rounded-md md:text-base lg:text-lg xl:text-xl bg-accent text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-md"
      title="Info & Editor Tag"
    >
      <font-awesome-icon icon="fa-solid fa-tags" class="text-xs" />
    </button>
    <button
      v-if="imageUrl"
      @click.stop="downloadImage(imageUrl, filename)"
      class="px-2 py-1 md:px-4 md:py-3 items-center justify-center rounded-md md:text-base lg:text-lg xl:text-xl bg-primary text-secondary hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-md"
      title="Unduh Gambar"
    >
      <font-awesome-icon icon="fa-solid fa-download" class="text-xs" />
    </button>
    <button
      v-if="imageUrl"
      @click.stop="copyLinkToClipboard(imageUrl)"
      class="px-2 py-1 md:px-4 md:py-3 items-center justify-center rounded-md md:text-base lg:text-lg xl:text-xl bg-success text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-md"
      title="Salin Tautan"
    >
      <font-awesome-icon icon="fa-solid fa-link" class="text-xs" />
    </button>
    <button
      v-if="imageUrl"
      @click.stop="copyImageToClipboard(imageUrl)"
      class="px-2 py-1 md:px-4 md:py-3 items-center justify-center rounded-md md:text-base lg:text-lg xl:text-xl bg-warning text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-md"
      title="Salin Gambar"
    >
      <font-awesome-icon icon="fa-solid fa-copy" class="text-xs" />
    </button>
    <!-- Extra actions from parent -->
    <slot />
  </div>
</template>
