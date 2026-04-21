<!-- frontend/src/components/products/ProductImageModal.vue -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { useAuthStore } from '@/stores/auth.js'
import axios from '@/api/axios.js'
import { fetchProductById } from '@/api/helpers/products.js'
import { resolveUrl } from '@/composables/useImageUrl'
import MediaCard from '@/components/common/MediaCard.vue'
import MediaActionBar from '@/components/common/MediaActionBar.vue'
import MediaLightbox from '@/components/common/MediaLightbox.vue'

const props = defineProps({
  show: Boolean,
  productData: Object,
})

const emit = defineEmits(['close', 'refresh'])

const { toast } = useToast()
const authStore = useAuthStore()

const loading = ref(false)
const fetching = ref(false)
const selectedImages = ref([])
const existingImages = ref([])
const isCompressing = ref(false)
const isLightboxOpen = ref(false)
const lightboxIndex = ref(0)

/** Map existingImages to the shape MediaLightbox expects */
const lightboxImages = computed(() =>
  existingImages.value.map(img => ({
    main_path: img.image_path,
    thumbnail_path: img.thumbnail_path || img.image_path,
    original_name: img.original_name || 'Gambar Produk',
  }))
)

const canUpload = computed(() => authStore.hasPermission('product.image.upload'))
const canDelete = computed(() => authStore.hasPermission('product.image.delete'))

async function fetchImages() {
  if (!props.productData?.id) return
  fetching.value = true
  try {
    const fullData = await fetchProductById(props.productData.id)
    if (fullData && fullData.images) {
      existingImages.value = fullData.images
    } else {
      existingImages.value = []
    }
  } catch (error) {
    console.error('Fetch Images Error:', error)
  } finally {
    fetching.value = false
  }
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      loading.value = false
      selectedImages.value = []
      existingImages.value = []
      fetchImages()
    }
  }
)

async function handleImageUpload(event) {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  const validFiles = files.filter(f => f.type.match('image.*'))
  if (validFiles.length < files.length) {
    toast('Beberapa file bukan gambar dan diabaikan.', 'warning')
  }

  if (validFiles.length === 0) return

  validFiles.forEach(file => {
    file.preview = URL.createObjectURL(file)
    selectedImages.value.push(file)
  })

  event.target.value = ''
}

function removeSelectedImage(index) {
  selectedImages.value.splice(index, 1)
}

