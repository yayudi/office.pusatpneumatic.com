<!-- frontend/src/views/admin/UserManagement.vue -->
<script setup>
import WmsActionHeader from '@/components/wms/shared/WmsActionHeader.vue'

import { ref, onMounted, computed, watch } from 'vue'
import { useMagicKeys } from '@vueuse/core'
import { useToast } from '@/composables/useToast.js'
import { fetchRoles, fetchShifts, createUser, deleteUser } from '@/api/helpers/admin.js'
import { swalConfirm } from '@/composables/useSweetAlert'
import { useMasterDataStore } from '@/stores/masterData'

const masterData = useMasterDataStore()
import UserLocationModal from '@/components/users/locationModal.vue'
import UserEditModal from '@/components/users/EditModal.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import TriStateSelect from '@/components/ui/TriStateSelect.vue'
import BaseFilterPanel from '@/components/ui/BaseFilterPanel.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()

const users = ref([])
const allRoles = ref([])
const allShifts = ref([])
const loading = ref(true)
const selectedUser = ref(null)

// Filter State
const searchQuery = ref('')
const searchRole = ref({ include: [], exclude: [] })
const searchShift = ref({ include: [], exclude: [] })

// State untuk semua modal
const isCreateModalOpen = ref(false)
const isLocationModalOpen = ref(false)
const isEditModalOpen = ref(false)

const newUser = ref({ username: '', password: '', role_id: null, shift_id: null, nickname: '' })
const { toast } = useToast()

const shiftOptions = computed(() => {
  return [
    { id: null, label: 'Default (Regular Office)' },
    ...(allShifts.value || []).map(s => ({
      id: s.id,
      label: `${s.name} (${s.start_time?.slice(0, 5)} - ${s.end_time?.slice(0, 5)})`
    }))
  ]
})

const roleOptions = computed(() => {
  return (allRoles.value || []).map(r => ({ id: r.id, label: r.name }))
})

// Filter Logic Client-Side
const filteredUsers = computed(() => {
  if (!users.value) return []
  return users.value.filter(user => {
    // 1. Search Query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      const matchUsername = user.username?.toLowerCase().includes(query)
      const matchNickname = user.nickname?.toLowerCase().includes(query)
      if (!matchUsername && !matchNickname) return false
    }

    // 2. Role Filter (TriState)
    if (searchRole.value.include.length > 0 && !searchRole.value.include.includes(user.role_id)) return false
    if (searchRole.value.exclude.length > 0 && searchRole.value.exclude.includes(user.role_id)) return false

    // 3. Shift Filter (TriState) - Note: shift_id bisa null
    const shiftId = user.shift_id
    if (searchShift.value.include.length > 0 && !searchShift.value.include.includes(shiftId)) return false
    if (searchShift.value.exclude.length > 0 && searchShift.value.exclude.includes(shiftId)) return false

    return true
  })
})

function handleResetFilters() {
  searchQuery.value = ''
  searchRole.value = { include: [], exclude: [] }
  searchShift.value = { include: [], exclude: [] }
}

async function fetchData() {
  loading.value = true
  try {
    // Gunakan helper API untuk mengambil data
    const [usersData, rolesData, shiftsData] = await Promise.all([
      masterData.getUsers(true),
      fetchRoles(),
      fetchShifts()
    ])
    users.value = usersData
    allRoles.value = rolesData
    allShifts.value = shiftsData
  } catch {
    toast('Gagal memuat data pengguna.', 'error')
  } finally {
    loading.value = false
  }
}

async function handleCreateUser() {
  if (!newUser.value.username || !newUser.value.password || !newUser.value.role_id) {
    toast('Username, password, dan role wajib diisi.', 'warning')
    return
  }
  try {
    const response = await createUser(newUser.value)
    toast(response.message || 'Pengguna berhasil dibuat.', 'success')
    isCreateModalOpen.value = false
    newUser.value = { username: '', password: '', role_id: null, shift_id: null, nickname: '' } // Reset form
    fetchData() // Muat ulang data
  } catch (error) {
    toast(error.response?.data?.message || 'Gagal membuat pengguna.', 'error')
  }
}

async function handleDeleteUser(userId) {
  if (
    !(await swalConfirm(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus pengguna ini? Pengguna akan dinonaktifkan dan tidak dapat login lagi.'
    ))
  )
    return

  try {
    const response = await deleteUser(userId)
    toast(response.message || 'Pengguna berhasil dihapus.', 'success')
    fetchData()
  } catch (error) {
    toast(error.response?.data?.message || 'Gagal menghapus pengguna.', 'error')
  }
}

function openLocationModal(user) {
  selectedUser.value = user
  isLocationModalOpen.value = true
}

function openEditModal(user) {
  selectedUser.value = user
  isEditModalOpen.value = true
}

