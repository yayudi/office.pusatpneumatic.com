<template>
  <BaseModal :show="isOpen" @close="close" title="Import Jadwal Shift">
    <div class="space-y-5">
      <!-- Info Box -->
      <div class="bg-primary/10 text-primary p-4 rounded-lg text-sm border border-primary/20">
        <p class="font-bold mb-2">Panduan Import:</p>
        <ul class="list-disc list-inside opacity-90 space-y-1">
          <li>Gunakan Template Excel yang disediakan.</li>
          <li>Kolom Wajib: <b>Username</b>, <b>Date</b> (YYYY-MM-DD), <b>Shift Name</b>.</li>
          <li>Pastikan nama shift sesuai dengan Master Shift.</li>
        </ul>
        <div class="mt-3 pt-3 border-t border-primary/20">
          <button @click="downloadTemplate" class="font-bold hover:underline inline-flex items-center gap-1">
            <font-awesome-icon icon="fa-solid fa-download" /> Download Template (Excel)
          </button>
        </div>
      </div>

      <!-- File Input -->
      <div
        class="border-2 border-dashed border-secondary/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
        @click="$refs.fileInput.click()"
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <input type="file" ref="fileInput" class="hidden" accept=".xlsx, .xls, .csv" @change="handleFileSelect" />

        <div v-if="!selectedFile">
          <font-awesome-icon
            icon="fa-solid fa-cloud-arrow-up"
            class="text-4xl mb-3 text-text opacity-30 group-hover:text-primary group-hover:opacity-100 transition-all"
          />
          <p class="font-medium">Klik untuk upload file Excel</p>
          <p class="text-xs opacity-50 mt-1">atau drag & drop file ke sini</p>
        </div>

        <div v-else>
          <font-awesome-icon icon="fa-solid fa-file-excel" class="text-4xl mb-3 text-success" />
          <p class="font-bold text-lg truncate px-4">{{ selectedFile.name }}</p>
          <p class="text-xs opacity-60 mt-1">Ukuran: {{ (selectedFile.size / 1024).toFixed(2) }} KB</p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-danger/10 text-danger px-4 py-3 rounded-lg text-sm flex items-start gap-3">
        <font-awesome-icon icon="fa-solid fa-circle-exclamation" class="mt-0.5 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <button
          @click="close"
          class="px-4 py-2 rounded-lg font-medium text-text opacity-70 hover:opacity-100 hover:bg-secondary/10 transition-all"
        >
          Batal
        </button>
        <button
          @click="upload"
          :disabled="!selectedFile || isLoading"
          class="px-5 py-2 bg-primary text-secondary rounded-lg shadow-lg shadow-primary/30 font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <font-awesome-icon v-if="isLoading" icon="fa-solid fa-spinner" spin />
          <font-awesome-icon v-else icon="fa-solid fa-file-import" />
          <span>{{ isLoading ? 'Mengunggah...' : 'Mulai Import' }}</span>
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref } from 'vue'
import { uploadScheduleImport } from '@/api/helpers/schedule.js'
import { useToast } from '@/composables/useToast.js'
import BaseModal from '@/components/ui/BaseModal.vue'
import axios from '@/api/axios'

defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'success'])
const { toast } = useToast()

const fileInput = ref(null)
const selectedFile = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')

const downloadTemplate = async () => {
  try {
    const response = await axios.get('/schedules/template', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'Template_Jadwal_Shift.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e) { console.error(e) }
}

const handleFileSelect = event => {
  const file = event.target.files[0]
  if (file) selectedFile.value = file
}

const handleDrop = event => {
  const file = event.dataTransfer.files[0]
  if (file) selectedFile.value = file
}

const upload = async () => {
  if (!selectedFile.value) return

  isLoading.value = true
  errorMessage.value = ''

  const formData = new FormData()
  formData.append('file', selectedFile.value)

  try {
    await uploadScheduleImport(formData)
    toast('File berhasil diupload. Proses import berjalan di background.', 'success')
    emit('success')
    close()
  } catch (error) {
    console.error(error) // Auto-added to prevent unused var
    errorMessage.value = error.response?.data?.message || 'Gagal mengunggah file.'
  } finally {
    isLoading.value = false
  }
}

const close = () => {
  selectedFile.value = null
  errorMessage.value = ''
  emit('close')
}
</script>

<style scoped>
/* Scoped styles if needed */
</style>