async function saveNewImages() {
  if (selectedImages.value.length === 0) return

  loading.value = true
  const formData = new FormData()
  selectedImages.value.forEach((file) => {
    formData.append('images', file, file.name)
  })

  formData.append('products', props.productData.id.toString());

  try {
    const { data } = await axios.post(`/media/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    if (data.success) {
      toast(`${selectedImages.value.length} gambar masuk antrean pemrosesan.`, 'success')
      selectedImages.value = []

      setTimeout(async () => {
        await fetchImages()
        emit('refresh')
      }, 1500)
    }
  } catch (error) {
    console.error(error)
    toast('Gagal mengupload gambar.', 'error')
  } finally {
    loading.value = false
  }
}

async function deleteImage(imageId) {
  if (!confirm('Hapus gambar ini permanen?')) return

  loading.value = true
  try {
    const { data } = await axios.delete(`/products/${props.productData.id}/images/${imageId}`)
    if (data.success) {
      toast('Gambar dihapus.', 'success')
      await fetchImages()
      emit('refresh')
    }
  } catch (error) {
    console.error(error)
    toast('Gagal menghapus gambar.', 'error')
  } finally {
    loading.value = false
  }
}

async function setPrimary(imageId) {
  loading.value = true
  try {
    const { data } = await axios.put(`/products/${props.productData.id}/images/${imageId}/primary`)
    if (data.success) {
      toast('Gambar utama diperbarui.', 'success')
      await fetchImages()
      emit('refresh')
    }
  } catch (error) {
    console.error(error)
    toast('Gagal mengatur gambar utama.', 'error')
  } finally {
    loading.value = false
  }
}

// getImageUrl is now resolveUrl from useImageUrl
const getImageUrl = resolveUrl
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    @click.self="$emit('close')">
    <div
      class="bg-background w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
      <div class="px-6 py-4 border-b border-secondary/10 flex justify-between items-center bg-secondary/5">
        <div>
          <h3 class="font-bold text-lg text-text">Galeri Produk</h3>
          <p class="text-xs text-text/60 font-mono">{{ productData.sku }} - {{ productData.name }}</p>
        </div>
        <button @click="$emit('close')"
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary/20 transition-colors text-text/50 hover:text-text">
          <font-awesome-icon icon="fa-solid fa-xmark" />
        </button>
      </div>

      <div class="p-6 flex flex-col gap-6 overflow-y-auto h-full">
        <div v-if="fetching" class="flex flex-col items-center justify-center py-12 text-text/40">
          <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-3xl mb-3" />
          <span class="text-sm">Memuat galeri...</span>
        </div>

        <div v-else class="flex flex-col gap-8">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-bold text-text/80 text-sm uppercase tracking-wide">Foto Tersimpan</h4>
              <span class="text-xs text-text/50">{{ existingImages.length }} gambar</span>
            </div>

            <div v-if="existingImages.length === 0"
              class="p-8 border-2 border-dashed border-secondary/20 rounded-xl flex flex-col items-center text-text/30 bg-secondary/5">
              <font-awesome-icon icon="fa-solid fa-images" class="text-4xl mb-2" />
              <span class="text-sm font-medium">Belum ada foto produk.</span>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <MediaCard v-for="(img, index) in existingImages" :key="img.id"
                :image-url="getImageUrl(img.image_path)"
                :image-id="img.id"
                :display-name="img.original_name || 'Gambar Produk'"
                @click="isLightboxOpen = true; lightboxIndex = index">

                <template #badges>
                  <div v-if="img.is_primary"
                    class="absolute top-2 left-2 bg-primary text-background text-[10px] font-bold px-2 py-0.5 rounded shadow-sm z-10 flex items-center gap-1">
                    <font-awesome-icon icon="fa-solid fa-star" /> Utama
                  </div>
                </template>

                <template #actions>
                  <MediaActionBar :image-url="getImageUrl(img.image_path)" :filename="img.original_name">
                    <button v-if="!img.is_primary && canUpload" @click.stop="setPrimary(img.id)" :disabled="loading"
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-lg"
                      title="Jadikan Utama">
                      <font-awesome-icon icon="fa-solid fa-star" />
                    </button>
                    <button v-if="canDelete" @click.stop="deleteImage(img.id)" :disabled="loading"
                      class="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-background hover:backdrop-brightness-75 transition-transform hover:scale-110 shadow-lg"
                      title="Hapus Gambar">
                      <font-awesome-icon icon="fa-solid fa-trash" />
                    </button>
                  </MediaActionBar>
                </template>
              </MediaCard>
            </div>
          </div>
          <div v-if="canUpload" class="border-t border-secondary/10 pt-6">
            <h4 class="font-bold text-text/80 text-sm uppercase tracking-wide mb-3">Upload Baru</h4>
            <div class="flex flex-col gap-4">
              <label
                class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors group">
                <div
                  class="flex flex-col items-center justify-center pt-5 pb-6 text-primary group-hover:scale-105 transition-transform">
                  <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" class="text-3xl mb-2" />
                  <p class="text-sm font-bold">Klik untuk pilih gambar</p>
                  <p class="text-xs opacity-70">Bisa pilih banyak sekaligus (Max 5MB)</p>
                </div>
                <!-- Input Multiple -->
                <input type="file" @change="handleImageUpload" accept="image/*" class="hidden" multiple
                  :disabled="loading" />
              </label>
              <div v-if="selectedImages.length > 0" class="flex flex-col gap-3 animate-slide-up">
                <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div v-for="(file, idx) in selectedImages" :key="idx"
                    class="relative aspect-square rounded-lg overflow-hidden border border-secondary/20 group">
                    <img :src="file.preview" class="w-full h-full object-cover" />
                    <button @click="removeSelectedImage(idx)"
                      class="absolute top-1 right-1 w-6 h-6 bg-danger text-secondary rounded-full flex items-center justify-center text-xs shadow-md hover:scale-110 transition-transform">
                      <font-awesome-icon icon="fa-solid fa-times" />
                    </button>
                  </div>
                </div>
                <div class="flex justify-end gap-3 mt-2">
                  <button @click="selectedImages = []"
                    class="px-4 py-2 text-text/60 font-bold hover:bg-secondary/10 rounded-lg text-sm transition-colors">
                    Batal
                  </button>
                  <button @click="saveNewImages" :disabled="loading"
                    class="px-6 py-2 bg-primary hover:bg-primary-dark text-text font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95">
                    <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" class="animate-spin" />
                    <span v-else>Simpan ({{ selectedImages.length }})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <MediaLightbox :show="isLightboxOpen" :images="lightboxImages" :initialIndex="lightboxIndex"
    @close="isLightboxOpen = false" />
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out forwards;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
