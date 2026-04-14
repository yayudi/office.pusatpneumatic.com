<!-- frontend/src/views/media/MediaManagement.vue -->
<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast.js'
import apiClient from '@/api/axios';
import MediaInfoModal from './MediaInfoModal.vue';
import MediaLightbox from '@/components/common/MediaLightbox.vue';
import LinkProductModal from './LinkProductModal.vue';
import BulkEditTagsModal from './BulkEditTagsModal.vue';

const auth = useAuthStore();
const { toast } = useToast()
const mediaList = ref([]);
const pagination = ref({ page: 1, limit: 18, total: 0, totalPages: 1 });
const isLoading = ref(false);
const uploaderInput = ref(null);
const isUploading = ref(false);
const globalSearchStr = ref('');
const linkStatusFilter = ref('all');
let searchDebounceTimer = null;

// Debounce: auto-fetch 400ms setelah user berhenti mengetik
watch(globalSearchStr, () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => fetchMedia(1), 400);
});

// Instant fetch saat dropdown filter berubah
watch(linkStatusFilter, () => fetchMedia(1));

// Bulk Upload State
const isBulkModalOpen = ref(false);
const selectedFiles = ref([]);
const bulkTagsStr = ref('');

// Bulk Products Autocomplete State
const bulkProductSearchQuery = ref('');
const bulkProductSearchResults = ref([]);
const isBulkProductSearching = ref(false);
const bulkSelectedProducts = ref([]);
let bulkProductSearchTimeout = null;

watch(bulkProductSearchQuery, (newVal) => {
  if (bulkProductSearchTimeout) clearTimeout(bulkProductSearchTimeout);
  if (!newVal || newVal.length < 2) {
    bulkProductSearchResults.value = [];
    return;
  }

  isBulkProductSearching.value = true;
  bulkProductSearchTimeout = setTimeout(async () => {
    try {
      const res = await apiClient.get(`/products/search?q=${encodeURIComponent(newVal)}`);
      bulkProductSearchResults.value = res.data;
    } catch (error) {
      toast('Search error', error);
    } finally {
      isBulkProductSearching.value = false;
    }
  }, 400);
});

const selectBulkProduct = (prod) => {
  if (!bulkSelectedProducts.value.find(p => p.id === prod.id)) {
    bulkSelectedProducts.value.push(prod);
  }
  bulkProductSearchQuery.value = '';
  bulkProductSearchResults.value = [];
};

const removeBulkProduct = (prodId) => {
  bulkSelectedProducts.value = bulkSelectedProducts.value.filter(p => p.id !== prodId);
};

const uploadProgress = ref('');

// Media Info Modal State
const isInfoModalOpen = ref(false);
const infoMediaId = ref(null);

const openInfoModal = (item) => {
  infoMediaId.value = item.id;
  isInfoModalOpen.value = true;
};

let pollInterval = null;

const apiBaseUrl = apiClient.defaults.baseURL || import.meta.env.VITE_API_URL || 'https://api.dpvindonesia.com';
const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');

const isLightboxOpen = ref(false);
const lightboxIndex = ref(0);

// Bulk Actions State
const isSelectionMode = ref(false);
const selectedMediaIds = ref(new Set());
const isLinkProductModalOpen = ref(false);
const isBulkEditTagsModalOpen = ref(false);

const toggleSelectionMode = () => {
  isSelectionMode.value = !isSelectionMode.value;
  if (!isSelectionMode.value) selectedMediaIds.value = new Set();
};

const toggleSelection = (item) => {
  if (item.status !== 'COMPLETED') return;
  const newSet = new Set(selectedMediaIds.value);
  if (newSet.has(item.id)) {
    newSet.delete(item.id);
  } else {
    newSet.add(item.id);
  }
  selectedMediaIds.value = newSet;
};

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    const newSet = new Set();
    mediaList.value.filter(i => i.status === 'COMPLETED').forEach(i => newSet.add(i.id));
    selectedMediaIds.value = newSet;
  } else {
    selectedMediaIds.value = new Set();
  }
};

