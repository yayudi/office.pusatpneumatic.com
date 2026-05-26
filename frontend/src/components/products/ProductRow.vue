<!-- frontend/src/components/products/ProductRow.vue -->
<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/formatters.js'
import { resolveProductImageUrl } from '@/composables/useImageUrl'
import ProductThumbnail from '@/components/common/ProductThumbnail.vue'
import { useMobile } from '@/composables/useMobile.js'

const { isMobile } = useMobile()

const props = defineProps({
  product: { type: Object, required: true },
  isSelected: Boolean,
})

defineEmits(['toggle-selection', 'edit', 'restore', 'delete', 'view-image'])

// Helper Image URL
const imageUrl = computed(() => resolveProductImageUrl(props.product))

const formattedPrice = computed(() => {
  return formatCurrency(props.product.price)
})

// Helper Status
const isArchived = computed(() => {
  return props.product.is_active === 0 || props.product.deleted_at
})
</script>

<template>
  <tr class="transition-colors group cursor-pointer"
    :class="[
      isMobile ? 'block mb-4 p-4 bg-background/50 rounded-xl border border-secondary/20 shadow-sm mx-4 mt-4 relative' : 'border-b border-secondary/5 hover:bg-secondary/5 last:border-0',
      { 'bg-primary/5': isSelected, 'opacity-60 grayscale-[50%]': isArchived }
    ]"
    @click="!isArchived && $emit('edit', product)">
    <!-- CHECKBOX (Sticky Left) -->
    <td
      class="bg-background group-hover:bg-gradient-to-r group-hover:from-secondary/5 group-hover:to-secondary/5 transition-colors" :class="isMobile ? 'absolute top-4 right-4 z-10 border-0' : 'px-4 py-4 text-center w-12 sticky left-0 z-20 border-b border-secondary/5'"
      @click.stop>
      <div class="flex items-center justify-center">
        <input type="checkbox"
          class="w-4 h-4 rounded border-secondary/30 text-primary focus:ring-primary bg-background cursor-pointer transition-all"
          :checked="isSelected" @change="$emit('toggle-selection', product.id)" />
      </div>
    </td>

    <!-- NAMA PRODUK (Sticky Left) -->
    <td
      class="bg-background group-hover:bg-gradient-to-r group-hover:from-secondary/5 group-hover:to-secondary/5 transition-colors" :class="isMobile ? 'block pb-4 mb-2 border-b border-secondary/10' : 'px-4 py-4 sticky left-12 z-20 border-b border-secondary/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]'">
      <div class="flex items-center gap-3">
        <!-- Thumbnail -->
        <div @click.stop>
          <ProductThumbnail :image-url="imageUrl" @click="$emit('view-image', product)" />
        </div>

        <div class="flex flex-col">
          <div class="font-bold text-text flex items-center gap-2" :class="isMobile ? 'text-base max-w-[200px]' : 'text-sm'">
            {{ product.name }}
            <span v-if="product.is_package"
              class="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20 font-bold uppercase tracking-wider">
              Paket
            </span>
          </div>
        </div>
      </div>
    </td>

    <!-- SKU -->
    <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-4 py-4 border-b border-secondary/5'">
      <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">SKU</span>
      <span
        class="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20 select-all">
        {{ product.sku }}
      </span>
    </td>

    <!-- BERAT -->
    <td class="font-mono text-text/70" :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10 text-sm' : 'px-4 py-4 text-right text-sm border-b border-secondary/5'">
      <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold font-sans">Berat</span>
      <span>{{ product.weight ? product.weight + ' gr' : '-' }}</span>
    </td>

    <!-- HARGA -->
    <td class="font-medium text-text" :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10 text-sm' : 'px-4 py-4 text-right text-sm border-b border-secondary/5'">
      <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Harga</span>
      <span>{{ formattedPrice }}</span>
    </td>

    <!-- STATUS -->
    <td :class="isMobile ? 'flex justify-between items-center py-2 border-b border-secondary/10' : 'px-4 py-4 text-center border-b border-secondary/5'">
      <span v-if="isMobile" class="text-text/60 text-xs uppercase font-semibold">Status</span>
      <span v-if="isArchived"
        class="px-2 py-1 text-[10px] font-bold rounded-full bg-secondary/20 text-text/50 border border-secondary/30 flex items-center justify-center gap-1 w-fit" :class="isMobile ? '' : 'mx-auto'">
        <font-awesome-icon icon="fa-solid fa-box-archive" />
        DIARSIPKAN
      </span>
      <span v-else
        class="px-2 py-1 text-[10px] font-bold rounded-full bg-success/10 text-success border border-success/20 flex items-center justify-center gap-1 w-fit" :class="isMobile ? '' : 'mx-auto'">
        <font-awesome-icon icon="fa-solid fa-check" />
        AKTIF
      </span>
    </td>

    <!-- AKSI (Sticky Right) -->
    <td
      class="bg-background group-hover:bg-gradient-to-r group-hover:from-secondary/5 group-hover:to-secondary/5 transition-colors" :class="isMobile ? 'flex justify-end items-center pt-4' : 'px-4 py-4 sticky right-0 z-20 border-b border-secondary/5 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]'"
      @click.stop>
      <div
        class="flex items-center justify-center gap-2 transition-all duration-200" :class="isMobile ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'">
        <!-- Edit -->
        <button v-if="!isArchived" @click="$emit('edit', product)"
          class="flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
          :class="isMobile ? 'px-3 py-1.5 bg-primary/10 text-primary font-semibold text-xs gap-2' : 'w-8 h-8 text-text/40 hover:text-primary'"
          title="Edit Data">
          <font-awesome-icon icon="fa-solid fa-pen-to-square" />
          <span v-if="isMobile">Edit</span>
        </button>

        <!-- Restore -->
        <button v-if="isArchived" @click="$emit('restore', product)"
          class="flex items-center justify-center rounded-lg hover:bg-success/10 transition-colors"
          :class="isMobile ? 'px-3 py-1.5 bg-success/10 text-success font-semibold text-xs gap-2' : 'w-8 h-8 text-text/40 hover:text-success'"
          title="Pulihkan Produk">
          <font-awesome-icon icon="fa-solid fa-rotate-left" />
          <span v-if="isMobile">Pulihkan</span>
        </button>

        <!-- Archive/Delete -->
        <button v-if="!isArchived" @click="$emit('delete', product)"
          class="flex items-center justify-center rounded-lg hover:bg-danger/10 transition-colors"
          :class="isMobile ? 'px-3 py-1.5 bg-danger/10 text-danger font-semibold text-xs gap-2' : 'w-8 h-8 text-text/40 hover:text-danger'"
          title="Arsipkan Produk">
          <font-awesome-icon icon="fa-solid fa-box-archive" />
          <span v-if="isMobile">Arsip</span>
        </button>
      </div>
    </td>
  </tr>
</template>
