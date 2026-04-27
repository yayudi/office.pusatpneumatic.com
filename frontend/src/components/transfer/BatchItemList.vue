<script setup>
defineProps({
  items: { type: Array, required: true },
  activeTab: { type: String, required: true },
})

const emit = defineEmits(['remove-item'])

import { useMobile } from '@/composables/useMobile.js'
const { isMobile } = useMobile()

function emitRemove(sku) {
  emit('remove-item', sku)
}
</script>

<template>
  <div class="border-t border-secondary/20 pt-6">
    <h3 class="text-lg font-semibold text-text mb-4">Daftar Item ({{ items.length }})</h3>
    <div
      v-if="items.length === 0"
      class="text-center text-text/60 py-8 border-2 border-dashed border-secondary/20 rounded-lg"
    >
      Belum ada item yang ditambahkan.
    </div>
    <div v-else class="max-h-96 overflow-y-auto">
      <table class="text-sm" :class="isMobile ? 'w-full block' : 'min-w-full'">
        <thead :class="isMobile ? 'hidden' : 'bg-secondary/10'">
          <tr>
            <th class="p-2 text-left">SKU</th>
            <th class="p-2 text-left">Nama Produk</th>
            <th
              class="p-2 text-center"
              v-if="activeTab === 'TRANSFER' || activeTab === 'ADJUSTMENT'"
            >
              Stok Saat Ini
            </th>
            <th class="p-2 text-center">Jumlah</th>
            <th class="p-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody :class="isMobile ? 'block' : 'divide-y divide-secondary/20'">
          <tr v-for="item in items" :key="item.sku" class="transition-colors relative"
            :class="isMobile ? 'block mb-3 p-3 bg-background/50 rounded-xl border border-secondary/20 shadow-sm' : 'hover:bg-primary/5'">
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 font-mono'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">SKU</span>
              <span class="font-mono">{{ item.sku }}</span>
            </td>
            <td :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2'">
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Produk</span>
              <span>{{ item.name }}</span>
            </td>
            <td
              :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 text-center'"
              v-if="activeTab === 'TRANSFER' || activeTab === 'ADJUSTMENT'"
            >
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Stok</span>
              <span>{{ item.current_stock }}</span>
            </td>
            <td
              :class="isMobile ? 'flex justify-between items-center py-1.5 border-b border-secondary/10' : 'p-2 text-center font-bold'"
            >
              <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Jumlah</span>
              <span class="font-bold" :class="{ 'text-success': item.quantity > 0, 'text-accent': item.quantity < 0 }">{{ item.quantity }}</span>
            </td>
            <td :class="isMobile ? 'absolute top-3 right-3' : 'p-2 text-center'">
              <button @click="emitRemove(item.sku)" class="text-accent hover:text-accent/80">
                <font-awesome-icon icon="fa-solid fa-trash" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