const confirmBulkDelete = async () => {
  if (selectedMediaIds.value.size === 0) return;
  if (!confirm(`Hapus ${selectedMediaIds.value.size} gambar terpilih secara permanen? Aksi ini tidak dapat dibatalkan.`)) return;

  isLoading.value = true;
  let successCount = 0;
  let usageConflictCount = 0;
  let failCount = 0;

  try {
    // Jalankan penghapusan berurutan agar pool database hosting tidak kebanjiran request
    for (const id of selectedMediaIds.value) {
      const item = mediaList.value.find(i => i.id === id);
      if (item && item.usage_count > 0) {
        usageConflictCount++;
        continue;
      }

      try {
        await apiClient.delete(`/media/${id}`);
        successCount++;
        selectedMediaIds.value.delete(id); // Hapus dari seleksi jika berhasil
      } catch (err) {
        if (err.response?.status === 409) {
          usageConflictCount++;
        } else {
          failCount++;
          console.error("Gagal hapus media ID " + id, err);
        }
      }
    }

    let msg = `Selesai memproses pemusnahan massal.\n✓ Berhasil: ${successCount}`;
    if (usageConflictCount > 0) msg += `\n⚠️ Dilewati: ${usageConflictCount} gambar (Masih ditautkan ke produk)`;
    if (failCount > 0) msg += `\n❌ Gagal sistem: ${failCount} gambar`;
    alert(msg);

  } finally {
    fetchMedia(pagination.value.page, true);
    isLoading.value = false;
    if (selectedMediaIds.value.size === 0) {
      isSelectionMode.value = false;
    }
  }
};

const fetchMedia = async (page = 1, silent = false) => {
  if (!silent) isLoading.value = true;
  try {
    const params = new URLSearchParams({ page, limit: pagination.value.limit });
    if (globalSearchStr.value.trim()) params.append('search', globalSearchStr.value.trim());
    if (linkStatusFilter.value !== 'all') params.append('linkStatus', linkStatusFilter.value);

    const res = await apiClient.get(`/media?${params.toString()}`);
    if (res.data.success) {
      mediaList.value = res.data.data;
      pagination.value = res.data.pagination;
    }
  } catch (error) {
    console.error("Failed to load media:", error);
    alert(error.response?.data?.message || "Gagal memuat galeri media.");
  } finally {
    isLoading.value = false;
  }
};

const triggerUpload = () => {
  if (uploaderInput.value) {
    uploaderInput.value.click();
  }
};

const handleMultipleFiles = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  selectedFiles.value = Array.from(files);
  bulkTagsStr.value = '';
  bulkSelectedProducts.value = [];
  bulkProductSearchQuery.value = '';
  isBulkModalOpen.value = true;
  event.target.value = null; // reset input
};

