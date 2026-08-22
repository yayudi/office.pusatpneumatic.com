<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useToast } from '@/composables/useToast.js'
import BaseContextMenu from '@/components/ui/BaseContextMenu.vue'
import { useContextMenu } from '@/composables/useContextMenu.js'
import { searchProducts } from '@/api/helpers/products.js'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/vue'

const props = defineProps({
  allLocations: { type: Array, required: true },
  isLoadingLocations: { type: Boolean, default: false }
})

const { toast } = useToast()
const { contextMenu, openContextMenu } = useContextMenu()

// State
const isLoading = ref(false)
const rows = ref([createEmptyRow()])
const searchResults = ref([])
const filteredLocations = ref([])
const activeDropdown = ref({ rowIndex: -1, colIndex: -1, type: null })
const dropdownSelectedIndex = ref(0)
let searchTimeout = null

// Floating UI setup
const referenceEl = ref(null)
const floatingEl = ref(null)
const dropdownWidth = ref('auto')
const { floatingStyles } = useFloating(referenceEl, floatingEl, {
  placement: 'bottom-start',
  middleware: [offset(4), flip(), shift({ padding: 5 })],
  whileElementsMounted: autoUpdate
})

function createEmptyRow() {
  return {
    _id: Date.now() + Math.random(),
    sku: '',
    name: '',
    fromLocationId: '',
    fromLocationCode: '',
    toLocationId: '',
    toLocationCode: '',
    availableStock: null,
    quantity: ''
  }
}

async function fetchStock(rowIndex) {
  const row = rows.value[rowIndex]
  if (!row.sku || !row.fromLocationId) {
    row.availableStock = null
    return
  }
  try {
    const results = await searchProducts(row.sku, row.fromLocationId, 1, 1)
    const productList = Array.isArray(results) ? results : (results?.data || [])
    if (productList.length > 0) {
       row.availableStock = productList[0].current_stock || 0
    }
  } catch (err) {
    console.error('Error fetching stock:', err)
  }
}

// Navigation & Focus
function handleKeyDown(event, rowIndex, colIndex) {
  // ESC to close dropdown
  if (event.key === 'Escape') {
    activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
    return
  }

  // Shift + Delete to delete row
  if (event.key === 'Delete' && event.shiftKey) {
    event.preventDefault()
    deleteRow(rowIndex)
    return
  }

  // Ctrl + D to duplicate row
  if ((event.key === 'd' || event.key === 'D') && event.ctrlKey) {
    event.preventDefault()
    duplicateRow(rowIndex)
    return
  }

  // If dropdown is open, intercept Arrow Up/Down and Enter
  if (activeDropdown.value.rowIndex !== -1) {
    const list = activeDropdown.value.type === 'product' ? searchResults.value : filteredLocations.value
    if (list.length > 0) {
      if (event.key === 'ArrowDown') {
        dropdownSelectedIndex.value = Math.min(list.length - 1, dropdownSelectedIndex.value + 1)
        event.preventDefault()
        scrollDropdownItem()
        return
      }
      if (event.key === 'ArrowUp') {
        dropdownSelectedIndex.value = Math.max(0, dropdownSelectedIndex.value - 1)
        event.preventDefault()
        scrollDropdownItem()
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (activeDropdown.value.type === 'product') {
          selectProduct(list[dropdownSelectedIndex.value], activeDropdown.value.rowIndex)
        } else {
          selectLocation(list[dropdownSelectedIndex.value], activeDropdown.value.rowIndex, activeDropdown.value.type)
        }
        return
      }
    }
  }

  const maxRow = rows.value.length - 1
  const maxCol = 5

  let nextRow = rowIndex
  let nextCol = colIndex

  if (event.key === 'ArrowUp') nextRow = Math.max(0, rowIndex - 1)
  else if (event.key === 'ArrowDown') nextRow = Math.min(maxRow, rowIndex + 1)
  else if (event.key === 'ArrowLeft' && event.ctrlKey) {
    nextCol = Math.max(0, colIndex - 1)
    if (nextCol === 4) nextCol = 3 // skip Stok column
  }
  else if (event.key === 'ArrowRight' && event.ctrlKey) {
    nextCol = Math.min(maxCol, colIndex + 1)
    if (nextCol === 4) nextCol = 5 // skip Stok column
  }
  else if (event.key === 'Enter') {
    event.preventDefault()
    if (rowIndex === maxRow) {
      rows.value.push(createEmptyRow())
      nextTick(() => {
        focusCell(rowIndex + 1, colIndex)
      })
      return
    } else {
      nextRow = Math.min(maxRow, rowIndex + 1)
    }
  } else return

  if (nextRow !== rowIndex || nextCol !== colIndex) {
    event.preventDefault()
    focusCell(nextRow, nextCol)
  }
}

