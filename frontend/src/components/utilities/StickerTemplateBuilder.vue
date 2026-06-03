<script setup>
import { ref, watch, onBeforeUnmount } from 'vue';
import * as fabric from 'fabric';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

const props = defineProps({
  show: Boolean
});

const emit = defineEmits(['close', 'saved']);

const canvasEl = ref(null);
let fabricCanvas = null;

const templateName = ref('');
const isSaving = ref(false);

const initCanvas = () => {
  if (fabricCanvas) return;
  // Canvas dimensions for 80x40mm. 
  // At 96 DPI: 80mm ~ 302px, 40mm ~ 151px.
  // We use 2x scale for sharper editing: 604x302
  fabricCanvas = new fabric.Canvas(canvasEl.value, {
    width: 604,
    height: 302,
    backgroundColor: '#ffffff'
  });
};

watch(() => props.show, (newVal) => {
  if (newVal) {
    setTimeout(initCanvas, 100);
    templateName.value = '';
  } else {
    if (fabricCanvas) {
      fabricCanvas.dispose();
      fabricCanvas = null;
    }
  }
});

onBeforeUnmount(() => {
  if (fabricCanvas) {
    fabricCanvas.dispose();
    fabricCanvas = null;
  }
});

const addText = () => {
  if (!fabricCanvas) return;
  const text = new fabric.IText('Teks Baru', {
    left: 50,
    top: 50,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize: 40,
    fill: '#000000',
    fontWeight: 'normal',
    textAlign: 'center'
  });
  fabricCanvas.add(text);
  fabricCanvas.setActiveObject(text);
  fabricCanvas.requestRenderAll();
};

const addLogo = () => {
  if (!fabricCanvas) return;
  const imgElement = document.createElement('img');
  imgElement.src = '/dpv_logo.png';
  imgElement.onload = () => {
    const img = new fabric.Image(imgElement, {
      left: 10,
      top: 10,
    });
    // Scale image down if it's too big
    img.scaleToHeight(80);
    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
    fabricCanvas.requestRenderAll();
  };
};

const deleteSelected = () => {
  if (!fabricCanvas) return;
  const activeObjects = fabricCanvas.getActiveObjects();
  if (activeObjects.length) {
    activeObjects.forEach(obj => {
      fabricCanvas.remove(obj);
    });
    fabricCanvas.discardActiveObject();
    fabricCanvas.requestRenderAll();
  }
};

const toggleBold = () => {
  if (!fabricCanvas) return;
  const activeObj = fabricCanvas.getActiveObject();
  if (activeObj && activeObj.type === 'i-text') {
    activeObj.set('fontWeight', activeObj.fontWeight === 'bold' ? 'normal' : 'bold');
    fabricCanvas.requestRenderAll();
  }
};