const executeBulkUpload = async () => {
  if (selectedFiles.value.length === 0) return;

  isUploading.value = true;
  isBulkModalOpen.value = false;

  const chunkSize = 5; // Batas batch API (menghindari 413 Payload Too Large)
  try {
    for (let i = 0; i < selectedFiles.value.length; i += chunkSize) {
      const chunk = selectedFiles.value.slice(i, i + chunkSize);
      uploadProgress.value = `Mengunggah ${i + chunk.length} dari ${selectedFiles.value.length} aset...`;

      const formData = new FormData();
      chunk.forEach(f => formData.append('images', f));

      if (bulkTagsStr.value.trim()) {
        formData.append('tags', bulkTagsStr.value.trim());
      }

      if (bulkSelectedProducts.value.length > 0) {
        const pIds = bulkSelectedProducts.value.map(p => p.id).join(',');
        formData.append('products', pIds);
      }

      await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
  } catch (err) {
    console.error('Upload Error:', err);
    alert(err.response?.data?.message || 'Gagal mengunggah beberapa gambar.');
  } finally {
    isUploading.value = false;
    uploadProgress.value = '';
    selectedFiles.value = [];
    fetchMedia(1);
  }
};

const deleteMedia = async (id, usageCount) => {
  if (usageCount > 0) {
    alert("Media ini sedang digunakan oleh " + usageCount + " produk. Tidak bisa dihapus.");
    return;
  }
  if (!confirm('Yakin ingin menghapus aset media ini?')) return;

  try {
    const res = await apiClient.delete(`/media/${id}`);
    if (res.data.success) {
      fetchMedia(pagination.value.page);
    }
  } catch (error) {
    console.error('Delete Error:', error);
    alert(error.response?.data?.message || 'Gagal menghapus gambar.');
  }
};

const formatTags = (tagsRaw) => {
  if (Array.isArray(tagsRaw)) return tagsRaw;
  if (typeof tagsRaw === 'string') {
    try { return JSON.parse(tagsRaw); } catch (e) { return []; }
  }
  return [];
};

const brokenImages = ref(new Set())

const resolveUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (cleanPath.startsWith('uploads/')) {
    return `${backendUrl}/${cleanPath}`;
  }
  return `${backendUrl}/uploads/${cleanPath}`;
};

const onImgError = (id) => {
  brokenImages.value.add(id);
};

const copyToClipboard = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    toast('Tautan gambar berhasil disalin!', 'success');
  } catch (err) {
    toast('Gagal menyalin tautan gambar', 'error');
    console.error(err);
  }
};

const copyImageToClipboard = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    // ClipboardItem requires image/png for broad browser support
    const pngBlob = await convertBlobToPng(blob);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    toast('Gambar berhasil disalin ke clipboard!', 'success');
  } catch (err) {
    toast('Gagal menyalin gambar ke clipboard', 'error');
    console.error(err);
  }
};

const convertBlobToPng = (blob) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('Canvas toBlob failed'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = URL.createObjectURL(blob);
  });
};

const downloadImage = async (url, filename) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const safeName = (filename || 'image').replace(/\.[^.]+$/, '') + '.webp';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    toast('Gagal mengunduh gambar', 'error');
    console.error(err);
  }
};

// --- Bulk helpers ---
const getSelectedItems = () => mediaList.value.filter(i => selectedMediaIds.value.has(i.id) && i.status === 'COMPLETED');

const bulkCopyLinks = async () => {
  const items = getSelectedItems();
  if (items.length === 0) return;
  const links = items.map(i => resolveUrl(i.main_path)).join('\n');
  try {
    await navigator.clipboard.writeText(links);
    toast(`${items.length} tautan berhasil disalin!`, 'success');
  } catch (err) {
    toast('Gagal menyalin tautan', 'error');
  }
};

const bulkDownloadImages = async () => {
  const items = getSelectedItems();
  if (items.length === 0) return;
  for (const item of items) {
    await downloadImage(resolveUrl(item.main_path), item.original_name || item.file_name);
  }
  toast(`${items.length} gambar sedang diunduh.`, 'success');
};

const startPolling = () => {
  pollInterval = setInterval(() => {
    // Hindari Ghost Polling (Page Visibility API) & Hindari UI Conflict
    if (document.visibilityState === 'visible' && !isBulkModalOpen.value) {
      const hasPending = mediaList.value.some(m => ['PENDING', 'PROCESSING'].includes(m.status));
      if (hasPending) {
        fetchMedia(pagination.value.page, true);
      }
    }
  }, 5000); // 5 detik
};

// Global Drag and Drop State
const isDragging = ref(false);

const handleDragEnter = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  // Ensure we only cancel dragging if leaving the root window boundaries
  if (e.clientX === 0 || e.clientY === 0) {
    isDragging.value = false;
  }
};

const handleDragOver = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (imageFiles.length === 0) {
    alert("Hanya format/tipe file gambar yang didukung.");
    return;
  }

  selectedFiles.value = imageFiles;
  bulkTagsStr.value = '';
  bulkProductsStr.value = '';
  isBulkModalOpen.value = true;
};

