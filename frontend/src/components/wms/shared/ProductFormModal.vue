<!-- frontend/src/components/wms/shared/ProductFormModal.vue -->
<script setup>
import { ref, watch, onMounted } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import debounce from 'lodash/debounce'
import BaseModal from '@/components/ui/BaseModal.vue'
import axios from '@/api/axios.js'
import { useToast } from '@/composables/useToast.js'
import ProductHistoryList from '@/components/products/ProductHistoryList.vue'
import { useMobile } from '@/composables/useMobile.js'
import BaseSelect from '@/components/ui/BaseSelect.vue'

const { isMobile } = useMobile()

const props = defineProps({
  show: Boolean,
  mode: { type: String, default: 'create' }, // 'create' or 'edit'
  productData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'refresh'])
const { toast } = useToast()

const form = ref({
  sku: '',
  name: '',
  category_id: null,
  price: 0,
  weight: 0,
  is_package: false,
})

const components = ref([]) // Array of { id, sku, name, quantity }
const componentSearch = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const loading = ref(false)
const fetchLoading = ref(false)

const categories = ref([])
async function fetchCategories() {
  try {
    const { data } = await axios.get('/categories')
    if (data.success) {
      categories.value = data.data
    }
  } catch (err) {
    console.error('Failed to fetch categories', err)
  }
}

const categorySearchQuery = ref('')
function handleCategorySearchChange(query) {
  categorySearchQuery.value = query
}

const isCreatingCategory = ref(false)
async function handleCreateCategory() {
  if (!categorySearchQuery.value.trim() || isCreatingCategory.value) return
  isCreatingCategory.value = true
  try {
    const { data } = await axios.post('/categories', {
      name: categorySearchQuery.value.trim()
    })
    if (data.success) {
      toast('Kategori berhasil ditambahkan', 'success')
      await fetchCategories()

      const newCatId = data.data?.id || data.data?.insertId
      if (newCatId) {
        form.value.category_id = newCatId
      } else {
        const found = categories.value.find(c => c.name.toLowerCase() === categorySearchQuery.value.trim().toLowerCase())
        if (found) form.value.category_id = found.id
      }
      categorySearchQuery.value = ''
    }
  } catch (err) {
    console.error(err)
//     const msg = err.response?.data?.message || 'Gagal menambahkan kategori' // Disabled due to unused var
//     toast(msg, 'error') // Removed to prevent double-toast
  } finally {
    isCreatingCategory.value = false
  }
}

onMounted(() => {
  fetchCategories()
})

// Duplicate Check State
const duplicateStatus = ref({
  sku: { checking: false, exists: false },
  name: { checking: false, exists: false },
})
const debouncedDuplicateCheck = {
  sku: debounce(async (value) => {
    await _executeDuplicateCheck('sku', value)
  }, 500),
  name: debounce(async (value) => {
    await _executeDuplicateCheck('name', value)
  }, 500),
}

async function _executeDuplicateCheck(field, value) {
  try {
    const { data } = await axios.get('/products', {
      params: { search: value, searchBy: field, limit: 20 }
    })
    const isDuplicate = data.data.some(p => {
      if (props.mode === 'edit' && p.id === props.productData.id) return false
      return p[field].toString().toLowerCase() === value.toString().toLowerCase()
    })
    duplicateStatus.value[field] = { checking: false, exists: isDuplicate }
  } catch (error) {
    console.error(error)
    duplicateStatus.value[field].checking = false
  }
}

function checkDuplicate(field, value) {
  debouncedDuplicateCheck[field].cancel()

  // SKU di mode edit disabled, jadi tidak perlu cek
  if (field === 'sku' && props.mode === 'edit') return
  if (!value) {
    duplicateStatus.value[field] = { checking: false, exists: false }
    return
  }

  // Set checking state
  duplicateStatus.value[field].checking = true
  duplicateStatus.value[field].exists = false // Reset dulu
  debouncedDuplicateCheck[field](value)
}

// Watchers untuk auto-check
watch(() => form.value.sku, (val) => checkDuplicate('sku', val))
watch(() => form.value.name, (val) => checkDuplicate('name', val))

// Image State
const selectedImage = ref(null)
const imagePreview = ref(null)
const isCompressing = ref(false)

