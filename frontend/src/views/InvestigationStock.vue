<template>
  <div class="investigation-page p-6 bg-background min-h-screen text-text">
    <div class="w-full mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-primary">Investigasi Stok (Double Transaction)</h1>
        <p class="text-sm text-text/70 mt-1">
          Lacak potensi transaksi ganda berdasarkan catatan (notes) pergerakan stok.
        </p>
      </div>

      <!-- Filter Card -->
      <div class="bg-secondary/35 rounded-xl shadow-sm border border-secondary/20 p-5 mb-6">
        <h2 class="text-lg font-semibold text-text mb-4 border-b border-secondary/20 pb-2">Filter Pencarian</h2>

        <form
          @submit.prevent="fetchData"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
        >
          <!-- Start Date -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              v-model="filters.startDate"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Tanggal Akhir</label>
            <input
              type="date"
              v-model="filters.endDate"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- Movement Type -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Tipe Pergerakan</label>
            <select
              v-model="filters.movementType"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Semua Tipe</option>
              <option value="SALE">SALE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="INBOUND">INBOUND</option>
              <option value="ADJUST_OPNAME">ADJUST_OPNAME</option>
            </select>
          </div>

          <!-- Include Notes -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Pencarian Kata (Include)</label>
            <input
              type="text"
              v-model="filters.includeNotes"
              placeholder="Contoh: Sale Ref"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="text-xs text-text/60 mt-0.5">Preset:</span>
              <button
                type="button"
                @click="filters.includeNotes = 'Sale Ref'"
                class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20"
              >
                Sale Ref
              </button>
              <button
                type="button"
                @click="filters.includeNotes = 'Picking List'"
                class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20"
              >
                Picking List
              </button>
              <button
                type="button"
                @click="filters.includeNotes = 'Opname'"
                class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded hover:bg-primary/20"
              >
                Opname
              </button>
            </div>
            <p class="text-xs text-text/50 mt-1">
              Anda juga bisa menggunakan simbol `.*` jika ingin mencari dua kata terpisah. (Misal:
              <code class="bg-secondary/50 px-1 rounded">Sale.*Item</code>)
            </p>
          </div>

          <!-- Exclude Notes -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Pengecualian Kata (Exclude)</label>
            <input
              type="text"
              v-model="filters.excludeNotes"
              placeholder="Contoh: Cancelled"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="text-xs text-text/60 mt-0.5">Preset:</span>
              <button
                type="button"
                @click="filters.excludeNotes = 'Cancelled'"
                class="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded hover:bg-accent/20"
              >
                Cancelled
              </button>
              <button
                type="button"
                @click="filters.excludeNotes = 'Void'"
                class="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded hover:bg-accent/20"
              >
                Void
              </button>
            </div>
          </div>

          <!-- Lokasi -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Kode Lokasi</label>
            <input
              type="text"
              v-model="filters.location"
              placeholder="Contoh: A19-01"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- Barang -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Nama / SKU Barang</label>
            <input
              type="text"
              v-model="filters.productName"
              placeholder="Cari barang..."
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- User -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Nama User</label>
            <input
              type="text"
              v-model="filters.username"
              placeholder="Nama pemroses..."
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- PL Source -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Source (Order)</label>
            <select
              v-model="filters.plSource"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Semua Source</option>
              <option value="Tokopedia">Tokopedia</option>
              <option value="Shopee">Shopee</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <!-- PL Status -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Status Internal Order</label>
            <select
              v-model="filters.plStatus"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">PENDING</option>
              <option value="VALIDATED">VALIDATED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <!-- PL Marketplace Status -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Marketplace Status</label>
            <input
              type="text"
              v-model="filters.plMarketplaceStatus"
              placeholder="Misal: READY_TO_SHIP"
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- PL Customer -->
          <div>
            <label class="block text-sm font-medium text-text/80 mb-1">Nama Customer</label>
            <input
              type="text"
              v-model="filters.plCustomer"
              placeholder="Cari pembeli..."
              class="w-full px-3 py-2 bg-background border border-secondary/30 text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- Exact Quantity Toggle -->
          <div class="flex items-center mt-6">
            <input
              type="checkbox"
              id="exactQtyCheck"
              v-model="filters.exactQuantity"
              class="w-4 h-4 text-primary bg-background border-secondary/30 rounded focus:ring-primary focus:ring-2"
            />
            <label for="exactQtyCheck" class="ml-2 text-sm font-medium text-text/80">
              Eksak Qty (Abaikan duplikat jika Qty berbeda)
            </label>
          </div>

          <!-- Buttons -->
          <div class="col-span-full flex justify-end space-x-3 mt-2 border-t border-secondary/20 pt-4">
            <button
              type="button"
              @click="exportToCSV"
              :disabled="loading || results.length === 0"
              class="px-4 py-2 border border-secondary/50 text-text rounded-lg hover:bg-secondary/20 transition-colors flex items-center disabled:opacity-50"
            >
              <font-awesome-icon icon="fa-solid fa-file-csv" class="mr-2" />
              Export CSV
            </button>
            <button
              type="button"
              @click="resetFilters"
              class="px-4 py-2 border border-secondary/50 text-text rounded-lg hover:bg-secondary/20 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center"
              :disabled="loading"
            >
              <font-awesome-icon v-if="loading" icon="fa-solid fa-spinner" class="animate-spin -ml-1 mr-2 h-4 w-4" />
              Cari Duplikat
            </button>
          </div>
        </form>
      </div>

      <!-- Results Data -->
      <div class="bg-secondary/35 rounded-xl shadow-sm border border-secondary/20 overflow-hidden">
        <div class="p-5 border-b border-secondary/20 flex justify-between items-center bg-secondary/10">
          <h2 class="text-lg font-semibold text-text">Hasil Investigasi</h2>
          <span class="text-sm text-text/70">
            Ditemukan: <strong class="text-accent">{{ meta.totalGroups || 0 }}</strong> grup duplikat
          </span>
        </div>

        <div v-if="loading" class="p-10 text-center text-text/50">
          <font-awesome-icon icon="fa-solid fa-spinner" class="animate-spin text-primary text-2xl mb-2" />
          <p>Sedang memuat data...</p>
        </div>

        <div v-else-if="results.length === 0" class="p-10 text-center text-text/50">
          <font-awesome-icon icon="fa-solid fa-search" class="mx-auto h-10 w-10 text-text/30 mb-3" />
          <p>Tidak ada transaksi ganda yang ditemukan.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <div v-for="(group, idx) in results" :key="idx" class="border-b border-secondary/20 last:border-b-0">
            <div
              @click="toggleGroup(idx)"
              class="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-accent/10 transition-colors"
              :class="{ 'bg-accent/10': openGroups.includes(idx) }"
            >
              <div class="flex-1">
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-0.5 text-xs font-semibold bg-accent/20 text-accent rounded-full">
                    {{ group.occurrences }}x Terjadi
                  </span>
                  <span
                    class="text-sm font-medium text-text/80 border border-secondary/40 px-2 py-0.5 rounded bg-background"
                  >
                    {{ group.movementType }}
                  </span>
                </div>
                <h3 class="font-medium text-text mt-2 break-words">{{ group.baseNote }}</h3>
                <div class="text-sm text-text/60 mt-1 flex flex-wrap gap-3">
                  <span><strong>Total Qty Movement:</strong> {{ group.totalQuantity }}</span>
                </div>
              </div>

              <div class="text-xs space-x-2 flex">
                <span class="px-2 py-1 bg-background rounded border border-secondary/30">{{
                  group.pickingList.source
                }}</span>
                <span class="px-2 py-1 bg-background rounded border border-secondary/30 font-medium text-text/80">{{
                  group.pickingList.status
                }}</span>
              </div>

              <div
                class="mt-3 sm:mt-0 ml-0 sm:ml-4 flex items-center justify-center h-8 w-8 rounded-full bg-background shadow-sm border border-secondary/30"
              >
                <font-awesome-icon
                  icon="fa-solid fa-chevron-down"
                  class="text-text/60 transform transition-transform"
                  :class="{ 'rotate-180': openGroups.includes(idx) }"
                />
              </div>
            </div>

            <div
              v-show="openGroups.includes(idx)"
              class="bg-secondary/10 p-4 border-t border-secondary/20 inset-shadow"
            >
              <!-- NEW: Detail Picking List at Group Level -->
              <div
                v-if="group.pickingList"
                class="mb-5 border border-primary/20 rounded-lg bg-background overflow-hidden shadow-sm"
              >
                <div class="p-3 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p>
                      <span class="text-text/60 inline-block w-24">Customer:</span>
                      <strong class="text-text">{{ group.pickingList.customerName || '-' }}</strong>
                    </p>
                    <p>
                      <span class="text-text/60 inline-block w-24">Shop:</span>
                      <span class="text-text">{{ group.pickingList.shopName || '-' }}</span>
                    </p>
                  </div>
                  <div>
                    <p>
                      <span class="text-text/60 inline-block w-24">Order Date:</span>
                      <span class="text-text">{{ formatDate(group.pickingList.orderDate) }}</span>
                    </p>
                  </div>
                </div>

                <!-- Items -->
                <div class="bg-secondary/5 border-t border-secondary/20 p-3">
                  <h5 class="text-xs font-semibold text-text/70 uppercase mb-2">Item dalam Pesanan</h5>
                  <table class="min-w-full divide-y divide-secondary/20 text-xs">
                    <thead>
                      <tr class="text-left text-text/60">
                        <th class="pb-1">SKU Asli</th>
                        <th class="pb-1">Produk (WMS)</th>
                        <th class="pb-1 text-right">Qty</th>
                        <th class="pb-1 pl-3">Status</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary/10">
                      <tr
                        v-for="item in group.pickingList.items"
                        :key="item.itemId"
                        class="hover:bg-secondary/10 text-text"
                      >
                        <td class="py-1">{{ item.originalSku }}</td>
                        <td class="py-1">{{ item.productName || '-' }}</td>
                        <td class="py-1 text-right">{{ item.quantity }}</td>
                        <td class="py-1 pl-3">
                          <span
                            class="px-1.5 py-0.5 rounded text-[10px]"
                            :class="
                              item.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                            "
                          >
                            {{ item.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <h4 class="font-semibold text-text text-sm mb-3 border-b border-secondary/20 pb-2">
                Riwayat Mutasi Stok (Duplikat)
              </h4>
              <table class="min-w-full divide-y divide-secondary/20 text-sm">
                <thead>
                  <tr class="text-left text-xs font-medium text-text/60 uppercase tracking-wider">
                    <th class="px-4 py-2">Waktu Eksekusi</th>
                    <th class="px-4 py-2">Lokasi</th>
                    <th class="px-4 py-2">Qty</th>
                    <th class="px-4 py-2">User</th>
                    <th class="px-4 py-2 text-right">ID Trx</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-secondary/10 bg-background rounded-lg">
                  <template v-for="skuGroup in groupTransactionsBySku(group.transactions)" :key="skuGroup.sku">
                    <!-- SKU Group Header -->
                    <tr class="bg-secondary/5 border-t border-secondary/20">
                      <td colspan="5" class="px-4 py-2">
                        <div class="flex items-center justify-between">
                          <div>
                            <font-awesome-icon icon="fa-solid fa-layer-group" class="mr-2 text-text/40" />
                            <span class="font-semibold text-text">{{ skuGroup.sku }}</span>
                            <span class="text-xs text-text/60 ml-2">{{ skuGroup.productName }}</span>
                          </div>
                          <!-- Root Cause Flag -->
                          <div
                            v-if="skuGroup.issueFlag === 'WORKER_DOUBLE'"
                            class="px-2 py-0.5 text-[10px] font-bold rounded bg-danger/10 text-danger border border-danger/20 flex items-center"
                            title="Akar Masalah: Worker tereksekusi dua kali pada Item ID yang sama"
                          >
                            <font-awesome-icon icon="fa-solid fa-triangle-exclamation" class="mr-1.5" />
                            WORKER DOUBLE EXECUTION
                          </div>
                          <div
                            v-else-if="skuGroup.issueFlag === 'CART_BUG'"
                            class="px-2 py-0.5 text-[10px] font-bold rounded bg-warning/10 text-warning border border-warning/20 flex items-center"
                            title="Akar Masalah: Terdapat lebih dari 1 Item ID untuk produk yang sama (Sistem Keranjang/Webhook error)"
                          >
                            <font-awesome-icon icon="fa-solid fa-cart-arrow-down" class="mr-1.5" />
                            CART / WEBHOOK BUG
                          </div>
                        </div>
                      </td>
                    </tr>
                    <!-- Transaction Rows -->
                    <template v-for="trx in skuGroup.records" :key="trx.id">
                      <tr
                        @click="toggleTrx(trx.id)"
                        class="hover:bg-secondary/20 text-text cursor-pointer transition-colors"
                      >
                        <td class="px-4 py-2 whitespace-nowrap pl-8">
                          <font-awesome-icon
                            icon="fa-solid fa-chevron-right"
                            class="mr-2 text-text/40 transition-transform inline-block"
                            :class="{ 'rotate-90': openTrx.includes(trx.id) }"
                          />
                          {{ formatDate(trx.createdAt) }}
                        </td>
                        <td class="px-4 py-2">
                          <div class="flex items-center text-text/80">
                            <span class="truncate w-16" title="Dari Lokasi">{{ trx.fromLocationCode || '-' }}</span>
                            <font-awesome-icon
                              icon="fa-solid fa-arrow-right"
                              class="w-3 h-3 mx-1 text-text/40 flex-shrink-0"
                            />
                            <span class="truncate w-16" title="Ke Lokasi">{{ trx.toLocationCode || '-' }}</span>
                          </div>
                        </td>
                        <td
                          class="px-4 py-2 whitespace-nowrap font-medium"
                          :class="trx.quantity < 0 ? 'text-accent' : 'text-success'"
                        >
                          {{ trx.quantity }}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap">
                          {{ trx.username || `ID: ${trx.userId}` }}
                        </td>
                        <td class="px-4 py-2 whitespace-nowrap font-mono text-text/40 text-right text-xs">
                          #{{ trx.id }}
                        </td>
                      </tr>

                      <!-- Collapsible Trx Details (Item ID & Notes) -->
                      <tr v-if="openTrx.includes(trx.id)">
                        <td colspan="5" class="p-0 border-t border-secondary/10 bg-secondary/5 inset-shadow">
                          <div class="px-8 py-3 text-sm flex items-start justify-between border-l-2 border-primary/30">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                              <div>
                                <span class="text-xs text-text/50 block mb-1">Picking List Item ID</span>
                                <span
                                  class="font-mono text-primary font-medium bg-primary/10 border border-primary/20 px-2 py-0.5 rounded"
                                >
                                  <font-awesome-icon icon="fa-solid fa-tag" class="mr-1 text-xs" />
                                  {{
                                    extractItemId(trx.notes) !== '-'
                                      ? '#' + extractItemId(trx.notes)
                                      : 'Tidak Terdeteksi'
                                  }}
                                </span>
                              </div>
                              <div>
                                <span class="text-xs text-text/50 block mb-1">Catatan Sistem Asli</span>
                                <span
                                  class="text-text/80 italic text-xs block break-words border-l-2 border-secondary/30 pl-2"
                                >
                                  {{ trx.notes || '-' }}
                                </span>
                              </div>
                            </div>

                            <!-- Revert Action -->
                            <div class="ml-4 flex-shrink-0 self-center">
                              <button
                                @click="confirmRevert(trx)"
                                :disabled="trx.notes && trx.notes.includes('Reversal')"
                                :class="[
                                  'px-3 py-1.5 rounded border text-xs font-semibold transition-colors flex items-center',
                                  trx.notes && trx.notes.includes('Reversal')
                                    ? 'bg-secondary/20 text-text/40 border-secondary/20 cursor-not-allowed'
                                    : 'bg-accent/10 text-accent hover:bg-accent hover:text-white border-accent/30'
                                ]"
                              >
                                <font-awesome-icon icon="fa-solid fa-rotate-left" class="mr-1.5" />
                                {{
                                  trx.notes && trx.notes.includes('Reversal') ? 'Sudah Di-revert' : 'Revert Transaksi'
                                }}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </template>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <BasePagination
            v-if="meta.totalPages > 1"
            :pagination="{ page: meta.page, limit: meta.limit, total: meta.totalGroups, totalPages: meta.totalPages }"
            @changePage="changePage"
            @update:limit="
              newLimit => {
                meta.limit = newLimit
                fetchData(true)
              }
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api/axios' // Asumsi letak axios setup
import { useToast } from '@/composables/useToast.js'
import BasePagination from '@/components/ui/BasePagination.vue'

const { toast } = useToast()
const loading = ref(false)
const results = ref([])
const openGroups = ref([])
const openTrx = ref([])

const meta = ref({
  totalGroups: 0,
  page: 1,
  limit: 10,
  totalPages: 1
})

const filters = ref({
  startDate: '',
  endDate: '',
  movementType: 'SALE',
  includeNotes: 'Sale Ref.*Item #',
  excludeNotes: '',
  location: '',
  productName: '',
  username: '',
  plSource: '',
  plStatus: '',
  plMarketplaceStatus: '',
  plCustomer: '',
  exactQuantity: false
})

// Helper for formatting date
const formatDate = dateStr => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Helper to extract Picking List Item ID from notes
const extractItemId = notes => {
  if (!notes) return '-'
  const match = notes.match(/Item\s*#(\d+)/i)
  return match ? match[1] : '-'
}

// Helper to group transactions by SKU for the inner table
const groupTransactionsBySku = transactions => {
  if (!transactions) return []
  const grouped = {}
  transactions.forEach(trx => {
    const key = trx.productId || trx.sku || 'Unknown'
    if (!grouped[key]) {
      grouped[key] = {
        sku: trx.sku || 'No SKU',
        productName: trx.productName || 'Unknown Product',
        records: []
      }
    }
    grouped[key].records.push(trx)
  })

  // Calculate issue flags
  Object.values(grouped).forEach(group => {
    const itemIds = new Set()
    let hasValidItemIds = false
    group.records.forEach(trx => {
      const id = extractItemId(trx.notes)
      if (id !== '-') {
        itemIds.add(id)
        hasValidItemIds = true
      }
    })

    if (hasValidItemIds) {
      if (itemIds.size === 1) {
        group.issueFlag = 'WORKER_DOUBLE'
      } else {
        group.issueFlag = 'CART_BUG'
      }
    } else {
      group.issueFlag = 'UNKNOWN'
    }
  })

  return Object.values(grouped)
}

const resetFilters = () => {
  const d = new Date()
  filters.value.startDate = new Date(d.setDate(d.getDate() - 30)).toISOString().split('T')[0]
  filters.value.endDate = new Date().toISOString().split('T')[0]
  filters.value.movementType = 'SALE'
  filters.value.includeNotes = 'Sale Ref.*Item #'
  filters.value.excludeNotes = ''
  filters.value.location = ''
  filters.value.productName = ''
  filters.value.username = ''
  filters.value.plSource = ''
  filters.value.plStatus = ''
  filters.value.plMarketplaceStatus = ''
  filters.value.plCustomer = ''
  filters.value.exactQuantity = false
  results.value = []
  openGroups.value = []
  openTrx.value = []
}

const toggleGroup = idx => {
  const pos = openGroups.value.indexOf(idx)
  if (pos > -1) {
    openGroups.value.splice(pos, 1)
  } else {
    openGroups.value.push(idx)
  }
}

const toggleTrx = id => {
  const pos = openTrx.value.indexOf(id)
  if (pos > -1) {
    openTrx.value.splice(pos, 1)
  } else {
    openTrx.value.push(id)
  }
}

const changePage = newPage => {
  if (newPage > 0 && newPage <= meta.value.totalPages) {
    meta.value.page = newPage
    fetchData(false) // pass false so we don't reset page
  }
}

const fetchData = async (resetPage = true) => {
  if (resetPage) {
    meta.value.page = 1
  }
  loading.value = true
  openGroups.value = []
  openTrx.value = []
  try {
    const params = {
      ...filters.value,
      page: meta.value.page,
      limit: meta.value.limit
    }
    // Only send non-empty filters
    Object.keys(params).forEach(k => {
      if (params[k] === '' || params[k] === null) delete params[k]
    })

    const response = await api.get('/investigation/duplicates', { params })
    if (response.data.success) {
      results.value = response.data.data
      if (response.data.meta) {
        meta.value = response.data.meta
      }
    } else {
      toast(response.data.message || 'Gagal mengambil data.', 'error')
    }
  } catch (error) {
    console.error('Fetch error:', error)
    toast(error.response?.data?.message || 'Terjadi kesalahan pada server.', 'error')
  } finally {
    loading.value = false
  }
}

const confirmRevert = async trx => {
  if (trx.notes && trx.notes.includes('Reversal')) return

  const isConfirmed = window.confirm(
    `Apakah Anda yakin ingin membalikkan transaksi stok ganda ini?\n\nID Trx: #${trx.id}\nSKU: ${trx.sku}\nQty: ${trx.quantity}\n\nSistem akan membuat transaksi baru untuk menyeimbangkan stok.`
  )

  if (isConfirmed) {
    try {
      loading.value = true
      const response = await api.post(`/investigation/revert/${trx.id}`)
      if (response.data.success) {
        toast('Transaksi berhasil di-revert', 'success')
        fetchData() // Refresh data
      } else {
        toast(response.data.message || 'Gagal revert transaksi', 'error')
      }
    } catch (error) {
      toast(error.response?.data?.message || 'Terjadi kesalahan sistem', 'error')
    } finally {
      loading.value = false
    }
  }
}

const exportToCSV = () => {
  if (results.value.length === 0) {
    toast('Tidak ada data untuk diekspor', 'warning')
    return
  }

  const headers = [
    'Invoice / Group',
    'Source',
    'PL Status',
    'Customer',
    'SKU',
    'Product Name',
    'Waktu Eksekusi',
    'Dari Lokasi',
    'Ke Lokasi',
    'Qty',
    'User',
    'ID Trx',
    'Picking List Item ID',
    'Catatan Asli'
  ]
  const rows = [headers]

  results.value.forEach(group => {
    group.transactions.forEach(trx => {
      rows.push(
        [
          group.baseNote,
          group.pickingList?.source || '-',
          group.pickingList?.status || '-',
          group.pickingList?.customerName || '-',
          trx.sku,
          trx.productName,
          formatDate(trx.createdAt).replace(/,/g, ''),
          trx.fromLocationCode || '-',
          trx.toLocationCode || '-',
          trx.quantity,
          trx.username || `ID: ${trx.userId}`,
          trx.id,
          extractItemId(trx.notes),
          trx.notes
        ].map(field => `"${String(field || '').replace(/"/g, '""')}"`)
      )
    })
  })

  const csvContent = rows.map(e => e.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `investigasi_stok_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  // Set default dates to last 30 days
  resetFilters()
  // We can choose to auto-fetch or wait for user interaction
  // fetchData();
})
</script>

<style scoped>
/* Scoped styles to keep things contained */
.inset-shadow {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.03);
}
</style>
