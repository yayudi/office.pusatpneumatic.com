<!-- frontend/src/components/wms/shared/HistoryModal.vue -->
<script setup>
import { ref, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import BasePagination from '@/components/ui/BasePagination.vue'
import { fetchStockHistory } from '@/api/helpers/stock.js'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()

const props = defineProps({
  show: Boolean,
  product: Object,
})

const emit = defineEmits(['close'])

const history = ref([])
const pagination = ref({})
const loading = ref(false)
const error = ref(null)
const currentPage = ref(1)

const paginationData = computed(() => ({
  page: pagination.value.page || 1,
  limit: pagination.value.limit || 10,
  total: pagination.value.total || 0,
  totalPages: Math.ceil((pagination.value.total || 0) / (pagination.value.limit || 10)) || 1
}))

async function loadHistory(page) {
  if (!props.product) return
  loading.value = true
  error.value = null
  try {
    const response = await fetchStockHistory(props.product.id, page)
    history.value = response.data
    pagination.value = response.pagination
    currentPage.value = response.pagination.page
  } catch (err) {
    error.value = 'Gagal memuat riwayat stok.'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.show,
  (newValue) => {
    if (newValue) {
      loadHistory(1)
    }
  },
)
</script>

<template>
  <Modal :show="show" @close="emit('close')" :title="`Riwayat Stok: ${product?.name}`">
    <div class="max-h-[80vh] overflow-y-auto">
      <div v-if="loading" class="text-center p-8">Memuat riwayat...</div>
      <div v-else-if="error" class="text-center p-8 text-accent">{{ error }}</div>
      <div v-else-if="history.length === 0" class="text-center p-8 text-text/60">
        Tidak ada riwayat pergerakan.
      </div>
      <table v-else class="text-sm" :class="isMobile ? 'w-full block' : 'min-w-full'">
        <thead class="bg-secondary/10 text-xs uppercase text-text/70" :class="isMobile ? 'hidden' : ''">
          <tr>
            <th class="p-2 text-left">Tanggal</th>
            <th class="p-2 text-left">Tipe</th>
            <th class="p-2 text-center">Jumlah</th>
            <th class="p-2 text-left">Dari</th>
            <th class="p-2 text-left">Ke</th>
            <th class="p-2 text-left">Oleh</th>
            <th class="p-2 text-left">Catatan</th>
          </tr>
        </thead>
        <tbody :class="isMobile ? 'block' : 'divide-y divide-secondary/20'">
          <tr v-for="item in history" :key="item.id" class="transition-colors"
            :class="isMobile ? 'block mb-3 p-3 bg-background/50 rounded-xl border border-secondary/20 shadow-sm' : 'hover:bg-primary/5'">
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 whitespace-nowrap'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Tanggal</span>
              <span>{{ new Date(item.created_at).toLocaleString('id-ID') }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Tipe</span>
              <span>{{ item.movement_type }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 text-center font-bold'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Jumlah</span>
              <span class="font-bold">{{ item.quantity }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 font-mono'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Dari</span>
              <span class="font-mono">{{ item.from_location || '-' }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 font-mono'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Ke</span>
              <span class="font-mono">{{ item.to_location || '-' }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Oleh</span>
              <span>{{ item.user }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5' : 'p-2 text-xs text-text/80'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Catatan</span>
              <span class="text-xs text-text/80">{{ item.notes }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Paginasi -->
    <div
      v-if="pagination.total > pagination.limit"
      class="mt-4 border-t border-secondary/20 pt-2"
    >
      <BasePagination 
        :pagination="paginationData" 
        :show-limit-picker="false" 
        @changePage="(p) => loadHistory(p)" 
      />
    </div>
  </Modal>
</template>
