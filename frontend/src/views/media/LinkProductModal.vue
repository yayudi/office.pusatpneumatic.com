<script setup>
import { ref, watch } from 'vue';
import apiClient from '@/api/axios';

const props = defineProps({
  show: Boolean,
  selectedMediaIds: Array
});

const emit = defineEmits(['close', 'linked']);

const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);
const isSubmitting = ref(false);
let searchTimeout = null;

watch(searchQuery, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  if (!newVal || newVal.length < 2) {
    searchResults.value = [];
    return;
  }
  
  isSearching.value = true;
  searchTimeout = setTimeout(async () => {
    try {
      const res = await apiClient.get(`/products/search?q=${encodeURIComponent(newVal)}`);
      searchResults.value = res.data; // assuming array of products
    } catch (error) {
      console.error('Search error', error);
    } finally {
      isSearching.value = false;
    }
  }, 400);
});

watch(() => props.show, (newVal) => {
  if (!newVal) {
    searchQuery.value = '';
    searchResults.value = [];
  }
});

const selectProduct = async (productId) => {
  if (isSubmitting.value) return;
  
  if (!confirm(`Tautkan ${props.selectedMediaIds?.length || 0} gambar ke produk ini?`)) return;
  
  isSubmitting.value = true;
  try {
    const res = await apiClient.post(`/products/${productId}/images`, {
      mediaIds: props.selectedMediaIds
    });
    if (res.data.success) {
      emit('linked');
      close();
    }
  } catch (error) {
    const msg = error.response?.data?.message || 'Gagal menautkan gambar.';
    alert(msg);
  } finally {
    isSubmitting.value = false;
  }
};

const close = () => {
  if (isSubmitting.value) return;
  emit('close');
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="bg-background w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-secondary/20">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-secondary/20 bg-secondary/10">
        <div>
          <h3 class="text-lg font-bold text-text">Tautkan ke Produk</h3>
          <p class="text-xs text-text/60 mt-1">Pilih produk tujuan untuk {{ selectedMediaIds?.length || 0 }} gambar.</p>
        </div>
        <button @click="close" class="text-text/50 hover:text-danger hover:bg-danger/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 flex-1 overflow-y-auto min-h-[300px]">
        <label class="block text-sm font-semibold text-text/80 mb-2">Cari Produk (SKU / Nama)</label>
        <div class="relative">
          <input type="text" v-model="searchQuery" placeholder="Ketik minimal 2 huruf..."
            class="input input-bordered w-full bg-background text-text border-secondary focus:border-primary focus:ring-1 focus:ring-primary pl-10" />
          <font-awesome-icon icon="fa-solid fa-search" class="absolute left-4 top-1/2 -translate-y-1/2 text-text/40" />
        </div>

        <div v-if="isSearching" class="text-center py-8">
          <font-awesome-icon icon="fa-solid fa-circle-notch" spin class="text-primary text-2xl" />
        </div>

        <div v-else-if="searchQuery.length >= 2 && searchResults.length === 0" class="text-center py-8 text-text/50">
          Tidak ada produk yang cocok.
        </div>

        <div v-else-if="searchResults.length > 0" class="mt-4 flex flex-col gap-2">
          <button v-for="prod in searchResults" :key="prod.id" @click="selectProduct(prod.id)"
            class="flex flex-col items-start p-3 rounded-lg border border-secondary/20 hover:border-primary hover:bg-primary/5 transition-colors text-left"
            :disabled="isSubmitting">
            <div class="flex justify-between w-full">
              <span class="font-bold text-sm text-text">{{ prod.sku }}</span>
              <span v-if="prod.is_active === 0" class="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded font-bold">Arsip</span>
            </div>
            <span class="text-sm text-text/80 mt-1">{{ prod.name }}</span>
          </button>
        </div>
        
        <div v-else class="flex flex-col items-center justify-center py-10 opacity-30">
          <font-awesome-icon icon="fa-solid fa-boxes-stacked" class="text-5xl mb-3" />
          <p class="text-sm">Gunakan kotak di atas untuk menemukan produk</p>
        </div>
      </div>
      
    </div>
  </div>
</template>