onMounted(() => {
  fetchMedia(1);
  startPolling();
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div class="h-min-screen p-4 sm:p-4" @dragenter="handleDragEnter" @dragover="handleDragOver"
    @dragleave="handleDragLeave" @drop="handleDrop">

    <!-- Global Drag overlay -->
    <div v-show="isDragging"
      class="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-sm border-4 border-dashed border-primary flex items-center justify-center pointer-events-none transition-colors">
      <div class="bg-background px-10 py-8 rounded-2xl shadow-2xl flex flex-col items-center">
        <font-awesome-icon icon="fa-solid fa-cloud-arrow-up" class="text-6xl text-primary mb-4 animate-bounce" />
        <h2 class="text-2xl font-bold text-text">Lepaskan gambar di sini</h2>
        <p class="text-text/70 mt-2">Gambar akan otomatis diunggah ke pustaka</p>
      </div>
    </div>

    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold text-text flex items-center gap-3">
          <font-awesome-icon icon="fa-solid fa-images" class="text-primary" />
          <span>Media</span>
        </h2>
      </div>
      <!-- Bulk Actions Bar (Hidden when not in selection mode) -->
      <div v-if="isSelectionMode"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-background border border-secondary/50 shadow-2xl rounded-full px-5 py-3 flex items-center gap-4 z-[60] animate-fade-in-up">
        <div class="flex items-center gap-3 pr-4 border-r border-secondary/30">
          <input type="checkbox"
            class="w-5 h-5 rounded border-secondary text-primary focus:ring-primary cursor-pointer accent-primary"
            :checked="selectedMediaIds.size > 0 && selectedMediaIds.size === mediaList.filter(i => i.status === 'COMPLETED').length"
            @change="toggleSelectAll" />
          <span class="font-bold text-sm text-text whitespace-nowrap"
            v-text="`${selectedMediaIds.size} Terpilih`"></span>
        </div>

        <div class="flex items-center gap-2"
          :class="{ 'opacity-50 grayscale pointer-events-none': selectedMediaIds.size === 0 }">
          <button @click="bulkCopyLinks"
            class="px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text text-sm font-semibold transition-colors flex items-center whitespace-nowrap"
            title="Salin semua tautan">
            <font-awesome-icon icon="fa-solid fa-link" class="mr-2" /> Salin Link
          </button>
          <button @click="bulkDownloadImages"
            class="px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text text-sm font-semibold transition-colors flex items-center whitespace-nowrap"
            title="Unduh semua gambar terpilih">
            <font-awesome-icon icon="fa-solid fa-download" class="mr-2" /> Unduh
          </button>
          <div class="w-px h-6 bg-secondary/30"></div>
          <button @click="isLinkProductModalOpen = true"
            class="px-3 py-1.5 rounded-lg hover:bg-primary/10 hover:text-primary text-text text-sm font-semibold transition-colors flex items-center whitespace-nowrap">
            <font-awesome-icon icon="fa-solid fa-link" class="mr-2" /> Tautkan
          </button>
          <button @click="isBulkEditTagsModalOpen = true"
            class="px-3 py-1.5 rounded-lg hover:bg-accent/10 hover:text-accent text-text text-sm font-semibold transition-colors flex items-center whitespace-nowrap">
            <font-awesome-icon icon="fa-solid fa-tags" class="mr-2" /> Tag Massal
          </button>
          <button @click="confirmBulkDelete"
            class="px-3 py-1.5 rounded-lg bg-danger/10 hover:bg-danger hover:text-background text-danger text-sm font-bold transition-colors flex items-center whitespace-nowrap">
            <font-awesome-icon icon="fa-solid fa-trash" class="mr-2" /> Hapus
          </button>
        </div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <div class="relative max-w-xs border border-secondary/20 rounded-lg bg-secondary">
          <input type="text" v-model="globalSearchStr" placeholder="Cari nama file, SKU, atau tag..."
            class="input input-sm input-bordered w-full p-2 pr-8 text-text rounded-lg bg-background h-[42px]" />
          <font-awesome-icon icon="fa-solid fa-search"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 pointer-events-none" />
        </div>
        <select v-model="linkStatusFilter"
          class="h-[42px] px-3 rounded-lg border border-secondary bg-background text-text text-sm focus:border-primary focus:outline-none transition-colors cursor-pointer">
          <option value="all">Semua Media</option>
          <option value="linked">Sudah Tertaut</option>
          <option value="orphaned">Belum Tertaut</option>
        </select>
        <input type="file" ref="uploaderInput" class="hidden" multiple accept="image/*" @change="handleMultipleFiles" />
        <!-- Actions -->
        <button @click="fetchMedia(pagination.page)"
          class="flex items-center justify-center w-10 h-10 rounded-lg bg-background border border-secondary text-text hover:border-primary transition-colors"
          title="Refresh">
          <font-awesome-icon icon="fa-solid fa-sync" :spin="isLoading" />
        </button>
        <button @click="toggleSelectionMode"
          class="px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center whitespace-nowrap"
          :class="isSelectionMode ? 'bg-secondary text-text border border-secondary hover:brightness-95' : 'bg-background border border-secondary text-text hover:border-primary'">
          <font-awesome-icon icon="fa-solid fa-check-double" class="mr-2" />
          <span v-text="isSelectionMode ? 'Batal Pilih' : 'Mode Pilih'"></span>
        </button>
        <button @click="triggerUpload"
          class="px-4 py-1.5 rounded-lg bg-primary text-background font-medium hover:bg-accent transition-colors flex items-center justify-center whitespace-nowrap"
          :disabled="isUploading">
          <font-awesome-icon icon="fa-solid fa-upload" class="mr-2" />
          <span v-text="isUploading ? 'Mengunggah...' : 'Unggah Aset'"></span>
        </button>
      </div>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 relative pb-20">
      <div v-for="(item, index) in mediaList" :key="item.id"
        class="card shadow-sm border group transition-all relative overflow-hidden"
        :class="selectedMediaIds.has(item.id) ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'bg-background border-secondary hover:border-primary/50'">

        <figure class="aspect-square p-2 relative overflow-hidden cursor-pointer"
          :class="selectedMediaIds.has(item.id) ? 'bg-primary/10' : 'bg-secondary/30'"
          @click="isSelectionMode ? toggleSelection(item) : (item.status === 'COMPLETED' ? (isLightboxOpen = true, lightboxIndex = index) : null)">

          <!-- Bulk Checkbox Indicator -->
          <div v-if="isSelectionMode && item.status === 'COMPLETED'"
            class="absolute top-2 left-2 z-20 pointer-events-none">
            <div class="h-6 w-6 rounded border-2 flex items-center justify-center transition-colors"
              :class="selectedMediaIds.has(item.id) ? 'bg-primary border-primary text-background' : 'bg-background/80 border-secondary text-transparent'">
              <font-awesome-icon icon="fa-solid fa-check" class="text-sm" />
            </div>
          </div>
          <img
            v-if="item.status === 'COMPLETED' && resolveUrl(item.thumbnail_path || item.main_path) && !brokenImages.has(item.id)"
            :src="resolveUrl(item.thumbnail_path || item.main_path)" :alt="item.original_name"
            class="object-contain w-full h-full rounded-lg" @error="onImgError(item.id)" />
          <div v-else-if="item.status === 'COMPLETED'"
            class="w-full h-full flex flex-col items-center justify-center text-text/20">
            <font-awesome-icon icon="fa-solid fa-image" class="text-4xl mb-1" />
            <span class="text-[10px] font-medium">No Image</span>
          </div>
          <div v-else class="flex flex-col items-center justify-center w-full h-full opacity-60 text-text">
            <font-awesome-icon v-if="item.status === 'PENDING' || item.status === 'PROCESSING'"
              icon="fa-solid fa-spinner" spin class="text-primary text-2xl" />
            <font-awesome-icon v-else icon="fa-solid fa-triangle-exclamation" class="text-danger text-2xl" />
            <span class="text-xs font-semibold mt-2">{{ item.status }}</span>
          </div>

          <!-- Overlay Actions -->
          <div v-if="!isSelectionMode"
            class="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center z-10 duration-300">
            <span class="text-xs truncate w-full block mb-2 px-2 text-text font-medium">{{ item.original_name }}</span>
            <div class="flex items-center justify-center flex-wrap gap-2 mb-2">
              <button v-if="item.status === 'COMPLETED'" @click.stop="copyToClipboard(resolveUrl(item.main_path))"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-success text-background hover:backdrop-brightness-75 transition-transform hover:scale-110"
                title="Salin Tautan">
                <font-awesome-icon icon="fa-solid fa-link" />
              </button>
              <button v-if="item.status === 'COMPLETED'" @click.stop="copyImageToClipboard(resolveUrl(item.main_path))"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-background hover:backdrop-brightness-75 transition-transform hover:scale-110"
                title="Salin Gambar">
                <font-awesome-icon icon="fa-solid fa-copy" />
              </button>
              <button v-if="item.status === 'COMPLETED'"
                @click.stop="downloadImage(resolveUrl(item.main_path), item.original_name)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-background hover:backdrop-brightness-75 transition-transform hover:scale-110"
                title="Unduh Gambar">
                <font-awesome-icon icon="fa-solid fa-download" />
              </button>
              <button @click.stop="openInfoModal(item)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-background hover:backdrop-brightness-75 transition-transform hover:scale-110"
                title="Info & Editor Tag">
                <font-awesome-icon icon="fa-solid fa-tags" />
              </button>
              <button @click.stop="deleteMedia(item.id, item.usage_count)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-danger text-background hover:backdrop-brightness-75 transition-transform hover:scale-110"
                title="Hapus Media" :disabled="item.usage_count > 0">
                <font-awesome-icon icon="fa-solid fa-trash" />
              </button>
            </div>

            <div class="flex flex-wrap gap-1 justify-center px-1 max-h-[50px] overflow-hidden">
              <span v-for="tag in formatTags(item.tags).slice(0, 4)" :key="tag"
                class="border border-primary text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold flex items-center justify-center h-5">
                {{ tag }}
              </span>
              <span v-if="formatTags(item.tags).length > 4" class="text-[10px] opacity-70">...</span>
            </div>
          </div>

          <!-- Usage Badge -->
          <div class="absolute bottom-2 left-2 z-50 group/tooltip">
            <span
              class="badge text-xs shadow-sm bg-background/80 px-2 py-1 rounded-lg border border-secondary cursor-help text-secondary font-bold"
              :class="item.usage_count > 0 ? 'bg-primary/80 text-secondary cursor-help' : 'text-text hover:bg-secondary'"
              v-text="item.usage_count + ' Produk'">
            </span>
            <!-- Manual Tailwind Tooltip -->
            <div v-if="item.usage_count > 0"
              class="absolute bottom-full left-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-200 w-max min-w-[40px] p-2 bg-text text-background rounded-lg shadow-xl z-50">
              <ul v-if="item.linked_products" class="list-disc list-inside text-xs space-y-1">
                <li v-for="prodName in item.linked_products.split('||')" :key="prodName"
                  class="whitespace-normal break-words leading-tight">{{ prodName }}</li>
              </ul>
              <p v-else class="text-xs">...</p>
              <!-- Tooltip Arrow -->
              <div class="absolute -bottom-1 left-4 w-2 h-2 bg-text transform rotate-45"></div>
            </div>
          </div>
        </figure>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-10">
      <span class="loading loading-spinner text-primary"></span>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && mediaList.length === 0"
      class="text-center py-12 bg-background rounded-xl border border-secondary border-dashed">
      <div class="w-16 h-16 bg-secondary/50 shadow-inner rounded-full flex items-center justify-center mx-auto mb-4">
        <font-awesome-icon icon="fa-solid fa-images" class="text-2xl text-text/50" />
      </div>
      <h3 class="text-lg font-bold text-text">Belum ada aset</h3>
      <p class="text-text/60 text-sm mt-1 max-w-sm mx-auto">Upload gambar dari komputer Anda untuk mulai mengisi galeri
        media.</p>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center bg-background p-4 rounded-xl border border-secondary"
      v-if="pagination.totalPages > 1">
      <span class="text-sm font-medium opacity-70">
        Halaman {{ pagination.page }} dari {{ pagination.totalPages }}
      </span>
      <div class="join flex border border-secondary rounded-lg overflow-hidden">
        <button class="px-3 py-1.5 bg-background text-text hover:bg-secondary disabled:opacity-50 transition-colors"
          :disabled="pagination.page === 1" @click="fetchMedia(pagination.page - 1)">
          «
        </button>
        <button class="px-4 py-1.5 bg-secondary text-text border-x border-secondary font-medium">Halaman {{
          pagination.page }}</button>
        <button class="px-3 py-1.5 bg-background text-text hover:bg-secondary disabled:opacity-50 transition-colors"
          :disabled="pagination.page === pagination.totalPages" @click="fetchMedia(pagination.page + 1)">
          »
        </button>
      </div>
    </div>

    <!-- Bulk Upload Modal -->
    <div v-if="isBulkModalOpen"
      class="fixed inset-0 bg-background/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div class="bg-background rounded-xl shadow-2xl p-6 w-full max-w-lg border border-secondary">
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-xl font-display text-text">Unggah {{ selectedFiles.length }} Aset</h3>
          <button @click="isBulkModalOpen = false"
            class="flex items-center justify-center w-8 h-8 rounded-full text-text hover:bg-secondary transition-colors"><font-awesome-icon
              icon="fa-solid fa-times" /></button>
        </div>

        <div
          class="mb-4 max-h-32 overflow-y-auto bg-secondary/30 rounded-lg p-3 text-sm text-text/80 border border-secondary custom-scrollbar">
          <ul class="list-disc list-inside">
            <li v-for="file in selectedFiles.slice(0, 10)" :key="file.name" class="truncate opacity-80">{{ file.name }}
            </li>
            <li v-if="selectedFiles.length > 10" class="italic text-xs mt-2 text-primary opacity-90">...serta {{
              selectedFiles.length - 10 }} aset lainnya.</li>
          </ul>
        </div>

        <!-- Tautan Produk Otomatis (Autocomplete) -->
        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-text font-semibold">Tautkan ke Produk</span></label>

          <!-- Selected Products Pills -->
          <div v-if="bulkSelectedProducts.length > 0" class="flex flex-wrap gap-2 mb-2">
            <div v-for="prod in bulkSelectedProducts" :key="prod.id"
              class="badge bg-primary/10 text-primary border-primary rounded-md gap-1 py-1 px-2">
              <span class="max-w-[150px] truncate text-xs font-bold">{{ prod.sku }}</span>
              <button @click="removeBulkProduct(prod.id)" class="text-primary hover:text-danger ml-1 transition-colors">
                <font-awesome-icon icon="fa-solid fa-times" />
              </button>
            </div>
          </div>

          <!-- Search Input -->
          <div class="relative">
            <input type="text" v-model="bulkProductSearchQuery"
              class="input input-bordered border border-secondary bg-background rounded-md px-2 py-1 text-text w-full"
              placeholder="Ketik minimal 2 huruf untuk cari SKU / nama produk..." />
            <font-awesome-icon v-if="isBulkProductSearching" icon="fa-solid fa-spinner" spin
              class="absolute right-3 top-1/2 -translate-y-1/2 text-primary" />
            <font-awesome-icon v-else icon="fa-solid fa-search"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-text/40" />

            <!-- Autocomplete Dropdown -->
            <div v-if="bulkProductSearchResults.length > 0 && bulkProductSearchQuery.length >= 2"
              class="absolute top-full left-0 w-full mt-1 bg-background border border-secondary rounded-lg shadow-2xl z-[60] max-h-48 overflow-y-auto custom-scrollbar">
              <button v-for="prod in bulkProductSearchResults" :key="prod.id" @click="selectBulkProduct(prod)"
                class="w-full text-left p-3 hover:bg-primary/10 border-b border-secondary/20 last:border-b-0 flex flex-col transition-colors">
                <div class="flex justify-between items-center w-full mb-1">
                  <span class="font-bold text-sm text-text">{{ prod.sku }}</span>
                  <span v-if="prod.is_active === 0"
                    class="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded font-bold">Arsip</span>
                </div>
                <span class="text-xs text-text/80">{{ prod.name }}</span>
              </button>
            </div>

            <div
              v-if="!isBulkProductSearching && bulkProductSearchQuery.length >= 2 && bulkProductSearchResults.length === 0"
              class="absolute top-full left-0 w-full mt-1 bg-background border border-secondary p-3 text-center text-xs text-text/60 rounded-lg shadow-xl z-[60]">
              Produk tidak ditemukan.
            </div>
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="label"><span class="label-text text-text">Global Tags</span></label>
          <input type="text" v-model="bulkTagsStr"
            class="input input-bordered border border-secondary bg-background rounded-md px-2 py-1 text-text w-full"
            placeholder="Ex: product, black, promo" />
          <label class="label">
            <span class="label-text-alt text-text/60">Tag dipisahkan koma. Tag ini akan diaplikasikan merata ke seluruh
              berkas yang akan Anda unggah.</span>
          </label>
        </div>

        <div class="flex flex-col gap-2 mt-6">
          <div v-if="isUploading" class="text-sm font-medium text-primary animate-pulse text-center w-full mb-1">
            <font-awesome-icon icon="fa-solid fa-spinner" spin class="mr-1" />
            {{ uploadProgress || 'Mempersiapkan unggahan...' }}
          </div>
          <div class="flex w-full justify-end gap-2">
            <button @click="isBulkModalOpen = false"
              class="px-4 py-2 rounded-lg bg-secondary text-text font-medium hover:brightness-95 transition-all text-center"
              :disabled="isUploading">Batal</button>
            <button @click="executeBulkUpload"
              class="px-4 py-2 rounded-lg bg-primary text-background font-medium hover:bg-accent transition-colors min-w-[120px] text-center"
              :disabled="isUploading">
              <font-awesome-icon v-if="isUploading" icon="fa-solid fa-spinner" spin />
              <span v-else>
                <font-awesome-icon icon="fa-solid fa-cloud-upload-alt" class="mr-2" /> Eksekusi
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>


  </div>

  <MediaInfoModal :show="isInfoModalOpen" :mediaId="infoMediaId" @close="isInfoModalOpen = false"
    @refresh="fetchMedia(pagination.page, true)" />

  <MediaLightbox :show="isLightboxOpen" :images="mediaList" :initialIndex="lightboxIndex"
    @close="isLightboxOpen = false" />

  <LinkProductModal :show="isLinkProductModalOpen" :selectedMediaIds="Array.from(selectedMediaIds)"
    @close="isLinkProductModalOpen = false" @linked="fetchMedia(pagination.page, true); toggleSelectionMode()" />

  <BulkEditTagsModal :show="isBulkEditTagsModalOpen" :selectedMediaIds="Array.from(selectedMediaIds)"
    @close="isBulkEditTagsModalOpen = false" @updated="fetchMedia(pagination.page, true); toggleSelectionMode()" />
</template>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