// Reset/Populate Form saat modal dibuka
watch(
  () => props.show,
  async (isOpen) => {
    if (isOpen) {
      // Reset state
      componentSearch.value = ''
      searchResults.value = []

      if (props.mode === 'edit' && props.productData?.id) {
        // MODE EDIT: Fetch data lengkap dari server (termasuk komponen paket)
        fetchLoading.value = true
        try {
          const { data } = await axios.get(`/products/${props.productData.id}`)
          if (data.success) {
            form.value = {
              sku: data.data.sku,
              name: data.data.name,
              category_id: data.data.category_id || null,
              price: data.data.price || 0,
              weight: data.data.weight || 0,
              is_package: Boolean(data.data.is_package),
            }
            // Mapping komponen jika ada
            components.value = data.data.components || []
            // Set existing image if any (backend should return full URL or path)
            if (data.data.image_path) {
              imagePreview.value = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/uploads/products/${data.data.image_path}`
              // Or just /uploads/products/ if served relatively
            }
          }
        } catch (err) {
          console.error(err)
//           toast('Gagal memuat detail produk.', 'error') // Removed to prevent double-toast
          emit('close')
        } finally {
          fetchLoading.value = false
        }
      } else {
        // MODE CREATE: Kosongkan form
        form.value = { sku: '', name: '', category_id: null, price: 0, weight: 0, is_package: false }
        components.value = []
        selectedImage.value = null
        imagePreview.value = null

        // Auto-Generate Next SKU
        fetchLoading.value = true
        try {
          const { data } = await axios.get('/products', {
            params: { sortBy: 'sku', sortOrder: 'desc', limit: 1 }
          })

          if (data.data && data.data.length > 0) {
            const lastSku = data.data[0].sku || ''
            // Regex match: Prefix (Letters) + Suffix (Numbers)
            const match = lastSku.match(/^([A-Za-z]+)(\d+)$/)
            if (match) {
              const prefix = match[1]
              const number = match[2]
              const nextNumber = (parseInt(number) + 1).toString().padStart(number.length, '0')
              form.value.sku = `${prefix}${nextNumber}`
            }
          }
        } catch (error) {
          console.error('Failed to auto-generate SKU', error)
        } finally {
          fetchLoading.value = false
        }
      }
    }
  },
)

// Logika Pencarian Komponen Paket
const debouncedComponentSearch = debounce(async (query) => {
  try {
    const { data } = await axios.get(`/products/search?q=${query}`)
    // Filter: Jangan tampilkan produk yang sudah dipilih atau produk itu sendiri (jika edit)
    searchResults.value = data.filter(
      (p) =>
        !components.value.some((c) => c.id === p.id) &&
        (props.mode === 'create' || p.id !== props.productData.id),
    )
  } catch (err) {
    console.error(err)
  } finally {
    isSearching.value = false
  }
}, 300)

function handleSearch(e) {
  const query = e.target.value

  if (!query || query.length < 2) {
    searchResults.value = []
    debouncedComponentSearch.cancel()
    return
  }

  isSearching.value = true
  debouncedComponentSearch(query)
}

function addComponent(product) {
  components.value.push({
    id: product.id,
    sku: product.sku,
    name: product.name,
    quantity: 1, // Default qty 1
  })
  componentSearch.value = ''
  searchResults.value = []
}

function removeComponent(index) {
  components.value.splice(index, 1)
}

async function handleImageUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // Validasi tipe file
  if (!file.type.match('image.*')) {
//     return toast('Mohon upload file gambar valid (JPG/PNG).', 'error') // Removed to prevent double-toast
  }

  // Preview langsung tanpa kompresi klien (server akan menangani jika diperlukan)
  selectedImage.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function handleSubmit() {
  // Validasi Dasar
//   if (!form.value.name) return toast('Nama produk wajib diisi.', 'error') // Removed to prevent double-toast
//   if (props.mode === 'create' && !form.value.sku) return toast('SKU wajib diisi.', 'error') // Removed to prevent double-toast

  // Validasi Duplikasi
//   if (duplicateStatus.value.sku.exists) return toast('SKU sudah digunakan produk lain.', 'error') // Removed to prevent double-toast
//   if (duplicateStatus.value.name.exists) return toast('Nama produk sudah digunakan.', 'error') // Removed to prevent double-toast

  // Validasi Paket
  if (form.value.is_package && components.value.length === 0) {
//     return toast('Produk paket harus memiliki minimal 1 komponen.', 'error') // Removed to prevent double-toast
  }

  loading.value = true
  try {
    // Siapkan payload
    const payload = {
      ...form.value,
      // Kirim array komponen hanya jika is_package true
      components: form.value.is_package ? components.value : [],
    }

    // Switch ke FormData jika ada gambar
    let response
    if (selectedImage.value) {
      const formData = new FormData()
      // Append semua field dasar
      Object.keys(payload).forEach((key) => {
        if (key === 'components') {
          formData.append(key, JSON.stringify(payload[key]))
        } else {
          formData.append(key, payload[key])
        }
      })
      formData.append('images', selectedImage.value)

      if (props.mode === 'create') {
        response = await axios.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        response = await axios.put(`/products/${props.productData.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
    } else {
      // JSON Biasa
      if (props.mode === 'create') {
        response = await axios.post('/products', payload)
      } else {
        response = await axios.put(`/products/${props.productData.id}`, payload)
      }
    }

    if (response.data.success) {
      toast(`Produk berhasil ${props.mode === 'create' ? 'dibuat' : 'diperbarui'}!`, 'success')
      emit('refresh') // Memberitahu parent untuk refresh tabel
      emit('close')
    }
  } catch (err) {
    console.error(err)
//     const msg = err.response?.data?.message || 'Terjadi kesalahan saat menyimpan.' // Disabled due to unused var
//     toast(msg, 'error') // Removed to prevent double-toast
  } finally {
    loading.value = false
  }
}

// --- LOCAL HOTKEYS ---
const { Alt_S } = useMagicKeys()

watch(Alt_S, (pressed) => {
  if (pressed && props.show && !loading.value && !fetchLoading.value && !duplicateStatus.value.sku.exists && !duplicateStatus.value.name.exists) {
    handleSubmit()
  }
})
</script>

<template>
  <BaseModal :show="show" @close="$emit('close')" maxWidth="max-w-2xl">
    <template #title>
      {{ mode === 'create' ? 'Tambah Produk Baru' : 'Edit Produk' }}
    </template>

    <div class="flex flex-col gap-4">
      <!-- Loading State saat fetch detail edit -->
      <div v-if="fetchLoading" class="text-center py-10">
        <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-3xl text-primary" />
        <p class="text-sm text-text/50 mt-2">Memuat detail produk...</p>
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- SKU Input -->
          <div class="col-span-1">
            <label class="block text-xs font-bold text-text/60 mb-1">SKU (Kode Unik)</label>
            <div class="relative">
              <input v-model="form.sku" type="text" :disabled="mode === 'edit'"
                class="w-full pl-9 pr-3 py-2 bg-secondary/10 border border-secondary/30 rounded-lg font-mono uppercase focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed text-text transition-all"
                placeholder="PPxxxxxxx" />
              <font-awesome-icon icon="fa-solid fa-barcode" class="absolute left-3 top-2.5 text-text/40" />
            </div>
            <p v-if="mode === 'edit'" class="text-[10px] text-text/40 mt-1 italic">
              SKU tidak dapat diubah.
            </p>
            <!-- Feedback Check SKU -->
            <div v-if="duplicateStatus.sku.checking" class="text-xs text-primary mt-1 animate-pulse">
              <font-awesome-icon icon="fa-solid fa-circle-notch" class="animate-spin mr-1" /> Mengecek
              ketersediaan...
            </div>
            <div v-else-if="duplicateStatus.sku.exists" class="text-xs text-danger mt-1 font-bold">
              <font-awesome-icon icon="fa-solid fa-exclamation-circle" class="mr-1" /> SKU sudah digunakan!
            </div>
          </div>

          <!-- Harga Input -->
          <div class="col-span-1">
            <label class="block text-xs font-bold text-text/60 mb-1">Harga Jual (Rp)</label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-text/40 font-bold text-xs">Rp</span>
              <input v-model.number="form.price" type="number" min="0"
                class="w-full pl-8 pr-3 py-2 bg-secondary/10 border border-secondary/30 rounded-lg font-mono focus:outline-none focus:border-primary text-text text-right transition-all" />
            </div>
          </div>
        </div>

        <!-- Nama Produk -->
        <div>
          <label class="block text-xs font-bold text-text/60 mb-1">Nama Produk</label>
          <input v-model="form.name" type="text"
            class="w-full px-3 py-2 bg-secondary/10 border border-secondary/30 rounded-lg focus:outline-none focus:border-primary text-text transition-all"
            :class="{ 'border-danger focus:border-danger': duplicateStatus.name.exists }"
            placeholder="Contoh: Paket Bundling Hemat A" />

          <!-- Feedback Check Name -->
          <div v-if="duplicateStatus.name.checking" class="text-xs text-primary mt-1 animate-pulse">
            <font-awesome-icon icon="fa-solid fa-circle-notch" class="animate-spin mr-1" /> Mengecek nama...
          </div>
          <div v-else-if="duplicateStatus.name.exists" class="text-xs text-danger mt-1 font-bold">
            <font-awesome-icon icon="fa-solid fa-exclamation-circle" class="mr-1" /> Nama produk ini sudah ada!
          </div>
        </div>

        <!-- Image Upload -->
        <div>
          <label class="block text-xs font-bold text-text/60 mb-1">Foto Produk</label>
          <div class="flex items-start gap-4">
            <!-- Preview Box -->
            <div
              class="shrink-0 w-20 h-20 bg-secondary/10 rounded-lg border border-secondary/20 overflow-hidden flex items-center justify-center relative group">
              <img v-if="imagePreview" :src="imagePreview" class="w-full h-full object-cover" />
              <font-awesome-icon v-else icon="fa-solid fa-image" class="text-2xl text-text/20" />

              <!-- Overlay Loading Compression -->
              <div v-if="isCompressing" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-secondary" />
              </div>
            </div>

            <div class="flex-1">
              <input type="file" @change="handleImageUpload" accept="image/*"
                class="block w-full text-sm text-text/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
              <p class="text-[10px] text-text/40 mt-1">
                Format: JPG, PNG. (Max 5MB direkomendasikan).
              </p>
            </div>
          </div>
        </div>

        <!-- Kategori Produk -->
        <div>
          <label class="block text-xs font-bold text-text/60 mb-1">Kategori</label>
          <BaseSelect v-model="form.category_id" :options="categories" track-by="id" label="name" emit-value
            :searchable="true" placeholder="Pilih Kategori (Opsional)" @search-change="handleCategorySearchChange"
            class="w-full">
            <!-- Add Category Button when searching -->
            <template #afterOptions>
              <li v-if="categorySearchQuery" class="px-2 py-2 border-t border-secondary/10 mt-1">
                <button @click.prevent.stop="handleCreateCategory" :disabled="isCreatingCategory"
                  class="w-full px-3 py-2 bg-primary/10 text-primary rounded-md text-xs font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                  <font-awesome-icon v-if="isCreatingCategory" icon="fa-solid fa-spinner" class="animate-spin" />
                  <font-awesome-icon v-else icon="fa-solid fa-plus" />
                  <span>Tambahkan "{{ categorySearchQuery }}"</span>
                </button>
              </li>
            </template>
          </BaseSelect>
        </div>

        <!-- Berat Input -->
        <div>
          <label class="block text-xs font-bold text-text/60 mb-1">Berat (Gram)</label>
          <div class="relative">
            <input v-model.number="form.weight" type="number" min="0"
              class="w-full pl-3 pr-8 py-2 bg-secondary/10 border border-secondary/30 rounded-lg font-mono focus:outline-none focus:border-primary text-text transition-all"
              placeholder="0" />
            <span class="absolute right-3 top-2 text-text/40 text-xs font-bold">gr</span>
          </div>
        </div>

        <!-- Checkbox Paket -->
        <div class="pt-2 border-t border-secondary/10">
          <label
            class="flex items-start gap-3 p-3 border border-secondary/20 rounded-lg hover:bg-secondary/5 cursor-pointer transition-colors"
            :class="{ 'bg-primary/5 border-primary/30': form.is_package }">
            <div class="pt-0.5">
              <input v-model="form.is_package" type="checkbox"
                class="w-5 h-5 text-primary rounded border-secondary/30 bg-secondary/10 focus:ring-primary" />
            </div>
            <div>
              <span class="block text-sm font-bold text-text" :class="{ 'text-primary': form.is_package }">Produk
                Paket (Bundling)</span>
              <span class="block text-xs text-text/50 mt-0.5">Produk ini merupakan gabungan dari beberapa produk
                lain (stok otomatis dipotong
                dari komponen).</span>
            </div>
          </label>
        </div>

        <!-- Bagian Komponen Paket (Hanya muncul jika dicentang) -->
        <div v-if="form.is_package"
          class="mt-2 p-4 bg-secondary/5 rounded-lg border border-secondary/20 animate-fade-in">
          <h4 class="font-bold text-sm text-text mb-3 flex items-center gap-2">
            <font-awesome-icon icon="fa-solid fa-layer-group" class="text-primary" />
            Komponen Paket
          </h4>

          <!-- Search Component -->
          <div class="relative mb-4">
            <label class="text-xs font-bold text-text/40 mb-1 block">Cari Produk Komponen</label>
            <div class="relative">
              <input v-model="componentSearch" @input="handleSearch" type="text"
                placeholder="Ketik SKU atau Nama produk..."
                class="w-full pl-9 pr-4 py-2 bg-background border border-secondary/30 rounded-lg text-sm focus:outline-none focus:border-primary text-text" />
              <font-awesome-icon v-if="isSearching" icon="fa-solid fa-circle-notch"
                class="absolute left-3 top-2.5 text-primary animate-spin" />
              <font-awesome-icon v-else icon="fa-solid fa-search" class="absolute left-3 top-2.5 text-text/40" />
            </div>

            <!-- Search Results Dropdown -->
            <div v-if="searchResults.length > 0"
              class="absolute z-10 w-full mt-1 bg-background border border-secondary/20 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
              <div v-for="res in searchResults" :key="res.id" @click="addComponent(res)"
                class="p-2.5 hover:bg-primary/10 cursor-pointer flex justify-between items-center text-sm border-b border-secondary/10 last:border-0 group transition-colors">
                <div class="flex flex-col">
                  <span class="font-medium text-text group-hover:text-primary">{{
                    res.name
                  }}</span>
                  <span class="font-mono text-[10px] text-text/40">{{ res.sku }}</span>
                </div>
                <div class="text-primary text-xs font-bold"
                  :class="isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'">
                  + Tambahkan
                </div>
              </div>
            </div>
          </div>

          <!-- List Components Table -->
          <div v-if="components.length > 0" class="space-y-1">
            <div class="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-text/40 px-3 pb-1">
              <div class="col-span-7">Nama Produk</div>
              <div class="col-span-3 text-center">Qty</div>
              <div class="col-span-2 text-right">Hapus</div>
            </div>

            <div v-for="(comp, idx) in components" :key="comp.id"
              class="grid grid-cols-12 gap-2 items-center bg-background p-2 rounded-lg border border-secondary/10 shadow-sm">
              <div class="col-span-7 overflow-hidden">
                <div class="text-sm font-medium text-text truncate" :title="comp.name">
                  {{ comp.name }}
                </div>
                <div class="text-[10px] text-text/40 font-mono">{{ comp.sku }}</div>
              </div>
              <div class="col-span-3">
                <input v-model.number="comp.quantity" type="number" min="1"
                  class="w-full px-1 py-1 text-center bg-secondary/10 rounded border border-secondary/20 text-sm font-bold focus:border-primary focus:outline-none" />
              </div>
              <div class="col-span-2 text-right">
                <button @click="removeComponent(idx)"
                  class="w-7 h-7 inline-flex items-center justify-center rounded-full text-danger hover:bg-danger/10 transition-colors"
                  title="Hapus komponen">
                  <font-awesome-icon icon="fa-solid fa-trash-alt" class="text-xs" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-6 border-2 border-dashed border-secondary/10 rounded-lg">
            <font-awesome-icon icon="fa-solid fa-basket-shopping" class="text-2xl text-text/20 mb-2" />
            <p class="text-xs text-text/40">
              Belum ada komponen yang ditambahkan.<br />Cari produk di atas untuk menambahkan.
            </p>
          </div>
        </div>

        <!-- Integrasi Riwayat Perubahan (Audit Log) -->
        <div v-if="mode === 'edit' && productData.id">
          <ProductHistoryList :productId="productData.id" />
        </div>
      </template>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <button @click="$emit('close')"
          class="px-5 py-2.5 rounded-lg text-text/60 font-bold hover:bg-secondary/10 transition-colors text-sm">
          Batal
        </button>
        <button @click="handleSubmit"
          :disabled="loading || fetchLoading || duplicateStatus.sku.exists || duplicateStatus.name.exists"
          class="px-5 py-2.5 rounded-lg bg-primary text-secondary font-bold hover:bg-primary-dark shadow-lg shadow-primary/30 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">
          <font-awesome-icon v-if="loading" icon="fa-solid fa-circle-notch" class="animate-spin" />
          <span v-else><font-awesome-icon icon="fa-solid fa-save" /></span>
          <span>{{ mode === 'create' ? 'Simpan Produk' : 'Simpan Perubahan' }}</span>
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

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
