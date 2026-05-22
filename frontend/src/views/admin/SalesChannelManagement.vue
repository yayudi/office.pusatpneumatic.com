<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast.js'
import api from '@/api/axios.js'
import { format } from 'date-fns'
import Modal from '@/components/ui/Modal.vue'

const { toast } = useToast()
const channels = ref([])
const isLoading = ref(false)
const isSaving = ref(false)

const isModalOpen = ref(false)
const modalMode = ref('add') // 'add' or 'edit'

const formData = ref({
  id: null,
  platform: 'Shopee',
  name: '',
  description: '',
  isActive: true,
})

const platformOptions = ['Shopee', 'Tokopedia', 'Offline', 'Lainnya']

const isDeleteModalOpen = ref(false)
const itemToDelete = ref(null)

onMounted(() => {
  fetchChannels()
})

const fetchChannels = async () => {
  isLoading.value = true
  try {
    const res = await api.get('/sales-channels')
    channels.value = res.data?.data || []
  } catch (error) {
    toast(error.response?.data?.message || 'Gagal memuat saluran penjualan.', 'error')
  } finally {
    isLoading.value = false
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  formData.value = {
    id: null,
    platform: 'Shopee',
    name: '',
    description: '',
    isActive: true,
  }
  isModalOpen.value = true
}

const openEditModal = (item) => {
  modalMode.value = 'edit'
  formData.value = {
    id: item.id,
    platform: item.platform,
    name: item.name,
    description: item.description || '',
    isActive: item.is_active === 1,
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const saveChannel = async () => {
  if (!formData.value.name) {
    toast('Nama Toko / Sales harus diisi.', 'warning')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      platform: formData.value.platform,
      name: formData.value.name,
      description: formData.value.description,
      isActive: formData.value.isActive,
    }

    if (modalMode.value === 'add') {
      await api.post('/sales-channels', payload)
      toast('Saluran berhasil ditambahkan.', 'success')
    } else {
      await api.put(`/sales-channels/${formData.value.id}`, payload)
      toast('Saluran berhasil diperbarui.', 'success')
    }

    closeModal()
    fetchChannels()
  } catch (error) {
    toast(error.response?.data?.message || 'Gagal menyimpan saluran penjualan.', 'error')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (item) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value) return

  try {
    await api.delete(`/sales-channels/${itemToDelete.value.id}`)
    toast('Saluran berhasil dihapus.', 'success')
    fetchChannels()
  } catch (error) {
    toast(error.response?.data?.message || 'Gagal menghapus saluran.', 'error')
  } finally {
    isDeleteModalOpen.value = false
    itemToDelete.value = null
  }
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-secondary/20 pb-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-text">Manajemen Saluran Penjualan</h2>
        <p class="text-text/60 text-sm mt-1">
          Kelola referensi nama toko / sales untuk form upload picking list.
        </p>
      </div>
      <button
        @click="openAddModal"
        class="bg-primary text-secondary px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        Tambah Saluran
      </button>
    </div>

    <!-- Table Content -->
    <div class="bg-background rounded-xl border border-secondary/20 shadow-sm overflow-hidden">
      <div v-if="isLoading" class="p-8 text-center text-text/50">
        <font-awesome-icon icon="fa-solid fa-spinner" spin class="text-2xl mb-2 text-primary" />
        <p>Memuat data...</p>
      </div>

      <div v-else-if="channels.length === 0" class="p-12 text-center text-text/50">
        <font-awesome-icon icon="fa-solid fa-store-slash" class="text-4xl mb-3 text-text/30" />
        <p>Belum ada data saluran penjualan.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-secondary/5 border-b border-secondary/20">
            <tr>
              <th class="px-6 py-4 font-semibold text-text/80">Platform</th>
              <th class="px-6 py-4 font-semibold text-text/80">Nama Toko / Sales</th>
              <th class="px-6 py-4 font-semibold text-text/80">Keterangan</th>
              <th class="px-6 py-4 font-semibold text-text/80 text-center">Status</th>
              <th class="px-6 py-4 font-semibold text-text/80 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary/10">
            <tr
              v-for="item in channels"
              :key="item.id"
              class="hover:bg-secondary/5 transition-colors"
            >
              <td class="px-6 py-4">
                <span
                  class="px-2 py-1 rounded-md text-xs font-bold"
                  :class="
                    item.platform === 'Shopee'
                      ? 'bg-[#ee4d2d]/10 text-[#ee4d2d]'
                      : item.platform === 'Tokopedia'
                        ? 'bg-[#00AA5B]/10 text-[#00AA5B]'
                        : 'bg-secondary/20 text-text/70'
                  "
                >
                  {{ item.platform }}
                </span>
              </td>
              <td class="px-6 py-4 font-bold text-text">{{ item.name }}</td>
              <td class="px-6 py-4 text-text/60 truncate max-w-xs">
                {{ item.description || '-' }}
              </td>
              <td class="px-6 py-4 text-center">
                <span
                  v-if="item.is_active"
                  class="px-2 py-1 bg-success/10 text-success text-xs font-bold rounded-lg"
                  >Aktif</span
                >
                <span v-else class="px-2 py-1 bg-danger/10 text-danger text-xs font-bold rounded-lg"
                  >Nonaktif</span
                >
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-3">
                  <button
                    @click="openEditModal(item)"
                    class="w-8 h-8 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                    title="Edit"
                  >
                    <font-awesome-icon icon="fa-solid fa-pen" class="text-xs" />
                  </button>
                  <!--
                  <button @click="confirmDelete(item)" class="w-8 h-8 rounded bg-danger/10 text-danger hover:bg-danger/20 flex items-center justify-center transition-colors" title="Hapus">
                    <font-awesome-icon icon="fa-solid fa-trash" class="text-xs" />
                  </button>
                  -->
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Form Modal -->
    <Modal :show="isModalOpen" @close="closeModal" maxWidth="max-w-md" class="mt-[-10vh]">
      <template #title>
        <div class="-mt-1">
          <h3 class="font-bold text-text">
            {{ modalMode === 'add' ? 'Tambah Saluran Penjualan' : 'Edit Saluran Penjualan' }}
          </h3>
        </div>
      </template>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-text/70 mb-1"
            >Platform <span class="text-danger">*</span></label
          >
          <select
            v-model="formData.platform"
            class="w-full bg-background border border-secondary/30 rounded-lg px-3 py-2 text-sm text-text focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
          >
            <option v-for="opt in platformOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-text/70 mb-1"
            >Nama Toko / Sales <span class="text-danger">*</span></label
          >
          <input
            v-model="formData.name"
            type="text"
            placeholder="Contoh: Toko Maju Jaya"
            class="w-full bg-background border border-secondary/30 rounded-lg px-3 py-2 text-sm text-text focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-text/70 mb-1">Keterangan (Opsional)</label>
          <textarea
            v-model="formData.description"
            rows="2"
            placeholder="Contoh: Akun cabang Budi"
            class="w-full bg-background border border-secondary/30 rounded-lg px-3 py-2 text-sm text-text focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none resize-none"
          ></textarea>
        </div>

        <div class="pt-2">
          <label class="flex items-center gap-3 cursor-pointer group">
            <div class="relative flex items-center">
              <input type="checkbox" v-model="formData.isActive" class="peer sr-only" />
              <div
                class="w-10 h-5 bg-secondary/30 rounded-full peer-checked:bg-success transition-colors duration-200"
              ></div>
              <div
                class="absolute left-1 top-1 w-3 h-3 bg-secondary rounded-full transition-transform duration-200 peer-checked:translate-x-5 shadow-sm"
              ></div>
            </div>
            <div>
              <span class="text-sm font-bold text-text group-hover:text-primary transition-colors"
                >Saluran Aktif</span
              >
              <p class="text-[10px] text-text/50">Nonaktifkan jika toko tutup / sales resign.</p>
            </div>
          </label>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button
            @click="closeModal"
            class="px-4 py-2 text-sm font-bold text-text/60 hover:text-text transition-colors"
          >
            Batal
          </button>
          <button
            @click="saveChannel"
            :disabled="isSaving"
            class="px-6 py-2 bg-primary text-secondary text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <font-awesome-icon v-if="isSaving" icon="fa-solid fa-spinner" spin />
            Simpan
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
