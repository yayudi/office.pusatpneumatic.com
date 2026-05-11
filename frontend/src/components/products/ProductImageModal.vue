<!-- frontend/src/components/products/ProductImageModal.vue -->
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { useAuthStore } from '@/stores/auth.js'
import axios from '@/api/axios.js'
import { fetchProductById } from '@/api/helpers/products.js'
import { resolveUrl } from '@/composables/useImageUrl'
import MediaCard from '@/components/common/MediaCard.vue'
import MediaActionBar from '@/components/common/MediaActionBar.vue'
import MediaLightbox from '@/components/common/MediaLightbox.vue'
import ImageCropperModal from '@/views/media/ImageCropperModal.vue'
import { autoCropCenter } from '@/utils/imageCropper.js'
import Modal from '@/components/ui/Modal.vue'

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

const handlePaste = (event) => {
  if (!props.show) return
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return

  const items = event.clipboardData?.items
  if (!items) return

  const validFiles = []
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile()
      if (file) validFiles.push(file)
    }
  }

  if (validFiles.length > 0) {
    validFiles.forEach(file => {
      file.preview = URL.createObjectURL(file)
      selectedImages.value.push(file)
    })
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  window.removeEventListener('paste', handlePaste)
})

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

const autoCropAllProcessing = ref(false)

const autoCropAll = async () => {
  if (selectedImages.value.length === 0) return
  autoCropAllProcessing.value = true
  try {
    const newFiles = await autoCropCenter(selectedImages.value)
    newFiles.forEach(f => f.preview = URL.createObjectURL(f))
    selectedImages.value = newFiles
  } catch (error) {
    console.error("Auto crop failed:", error)
    toast("Gagal melakukan auto-crop.", "error")
  } finally {
    autoCropAllProcessing.value = false
  }
}

const isCropperOpen = ref(false)
const currentEditIndex = ref(-1)
const currentEditFile = ref(null)

const openCropper = (index) => {
  currentEditIndex.value = index
  currentEditFile.value = selectedImages.value[index]
  isCropperOpen.value = true
}

const handleCroppedSave = (newFile) => {
  if (currentEditIndex.value !== -1) {
    newFile.preview = URL.createObjectURL(newFile)
    selectedImages.value[currentEditIndex.value] = newFile
  }
}

async function saveNewImages() {
  if (selectedImages.value.length === 0) return

  loading.value = true
  const formData = new FormData()
  selectedImages.value.forEach((file) => {
    formData.append('images', file, file.name)
  })

  formData.append('products', JSON.stringify([props.productData.id]));

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
  <Modal :show="show" @close="$emit('close')" maxWidth="max-w-4xl">
    <template #title>
      <div class="-mt-1">
        <h3 class="font-bold text-lg text-text">Galeri Produk</h3>
        <p class="text-xs text-text/60 font-mono font-normal mt-1">{{ productData.sku }} - {{ productData.name }}</p>
      </div>
    </template>

    <div class="flex flex-col gap-6 h-full pb-6 overflow-y-scroll">
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
            <MediaCard v-for="(img, index) in existingImages" :key="img.id" :image-url="getImageUrl(img.image_path)"
              :image-id="img.id" :display-name="img.original_name || 'Gambar Produk'"
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
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-text/80 text-sm uppercase tracking-wide">Upload Baru</h4>
            <button v-if="selectedImages.length > 0" @click="autoCropAll" :disabled="autoCropAllProcessing"
              class="px-3 py-1 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 font-medium">
              <font-awesome-icon v-if="autoCropAllProcessing" icon="fa-solid fa-spinner" spin />
              <font-awesome-icon v-else icon="fa-solid fa-crop-simple" />
              Auto 1:1 Semua
            </button>
          </div>
          <div class="flex flex-col gap-4">
            <label
              class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors group">
              <div
                class="flex flex-col items-center justify-center pt-5 pb-6 text-primary group-hover:scale-105 transition-transform">
                <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" class="text-3xl mb-2" />
                <p class="text-sm font-bold">Klik untuk pilih gambar</p>
                <p class="text-xs opacity-70">Bisa pilih banyak sekaligus atau tekan <strong>CTRL+V</strong> untuk
                  paste (Max
                  5MB)</p>
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
                  <!-- Hover overlay for individual crop & delete -->
                  <div
                    class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <button @click.prevent="openCropper(idx)"
                      class="w-8 h-8 rounded-full bg-primary text-background flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                      title="Edit Gambar">
                      <font-awesome-icon icon="fa-solid fa-crop-simple" />
                    </button>
                    <button @click.prevent="removeSelectedImage(idx)"
                      class="w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                      title="Hapus">
                      <font-awesome-icon icon="fa-solid fa-trash-can" />
                    </button>
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-2">
                <button @click="selectedImages = []"
                  class="px-4 py-2 text-text/60 font-bold hover:bg-secondary/10 rounded-lg text-sm transition-colors">
                  Batal
                </button>
                <button @click="saveNewImages" :disabled="loading"
                  class="px-6 py-2 bg-primary hover:bg-primary-dark text-secondary font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95">
                  <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" class="animate-spin" />
                  <span v-else>Simpan ({{ selectedImages.length }})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
  <MediaLightbox :show="isLightboxOpen" :images="lightboxImages" :initialIndex="lightboxIndex"
    @close="isLightboxOpen = false" />

  <ImageCropperModal :show="isCropperOpen" :file="currentEditFile" @close="isCropperOpen = false"
    @save="handleCroppedSave" />
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