const saveTemplate = async () => {
  if (!templateName.value.trim()) {
    alert("Nama template harus diisi!");
    return;
  }
  
  if (!fabricCanvas) return;
  
  isSaving.value = true;
  try {
    const jsonConfig = fabricCanvas.toJSON();
    
    const response = await fetch('/api/sticker-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: templateName.value,
        paper_size: '80x40',
        config_json: jsonConfig
      })
    });
    
    const result = await response.json();
    if (result.success) {
      emit('saved', { id: result.data.id, name: templateName.value });
      emit('close');
    } else {
      alert("Gagal menyimpan: " + result.message);
    }
  } catch (err) {
    console.error("Save error", err);
    alert("Terjadi kesalahan jaringan.");
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center print:hidden">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" @click="$emit('close')"></div>
      
      <div class="bg-secondary w-full max-w-5xl rounded-2xl shadow-2xl relative flex flex-col border border-secondary/20 z-10 m-4 overflow-hidden">
        
        <!-- Header -->
        <div class="p-6 border-b border-primary/10 flex justify-between items-center bg-background/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <font-awesome-icon icon="fa-solid fa-object-group" class="text-xl" />
            </div>
            <div>
              <h3 class="text-xl font-black text-text tracking-tight">Template Builder</h3>
              <p class="text-sm text-text/60">Desain stiker khusus dengan fitur drag & drop</p>
            </div>
          </div>
          <button @click="$emit('close')" class="text-text/50 hover:text-accent transition-colors w-8 h-8 rounded-full hover:bg-accent/10 flex items-center justify-center">
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>
        
        <!-- Toolbar & Canvas Area -->
        <div class="flex flex-col lg:flex-row flex-1 bg-background">
          <!-- Toolbar Kiri -->
          <div class="w-full lg:w-64 border-r border-primary/10 p-4 flex flex-col gap-3 bg-secondary/30">
            <h4 class="text-xs font-bold text-text/50 uppercase tracking-widest mb-2">Tambahkan Elemen</h4>
            <button @click="addText" class="w-full px-4 py-3 bg-background border border-secondary rounded-xl font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all flex items-center gap-3 shadow-sm">
              <font-awesome-icon icon="fa-solid fa-font" class="text-text/50" />
              Teks Baru
            </button>
            <button @click="addLogo" class="w-full px-4 py-3 bg-background border border-secondary rounded-xl font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all flex items-center gap-3 shadow-sm">
              <font-awesome-icon icon="fa-solid fa-image" class="text-text/50" />
              Logo DPV
            </button>
            
            <hr class="border-primary/10 my-2" />
            
            <h4 class="text-xs font-bold text-text/50 uppercase tracking-widest mb-2">Alat Editor</h4>
            <button @click="toggleBold" class="w-full px-4 py-3 bg-background border border-secondary rounded-xl font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all flex items-center gap-3 shadow-sm">
              <font-awesome-icon icon="fa-solid fa-bold" class="text-text/50" />
              Teks Tebal (Bold)
            </button>
            <button @click="deleteSelected" class="w-full px-4 py-3 bg-danger/10 border border-danger/20 text-danger rounded-xl font-semibold text-sm hover:bg-danger hover:text-white transition-all flex items-center gap-3 shadow-sm">
              <font-awesome-icon icon="fa-solid fa-trash" class="opacity-70" />
              Hapus Terpilih
            </button>
            
            <div class="mt-auto pt-6">
              <div class="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs text-text/70 leading-relaxed">
                <p>💡 <b>Tips:</b> Gunakan <code>{{ line1 }}</code> untuk variabel Baris 1 (SKU), dan <code>{{ line2 }}</code> untuk Baris 2 (Nama). Teks ini akan diganti otomatis saat dicetak.</p>
              </div>
            </div>
          </div>
          
          <!-- Canvas Area -->
          <div class="flex-1 p-8 flex flex-col items-center justify-center bg-gray-100 overflow-auto relative">
            <div class="absolute top-4 left-4 text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded shadow-sm border border-gray-200">
              Area Cetak: 80x40mm
            </div>
            
            <!-- Canvas Container -->
            <div class="shadow-2xl border border-gray-300 bg-white" style="width: 604px; height: 302px;">
              <canvas ref="canvasEl"></canvas>
            </div>
          </div>
        </div>
        
        <!-- Footer / Action -->
        <div class="p-6 border-t border-primary/10 bg-background/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="flex-1 w-full max-w-sm">
            <input 
              v-model="templateName" 
              type="text" 
              placeholder="Beri nama template ini..." 
              class="w-full bg-secondary border border-primary/20 rounded-xl px-4 py-2.5 text-sm font-bold text-text focus:outline-none focus:border-primary shadow-inner" 
            />
          </div>
          
          <div class="flex gap-3">
            <button @click="$emit('close')" class="px-6 py-2.5 rounded-xl font-bold text-text bg-secondary border border-primary/20 hover:bg-background transition-colors">
              Batal
            </button>
            <button 
              @click="saveTemplate" 
              :disabled="isSaving"
              class="px-8 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50"
            >
              <font-awesome-icon v-if="isSaving" icon="fa-solid fa-spinner" class="animate-spin" />
              <font-awesome-icon v-else icon="fa-solid fa-save" />
              {{ isSaving ? 'Menyimpan...' : 'Simpan Template' }}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
