<script setup>
import { ref, watch } from 'vue';
import apiClient from '@/api/axios';

const props = defineProps({
  show: Boolean,
  selectedMediaIds: Array
});

const emit = defineEmits(['close', 'updated']);

const tagsInput = ref('');
const isSubmitting = ref(false);

watch(() => props.show, (newVal) => {
  if (newVal) {
    tagsInput.value = '';
  }
});

const submitTags = async () => {
  if (isSubmitting.value) return;
  const rawTags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  if (rawTags.length === 0) {
    alert("Masukkan setidaknya 1 tag.");
    return;
  }

  if (!confirm(`Terapkan ${rawTags.length} tag ini ke ${props.selectedMediaIds?.length || 0} gambar terpilih?`)) return;

  isSubmitting.value = true;
  try {
    let successCount = 0;
    // Sequential loop to save DB connection pool
    for (const id of props.selectedMediaIds) {
      const res = await apiClient.put(`/media/${id}/tags`, { tags: rawTags });
      if (res.data.success) successCount++;
    }
    emit('updated');
    close();
  } catch (error) {
    console.error(error);
    alert("Terjadi kesalahan saat memperbarui sebagian tag.");
    emit('updated');
    close();
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
    <div class="bg-background w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden border border-secondary/20">
      
      <!-- Header -->
      <div class="flex items-center justify-between p-5 border-b border-secondary/20 bg-secondary/10">
        <div>
          <h3 class="text-lg font-bold text-text">Label Masal (Tagging)</h3>
          <p class="text-xs text-text/60 mt-1">Timpa tag pada {{ selectedMediaIds?.length || 0 }} gambar terpilih.</p>
        </div>
        <button @click="close" class="text-text/50 hover:text-danger hover:bg-danger/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5">
        <label class="block text-sm font-semibold text-text/80 mb-2">Masukkan Label (Pisahkan dgn koma)</label>
        <textarea v-model="tagsInput" rows="3" placeholder="contoh: promo2026, banner depan, poster"
          class="textarea textarea-bordered w-full bg-background text-text border-secondary focus:border-primary"></textarea>
      </div>

      <!-- Footer -->
      <div class="p-5 border-t border-secondary/20 bg-secondary/5 flex justify-end gap-3">
        <button @click="close" class="px-4 py-2 font-semibold text-text hover:bg-secondary/20 rounded-lg transition-colors" :disabled="isSubmitting">Batal</button>
        <button @click="submitTags" class="px-5 py-2 font-bold text-background bg-primary hover:bg-accent rounded-lg transition-colors flex items-center gap-2" :disabled="isSubmitting">
          <font-awesome-icon v-if="isSubmitting" icon="fa-solid fa-spinner" spin />
          Terapkan Tag
        </button>
      </div>
      
    </div>
  </div>
</template>