function focusCell(row, col) {
  const el = document.getElementById(`spreadsheet-cell-${row}-${col}`)
  if (el) {
    el.focus()
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT') el.select?.()
  }
}

function scrollDropdownItem() {
  nextTick(() => {
    const el = document.getElementById(`dropdown-item-${dropdownSelectedIndex.value}`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  })
}

// Autocomplete Logic
async function handleSkuInput(rowIndex) {
  const row = rows.value[rowIndex]
  console.log('handleSkuInput called for rowIndex:', rowIndex, 'sku:', row.sku)
  if (!row.sku) return

  try {
    const results = await searchProducts(row.sku, row.fromLocationId || null, 1, 1)
    console.log('Search products result for SKU:', results)
    
    const productList = Array.isArray(results) ? results : (results?.data || [])
    
    if (productList.length > 0) {
      const product = productList[0]
      if (product.sku.toLowerCase() === row.sku.toLowerCase()) {
         row.name = product.name
         if (row.fromLocationId) row.availableStock = product.current_stock || 0
         console.log('SKU exactly matched:', product.name)
      }
    }
  } catch (error) {
    console.error('Error fetching SKU:', error)
  }

  // Auto-add new row if it's the last row
  if (rowIndex === rows.value.length - 1 && row.sku) {
    rows.value.push(createEmptyRow())
  }
}

function handleNameInput(event, rowIndex) {
  const query = event.target.value
  console.log('handleNameInput called, query:', query)
  rows.value[rowIndex].name = query
  
  referenceEl.value = event.target
  dropdownWidth.value = `${event.target.getBoundingClientRect().width}px`
  
  clearTimeout(searchTimeout)
  if (query.length < 2) {
    activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
    return
  }
  
  searchTimeout = setTimeout(async () => {
    try {
      console.log('Executing API call for Name search:', query)
      const results = await searchProducts(query, rows.value[rowIndex].fromLocationId || null, 1, 10)
      console.log('Name search results:', results)
      // Check if results is nested
      searchResults.value = Array.isArray(results) ? results : (results?.data || [])
      dropdownSelectedIndex.value = 0
      activeDropdown.value = { rowIndex, colIndex: 1, type: 'product' }
    } catch (error) {
      console.error('Error fetching products by name:', error)
    }
  }, 300)
}

function selectProduct(product, rowIndex) {
  rows.value[rowIndex].sku = product.sku
  rows.value[rowIndex].name = product.name
  activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
  
  if (rowIndex === rows.value.length - 1) {
    rows.value.push(createEmptyRow())
  }
  
  fetchStock(rowIndex)
  nextTick(() => focusCell(rowIndex, 2))
}

function handleLocationInput(event, rowIndex, type) {
  const query = event.target.value
  referenceEl.value = event.target
  dropdownWidth.value = `${event.target.getBoundingClientRect().width}px`
  
  if (type === 'from') rows.value[rowIndex].fromLocationCode = query
  else rows.value[rowIndex].toLocationCode = query
  
  if (!query) filteredLocations.value = props.allLocations
  else filteredLocations.value = props.allLocations.filter(l => l.code.toLowerCase().includes(query.toLowerCase()) || l.name?.toLowerCase().includes(query.toLowerCase()))
  
  dropdownSelectedIndex.value = 0
  activeDropdown.value = { rowIndex, colIndex: type === 'from' ? 2 : 3, type }
}

function handleLocationFocus(event, rowIndex, type) {
  referenceEl.value = event.target
  dropdownWidth.value = `${event.target.getBoundingClientRect().width}px`
  const query = type === 'from' ? rows.value[rowIndex].fromLocationCode : rows.value[rowIndex].toLocationCode
  
  if (!query) filteredLocations.value = props.allLocations
  else filteredLocations.value = props.allLocations.filter(l => l.code.toLowerCase().includes(query.toLowerCase()) || l.name?.toLowerCase().includes(query.toLowerCase()))
  
  dropdownSelectedIndex.value = 0
  activeDropdown.value = { rowIndex, colIndex: type === 'from' ? 2 : 3, type }
}

function selectLocation(loc, rowIndex, type) {
  const row = rows.value[rowIndex]
  if (type === 'from') {
    if (loc.id === row.toLocationId) {
      toast('Lokasi asal tidak boleh sama dengan lokasi tujuan.', 'warning')
      activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
      return
    }
    row.fromLocationId = loc.id
    row.fromLocationCode = loc.code
    fetchStock(rowIndex)
  } else {
    if (loc.id === row.fromLocationId) {
      toast('Lokasi tujuan tidak boleh sama dengan lokasi asal.', 'warning')
      activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
      return
    }
    row.toLocationId = loc.id
    row.toLocationCode = loc.code
  }
  activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
  nextTick(() => focusCell(rowIndex, type === 'from' ? 3 : 5))
}

// Row Actions
function deleteRow(index) {
  rows.value.splice(index, 1)
  if (rows.value.length === 0) rows.value.push(createEmptyRow())
}

function duplicateRow(index) {
  const item = rows.value[index]
  rows.value.splice(index + 1, 0, { ...item, _id: Date.now() + Math.random() })
}

// Context Menu Actions
function handleContextAction(action) {
  const index = contextMenu.value.row
  if (action === 'delete') {
    deleteRow(index)
  }
  if (action === 'duplicate') {
    duplicateRow(index)
  }
  contextMenu.value.visible = false
}

// Submit
const emit = defineEmits(['submit'])
function emitSubmit() {
  // Ambil baris yang setidaknya salah satu selnya diisi (mengabaikan baris kosong murni)
  const activeRows = rows.value.filter(r => r.sku || r.fromLocationCode || r.toLocationCode || r.quantity)
  
  if (activeRows.length === 0) {
    toast('Tidak ada data baris yang diisi untuk disimpan.', 'warning')
    return
  }
  
  const validRows = []
  const stockUsage = {}
  
  for (const [index, r] of activeRows.entries()) {
    // Validasi SKU
    if (!r.sku || !r.name) {
      toast(`Baris ${index + 1}: SKU tidak valid atau nama produk kosong.`, 'error')
      return
    }
    
    // Validasi Lokasi Asal
    if (!r.fromLocationId) {
      toast(`Baris ${index + 1}: Lokasi asal belum dipilih dari daftar untuk SKU ${r.sku}.`, 'error')
      return
    }
    
    // Validasi Lokasi Tujuan
    if (!r.toLocationId) {
      toast(`Baris ${index + 1}: Lokasi tujuan belum dipilih dari daftar untuk SKU ${r.sku}.`, 'error')
      return
    }
    
    // Validasi Lokasi Sama
    if (r.fromLocationId === r.toLocationId) {
      toast(`Baris ${index + 1}: Lokasi asal dan tujuan tidak boleh sama.`, 'error')
      return
    }
    
    // Validasi Qty
    if (!r.quantity || r.quantity <= 0) {
      toast(`Baris ${index + 1}: Jumlah transfer tidak valid.`, 'error')
      return
    }
    
    // Validasi Akumulasi Stok
    if (r.availableStock !== null) {
      const key = `${r.sku.toUpperCase()}-${r.fromLocationId}`
      stockUsage[key] = (stockUsage[key] || 0) + r.quantity
      if (stockUsage[key] > r.availableStock) {
        toast(`Total transfer SKU ${r.sku} melebihi stok yang tersedia (${r.availableStock}).`, 'error')
        return
      }
    }
    
    validRows.push(r)
  }
  
  // Format payload
  const formattedRows = validRows.map(r => ({
    ...r,
    sku: r.sku.toUpperCase()
  }))
  
  emit('submit', formattedRows)
}

function handleClickOutside(e) {
  if (!e.target.closest('.relative')) {
    activeDropdown.value = { rowIndex: -1, colIndex: -1, type: null }
  }
}

function handleGlobalKeyDown(e) {
  if (e.altKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault()
    emitSubmit()
  }
  if (e.altKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault()
    rows.value.push(createEmptyRow())
    nextTick(() => focusCell(rows.value.length - 1, 1))
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleGlobalKeyDown)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleGlobalKeyDown)
})

