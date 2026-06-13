<!-- frontend\src\views\admin\LocationManagement.vue -->
<script setup>
import { swalConfirm } from '@/composables/useSweetAlert'
import WmsActionHeader from '@/components/wms/shared/WmsActionHeader.vue'

import { ref, onMounted, watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import { createLocation, updateLocation, deleteLocation } from '@/api/helpers/locations.js'
import { useMasterDataStore } from '@/stores/masterData'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import TableSkeleton from '@/components/ui/TableSkeleton.vue'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()

const masterData = useMasterDataStore()

const { toast } = useToast()

const purposeOptions = ref(['WAREHOUSE', 'DISPLAY', 'BRANCH', 'RECEIVING', 'WORKSHOP', 'TRANSIT'])

const allLocations = ref([])
const loading = ref(true)
const isModalOpen = ref(false)
const isEditing = ref(false)
const selectedLocation = ref({
  id: null,
  code: '',
  building: '',
  floor: null,
  name: '',
  purpose: 'WAREHOUSE'
})

async function loadLocations() {
  loading.value = true
  try {
    allLocations.value = await masterData.getLocations(true)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadLocations)

function openCreateModal() {
  isEditing.value = false
  selectedLocation.value = {
    id: null,
    code: '',
    building: '',
    floor: null,
    name: '',
    purpose: 'WAREHOUSE' // Tambahkan purpose
  }
  isModalOpen.value = true
}

function openEditModal(location) {
  isEditing.value = true
  // Salin data agar tidak mengubah data asli secara langsung
  selectedLocation.value = { ...location }
  isModalOpen.value = true
}

async function handleSave() {
  try {
    if (isEditing.value) {
      await updateLocation(selectedLocation.value.id, selectedLocation.value)
      toast('Lokasi berhasil diperbarui.', 'success')
    } else {
      await createLocation(selectedLocation.value)
      toast('Lokasi berhasil dibuat.', 'success')
    }
    isModalOpen.value = false
    loadLocations() // Muat ulang data
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
  }
}

async function handleDelete(locationId) {
  if (
    await swalConfirm(
      'Apakah Anda yakin ingin menghapus lokasi ini? Menghapus lokasi yang sedang digunakan akan gagal.'
    )
  ) {
    try {
      await deleteLocation(locationId)
      toast('Lokasi berhasil dihapus.', 'success')
      loadLocations() // Muat ulang data
    } catch (error) {
      console.error(error) // Auto-added to prevent unused var
    }
  }
}

// --- LOCAL HOTKEYS ---
const { Alt_N, Alt_S } = useMagicKeys()

watch(Alt_N, pressed => {
  if (pressed && !isModalOpen.value) {
    openCreateModal()
  }
})

watch(Alt_S, pressed => {
  if (pressed && isModalOpen.value) {
    handleSave()
  }
})
</script>

<template>
  <WmsActionHeader title="Manajemen Lokasi" icon="fa-solid fa-map-marker-alt">
    <template #actions>
      <button
        @click="openCreateModal"
        class="bg-primary text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span>Tambah Lokasi</span>
      </button>
    </template>
  </WmsActionHeader>

  <div
    class="bg-background shadow-md rounded-xl border border-secondary/20 overflow-x-auto overflow-y-auto relative custom-scrollbar h-[calc(100vh-100px)]"
  >
    <table class="w-full text-sm text-left text-text border-collapse" :class="isMobile ? 'block' : 'min-w-[600px]'">
      <thead
        class="bg-background/95 backdrop-blur-md shadow-sm ring-1 ring-secondary/5"
        :class="isMobile ? 'hidden' : 'sticky top-0 z-30'"
      >
        <tr class="text-xs text-text/80 uppercase">
          <th
            class="px-6 py-3 sticky left-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
          >
            Kode
          </th>
          <th class="px-6 py-3 border-b border-secondary/10">Gedung</th>
          <th class="px-6 py-3 border-b border-secondary/10">Lantai</th>
          <th class="px-6 py-3 border-b border-secondary/10">Nama/Deskripsi</th>
          <th class="px-6 py-3 border-b border-secondary/10">Purpose</th>
          <th
            class="px-6 py-3 text-center sticky right-0 z-30 bg-background/95 backdrop-blur-md border-b border-secondary/10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"
          >
            Aksi
          </th>
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

        <tr v-else-if="allLocations.length === 0" key="empty">
          <td colspan="6" class="py-12 text-center text-text/50 italic">Tidak ada data lokasi.</td>
        </tr>

        <tr
          v-else
          v-for="loc in allLocations"
          :key="loc.id"
          class="transition-colors group relative"
          :class="
            isMobile
              ? 'block mb-4 p-4 bg-background/50 rounded-xl border border-secondary/20 shadow-sm mx-4 mt-4'
              : 'border-b border-secondary/20 hover:bg-secondary/5'
          "
        >
          <td
            class="font-mono font-semibold bg-background group-hover:bg-secondary/5 transition-colors"
            :class="
              isMobile
                ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                : 'px-6 py-4 sticky left-0 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]'
            "
          >
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-sans">Kode</span>
            <span>{{ loc.code }}</span>
          </td>
          <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'">
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Gedung</span>
            <span>{{ loc.building }}</span>
          </td>
          <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'">
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Lantai</span>
            <span>{{ loc.floor || '-' }}</span>
          </td>
          <td
            class="text-text/80"
            :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'"
          >
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Nama</span>
            <span>{{ loc.name || '-' }}</span>
          </td>
          <td
            class="font-mono text-xs"
            :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'"
          >
            <span v-if="isMobile" class="text-text/60 text-xs uppercase font-sans font-semibold">Purpose</span>
            <span>{{ loc.purpose || '-' }}</span>
          </td>
          <td
            class="space-x-4 bg-background group-hover:bg-secondary/5 transition-colors"
            :class="
              isMobile
                ? 'flex justify-end items-center pt-4'
                : 'px-6 py-4 text-center sticky right-0 z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]'
            "
          >
            <button
              @click="openEditModal(loc)"
              class="text-primary hover:text-primary/80 text-xs font-semibold inline-flex items-center gap-1 transition-transform hover:scale-105"
            >
              <font-awesome-icon icon="fa-solid fa-edit" />
              <span>Edit</span>
            </button>
            <button
              @click="handleDelete(loc.id)"
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

  <!-- Modal untuk Tambah/Edit Lokasi -->
  <Teleport to="body">
    <BaseModal
      :show="isModalOpen"
      @close="isModalOpen = false"
      :title="isEditing ? 'Edit Lokasi' : 'Tambah Lokasi Baru'"
    >
      <form @submit.prevent="handleSave" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-text/80 mb-1">Kode Lokasi</label>
          <input
            v-model="selectedLocation.code"
            type="text"
            required
            class="w-full input-field"
            placeholder="e.g., A19-1"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text/80 mb-1">Gedung</label>
          <input
            v-model="selectedLocation.building"
            type="text"
            required
            class="w-full input-field"
            placeholder="e.g., A19"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text/80 mb-1">Purpose</label>
          <BaseSelect
            v-model="selectedLocation.purpose"
            :options="purposeOptions"
            emit-value
            :searchable="false"
            placeholder="Pilih Purpose"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text/80 mb-1">Lantai (Opsional)</label>
          <input
            v-model.number="selectedLocation.floor"
            type="number"
            class="w-full input-field"
            placeholder="e.g., 1"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text/80 mb-1">Nama/Deskripsi (Opsional)</label>
          <input
            v-model="selectedLocation.name"
            type="text"
            class="w-full input-field"
            placeholder="e.g., Gudang A19 Lantai 1"
          />
        </div>
      </form>
      <template #footer>
        <button type="button" @click="isModalOpen = false" class="btn-secondary">Batal</button>
        <button type="submit" @click="handleSave" class="btn-primary">Simpan</button>
      </template>
    </BaseModal>
  </Teleport>
</template>

<style lang="postcss" scoped>
.input-field {
  @apply w-full px-3 py-2 bg-background border border-secondary/50 rounded-lg focus:ring-primary focus:border-primary;
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
