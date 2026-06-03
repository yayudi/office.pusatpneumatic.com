<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DpvStickerTemplate from './DpvStickerTemplate.vue'
import DynamicStickerRenderer from './DynamicStickerRenderer.vue'
import StickerTemplateBuilder from './StickerTemplateBuilder.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  show: { type: Boolean, required: true },
  initialProduct: { type: Object, default: null }
})

defineEmits(['close'])
const { toast } = useToast()

// Data struktur: array of { id, line1, line2, copies }
const stickers = ref([])
const paperType = ref('thermal') // 'thermal' or 'a4'
const paperOrientation = ref('landscape') // 'landscape' or 'portrait'

const templates = ref([])
const selectedTemplate = ref(null)
const showBuilder = ref(false)
const authStore = useAuthStore()

const fetchTemplates = async () => {
  try {
    const res = await fetch('/api/sticker-templates', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success && data.data) {
      templates.value = data.data
      if (templates.value.length > 0 && !selectedTemplate.value) {
        selectedTemplate.value = templates.value[0]
      }
    }
  } catch (e) {
    console.error('Gagal memuat template', e)
  }
}

const onTemplateSaved = () => {
  fetchTemplates()
  // Wait a bit, then select it (simulated by finding it in next fetch, but we don't have full object yet. Let's just re-fetch)
}