// --- LOCAL HOTKEYS ---
const { Alt_N, Alt_S, Alt_R } = useMagicKeys()
watch(Alt_N, pressed => {
  if (pressed && !isCreateModalOpen.value && !isEditModalOpen.value && !isLocationModalOpen.value) {
    isCreateModalOpen.value = true
  }
})
watch(Alt_S, pressed => {
  if (pressed && isCreateModalOpen.value) {
    handleCreateUser()
  }
})
watch(Alt_R, pressed => {
  if (pressed && !isCreateModalOpen.value && !isEditModalOpen.value && !isLocationModalOpen.value) {
    fetchData()
  }
})

onMounted(fetchData)
</script>

<template>
  <WmsActionHeader title="Manajemen Pengguna" icon="fa-solid fa-users">
    <template #actions>
      <button
        @click="isCreateModalOpen = true"
        class="bg-primary text-secondary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 hover:shadow-sm transition-colors flex items-center gap-2 w-full md:w-auto justify-center"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span>Tambah Pengguna</span>
      </button>
    </template>
  </WmsActionHeader>

  <div class="p-6">
    <!-- Filter Section -->
    <BaseFilterPanel class="mb-6">
      <template #filters>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:flex xl:flex-row lg:justify-between items-end gap-4">
          <!-- Search -->
          <div class="space-y-1.5 flex-1">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Pencarian</label>
            <div class="relative group lg:min-w-[400px]">
              <span
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text/40 group-focus-within:text-primary transition-colors"
              >
                <font-awesome-icon icon="fa-solid fa-search" />
              </span>
              <input
                v-model="searchQuery"
                type="text"
                class="w-full pl-10 pr-4 py-2.5 bg-background border border-secondary hover:border-primary/50 focus:border-primary rounded-lg text-sm transition-all shadow-sm"
                placeholder="Cari username atau nickname..."
              />
            </div>
          </div>

          <!-- Role Filter -->
          <div class="space-y-1.5 w-full lg:w-[150px]">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Role</label>
            <TriStateSelect
              v-model="searchRole"
              :options="roleOptions"
              label="label"
              track="id"
              placeholder="Semua Role"
            />
          </div>

          <!-- Shift Filter -->
          <div class="space-y-1.5 w-full lg:w-[150px]">
            <label class="text-xs font-bold text-text/60 uppercase tracking-wide">Shift</label>
            <TriStateSelect
              v-model="searchShift"
              :options="shiftOptions"
              label="label"
              track="id"
              placeholder="Semua Shift"
            />
          </div>

          <button
            @click="handleResetFilters"
            class="h-[41px] px-4 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg border border-danger bg-danger/10 hover:bg-danger/20 hover:text-danger transition-all text-danger shadow-sm"
            title="Reset Filter"
          >
            <font-awesome-icon icon="fa-solid fa-undo" />
            <span class="hidden sm:inline">Reset</span>
          </button>
        </div>
      </template>
    </BaseFilterPanel>

    <div
      class="bg-secondary/5 shadow-md rounded-xl border border-secondary/20 overflow-x-auto overflow-y-auto relative custom-scrollbar h-[calc(70vh)]"
    >
      <table class="w-full text-sm text-left text-text border-collapse" :class="isMobile ? 'block' : 'min-w-[600px]'">
        <thead
          class="bg-background shadow-sm ring-1 ring-secondary/5"
          :class="isMobile ? 'hidden' : 'sticky top-0 z-30'"
        >
          <tr class="text-xs text-text/80 uppercase">
            <th
              class="px-6 py-3 sticky left-0 z-30 text-center bg-secondary border-b border-r border-secondary/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
            >
              Username
            </th>
            <th class="px-6 py-3 text-center bg-secondary border-b border-r border-secondary/10">Nickname</th>
            <th class="px-6 py-3 text-center bg-secondary border-b border-r border-secondary/10">Role</th>
            <th class="px-6 py-3 text-center bg-secondary border-b border-r border-secondary/10">Shift</th>
            <th
              class="px-6 py-3 text-center sticky right-0 z-30 bg-secondary border-b border-secondary/10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]"
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
          <template v-if="loading">
            <tr v-for="n in 5" :key="`skeleton-${n}`" class="border-b border-secondary/20 animate-pulse">
              <td class="px-6 py-4"><BaseSkeleton shape="text" className="w-1/2 h-4" /></td>
              <td class="px-6 py-4"><BaseSkeleton shape="text" className="w-3/4 h-4" /></td>
              <td class="px-6 py-4"><BaseSkeleton shape="rect" className="w-16 h-6 rounded-md" /></td>
              <td class="px-6 py-4"><BaseSkeleton shape="text" className="w-1/2 h-4" /></td>
              <td class="px-6 py-4 text-center"><BaseSkeleton shape="rect" className="w-20 h-6 mx-auto rounded-md" /></td>
            </tr>
          </template>

          <tr v-else-if="filteredUsers.length === 0" key="empty">
            <td colspan="5" class="py-12 text-center text-text/50 italic">Tidak ada data pengguna yang cocok.</td>
          </tr>

          <tr
            v-else
            v-for="user in filteredUsers"
            :key="user.id"
            class="transition-colors group relative"
            :class="
              isMobile
                ? 'block mb-4 p-4 bg-background rounded-xl border border-secondary/20 shadow-sm mx-4 mt-4'
                : 'border-b border-secondary/20 hover:bg-secondary/30'
            "
          >
            <td
              class="font-medium bg-secondary/20 group-hover:bg-secondary/30 transition-colors"
              :class="
                isMobile
                  ? 'flex justify-between items-center py-2 border-b border-secondary/10'
                  : 'px-6 py-4 sticky left-0 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]'
              "
            >
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Username</span>
              <span>{{ user.username }}</span>
            </td>
            <td
              class="text-text/80"
              :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'"
            >
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Nickname</span>
              <span>{{ user.nickname || '-' }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Role</span>
              <span class="px-2 py-1 rounded text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {{ user.role_name }}
              </span>
            </td>
            <td
              class="text-text/80 text-sm"
              :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-6 py-4'"
            >
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Shift</span>
              <span v-if="user.shift_name" class="flex items-center gap-1.5">
                <font-awesome-icon icon="fa-solid fa-clock" class="text-text/40 text-xs" />
                {{ user.shift_name }}
              </span>
              <span v-else class="text-text/40 italic">Default</span>
            </td>
            <td
              class="space-x-2 bg-secondary/20 transition-colors"
              :class="
                isMobile
                  ? 'flex justify-end items-center pt-4'
                  : 'text-center px-6 py-4 sticky right-0 z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]'
              "
            >
              <button
                @click="openEditModal(user)"
                class="text-primary hover:text-primary/80 text-xs font-semibold inline-flex items-center gap-1 transition-transform hover:scale-105"
              >
                <font-awesome-icon icon="fa-solid fa-edit" />
                <span>Edit</span>
              </button>
              <button
                @click="openLocationModal(user)"
                class="text-accent hover:text-accent/80 text-xs font-semibold inline-flex items-center gap-1 transition-transform hover:scale-105"
              >
                <font-awesome-icon icon="fa-solid fa-map-marker-alt" />
                <span>Lokasi</span>
              </button>
              <button
                @click="handleDeleteUser(user.id)"
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
  </div>

  <!-- Semua Modal yang Digunakan di Halaman Ini -->
  <UserLocationModal
    :show="isLocationModalOpen"
    :user="selectedUser"
    @close="isLocationModalOpen = false"
    @updated="fetchData"
  />
  <UserEditModal
    :show="isEditModalOpen"
    :user="selectedUser"
    :roles="allRoles"
    :shifts="allShifts"
    @close="isEditModalOpen = false"
    @updated="fetchData"
  />

  <!-- Modal untuk Tambah Pengguna -->

  <Teleport to="body">
    <BaseModal :show="isCreateModalOpen" @close="isCreateModalOpen = false" title="Tambah Pengguna Baru">
      <form @submit.prevent="handleCreateUser" class="p-6 space-y-4">
        <div>
          <label for="username" class="block text-sm font-medium text-text/80 mb-1">Username</label>
          <input
            v-model="newUser.username"
            id="username"
            type="text"
            required
            class="w-full px-3 py-2 bg-background border border-secondary/50 rounded-lg"
          />
        </div>
        <div>
          <label for="nickname" class="block text-sm font-medium text-text/80 mb-1">Nickname (Opsional)</label>
          <input
            v-model="newUser.nickname"
            id="nickname"
            type="text"
            class="w-full px-3 py-2 bg-background border border-secondary/50 rounded-lg"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-text/80 mb-1">Password</label>
          <input
            v-model="newUser.password"
            id="password"
            type="password"
            required
            class="w-full px-3 py-2 bg-background border border-secondary/50 rounded-lg"
          />
        </div>
        <div>
          <label for="role" class="block text-sm font-medium text-text/80 mb-1">Role</label>
          <BaseSelect
            v-model="newUser.role_id"
            :options="allRoles"
            track-by="id"
            label="name"
            emit-value
            placeholder="Pilih Role"
          />
        </div>
        <div>
          <label for="shift" class="block text-sm font-medium text-text/80 mb-1">Shift (Opsional)</label>
          <BaseSelect
            v-model="newUser.shift_id"
            :options="shiftOptions"
            track-by="id"
            emit-value
            placeholder="Pilih Shift"
          />
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          @click="isCreateModalOpen = false"
          class="bg-background border border-secondary/30 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-secondary/20 flex items-center gap-2"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
          <span>Batal</span>
        </button>
        <button
          type="submit"
          @click="handleCreateUser"
          class="bg-primary text-secondary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2"
        >
          <font-awesome-icon icon="fa-solid fa-save" />
          <span>Simpan</span>
        </button>
      </template>
    </BaseModal>
  </Teleport>
</template>

<style scoped>
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
