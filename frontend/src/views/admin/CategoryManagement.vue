<!-- frontend/src/views/admin/CategoryManagement.vue -->
<script setup>
import { swalConfirm } from '@/composables/useSweetAlert'
import WmsActionHeader from '@/components/wms/shared/WmsActionHeader.vue'

import { ref, onMounted, watch } from 'vue'
import { useFirebaseSync } from '@/composables/useFirebaseSync'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import axios from '@/api/axios.js'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import { useMobile } from '@/composables/useMobile.js'
import { usePagination } from '@/composables/usePagination.js'
import { useMasterDataStore } from '@/stores/masterData.js'

const { isMobile } = useMobile()
const { toast } = useToast()
const masterStore = useMasterDataStore()

const categories = ref([])
const loading = ref(true)
const saving = ref(false)
const isModalOpen = ref(false)
const isEditing = ref(false)
const form = ref({ id: null, name: '' })

const {
  currentPage,
  currentLimit,
  paginatedData: visibleCategories,
  meta: pagination,
  changePage,
  changePageSize
} = usePagination({
  totalItems: categories,
  storageKey: 'categoryPageSize',
  initialLimit: 10
})

async function loadCategories(silent = false) {
  if (!silent && categories.value.length === 0) {
    loading.value = true
  }
  try {
    categories.value = await masterStore.getCategories('', true)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadCategories())
useFirebaseSync('MASTER_DATA', 'REFRESH_CATEGORIES', () => loadCategories(true))

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
    toast('Nama kategori tidak boleh kosong', 'error')
    return
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
    console.error(error) // Auto-added to prevent unused var
  } finally {
    saving.value = false
  }
}

async function handleDelete(categoryId) {
  if (!(await swalConfirm('Apakah Anda yakin ingin menonaktifkan kategori ini?'))) return

  try {
    const { data } = await axios.delete(`/categories/${categoryId}`)
    if (!data.success) throw new Error(data.message)
    toast('Kategori berhasil dinonaktifkan.', 'success')
    loadCategories()
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
  }
}

// --- LOCAL HOTKEYS ---
const { Alt_N, Alt_S } = useMagicKeys()

watch(Alt_N, pressed => {
  if (pressed && !isModalOpen.value) openCreateModal()
})

watch(Alt_S, pressed => {
  if (pressed && isModalOpen.value && !saving.value) handleSave()
})
</script>

<template>
  <WmsActionHeader
    title="Manajemen Kategori"
    description="Kelola kategori produk untuk klasifikasi inventaris."
    icon="fa-solid fa-tags"
  >
    <template #actions>
      <button
        @click="openCreateModal"
        class="bg-primary text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md shadow-primary/20"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span>Tambah Kategori</span>
      </button>
    </template>
  </WmsActionHeader>

  <div>
    <div
      class="bg-background shadow-md rounded-xl border border-secondary/20 overflow-x-auto overflow-y-auto relative custom-scrollbar h-[calc(95vh-100px)] table-container"
    >
    <table class="w-full text-sm text-left text-text border-collapse" :class="isMobile ? 'block' : 'min-w-[400px]'">
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
          <tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-secondary/20 animate-pulse">
            <td class="px-6 py-4 text-center"><BaseSkeleton shape="rect" className="w-4 h-4 mx-auto" /></td>
            <td class="px-6 py-4"><BaseSkeleton shape="text" className="w-1/2 h-4" /></td>
            <td class="px-6 py-4"><BaseSkeleton shape="rect" className="w-16 h-6 mx-auto rounded-lg" /></td>
          </tr>
        </template>

        <tr v-else-if="categories.length === 0" key="empty">
          <td colspan="3" class="py-12 text-center text-text/50 italic">
            <font-awesome-icon icon="fa-solid fa-tags" class="text-3xl text-text/20 mb-3 block" />
            Belum ada kategori. Tambahkan kategori pertama Anda.
          </td>
        </tr>

        <tr
          v-else
          v-for="(cat, index) in visibleCategories"
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
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-sans font-semibold">#</span>
            <span>{{ (currentPage - 1) * currentLimit + index + 1 }}</span>
          </td>
          <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'">
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Nama</span>
            <span class="font-medium text-text">{{ cat.name }}</span>
          </td>
          <td class="bg-background group-hover:bg-secondary/5 transition-colors" :class="isMobile ? 'flex justify-end items-center pt-4' : 'px-6 py-4 text-center'">
            <div
              class="flex items-center justify-center gap-2 transition-all duration-200"
              :class="isMobile ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'"
            >
              <button
                @click="openEditModal(cat)"
                class="flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                :class="isMobile ? 'px-3 py-1.5 bg-primary/10 text-primary font-semibold text-xs gap-2' : 'w-8 h-8 text-text/40 hover:text-primary'"
                title="Edit Kategori"
              >
                <font-awesome-icon icon="fa-solid fa-pen-to-square" />
                <span v-if="isMobile">Edit</span>
              </button>
              <button
                @click="handleDelete(cat.id)"
                class="flex items-center justify-center rounded-lg hover:bg-danger/10 transition-colors"
                :class="isMobile ? 'px-3 py-1.5 bg-danger/10 text-danger font-semibold text-xs gap-2' : 'w-8 h-8 text-text/40 hover:text-danger'"
                title="Hapus Kategori"
              >
                <font-awesome-icon icon="fa-solid fa-trash" />
                <span v-if="isMobile">Hapus</span>
              </button>
            </div>
          </td>
        </tr>
      </TransitionGroup>
    </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && categories.length > 0" class="mt-4 rounded-xl overflow-hidden">
      <BasePagination
        :pagination="pagination"
        :show-limit-picker="true"
        @changePage="changePage"
        @update:limit="changePageSize"
        class="bg-transparent mb-0 pb-1"
      />
    </div>
  </div>

  <!-- Modal untuk Tambah/Edit Kategori -->
  <Teleport to="body">
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
          <font-awesome-icon v-if="saving" icon="fa-solid fa-circle-notch" class="animate-spin mr-1" />
          Simpan
        </button>
      </template>
    </BaseModal>
  </Teleport>
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
  transition: all 0.3s ease;
}
</style>
