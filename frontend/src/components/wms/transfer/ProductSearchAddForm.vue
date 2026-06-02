<!-- frontend/src/components/wms/transfer/ProductSearchAddForm.vue -->
<script setup>
import { ref } from 'vue'
import { useToast } from '@/composables/useToast.js'
import ProductSearchSelector from '@/components/wms/transfer/ProductSearchSelector.vue'

defineProps({
  activeTab: { type: String, required: true },
  searchLocationId: { type: [Number, String], default: null },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['add-product'])
const { toast } = useToast()

const selectedProduct = ref(null)
const quantityToAdd = ref(1)

function onAddClick() {
  if (!selectedProduct.value) {
    toast('Harap pilih produk.', 'warning')
    return
  }

  emit('add-product', {
    product: selectedProduct.value,
    quantity: quantityToAdd.value
  })

  // Reset form lokal
  selectedProduct.value = null
  quantityToAdd.value = 1
}
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center gap-2 w-full">
    <!-- Selector Pencarian -->
    <div class="flex-grow w-full">
      <ProductSearchSelector
        v-model="selectedProduct"
        :location-id="searchLocationId"
        :disabled="disabled"
        placeholder="Cari SKU atau Nama Produk..."
      />
    </div>

    <!-- Container untuk Qty, Stok & Tombol -->
    <div class="flex items-center gap-2 w-full sm:w-auto">
      <!-- Info Stok Aktual -->
      <div
        v-if="(activeTab === 'TRANSFER' || activeTab === 'ADJUSTMENT') && selectedProduct"
        class="h-[42px] flex flex-col justify-center items-center px-3 bg-secondary/20 border border-secondary/20 shadow-sm rounded-lg min-w-[70px]"
      >
        <span class="text-[10px] text-text/70 uppercase font-bold leading-none mb-1">Stok</span>
        <span
          class="font-bold text-sm leading-none"
          :class="{
            'text-accent': selectedProduct.current_stock < 0,
            'text-text': selectedProduct.current_stock >= 0
          }"
        >
          {{ selectedProduct.current_stock }}
        </span>
      </div>

      <!-- Input Jumlah -->
      <div class="w-24 relative">
        <input
          v-model.number="quantityToAdd"
          type="number"
          :placeholder="activeTab === 'ADJUSTMENT' ? '-5 / 5' : 'Qty'"
          class="w-full h-[42px] px-3 bg-background border border-secondary/30 rounded-lg text-sm text-text focus:outline-none focus:border-primary transition-all shadow-sm font-medium"
          :disabled="disabled || !selectedProduct"
          @keyup.enter="onAddClick"
        />
      </div>

      <!-- Tombol Tambah -->
      <button
        @click="onAddClick"
        class="h-[42px] px-4 bg-primary text-secondary rounded-lg font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:bg-primary/90 active:scale-[0.98]"
        :disabled="disabled || !selectedProduct"
      >
        <font-awesome-icon icon="fa-solid fa-plus" />
        <span class="hidden sm:inline">Tambah</span>
      </button>
    </div>
  </div>
</template>