const deleteTemplate = async id => {
  if (!confirm('Hapus template ini?')) return
  try {
    const res = await fetch(`/api/sticker-templates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      if (selectedTemplate.value?.id === id) selectedTemplate.value = null
      fetchTemplates()
    } else {
      alert(data.message)
    }
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  fetchTemplates()
})

watch(
  () => props.show,
  newVal => {
    if (newVal) {
      if (props.initialProduct) {
        // Single mode (dari ProductRow)
        stickers.value = [
          {
            id: Date.now(),
            line1: props.initialProduct.sku || 'SKU',
            line2: props.initialProduct.name?.substring(0, 20) || 'PRODUCT',
            copies: 1
          }
        ]
      } else {
        // Batch mode (kosong atau default)
        stickers.value = [{}]
      }
    }
  }
)

function addSticker() {
  stickers.value.push({
    id: Date.now(),
    line1: '',
    line2: '',
    copies: 1
  })
}

function removeSticker(index) {
  stickers.value.splice(index, 1)
}

const printStickers = computed(() => {
  const result = []
  stickers.value.forEach(s => {
    for (let i = 0; i < s.copies; i++) {
      result.push({ ...s })
    }
  })
  return result
})

function handlePrint() {
  if (printStickers.value.length === 0) {
    toast('Tidak ada sticker untuk dicetak.', 'error')
    return
  }
  window.print()
}
</script>

<template>
  <!-- Modal Overlay (Hidden during print) -->
  <transition name="modal-fade">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center print:hidden">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')"></div>

      <div
        class="bg-secondary w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col border border-secondary/20 z-10 m-4"
      >
        <!-- Header -->
        <div class="p-6 border-b border-primary/10 flex justify-between items-center bg-background/50 rounded-t-2xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <font-awesome-icon icon="fa-solid fa-print" />
            </div>
            <div>
              <h3 class="text-xl font-bold text-text">Sticker Generator</h3>
              <p class="text-sm text-text/60">Buat dan cetak sticker label DPV</p>
            </div>
          </div>
          <button
            @click="$emit('close')"
            class="text-text/50 hover:text-accent transition-colors w-8 h-8 rounded-full hover:bg-accent/10 flex items-center justify-center"
          >
            <font-awesome-icon icon="fa-solid fa-times" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col lg:flex-row gap-6">
          <!-- Editor Form -->
          <div class="flex-1 space-y-4">
            <div class="flex justify-between items-center">
              <h4 class="font-bold text-text">Daftar Sticker</h4>
              <button
                @click="addSticker"
                class="text-xs px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-colors"
              >
                <font-awesome-icon icon="fa-solid fa-plus" class="mr-1" /> Tambah
              </button>
            </div>

            <div
              v-for="(sticker, index) in stickers"
              :key="sticker.id"
              class="bg-background p-4 rounded-xl border border-secondary relative group"
            >
              <button
                v-if="stickers.length > 1"
                @click="removeSticker(index)"
                class="absolute -top-2 -right-2 w-6 h-6 bg-accent text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <font-awesome-icon icon="fa-solid fa-times" />
              </button>

              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-5">
                  <label class="block text-xs font-semibold text-text/70 mb-1">Baris 1</label>
                  <input
                    v-model="sticker.line1"
                    type="text"
                    class="w-full bg-secondary border border-primary/20 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="UD-08 NO"
                  />
                </div>
                <div class="col-span-5">
                  <label class="block text-xs font-semibold text-text/70 mb-1">Baris 2</label>
                  <input
                    v-model="sticker.line2"
                    type="text"
                    class="w-full bg-secondary border border-primary/20 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="AC 220"
                  />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-semibold text-text/70 mb-1">Copy</label>
                  <input
                    v-model.number="sticker.copies"
                    type="number"
                    min="1"
                    class="w-full bg-secondary border border-primary/20 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Live Preview -->
          <div class="w-full lg:w-72 flex flex-col gap-4">
            <!-- Template Selection & Builder -->
            <div class="bg-secondary/30 p-4 rounded-xl border border-secondary">
              <label class="block text-xs font-bold text-text/70 mb-2">Pilih Template</label>
              <div class="flex gap-2">
                <select
                  v-model="selectedTemplate"
                  class="flex-1 bg-background border border-primary/20 rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                >
                  <option :value="null">Default (Statis)</option>
                  <option v-for="t in templates" :key="t.id" :value="t">{{ t.name }}</option>
                </select>
                <button
                  v-if="selectedTemplate && authStore.hasPermission('manage-users')"
                  @click="deleteTemplate(selectedTemplate.id)"
                  class="px-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                  title="Hapus Template"
                >
                  <font-awesome-icon icon="fa-solid fa-trash" />
                </button>
              </div>
              <button
                @click="showBuilder = true"
                class="w-full mt-2 text-xs py-1.5 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-colors"
              >
                <font-awesome-icon icon="fa-solid fa-paint-roller" class="mr-1" /> Editor Template Baru
              </button>
            </div>

            <h4 class="font-bold text-text mt-2">Live Preview</h4>
            <div
              class="bg-background border border-secondary rounded-xl p-4 flex flex-col items-center justify-center gap-4 flex-1"
            >
              <!-- Render just the first sticker as preview -->
              <div class="scale-90 origin-top shadow-md">
                <template v-if="stickers.length > 0">
                  <DynamicStickerRenderer
                    v-if="selectedTemplate && selectedTemplate.config_json"
                    :config="selectedTemplate.config_json"
                    :line1="stickers[0].line1"
                    :line2="stickers[0].line2"
                  />
                  <DpvStickerTemplate v-else :line1="stickers[0].line1" :line2="stickers[0].line2" />
                </template>
              </div>
              <p class="text-xs text-text/50 text-center mt-auto">
                <font-awesome-icon icon="fa-solid fa-info-circle" /> Preview mungkin tidak 100% akurat. Cetak
                menggunakan CSS `@media print` akan menghasilkan resolusi tinggi.
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="p-6 border-t border-primary/10 bg-background/50 rounded-b-2xl flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <div class="flex items-center gap-4 w-full sm:w-auto">
            <div class="flex items-center gap-2 border-r border-primary/20 pr-4">
              <label class="text-sm font-bold text-text/70">Ukuran Kertas:</label>
              <select
                v-model="paperType"
                class="bg-secondary border border-primary/20 rounded-lg px-3 py-1.5 text-sm font-bold text-text focus:outline-none focus:border-primary"
              >
                <option value="thermal">Thermal (80x40mm)</option>
                <option value="a4">A4 (Tiled Grid)</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm font-bold text-text/70">Orientasi:</label>
              <select
                v-model="paperOrientation"
                class="bg-secondary border border-primary/20 rounded-lg px-3 py-1.5 text-sm font-bold text-text focus:outline-none focus:border-primary"
              >
                <option value="landscape">Landscape</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>
            <div class="text-sm text-text/60 font-semibold border-l border-primary/20 pl-4 hidden sm:block">
              Total: <span class="text-primary">{{ printStickers.length }}</span> sticker
            </div>
          </div>
          <div class="flex gap-3 w-full sm:w-auto justify-end">
            <button
              @click="$emit('close')"
              class="px-6 py-2 rounded-xl font-bold text-text bg-secondary border border-primary/20 hover:bg-background transition-colors"
            >
              Batal
            </button>
            <button
              @click="handlePrint"
              class="px-6 py-2 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 flex items-center gap-2"
            >
              <font-awesome-icon icon="fa-solid fa-print" />
              Cetak Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- Area khusus untuk cetak (Hanya tampil saat window.print dipanggil) -->
  <Teleport to="body">
    <div
      v-if="show"
      class="print-container"
      :class="[`print-mode-${paperType}`, `print-orientation-${paperOrientation}`]"
    >
      <!-- Inject dynamic @page CSS -->
      <component :is="'style'">
        @media print { @page { size: {{ paperType === 'a4' ? 'A4' : '80mm 40mm' }} {{ paperOrientation }}; margin:
        {{ paperType === 'a4' ? '5mm' : '0' }}; } }
      </component>

      <div v-for="(ps, i) in printStickers" :key="'print-' + i" class="sticker-item">
        <div class="sticker-wrapper">
          <DynamicStickerRenderer
            v-if="selectedTemplate && selectedTemplate.config_json"
            :config="selectedTemplate.config_json"
            :line1="ps.line1"
            :line2="ps.line2"
          />
          <DpvStickerTemplate v-else :line1="ps.line1" :line2="ps.line2" />
        </div>
      </div>
    </div>
  </Teleport>

  <StickerTemplateBuilder :show="showBuilder" @close="showBuilder = false" @saved="onTemplateSaved" />
</template>

<style>
/*
  Global Print Styles:
  Sembunyikan semua elemen di body KECUALI .print-container
*/
@media print {
  body > *:not(.print-container) {
    display: none !important;
  }

  html,
  body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    max-width: none !important;
    min-width: 100% !important;
  }

  .print-container {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    width: 100% !important;
    max-width: none !important;
  }

  /* Default Sticker Size (Landscape) */
  .sticker-item {
    width: 80mm;
    height: 40mm;
    overflow: hidden;
    position: relative;
    page-break-inside: avoid;
  }
  .sticker-wrapper {
    width: 80mm;
    height: 40mm;
  }

  /* Portrait Orientation Logic: Putar 90 derajat */
  .print-orientation-portrait .sticker-item {
    width: 40mm;
    height: 80mm;
  }
  .print-orientation-portrait .sticker-wrapper {
    position: absolute;
    top: 0;
    left: 40mm;
    transform: rotate(90deg);
    transform-origin: top left;
  }

  /* Thermal Mode: Tiap sticker di-break ke halaman baru */
  .print-mode-thermal {
    display: block !important;
  }
  .print-mode-thermal .sticker-item {
    page-break-after: always;
  }
  .print-mode-thermal .sticker-item:last-child {
    page-break-after: auto;
  }

  /* A4 Mode: Tiled grid tanpa paksa break halaman (Grid) */
  .print-mode-a4 {
    display: flex !important;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 2mm; /* Jarak antar sticker */
    background: white;
    width: 100% !important;
  }
  .print-mode-a4 .sticker-item {
    /* Optional: Beri border tipis untuk panduan potong (opsional) */
    outline: 1px dashed #ccc;
  }
}
</style>