// Expose reset method for parent
function resetRows() {
  rows.value = [createEmptyRow()]
}
defineExpose({ resetRows })

</script>

<template>
  <div class="animate-fade-in space-y-4 text-text">
    <div class="bg-secondary/5 border border-secondary/20 rounded-xl p-1 overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead class="bg-secondary/10 text-text/80 sticky top-0 z-10">
          <tr>
            <th class="border border-secondary/20 p-2 text-left w-[15%]">SKU</th>
            <th class="border border-secondary/20 p-2 text-left w-[30%]">Nama Produk</th>
            <th class="border border-secondary/20 p-2 text-left w-[18%]">Dari Lokasi</th>
            <th class="border border-secondary/20 p-2 text-left w-[17%]">Ke Lokasi</th>
            <th class="border border-secondary/20 p-2 text-center w-[10%]">Stok</th>
            <th class="border border-secondary/20 p-2 text-center w-[10%]">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(row, index) in rows" 
            :key="row._id"
            class="hover:bg-primary/5 transition-colors group"
            @contextmenu.prevent.stop="openContextMenu($event, index)"
          >
            <!-- SKU -->
            <td class="border border-secondary/20 p-0 relative">
              <input 
                :id="`spreadsheet-cell-${index}-0`"
                v-model="row.sku"
                @keydown="handleKeyDown($event, index, 0)"
                @blur="handleSkuInput(index)"
                @keyup.enter="handleSkuInput(index)"
                class="w-full h-full p-2 bg-transparent outline-none focus:ring-2 focus:ring-primary focus:bg-background z-10 font-mono uppercase text-xs"
                placeholder="SKU..."
              />
            </td>
            
            <!-- Nama -->
            <td class="border border-secondary/20 p-0 relative">
              <input 
                :id="`spreadsheet-cell-${index}-1`"
                :value="row.name"
                @input="handleNameInput($event, index)"
                @keydown="handleKeyDown($event, index, 1)"
                class="w-full h-full p-2 bg-transparent outline-none focus:ring-2 focus:ring-primary focus:bg-background z-10 text-sm"
                placeholder="Nama Produk..."
              />
            </td>
            
            <!-- From Location -->
            <td class="border border-secondary/20 p-0 relative">
              <input 
                :id="`spreadsheet-cell-${index}-2`"
                :value="row.fromLocationCode"
                @input="handleLocationInput($event, index, 'from')"
                @focus="handleLocationFocus($event, index, 'from')"
                @keydown="handleKeyDown($event, index, 2)"
                class="w-full h-full p-2 bg-transparent outline-none focus:ring-2 focus:ring-primary focus:bg-background z-10 text-sm"
                placeholder="Pilih Asal..."
              />
            </td>
            
            <!-- To Location -->
            <td class="border border-secondary/20 p-0 relative">
              <input 
                :id="`spreadsheet-cell-${index}-3`"
                :value="row.toLocationCode"
                @input="handleLocationInput($event, index, 'to')"
                @focus="handleLocationFocus($event, index, 'to')"
                @keydown="handleKeyDown($event, index, 3)"
                class="w-full h-full p-2 bg-transparent outline-none focus:ring-2 focus:ring-primary focus:bg-background z-10 text-sm"
                placeholder="Pilih Tujuan..."
              />
            </td>
            
            <!-- Stok -->
            <td class="border border-secondary/20 p-0 relative bg-secondary/5">
              <div class="w-full h-full p-2 text-center font-bold text-text/70 flex items-center justify-center">
                {{ row.availableStock !== null ? row.availableStock : '-' }}
              </div>
            </td>
            
            <!-- Qty -->
            <td class="border border-secondary/20 p-0 relative">
              <input 
                :id="`spreadsheet-cell-${index}-5`"
                v-model.number="row.quantity"
                @keydown="handleKeyDown($event, index, 5)"
                type="number"
                min="1"
                :class="[
                  'w-full h-full p-2 bg-transparent outline-none focus:ring-2 focus:ring-primary focus:bg-background z-10 text-center font-bold transition-colors',
                  row.availableStock !== null && row.quantity > row.availableStock ? 'text-error bg-error/10' : ''
                ]"
              />
            </td>
          </tr>
        </tbody>
      </table>
      
      <div class="p-3 bg-secondary/5 text-center text-xs text-text/50 font-medium">
        Ketik SKU atau Nama dan tekan <b>Enter</b> untuk berpindah ke baris baru. Klik kanan untuk <b>Hapus</b> / <b>Duplikasi</b> baris.
      </div>
    </div>
    
    <div class="flex justify-end pt-4 border-t border-secondary/20">
      <button
        @click="emitSubmit"
        :disabled="isLoading"
        class="px-6 py-3 bg-primary text-secondary rounded-xl font-bold disabled:opacity-50 flex items-center gap-2 hover:bg-primary/90 shadow-lg transition-all active:scale-[0.98]"
      >
        <font-awesome-icon v-if="isLoading" icon="fa-solid fa-spinner" class="animate-spin" />
        <font-awesome-icon v-else icon="fa-solid fa-paper-plane" />
        <span>Submit Spreadsheet</span>
      </button>
    </div>
    
    <BaseContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :visible="contextMenu.visible"
      :options="[
        { label: 'Duplikasi Baris', action: 'duplicate', icon: 'fa-solid fa-copy' },
        { divider: true },
        { label: 'Hapus Baris', action: 'delete', icon: 'fa-solid fa-trash', danger: true }
      ]"
      @close="contextMenu.visible = false"
      @action="handleContextAction"
    />
    
    <!-- Floating UI Autocomplete Dropdown -->
    <Teleport to="body">
      <div 
        v-if="activeDropdown.rowIndex !== -1" 
        ref="floatingEl"
        :style="{ ...floatingStyles, width: dropdownWidth }"
        class="bg-background text-text border border-secondary/20 shadow-xl rounded-lg z-[100] max-h-48 overflow-y-auto custom-scrollbar"
      >
        <template v-if="activeDropdown.type === 'product'">
          <div v-if="searchResults.length === 0" class="p-2 text-xs text-text/50 text-center italic">Tidak ditemukan...</div>
          <button
            v-for="(prod, index) in searchResults"
            :key="prod.id"
            :id="`dropdown-item-${index}`"
            @click="selectProduct(prod, activeDropdown.rowIndex)"
            :class="[
              'w-full text-left p-2 transition-colors border-b border-secondary/10 last:border-b-0',
              index === dropdownSelectedIndex ? 'bg-primary/20' : 'hover:bg-primary/10'
            ]"
          >
            <div class="text-xs font-mono text-primary font-bold">{{ prod.sku }}</div>
            <div class="text-sm truncate text-text/90">{{ prod.name }}</div>
          </button>
        </template>
        
        <template v-if="activeDropdown.type === 'from' || activeDropdown.type === 'to'">
          <div v-if="filteredLocations.length === 0" class="p-2 text-xs text-text/50 text-center italic">Tidak ditemukan...</div>
          <button
            v-for="(loc, index) in filteredLocations"
            :key="loc.id"
            :id="`dropdown-item-${index}`"
            @click="selectLocation(loc, activeDropdown.rowIndex, activeDropdown.type)"
            :class="[
              'w-full text-left p-2 transition-colors border-b border-secondary/10 last:border-b-0',
              index === dropdownSelectedIndex ? 'bg-primary/20' : 'hover:bg-primary/10'
            ]"
          >
            <div class="text-sm font-bold text-primary">{{ loc.code }}</div>
            <div class="text-xs truncate text-text/60" v-if="loc.name">{{ loc.name }}</div>
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>
