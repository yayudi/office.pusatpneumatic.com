<!-- frontend/src/views/admin/CategoryManagement.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import axios from '@/api/axios.js'
import BaseModal from '@/components/ui/BaseModal.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()
const { toast } = useToast()

const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({ id: null, name: '' })

async function loadCategories() {
  loading.value = true
  try {
    const { data } = await axios.get('/categories')
    if (data.success) {
      categories.value = data.data
    }
  } catch {
    toast('Gagal memuat data kategori.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(loadCategories)

function openCreateModal() {
  isEditing.value = false
  form.value = { id: null, name: '' }
  isModalOpen.value = true
}

function openEditModal(category) {
  isEditing.value = true
  form.value = { id: category.id, name: category.name }
  isModalOpen.value = true
}

async function handleSave() {
  if (!form.value.name.trim()) {
    return toast('Nama kategori wajib diisi.', 'error')
  }

  saving.value = true
  try {
    if (isEditing.value) {
      const { data } = await axios.put(`/categories/${form.value.id}`, { name: form.value.name })
      if (!data.success) throw new Error(data.message)
      toast('Kategori berhasil diperbarui.', 'success')
    } else {
      const { data } = await axios.post('/categories', { name: form.value.name })
      if (!data.success) throw new Error(data.message)
      toast('Kategori berhasil dibuat.', 'success')
    }
    isModalOpen.value = false
    loadCategories()
  } catch (error) {
    toast(error.response?.data?.message || error.message || 'Gagal menyimpan data.', 'error')
  } finally {
    saving.value = false
  }
}

async function handleDelete(categoryId) {
  if (!confirm('Apakah Anda yakin ingin menonaktifkan kategori ini?')) return

  try {
    const { data } = await axios.delete(`/categories/${categoryId}`)
    if (!data.success) throw new Error(data.message)
    toast('Kategori berhasil dinonaktifkan.', 'success')
    loadCategories()
  } catch (error) {
    toast(error.response?.data?.message || error.message || 'Gagal menghapus kategori.', 'error')
  }
}

// --- LOCAL HOTKEYS ---
const { Alt_N, Alt_S } = useMagicKeys()

watch(Alt_N, (pressed) => {
  if (pressed && !isModalOpen.value) openCreateModal()
})

watch(Alt_S, (pressed) => {
  if (pressed && isModalOpen.value && !saving.value) handleSave()
})
</script>

<template>
  <div class="flex justify-between items-center mb-6">
    <div>
      <h2 class="text-2xl font-bold text-text">Manajemen Kategori</h2>
      <p class="text-sm text-text/50 mt-1">Kelola kategori produk untuk klasifikasi inventaris.</p>
    </div>
    <button
      @click="openCreateModal"
      class="bg-primary text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
    >
      <font-awesome-icon icon="fa-solid fa-plus" />
      <span>Tambah Kategori</span>
    </button>
  </div>

  <div
    class="bg-background shadow-md rounded-xl border border-secondary/20 overflow-x-auto overflow-y-auto relative custom-scrollbar h-[calc(95vh]"
  >
    <table
      class="w-full text-sm text-left text-text border-collapse"
      :class="isMobile ? 'block' : 'min-w-[400px]'"
    >
      <thead
        class="bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5"
        :class="isMobile ? 'hidden' : 'sticky top-0 z-30'"
      >
        <tr class="text-xs text-text/80 uppercase">
          <th class="px-6 py-3 border-b border-secondary/10 w-16 text-center">#</th>
          <th class="px-6 py-3 border-b border-secondary/10">Nama Kategori</th>
          <th class="px-6 py-3 text-center border-b border-secondary/10 w-32">Aksi</th>
        </tr>
      </thead>
      <TransitionGroup
        tag="tbody"
        name="list"
        class="relative"
        :class="isMobile ? 'block' : 'divide-y divide-secondary/5'"
      >
        <!-- Loading State -->
        <template v-if="loading">
          <TableSkeleton v-for="n in 5" :key="`skeleton-${n}`" />
        </template>

        <tr v-else-if="categories.length === 0" key="empty">
          <td colspan="3" class="py-12 text-center text-text/50 italic">
            <font-awesome-icon icon="fa-solid fa-tags" class="text-3xl text-text/20 mb-3 block" />
            Belum ada kategori. Tambahkan kategori pertama Anda.
          </td>
        </tr>

        <tr
          v-else
          v-for="(cat, index) in categories"
          :key="cat.id"
          class="transition-colors group relative"
          :class="
            isMobile
              ? 'block mb-3 p-4 bg-background/50 rounded-xl border border-secondary/20 shadow-sm mx-4 mt-4'
              : 'border-b border-secondary/20 hover:bg-secondary/5'
          "
        >
          <td
            class="text-text/40 font-mono text-xs"
            :class="isMobile ? 'flex justify-between items-center py-2' : 'px-6 py-4 text-center'"
          >
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-sans font-semibold"
              >#</span
            >
            <span>{{ index + 1 }}</span>
          </td>
          <td
            :class="
              isMobile
                ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                : 'px-6 py-4'
            "
          >
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Nama</span>
            <span class="font-medium text-text">{{ cat.name }}</span>
          </td>
          <td
            class="space-x-4"
            :class="isMobile ? 'flex justify-end items-center pt-3' : 'px-6 py-4 text-center'"
          >
            <button
              @click="openEditModal(cat)"
              class="text-primary hover:text-primary/80 text-xs font-semibold inline-flex items-center gap-1 transition-transform hover:scale-105"
            >
              <font-awesome-icon icon="fa-solid fa-edit" />
              <span>Edit</span>
            </button>
            <button
              @click="handleDelete(cat.id)"
              class="text-danger hover:text-danger/80 text-xs font-semibold inline-flex items-center gap-1 transition-transform hover:scale-105"
            >
              <font-awesome-icon icon="fa-solid fa-trash" />
              <span>Hapus</span>
            </button>
          </td>
        </tr>
      </TransitionGroup>
    </table>
  </div>

  <!-- Modal untuk Tambah/Edit Kategori -->
  <BaseModal
    :show="isModalOpen"
    @close="isModalOpen = false"
    :title="isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru'"
  >
    <form @submit.prevent="handleSave" class="p-6 space-y-4">
      <div>
        <label class="block text-sm font-medium text-text/80 mb-1">Nama Kategori</label>
        <input
          v-model="form.name"
          type="text"
          required
          class="w-full input-field"
          placeholder="Contoh: Pneumatic"
          autofocus
        />
      </div>
    </form>
    <template #footer>
      <button type="button" @click="isModalOpen = false" class="btn-secondary">Batal</button>
      <button type="submit" @click="handleSave" :disabled="saving" class="btn-primary">
        <font-awesome-icon
          v-if="saving"
          icon="fa-solid fa-circle-notch"
          class="animate-spin mr-1"
        />
        Simpan
      </button>
    </template>
  </BaseModal>
</template>

<style lang="postcss" scoped>
.input-field {
  @apply w-full px-3 py-2 bg-background border border-secondary/50 rounded-lg focus:ring-primary focus:border-primary text-text;
}

.btn-primary {
  @apply bg-primary text-secondary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50;
}

.btn-secondary {
  @apply bg-background border border-secondary/30 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-secondary/20;
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
